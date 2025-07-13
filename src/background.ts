import { BrowserAdapter } from './adapters/browser';
import { BackgroundMessageHandler } from './handlers/backgroundMessage';
import { CommandHandler } from './handlers/command';

class BackgroundScript {
  private browserAdapter: BrowserAdapter;
  private messageHandler: BackgroundMessageHandler;
  private commandHandler: CommandHandler;

  constructor() {
    this.browserAdapter = BrowserAdapter.getInstance();
    this.messageHandler = new BackgroundMessageHandler();
    this.commandHandler = new CommandHandler();
    
    this.initialize();
  }

  private initialize(): void {
    console.log('[service_worker] Background script loaded');
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.browserAdapter.onCommand(async (command: string) => {
      await this.commandHandler.handleCommand(command);
    });

    this.browserAdapter.onMessage(async (message: unknown) => {
      return await this.messageHandler.handleMessage(message);
    });
  }
}

new BackgroundScript();
