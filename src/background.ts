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
        if (chrome.runtime.lastError) {
          console.error(
            '[service_worker] Runtime error:',
            chrome.runtime.lastError.message
          );
          reject(new Error('Extension runtime error'));
          return;
        }

        if (!response) {
          console.error(
            '[service_worker] No response received from offscreen.'
          );
          reject(new Error('No response from OCR worker'));
          return;
        }

        if (response.success) {
          resolve(response.text);
        } else {
          reject(new Error(response.error || 'Unknown OCR failure'));
        }
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
      console.error('[service_worker] No active tab found.');
      return;
    }

    if (tab.url?.startsWith('chrome://')) {
      console.error(
        '[service_worker] Command cannot be executed on chrome:// pages.'
      );
      return;
    }

    const tabId = tab.id;
    if (!tabId) {
      console.error('[service_worker] Failed to retrieve tab ID.');
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: ['/assets/js/content.js'],
      },
      () => {
        try {
          chrome.tabs.sendMessage(tabId, {
            action: 'user-select',
            payload: {
              tabId,
            },
          } as Message);
        } catch (err) {
          console.error(
            '[service_worker] Error sending message to content script:',
            err
          );
        }
      }
    );
  });
});

chrome.runtime.onMessage.addListener((message) => {
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
              console.log('[service_worker] OCR result:', text);
            } catch (err) {
              console.error('[service_worker] OCR error:', err);
            }
          }
        );
      }
    } catch (err) {
      console.error('[service_worker] Unexpected error:', err);
    }
  })();

  return true;
});
