import { showModalToViewport } from './lib/dom/modal';
import { hideLoadingToast } from './lib/dom/loadingToast';
import { selectAndCropImage } from './lib/dom/overlay';
import { Message } from './lib/types';

import * as browser from 'webextension-polyfill';
import { TypedError } from './lib/utils';

browser.runtime.onMessage.addListener(async (message: unknown) => {
  const typedMessage = message as Message;

  try {
    switch (typedMessage.type) {
      case 'ping':
        return Promise.resolve('pong');

      case 'user-select': {
        try {
          const croppedCanvas = await selectAndCropImage(
            typedMessage.payload.imageDataUrl
          );
          return croppedCanvas.toDataURL('image/png');
        } catch (error) {
          if (!(error instanceof TypedError)) {
            return new TypedError(
              'SelectionBoxError',
              error instanceof Error ? error.message : 'Invalid selection area'
            );
          }
          return error;
        }
      }

      case 'translation-result':
        await hideLoadingToast('success');
        showModalToViewport(typedMessage.payload);
        return;

      case 'error':
        await hideLoadingToast('failed');
        return;
    }
  } catch (error) {
    await hideLoadingToast('failed');

    // Format error response based on error type
    if (error instanceof TypedError) {
      return error;
    }

    const errorType = 'ContentScriptError';
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'object'
        ? JSON.stringify(error)
        : String(error);

    return new TypedError(errorType, errorMessage);
  }
});

window.addEventListener(
  'trigger-select-and-translate',
  async () => {
    console.log('Test-only trigger received!');
    await browser.runtime.sendMessage({
      type: 'run-translation',
      payload: {
        fromLanguage: 'en-US',
        toLanguage: 'id-ID',
      },
    });
  },
  false
);
