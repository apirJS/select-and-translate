import * as browser from 'webextension-polyfill';
import { Message, TranslationResult } from './lib/types';
import { categorizeError, isTypedError, TypedError } from './lib/utils';
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
        if (result.originalText === null && result.translatedText === null) {
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

        await new Promise((r) => setTimeout(r, 100));
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

export async function handleTranslation(
  fromLang?: string,
  toLang?: string
): Promise<boolean> {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      throw new TypedError(
        'TabQueryError',
        'No active tab found or tab ID missing'
      );
    }

    const tabId = tab.id;

    await injectContentScript(tabId);

    const imageDataUrl = await browser.tabs.captureVisibleTab(undefined, {
      format: 'png',
    });

    const selectionResult = await browser.tabs.sendMessage(tabId, {
      type: 'user-select',
      payload: { tabId, imageDataUrl },
    } as Message);

    if (isTypedError(selectionResult)) {
      throw selectionResult;
    }

    if (
      typeof selectionResult !== 'string' ||
      !selectionResult.startsWith('data:image/')
    ) {
      throw new TypedError(
        'SelectionBoxError',
        'Invalid selection result: not a valid image'
      );
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
    await handleExtensionError(error);
    return false;
  }
}

async function handleExtensionError(error: unknown): Promise<void> {
  try {
    const isCommunicationError =
      error instanceof Error &&
      error.message.includes('Receiving end does not exist');

    if (!isCommunicationError) {
      await notifyContentScriptOfError(error);
    }

    let typedError: TypedError;

    if (isCommunicationError) {
      typedError = new TypedError(
        'CommunicationError',
        'Failed to communicate with the page. The tab may have changed or navigation occurred.'
      );
    } else if (isTypedError(error)) {
      typedError = error;
    } else {
      typedError = new TypedError(
        'UnknownError',
        error instanceof Error ? error.message : String(error)
      );
    }

    await reportError(typedError);
  } catch (metaError) {
    console.error('Critical error in error handling system:', metaError);
  }
}

async function notifyContentScriptOfError(error: unknown): Promise<void> {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab?.id) {
      await browser.tabs
        .sendMessage(tab.id, {
          type: 'error',
          payload: { error },
        } as Message)
        .catch(() => {
          // Silently absorb nested communication errors
        });
    }
  } catch {
    // Ignore failures here - this is just a best-effort notification
  }
}

async function reportError(
  error: TypedError | unknown,
  title?: string
): Promise<void> {
  const errorInfo = categorizeError(error);

  if (!errorInfo.shouldNotify) {
    console.log(`Silently handling error: ${errorInfo.errorType}`);
    return;
  }

  const notificationTitle = title || errorInfo.type || 'unknown error';

  await browser.notifications
    .create({
      type: 'basic',
      iconUrl: '/assets/img/icon.png',
      title: notificationTitle,
      message: errorInfo.message,
    })
    .catch((e) => console.error('Failed to show notification:', e));
}

browser.commands.onCommand.addListener(async (command: string) => {
  switch (command) {
    case 'select_and_translate':
      await handleTranslation();
      break;
    case 'reload_extension':
      browser.runtime.reload();
      console.log('[service_worker] Extension reloaded.');
      break;
    default:
      break;
  }
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

