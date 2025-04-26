type ErrorType =
  | 'DOMElementMissingError'
  | 'DOMCanvasError'
  | 'DOMOverlayError'
  | 'DOMEventListenerError'
  | 'DOMPopupError'
  | 'FetchError'
  | 'TranslationError'
  | 'SelectionBoxError'
  | 'TabQueryError'
  | 'TimeoutReached'
  | 'UserEscapeKeyPressed';
export class TypedError extends Error {
  public errorType: ErrorType;

  constructor(errorType: ErrorType, message: string) {
    super(`[${errorType}] ${message}`);
    this.errorType = errorType;
  }
}

export function isError(obj: unknown): boolean {
  return (
    obj instanceof Error || 
    (typeof obj === 'object' && 
     obj !== null && 
     'errorType' in obj &&
     typeof obj.errorType === 'string')
  );
}