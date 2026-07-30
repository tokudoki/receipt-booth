import type { Settings } from './store';

// 80mm thermal paper at 203dpi ≈ 576 dots wide
const RECEIPT_WIDTH = 576;

// Thin white separator between photos (matches Figma templates)
const PHOTO_GAP = 6;

/** Center-crop an image into a destination rect (object-fit: cover). */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number
) {
  const srcAspect = img.naturalWidth / img.naturalHeight;
  const dstAspect = dw / dh;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (srcAspect > dstAspect) {
    sw = img.naturalHeight * dstAspect;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / dstAspect;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

type Slot = { x: number; y: number; w: number; h: number };

/**
 * Photo slots matching the Figma template layouts.
 * Photos are full-width, edge-to-edge, separated only by a thin white gap.
 */
function getSlots(frameCount: number): { slots: Slot[]; photoAreaHeight: number } {
  const W = RECEIPT_WIDTH;

  switch (frameCount) {
    case 1: {
      // One full-width square photo
      const h = W;
      return {
        slots: [{ x: 0, y: 0, w: W, h }],
        photoAreaHeight: h,
      };
    }

    case 2: {
      // Two landscape photos stacked (≈ 3:2 each)
      const h = Math.round(W * (2 / 3)); // 384px
      return {
        slots: [
          { x: 0, y: 0,              w: W, h },
          { x: 0, y: h + PHOTO_GAP,  w: W, h },
        ],
        photoAreaHeight: h * 2 + PHOTO_GAP,
      };
    }

    case 3: {
      // Three landscape photos stacked (≈ 16:9 each)
      const h = Math.round(W * (9 / 16)); // 324px
      return {
        slots: [
          { x: 0, y: 0,                    w: W, h },
          { x: 0, y: h + PHOTO_GAP,        w: W, h },
          { x: 0, y: (h + PHOTO_GAP) * 2,  w: W, h },
        ],
        photoAreaHeight: h * 3 + PHOTO_GAP * 2,
      };
    }

    case 4:
    default: {
      // 2×2 grid with thin gap
      const cellW = Math.floor((W - PHOTO_GAP) / 2);
      const cellH = cellW; // square cells
      return {
        slots: [
          { x: 0,               y: 0,               w: cellW, h: cellH },
          { x: cellW + PHOTO_GAP, y: 0,             w: cellW, h: cellH },
          { x: 0,               y: cellH + PHOTO_GAP, w: cellW, h: cellH },
          { x: cellW + PHOTO_GAP, y: cellH + PHOTO_GAP, w: cellW, h: cellH },
        ],
        photoAreaHeight: cellH * 2 + PHOTO_GAP,
      };
    }
  }
}

export async function composeReceipt(
  photos: string[],
  settings: Settings,
  frameCount: number = 4
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

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
    try { logoImg = await loadImg(settings.logoDataUrl); }
    catch (e) { console.error('Failed to load logo', e); }
  }

  const { slots, photoAreaHeight } = getSlots(frameCount);

  // Header: show logo if provided; 0px if not (photos start at top)
  const HEADER_H = logoImg ? 160 : 0;
  // Footer: always show text
  const FOOTER_H = 100;

  canvas.width = RECEIPT_WIDTH;
  canvas.height = HEADER_H + photoAreaHeight + FOOTER_H;

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── Header / Logo ───────────────────────────────────────────
  if (logoImg) {
    const maxH = 90, maxW = 400;
    const ratio = Math.min(maxW / logoImg.width, maxH / logoImg.height);
    const lw = logoImg.width * ratio;
    const lh = logoImg.height * ratio;
    // Vertically centered in header
    ctx.drawImage(logoImg, (RECEIPT_WIDTH - lw) / 2, (HEADER_H - lh) / 2, lw, lh);
  }

  // ── Photos ──────────────────────────────────────────────────
  photoImgs.forEach((img, i) => {
    const slot = slots[i];
    if (!slot) return;
    drawImageCover(ctx, img, slot.x, HEADER_H + slot.y, slot.w, slot.h);
  });

  // ── Footer text ─────────────────────────────────────────────
  let ty = HEADER_H + photoAreaHeight + 18;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const lines = settings.footerText.split('\n');
  lines.forEach((line, i) => {
    // First line: larger bold; subsequent: smaller regular — matching Figma footer style
    if (i === 0) {
      ctx.font = 'bold 26px "Space Mono", monospace';
    } else {
      ctx.font = '22px "Space Mono", monospace';
    }
    ctx.fillText(line.toUpperCase(), RECEIPT_WIDTH / 2, ty);
    ty += i === 0 ? 34 : 28;
  });

  // Return high-res color canvas; dithering applied separately for display/print.
  return canvas;
}
