import { z } from 'zod';

export class DOMSchemas {
  static readonly HTMLElement = z.custom<HTMLElement>((val) => {
    return val instanceof HTMLElement;
  }, { message: "Must be a valid HTMLElement" });

  static readonly HTMLCanvasElement = z.custom<HTMLCanvasElement>((val) => {
    return val instanceof HTMLCanvasElement;
  }, { message: "Must be a valid HTMLCanvasElement" });

  static readonly HTMLImageElement = z.custom<HTMLImageElement>((val) => {
    return val instanceof HTMLImageElement;
  }, { message: "Must be a valid HTMLImageElement" });

  static readonly HTMLSelectElement = z.custom<HTMLSelectElement>((val) => {
    return val instanceof HTMLSelectElement;
  }, { message: "Must be a valid HTMLSelectElement" });

  static readonly CanvasRenderingContext2D = z.custom<CanvasRenderingContext2D>((val) => {
    return val instanceof CanvasRenderingContext2D;
  }, { message: "Must be a valid CanvasRenderingContext2D" });

  static readonly KeyboardEvent = z.custom<KeyboardEvent>((val) => {
    return val instanceof KeyboardEvent;
  }, { message: "Must be a valid KeyboardEvent" });

  static readonly MouseEvent = z.custom<MouseEvent>((val) => {
    return val instanceof MouseEvent;
  }, { message: "Must be a valid MouseEvent" });
}

export class GeometrySchemas {
  static readonly Coordinates = z.object({
    x: z.number(),
    y: z.number(),
  });

  static readonly Dimensions = z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  });

  static readonly BoundingRect = this.Coordinates.extend({
    width: z.number().nonnegative(),
    height: z.number().nonnegative(),
  });
}

export class CSSSchemas {
  static readonly Color = z.string().regex(
    /^(#[0-9a-fA-F]{3,8}|(rgb|hsl)a?\([^)]+\)|[a-zA-Z]+)$/,
    'Invalid CSS color format'
  );

  static readonly Length = z.string().regex(
    /^-?\d*\.?\d+(px|em|rem|%|vw|vh|vmin|vmax|pt|pc|in|cm|mm|ex|ch)$/,
    'Invalid CSS length format'
  );
}

export class DataSchemas {
  static readonly ImageDataUrl = z.string().regex(
    /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/,
    'Invalid image data URL format'
  );

  static readonly Base64String = z.string().regex(
    /^[A-Za-z0-9+/]*={0,2}$/,
    'Invalid base64 string format'
  );
}

export class DOMValidator {
  static validateElement<T extends HTMLElement>(
    element: unknown,
    elementType: string = 'HTMLElement'
  ): T {
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Expected ${elementType}, got ${typeof element}`);
    }
    return element as T;
  }

  static validateCanvas(canvas: unknown): HTMLCanvasElement {
    const result = DOMSchemas.HTMLCanvasElement.safeParse(canvas);
    if (!result.success) {
      throw new Error(`Invalid canvas element: ${result.error.message}`);
    }
    return result.data;
  }

  static validateContext2D(context: unknown): CanvasRenderingContext2D {
    const result = DOMSchemas.CanvasRenderingContext2D.safeParse(context);
    if (!result.success) {
      throw new Error(`Invalid 2D rendering context: ${result.error.message}`);
    }
    return result.data;
  }

  static validateCoordinates(coordinates: unknown) {
    return GeometrySchemas.Coordinates.parse(coordinates);
  }

  static validateDimensions(dimensions: unknown) {
    return GeometrySchemas.Dimensions.parse(dimensions);
  }

  static validateBoundingRect(rect: unknown) {
    return GeometrySchemas.BoundingRect.parse(rect);
  }

  static validateImageDataUrl(dataUrl: unknown): string {
    return DataSchemas.ImageDataUrl.parse(dataUrl);
  }
}

export class DOMQuery {
  static safeQuerySelector<T extends HTMLElement>(
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

  static safeQuerySelectorRequired<T extends HTMLElement>(
    parent: Document | HTMLElement,
    selector: string,
    elementName?: string
  ): T {
    const element = this.safeQuerySelector<T>(parent, selector);
    if (!element) {
      throw new Error(`Required element not found: ${selector}${elementName ? ` (${elementName})` : ''}`);
    }
    return element;
  }

  static safeGetElementById<T extends HTMLElement>(id: string): T | null {
    return this.safeQuerySelector<T>(document, `#${id}`);
  }

  static safeGetElementByIdRequired<T extends HTMLElement>(
    id: string,
    elementName?: string
  ): T {
    return this.safeQuerySelectorRequired<T>(document, `#${id}`, elementName);
  }
}

// Legacy exports for backward compatibility
export const HTMLElementSchema = DOMSchemas.HTMLElement;
export const HTMLCanvasElementSchema = DOMSchemas.HTMLCanvasElement;
export const HTMLImageElementSchema = DOMSchemas.HTMLImageElement;
export const HTMLSelectElementSchema = DOMSchemas.HTMLSelectElement;
export const CanvasRenderingContext2DSchema = DOMSchemas.CanvasRenderingContext2D;
export const KeyboardEventSchema = DOMSchemas.KeyboardEvent;
export const MouseEventSchema = DOMSchemas.MouseEvent;
export const CoordinatesSchema = GeometrySchemas.Coordinates;
export const DimensionsSchema = GeometrySchemas.Dimensions;
export const BoundingRectSchema = GeometrySchemas.BoundingRect;
export const CSSColorSchema = CSSSchemas.Color;
export const CSSLengthSchema = CSSSchemas.Length;
export const ImageDataUrlSchema = DataSchemas.ImageDataUrl;
export const Base64StringSchema = DataSchemas.Base64String;
export const validateElement = DOMValidator.validateElement.bind(DOMValidator);
export const validateCanvas = DOMValidator.validateCanvas.bind(DOMValidator);
export const validateContext2D = DOMValidator.validateContext2D.bind(DOMValidator);
export const validateCoordinates = DOMValidator.validateCoordinates.bind(DOMValidator);
export const validateDimensions = DOMValidator.validateDimensions.bind(DOMValidator);
export const validateBoundingRect = DOMValidator.validateBoundingRect.bind(DOMValidator);
export const validateImageDataUrl = DOMValidator.validateImageDataUrl.bind(DOMValidator);
export const safeQuerySelector = DOMQuery.safeQuerySelector.bind(DOMQuery);
export const safeQuerySelectorRequired = DOMQuery.safeQuerySelectorRequired.bind(DOMQuery);
export const safeGetElementById = DOMQuery.safeGetElementById.bind(DOMQuery);
export const safeGetElementByIdRequired = DOMQuery.safeGetElementByIdRequired.bind(DOMQuery);
