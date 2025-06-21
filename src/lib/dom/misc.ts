import { MODAL_CLASS } from "./constants";
import { getThemeColors } from "./theme";

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

export function hideScrollbars() {
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

export function restoreScrollbars() {
  document.documentElement.style.overflow = ORIGINAL_STYLES.html.overflow || '';
  document.documentElement.style.scrollbarWidth =
    ORIGINAL_STYLES.html.scrollbarWidth || '';
  document.body.style.overflow = ORIGINAL_STYLES.body.overflow || '';
  document.body.style.marginRight = ORIGINAL_STYLES.body.marginRight || '';
}

export function applyStyles<T extends HTMLElement>(
  el: T,
  styles: Partial<CSSStyleDeclaration>
): T {
  Object.assign(el.style, styles);
  return el;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  styles?: Partial<CSSStyleDeclaration>,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (styles) applyStyles(node, styles);
  if (text != null) node.textContent = text;
  return node;
}


let globalStyleInjected = false;

export function injectGlobalStyles(): void {
  if (globalStyleInjected) return;

  const { color } = getThemeColors();
  const thumb =
    color === 'white' ? 'rgba(200,200,200,.5)' : 'rgba(100,100,100,.5)';
  const thumbHover =
    color === 'white' ? 'rgba(200,200,200,.7)' : 'rgba(100,100,100,.7)';

  const style = createElement('style');
  style.textContent = `
    .${MODAL_CLASS}, .${MODAL_CLASS} * { margin:0; padding:0; box-sizing:border-box; }
    .${MODAL_CLASS} *::-webkit-scrollbar { width:6px; height:6px; }
    .${MODAL_CLASS} *::-webkit-scrollbar-track { background:transparent; }
    .${MODAL_CLASS} *::-webkit-scrollbar-thumb { background-color:${thumb}; border-radius:3px; }
    .${MODAL_CLASS} *::-webkit-scrollbar-thumb:hover { background-color:${thumbHover}; }
    .${MODAL_CLASS} * { scrollbar-width:thin; scrollbar-color:${thumb} transparent; }
    @media (forced-colors:active) {
      .${MODAL_CLASS} *::-webkit-scrollbar-thumb { background-color:ButtonText; }
      .${MODAL_CLASS} * { scrollbar-color:ButtonText transparent; }
    }
  `;
  document.head.appendChild(style);
  globalStyleInjected = true;
}