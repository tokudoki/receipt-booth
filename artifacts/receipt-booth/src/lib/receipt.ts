import { floydSteinbergDither } from './dither';
import type { Settings } from './store';

// We'll dynamically render the QR code via qrcode.react in a component,
// but to draw it to canvas we need its data URL.
export async function composeReceipt(
  photos: string[], 
  settings: Settings, 
  qrCodeDataUrl: string
): Promise<HTMLCanvasElement> {
  const RECEIPT_WIDTH = 576;
  const PHOTO_SIZE = RECEIPT_WIDTH; // Photos are square
  
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
  const qrImg = await loadImg(qrCodeDataUrl);
  let logoImg: HTMLImageElement | null = null;
  if (settings.logoDataUrl) {
    try {
      logoImg = await loadImg(settings.logoDataUrl);
    } catch (e) {
      console.error('Failed to load logo img', e);
    }
  }

  // Calculate dimensions
  const footerHeight = 240;
  const headerHeight = 60;
  canvas.width = RECEIPT_WIDTH;
  canvas.height = headerHeight + (PHOTO_SIZE * photoImgs.length) + footerHeight;

  // Fill background with white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw photos
  let currentY = headerHeight;
  for (const img of photoImgs) {
    ctx.drawImage(img, 0, currentY, PHOTO_SIZE, PHOTO_SIZE);
    // Draw a small black border/separator between photos
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, currentY + PHOTO_SIZE - 2, RECEIPT_WIDTH, 4);
    currentY += PHOTO_SIZE;
  }

  // Footer layout:
  // Logo on left, QR on right, Text centered below
  currentY += 20; // top padding for footer
  
  if (logoImg) {
    const maxLogoHeight = 80;
    const maxLogoWidth = 120;
    const ratio = Math.min(maxLogoWidth / logoImg.width, maxLogoHeight / logoImg.height);
    const logoW = logoImg.width * ratio;
    const logoH = logoImg.height * ratio;
    ctx.drawImage(logoImg, 40, currentY, logoW, logoH);
  }

  // QR Code on right
  const qrSize = 100;
  ctx.drawImage(qrImg, RECEIPT_WIDTH - qrSize - 40, currentY, qrSize, qrSize);

  // Text
  currentY += Math.max(80, qrSize) + 40;
  
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  const lines = settings.footerText.split('\n');
  for (const line of lines) {
    ctx.fillText(line.toUpperCase(), RECEIPT_WIDTH / 2, currentY);
    currentY += 30;
  }

  // We do NOT dither here anymore, so that the returned canvas is high-res color.
  // We'll dither it in the preview layer for display, and the printer layer for printing.
  return canvas;
}
