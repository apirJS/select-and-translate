import { Message, MessageResponse, Rectangle } from './lib/types';

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DOM_SCRAPING'],
    justification: 'Run OCR with tesseract.js inside Worker',
  });
}

async function requestOCR(
  imageDataUrl: string,
  rect: Rectangle
): Promise<string> {
  await ensureOffscreen();

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'ocr',
        payload: { imageDataUrl, rectangle: rect },
      },
      (response: MessageResponse) => {
        if (response.success) resolve(response.text);
        else reject(new Error('Unknown OCR failure'));
      }
    );
  });
}

chrome.commands.onCommand.addListener(function () {
  if (chrome.runtime.lastError) {
    console.error('Something went wrong:', chrome.runtime.lastError.message);
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      console.error('No active tab found.');
      return;
    }

    const tabId = tab.id;
    if (!tabId) {
      console.error('Failed to retrieve tab ID.');
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: ['/assets/js/content.js'],
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error(
            'Something went wrong while executing the script:',
            chrome.runtime.lastError.message
          );
          return;
        }

        try {
          chrome.tabs.sendMessage(tabId, {
            action: 'user-select',
            payload: {
              tabId,
            },
          } as Message);
        } catch (err) {
          console.error('Error sending message to content script:', err);
        }
      }
    );
  });
});

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (chrome.runtime.lastError) {
    console.error('Something went wrong:', chrome.runtime.lastError.message);
    return;
  }

  (async () => {
    try {
      if (message.action === 'capture') {
        chrome.tabs.captureVisibleTab(
          { format: 'png' },
          async (imageDataUrl: string) => {
            try {
              const text = await requestOCR(
                imageDataUrl,
                message.payload.rectangle
              );
              console.log('OCR result:', text);
              sendResponse({ success: true, text });
            } catch (err) {
              console.error('OCR error:', err);
              sendResponse({ success: false, error: (err as Error).message });
            }
          }
        );
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      sendResponse({ success: false, error: (err as Error).message });
    }
  })();

  return true;
});
