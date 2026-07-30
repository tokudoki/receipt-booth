import { floydSteinbergDither } from './dither';
import type { Settings } from './store';

export async function composeReceipt(
  photos: string[], 
  settings: Settings
): Promise<HTMLCanvasElement> {
  const RECEIPT_WIDTH = 576;
  
  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  // Load all images
  const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const photoImgs = await Promise.all(photos.map(p => loadImg(p)));
  let logoImg: HTMLImageElement | null = null;
  if (settings.logoDataUrl) {
    try {
      logoImg = await loadImg(settings.logoDataUrl);
    } catch (e) {
      console.error('Failed to load logo img', e);
    }
  }

  // Calculate dimensions — 2×2 grid
  const CELL = RECEIPT_WIDTH / 2; // 288px per cell
  const GRID_ROWS = 2;
  const footerHeight = 100;
  const headerHeight = logoImg ? 100 : 0;
  canvas.width = RECEIPT_WIDTH;
  canvas.height = headerHeight + (CELL * GRID_ROWS) + footerHeight;

  // Fill background with white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw logo centered at top
  if (logoImg) {
    const maxLogoHeight = 70;
    const maxLogoWidth = 300;
    const ratio = Math.min(maxLogoWidth / logoImg.width, maxLogoHeight / logoImg.height);
    const logoW = logoImg.width * ratio;
    const logoH = logoImg.height * ratio;
    const logoX = (RECEIPT_WIDTH - logoW) / 2;
    const logoY = (headerHeight - logoH) / 2;
    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
  }

  // Draw photos in 2×2 grid
  const GAP = 4; // separator thickness
  photoImgs.forEach((img, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col * CELL;
    const y = headerHeight + row * CELL;
    ctx.drawImage(img, x, y, CELL, CELL);
  });

  // Draw grid separators
  ctx.fillStyle = '#000000';
  // Vertical centre line
  ctx.fillRect(CELL - GAP / 2, headerHeight, GAP, CELL * GRID_ROWS);
  // Horizontal centre line
  ctx.fillRect(0, headerHeight + CELL - GAP / 2, RECEIPT_WIDTH, GAP);

  // Footer text centered
  let currentY = headerHeight + CELL * GRID_ROWS + 20;

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  const lines = settings.footerText.split('\n');
  for (const line of lines) {
    ctx.fillText(line.toUpperCase(), RECEIPT_WIDTH / 2, currentY);
    currentY += 30;
  }

  // We do NOT dither here so the returned canvas is high-res color.
  // Dithering happens in the preview layer (display) and printer layer (print).
  return canvas;
}
