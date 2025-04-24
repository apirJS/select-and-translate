export type Message =
  | {
      action: 'user-select';
      payload: {
        tabId: number;
        imageDataUrl: string;
      };
    }
  | {
      action: 'ocr';
      payload: {
        imageDataUrl: string;
        rectangle: Rectangle;
      };
    }
  | {
      action: 'capture';
      payload: {
        rectangle: Rectangle;
        tabId: number;
      };
    };

export type MessageResponse =
  | {
      success: true;
      type: 'ocr-result';
      text: string;
    }
  | {
      success: false;
      type: 'error';
      error: string;
    };

export type Rectangle = { x: number; y: number; width: number; height: number };
