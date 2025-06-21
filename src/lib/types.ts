import { TypedError } from './utils';

export type Message =
  | { type: 'ping' }
  | {
      type: 'user-select';
      payload: {
        tabId: number;
        imageDataUrl: string;
      };
    }
  | {
      type: 'error';
      payload: {
        error: TypedError | Error | unknown;
      };
    }
  | {
      type: 'translation-result';
      payload: TranslationResult;
    }
  | {
      type: 'run-translation';
      payload: {
        fromLanguage: string;
        toLanguage: string;
      };
    };

export type TranslationResult = {
  originalText: string;
  translatedText: string;
};

export type Rectangle = { x: number; y: number; width: number; height: number };

export type ErrorType =
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
  | 'UserEscapeKeyPressed'
  | 'CommunicationError'
  | 'ContentScriptError'
  | 'NetworkError'
  | 'PermissionError'
  | 'UnknownError';

export type ErrorWithType = { errorType: ErrorType; errorMessage: string };