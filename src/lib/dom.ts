import { Rectangle } from './types';

export function coatTheScreen() {
  const existingTag = document.querySelector<HTMLDivElement>(
    '#select-and-translate-overlay'
  );

  if (existingTag) {
    existingTag.remove();
  }

  const div = document.createElement('div');
  div.id = 'select-and-translate-overlay';
  div.style.position = 'fixed';
  div.style.inset = '0';
  div.style.backgroundColor = 'rgba(0,0,0,0.5)';
  div.style.zIndex = '2147483646';
  div.style.pointerEvents = 'auto';

  document.body.appendChild(div);
}

export function applyEventListener(): Promise<Rectangle> {
  return new Promise((resolve) => {
    const div = document.querySelector<HTMLDivElement>(
      '#select-and-translate-overlay'
    );
    if (!div) return;

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        div.remove();
        resolve({ x: 0, y: 0, width: 0, height: 0 });
      }
    };

    window.addEventListener('keydown', onEscape);

    const onMouseDown = (e: PointerEvent) => {
      e.preventDefault();

      const xDown = e.clientX;
      const yDown = e.clientY;

      const selectionBox = document.createElement('div');
      selectionBox.style.position = 'fixed';
      selectionBox.style.zIndex = '2147483647';
      selectionBox.style.boxShadow = '0 0 0 100vw rgba(0,0,0,0.5)';
      selectionBox.style.outline = '2px dashed white';

      div.style.backgroundColor = 'transparent';
      div.appendChild(selectionBox);

      const onMouseMove = (e: PointerEvent) => {
        e.preventDefault();

        const xMove = e.clientX;
        const yMove = e.clientY;

        const width = Math.abs(xMove - xDown);
        const height = Math.abs(yMove - yDown);
        const left = Math.min(xMove, xDown);
        const top = Math.min(yMove, yDown);

        selectionBox.style.left = `${left}px`;
        selectionBox.style.top = `${top}px`;
        selectionBox.style.width = `${width}px`;
        selectionBox.style.height = `${height}px`;
      };

      const onMouseUp = (_: PointerEvent) => {
        const scale = window.devicePixelRatio;
        const x =
          (parseInt(selectionBox.style.left || '0', 10) + window.scrollX) *
          scale;
        const y =
          (parseInt(selectionBox.style.top || '0', 10) + window.scrollY) *
          scale;
        const width = parseInt(selectionBox.style.width || '0', 10) * scale;
        const height = parseInt(selectionBox.style.height || '0', 10) * scale;

        div.removeEventListener('pointerup', onMouseUp);
        div.removeEventListener('pointermove', onMouseMove);
        div.removeEventListener('pointerdown', onMouseDown);
        window.removeEventListener('keydown', onEscape);

        if (document.body.contains(div)) {
          document.body.removeChild(div);
        }

        resolve({ x, y, width, height });
      };

      div.addEventListener('pointermove', onMouseMove, { passive: false });
      div.addEventListener('pointerup', onMouseUp);
    };

    div.addEventListener('pointerdown', onMouseDown, { passive: false });
  });
}

export function cropImage(
  imageDataUrl: string,
  rectangle: Rectangle
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = rectangle.width;
      canvas.height = rectangle.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context not available'));

      ctx.drawImage(
        img,
        rectangle.x,
        rectangle.y,
        rectangle.width,
        rectangle.height,
        0,
        0,
        rectangle.width,
        rectangle.height
      );

      const croppedDataUrl = canvas.toDataURL('image/png');
      resolve(croppedDataUrl);
    };

    img.onerror = () => reject(new Error('Image failed to load'));

    img.src = imageDataUrl;
  });
}

