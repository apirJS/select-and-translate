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

export function applyEventListener() {
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
      // Cleanup
      div.removeEventListener('pointerup', onMouseUp);
      div.removeEventListener('pointermove', onMouseMove);
      document.body.removeChild(div);
    };

    div.addEventListener('pointermove', onMouseMove, { passive: false });
    div.addEventListener('pointerup', onMouseUp);
  };

  div.addEventListener('pointerdown', onMouseDown, { passive: false });
}
