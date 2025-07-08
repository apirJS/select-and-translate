import type { TranslationResult } from '../types';
import { TypedError } from '../utils';
import { injectComponentStyles } from './styleManager';
import {
  createDiv,
  createButton,
  createSpan,
  createParagraph,
  createHeading,
  addClasses,
  removeClasses,
  appendChildren,
  removeElement,
} from './domBuilder';

type Cleanup = () => void;

interface ModalComponents {
  modal: HTMLDivElement;
  backdrop: HTMLDivElement;
  cleanup: Cleanup;
}

export class TranslationModal {
  private modal: HTMLDivElement | null = null;
  private cleanup: Cleanup | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };

  constructor(private data: TranslationResult) {
    // Inject styles when modal is created
    injectComponentStyles('modal');
  }

  /**
   * Attach drag functionality to modal header
   */
  private attachDragBehavior(header: HTMLElement, modal: HTMLDivElement): Cleanup {
    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      
      this.isDragging = true;
      const rect = modal.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      
      addClasses(modal, 'is-dragging');
      e.stopPropagation();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;
      
      modal.style.left = `${e.clientX - this.dragOffset.x}px`;
      modal.style.top = `${e.clientY - this.dragOffset.y}px`;
      modal.style.transform = 'none';
      
      e.preventDefault();
    };

    const handleMouseUp = () => {
      this.isDragging = false;
      removeClasses(modal, 'is-dragging');
    };

    header.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      header.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }

  /**
   * Create a text section (original or translated)
   */
  private createTextSection(
    title: string,
    content: string,
    contentClass: string
  ): HTMLDivElement {
    const section = createDiv('translation-modal__section');
    
    const titleElement = createHeading(3, 'translation-modal__section-title', title);
    const textContainer = createDiv('translation-modal__text-container');
    const textElement = createParagraph(`translation-modal__text ${contentClass}`, content);
    
    appendChildren(textContainer, textElement);
    appendChildren(section, titleElement, textContainer);
    
    return section;
  }

  /**
   * Create a copy button with click handling
   */
  private createCopyButton(label: string, payload: string): HTMLButtonElement {
    const button = createButton(
      'translation-modal__copy-btn',
      label,
      (e: Event) => {
        e.stopPropagation();
        this.handleCopyAction(button, payload, label);
      }
    );

    return button;
  }

  /**
   * Handle copy action with feedback
   */
  private handleCopyAction(button: HTMLButtonElement, text: string, originalLabel: string): void {
    navigator.clipboard.writeText(text).then(() => {
      const originalWidth = button.offsetWidth;
      button.style.width = `${originalWidth}px`;
      button.textContent = '✓ Copied!';
      
      setTimeout(() => {
        button.textContent = originalLabel;
        button.style.width = '';
      }, 2000);
    }).catch(() => {
      // Fallback for browsers that don't support clipboard API
      button.textContent = '❌ Failed';
      setTimeout(() => {
        button.textContent = originalLabel;
      }, 2000);
    });
  }

  /**
   * Build the complete modal structure
   */
  private buildModalStructure(): ModalComponents {
    // Create backdrop
    const backdrop = createDiv('translation-modal-backdrop');

    // Create main modal container
    const modal = createDiv('translation-modal');

    // Create header
    const header = createDiv('translation-modal__header');
    const title = createSpan('translation-modal__title', 'Translation');
    const closeBtn = createButton(
      'translation-modal__close-btn',
      '×',
      (e: Event) => {
        e.stopPropagation();
        this.close();
      }
    );

    appendChildren(header, title, closeBtn);

    // Create content area
    const content = createDiv('translation-modal__content');
    
    const originalSection = this.createTextSection(
      'Original Text',
      this.data.originalText,
      'original-text-content'
    );
    
    const divider = createDiv('translation-modal__divider');
    
    const translatedSection = this.createTextSection(
      'Translated Text',
      this.data.translatedText,
      'translated-text-content'
    );

    appendChildren(content, originalSection, divider, translatedSection);

    // Create footer with copy buttons
    const footer = createDiv('translation-modal__footer');
    const copyOriginalBtn = this.createCopyButton('Copy Original', this.data.originalText);
    const copyTranslationBtn = this.createCopyButton('Copy Translation', this.data.translatedText);

    appendChildren(footer, copyOriginalBtn, copyTranslationBtn);

    // Assemble modal
    appendChildren(modal, header, content, footer);

    // Attach drag behavior
    const detachDrag = this.attachDragBehavior(header, modal);

    // Setup backdrop click to close
    backdrop.addEventListener('click', () => this.close());

    // Prevent modal clicks from propagating to backdrop
    modal.addEventListener('click', (e) => e.stopPropagation());
    modal.addEventListener('mousedown', (e) => e.stopPropagation());

    // Setup cleanup function
    const cleanup = () => {
      detachDrag();
      this.animateClose(modal, backdrop);
    };

    // Monitor for programmatic removal
    this.setupRemovalObserver(modal, backdrop);

    this.modal = modal;
    this.cleanup = cleanup;

    return { modal, backdrop, cleanup };
  }

  /**
   * Animate modal closing
   */
  private animateClose(modal: HTMLDivElement, backdrop: HTMLDivElement): void {
    addClasses(modal, 'modal-exiting');
    
    setTimeout(() => {
      removeElement(backdrop);
      removeElement(modal);
    }, 300);
  }

  /**
   * Setup mutation observer to clean up backdrop if modal is removed
   */
  private setupRemovalObserver(modal: HTMLDivElement, backdrop: HTMLDivElement): void {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (Array.from(mutation.removedNodes).includes(modal)) {
          removeElement(backdrop);
          observer.disconnect();
          break;
        }
      }
    });

    observer.observe(document.body, { childList: true });
  }

  /**
   * Show the modal with animation
   */
  show(): void {
    try {
      const { modal, backdrop } = this.buildModalStructure();
      
      // Add entering animation class
      addClasses(modal, 'modal-entering');
      
      // Append to DOM
      appendChildren(document.body, backdrop, modal);
      
      // Trigger animation
      requestAnimationFrame(() => {
        removeClasses(modal, 'modal-entering');
        addClasses(modal, 'modal-entered');
      });
      
    } catch (err) {
      throw new TypedError(
        'DOMPopupError',
        `Failed to create popup: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Close the modal
   */
  close(): void {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
  }

  /**
   * Check if modal is currently open
   */
  isOpen(): boolean {
    return this.modal !== null && document.contains(this.modal);
  }
}

/**
 * Convenience function to show modal (maintains backward compatibility)
 */
export function showModalToViewport(data: TranslationResult): void {
  const modal = new TranslationModal(data);
  modal.show();
}
