import * as browser from 'webextension-polyfill';
import { Message } from './lib/types';
import { NamedError } from './lib/utils';
console.log('[service_worker] Background script loaded');

async function requestTranslation(imageDataUrl: string): Promise<string> {
  try {
    const base64Image = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await fetch(
      'https://translate.apir.live/api/translate?from=auto&to=indonesia',
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
      throw new NamedError(
        'FetchError',
        `HTTP error! Status: ${response.status}`
      );
    }

    const result = await response.json();
    
    return result;
  } catch (error) {
    throw new NamedError(
      'FetchError',
      `Failed to request translation: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

browser.commands.onCommand.addListener(async (command) => {
  if (browser.runtime.lastError) {
    console.error('Something went wrong:', browser.runtime.lastError.message);
    return;
  }

  console.log('[service_worker] Command received:', command);

  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      console.error('[service_worker] No active tab found.');
      return;
    }

    const tabId = tab.id;
    if (!tabId) {
      console.error('[service_worker] Failed to retrieve tab ID.');
      return;
    }

    await browser.scripting.executeScript({
      target: { tabId: tabId },
      files: ['/assets/js/content.js'],
    });

    const imageDataUrl = await browser.tabs.captureVisibleTab(undefined, {
      format: 'png',
    });
    const croppedImageDataUrl: string = await browser.tabs.sendMessage(tabId, {
      action: 'user-select',
      payload: {
        tabId,
        imageDataUrl,
      },
    } as Message);

    if (!croppedImageDataUrl) {
      console.error(
        '[service_worker] No image data received from content script'
      );
      return;
    }

    console.log('[service_worker] Cropped Image: ', croppedImageDataUrl);

    const result = await requestTranslation(croppedImageDataUrl);
    console.log('[service_worker] Result: ', result);
  } catch (error) {
    console.error(
      '[service_worker] Something went wrong: ',
      error instanceof Error ? error.message : 'Unknown reason'
    );
  }
});
