'use client';

const CAPTURED_STYLE_PROPS = [
  'align-items',
  'background',
  'background-color',
  'border',
  'border-bottom',
  'border-color',
  'border-left',
  'border-radius',
  'border-right',
  'border-top',
  'bottom',
  'box-shadow',
  'color',
  'display',
  'fill',
  'fill-opacity',
  'flex',
  'flex-direction',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'gap',
  'grid-template-columns',
  'height',
  'justify-content',
  'left',
  'letter-spacing',
  'line-height',
  'margin',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'opacity',
  'padding',
  'position',
  'right',
  'stroke',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'stroke-width',
  'text-align',
  'text-anchor',
  'top',
  'transform',
  'transform-origin',
  'visibility',
  'white-space',
  'width',
];

function copyComputedStyles(source: Element, target: Element) {
  const computed = window.getComputedStyle(source);
  const styleText = CAPTURED_STYLE_PROPS
    .map((prop) => `${prop}:${computed.getPropertyValue(prop)};`)
    .join('');

  if (styleText) {
    target.setAttribute('style', styleText);
  }

  const sourceElement = source as HTMLElement;
  const targetElement = target as HTMLElement;
  if (sourceElement instanceof HTMLInputElement && targetElement instanceof HTMLInputElement) {
    targetElement.checked = sourceElement.checked;
    targetElement.value = sourceElement.value;
  }

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);

  sourceChildren.forEach((child, index) => {
    if (targetChildren[index]) {
      copyComputedStyles(child, targetChildren[index]);
    }
  });
}

async function renderContainerToBlob(container: HTMLElement): Promise<Blob> {
  const rect = container.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  const clone = container.cloneNode(true) as HTMLElement;

  copyComputedStyles(container, clone);

  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.backgroundColor = '#ffffff';

  const serializedHtml = new XMLSerializer().serializeToString(clone);
  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">
        ${serializedHtml}
      </foreignObject>
    </svg>
  `;

  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.decoding = 'async';

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Failed to render chart container as image.'));
      image.src = svgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context is not available.');
    }

    ctx.scale(2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result);
          return;
        }
        reject(new Error('Failed to convert chart canvas to PNG.'));
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportChartAsPng(containerId: string, filename: string, downloadOnly = false) {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error('Chart container not found.');
  }

  const blob = await renderContainerToBlob(container);

  if (downloadOnly) {
    downloadBlob(blob, filename);
    return 'download';
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);
    return 'clipboard';
  } catch {
    downloadBlob(blob, filename);
    return 'download';
  }
}
