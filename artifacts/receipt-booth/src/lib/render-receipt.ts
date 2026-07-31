/**
 * render-receipt.ts
 *
 * Draws the receipt directly to a Canvas 2D context — no DOM serialisation,
 * no SVG foreignObject, no html-to-image.  Works on every browser including
 * iOS Safari, which cannot render <img> elements inside SVG foreignObject.
 *
 * Layout constants and slot geometry match receipt-template.tsx exactly so
 * the on-screen preview and the printed output look identical.
 */

import type { Settings, FrameCount } from './store';

// ─── Constants (mirror receipt-template.tsx) ─────────────────────────────────

const RECEIPT_W = 576;
const PHOTO_GAP = 6;
const HEADER_H  = 216;
const FOOTER_H  = 156;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Load any data URL (or regular URL) into an HTMLImageElement. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 60)}`));
    img.src = src;
  });
}

/**
 * Draw an image into a rectangle with object-fit: cover semantics —
 * maintains aspect ratio, crops to fill the destination box.
 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
) {
  const imgAspect  = img.naturalWidth / img.naturalHeight;
  const destAspect = dw / dh;
  let sx: number, sy: number, sw: number, sh: number;

  if (imgAspect > destAspect) {
    // Image is wider than dest → crop left/right
    sh = img.naturalHeight;
    sw = sh * destAspect;
    sx = (img.naturalWidth - sw) / 2;
    sy = 0;
  } else {
    // Image is taller than dest → crop top/bottom
    sw = img.naturalWidth;
    sh = sw / destAspect;
    sx = 0;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

// ─── Slot geometry (mirror receipt-template.tsx) ──────────────────────────────

interface Rect { x: number; y: number; w: number; h: number }

function getSlots(frameCount: FrameCount): Rect[] {
  switch (frameCount) {
    case 1:
      return [{ x: 0, y: HEADER_H, w: RECEIPT_W, h: RECEIPT_W }];

    case 2: {
      const h = Math.round(RECEIPT_W * 3 / 4); // 432
      return [
        { x: 0, y: HEADER_H,          w: RECEIPT_W, h },
        { x: 0, y: HEADER_H + h + PHOTO_GAP, w: RECEIPT_W, h },
      ];
    }

    case 3: {
      const h = Math.round(RECEIPT_W * 3 / 4); // 432
      return [
        { x: 0, y: HEADER_H,                   w: RECEIPT_W, h },
        { x: 0, y: HEADER_H + (h + PHOTO_GAP),   w: RECEIPT_W, h },
        { x: 0, y: HEADER_H + (h + PHOTO_GAP) * 2, w: RECEIPT_W, h },
      ];
    }

    case 4: {
      const cellW = Math.floor((RECEIPT_W - PHOTO_GAP) / 2); // 285
      const cellH = Math.round(cellW * 4 / 3);               // 380
      return [
        { x: 0,               y: HEADER_H,                  w: cellW, h: cellH },
        { x: cellW + PHOTO_GAP, y: HEADER_H,                  w: cellW, h: cellH },
        { x: 0,               y: HEADER_H + cellH + PHOTO_GAP, w: cellW, h: cellH },
        { x: cellW + PHOTO_GAP, y: HEADER_H + cellH + PHOTO_GAP, w: cellW, h: cellH },
      ];
    }
  }
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

const SERIF = 'Georgia, "Times New Roman", serif';

/** Draw text centred horizontally at a given y. Returns the y of the baseline. */
function centreText(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  font: string,
  color: string,
) {
  ctx.font         = font;
  ctx.fillStyle    = color;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, RECEIPT_W / 2, y);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Render the receipt to a canvas and return it.
 *
 * All image loading is done with Promise.all so photos render in parallel.
 * Matches the layout produced by ReceiptTemplate (preview=false).
 */
export async function renderReceiptToCanvas(
  photos: string[],
  settings: Settings,
  frameCount: FrameCount,
): Promise<HTMLCanvasElement> {
  const slots   = getSlots(frameCount);
  const lastSlot = slots[slots.length - 1];
  const totalH  = lastSlot.y + lastSlot.h + FOOTER_H;

  const canvas  = document.createElement('canvas');
  canvas.width  = RECEIPT_W;
  canvas.height = totalH;
  const ctx     = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, RECEIPT_W, totalH);

  // ── Header ────────────────────────────────────────────────────────────────

  if (settings.logoDataUrl) {
    try {
      const logo  = await loadImage(settings.logoDataUrl);
      const maxW  = 380, maxH = 100;
      const scale = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight, 1);
      const lw    = logo.naturalWidth  * scale;
      const lh    = logo.naturalHeight * scale;
      const lx    = (RECEIPT_W - lw) / 2;
      const ly    = (HEADER_H  - lh) / 2;
      ctx.drawImage(logo, lx, ly, lw, lh);
    } catch {
      // Logo failed to load — fall back to default text header
      drawDefaultHeader(ctx);
    }
  } else {
    drawDefaultHeader(ctx);
  }

  // ── Photos ────────────────────────────────────────────────────────────────

  // Load all photos in parallel; failures show the gray placeholder
  const photoImages = await Promise.allSettled(
    slots.map((_, i) => photos[i] ? loadImage(photos[i]) : Promise.reject()),
  );

  for (let i = 0; i < slots.length; i++) {
    const { x, y, w, h } = slots[i];

    // Gray placeholder (overdrawn by photo if successful)
    ctx.fillStyle = '#ABABAB';
    ctx.fillRect(x, y, w, h);

    const result = photoImages[i];
    if (result.status === 'fulfilled') {
      ctx.save();
      // Clip to slot so cover-fit doesn't bleed into adjacent cells
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      drawCover(ctx, result.value, x, y, w, h);
      ctx.restore();
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────

  const footerTop   = lastSlot.y + lastSlot.h;
  ctx.fillStyle     = '#ffffff';
  ctx.fillRect(0, footerTop, RECEIPT_W, FOOTER_H);

  const footerLines = settings.footerText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  const lines = footerLines.length > 0 ? footerLines : ['Footer Text', 'Thank You!'];

  // Vertically centre the line group inside FOOTER_H.
  // Each line: ~20px ascender + ~4px descender = 24px slot; gap 7px between
  const LINE_H = 27;
  const blockH = lines.length * LINE_H;
  // baseline of first line = top of footer + (available space − block) / 2 + ascender
  const ASCENDER = 16; // approx for 16px Georgia
  const firstBaseline = footerTop + (FOOTER_H - blockH) / 2 + ASCENDER;

  for (let i = 0; i < lines.length; i++) {
    centreText(ctx, lines[i], firstBaseline + i * LINE_H, `normal 16px ${SERIF}`, '#1a1a1a');
  }

  return canvas;
}

// ─── Default header (mirrors DefaultHeader component) ─────────────────────────

function drawDefaultHeader(ctx: CanvasRenderingContext2D) {
  // The DOM header is flex-col, items-center, justify-center, height 216.
  // Content: 72px title + 10px margin + 18px subtitle = ~100px block.
  // Block top ≈ (216 − 100) / 2 = 58px; baselines follow from there.
  const TITLE_FONT_SIZE = 72;
  const TITLE_ASCENDER  = 54; // approx ascender for Georgia 72px ≈ 0.75em
  const SUB_FONT_SIZE   = 18;
  const SUB_ASCENDER    = 14;
  const MARGIN_BETWEEN  = 10;

  const blockH = TITLE_FONT_SIZE + MARGIN_BETWEEN + SUB_FONT_SIZE;
  const blockTop = (HEADER_H - blockH) / 2;

  centreText(
    ctx,
    'centered',
    blockTop + TITLE_ASCENDER,
    `normal ${TITLE_FONT_SIZE}px ${SERIF}`,
    '#1a1a1a',
  );

  centreText(
    ctx,
    'Sub Text',
    blockTop + TITLE_FONT_SIZE + MARGIN_BETWEEN + SUB_ASCENDER,
    `normal ${SUB_FONT_SIZE}px ${SERIF}`,
    '#555555',
  );
}
