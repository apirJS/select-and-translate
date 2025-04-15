import { applyEventListener, coatTheScreen, cropImage } from './lib/dom';
import { Message } from './lib/types';

chrome.runtime.onMessage.addListener(async function (message: Message) {
  if (message.action === 'scan') {
    coatTheScreen();
    const { imageDataUrl } = message.payload;
    const { x, y, width, height } = await applyEventListener();
    const croppedImageDataUrl = await cropImage(imageDataUrl, {
      x,
      y,
      width,
      height,
    });

    chrome.runtime.sendMessage({
      action: 'translate',
      payload: { imageDataUrl: croppedImageDataUrl },
    } as Message);
  }
});
