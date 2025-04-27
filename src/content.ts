import {
  hideLoadingToast,
  selectAndCropImage,
  showPopupToViewport,
} from './lib/dom';
import { Message } from './lib/types';
import * as browser from 'webextension-polyfill';

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
      showPopupToViewport(typedMessage.payload);
    } else if (typedMessage.type === 'error') {
      await hideLoadingToast('failed');
    }
  } catch (error) {
    await hideLoadingToast('failed');
    return error;
  }
});
