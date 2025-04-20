import { applyEventListener, coatTheScreen } from './lib/dom';
import { Message } from './lib/types';

chrome.runtime.onMessage.addListener(function (message: Message) {
  if (chrome.runtime.lastError) {
    console.error(
      '[content] Runtime error: ',
      chrome.runtime.lastError.message
    );
    return;
  }

  (async () => {
    try {
      if (message.action === 'user-select') {
        coatTheScreen();
        const rectangle = await applyEventListener();

        chrome.runtime.sendMessage({
          action: 'capture',
          payload: {
            rectangle,
            tabId: message.payload.tabId,
          },
        } as Message);
      }
    } catch (error) {
      console.error('[content] Something went wrong: ', error);
    }
  })();
});
