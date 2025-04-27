import { TypedError } from './utils';

export type Message =
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
  | { type: 'ping' }
  | { type: 'run-translation' };

export type TranslationResult = {
  originalText: string;
  translatedText: string;
};

export type Rectangle = { x: number; y: number; width: number; height: number };
