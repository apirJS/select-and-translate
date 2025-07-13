import { BrowserAdapter } from '../adapters/browser';

export class NotificationService {
  private static instance: NotificationService;
  private browserAdapter: BrowserAdapter;

  private constructor() {
    this.browserAdapter = BrowserAdapter.getInstance();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async show(title: string, message: string, iconUrl?: string): Promise<void> {
    try {
      await this.browserAdapter.notifications.create({
        type: 'basic',
        iconUrl: iconUrl || '/assets/img/icon.png',
        title,
        message,
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Show an error notification - simplified interface
   */
  async showError(message: string, title: string = 'Error'): Promise<void> {
    console.log('NotificationService.showError:', { message, title });
    await this.show(title, message);
  }

  async showSuccess(message: string, title: string = 'Success'): Promise<void> {
    await this.show(title, message);
  }
}
