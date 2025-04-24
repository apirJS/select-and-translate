type ErrorNames = 'DOMElementMissingError' | 'DOMCanvasError' | 'FetchError';

export class NamedError extends Error {
  constructor(errorName: ErrorNames, message: string) {
    super(message);
    this.name = errorName;
  }
}
