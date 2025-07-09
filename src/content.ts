import { showModalToViewport } from './lib/dom/modal';
import { hideLoadingToast } from './lib/dom/loadingToast';
import { selectAndCropImage } from './lib/dom/overlay';
import { Message } from './lib/types';
import { applyThemeToDocument, initializeTheme } from './lib/dom/theme';

import * as browser from 'webextension-polyfill';
import { TypedError } from './lib/utils';

// Initialize theme on content script load
initializeTheme();

browser.runtime.onMessage.addListener(async (message: unknown) => {
  const typedMessage = message as Message;

  try {
    switch (typedMessage.type) {
      case 'ping':
        return Promise.resolve('pong');

      case 'user-select': {
        try {
          const croppedCanvas = await selectAndCropImage(
            typedMessage.payload.imageDataUrl
          );
          return croppedCanvas.toDataURL('image/png');
        } catch (error) {
          if (!(error instanceof TypedError)) {
            return new TypedError(
              'SelectionBoxError',
              error instanceof Error ? error.message : 'Invalid selection area'
            );
          }
          return error;
        }
      }

      case 'translation-result':
        await hideLoadingToast('success');
        await showModalToViewport(typedMessage.payload);
        return;

      case 'theme-changed':
        // Apply theme changes to the content page
        applyThemeToDocument(typedMessage.payload.theme);
        
        // Also update any existing modals
        const existingModals = document.querySelectorAll('.translation-modal');
        existingModals.forEach(modal => {
          // Remove old theme classes
          modal.classList.remove('theme-light', 'theme-dark');
          // Add new theme class
          modal.classList.add(`theme-${typedMessage.payload.theme}`);
        });
        
        // Also apply to document root for fallback
        document.documentElement.classList.remove('theme-light', 'theme-dark');
        document.documentElement.classList.add(`theme-${typedMessage.payload.theme}`);
        return;

      case 'error':
        await hideLoadingToast('failed');
        return;
    }
  } catch (error) {
    await hideLoadingToast('failed');

    // Format error response based on error type
    if (error instanceof TypedError) {
      return error;
    }

    const errorType = 'ContentScriptError';
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'object'
        ? JSON.stringify(error)
        : String(error);

    return new TypedError(errorType, errorMessage);
  }
});

window.addEventListener(
  'trigger-select-and-translate',
  async () => {
    console.log('Test-only trigger received!');
    await browser.runtime.sendMessage({
      type: 'run-translation',
      payload: {
        fromLanguage: 'en-US',
        toLanguage: 'id-ID',
      },
    });
  },
  false
);
