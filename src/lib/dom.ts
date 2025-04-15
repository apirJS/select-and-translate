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
  div.style.top = '0';
  div.style.bottom = '0';
  div.style.left = '0';
  div.style.right = '0';
  div.style.backgroundColor = 'rgba(0,0,0,0.5)';
  div.style.zIndex = '9999';
  div.style.pointerEvents = 'auto';

  document.body.appendChild(div);
}

export function applyEventListener() {
  const div = document.querySelector<HTMLDivElement>(
    '#select-and-translate-overlay'
  );
  if (div) {
    const onMouseDown = (e: PointerEvent) => {
      const xDown = e.clientX;
      const yDown = e.clientY;

      const selectionBox = document.createElement('div');
      selectionBox.style.position = 'absolute';
      selectionBox.style.left = `${xDown}px`;
      selectionBox.style.top = `${yDown}px`;
      selectionBox.style.border = `1px dashed white`;

      div.appendChild(selectionBox);

      const onMouseMove = (e: PointerEvent) => {
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

      const onMouseUp = (e: PointerEvent) => {
        const xUp = e.clientX;
        const yUp = e.clientY;

        console.log(`DOWN: X-${xDown} Y-${yDown}`);
        console.log(`UP: X-${xUp} Y-${yUp}`);

        div.removeChild(selectionBox);
        div.removeEventListener('pointerup', onMouseUp);
        div.removeEventListener('pointermove', onMouseMove);
      };

      div.addEventListener('pointermove', onMouseMove);
      div.addEventListener('pointerup', onMouseUp);
    };

    div.addEventListener('pointerdown', onMouseDown);
  }
}
