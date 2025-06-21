import { Rectangle } from '../types';
import { TypedError } from '../utils';
import {
  CANVAS_ID,
  MAXIMUM_Z_INDEX,
  OVERLAY_ID,
  SELECTION_TIMEOUT,
} from './constants';
import { showLoadingToast } from './loadingToast';
import {
  applyStyles,
  createElement,
  hideScrollbars,
  restoreScrollbars,
} from './misc';

function existingCanvasAndOverlayCleanup() {
  detachCanvasFromViewport();
  detachOverlayFromViewport();
}

async function createCanvas(
  id: string = CANVAS_ID
): Promise<[HTMLCanvasElement, CanvasRenderingContext2D]> {
  return new Promise<[HTMLCanvasElement, CanvasRenderingContext2D]>(
    (resolve, reject) => {
      const canvas = createElement('canvas');
      canvas.id = id;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(
          new TypedError(
            'DOMCanvasError',
            "Canvas 2D context is not available. This may occur if your browser doesn't support canvas or has disabled it."
          )
        );
        return;
      }

      resolve([canvas, ctx]);
      return;
    }
  );
}

export async function loadImageOntoCanvas(
  imageDataUrl: string
): Promise<[HTMLCanvasElement, CanvasRenderingContext2D]> {
  existingCanvasAndOverlayCleanup();

  try {
    const [canvas, ctx] = await createCanvas();
    const img = new Image();

    return new Promise<[HTMLCanvasElement, CanvasRenderingContext2D]>(
      (resolve, reject) => {
        img.onload = () => {
          try {
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0, img.width, img.height);

            applyStyles(canvas, {
              position: 'fixed',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              width: '100%',
              height: '100%',
              zIndex: MAXIMUM_Z_INDEX,
              pointerEvents: 'auto',
            });

            document.body.appendChild(canvas);
            resolve([canvas, ctx]);
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => {
          existingCanvasAndOverlayCleanup();
          reject(
            new TypedError(
              'DOMCanvasError',
              'Failed to load image, try to refresh the page. This might be due to content security policy restrictions or an invalid image format.'
            )
          );
        };

        img.src = imageDataUrl;
      }
    );
  } catch (error) {
    existingCanvasAndOverlayCleanup();
    throw error;
  }
}

export async function selectAndCropImage(
  imageDataUrl: string
): Promise<HTMLCanvasElement> {
  try {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const [canvas, ctx] = await loadImageOntoCanvas(imageDataUrl);
    appendOverlayToViewport();

    const rectangle = await applyEventListenerToOverlay(scrollX, scrollY);
    const scaleX = ctx.canvas.width / window.innerWidth;
    const scaleY = ctx.canvas.height / window.innerHeight;

    const scaledRectangle = {
      x: rectangle.x * scaleX,
      y: rectangle.y * scaleY,
      width: rectangle.width * scaleX,
      height: rectangle.height * scaleY,
    };

    const result = await cropCanvas(canvas, scaledRectangle);
    window.scrollTo(scrollX, scrollY);

    return result;
  } catch (error) {
    existingCanvasAndOverlayCleanup();
    throw error;
  }
}

function detachCanvasFromViewport() {
  try {
    const canvas = document.getElementById(CANVAS_ID);
    if (canvas && document.body.contains(canvas)) {
      document.body.removeChild(canvas);
    }

    const anyCanvases = document.querySelectorAll(`canvas[id^="${CANVAS_ID}"]`);
    anyCanvases.forEach((element) => element.remove());
  } catch (error) {
    throw new TypedError(
      'DOMCanvasError',
      `Failed to remove canvas, try to refresh the page: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function detachOverlayFromViewport() {
  try {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay && document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }

    const anyOverlays = document.querySelectorAll(`div[id^="${OVERLAY_ID}"]`);
    anyOverlays.forEach((element) => element.remove());

    restoreScrollbars();
  } catch (error) {
    restoreScrollbars();

    throw new TypedError(
      'DOMOverlayError',
      `Failed to remove overlay, try to refresh the page: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function appendOverlayToViewport() {
  try {
    detachOverlayFromViewport();
    hideScrollbars();

    const overlay = createElement('div', {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: MAXIMUM_Z_INDEX,
      pointerEvents: 'auto',
    });
    overlay.id = OVERLAY_ID;

    document.body.appendChild(overlay);
  } catch (error) {
    throw new TypedError(
      'DOMOverlayError',
      `Failed to append the overlay to viewport: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function applyEventListenerToOverlay(
  scrollX: number = 0,
  scrollY: number = 0
): Promise<Rectangle> {
  return new Promise((resolve, reject) => {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay === null) {
      reject(
        new TypedError(
          'DOMElementMissingError',
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
          new TypedError(
            'TimeoutReached',
            `Selection timed out after ${
              SELECTION_TIMEOUT / 60000
            } minutes of inactivity`
          )
        );
      }
    }, SELECTION_TIMEOUT);

    const cleanup = () => {
      if (isCleanedUp) return;

      clearTimeout(timeoutId);
      window.removeEventListener('keydown', onEscape);
      overlay.removeEventListener('pointerdown', onMouseDown);
      detachOverlayFromViewport();
      detachCanvasFromViewport();

      setTimeout(() => window.scrollTo(scrollX, scrollY), 0);

      isCleanedUp = true;
    };

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        reject(new TypedError('UserEscapeKeyPressed', 'Action canceled'));
        return;
      }
    };

    window.addEventListener('keydown', onEscape);

    const onMouseDown = (e: PointerEvent) => {
      try {
        e.preventDefault();
        overlay.setPointerCapture(e.pointerId);

        const xDown = e.clientX;
        const yDown = e.clientY;
        const selectionBox = createSelectionBox();

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
              new TypedError(
                'DOMEventListenerError',
                `Error during mouse move: ${
                  error instanceof Error ? error.message : String(error)
                }`
              )
            );
            return;
          }
        };

        const onMouseUp = (_: PointerEvent) => {
          try {
            overlay.releasePointerCapture(e.pointerId);

            const rect = selectionBox.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
              cleanup();
              reject(new Error('Invalid selection area'));
              return;
            }

            overlay.removeEventListener('pointerup', onMouseUp);
            overlay.removeEventListener('pointermove', onMouseMove);
            window.removeEventListener('blur', handleWindowBlur);

            const rectangle = {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height,
            };

            showLoadingToast();

            cleanup();
            resolve(rectangle);
          } catch (error) {
            cleanup();
            reject(
              new TypedError(
                'DOMEventListenerError',
                `Error finalizing selection: ${
                  error instanceof Error ? error.message : String(error)
                }`
              )
            );
            return;
          }
        };

        overlay.addEventListener('pointermove', onMouseMove, {
          passive: false,
        });
        overlay.addEventListener('pointerup', onMouseUp, { passive: false });
      } catch (error) {
        cleanup();
        reject(
          new TypedError(
            'DOMEventListenerError',
            `Error initializing selection: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
        return;
      }
    };

    overlay.addEventListener('pointerdown', onMouseDown, { passive: false });
  });
}

function createSelectionBox(): HTMLDivElement {
  return createElement('div', {
    position: 'fixed',
    zIndex: '2147483647',
    boxShadow: '0 0 0 100vw rgba(0,0,0,0.5)',
    outline: '2px dashed white',
  });
}

function cropCanvas(
  canvas: HTMLCanvasElement,
  rectangle: Rectangle
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    try {
      // Validate crop rectangle bounds
      const isOutOfBounds =
        rectangle.x < 0 ||
        rectangle.y < 0 ||
        rectangle.x + rectangle.width > canvas.width ||
        rectangle.y + rectangle.height > canvas.height;

      if (isOutOfBounds) {
        reject(
          new TypedError('SelectionBoxError', 'Image do not have proper size')
        );
        return;
      }

      const croppedCanvas = createElement('canvas');
      croppedCanvas.width = rectangle.width;
      croppedCanvas.height = rectangle.height;

      const ctx = croppedCanvas.getContext('2d');
      if (!ctx)
        return reject(
          new TypedError('DOMCanvasError', 'Canvas context not available')
        );

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
        new TypedError(
          'DOMCanvasError',
          `Failed to crop canvas: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  });
}
