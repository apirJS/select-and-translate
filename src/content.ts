import { selectAndCropImage, showPopupToViewport } from './lib/dom';
import { Message } from './lib/types';
import * as browser from 'webextension-polyfill';

browser.runtime.onMessage.addListener(async (message: unknown) => {
  const typedMessage = message as Message;
  try {
    if (typedMessage.type === 'user-select') {
      const croppedCanvas = await selectAndCropImage(
        typedMessage.payload.imageDataUrl
      );
      return croppedCanvas.toDataURL('image/png');
    } else if (typedMessage.type === 'translation-result') {
      showPopupToViewport(typedMessage.payload);
    }
  } catch (error) {
    return error;
  }
});
