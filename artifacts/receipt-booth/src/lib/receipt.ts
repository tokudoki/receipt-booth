import type { Settings } from './store';

export async function composeReceipt(
  photos: string[],
  settings: Settings
): Promise<HTMLCanvasElement> {
  const RECEIPT_WIDTH = 576;
  const SPACING = 12; // gap around and between cells
  const BORDER = 2;   // outline thickness per photo
  const GRID_COLS = 2;
  const GRID_ROWS = 2;

  // Cell size: divide remaining width evenly across 2 columns (3 margins)
  const CELL_W = (RECEIPT_WIDTH - SPACING * (GRID_COLS + 1)) / GRID_COLS;
  const CELL_H = CELL_W; // square cells

  const photoAreaHeight = SPACING * (GRID_ROWS + 1) + CELL_H * GRID_ROWS;

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  // Load all images
  const loadImg = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
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

  const headerHeight = logoImg ? 100 : 0;
  const footerHeight = 100;
  canvas.width = RECEIPT_WIDTH;
  canvas.height = headerHeight + photoAreaHeight + footerHeight;

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Logo centered at top
  if (logoImg) {
    const maxLogoH = 70;
    const maxLogoW = 300;
    const ratio = Math.min(maxLogoW / logoImg.width, maxLogoH / logoImg.height);
    const logoW = logoImg.width * ratio;
    const logoH = logoImg.height * ratio;
    ctx.drawImage(logoImg, (RECEIPT_WIDTH - logoW) / 2, (headerHeight - logoH) / 2, logoW, logoH);
  }

  // Photos in 2×2 grid
  photoImgs.forEach((img, i) => {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const x = SPACING + col * (CELL_W + SPACING);
    const y = headerHeight + SPACING + row * (CELL_H + SPACING);

    ctx.drawImage(img, x, y, CELL_W, CELL_H);

    // Thin outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = BORDER;
    ctx.strokeRect(x + BORDER / 2, y + BORDER / 2, CELL_W - BORDER, CELL_H - BORDER);
  });

  // Footer text centered
  let currentY = headerHeight + photoAreaHeight + 20;
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (const line of settings.footerText.split('\n')) {
    ctx.fillText(line.toUpperCase(), RECEIPT_WIDTH / 2, currentY);
    currentY += 30;
  }

  // Return high-res color canvas; dithering is applied separately for display/print.
  return canvas;
}
