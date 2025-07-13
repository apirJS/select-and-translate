import { initializeTheme } from './lib/dom/theme';
import { existingCanvasAndOverlayCleanup } from './lib/dom/overlay';
import { BrowserAdapter } from './adapters/browser';
import { ContentMessageHandler } from './handlers/contentMessage';
import { MessageService } from './services/message';

class ContentScript {
  private browserAdapter: BrowserAdapter;
  private messageHandler: ContentMessageHandler;
  private messageService: MessageService;

  constructor() {
    this.browserAdapter = BrowserAdapter.getInstance();
    this.messageHandler = new ContentMessageHandler();
    this.messageService = MessageService.getInstance();

    this.initialize();
  }

  private async initialize(): Promise<void> {
    existingCanvasAndOverlayCleanup();

    await initializeTheme();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.browserAdapter.onMessage(async (message: unknown) => {
      return await this.messageHandler.handleMessage(message);
    });

    this.setupTestTrigger();
  }

  private setupTestTrigger(): void {
    window.addEventListener(
      'trigger-select-and-translate',
      async () => {
        console.log('Test-only trigger received!');

        const message = {
          type: 'run-translation' as const,
          payload: {
            fromLanguage: 'en-US',
            toLanguage: 'id-ID',
          },
        };

        try {
          await this.messageService.sendToBackground(message);
        } catch (error) {
          console.error('Invalid message format for test trigger:', error);
        }
      },
      false
    );
  }
}

new ContentScript();
