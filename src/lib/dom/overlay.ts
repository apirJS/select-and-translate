import { Rectangle, validateRectangle } from '../types';
import { ApplicationError } from '../errors';
import { DOMConstants } from './constants';
import { showLoadingToast } from './loadingToast';
import { DOMStyler, ScrollbarManager } from './misc';
import {
  validateCanvas,
  validateContext2D,
  validateImageDataUrl,
  validateCoordinates,
  validateDimensions,
} from './validation';

interface CanvasWithContext {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

export class OverlayManager {
  static cleanup(): void {
    CanvasManager.remove();
    this.remove();
  }

  private static remove(): void {
    try {
      const overlay = document.getElementById(DOMConstants.OVERLAY_ID);
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }

      const anyOverlays = document.querySelectorAll(`div[id^="${DOMConstants.OVERLAY_ID}"]`);
      anyOverlays.forEach((element) => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });

      const classNameOverlays = document.querySelectorAll('.select-and-translate-overlay');
      classNameOverlays.forEach((element) => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });

      const styleBasedOverlays = document.querySelectorAll(`
        div[style*="rgba(0,0,0,0.5)"],
        div[style*="rgba(0, 0, 0, 0.5)"],
        div[style*="position: fixed"][style*="background-color: rgba(0"]
      `);
      styleBasedOverlays.forEach((element) => {
        const computedStyle = window.getComputedStyle(element);
        if (
          computedStyle.position === 'fixed' &&
          computedStyle.backgroundColor.includes('rgba(0, 0, 0, 0.5)') &&
          element.parentNode
        ) {
          element.parentNode.removeChild(element);
        }
      });

