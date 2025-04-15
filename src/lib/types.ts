export type Message = {
  action: 'scan' | 'translate';
  payload: { imageDataUrl: string };
};
