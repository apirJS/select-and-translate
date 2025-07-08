import modalStyles from '../../styles/modal.css?raw';
import toastStyles from '../../styles/toast.css?raw';
import overlayStyles from '../../styles/overlay.css?raw';
import utilitiesStyles from '../../styles/utilities.css?raw';
import colorsStyles from '../../styles/colors.css?raw';

export interface StyleManager {
  inject(): void;
  remove(): void;
  isInjected(): boolean;
}

class ComponentStyleManager implements StyleManager {
  private styleId: string;
  private cssContent: string;
  private injected = false;

  constructor(styleId: string, cssContent: string) {
    this.styleId = styleId;
    this.cssContent = cssContent;
  }

  inject(): void {
    if (this.injected || document.getElementById(this.styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = this.styleId;
    style.textContent = this.cssContent;
    document.head.appendChild(style);
    this.injected = true;
  }

  remove(): void {
    const existingStyle = document.getElementById(this.styleId);
    if (existingStyle) {
      existingStyle.remove();
      this.injected = false;
    }
  }

  isInjected(): boolean {
    return this.injected && !!document.getElementById(this.styleId);
  }
}

// Create style managers for each component
export const modalStyleManager = new ComponentStyleManager(
  'select-translate-modal-styles',
  modalStyles
);

export const toastStyleManager = new ComponentStyleManager(
  'select-translate-toast-styles',
  toastStyles
);

export const overlayStyleManager = new ComponentStyleManager(
  'select-translate-overlay-styles',
  overlayStyles
);

export const colorsStyleManager = new ComponentStyleManager(
  'select-translate-colors-styles',
  colorsStyles
);

export const utilitiesStyleManager = new ComponentStyleManager(
  'select-translate-utilities-styles',
  utilitiesStyles
);

// Master style manager
export class MasterStyleManager {
  private managers: StyleManager[] = [
    colorsStyleManager,
    utilitiesStyleManager,
    modalStyleManager,
    toastStyleManager,
    overlayStyleManager,
  ];

  injectAll(): void {
    this.managers.forEach(manager => manager.inject());
  }

  removeAll(): void {
    this.managers.forEach(manager => manager.remove());
  }

  injectComponent(component: 'modal' | 'toast' | 'overlay' | 'utilities' | 'colors'): void {
    const managerMap = {
      modal: modalStyleManager,
      toast: toastStyleManager,
      overlay: overlayStyleManager,
      utilities: utilitiesStyleManager,
      colors: colorsStyleManager,
    };

    // Always inject colors and utilities first for base styles
    colorsStyleManager.inject();
    utilitiesStyleManager.inject();
    managerMap[component].inject();
  }

  areAllInjected(): boolean {
    return this.managers.every(manager => manager.isInjected());
  }
}

export const masterStyleManager = new MasterStyleManager();

// Utility function for one-off style injection
export function injectComponentStyles(component: 'modal' | 'toast' | 'overlay' | 'utilities' | 'colors'): void {
  masterStyleManager.injectComponent(component);
}

// Global cleanup function
export function cleanupAllStyles(): void {
  masterStyleManager.removeAll();
}
