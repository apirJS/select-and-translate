import { TranslationService } from '../services/translation';
import { TabService } from '../services/tab';
import { MessageService } from '../services/message';
import { ErrorService } from '../services/error';
import { ApplicationError } from '../lib/errors';

export class TranslationHandler {
  private translationService: TranslationService;
  private tabService: TabService;
  private messageService: MessageService;
  private errorService: ErrorService;

  constructor() {
    this.translationService = TranslationService.getInstance();
    this.tabService = TabService.getInstance();
    this.messageService = MessageService.getInstance();
    this.errorService = ErrorService.getInstance();
  }

  async execute(fromLang?: string, toLang?: string): Promise<boolean> {
    try {
      const tab = await this.tabService.getCurrentTab();
      
      if (!tab.id) {
        throw new ApplicationError('system', 'Tab ID missing');
      }

      await this.tabService.injectContentScript(tab.id);
      const imageDataUrl = await this.tabService.captureVisibleTab();

      const selectionResult = await this.requestUserSelection(tab.id, imageDataUrl);
      const translationResult = await this.translationService.translateImage(
        selectionResult,
        fromLang,
        toLang
      );

      await this.sendTranslationResult(tab.id, translationResult);
      return true;
    } catch (error) {
      await this.handleTranslationError(error);
      return false;
    }
  }

  private async requestUserSelection(tabId: number, imageDataUrl: string): Promise<string> {
    const userSelectMessage = {
      type: 'user-select' as const,
      payload: { tabId, imageDataUrl },
    };

    const selectionResult = await this.messageService.sendToTab(tabId, userSelectMessage);

    if (selectionResult instanceof ApplicationError) {
      throw selectionResult;
    }

    if (typeof selectionResult !== 'string' || !selectionResult.startsWith('data:image/')) {
      throw new ApplicationError(
        'validation',
        'Invalid selection result: not a valid image',
        { shouldNotify: false } // Don't notify - this is likely a user interaction issue
      );
    }

    return selectionResult;
  }

  private async sendTranslationResult(tabId: number, result: any): Promise<void> {
    const translationResultMessage = {
      type: 'translation-result' as const,
      payload: result,
    };

    await this.messageService.sendToTab(tabId, translationResultMessage);
  }

  private async handleTranslationError(error: unknown): Promise<void> {
    try {
      const isCommunicationError = this.errorService.isCommunicationError(error);

      if (!isCommunicationError) {
        await this.notifyContentScriptOfError(error);
      }

      // Handle error once - either communication error or the original error
      if (isCommunicationError) {
        const commError = this.errorService.createCommunicationError();
        // Communication errors shouldn't notify users (already set shouldNotify: false)
        this.errorService.handleSilently(commError, 'TranslationHandler');
      } else {
        // Handle and potentially notify for other errors
        await this.errorService.handleAndNotify(error, 'TranslationHandler');
      }
    } catch (metaError) {
      console.error('Critical error in translation error handling:', metaError);
    }
  }

  private async notifyContentScriptOfError(error: unknown): Promise<void> {
    try {
      const tab = await this.tabService.getCurrentTab();
      if (tab.id) {
        const errorMessage = {
          type: 'error' as const,
          payload: { error },
        };

        await this.messageService.sendToTab(tab.id, errorMessage).catch(() => {
          // Ignore communication errors when notifying
        });
      }
    } catch {
      // Ignore errors in error notification
    }
  }
}
