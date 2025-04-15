chrome.commands?.onCommand?.addListener(async function (command) {
  if (command === 'scan') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      const tabId = tab.id;
      if (tabId) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabId },
            files: ['/assets/js/content.js'],
          },
          () => {
            chrome.tabs.sendMessage(tabId, { action: 'scan' });
          }
        );
      }
    });
  }
});
