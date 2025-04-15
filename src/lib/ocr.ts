import { createWorker } from 'tesseract.js';

export async function recognizeText(imageDataUrl: string): Promise<string> {
  const worker = await createWorker('eng');
  const { data } = await worker.recognize(imageDataUrl);
  await worker.terminate();
  return data.text;
}
