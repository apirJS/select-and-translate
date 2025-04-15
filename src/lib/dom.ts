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

export function applyEventListener(): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve) => {
    const div = document.querySelector<HTMLDivElement>(
      '#select-and-translate-overlay'
    );
    if (!div) return;

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

        resolve({ x, y, width, height });

        div.removeEventListener('pointerup', onMouseUp);
        div.removeEventListener('pointermove', onMouseMove);
        document.body.removeChild(div);
      };

      div.addEventListener('pointermove', onMouseMove, { passive: false });
      div.addEventListener('pointerup', onMouseUp);
    };

    div.addEventListener('pointerdown', onMouseDown, { passive: false });
  });
}

export function cropImage(
  imageDataUrl: string,
  crop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = crop.width;
      canvas.height = crop.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context not available'));

      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      );

      const croppedDataUrl = canvas.toDataURL('image/png');
      resolve(croppedDataUrl);
    };

    img.onerror = () => reject(new Error('Image failed to load'));

    img.src = imageDataUrl;
  });
}
