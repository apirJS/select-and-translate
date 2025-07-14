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
    injectComponentStyles('toast');
  }

  static getInstance(): LoadingToast {
    if (!LoadingToast.instance) {
      LoadingToast.instance = new LoadingToast();
    }
    return LoadingToast.instance;
  }

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

  private createToastStructure(message: string, status: ToastStatus): HTMLDivElement {
    const toast = createDiv('loading-toast');
    toast.id = 'select-translate-toast';

    const icon = this.createIcon(status);
    const messageElement = createParagraph('loading-toast__message', message);

    toast.appendChild(icon);
    toast.appendChild(messageElement);

    return toast;
  }

  show(message: string, status: ToastStatus = 'loading'): void {
    this.hide();

    this.toastElement = this.createToastStructure(message, status);
    document.body.appendChild(this.toastElement);

    requestAnimationFrame(() => {
      if (this.toastElement) {
        addClasses(this.toastElement, 'toast-visible');
      }
    });

    if (status !== 'loading') {
      this.timeoutId = window.setTimeout(() => this.hide(), 3000);
    }
  }

  updateStatus(status: ToastStatus, message?: string): void {
    if (!this.toastElement || !isElementInDOM(this.toastElement)) {
      this.show(message || this.getDefaultMessage(status), status);
      return;
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const iconContainer = this.toastElement.querySelector('.loading-toast__icon');
    if (iconContainer) {
      const newIcon = this.createIcon(status);
      iconContainer.replaceWith(newIcon);
    }

    if (message) {
      const messageElement = this.toastElement.querySelector('.loading-toast__message');
      if (messageElement) {
        messageElement.textContent = message;
      }
    }

    if (status !== 'loading') {
      this.timeoutId = window.setTimeout(() => this.hide(), 3000);
    }
  }

  hide(): void {
    if (!this.toastElement) return;

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    removeClasses(this.toastElement, 'toast-visible');
    addClasses(this.toastElement, 'toast-hidden');

    const toastToRemove = this.toastElement;
    this.toastElement = null;

    setTimeout(() => removeElement(toastToRemove), 300);
  }

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

  isVisible(): boolean {
    return this.toastElement !== null && isElementInDOM(this.toastElement);
  }

  destroy(): void {
    this.hide();
    LoadingToast.instance = null;
  }
}

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
    toast.updateStatus(status);
    
    setTimeout(() => resolve(), 3300);
  });
}

export function updateLoadingToast(status: ToastStatus, message?: string): void {
  const toast = LoadingToast.getInstance();
  toast.updateStatus(status, message);
}
