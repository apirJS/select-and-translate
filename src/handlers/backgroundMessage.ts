import { MessageService } from '../services/message';
import { ErrorService } from '../services/error';
import { CommandHandler } from './command';
import { ConfigService } from '../core/config';
import { AuthService } from '../services/auth';

export class BackgroundMessageHandler {
  private messageService: MessageService;
  private errorService: ErrorService;
  private commandHandler: CommandHandler;
  private configService: ConfigService;
  private authService: AuthService;

  constructor() {
    this.messageService = MessageService.getInstance();
    this.errorService = ErrorService.getInstance();
    this.commandHandler = new CommandHandler();
    this.configService = ConfigService.getInstance();
    this.authService = AuthService.getInstance();
  }

  async handleMessage(message: unknown): Promise<unknown> {
    try {
      const typedMessage = this.messageService.parseMessage(message);

      switch (typedMessage.type) {
        case 'run-translation':
          return await this.commandHandler.handleRunTranslation(
            typedMessage.payload.fromLanguage,
            typedMessage.payload.toLanguage
          );

        case 'theme-changed':
          return await this.commandHandler.handleThemeChanged(typedMessage.payload);

        case 'preferences-changed':
          this.configService.handlePreferencesChanged(typedMessage.payload);
          return true;

        case 'request-oauth':
          return await this.handleOAuthRequest();

        default:
          console.warn(`Unhandled message type: ${typedMessage.type}`);
          return false;
      }
    } catch (error) {
      return this.errorService.handleError(error, 'BackgroundMessageHandler');
    }
  }

  private async handleOAuthRequest(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.authService.ensureInitialized();
      await this.authService.getOAuthToken();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OAuth failed';
      return { success: false, error: errorMessage };
    }
  }
}
