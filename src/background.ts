import * as browser from 'webextension-polyfill';
import { ErrorWithType, Message, TranslationResult } from './lib/types';
import { categorizeError, isError, TypedError } from './lib/utils';
console.log('[service_worker] Background script loaded');

async function requestTranslation(
  imageDataUrl: string,
  fromLang?: string,
  toLang?: string
): Promise<TranslationResult> {
  try {
    const maxRetries = 2;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        const storedPreferences = await browser.storage.sync.get([
          'fromLanguage',
          'toLanguage',
        ]);

        const sourceLanguage =
          fromLang ||
          (storedPreferences.fromLanguage &&
          typeof storedPreferences.fromLanguage === 'string'
            ? storedPreferences.fromLanguage
            : 'auto-detect');

        const targetLanguage =
          toLang ||
          (storedPreferences.toLanguage &&
          typeof storedPreferences.toLanguage === 'string'
            ? storedPreferences.toLanguage
            : browser.i18n.getUILanguage() || 'en-US');

        const base64Image = imageDataUrl.replace(
          /^data:image\/[a-z]+;base64,/,
          ''
        );
        const response = await fetch(
          `https://translate.apir.live/api/translate?from=${sourceLanguage}&to=${targetLanguage}`,
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
          await new Promise((r) => setTimeout(r, 1000 * retryCount));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Unreachable');
  } catch (error) {
    throw error;
  }
}

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
      throw new Error('Invalid response');
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

        await new Promise((r) => setTimeout(r, 50));
        attempts++;
      }

      throw new TypedError(
        'ContentScriptError',
        'Failed to load content script'
      );
    }
  } catch (error) {
    contentScriptStates.set(tabId, 'error');
    throw error;
  }
}

async function handleTranslation(
  fromLang?: string,
  toLang?: string
): Promise<boolean> {
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
    const selectionResult: string | ErrorWithType =
      await browser.tabs.sendMessage(tabId, {
        type: 'user-select',
        payload: {
          tabId,
          imageDataUrl,
        },
      } as Message);

    if (isError(selectionResult)) {
      throw selectionResult;
    }

    const translationResult = await requestTranslation(
      selectionResult,
      fromLang,
      toLang
    );
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

    if (isError(error)) {
      if (
        error.errorType === 'TimeoutReached' ||
        error.errorType === 'UserEscapeKeyPressed'
      ) {
        return false;
      } else {
        await reportError(new Error(error.errorMessage));
        return false;
      }
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

    if (error instanceof TypedError) {
      await reportError(error, error.errorType);
    } else {
      await reportError(error);
    }

    return false;
  }
}

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

browser.commands.onCommand.addListener(async () => {
  await handleTranslation();
});

browser.runtime.onMessage.addListener((message: unknown) => {
  const typedMessage = message as Message;
  if (typedMessage.type === 'run-translation') {
    return handleTranslation(
      typedMessage.payload.fromLanguage,
      typedMessage.payload.toLanguage
    );
  }
  return Promise.resolve(false);
});

const contentScriptStates = new Map<number, 'loading' | 'ready' | 'error'>();

browser.tabs.onRemoved.addListener((tabId) => {
  contentScriptStates.delete(tabId);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    contentScriptStates.delete(tabId);
  }
});
