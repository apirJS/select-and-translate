import { z } from 'zod';

export const ErrorCategorySchema = z.enum([
  'user_cancelled',    // User deliberately cancelled action
  'permission',        // Permission/security issues
  'network',          // Network/API failures
  'validation',       // Data validation failures
  'system'            // System/DOM/browser issues
]);

export type ErrorCategory = z.infer<typeof ErrorCategorySchema>;

export const AppErrorSchema = z.object({
  category: ErrorCategorySchema,
  message: z.string(),
  technical: z.string().optional(), // Technical details for debugging
  shouldNotify: z.boolean(),
  canRetry: z.boolean(),
});

export type AppError = z.infer<typeof AppErrorSchema>;

export class ApplicationError extends Error {
  public readonly category: ErrorCategory;
  public readonly shouldNotify: boolean;
  public readonly canRetry: boolean;
  public readonly technical?: string;

  constructor(
    category: ErrorCategory,
    message: string,
    options: {
      technical?: string;
      shouldNotify?: boolean;
      canRetry?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.category = category;
    this.technical = options.technical;
    this.shouldNotify = options.shouldNotify ?? this.getDefaultShouldNotify(category);
    this.canRetry = options.canRetry ?? this.getDefaultCanRetry(category);
  }

  private getDefaultShouldNotify(category: ErrorCategory): boolean {
    return category !== 'user_cancelled';
  }

  private getDefaultCanRetry(category: ErrorCategory): boolean {
    switch (category) {
      case 'user_cancelled':
        return false;
      case 'network':
        return true;
      case 'permission':
        return false;
      case 'validation':
        return false;
      case 'system':
        return true;
      default:
        return false;
    }
  }

  static from(error: unknown, fallbackCategory: ErrorCategory = 'system'): ApplicationError {
    if (error instanceof ApplicationError) {
      return error;
    }

    if (error instanceof Error) {
      return this.categorizeError(error);
    }

    if (typeof error === 'string') {
      return new ApplicationError(fallbackCategory, error);
    }

    return new ApplicationError(fallbackCategory, 'An unexpected error occurred', {
      technical: String(error)
    });
  }


  private static categorizeError(error: Error): ApplicationError {
    const message = error.message.toLowerCase();
    const errorString = error.toString().toLowerCase();

    // User cancellation patterns - never notify
    if (
      message.includes('user cancelled') ||
      message.includes('action cancelled') ||
      message.includes('escape') ||
      message.includes('timeout') ||
      message.includes('aborted') ||
      message.includes('invalid selection area') ||
      message.includes('selection timed out')
    ) {
      return new ApplicationError('user_cancelled', 'Action cancelled', {
        shouldNotify: false
      });
    }

    // Developer/validation errors - don't notify unless critical
    if (
      message.includes('invalid selection result') ||
      message.includes('not a valid image') ||
      message.includes('invalid api response format') ||
      message.includes('invalid input') ||
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('parse') ||
      message.includes('schema') ||
      errorString.includes('validationerror')
    ) {
      // Don't notify for technical validation errors - these should be handled gracefully
      return new ApplicationError(
        'validation',
        'Unable to process the selection. Please try again.',
        { 
          technical: error.message,
          shouldNotify: false // Most validation errors shouldn't notify
        }
      );
    }

    // Permission patterns - always notify
    if (
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('access denied') ||
      errorString.includes('permissionerror')
    ) {
      return new ApplicationError(
        'permission',
        'Permission required. Please check extension permissions.',
        { technical: error.message, shouldNotify: true }
      );
    }

    // Network patterns - notify but be smart about retries
    if (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('offline') ||
      errorString.includes('networkerror') ||
      errorString.includes('fetcherror') ||
      message.includes('http error')
    ) {
      return new ApplicationError(
        'network',
        'Connection problem. Please check your internet connection.',
        { technical: error.message, canRetry: true, shouldNotify: true }
      );
    }

    // Translation-specific user-facing errors - notify only if meaningful
    if (
      message.includes('no text detected') ||
      message.includes('no text found') ||
      message.includes('text not found')
    ) {
      return new ApplicationError(
        'validation',
        'No text found in selected area',
        { technical: error.message, shouldNotify: true }
      );
    }

    // Generic translation errors - don't notify, let the UI handle it
    if (
      message.includes('translation') ||
      message.includes('invalid response from translation service')
    ) {
      return new ApplicationError(
        'system',
        'Translation failed. Please try again.',
        { technical: error.message, shouldNotify: false, canRetry: true }
      );
    }

    // System/DOM patterns - only notify for critical issues
    if (
      message.includes('canvas') ||
      message.includes('dom') ||
      message.includes('element not found') ||
      message.includes('script injection')
    ) {
      return new ApplicationError(
        'system',
        'Extension error. Please refresh the page and try again.',
        { technical: error.message, canRetry: true, shouldNotify: true }
      );
    }

    // Default fallback - don't notify unless it seems critical
    const seemsCritical = 
      message.includes('critical') ||
      message.includes('fatal') ||
      message.includes('security') ||
      message.includes('crash');

    return new ApplicationError(
      'system',
      'Something went wrong. Please try again.',
      { 
        technical: error.message, 
        canRetry: true,
        shouldNotify: seemsCritical
      }
    );
  }

  toJSON(): AppError {
    return {
      category: this.category,
      message: this.message,
      technical: this.technical,
      shouldNotify: this.shouldNotify,
      canRetry: this.canRetry,
    };
  }
}

export type Result<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: ApplicationError;
};

export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

export function failure<T>(error: unknown): Result<T> {
  return { success: false, error: ApplicationError.from(error) };
}

export async function tryAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    return failure(error);
  }
}

export function trySync<T>(fn: () => T): Result<T> {
  try {
    const data = fn();
    return success(data);
  } catch (error) {
    return failure(error);
  }
}
