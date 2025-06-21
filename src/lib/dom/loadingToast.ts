import {
  MAXIMUM_Z_INDEX,
  TOAST_ID,
  TOAST_ANIMATION_DURATION_MS,
} from './constants';
import { applyStyles, createElement } from './misc';

export function showLoadingToast(): HTMLDivElement {
  const existingToast = document.getElementById(TOAST_ID);
  if (existingToast && document.body.contains(existingToast)) {
    document.body.removeChild(existingToast);
  }

  const toast = createElement('div', {
    position: 'fixed',
    top: '20px',
    left: '20px',
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '6px',
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
  });
  toast.id = TOAST_ID;

  const spinner = createElement('div');
  spinner.className = 'spinner';

  const spinnerStyle = createElement(
    'style',
    {},
    `
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
  `
  );
  document.head.appendChild(spinnerStyle);

  const message = createElement('span', {}, 'Processing selection...');

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
        applyStyles(spinner, {
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
