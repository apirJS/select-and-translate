interface ElementConfig {
  className?: string;
  id?: string;
  textContent?: string;
  attributes?: Record<string, string>;
  children?: HTMLElement[];
  eventListeners?: Record<string, EventListener>;
}

export class DOMElementBuilder {
  static createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    config: ElementConfig = {}
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);

    if (config.className) element.className = config.className;
    if (config.id) element.id = config.id;
    if (config.textContent !== undefined) element.textContent = config.textContent;

    if (config.attributes) {
      Object.entries(config.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }

    if (config.children) {
      config.children.forEach((child) => element.appendChild(child));
    }

    if (config.eventListeners) {
      Object.entries(config.eventListeners).forEach(([event, listener]) => {
        element.addEventListener(event, listener);
      });
    }

    return element;
  }

  static createDiv(className?: string, children?: HTMLElement[]): HTMLDivElement {
    return this.createElement('div', { className, children });
  }

  static createButton(
    className: string,
    textContent: string,
    onClick: EventListener
  ): HTMLButtonElement {
    return this.createElement('button', {
      className,
      textContent,
      eventListeners: { click: onClick },
    });
  }

  static createSpan(className: string, textContent: string): HTMLSpanElement {
    return this.createElement('span', { className, textContent });
  }

  static createParagraph(className: string, textContent: string): HTMLParagraphElement {
    return this.createElement('p', { className, textContent });
  }

  static createHeading(
    level: 1 | 2 | 3 | 4 | 5 | 6,
    className: string,
    textContent: string
  ): HTMLHeadingElement {
    return this.createElement(`h${level}` as keyof HTMLElementTagNameMap, {
      className,
      textContent,
    }) as HTMLHeadingElement;
  }

  static createTextarea(
    className: string,
    textContent: string,
    readonly: boolean = true
  ): HTMLTextAreaElement {
    return this.createElement('textarea', {
      className,
      textContent,
      attributes: readonly ? { readonly: 'true' } : {},
    });
  }

  static createFragment(...elements: HTMLElement[]): DocumentFragment {
    const fragment = document.createDocumentFragment();
    elements.forEach((element) => fragment.appendChild(element));
    return fragment;
  }
}

export class DOMManipulator {
  static addClasses(element: HTMLElement, ...classNames: string[]): void {
    element.classList.add(...classNames);
  }

  static removeClasses(element: HTMLElement, ...classNames: string[]): void {
    element.classList.remove(...classNames);
  }

  static toggleClasses(element: HTMLElement, ...classNames: string[]): void {
    classNames.forEach((className) => element.classList.toggle(className));
  }

  static hasClass(element: HTMLElement, className: string): boolean {
    return element.classList.contains(className);
  }

  static setTextContent(element: HTMLElement, text: string): void {
    element.textContent = text;
  }

  static appendChildren(parent: HTMLElement, ...children: HTMLElement[]): void {
    children.forEach((child) => parent.appendChild(child));
  }

  static removeElement(element: HTMLElement, delay = 0): void {
    if (delay > 0) {
      setTimeout(() => element.remove(), delay);
    } else {
      element.remove();
    }
  }

  static isElementInDOM(element: HTMLElement): boolean {
    return document.contains(element);
  }
}

export class DOMQuery {
  static findByClass(container: HTMLElement, className: string): HTMLElement | null {
    return container.querySelector(`.${className}`);
  }

  static findAllByClass(container: HTMLElement, className: string): NodeListOf<HTMLElement> {
    return container.querySelectorAll(`.${className}`);
  }

  static waitForElement(selector: string, timeout = 5000): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
              const found = node.matches(selector)
                ? node
                : node.querySelector(selector);
              if (found) {
                observer.disconnect();
                resolve(found as HTMLElement);
                return;
              }
            }
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }
}

// Legacy exports for backward compatibility
export const createElement = DOMElementBuilder.createElement.bind(DOMElementBuilder);
export const createDiv = DOMElementBuilder.createDiv.bind(DOMElementBuilder);
export const createButton = DOMElementBuilder.createButton.bind(DOMElementBuilder);
export const createSpan = DOMElementBuilder.createSpan.bind(DOMElementBuilder);
export const createParagraph = DOMElementBuilder.createParagraph.bind(DOMElementBuilder);
export const createHeading = DOMElementBuilder.createHeading.bind(DOMElementBuilder);
export const createTextarea = DOMElementBuilder.createTextarea.bind(DOMElementBuilder);
export const createFragment = DOMElementBuilder.createFragment.bind(DOMElementBuilder);
export const addClasses = DOMManipulator.addClasses.bind(DOMManipulator);
export const removeClasses = DOMManipulator.removeClasses.bind(DOMManipulator);
export const toggleClasses = DOMManipulator.toggleClasses.bind(DOMManipulator);
export const hasClass = DOMManipulator.hasClass.bind(DOMManipulator);
export const setTextContent = DOMManipulator.setTextContent.bind(DOMManipulator);
export const appendChildren = DOMManipulator.appendChildren.bind(DOMManipulator);
export const removeElement = DOMManipulator.removeElement.bind(DOMManipulator);
export const isElementInDOM = DOMManipulator.isElementInDOM.bind(DOMManipulator);
export const findByClass = DOMQuery.findByClass.bind(DOMQuery);
export const findAllByClass = DOMQuery.findAllByClass.bind(DOMQuery);
export const waitForElement = DOMQuery.waitForElement.bind(DOMQuery);
