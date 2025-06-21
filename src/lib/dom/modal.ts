import { getThemeColors } from './theme';
import type { TranslationResult } from '../types';
import { TypedError } from '../utils';
import { MODAL_CLASS, MAXIMUM_Z_INDEX } from './constants';
import { applyStyles, createElement, injectGlobalStyles } from './misc';

type Cleanup = () => void;

function attachDrag(header: HTMLElement, modal: HTMLDivElement): Cleanup {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const down = (e: MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return; // ignore clicks on buttons
    dragging = true;
    const rect = modal.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    applyStyles(modal, { transition: 'none' });
    e.stopPropagation();
  };

  const move = (e: MouseEvent) => {
    if (!dragging) return;
    applyStyles(modal, {
      left: `${e.clientX - offsetX}px`,
      top: `${e.clientY - offsetY}px`,
      transform: 'none',
    });
    e.preventDefault();
  };

  const up = () => {
    dragging = false;
    applyStyles(modal, { transition: 'all 0.3s ease' });
  };

  header.addEventListener('mousedown', down);
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);

  return () => {
    header.removeEventListener('mousedown', down);
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
  };
}

function buildTextSection(
  title: string,
  content: string,
  theme: ReturnType<typeof getThemeColors>,
  cls: string
): HTMLDivElement {
  const section = createElement('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  });

  section.appendChild(
    createElement(
      'h3',
      {
        fontSize: '14px',
        fontWeight: 'bold',
        margin: '0',
        color: theme.color,
        userSelect: 'none',
      },
      title
    )
  );

  const p = createElement(
    'p',
    {
      margin: '0',
      fontSize: '14px',
      lineHeight: '1.5',
      wordBreak: 'break-word',
      userSelect: 'text',
      cursor: 'text',
      color: theme.color,
    },
    content
  );
  p.classList.add(cls);

  const scrollBox = createElement('div', {
    padding: '10px',
    border: theme.border,
    borderRadius: '4px',
    maxHeight: '120px',
    overflowY: 'auto',
  });
  scrollBox.appendChild(p);
  section.appendChild(scrollBox);
  return section;
}

function createCopyButton(
  label: string,
  payload: string,
  theme: ReturnType<typeof getThemeColors>
): HTMLButtonElement {
  const btn = createElement(
    'button',
    {
      padding: '6px 12px',
      minWidth: '100px',
      height: '30px',
      fontSize: '14px',
      border: theme.border,
      borderRadius: '4px',
      backgroundColor: 'transparent',
      color: theme.color,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    label
  );

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(payload);

    const width = `${btn.offsetWidth}px`;
    const originalText = btn.textContent ?? label;
    applyStyles(btn, { width });
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
      applyStyles(btn, { width: '' });
    }, 2000);
  });

  return btn;
}

function buildModalStructure(data: TranslationResult): {
  modal: HTMLDivElement;
  backdrop: HTMLDivElement;
  cleanup: Cleanup;
} {
  injectGlobalStyles();
  const theme = getThemeColors();

  const backdrop = createElement('div', {
    position: 'fixed',
    inset: '0',
    zIndex: (parseInt(MAXIMUM_Z_INDEX) - 1).toString(),
    backgroundColor: 'transparent',
  });

  const modal = createElement('div', {
    width: '400px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: '8px',
    zIndex: MAXIMUM_Z_INDEX,
    transition: 'all 0.3s ease',
    backgroundColor: theme.backgroundColor,
    color: theme.color,
    border: theme.border,
    boxShadow: '0 4px 12px rgba(0,0,0,.15)',
    cursor: 'default',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif, Arial, Helvetica",
    fontSize: '16px',
  });
  modal.classList.add(MODAL_CLASS);
  modal.addEventListener('click', (e) => e.stopPropagation());
  modal.addEventListener('mousedown', (e) => e.stopPropagation());

  const header = createElement('div', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1em',
    minHeight: '45px',
    userSelect: 'none',
    cursor: 'move',
    backgroundColor: theme.backgroundColor,
    borderBottom: theme.border,
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    flexShrink: '0',
  });
  header.appendChild(
    createElement(
      'span',
      { fontWeight: 'bold', fontSize: '16px', color: theme.color },
      'Translation'
    )
  );
  const closeBtn = createElement(
    'button',
    {
      border: 'none',
      background: 'transparent',
      fontSize: '24px',
      lineHeight: '1',
      color: theme.color,
      cursor: 'pointer',
      padding: '0 5px',
    },
    '×'
  );
  header.appendChild(closeBtn);
  modal.appendChild(header);

  const contentBox = createElement('div', {
    display: 'flex',
    flexDirection: 'column',
    padding: '1em',
    gap: '15px',
    overflowX: 'hidden',
    overflowY: 'auto',
    flexGrow: '1',
  });
  contentBox.appendChild(
    buildTextSection(
      'Original Text',
      data.originalText,
      theme,
      'original-text-content'
    )
  );
  contentBox.appendChild(
    createElement('div', {
      width: '90%',
      height: '1px',
      alignSelf: 'center',
      opacity: '.8',
      backgroundColor: theme.dividerColor,
    })
  );
  contentBox.appendChild(
    buildTextSection(
      'Translated Text',
      data.translatedText,
      theme,
      'translated-text-content'
    )
  );
  modal.appendChild(contentBox);

  const footer = createElement('div', {
    display: 'flex',
    gap: '8px',
    padding: '8px 12px',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    minHeight: '45px',
    borderTop: theme.border,
    backgroundColor: theme.backgroundColor,
    flexShrink: '0',
  });
  footer.append(
    createCopyButton('Copy Original', data.originalText, theme),
    createCopyButton('Copy Translation', data.translatedText, theme)
  );
  modal.appendChild(footer);

  const detachDrag = attachDrag(header, modal);

  const close = () => {
    detachDrag();
    modal.style.opacity = '0';
    modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
    setTimeout(() => {
      backdrop.remove();
      modal.remove();
    }, 300);
  };
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });
  backdrop.addEventListener('click', close);

  // Clean up backdrop if modal is programmatically removed
  const observer = new MutationObserver((mut) => {
    for (const m of mut) {
      if (Array.from(m.removedNodes).includes(modal)) {
        backdrop.remove();
        observer.disconnect();
        break;
      }
    }
  });
  observer.observe(document.body, { childList: true });

  return { modal, backdrop, cleanup: close };
}

export function showModalToViewport(text: TranslationResult): void {
  try {
    const { modal, backdrop } = buildModalStructure(text);
    document.body.append(backdrop, modal);
  } catch (err) {
    throw new TypedError(
      'DOMPopupError',
      `Failed to create popup: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}
