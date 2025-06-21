import { ErrorType } from './types';
export class TypedError extends Error {
  public errorType: ErrorType;

  constructor(errorType: ErrorType, message: string) {
    super(`[${errorType}] ${message}`);
    this.errorType = errorType;
  }
}

export function isTypedError(obj: unknown): obj is TypedError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'errorType' in obj &&
    typeof obj.errorType === 'string' &&
    (('message' in obj && typeof obj.message === 'string') ||
      ('errorMessage' in obj && typeof obj.errorMessage === 'string'))
  );
}

export function categorizeError(error: unknown): {
  type: 'user' | 'network' | 'permission' | 'extension';
  errorType: ErrorType;
  message: string;
  shouldNotify: boolean;
} {
  // User cancellations - don't notify
  if (
    typeof error === 'object' &&
    error !== null &&
    'errorType' in error &&
    (error.errorType === 'TimeoutReached' ||
      error.errorType === 'UserEscapeKeyPressed')
  ) {
    return {
      type: 'user',
      errorType: error.errorType,
      message:
        'errorMessage' in error
          ? String(error.errorMessage)
          : 'Action cancelled',
      shouldNotify: false,
    };
  }

  // Network errors - notify but with specific message
  if (
    (error instanceof Error &&
      (error.message.toLowerCase().includes('fetch') ||
        error.message.includes('NetworkError'))) ||
    (typeof error === 'object' &&
      error !== null &&
      'errorType' in error &&
      error.errorType === 'FetchError')
  ) {
    return {
      type: 'network',
      errorType: 'NetworkError',
      message: 'Connection problem. Please check your internet and try again.',
      shouldNotify: true,
    };
  }

  // Permission errors
  if (
    (error instanceof Error &&
      error.message.toLowerCase().includes('permission')) ||
    (typeof error === 'object' &&
      error !== null &&
      'errorType' in error &&
      error.errorType === 'PermissionError')
  ) {
    return {
      type: 'permission',
      errorType: 'PermissionError',
      message:
        'The extension needs additional permissions to work on this page.',
      shouldNotify: true,
    };
  }

  // Translation Error - No text detected
  if (error instanceof TypedError && error.errorType === 'TranslationError') {
    return {
      type: 'extension',
      errorType: 'TranslationError',
      message: 'No text found',
      shouldNotify: true,
    };
  }

  // System/other errors
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : String(error);

  return {
    type: 'extension',
    errorType: error instanceof TypedError ? error.errorType : 'UnknownError',
    message: errorMessage,
    shouldNotify: true,
  };
}
