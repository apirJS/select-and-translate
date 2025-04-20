import { cropImage } from './lib/dom';
import { Message, MessageResponse } from './lib/types';

const sandbox = document.getElementById('sandbox') as HTMLIFrameElement;
let pendingSendResponse: ((response: MessageResponse) => void) | null = null;

window.addEventListener('message', (ev) => {
  if (ev.source !== sandbox.contentWindow) return;

  if (ev.data.type === 'ocr-result' && pendingSendResponse) {
    pendingSendResponse({
      success: true,
      text: ev.data.text,
      type: 'ocr-result',
    });
    pendingSendResponse = null;
  }
});

chrome.runtime.onMessage.addListener((message: Message, _, sendResponse) => {
  if (chrome.runtime.lastError) {
    console.error(`[offscreen] last error: `, chrome.runtime.lastError.message);
  }

  (async () => {
    if (message.action === 'ocr') {
      const response = await fetch(chrome.runtime.getURL('/ocr/dic.txt'));
      const dictionaryText = await response.text();
      const croppedImageDataUrl = await cropImage(
        message.payload.imageDataUrl,
        message.payload.rectangle
      );
      
      pendingSendResponse = sendResponse;
      sandbox.contentWindow!.postMessage(
        {
          type: 'run-ocr',
          imageDataUrl: croppedImageDataUrl,
          detModelUrl: chrome.runtime.getURL('/ocr/det.onnx'),
          recModelUrl: chrome.runtime.getURL('/ocr/rec.onnx'),
          dic: dictionaryText
        },
        '*'
      );
    }
  })();

  return true;
});
