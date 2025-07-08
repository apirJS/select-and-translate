/**
 * DOM Builder utilities for creating elements with semantic class names
 * Styles are handled separately through CSS files
 */

export interface ElementConfig {
  className?: string;
  id?: string;
  textContent?: string;
  attributes?: Record<string, string>;
  children?: HTMLElement[];
  eventListeners?: Record<string, EventListener>;
}

/**
 * Create an HTML element with the specified configuration
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  config: ElementConfig = {}
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  // Set basic properties
  if (config.className) {
    element.className = config.className;
  }
  
  if (config.id) {
    element.id = config.id;
  }
  
  if (config.textContent !== undefined) {
    element.textContent = config.textContent;
  }

  // Set attributes
  if (config.attributes) {
    Object.entries(config.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  // Add children
  if (config.children) {
    config.children.forEach(child => element.appendChild(child));
  }

  // Add event listeners
  if (config.eventListeners) {
    Object.entries(config.eventListeners).forEach(([event, listener]) => {
      element.addEventListener(event, listener);
    });
  }

  return element;
}

/**
 * Create a div with specified class and optional children
 */
export function createDiv(className?: string, children?: HTMLElement[]): HTMLDivElement {
  return createElement('div', { className, children });
}

/**
 * Create a button with specified class, text and click handler
 */
export function createButton(
  className: string,
  textContent: string,
  onClick: EventListener
): HTMLButtonElement {
  return createElement('button', {
    className,
    textContent,
    eventListeners: { click: onClick }
  });
}

/**
 * Create a span with specified class and text
 */
export function createSpan(className: string, textContent: string): HTMLSpanElement {
  return createElement('span', { className, textContent });
}

/**
 * Create a paragraph with specified class and text
 */
export function createParagraph(className: string, textContent: string): HTMLParagraphElement {
  return createElement('p', { className, textContent });
}

/**
 * Create a heading with specified level, class and text
 */
export function createHeading(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  className: string,
  textContent: string
): HTMLHeadingElement {
  return createElement(`h${level}` as keyof HTMLElementTagNameMap, {
    className,
    textContent
  }) as HTMLHeadingElement;
}

/**
 * Create a textarea with specified class and text
 */
export function createTextarea(className: string, textContent: string, readonly: boolean = true): HTMLTextAreaElement {
  return createElement('textarea', { 
    className, 
    textContent,
    attributes: readonly ? { readonly: 'true' } : {}
  });
}

/**
 * Add multiple CSS classes to an element
 */
export function addClasses(element: HTMLElement, ...classNames: string[]): void {
  element.classList.add(...classNames);
}

/**
 * Remove multiple CSS classes from an element
 */
export function removeClasses(element: HTMLElement, ...classNames: string[]): void {
  element.classList.remove(...classNames);
}

/**
 * Toggle CSS classes on an element
 */
export function toggleClasses(element: HTMLElement, ...classNames: string[]): void {
  classNames.forEach(className => element.classList.toggle(className));
}

/**
 * Check if element has a specific class
 */
export function hasClass(element: HTMLElement, className: string): boolean {
  return element.classList.contains(className);
}

/**
 * Set element content safely (prevents XSS)
 */
export function setTextContent(element: HTMLElement, text: string): void {
  element.textContent = text;
}

/**
 * Append multiple children to a parent element
 */
export function appendChildren(parent: HTMLElement, ...children: HTMLElement[]): void {
  children.forEach(child => parent.appendChild(child));
}

/**
 * Remove element from DOM with optional animation delay
 */
export function removeElement(element: HTMLElement, delay = 0): void {
  if (delay > 0) {
    setTimeout(() => element.remove(), delay);
  } else {
    element.remove();
  }
}

/**
 * Create a fragment containing multiple elements
 */
export function createFragment(...elements: HTMLElement[]): DocumentFragment {
  const fragment = document.createDocumentFragment();
  elements.forEach(element => fragment.appendChild(element));
  return fragment;
}

/**
 * Check if element exists in DOM
 */
export function isElementInDOM(element: HTMLElement): boolean {
  return document.contains(element);
}

/**
 * Find element by class name within a container
 */
export function findByClass(container: HTMLElement, className: string): HTMLElement | null {
  return container.querySelector(`.${className}`);
}

/**
 * Find all elements by class name within a container
 */
export function findAllByClass(container: HTMLElement, className: string): NodeListOf<HTMLElement> {
  return container.querySelectorAll(`.${className}`);
}

/**
 * Wait for element to be added to DOM
 */
export function waitForElement(selector: string, timeout = 5000): Promise<HTMLElement> {
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
            const found = node.matches(selector) ? node : node.querySelector(selector);
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
