import { ApplicationError } from '../lib/errors';
import { NotificationService } from './notification';

export class ErrorService {
  private static instance: ErrorService;
  private notificationService: NotificationService;
  private recentNotifications = new Map<string, number>();
  private readonly NOTIFICATION_COOLDOWN = 5000; // 5 seconds

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }


  handleError(error: unknown, context?: string): ApplicationError {
    const appError = ApplicationError.from(error);

    if (context) {
      console.error(`[${context}] Error:`, appError.message);
      if (appError.technical) {
        console.error(`[${context}] Technical:`, appError.technical);
      }
    } else {
      console.error('Error:', appError.message);
      if (appError.technical) {
        console.error('Technical:', appError.technical);
      }
    }

    return appError;
  }

  async handleAndNotify(error: unknown, context?: string): Promise<ApplicationError> {
    const appError = this.handleError(error, context);

    if (appError.shouldNotify && this.shouldShowNotification(appError.message)) {
      await this.notificationService.showError(appError.message);
      this.recordNotification(appError.message);
    }

    return appError;
  }


  handleSilently(error: unknown, context?: string): ApplicationError {
    return this.handleError(error, context);
  }

  private shouldShowNotification(message: string): boolean {
    const now = Date.now();
    const lastShown = this.recentNotifications.get(message);
    
    if (!lastShown || now - lastShown > this.NOTIFICATION_COOLDOWN) {
      return true;
    }
    
    return false;
  }

  private recordNotification(message: string): void {
    this.recentNotifications.set(message, Date.now());
    
    // Clean up old entries to prevent memory leaks
    const cutoff = Date.now() - this.NOTIFICATION_COOLDOWN * 2;
    for (const [msg, timestamp] of this.recentNotifications.entries()) {
      if (timestamp < cutoff) {
        this.recentNotifications.delete(msg);
      }
    }
  }

  isCommunicationError(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.message.includes('Receiving end does not exist')
    );
  }

  createCommunicationError(): ApplicationError {
    return new ApplicationError(
      'system',
      'Failed to communicate with the page. The tab may have changed or navigation occurred.',
      { shouldNotify: false } // Don't notify for communication errors - they're usually not user's fault
    );
  }
}
