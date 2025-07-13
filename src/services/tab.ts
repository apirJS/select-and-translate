import { BrowserAdapter } from '../adapters/browser';
import { ApplicationError } from '../lib/errors';
import { MessageService } from './message';

export class TabService {
  private static instance: TabService;
  private contentScriptStates = new Map<
    number,
    'loading' | 'ready' | 'error'
  >();
  private messageService: MessageService;
  private browserAdapter: BrowserAdapter;

  private constructor() {
    this.messageService = MessageService.getInstance();
    this.browserAdapter = BrowserAdapter.getInstance();
    this.initializeEventListeners();
  }

  static getInstance(): TabService {
    if (!TabService.instance) {
      TabService.instance = new TabService();
    }
    return TabService.instance;
  }

  async getCurrentTab(): Promise<any> {
    const [tab] = await this.browserAdapter.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      throw new ApplicationError(
        'system',
        'No active tab found or tab ID missing'
      );
    }

    return tab;
  }

  async cleanupOverlaysInTab(tabId: number): Promise<void> {
    try {
      await this.messageService.sendToTab(tabId, {
        type: 'cleanup_overlays',
      });
    } catch (error) {
      console.warn('Failed to clean up overlays:', error);
      // Non-critical error, so we can continue
    }
  }

  async captureVisibleTab(): Promise<string> {
    try {
      const tab = await this.getCurrentTab();
      
      if (tab.id) {
        await this.cleanupOverlaysInTab(tab.id);
      }
      
      await new Promise(r => setTimeout(r, 50));
      
      return await this.browserAdapter.tabs.captureVisibleTab(undefined, {
        format: 'png',
      });
    } catch (error) {
      console.error('Error during tab capture:', error);
      throw error;
    }
  }

  async injectContentScript(tabId: number): Promise<void> {
    try {
      if (this.contentScriptStates.get(tabId) === 'ready') {
        return;
      }

      try {
        const pong = await this.messageService.sendToTab(tabId, {
          type: 'ping',
        });
        if (pong === 'pong') {
          this.contentScriptStates.set(tabId, 'ready');
          return;
        }
        throw new Error('Invalid response');
      } catch (error) {
        this.contentScriptStates.set(tabId, 'loading');

        await this.browserAdapter.scripting.executeScript({
          target: { tabId: tabId },
          files: ['/assets/js/content.js'],
          injectImmediately: true,
        });

        let attempts = 0;
        while (attempts < 10) {
          try {
            const pong = await this.messageService.sendToTab(tabId, {
              type: 'ping',
            });
            if (pong === 'pong') {
              this.contentScriptStates.set(tabId, 'ready');
              return;
            }
          } catch (e) {}

          await new Promise((r) => setTimeout(r, 100));
          attempts++;
        }

        throw new ApplicationError('system', 'Failed to load content script');
      }
    } catch (error) {
      this.contentScriptStates.set(tabId, 'error');
      throw error;
    }
  }

  async openExtensionShortcuts(): Promise<void> {
    const userAgent = navigator.userAgent;
    let url: string;

    if (userAgent.includes('Chrome')) {
      url = 'chrome://extensions/shortcuts';
    } else if (userAgent.includes('Firefox')) {
      url = 'about:addons';
    } else if (userAgent.includes('Edge')) {
      url = 'edge://extensions/shortcuts';
    } else if (userAgent.includes('Opera')) {
      url = 'opera://extensions/shortcuts';
    } else {
      throw new ApplicationError(
        'system',
        'Unsupported browser for shortcuts page'
      );
    }

    await this.browserAdapter.tabs.create({ url });
  }

  private initializeEventListeners(): void {
    this.browserAdapter.onTabRemoved((tabId: any) => {
      this.contentScriptStates.delete(tabId);
    });

    this.browserAdapter.onTabUpdated((tabId: any, changeInfo: any) => {
      if (changeInfo.status === 'loading') {
        this.contentScriptStates.delete(tabId);
      }
    });
  }
}
