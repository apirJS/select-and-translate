import * as browser from 'webextension-polyfill';
import { MessageService } from '../services/message';
import { TranslationHandler } from './translation';

export class CommandHandler {
  private messageService: MessageService;
  private translationHandler: TranslationHandler;

  constructor() {
    this.messageService = MessageService.getInstance();
    this.translationHandler = new TranslationHandler();
  }

  async handleCommand(command: string): Promise<void> {
    switch (command) {
      case 'select_and_translate':
        await this.translationHandler.execute();
        break;
      case 'reload_extension':
        this.reloadExtension();
        break;
      default:
        console.warn(`Unknown command: ${command}`);
        break;
    }
  }

  async handleRunTranslation(fromLanguage?: string, toLanguage?: string): Promise<boolean> {
    return await this.translationHandler.execute(fromLanguage, toLanguage);
  }

  async handleThemeChanged(themeData: { mode: string; theme: string }): Promise<boolean> {
    try {
      const themeMessage = {
        type: 'theme-changed' as const,
        payload: themeData,
      };

      await this.messageService.broadcastToAllTabs(themeMessage);
      return true;
    } catch (error) {
      console.warn('Failed to broadcast theme change:', error);
      return false;
    }
  }

  private reloadExtension(): void {
    browser.runtime.reload();
    console.log('[service_worker] Extension reloaded.');
  }
}
