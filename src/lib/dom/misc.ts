import { DOMConstants } from "./constants";
import { getThemeColors } from "./theme";

interface StyleState {
  html: {
    overflow: string;
    scrollbarWidth: string;
  };
  body: {
    overflow: string;
    marginRight: string;
  };
}

export class ScrollbarManager {
  private static originalStyles: StyleState = {
    html: { overflow: '', scrollbarWidth: '' },
    body: { overflow: '', marginRight: '' },
  };

  static hide(): void {
    this.saveOriginalStyles();
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.scrollbarWidth = 'none';
    document.body.style.overflow = 'hidden';
    document.body.style.marginRight = `${scrollbarWidth}px`;
  }

  static restore(): void {
    document.documentElement.style.overflow = this.originalStyles.html.overflow || '';
    document.documentElement.style.scrollbarWidth = this.originalStyles.html.scrollbarWidth || '';
    document.body.style.overflow = this.originalStyles.body.overflow || '';
    document.body.style.marginRight = this.originalStyles.body.marginRight || '';
  }

  private static saveOriginalStyles(): void {
    this.originalStyles.html.overflow = document.documentElement.style.overflow;
    this.originalStyles.html.scrollbarWidth = document.documentElement.style.scrollbarWidth;
    this.originalStyles.body.overflow = document.body.style.overflow;
    this.originalStyles.body.marginRight = document.body.style.marginRight;
  }
}

export class DOMStyler {
  static applyStyles<T extends HTMLElement>(
    element: T,
    styles: Partial<CSSStyleDeclaration>
  ): T {
    Object.assign(element.style, styles);
    return element;
  }

  static createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    styles?: Partial<CSSStyleDeclaration>,
    text?: string
  ): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (styles) this.applyStyles(node, styles);
    if (text != null) node.textContent = text;
    return node;
  }
}

export class GlobalStyleInjector {
  private static injected = false;

  static inject(): void {
    if (this.injected) return;

    const { color } = getThemeColors();
    const thumb = color === 'white' ? 'rgba(200,200,200,.5)' : 'rgba(100,100,100,.5)';
    const thumbHover = color === 'white' ? 'rgba(200,200,200,.7)' : 'rgba(100,100,100,.7)';

    const style = DOMStyler.createElement('style');
    style.textContent = `
      .${DOMConstants.MODAL_CLASS}, .${DOMConstants.MODAL_CLASS} * { margin:0; padding:0; box-sizing:border-box; }
      .${DOMConstants.MODAL_CLASS} *::-webkit-scrollbar { width:6px; height:6px; }
      .${DOMConstants.MODAL_CLASS} *::-webkit-scrollbar-track { background:transparent; }
      .${DOMConstants.MODAL_CLASS} *::-webkit-scrollbar-thumb { background-color:${thumb}; border-radius:3px; }
      .${DOMConstants.MODAL_CLASS} *::-webkit-scrollbar-thumb:hover { background-color:${thumbHover}; }
      .${DOMConstants.MODAL_CLASS} * { scrollbar-width:thin; scrollbar-color:${thumb} transparent; }
      @media (forced-colors:active) {
        .${DOMConstants.MODAL_CLASS} *::-webkit-scrollbar-thumb { background-color:ButtonText; }
        .${DOMConstants.MODAL_CLASS} * { scrollbar-color:ButtonText transparent; }
      }
    `;
    document.head.appendChild(style);
    this.injected = true;
  }
}

// Legacy exports for backward compatibility
export const hideScrollbars = ScrollbarManager.hide.bind(ScrollbarManager);
export const restoreScrollbars = ScrollbarManager.restore.bind(ScrollbarManager);
export const applyStyles = DOMStyler.applyStyles.bind(DOMStyler);
export const createElement = DOMStyler.createElement.bind(DOMStyler);
export const injectGlobalStyles = GlobalStyleInjector.inject.bind(GlobalStyleInjector);