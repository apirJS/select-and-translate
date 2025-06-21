import { ErrorType, ErrorWithType } from './types';

export class TypedError extends Error {
  public errorType: ErrorType;

  constructor(errorType: ErrorType, message: string) {
    super(`[${errorType}] ${message}`);
    this.errorType = errorType;
  }
}

export function isError(obj: unknown): obj is ErrorWithType {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'errorType' in obj &&
    typeof obj.errorType === 'string' &&
    'errorMessage' in obj &&
    typeof obj.errorMessage === 'string'
  );
}

export function categorizeError(error: unknown): {
  type: 'user' | 'network' | 'permission' | 'system';
  errorType: string;
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
      errorType: String(error.errorType),
      message:
        'errorMessage' in error
          ? String(error.errorMessage)
          : 'Action cancelled',
      shouldNotify: false,
    };
  }

  // Network errors - notify but with specific message
  if (
    (error instanceof TypeError && error.message.includes('NetworkError')) ||
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
    (error instanceof Error && error.message.includes('Permission')) ||
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

  // System/other errors
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : String(error);

  return {
    type: 'system',
    errorType: error instanceof TypedError ? error.errorType : 'UnknownError',
    message: errorMessage,
    shouldNotify: true,
  };
}
