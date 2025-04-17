import { Message } from './lib/types';
import { createWorker } from 'tesseract.js';
import { Rectangle } from './lib/types';

// function otsuThreshold(grayscale: number[]): number {
//   const histo = (data: number[], bins: number[]) =>
//     data.reduce((arr, e) => {
//       arr[bins.indexOf(e)] += 1;
//       return arr;
//     }, [...Array(bins.length)].fill(0));

//   const width = (hist: number[], s: number, e: number) => {
//     let v = 0;
//     for (let i = s; i < e; i += 1) {
//       v += hist[i];
//     }
//     return v;
//   };

//   const bins = (data: number[]) =>
//     Array.from(new Set(data)).sort((e0, e1) => e0 - e1);

//   const weight = (hist: number[], s: number, e: number, total: number) => {
//     let v = 0;
//     for (let i = s; i < e; i += 1) {
//       v += hist[i];
//     }
//     return v / total;
//   };

//   const mean = (
//     hist: number[],
//     bins: number[],
//     s: number,
//     e: number,
//     width: number
//   ) => {
//     let v = 0;
//     for (let i = s; i < e; i += 1) {
//       v += hist[i] * bins[i];
//     }
//     return v * width;
//   };

//   const variance = (
//     hist: number[],
//     bins: number[],
//     s: number,
//     e: number,
//     mean: number,
//     width: number
//   ) => {
//     let v = 0;
//     for (let i = s; i < e; i += 1) {
//       const d = bins[i] - mean;
//       v += d * d * hist[i];
//     }
//     return v * width;
//   };

//   const cross = (wb: number, vb: number, wf: number, vf: number) =>
//     wb * vb + wf * vf;

//   const b = bins(grayscale);
//   const h = histo(grayscale, b);
//   const { length: total } = grayscale;
//   const vars = [...Array(b.length)].map((_, i) => {
//     const s0 = 0;
//     const e0 = i;
//     const s1 = i;
//     const e1 = h.length;

//     const w0 = 1 / width(h, s0, e0);
//     const w1 = 1 / width(h, s1, e1);

//     const wb = weight(h, s0, e0, total);
//     const vb = variance(h, b, s0, e0, mean(h, b, s0, e0, w0), w0);

//     const wf = weight(h, s1, e1, total);
//     const vf = variance(h, b, s1, e1, mean(h, b, s1, e1, w1), w1);

//     const x = cross(wb, vb, wf, vf);

//     return !isNaN(x) ? x : Number.POSITIVE_INFINITY;
//   });

//   return b[vars.indexOf(Math.min(...vars))];
// }

// function applyOtsu(imageDataUrl: string, rect: Rectangle): Promise<string> {
//   return new Promise((resolve) => {
//     const img = new Image();
//     img.src = imageDataUrl;
//     img.onload = () => {
//       const canvas = document.createElement('canvas');
//       canvas.width = rect.width;
//       canvas.height = rect.height;
//       const ctx = canvas.getContext('2d');
//       if (!ctx) return resolve(imageDataUrl);
//       ctx.drawImage(
//         img,
//         rect.x,
//         rect.y,
//         rect.width,
//         rect.height,
//         0,
//         0,
//         rect.width,
//         rect.height
//       );

//       const imageData = ctx.getImageData(0, 0, rect.width, rect.height);
//       const pixels = imageData.data;
//       const grayscale: number[] = [];

//       for (let i = 0; i < pixels.length; i += 4) {
//         const r = pixels[i];
//         const g = pixels[i + 1];
//         const b = pixels[i + 2];
//         const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
//         grayscale.push(gray);
//       }

//       const threshold = otsuThreshold(grayscale);

//       for (let i = 0; i < pixels.length; i += 4) {
//         const gray = grayscale[i / 4];
//         const value = gray >= threshold ? 255 : 0;
//         pixels[i] = pixels[i + 1] = pixels[i + 2] = value;
//       }

//       ctx.putImageData(imageData, 0, 0);
//       resolve(canvas.toDataURL());
//     };
//   });
// }

export async function recognizeText(
  imageDataUrl: string,
  rectangle: Rectangle
): Promise<string> {
  const worker = await createWorker('eng', undefined, {
    langPath: chrome.runtime.getURL('/assets/tesseract/langs'),
    corePath: chrome.runtime.getURL('/assets/tesseract/core'),
    workerPath: chrome.runtime.getURL('/assets/tesseract/worker.min.js'),
    workerBlobURL: false,
  });
  const { data } = await worker.recognize(imageDataUrl, {
    rectangle: {
      top: rectangle.y,
      left: rectangle.x,
      width: rectangle.width,
      height: rectangle.height,
    },
  });
  await worker.terminate();
  return data.text;
}

chrome.runtime.onMessage.addListener((message: Message, _, sendResponse) => {
  (async () => {
    if (message.action === 'ocr') {
      const ocrResult = await recognizeText(
        message.payload.imageDataUrl,
        message.payload.rectangle
      );
      sendResponse({ success: true, text: ocrResult });
    }
  })();

  return true;
});
