import { applyEventListener, coatTheScreen } from './lib/dom';
import { Message } from './lib/types';

chrome.runtime.onMessage.addListener(function (message: Message) {
  if (message.action === 'scan') {
    coatTheScreen();
    applyEventListener();
  }
});
