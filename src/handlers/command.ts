import * as browser from 'webextension-polyfill';
import { MessageService } from '../services/message';
import { AuthService } from '../services/auth';
import { TranslationHandler } from './translation';

export class CommandHandler {
  private messageService: MessageService;
  private authService: AuthService;
  private translationHandler: TranslationHandler;

  constructor() {
    this.messageService = MessageService.getInstance();
    this.authService = AuthService.getInstance();
    this.translationHandler = new TranslationHandler();
  }

  async handleCommand(command: string): Promise<void> {
    switch (command) {
      case 'select_and_translate':
        try {
          await this.authService.ensureInitialized();
          
          if (!this.authService.isAuthenticated) {
            await this.showSignInToast();
          } else {
            await this.translationHandler.execute();
          }
        } catch (error) {
          console.error('Failed to handle select_and_translate command:', error);
        }
        break;
      case 'reload_extension':
        this.reloadExtension();
        break;
      default:
        console.warn(`Unknown command: ${command}`);
        break;
    }
  }

  private async showSignInToast(): Promise<void> {
    try {
      const message = {
        type: 'show-signin-toast' as const,
        payload: {}
      };
      await this.messageService.broadcastToAllTabs(message);
    } catch (error) {
      console.warn('Failed to show signin toast:', error);
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
