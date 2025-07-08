import { injectComponentStyles } from './styleManager';
import {
  createDiv,
  createParagraph,
  addClasses,
  removeClasses,
  removeElement,
  isElementInDOM,
} from './domBuilder';

type ToastStatus = 'loading' | 'success' | 'failed';

export class LoadingToast {
  private toastElement: HTMLDivElement | null = null;
  private timeoutId: number | null = null;
  private static instance: LoadingToast | null = null;

  constructor() {
    // Inject styles when toast is created
    injectComponentStyles('toast');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LoadingToast {
    if (!LoadingToast.instance) {
      LoadingToast.instance = new LoadingToast();
    }
    return LoadingToast.instance;
  }

  /**
   * Create icon element based on status
   */
  private createIcon(status: ToastStatus): HTMLDivElement {
    const icon = createDiv('loading-toast__icon');

    switch (status) {
      case 'loading':
        const spinner = createDiv('loading-toast__spinner');
        icon.appendChild(spinner);
        break;
      case 'success':
        addClasses(icon, 'loading-toast__icon--success');
        break;
      case 'failed':
        addClasses(icon, 'loading-toast__icon--error');
        break;
    }

    return icon;
  }

  /**
   * Create the toast structure
   */
  private createToastStructure(message: string, status: ToastStatus): HTMLDivElement {
    const toast = createDiv('loading-toast');
    toast.id = 'select-translate-toast';

    const icon = this.createIcon(status);
    const messageElement = createParagraph('loading-toast__message', message);

    toast.appendChild(icon);
    toast.appendChild(messageElement);

    return toast;
  }

  /**
   * Show toast with specified message and status
   */
  show(message: string, status: ToastStatus = 'loading'): void {
    // Remove existing toast if present
    this.hide();

    // Create new toast
    this.toastElement = this.createToastStructure(message, status);
    document.body.appendChild(this.toastElement);

    // Trigger animation
    requestAnimationFrame(() => {
      if (this.toastElement) {
        addClasses(this.toastElement, 'toast-visible');
      }
    });

    // Auto-hide success/error toasts after 3 seconds
    if (status !== 'loading') {
      this.timeoutId = window.setTimeout(() => {
        this.hide();
      }, 3000);
    }
  }

  /**
   * Update existing toast status and message
   */
  updateStatus(status: ToastStatus, message?: string): void {
    if (!this.toastElement || !isElementInDOM(this.toastElement)) {
      // If no toast exists, create a new one
      this.show(message || this.getDefaultMessage(status), status);
      return;
    }

    // Clear auto-hide timeout for loading state
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Update icon
    const iconContainer = this.toastElement.querySelector('.loading-toast__icon');
    if (iconContainer) {
      const newIcon = this.createIcon(status);
      iconContainer.replaceWith(newIcon);
    }

    // Update message if provided
    if (message) {
      const messageElement = this.toastElement.querySelector('.loading-toast__message');
      if (messageElement) {
        messageElement.textContent = message;
      }
    }

    // Auto-hide for success/error states
    if (status !== 'loading') {
      this.timeoutId = window.setTimeout(() => {
        this.hide();
      }, 3000);
    }
  }

  /**
   * Hide the toast with animation
   */
  hide(): void {
    if (!this.toastElement) return;

    // Clear timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Animate out
    removeClasses(this.toastElement, 'toast-visible');
    addClasses(this.toastElement, 'toast-hidden');

    // Remove from DOM after animation
    const toastToRemove = this.toastElement;
    this.toastElement = null;

    setTimeout(() => {
      removeElement(toastToRemove);
    }, 300);
  }

  /**
   * Get default message for status
   */
  private getDefaultMessage(status: ToastStatus): string {
    switch (status) {
      case 'loading':
        return 'Translating...';
      case 'success':
        return 'Translation completed!';
      case 'failed':
        return 'Translation failed';
      default:
        return 'Processing...';
    }
  }

  /**
   * Check if toast is currently visible
   */
  isVisible(): boolean {
    return this.toastElement !== null && isElementInDOM(this.toastElement);
  }

  /**
   * Force cleanup (useful for testing or manual cleanup)
   */
  destroy(): void {
    this.hide();
    LoadingToast.instance = null;
  }
}

// Convenience functions for backward compatibility
export function showLoadingToast(message: string = 'Translating...'): void {
  const toast = LoadingToast.getInstance();
  toast.show(message, 'loading');
}

export function hideLoadingToast(status: 'success' | 'failed' = 'success'): Promise<void> {
  const toast = LoadingToast.getInstance();
  
  if (!toast.isVisible()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    // Update to final status, then hide after delay
    toast.updateStatus(status);
    
    // Wait for the auto-hide to complete
    setTimeout(() => {
      resolve();
    }, 3300); // 3000ms display + 300ms fade out
  });
}

export function updateLoadingToast(status: ToastStatus, message?: string): void {
  const toast = LoadingToast.getInstance();
  toast.updateStatus(status, message);
}