      ScrollbarManager.restore();
    } catch (error) {
      ScrollbarManager.restore();
      throw new ApplicationError(
        'system',
        `Failed to remove overlay, try to refresh the page: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  static create(): void {
    try {
      const existingOverlay = document.getElementById(DOMConstants.OVERLAY_ID);
      if (existingOverlay) {
        console.log('Overlay already exists, reusing for new selection process');
        return;
      }

      ScrollbarManager.hide();

      const overlay = DOMStyler.createElement('div', {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: DOMConstants.MAXIMUM_Z_INDEX,
        pointerEvents: 'auto',
      });
      overlay.id = DOMConstants.OVERLAY_ID;
      overlay.classList.add('select-and-translate-overlay');

      document.body.appendChild(overlay);
    } catch (error) {
      throw new ApplicationError(
        'system',
        `Failed to append the overlay to viewport: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

export class CanvasManager {
  private static async create(id: string = DOMConstants.CANVAS_ID): Promise<CanvasWithContext> {
    return new Promise<CanvasWithContext>((resolve, reject) => {
      try {
        const canvas = DOMStyler.createElement('canvas');
        canvas.id = id;

        const validatedCanvas = validateCanvas(canvas);
        const ctx = validatedCanvas.getContext('2d');

        if (!ctx) {
          reject(
            new ApplicationError(
              'system',
              "Canvas 2D context is not available. This may occur if your browser doesn't support canvas or has disabled it."
            )
          );
          return;
        }

        const validatedContext = validateContext2D(ctx);
        resolve({ canvas: validatedCanvas, context: validatedContext });
      } catch (error) {
        reject(
          new ApplicationError(
            'system',
            `Failed to create canvas: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    });
  }

  static async loadImageOnto(imageDataUrl: string): Promise<CanvasWithContext> {
    OverlayManager.cleanup();

    try {
      const validatedImageDataUrl = validateImageDataUrl(imageDataUrl);
      const { canvas, context } = await this.create();
      const img = new Image();

      return new Promise<CanvasWithContext>((resolve, reject) => {
        img.onload = () => {
          try {
            const dimensions = validateDimensions({
              width: img.width,
              height: img.height,
            });

            canvas.width = dimensions.width;
            canvas.height = dimensions.height;

            context.drawImage(img, 0, 0, dimensions.width, dimensions.height);

            DOMStyler.applyStyles(canvas, {
              position: 'fixed',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              width: '100%',
              height: '100%',
              zIndex: DOMConstants.MAXIMUM_Z_INDEX,
              pointerEvents: 'auto',
            });

            document.body.appendChild(canvas);
            resolve({ canvas, context });
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => {
          OverlayManager.cleanup();
          reject(
            new ApplicationError(
              'system',
              'Failed to load image, try to refresh the page. This might be due to content security policy restrictions or an invalid image format.'
            )
          );
        };

        img.src = validatedImageDataUrl;
      });
    } catch (error) {
      OverlayManager.cleanup();
      throw error;
    }
  }

  static remove(): void {
    try {
      const canvas = document.getElementById(DOMConstants.CANVAS_ID);
      if (canvas && document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }

      const anyCanvases = document.querySelectorAll(`canvas[id^="${DOMConstants.CANVAS_ID}"]`);
      anyCanvases.forEach((element) => element.remove());
    } catch (error) {
      throw new ApplicationError(
        'system',
        `Failed to remove canvas, try to refresh the page: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  static crop(canvas: HTMLCanvasElement, rectangle: Rectangle): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      try {
        const isOutOfBounds =
          rectangle.x < 0 ||
          rectangle.y < 0 ||
          rectangle.x + rectangle.width > canvas.width ||
          rectangle.y + rectangle.height > canvas.height;

        if (isOutOfBounds) {
          return reject(
            new ApplicationError('validation', 'Selection area is invalid', {
              shouldNotify: false,
              technical: 'Selection rectangle is out of canvas bounds',
            })
          );
        }

        const croppedCanvas = DOMStyler.createElement('canvas');
        croppedCanvas.width = rectangle.width;
        croppedCanvas.height = rectangle.height;

        const ctx = croppedCanvas.getContext('2d');
        if (!ctx) {
          return reject(
            new ApplicationError('system', 'Canvas context not available')
          );
        }

        ctx.drawImage(
          canvas,
          rectangle.x,
          rectangle.y,
          rectangle.width,
          rectangle.height,
          0,
          0,
          rectangle.width,
          rectangle.height
        );

        resolve(croppedCanvas);
      } catch (error) {
        reject(
          new ApplicationError(
            'system',
            `Failed to crop canvas: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    });
  }
}

export class SelectionEventHandler {
  static attachToOverlay(scrollX: number = 0, scrollY: number = 0): Promise<Rectangle> {
    return new Promise((resolve, reject) => {
      const overlay = document.getElementById(DOMConstants.OVERLAY_ID);
      if (overlay === null) {
        reject(
          new ApplicationError(
            'system',
            'Overlay element not found in the document'
          )
        );
        return;
      }

      let isCleanedUp = false;

      const timeoutId = setTimeout(() => {
        if (!isCleanedUp) {
          cleanup();
          reject(
            new ApplicationError(
              'user_cancelled',
              `Selection timed out after ${
                DOMConstants.SELECTION_TIMEOUT / 60000
              } minutes of inactivity`
            )
          );
        }
      }, DOMConstants.SELECTION_TIMEOUT);

      const cleanup = () => {
        if (isCleanedUp) return;

        clearTimeout(timeoutId);
        window.removeEventListener('keydown', onEscape);
        overlay.removeEventListener('pointerdown', onMouseDown);
        OverlayManager.cleanup();

        setTimeout(() => window.scrollTo(scrollX, scrollY), 0);
        isCleanedUp = true;
      };

      const onEscape = async (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
          reject(new ApplicationError('user_cancelled', 'Action canceled'));
        }
      };

      window.addEventListener('keydown', onEscape);

      const onMouseDown = (e: PointerEvent) => {
        try {
          e.preventDefault();
          overlay.setPointerCapture(e.pointerId);

          const xDown = e.clientX;
          const yDown = e.clientY;
          const selectionBox = this.createSelectionBox();

          overlay.style.backgroundColor = 'transparent';
          overlay.appendChild(selectionBox);

          const handleWindowBlur = () => {
            if (!isCleanedUp && selectionBox) {
              const fakePointerEvent = new PointerEvent('pointerup');
              onMouseUp(fakePointerEvent);
            }
          };

          window.addEventListener('blur', handleWindowBlur);

          const onMouseMove = (e: PointerEvent) => {
            try {
              e.preventDefault();

              const xMove = e.clientX;
              const yMove = e.clientY;

              const width = Math.abs(xMove - xDown);
              const height = Math.abs(yMove - yDown);
              const left = Math.min(xMove, xDown);
              const top = Math.min(yMove, yDown);

              selectionBox.style.left = `${left}px`;
              selectionBox.style.top = `${top}px`;
              selectionBox.style.width = `${width}px`;
              selectionBox.style.height = `${height}px`;
            } catch (error) {
              cleanup();
              reject(
                new ApplicationError(
                  'system',
                  `Error during mouse move: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                )
              );
            }
          };

          const onMouseUp = (_: PointerEvent) => {
            try {
              overlay.releasePointerCapture(e.pointerId);

              const rect = selectionBox.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) {
                cleanup();
                reject(
                  new ApplicationError('user_cancelled', 'Selection cancelled', {
                    shouldNotify: false,
                    technical: 'Selection area has zero width or height',
                  })
                );
                return;
              }

              overlay.removeEventListener('pointerup', onMouseUp);
              overlay.removeEventListener('pointermove', onMouseMove);
              window.removeEventListener('blur', handleWindowBlur);

              const coordinates = validateCoordinates({
                x: rect.left,
                y: rect.top,
              });

              const dimensions = validateDimensions({
                width: rect.width,
                height: rect.height,
              });

              const rectangle = { ...coordinates, ...dimensions };

              showLoadingToast();
              cleanup();
              resolve(rectangle);
            } catch (error) {
              cleanup();
              reject(
                new ApplicationError(
                  'system',
                  `Error finalizing selection: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                )
              );
            }
          };

          overlay.addEventListener('pointermove', onMouseMove, { passive: false });
          overlay.addEventListener('pointerup', onMouseUp, { passive: false });
        } catch (error) {
          cleanup();
          reject(
            new ApplicationError(
              'system',
              `Error initializing selection: ${
                error instanceof Error ? error.message : String(error)
              }`
            )
          );
        }
      };

      overlay.addEventListener('pointerdown', onMouseDown, { passive: false });
    });
  }

  private static createSelectionBox(): HTMLDivElement {
    return DOMStyler.createElement('div', {
      position: 'fixed',
      zIndex: '2147483647',
      boxShadow: '0 0 0 100vw rgba(0,0,0,0.5)',
      outline: '2px dashed white',
    });
  }
}

export async function selectAndCropImage(imageDataUrl: string): Promise<HTMLCanvasElement> {
  try {
    console.log('Starting selection process');
    OverlayManager.cleanup();

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const { canvas, context } = await CanvasManager.loadImageOnto(imageDataUrl);
    OverlayManager.create();

    const rectangle = await SelectionEventHandler.attachToOverlay(scrollX, scrollY);
    const validatedRectangle = validateRectangle(rectangle);

    const scaleX = context.canvas.width / window.innerWidth;
    const scaleY = context.canvas.height / window.innerHeight;

    const scaledRectangle = {
      x: validatedRectangle.x * scaleX,
      y: validatedRectangle.y * scaleY,
      width: validatedRectangle.width * scaleX,
      height: validatedRectangle.height * scaleY,
    };

    const validatedScaledRectangle = validateRectangle(scaledRectangle);
    const result = await CanvasManager.crop(canvas, validatedScaledRectangle);

    window.scrollTo(scrollX, scrollY);
    return result;
  } catch (error) {
    console.log('Selection process failed, cleaning up');
    OverlayManager.cleanup();
    throw error;
  }
}

// Legacy exports for backward compatibility
export const existingCanvasAndOverlayCleanup = OverlayManager.cleanup.bind(OverlayManager);
export const loadImageOntoCanvas = CanvasManager.loadImageOnto.bind(CanvasManager);
export const appendOverlayToViewport = OverlayManager.create.bind(OverlayManager);
export const applyEventListenerToOverlay = SelectionEventHandler.attachToOverlay.bind(SelectionEventHandler);
export const cropCanvas = CanvasManager.crop.bind(CanvasManager);

