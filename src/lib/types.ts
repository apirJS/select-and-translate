export type Message =
  | {
      action: 'user-select';
      payload: {
        tabId: number;
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

export type MessageResponse = {
  type: "ocr-result"
  text: string
} & { success: boolean }

export type Rectangle = { x: number; y: number; width: number; height: number };
