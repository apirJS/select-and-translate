import { MessageService } from '../services/message';
import { ErrorService } from '../services/error';
import { CommandHandler } from './command';

export class BackgroundMessageHandler {
  private messageService: MessageService;
  private errorService: ErrorService;
  private commandHandler: CommandHandler;

  constructor() {
    this.messageService = MessageService.getInstance();
    this.errorService = ErrorService.getInstance();
    this.commandHandler = new CommandHandler();
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

        default:
          console.warn(`Unhandled message type: ${typedMessage.type}`);
          return false;
      }
    } catch (error) {
      return this.errorService.handleError(error, 'BackgroundMessageHandler');
    }
  }
}
