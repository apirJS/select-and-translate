import { MessageService } from '../services/message';
import { ErrorService } from '../services/error';
import { CommandHandler } from './command';
import { ConfigService } from '../core/config';

export class BackgroundMessageHandler {
  private messageService: MessageService;
  private errorService: ErrorService;
  private commandHandler: CommandHandler;
  private configService: ConfigService;

  constructor() {
    this.messageService = MessageService.getInstance();
    this.errorService = ErrorService.getInstance();
    this.commandHandler = new CommandHandler();
    this.configService = ConfigService.getInstance();
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

        default:
          console.warn(`Unhandled message type: ${typedMessage.type}`);
          return false;
      }
    } catch (error) {
      return this.errorService.handleError(error, 'BackgroundMessageHandler');
    }
  }
}
