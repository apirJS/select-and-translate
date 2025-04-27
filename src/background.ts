import * as browser from 'webextension-polyfill';
import { Message, TranslationResult } from './lib/types';
import { categorizeError, isError, TypedError } from './lib/utils';
console.log('[service_worker] Background script loaded');

async function requestTranslation(
  imageDataUrl: string,
  fromLang: string = 'auto'
): Promise<TranslationResult> {
  try {
    const maxRetries = 2;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        const storedPreference = await browser.storage.sync.get('targetLanguage');
        const toLang =
          storedPreference.targetLanguage &&
          typeof storedPreference.targetLanguage === 'string'
            ? storedPreference.targetLanguage
            : 'indonesia';
    
        const base64Image = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
        const response = await fetch(
          `https://translate.apir.live/api/translate?from=${fromLang}&to=${toLang}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image }),
          }
        );
    
        if (!response.ok) {
          throw new TypedError(
            'FetchError',
            `HTTP error! Status: ${response.status}`
          );
        }
    
        const result: TranslationResult = await response.json();
        if (!result.originalText || !result.translatedText) {
          throw new TypedError(
            'TranslationError',
            'No text detected in the image or translation failed'
          );
        }
    
        return result;
      } catch (error) {
        if (
          error instanceof TypedError && 
          error.errorType === 'FetchError' && 
          retryCount < maxRetries
        ) {
          retryCount++;
          await new Promise(r => setTimeout(r, 1000 * retryCount));
          continue;
        }
        throw error;
      }
    }
    
    throw new Error("Unreachable");
  } catch (error) {
    throw error;
  }
}

const contentScriptStates = new Map<number, 'loading'|'ready'|'error'>();

// Track loaded content scripts
browser.tabs.onRemoved.addListener((tabId) => {
  contentScriptStates.delete(tabId);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    contentScriptStates.delete(tabId);
  }
});

async function injectContentScript(tabId: number): Promise<void> {
  try {
    if (contentScriptStates.get(tabId) === 'ready') {
      return;
    }
    
    try {
      const pong = await browser.tabs.sendMessage(tabId, { type: 'ping' });
      if (pong === 'pong') {
        contentScriptStates.set(tabId, 'ready');
        return;
      }
      throw new Error("Invalid response");
    } catch (error) {
      contentScriptStates.set(tabId, 'loading');
      
      await browser.scripting.executeScript({
        target: { tabId: tabId },
        files: ['/assets/js/content.js'],
        injectImmediately: true,
      });
      
      // Wait for content script to initialize
      let attempts = 0;
      while (attempts < 10) {
        try {
          const pong = await browser.tabs.sendMessage(tabId, { type: 'ping' });
          if (pong === 'pong') {
            contentScriptStates.set(tabId, 'ready');
            return;
          }
        } catch (e) {
          // Still loading
        }
        
        await new Promise(r => setTimeout(r, 50));
        attempts++;
      }
      
      throw new TypedError('ContentScriptError', 'Failed to load content script');
    }
  } catch (error) {
    contentScriptStates.set(tabId, 'error');
    throw error;
  }
}

async function handleTranslation(): Promise<boolean> {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      throw new TypedError('TabQueryError', 'No active tab found.');
    }

    const tabId = tab.id;
    if (!tabId) {
      throw new TypedError('TabQueryError', 'Failed to retrieve tab ID.');
    }

    await injectContentScript(tabId);

    const imageDataUrl = await browser.tabs.captureVisibleTab(undefined, {
      format: 'png',
    });
    const selectionResult: unknown = await browser.tabs.sendMessage(tabId, {
      type: 'user-select',
      payload: {
        tabId,
        imageDataUrl,
      },
    } as Message);

    if (isError(selectionResult) || typeof selectionResult !== 'string') {
      throw selectionResult;
    }

    const translationResult = await requestTranslation(selectionResult);
    await browser.tabs.sendMessage(tabId, {
      type: 'translation-result',
      payload: translationResult,
    } as Message);

    return true;
  } catch (error) {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab && tab.id) {
      await browser.tabs.sendMessage(tab.id, {
        type: 'error',
        payload: { error },
      } as Message);
    }

    if (
      error instanceof Error &&
      error.message.includes('Receiving end does not exist')
    ) {
      await reportError(
        new TypedError(
          'CommunicationError',
          'Failed to communicate with the page. The tab may have changed or navigation occurred.'
        )
      );
      return false;
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'errorType' in error &&
      (error.errorType === 'TimeoutReached' ||
        error.errorType === 'UserEscapeKeyPressed')
    ) {
      return false;
    }

    if (error instanceof TypedError) {
      await reportError(error, error.errorType);
    } else {
      await reportError(error);
    }

    return false;
  }
}

browser.commands.onCommand.addListener(async () => {
  await handleTranslation();
});

browser.runtime.onMessage.addListener((message: unknown) => {
  const typedMessage = message as Message;
  if (typedMessage.type === 'run-translation') {
    return handleTranslation();
  }
  return Promise.resolve(false);
});

async function reportError(error: unknown, title = 'Extension Error') {
  const errorInfo = categorizeError(error);
  
  if (!errorInfo.shouldNotify) {
    console.log(`Silently handling error: ${errorInfo.errorType}`);
    return;
  }

  await browser.notifications.create({
    type: 'basic',
    iconUrl: '/assets/img/icon.png',
    title: errorInfo.type === 'network' ? 'Connection Error' : title,
    message: errorInfo.message,
  });
}