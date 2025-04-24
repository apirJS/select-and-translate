import { appendCanvasToViewport } from './lib/dom';
import { Message } from './lib/types';
import * as browser from 'webextension-polyfill';

browser.runtime.onMessage.addListener(async (message: unknown) => {
  if (browser.runtime.lastError) {
    console.error(
      '[content.js] Runtime error: ',
      browser.runtime.lastError.message
    );
    return;
  }

  try {
    const typedMessage = message as Message;
    if (typedMessage.action === 'user-select') {
      const croppedCanvas = await appendCanvasToViewport(
        typedMessage.payload.imageDataUrl
      );
      return croppedCanvas.toDataURL('image/png');
    }
  } catch (error) {
    console.error('[content.js] Something went wrong: ', error);
  }
});
