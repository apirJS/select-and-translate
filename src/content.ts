import { showModalToViewport } from './lib/dom/modal';
import { hideLoadingToast } from './lib/dom/loadingToast';
import { selectAndCropImage } from './lib/dom/overlay';
import { Message } from './lib/types';

import * as browser from 'webextension-polyfill';
import { TypedError } from './lib/utils';

browser.runtime.onMessage.addListener(async (message: unknown) => {
  const typedMessage = message as Message;
  try {
    if (typedMessage.type === 'ping') {
      return Promise.resolve('pong');
    }

    if (typedMessage.type === 'user-select') {
      const croppedCanvas = await selectAndCropImage(
        typedMessage.payload.imageDataUrl
      );
      return croppedCanvas.toDataURL('image/png');
    } else if (typedMessage.type === 'translation-result') {
      await hideLoadingToast('success');
      showModalToViewport(typedMessage.payload);
    } else if (typedMessage.type === 'error') {
      await hideLoadingToast('failed');
    }
  } catch (error) {
    await hideLoadingToast('failed');

    if (error instanceof TypedError) {
      return {
        errorType: error.errorType,
        errorMessage: error.message,
      };
    } else if (error instanceof Error) {
      return {
        errorType: 'ContentScriptError',
        errorMessage: error.message,
      };
    } else if (typeof error === 'object' && error !== null) {
      return {
        errorType: 'ContentScriptError',
        errorMessage: JSON.stringify(error),
      };
    } else {
      return {
        errorType: 'ContentScriptError',
        errorMessage: String(error),
      };
    }
  }
});
