import { BrowserAdapter } from '../adapters/browser';
import { safeParseMessage, type Message } from '../lib/types';
import { ApplicationError } from '../lib/errors';

export class MessageService {
  private static instance: MessageService;
  private browserAdapter: BrowserAdapter;

  private constructor() {
    this.browserAdapter = BrowserAdapter.getInstance();
  }

  static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  async sendToTab(tabId: number, message: unknown): Promise<unknown> {
    const parseResult = safeParseMessage(message);
    if (!parseResult.success) {
      throw new ApplicationError(
        'system',
        `Invalid message format: ${parseResult.error.message}`
      );
    }

    return await this.browserAdapter.tabs.sendMessage(tabId, parseResult.data);
  }

  async sendToBackground(message: unknown): Promise<unknown> {
    const parseResult = safeParseMessage(message);
    if (!parseResult.success) {
      throw new ApplicationError(
        'system',
        `Invalid message format: ${parseResult.error.message}`
      );
    }

    return await this.browserAdapter.runtime.sendMessage(parseResult.data);
  }

  async broadcastToAllTabs(message: unknown): Promise<void> {
    const parseResult = safeParseMessage(message);
    if (!parseResult.success) {
      throw new ApplicationError(
        'system',
        `Invalid message format: ${parseResult.error.message}`
      );
    }

    const tabs = await this.browserAdapter.tabs.query({});
    const promises = tabs.map(async (tab: any) => {
      if (tab.id && tab.url && !this.isSystemTab(tab.url)) {
        try {
          await this.browserAdapter.tabs.sendMessage(tab.id, parseResult.data);
        } catch (error) {
          console.warn(`Failed to send message to tab ${tab.id}:`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  parseMessage(data: unknown): Message {
    const parseResult = safeParseMessage(data);
    if (!parseResult.success) {
      throw new ApplicationError(
        'system',
        `Invalid message format: ${parseResult.error.message}`
      );
    }
    return parseResult.data;
  }

  private isSystemTab(url: string): boolean {
    return url.startsWith('chrome://') || 
           url.startsWith('moz-extension://') || 
           url.startsWith('edge://') || 
           url.startsWith('opera://');
  }
}
