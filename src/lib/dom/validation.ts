import { z } from 'zod';

export const HTMLElementSchema = z.custom<HTMLElement>((val) => {
  return val instanceof HTMLElement;
}, {
  message: "Must be a valid HTMLElement"
});

export const HTMLCanvasElementSchema = z.custom<HTMLCanvasElement>((val) => {
  return val instanceof HTMLCanvasElement;
}, {
  message: "Must be a valid HTMLCanvasElement"
});

export const HTMLImageElementSchema = z.custom<HTMLImageElement>((val) => {
  return val instanceof HTMLImageElement;
}, {
  message: "Must be a valid HTMLImageElement"
});

export const HTMLSelectElementSchema = z.custom<HTMLSelectElement>((val) => {
  return val instanceof HTMLSelectElement;
}, {
  message: "Must be a valid HTMLSelectElement"
});

export const CoordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const DimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

export const BoundingRectSchema = CoordinatesSchema.extend({
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
});

export const CSSColorSchema = z.string().regex(
  /^(#[0-9a-fA-F]{3,8}|(rgb|hsl)a?\([^)]+\)|[a-zA-Z]+)$/,
  'Invalid CSS color format'
);

export const CSSLengthSchema = z.string().regex(
  /^-?\d*\.?\d+(px|em|rem|%|vw|vh|vmin|vmax|pt|pc|in|cm|mm|ex|ch)$/,
  'Invalid CSS length format'
);

export const KeyboardEventSchema = z.custom<KeyboardEvent>((val) => {
  return val instanceof KeyboardEvent;
}, {
  message: "Must be a valid KeyboardEvent"
});

export const MouseEventSchema = z.custom<MouseEvent>((val) => {
  return val instanceof MouseEvent;
}, {
  message: "Must be a valid MouseEvent"
});

export const ImageDataUrlSchema = z.string().regex(
  /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/,
  'Invalid image data URL format'
);

export const Base64StringSchema = z.string().regex(
  /^[A-Za-z0-9+/]*={0,2}$/,
  'Invalid base64 string format'
);

export const CanvasRenderingContext2DSchema = z.custom<CanvasRenderingContext2D>((val) => {
  return val instanceof CanvasRenderingContext2D;
}, {
  message: "Must be a valid CanvasRenderingContext2D"
});

export function validateElement<T extends HTMLElement>(
  element: unknown,
  elementType: string = 'HTMLElement'
): T {
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected ${elementType}, got ${typeof element}`);
  }
  return element as T;
}

export function validateCanvas(canvas: unknown): HTMLCanvasElement {
  const result = HTMLCanvasElementSchema.safeParse(canvas);
  if (!result.success) {
    throw new Error(`Invalid canvas element: ${result.error.message}`);
  }
  return result.data;
}

export function validateContext2D(context: unknown): CanvasRenderingContext2D {
  const result = CanvasRenderingContext2DSchema.safeParse(context);
  if (!result.success) {
    throw new Error(`Invalid 2D rendering context: ${result.error.message}`);
  }
  return result.data;
}

export function validateCoordinates(coordinates: unknown) {
  return CoordinatesSchema.parse(coordinates);
}

export function validateDimensions(dimensions: unknown) {
  return DimensionsSchema.parse(dimensions);
}

export function validateBoundingRect(rect: unknown) {
  return BoundingRectSchema.parse(rect);
}

export function validateImageDataUrl(dataUrl: unknown): string {
  return ImageDataUrlSchema.parse(dataUrl);
}

export function safeQuerySelector<T extends HTMLElement>(
  parent: Document | HTMLElement,
  selector: string
): T | null {
  try {
    const element = parent.querySelector(selector);
    if (!element) return null;
    
    if (!(element instanceof HTMLElement)) {
      console.warn(`Element ${selector} is not an HTMLElement`);
      return null;
    }
    
    return element as T;
  } catch (error) {
    console.error(`Error querying selector ${selector}:`, error);
    return null;
  }
}

export function safeQuerySelectorRequired<T extends HTMLElement>(
  parent: Document | HTMLElement,
  selector: string,
  elementName?: string
): T {
  const element = safeQuerySelector<T>(parent, selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}${elementName ? ` (${elementName})` : ''}`);
  }
  return element;
}

export function safeGetElementById<T extends HTMLElement>(
  id: string
): T | null {
  return safeQuerySelector<T>(document, `#${id}`);
}

export function safeGetElementByIdRequired<T extends HTMLElement>(
  id: string,
  elementName?: string
): T {
  return safeQuerySelectorRequired<T>(document, `#${id}`, elementName);
}
