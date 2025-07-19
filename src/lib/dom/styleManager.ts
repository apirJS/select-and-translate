import modalStyles from '../../styles/modal.css?raw';
import loadingToastStyles from '../../styles/loadingToast.css?raw';
import signInToastStyles from '../../styles/signInToast.css?raw';
import overlayStyles from '../../styles/overlay.css?raw';
import utilitiesStyles from '../../styles/utilities.css?raw';
import colorsStyles from '../../styles/colors.css?raw';

interface StyleManager {
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

export class StyleManagerFactory {
  private static managers = new Map<string, ComponentStyleManager>();

  private static createManager(component: string, styles: string): ComponentStyleManager {
    const id = `select-translate-${component}-styles`;
    if (!this.managers.has(id)) {
      this.managers.set(id, new ComponentStyleManager(id, styles));
    }
    return this.managers.get(id)!;
  }

  static getModalManager(): ComponentStyleManager {
    return this.createManager('modal', modalStyles);
  }

  static getLoadingToastManager(): ComponentStyleManager {
    return this.createManager('loading-toast', loadingToastStyles);
  }

  static getSignInToastManager(): ComponentStyleManager {
    return this.createManager('signin-toast', signInToastStyles);
  }

  static getOverlayManager(): ComponentStyleManager {
    return this.createManager('overlay', overlayStyles);
  }

  static getColorsManager(): ComponentStyleManager {
    return this.createManager('colors', colorsStyles);
  }

  static getUtilitiesManager(): ComponentStyleManager {
    return this.createManager('utilities', utilitiesStyles);
  }
}

export class MasterStyleManager {
  private managers: StyleManager[];

  constructor() {
    this.managers = [
      StyleManagerFactory.getColorsManager(),
      StyleManagerFactory.getUtilitiesManager(),
      StyleManagerFactory.getModalManager(),
      StyleManagerFactory.getLoadingToastManager(),
      StyleManagerFactory.getSignInToastManager(),
      StyleManagerFactory.getOverlayManager(),
    ];
  }

  injectAll(): void {
    this.managers.forEach(manager => manager.inject());
  }

  removeAll(): void {
    this.managers.forEach(manager => manager.remove());
  }

  injectComponent(component: 'modal' | 'loading-toast' | 'signin-toast' | 'overlay' | 'utilities' | 'colors'): void {
    const managerMap = {
      modal: StyleManagerFactory.getModalManager(),
      'loading-toast': StyleManagerFactory.getLoadingToastManager(),
      'signin-toast': StyleManagerFactory.getSignInToastManager(),
      overlay: StyleManagerFactory.getOverlayManager(),
      utilities: StyleManagerFactory.getUtilitiesManager(),
      colors: StyleManagerFactory.getColorsManager(),
    };

    StyleManagerFactory.getColorsManager().inject();
    StyleManagerFactory.getUtilitiesManager().inject();
    managerMap[component].inject();
  }

  areAllInjected(): boolean {
    return this.managers.every(manager => manager.isInjected());
  }
}

const masterStyleManager = new MasterStyleManager();

export function injectComponentStyles(component: 'modal' | 'loading-toast' | 'signin-toast' | 'overlay' | 'utilities' | 'colors'): void {
  masterStyleManager.injectComponent(component);
}

export function cleanupAllStyles(): void {
  masterStyleManager.removeAll();
}

export const modalStyleManager = StyleManagerFactory.getModalManager();
export const loadingToastStyleManager = StyleManagerFactory.getLoadingToastManager();
export const signInToastStyleManager = StyleManagerFactory.getSignInToastManager();
export const overlayStyleManager = StyleManagerFactory.getOverlayManager();
export const colorsStyleManager = StyleManagerFactory.getColorsManager();
export const utilitiesStyleManager = StyleManagerFactory.getUtilitiesManager();
