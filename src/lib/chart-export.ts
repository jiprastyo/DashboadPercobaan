'use client';

const SVG_STYLE_PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-opacity',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'letter-spacing',
  'text-anchor',
  'dominant-baseline',
  'visibility',
  'display',
];

function inlineSvgStyles(source: Element, target: Element) {
  const computed = window.getComputedStyle(source);
  const styleText = SVG_STYLE_PROPS
    .map((prop) => `${prop}:${computed.getPropertyValue(prop)};`)
    .join('');

  if (styleText) {
    target.setAttribute('style', styleText);
  }

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);

  sourceChildren.forEach((child, index) => {
    if (targetChildren[index]) {
      inlineSvgStyles(child, targetChildren[index]);
    }
  });
}

async function renderSvgToBlob(svgElement: SVGSVGElement, fallbackWidth: number, fallbackHeight: number): Promise<Blob> {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  const width = svgElement.clientWidth || svgElement.getBoundingClientRect().width || fallbackWidth || 960;
  const height = svgElement.clientHeight || svgElement.getBoundingClientRect().height || fallbackHeight || 480;

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', svgElement.getAttribute('viewBox') || `0 0 ${width} ${height}`);
  clone.style.background = '#ffffff';

  inlineSvgStyles(svgElement, clone);

  const svgString = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.decoding = 'async';

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Failed to render chart SVG as image.'));
      image.src = svgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * 2);
    canvas.height = Math.ceil(height * 2);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context is not available.');
    }

    ctx.scale(2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result);
          return;
        }
        reject(new Error('Failed to convert chart canvas to PNG.'));
      }, 'image/png');
    });

    return blob;
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

  const svgElement = container.querySelector('svg');
  if (!(svgElement instanceof SVGSVGElement)) {
    throw new Error('Chart SVG not found.');
  }

  const blob = await renderSvgToBlob(
    svgElement,
    container.clientWidth || container.getBoundingClientRect().width,
    container.clientHeight || container.getBoundingClientRect().height
  );

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
