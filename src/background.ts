import { Message } from "./lib/types";

chrome.commands.onCommand.addListener(async function () {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    const tabId = tab.id;
    if (tabId) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          files: ['/assets/js/content.js'],
        },
        () => {
          chrome.tabs.captureVisibleTab({ format: 'png' }, (imageDataUrl) => {
            chrome.tabs.sendMessage(tabId, {
              action: 'scan',
              payload: { imageDataUrl },
            });
          });
        }
      );
    }
  });
});

chrome.runtime.onMessage.addListener(async function (message: Message) {
  if (message.action === "translate") {
    console.log(message.payload.imageDataUrl)
  }
})