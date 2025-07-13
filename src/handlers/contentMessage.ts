import { showModalToViewport } from '../lib/dom/modal';
import { hideLoadingToast } from '../lib/dom/loadingToast';
import {  selectAndCropImage } from '../lib/dom/overlay';
import { existingCanvasAndOverlayCleanup } from '../lib/dom/overlay';
import { applyThemeToDocument } from '../lib/dom/theme';
import { MessageService } from '../services/message';
import { ErrorService } from '../services/error';
import { ApplicationError } from '../lib/errors';

export class ContentMessageHandler {
  private messageService: MessageService;
  private errorService: ErrorService;

  constructor() {
    this.messageService = MessageService.getInstance();
    this.errorService = ErrorService.getInstance();
  }

  async handleMessage(message: unknown): Promise<unknown> {
    try {
      const typedMessage = this.messageService.parseMessage(message);

      switch (typedMessage.type) {
        case 'ping':
          return 'pong';

        case 'cleanup_overlays':
          existingCanvasAndOverlayCleanup();
          return true;

        case 'user-select':
          return await this.handleUserSelect(typedMessage.payload.imageDataUrl);

        case 'translation-result':
          return await this.handleTranslationResult(typedMessage.payload);

        case 'theme-changed':
          return await this.handleThemeChanged(typedMessage.payload);

        case 'error':
          return await this.handleError();

        default:
          console.warn(`Unhandled message type: ${typedMessage.type}`);
          return undefined;
      }
    } catch (error) {
      await hideLoadingToast('failed');
      return this.errorService.handleError(error, 'ContentMessageHandler');
    }
  }

  private async handleUserSelect(
    imageDataUrl: string
  ): Promise<string | ApplicationError> {
    try {
      const croppedCanvas = await selectAndCropImage(imageDataUrl);
      return croppedCanvas.toDataURL('image/png');
    } catch (error) {
      return this.errorService.handleError(error, 'UserSelect');
    }
  }

  private async handleTranslationResult(payload: any): Promise<void> {
    await hideLoadingToast('success');
    await showModalToViewport(payload);
  }

  private async handleThemeChanged(payload: {
    theme: 'light' | 'dark';
  }): Promise<void> {
    applyThemeToDocument(payload.theme);

    const existingModals = document.querySelectorAll('.translation-modal');
    existingModals.forEach((modal) => {
      modal.classList.remove('theme-light', 'theme-dark');
      modal.classList.add(`theme-${payload.theme}`);
    });

    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(`theme-${payload.theme}`);
  }

  private async handleError(): Promise<void> {
    await hideLoadingToast('failed');
  }
}
