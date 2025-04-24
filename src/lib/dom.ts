import { Rectangle } from './types';
import { NamedError } from './utils';

const OVERLAY_ID = 'select-and-translate-overlay';
const CANVAS_ID = 'select-and-translate-canvas';
const MAXIMUM_Z_INDEX = '2147483647';
const SELECTION_TIMEOUT = 120000;
const ORIGINAL_STYLES = {
  html: {
    overflow: '',
    scrollbarWidth: '',
  },
  body: {
    overflow: '',
    marginRight: '',
  },
};

function hideScrollbars() {
  // Save original styles
  ORIGINAL_STYLES.html.overflow = document.documentElement.style.overflow;
  ORIGINAL_STYLES.html.scrollbarWidth =
    document.documentElement.style.scrollbarWidth;
  ORIGINAL_STYLES.body.overflow = document.body.style.overflow;
  ORIGINAL_STYLES.body.marginRight = document.body.style.marginRight;

  // Calculate scrollbar width
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;

  // Hide scrollbars on HTML
  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.scrollbarWidth = 'none'; // For Firefox

  // Hide scrollbars on BODY and compensate for scrollbar width
  document.body.style.overflow = 'hidden';
  document.body.style.marginRight = `${scrollbarWidth}px`;
}

function restoreScrollbars() {
  document.documentElement.style.overflow = ORIGINAL_STYLES.html.overflow || '';
  document.documentElement.style.scrollbarWidth =
    ORIGINAL_STYLES.html.scrollbarWidth || '';
  document.body.style.overflow = ORIGINAL_STYLES.body.overflow || '';
  document.body.style.marginRight = ORIGINAL_STYLES.body.marginRight || '';
}

function existingCanvasAndOverlayCleanup() {
  detachCanvasFromViewport();
  detachOverlayFromViewport();
}

export function appendCanvasToViewport(
  imageDataUrl: string
): Promise<HTMLCanvasElement> {
  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    existingCanvasAndOverlayCleanup();

    const canvas = document.createElement('canvas');
    canvas.id = CANVAS_ID;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(
        new NamedError(
          'DOMCanvasError',
          "Canvas 2D context is not available. This may occur if your browser doesn't support canvas or has disabled it."
        )
      );
      return;
    }

    try {
      const img = new Image();
      img.onload = async () => {
        try {
          canvas.width = img.width;
          canvas.height = img.height;

          ctx.drawImage(img, 0, 0, img.width, img.height);

          Object.assign(canvas.style, {
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
          appendOverlayToViewport();

          const rectangle = await applyEventListenerToOverlay();
          const scaleX = img.width / window.innerWidth;
          const scaleY = img.height / window.innerHeight;

          const adjustedRectangle = {
            x: (rectangle.x / window.devicePixelRatio) * scaleX,
            y: (rectangle.y / window.devicePixelRatio) * scaleY,
            width: (rectangle.width / window.devicePixelRatio) * scaleX,
            height: (rectangle.height / window.devicePixelRatio) * scaleY,
          };

          const croppedCanvas = await cropCanvas(canvas, adjustedRectangle);

          resolve(croppedCanvas);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        existingCanvasAndOverlayCleanup();
        reject(
          new NamedError(
            'DOMCanvasError',
            'Failed to load image. This might be due to content security policy restrictions or an invalid image format.'
          )
        );
      };

      img.src = imageDataUrl;
    } catch (error) {
      existingCanvasAndOverlayCleanup();
      reject(error);
    }
  });
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
    console.error('Error while removing canvas:', error);
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
    console.error('Error while removing canvas:', error);

    restoreScrollbars();
  }
}

function appendOverlayToViewport() {
  detachOverlayFromViewport();
  hideScrollbars();

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;

  Object.assign(overlay.style, {
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

  document.body.appendChild(overlay);
}

function applyEventListenerToOverlay(): Promise<Rectangle> {
  return new Promise((resolve, reject) => {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay === null) {
      reject(
        new NamedError(
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
        reject(new Error('Selection timed out after 2 minutes of inactivity'));
      }
    }, SELECTION_TIMEOUT);

    const cleanup = () => {
      if (isCleanedUp) return;

      clearTimeout(timeoutId);
      window.removeEventListener('keydown', onEscape);
      overlay.removeEventListener('pointerdown', onMouseDown);
      detachOverlayFromViewport();
      detachCanvasFromViewport();

      isCleanedUp = true;
    };

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        reject(new Error('Selection cancelled by user (Escape key)'));
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
              new Error(
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

            const scale = window.devicePixelRatio || 1;
            const rect = selectionBox.getBoundingClientRect();
            const x = (rect.left + window.scrollX) * scale;
            const y = (rect.top + window.scrollY) * scale;
            const width = rect.width * scale;
            const height = rect.height * scale;

            if (width === 0 || height === 0) {
              cleanup();
              reject(new Error('Selection area cannot be empty'));
              return;
            }

            overlay.removeEventListener('pointerup', onMouseUp);
            overlay.removeEventListener('pointermove', onMouseMove);
            window.removeEventListener('blur', handleWindowBlur);

            const rectangle = { x, y, width, height };

            cleanup();

            resolve(rectangle);
          } catch (error) {
            cleanup();
            reject(
              new Error(
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
          new Error(
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
  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'fixed',
    zIndex: '2147483647',
    boxShadow: '0 0 0 100vw rgba(0,0,0,0.5)',
    outline: '2px dashed white',
  });
  return box;
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
        console.warn('Crop rectangle out of bounds');
        reject(new Error("Image do not have proper size"))
        return;
      }

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = rectangle.width;
      croppedCanvas.height = rectangle.height;

      const ctx = croppedCanvas.getContext('2d');
      if (!ctx)
        return reject(
          new NamedError('DOMCanvasError', 'Canvas context not available')
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
        new NamedError(
          'DOMCanvasError',
          `Failed to crop canvas: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  });
}
