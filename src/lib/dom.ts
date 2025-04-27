import { Rectangle, TranslationResult } from './types';
import { TypedError } from './utils';

const OVERLAY_ID = 'select-and-translate-overlay';
const CANVAS_ID = 'select-and-translate-canvas';
const POPUP_CLASS = 'select-and-translate-popup';
const MAXIMUM_Z_INDEX = '2147483647';
const SELECTION_TIMEOUT = 120000;
const TOAST_ID = 'select-and-translate-toast';
const TOAST_ANIMATION_DURATION_MS = 300; // ms

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

function showLoadingToast(): HTMLDivElement {
  const existingToast = document.getElementById(TOAST_ID);
  if (existingToast && document.body.contains(existingToast)) {
    document.body.removeChild(existingToast);
  }

  const toast = document.createElement('div');
  toast.id = TOAST_ID;

  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    left: '20px',
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    zIndex: MAXIMUM_Z_INDEX,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    transform: 'translateY(-100px)',
    opacity: '0',
    transition: 'transform 300ms ease-out, opacity 300ms ease-out',
    pointerEvents: 'none',
  } as CSSStyleDeclaration);

  const spinner = document.createElement('div');
  spinner.className = 'spinner';

  const spinnerStyle = document.createElement('style');
  spinnerStyle.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    #${TOAST_ID} .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
    }
  `;
  document.head.appendChild(spinnerStyle);

  const message = document.createElement('span');
  message.textContent = 'Processing selection...';

  toast.appendChild(spinner);
  toast.appendChild(message);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  }, 10);

  // Add a 2-minute timeout to automatically hide the toast
  const timeoutId = setTimeout(() => {
    hideLoadingToast('failed');
  }, 2 * 60 * 1000); // 2 minutes in milliseconds

  // Store the timeout ID on the toast element to clear it if needed
  toast.dataset.timeoutId = timeoutId.toString();

  return toast;
}

export function hideLoadingToast(success: string): Promise<void> {
  return new Promise((resolve) => {
    const toast = document.getElementById(TOAST_ID);

    if (!toast || !document.body.contains(toast)) {
      resolve();
      return;
    }

    if (toast.dataset.timeoutId) {
      clearTimeout(parseInt(toast.dataset.timeoutId, 10));
      delete toast.dataset.timeoutId;
    }

    const messageElement = toast.querySelector('span');
    if (messageElement) {
      messageElement.textContent =
        success === 'success' ? 'Success!' : 'Failed :(';

      const spinner = toast.querySelector('.spinner') as HTMLElement;
      if (spinner) {
        spinner.className = '';
        spinner.textContent = success === 'success' ? '✓' : '✗';
        Object.assign(spinner.style, {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor:
            success === 'success'
              ? 'rgba(0, 200, 83, 0.8)'
              : 'rgba(255, 76, 76, 0.8)',
          fontSize: '12px',
          fontWeight: 'bold',
        });
      }
    }

    toast.style.transform = 'translateY(-100px)';
    toast.style.opacity = '0';

    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
      if (document.head.querySelector(`style[data-for="${TOAST_ID}"]`)) {
        document.head.removeChild(
          document.head.querySelector(`style[data-for="${TOAST_ID}"]`)!
        );
      }
      resolve();
    }, TOAST_ANIMATION_DURATION_MS);
  });
}

function hideScrollbars() {
  // Save original styles
  ORIGINAL_STYLES.html.overflow = document.documentElement.style.overflow;
  ORIGINAL_STYLES.html.scrollbarWidth =
    document.documentElement.style.scrollbarWidth;
  ORIGINAL_STYLES.body.overflow = document.body.style.overflow;
  ORIGINAL_STYLES.body.marginRight = document.body.style.marginRight;

  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;

  // Hide scrollbars on HTML
  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.scrollbarWidth = 'none'; // For Firefox

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

async function createCanvas(
  id: string = CANVAS_ID
): Promise<[HTMLCanvasElement, CanvasRenderingContext2D]> {
  return new Promise<[HTMLCanvasElement, CanvasRenderingContext2D]>(
    (resolve, reject) => {
      const canvas = document.createElement('canvas');
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
    const [canvas, ctx] = await loadImageOntoCanvas(imageDataUrl);
    appendOverlayToViewport();

    const rectangle = await applyEventListenerToOverlay();
    const scaleX = ctx.canvas.width / window.innerWidth;
    const scaleY = ctx.canvas.height / window.innerHeight;

    const scaledRectangle = {
      x: rectangle.x * scaleX,
      y: rectangle.y * scaleY,
      width: rectangle.width * scaleX,
      height: rectangle.height * scaleY,
    };

    const result = await cropCanvas(canvas, scaledRectangle);

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
  } catch (error) {
    throw new TypedError(
      'DOMOverlayError',
      `Failed to append the overlay to viewport: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function applyEventListenerToOverlay(): Promise<Rectangle> {
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
              reject(new Error('Selection area cannot be empty'));
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
        reject(
          new TypedError('SelectionBoxError', 'Image do not have proper size')
        );
        return;
      }

      const croppedCanvas = document.createElement('canvas');
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

