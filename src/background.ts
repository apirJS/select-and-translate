import * as browser from 'webextension-polyfill';
import { Message, TranslationResult } from './lib/types';
import { isError, TypedError } from './lib/utils';
console.log('[service_worker] Background script loaded');

async function requestTranslation(
  imageDataUrl: string,
  fromLang: string = 'auto',
  toLang: string = 'indonesia'
): Promise<TranslationResult> {
  try {
    const base64Image = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    const response = await fetch(
      `https://translate.apir.live/api/translate?from=${fromLang}&to=${toLang}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
        }),
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
        'Translation failed: there is no text on the image'
      );
    }

    return result;
  } catch (error) {
    throw error;
  }
}

browser.commands.onCommand.addListener(async () => {
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

    try {
      await browser.tabs.sendMessage(tabId, { type: 'ping' });
    } catch (error) {
      await browser.scripting.executeScript({
        target: { tabId: tabId },
        files: ['/assets/js/content.js'],
        injectImmediately: true,
      });
    }

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
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'errorType' in error &&
      (error.errorType === 'TimeoutReached' ||
        error.errorType === 'UserEscapeKeyPressed')
    ) {
      return;
    }

    if (error instanceof TypedError) {
      await reportError(error, error.errorType);
    } else {
      await reportError(error);
    }
  }
});

async function reportError(error: unknown, title = 'Extension Error') {
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'object' && error !== null) {
    try {
      if ('errorType' in error && typeof error.errorType === 'string') {
        const errorMessage =
          'message' in error ? error.message : 'Unknown error';
        message = `${error.errorType}: ${errorMessage}`;
      } else {
        message = JSON.stringify(error, null, 2);
      }
    } catch {
      message = 'An error occurred';
    }
  } else {
    message = String(error);
  }

  await browser.notifications.create({
    type: 'basic',
    iconUrl: '/assets/img/icon.png',
    title,
    message,
  });
}
