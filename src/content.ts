import { applyEventListener, coatTheScreen } from './lib/dom';
import { Message } from './lib/types';

chrome.runtime.onMessage.addListener(function (message: Message) {
  if (chrome.runtime.lastError) {
    console.error('Something went wrong:', chrome.runtime.lastError.message);
    return;
  }

  (async () => {
    try {
      if (message.action === 'user-select') {
        coatTheScreen();
        const { x, y, width, height } = await applyEventListener();

        chrome.runtime.sendMessage({
          action: 'capture',
          payload: {
            rectangle: { x, y, width, height },
            tabId: message.payload.tabId,
          },
        } as Message);
      }
    } catch (error) {
      console.error('Something went wrong:', error);
    }
  })();

  return true;
});