function getThemeColors() {
  const themes = {
    dark: {
      backgroundColor: 'rgba(22, 22, 22, 1)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      dividerColor: 'rgba(255, 255, 255, 0.2)',
    },
    light: {
      backgroundColor: 'rgba(245, 245, 245, 1)',
      color: '#333',
      border: '1px solid rgba(0, 0, 0, 0.3)',
      dividerColor: 'rgba(0, 0, 0, 0.1)',
    },
  };

  const prefersDarkTheme = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches;

  return prefersDarkTheme ? themes.dark : themes.light;
}

function createPopup(text: TranslationResult): HTMLDivElement {
  try {
    const div = document.createElement('div');
    div.classList.add(POPUP_CLASS);

    const style = document.createElement('style');
    const theme = getThemeColors();
    const thumbColor =
      theme.color === 'white'
        ? 'rgba(200, 200, 200, 0.5)'
        : 'rgba(100, 100, 100, 0.5)';
    const thumbHoverColor =
      theme.color === 'white'
        ? 'rgba(200, 200, 200, 0.7)'
        : 'rgba(100, 100, 100, 0.7)';

    style.textContent = `
      .${POPUP_CLASS}, 
      .${POPUP_CLASS} * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      .${POPUP_CLASS} *::-webkit-scrollbar {
      width: 6px;
      height: 6px;
      }
      .${POPUP_CLASS} *::-webkit-scrollbar-track {
      background: transparent;
      }
      .${POPUP_CLASS} *::-webkit-scrollbar-thumb {
      background-color: ${thumbColor};
      border-radius: 3px;
      }
      .${POPUP_CLASS} *::-webkit-scrollbar-thumb:hover {
      background-color: ${thumbHoverColor};
      }
      .${POPUP_CLASS} * {
      scrollbar-width: thin;
      scrollbar-color: ${thumbColor} transparent;
      }
      @media (forced-colors: active) {
      .${POPUP_CLASS} *::-webkit-scrollbar-thumb {
        background-color: ButtonText;
      }
      .${POPUP_CLASS} * {
        scrollbar-color: ButtonText transparent;
      }
      }
    `;

    document.head.appendChild(style);

    Object.assign(div.style, {
      width: '400px',
      maxWidth: '90vw',
      height: 'auto',
      maxHeight: '80vh',
      boxSizing: 'border-box',
      overflow: 'hidden',
      zIndex: MAXIMUM_Z_INDEX,
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: theme.backgroundColor,
      color: theme.color,
      border: theme.border,
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transition: 'all 0.3s ease',
      padding: '0',
      margin: '0',
      cursor: 'default',
      display: 'flex',
      flexDirection: 'column',
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif, Arial, Helvetica",
      fontSize: '16px',
      pointerEvents: 'auto', // Ensure clicks are captured by the popup
    } as CSSStyleDeclaration);

    // Create a draggable header area
    const header = document.createElement('div');
    Object.assign(header.style, {
      margin: '0',
      padding: '0 1em',
      minHeight: '45px',
      cursor: 'move',
      borderBottom: theme.border,
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: theme.backgroundColor,
      flexShrink: '0',
    } as CSSStyleDeclaration);

    const closeButton = document.createElement('button');
    closeButton.innerText = '×';
    Object.assign(closeButton.style, {
      margin: '0',
      padding: '0',
      border: 'none',
      background: 'transparent',
      fontSize: '24px',
      color: theme.color,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });

    const closeButtonWrapper = document.createElement('div');
    Object.assign(closeButtonWrapper.style, {
      margin: '0',
      padding: '5px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      userSelect: 'none',
    } as CSSStyleDeclaration);
    closeButtonWrapper.appendChild(closeButton);

    const headerTitle = document.createElement('span');
    headerTitle.textContent = 'Translation';
    Object.assign(headerTitle.style, {
      margin: '0',
      padding: '0',
      fontWeight: 'bold',
      userSelect: 'none',
      fontFamily: 'inherit',
      fontSize: '16px',
      color: theme.color,
    } as CSSStyleDeclaration);

    header.appendChild(headerTitle);
    header.appendChild(closeButtonWrapper);

    // Prevent event propagation
    div.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    div.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    // Make the header draggable
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        e.target === closeButton ||
        (e.target as Element).tagName === 'BUTTON'
      )
        return;

      isDragging = true;
      const rect = div.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      div.style.transition = 'none'; // Disable transition during drag
      e.stopPropagation();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      div.style.left = `${e.clientX - offsetX}px`;
      div.style.top = `${e.clientY - offsetY}px`;
      div.style.transform = 'none'; // Remove translate(-50%, -50%)
      e.stopPropagation();
      e.preventDefault(); // Prevent default browser behavior
    };

    const handleMouseUp = (e: MouseEvent) => {
      isDragging = false;
      div.style.transition = 'all 0.3s ease'; // Restore transition
      e.stopPropagation();
    };

    header.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    const contentContainer = document.createElement('div');
    Object.assign(contentContainer.style, {
      margin: '0',
      padding: '1em',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: 'auto',
      position: 'relative',
      userSelect: 'text',
      overflowX: 'hidden',
      overflowY: 'auto',
      flexGrow: '1',
      boxSizing: 'border-box',
    } as CSSStyleDeclaration);

    const originalDiv = document.createElement('div');
    Object.assign(originalDiv.style, {
      margin: '0.5em 0',
      padding: '0',
      flex: '1',
    } as CSSStyleDeclaration);

    const originalTitle = document.createElement('h3');
    originalTitle.innerText = 'Original Text';
    Object.assign(originalTitle.style, {
      margin: '0',
      padding: '0',
      marginBottom: '8px',
      fontSize: '14px',
      color: theme.color,
      fontWeight: 'bold',
      userSelect: 'none',
      alignSelf: 'center',
      width: '100%',
      height: 'auto',
      minHeight: 'fit-content',
      lineHeight: '1.4',
    } as CSSStyleDeclaration);

    const p1 = document.createElement('p');
    p1.innerText = text.originalText;
    Object.assign(p1.style, {
      margin: '0',
      padding: '0',
      color: theme.color,
      fontFamily: 'inherit',
      fontSize: '14px',
      lineHeight: '1.5',
      fontWeight: 'normal',
      wordBreak: 'break-word',
      userSelect: 'text',
      cursor: 'text',
    });
    p1.classList.add('original-text-content');

    const p1Container = document.createElement('div');
    Object.assign(p1Container.style, {
      margin: '0',
      padding: '10px',
      overflowY: 'auto',
      maxHeight: '120px',
      wordBreak: 'break-word',
      border: theme.border,
      borderRadius: '4px',
    });

    p1Container.appendChild(p1);
    originalDiv.appendChild(originalTitle);
    originalDiv.appendChild(p1Container);

    const divider = document.createElement('div');
    Object.assign(divider.style, {
      margin: '15px auto',
      padding: '0',
      width: '90%',
      height: '1px',
      backgroundColor: theme.dividerColor,
      flexShrink: '0',
      alignSelf: 'center',
      opacity: '0.8',
    } as CSSStyleDeclaration);

    const translatedDiv = document.createElement('div');
    Object.assign(translatedDiv.style, {
      margin: '0.5em 0',
      padding: '0',
      flex: '1',
    } as CSSStyleDeclaration);

    const translatedTitle = document.createElement('h3');
    translatedTitle.innerText = 'Translated Text';
    Object.assign(translatedTitle.style, {
      margin: '0',
      padding: '0',
      marginBottom: '8px',
      fontSize: '14px',
      color: theme.color,
      fontWeight: 'bold',
      userSelect: 'none',
      width: '100%',
      height: 'auto',
      minHeight: 'fit-content',
      lineHeight: '1.4',
    } as CSSStyleDeclaration);

    const p2 = document.createElement('p');
    p2.innerText = text.translatedText;
    Object.assign(p2.style, {
      margin: '0',
      padding: '0',
      color: theme.color,
      fontFamily: 'inherit',
      fontSize: '14px',
      lineHeight: '1.5',
      fontWeight: 'normal',
      wordBreak: 'break-word',
      userSelect: 'text',
      cursor: 'text',
    });
    p2.classList.add('translated-text-content');

    const p2Container = document.createElement('div');
    Object.assign(p2Container.style, {
      margin: '0',
      padding: '10px',
      overflowY: 'auto',
      maxHeight: '120px',
      wordBreak: 'break-word',
      border: theme.border,
      borderRadius: '4px',
    });

    p2Container.appendChild(p2);
    translatedDiv.appendChild(translatedTitle);
    translatedDiv.appendChild(p2Container);

    const footer = document.createElement('div');
    Object.assign(footer.style, {
      margin: '0',
      padding: '8px 12px',
      minHeight: '45px',
      display: 'flex',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '8px',
      borderTop: theme.border,
      backgroundColor: theme.backgroundColor,
      alignItems: 'center',
      flexShrink: '0',
    } as CSSStyleDeclaration);

    const createButton = (text: string, onClick: () => void) => {
      const button = document.createElement('button');
      button.innerText = text;
      Object.assign(button.style, {
        margin: '0',
        padding: '6px 12px',
        border: theme.border,
        borderRadius: '4px',
        backgroundColor: 'transparent',
        color: theme.color,
        cursor: 'pointer',
        fontSize: '14px',
        minWidth: '100px',
        height: '30px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      } as CSSStyleDeclaration);
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
      });
      return button;
    };

    const createCopyButton = (text: string, contentToClone: string) => {
      const button = createButton(text, () => {
        navigator.clipboard.writeText(contentToClone);
        const originalWidth = button.offsetWidth;
        const originalText = button.innerText;

        button.style.width = `${originalWidth}px`;
        button.innerText = '✓ Copied!';

        setTimeout(() => {
          button.innerText = originalText;
          button.style.width = '';
        }, 2000);
      });
      return button;
    };

    const copyOriginalBtn = createCopyButton(
      'Copy Original',
      text.originalText
    );
    const copyTranslatedBtn = createCopyButton(
      'Copy Translation',
      text.translatedText
    );

    footer.appendChild(copyOriginalBtn);
    footer.appendChild(copyTranslatedBtn);

    closeButton.onclick = (e) => {
      e.stopPropagation();

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }

      div.style.opacity = '0';
      div.style.transform = 'translate(-50%, -50%) scale(0.95)';

      // Remove after animation
      setTimeout(() => {
        if (document.body.contains(div)) {
          document.body.removeChild(div);
        }

        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      }, 300);
    };

    // Add a backdrop to prevent interaction with underlying page
    const backdrop = document.createElement('div');
    Object.assign(backdrop.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'transparent',
      zIndex: (parseInt(MAXIMUM_Z_INDEX) - 1).toString(),
      pointerEvents: 'none', // Initially set to none
    });
    document.body.appendChild(backdrop);

    // Link popup and backdrop for cleanup
    div.dataset.backdropId = backdrop.id = `backdrop-${Date.now()}`;

    // Use MutationObserver instead of deprecated DOMNodeRemoved event
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'childList' &&
          Array.from(mutation.removedNodes).includes(div) &&
          document.body.contains(backdrop)
        ) {
          document.body.removeChild(backdrop);
          observer.disconnect();
          break;
        }
      }
    });

    // Start observing the document body for configured mutations
    observer.observe(document.body, { childList: true });

    contentContainer.appendChild(originalDiv);
    contentContainer.appendChild(divider);
    contentContainer.appendChild(translatedDiv);

    div.appendChild(header);
    div.appendChild(contentContainer);
    div.appendChild(footer);

    return div;
  } catch (error) {
    throw new TypedError(
      'DOMPopupError',
      `Failed to create popup: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function showPopupToViewport(text: TranslationResult) {
  try {
    const popup = createPopup(text);
    document.body.appendChild(popup);
  } catch (error) {
    throw error;
  }
}
