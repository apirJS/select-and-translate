import type { TranslationResult } from '../types';
import { injectComponentStyles } from './styleManager';
import { getStoredThemeMode, resolveThemeMode } from './theme';
import {
  createDiv,
  createButton,
  createSpan,
  createHeading,
  createTextarea,
  addClasses,
  removeClasses,
  appendChildren,
  removeElement,
} from './domBuilder';
import { ApplicationError } from '../errors';

type Cleanup = () => void;

interface ModalComponents {
  modal: HTMLDivElement;
  backdrop: HTMLDivElement;
  cleanup: Cleanup;
}

interface DragState {
  isDragging: boolean;
  offset: { x: number; y: number };
}

export class TranslationModal {
  private modal: HTMLDivElement | null = null;
  private cleanup: Cleanup | null = null;
  private dragState: DragState = { isDragging: false, offset: { x: 0, y: 0 } };
  private static modalRegistry = new Map<string, HTMLDivElement>();
  private static creatingModals = new Set<string>();

  constructor(private data: TranslationResult) {
    injectComponentStyles('modal');
  }

  private static createModalId(data: TranslationResult): string {
    const content = `${data.originalText}|${data.translatedText}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `modal-${Math.abs(hash)}`;
  }

  private setupDragBehavior(header: HTMLElement, modal: HTMLDivElement): Cleanup {
    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      
      this.dragState.isDragging = true;
      const rect = modal.getBoundingClientRect();
      this.dragState.offset.x = e.clientX - rect.left;
      this.dragState.offset.y = e.clientY - rect.top;
      
      addClasses(modal, 'is-dragging');
      e.stopPropagation();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.dragState.isDragging) return;
      
      modal.style.left = `${e.clientX - this.dragState.offset.x}px`;
      modal.style.top = `${e.clientY - this.dragState.offset.y}px`;
      modal.style.transform = 'none';
      
      e.preventDefault();
    };

    const handleMouseUp = () => {
      this.dragState.isDragging = false;
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

  private createTextSection(title: string, content: string, contentClass: string): HTMLDivElement {
    const section = createDiv('translation-modal__section');
    const titleElement = createHeading(3, 'translation-modal__section-title', title);
    const textContainer = createTextarea(`translation-modal__text-container ${contentClass}`, content, true);
    
    appendChildren(section, titleElement, textContainer);
    return section;
  }

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
      button.textContent = '❌ Failed';
      setTimeout(() => {
        button.textContent = originalLabel;
      }, 2000);
    });
  }

  private async buildModalStructure(): Promise<ModalComponents> {
    const backdrop = createDiv('translation-modal-backdrop');
    const modal = createDiv('translation-modal');
    
    try {
      const currentMode = await getStoredThemeMode();
      const resolvedTheme = resolveThemeMode(currentMode);
      modal.classList.add(`theme-${resolvedTheme}`);
    } catch (error) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      modal.classList.add(`theme-${systemTheme}`);
    }

    const header = this.createHeader();
    const content = this.createContent();
    const footer = this.createFooter();

    appendChildren(modal, header, content, footer);

    const detachDrag = this.setupDragBehavior(header, modal);

    backdrop.addEventListener('click', () => this.close());
    modal.addEventListener('click', (e) => e.stopPropagation());
    modal.addEventListener('mousedown', (e) => e.stopPropagation());

    const cleanup = () => {
      detachDrag();
      this.animateClose(modal, backdrop);
      
      const modalId = modal.getAttribute('data-modal-id');
      if (modalId) {
        TranslationModal.modalRegistry.delete(modalId);
        TranslationModal.creatingModals.delete(modalId);
      }
    };

    this.setupRemovalObserver(modal, backdrop);
    this.modal = modal;
    this.cleanup = cleanup;

    return { modal, backdrop, cleanup };
  }

  private createHeader(): HTMLDivElement {
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
    return header;
  }

  private createContent(): HTMLDivElement {
    const content = createDiv('translation-modal__content');
    const originalSection = this.createTextSection('Original Text', this.data.originalText, 'original-text-content');
    const divider = createDiv('translation-modal__divider');
    const translatedSection = this.createTextSection('Translated Text', this.data.translatedText, 'translated-text-content');

    appendChildren(content, originalSection, divider, translatedSection);
    return content;
  }

  private createFooter(): HTMLDivElement {
    const footer = createDiv('translation-modal__footer');
    const copyOriginalBtn = this.createCopyButton('Copy Original', this.data.originalText);
    const copyTranslationBtn = this.createCopyButton('Copy Translation', this.data.translatedText);

    appendChildren(footer, copyOriginalBtn, copyTranslationBtn);
    return footer;
  }

  private animateClose(modal: HTMLDivElement, backdrop: HTMLDivElement): void {
    addClasses(modal, 'modal-exiting');
    
    setTimeout(() => {
      removeElement(backdrop);
      removeElement(modal);
    }, 300);
  }

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

  async show(): Promise<void> {
    try {
      const modalId = TranslationModal.createModalId(this.data);
      
      if (TranslationModal.creatingModals.has(modalId)) {
        console.log('Modal creation already in progress, skipping duplicate');
        return;
      }
      
      const existingModal = TranslationModal.modalRegistry.get(modalId);
      if (existingModal && document.body.contains(existingModal)) {
        console.log('Modal already exists, bringing to front');
        existingModal.style.zIndex = String(999999);
        return;
      }
      
      const existingModalInDOM = document.querySelector(`[data-modal-id="${modalId}"]`);
      if (existingModalInDOM) {
        console.log('Found existing modal in DOM, skipping duplicate');
        (existingModalInDOM as HTMLElement).style.zIndex = String(999999);
        return;
      }
      
      TranslationModal.creatingModals.add(modalId);
      
      const { modal, backdrop } = await this.buildModalStructure();
      
      modal.setAttribute('data-modal-id', modalId);
      TranslationModal.modalRegistry.set(modalId, modal);
      
      addClasses(modal, 'modal-entering');
      
      appendChildren(document.body, backdrop, modal);
      
      requestAnimationFrame(() => {
        removeClasses(modal, 'modal-entering');
        addClasses(modal, 'modal-entered');
        TranslationModal.creatingModals.delete(modalId);
      });
      
    } catch (err) {
      const modalId = TranslationModal.createModalId(this.data);
      TranslationModal.creatingModals.delete(modalId); 
      throw new ApplicationError(
        'system',
        `Failed to create popup: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  close(): void {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
  }

  isOpen(): boolean {
    return this.modal !== null && document.contains(this.modal);
  }
}

export async function showModalToViewport(data: TranslationResult): Promise<void> {
  const modal = new TranslationModal(data);
  await modal.show();
}
