/**
 * render-receipt.ts
 *
 * Renders the receipt directly to a Canvas 2D context — no DOM serialisation,
 * no SVG foreignObject, no html-to-image. Works on every browser including iOS Safari.
 *
 * Layout:
 *   Header : optional full-width image  OR  title/ORDER/DATE text with 160 px top padding
 *   Photos : slots per frameCount
 *   Footer : optional full-width image  OR  item row + word-wrapped body + "Thank You!"
 *            with 160 px bottom padding
 */

import type { Settings, FrameCount } from './store';
import { getSessionOrderNumber, getReceiptDateString } from './store';

// ─── Constants ────────────────────────────────────────────────────────────────

const RECEIPT_W = 800;
const PHOTO_GAP = 8;
// Default text-header height: 160 px top pad + ~161 px text block + ~27 px to dash + 12 px post-dash
const HEADER_H = 360;
// Minimum text-footer height: content + 160 px bottom padding
const FOOTER_H = 520;

const SERIF = 'Georgia, "Times New Roman", serif';
const MONO  = '"Courier New", Courier, monospace';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 60)}`));
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
) {
  const imgAspect  = img.naturalWidth / img.naturalHeight;
  const destAspect = dw / dh;
  let sx: number, sy: number, sw: number, sh: number;
  if (imgAspect > destAspect) {
    sh = img.naturalHeight; sw = sh * destAspect;
    sx = (img.naturalWidth - sw) / 2; sy = 0;
  } else {
    sw = img.naturalWidth; sh = sw / destAspect;
    sx = 0; sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  y: number,
  x1 = 20,
  x2 = RECEIPT_W - 20,
) {
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Word-wrap `text` to fit within `maxWidth` pixels given the canvas context's
 * current font. Returns an array of lines.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'center',
) {
  ctx.font         = font;
  ctx.fillStyle    = color;
  ctx.textAlign    = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

// ─── Slot geometry ────────────────────────────────────────────────────────────

interface Rect { x: number; y: number; w: number; h: number }

/** Photo slot rects offset by the actual (dynamic) headerH. */
function getSlots(frameCount: FrameCount, headerH: number): Rect[] {
  switch (frameCount) {
    case 1:
      return [{ x: 0, y: headerH, w: RECEIPT_W, h: RECEIPT_W }];
    case 2: {
      const h = Math.round(RECEIPT_W * 3 / 4);
      return [
        { x: 0, y: headerH,                w: RECEIPT_W, h },
        { x: 0, y: headerH + h + PHOTO_GAP, w: RECEIPT_W, h },
      ];
    }
    case 3: {
      const h = Math.round(RECEIPT_W * 3 / 4);
      return [
        { x: 0, y: headerH,                       w: RECEIPT_W, h },
        { x: 0, y: headerH + (h + PHOTO_GAP),     w: RECEIPT_W, h },
        { x: 0, y: headerH + (h + PHOTO_GAP) * 2, w: RECEIPT_W, h },
      ];
    }
    case 4: {
      const cellW = Math.floor((RECEIPT_W - PHOTO_GAP) / 2);
      const cellH = Math.round(cellW * 4 / 3);
      return [
        { x: 0,                y: headerH,                     w: cellW, h: cellH },
        { x: cellW + PHOTO_GAP, y: headerH,                     w: cellW, h: cellH },
        { x: 0,                y: headerH + cellH + PHOTO_GAP,  w: cellW, h: cellH },
        { x: cellW + PHOTO_GAP, y: headerH + cellH + PHOTO_GAP, w: cellW, h: cellH },
      ];
    }
  }
}

// ─── Header renderer ──────────────────────────────────────────────────────────

/**
 * Draws the header and returns the actual height consumed.
 * - If `settings.headerImageDataUrl` is set: draws image at full width, returns image height.
 * - Otherwise: renders title / ORDER / DATE text with 160 px top padding, returns HEADER_H.
 */
async function drawHeader(
  ctx: CanvasRenderingContext2D,
  settings: Settings,
): Promise<number> {
  // ── Image header ──────────────────────────────────────────────────────────
  if (settings.headerImageDataUrl) {
    const img = await loadImage(settings.headerImageDataUrl);
    const h = Math.round(img.naturalHeight * RECEIPT_W / img.naturalWidth);
    ctx.drawImage(img, 0, 0, RECEIPT_W, h);
    return h;
  }

  // ── Text header ───────────────────────────────────────────────────────────
  // Dash sits 12 px above the photo zone (photo starts at HEADER_H).
  const DASH_Y = HEADER_H - 12;

  if (settings.logoDataUrl) {
    try {
      const logo  = await loadImage(settings.logoDataUrl);
      const maxW  = 480, maxH = 100;
      const scale = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight, 1);
      const lw    = logo.naturalWidth  * scale;
      const lh    = logo.naturalHeight * scale;
      // Centre logo vertically between 160 px and the dash
      const logoTop = 160 + Math.max(0, Math.round((DASH_Y - 160 - lh) / 2));
      ctx.drawImage(logo, (RECEIPT_W - lw) / 2, logoTop, lw, lh);
    } catch {
      const title = settings.headerTitle?.trim() || 'Receipt Booth';
      drawText(ctx, title, RECEIPT_W / 2, 160 + 36, `normal 48px ${SERIF}`, '#1a1a1a');
    }
  } else {
    const title    = settings.headerTitle?.trim() || 'Receipt Booth';
    const orderNum = getSessionOrderNumber();
    const dateStr  = getReceiptDateString();

    const titleSize     = 48;
    const subSize       = 40;
    const titleAscender = Math.round(titleSize * 0.76); // ≈ 36
    const subAscender   = Math.round(subSize   * 0.76); // ≈ 30

    // Title baseline exactly 160 px from top
    const titleY  = 160 + titleAscender;
    const order_y = Math.round(160 + titleSize * 1.15 + 8  + subAscender);
    const date_y  = Math.round(160 + titleSize * 1.15 + 8  + subSize * 1.15 + 6 + subAscender);

    drawText(ctx, title,               RECEIPT_W / 2, titleY,  `normal ${titleSize}px ${SERIF}`, '#1a1a1a');
    drawText(ctx, `ORDER #${orderNum}`, RECEIPT_W / 2, order_y, `normal ${subSize}px ${MONO}`,   '#555555');
    drawText(ctx, `DATE ${dateStr}`,    RECEIPT_W / 2, date_y,  `normal ${subSize}px ${MONO}`,   '#555555');
  }

  drawDashedLine(ctx, DASH_Y);
  return HEADER_H;
}

// ─── Footer renderer ──────────────────────────────────────────────────────────

/**
 * Draws the footer. Returns the actual height consumed (== footerH for text path).
 * - If `settings.footerImageDataUrl` is set: draws image at full width, returns image height.
 * - Otherwise: renders item row + word-wrapped body + "Thank You!" with 160 px bottom padding.
 */
async function drawFooter(
  ctx: CanvasRenderingContext2D,
  footerTop: number,
  settings: Settings,
  footerH: number,
): Promise<number> {
  // ── Image footer ──────────────────────────────────────────────────────────
  if (settings.footerImageDataUrl) {
    const img = await loadImage(settings.footerImageDataUrl);
    const h = Math.round(img.naturalHeight * RECEIPT_W / img.naturalWidth);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, footerTop, RECEIPT_W, h);
    ctx.drawImage(img, 0, footerTop, RECEIPT_W, h);
    return h;
  }

  // ── Text footer ───────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, footerTop, RECEIPT_W, footerH);

  const itemText       = settings.itemText?.trim()  || '';
  const itemStatus     = settings.itemStatus?.trim() || '';
  const hasItem        = itemText.length > 0;
  const bodyLines      = settings.footerText.split('\n').map(l => l.trim()).filter(Boolean);
  const bodyTextMaxW   = RECEIPT_W - 64; // 32 px padding each side

  let y = footerTop + 20;

  // ── Item row (40 px monospace) ────────────────────────────────────────────
  if (hasItem) {
    const sz  = 40;
    const asc = Math.round(sz * 0.76);
    const rowY = y + asc;
    drawText(ctx, itemText,   24,               rowY, `normal ${sz}px ${MONO}`, '#333333', 'left');
    if (itemStatus) {
      drawText(ctx, itemStatus, RECEIPT_W - 24, rowY, `normal ${sz}px ${MONO}`, '#333333', 'right');
    }
    y = rowY + (sz - asc) + 12;
    drawDashedLine(ctx, y);
    y += 12;
  }

  // ── Body text — word-wrapped, 40 px serif ─────────────────────────────────
  const bodySz  = 40;
  const bodyAsc = Math.round(bodySz * 0.76);

  if (bodyLines.length > 0) {
    ctx.font = `normal ${bodySz}px ${SERIF}`;
    y += 4;
    for (const paragraph of bodyLines) {
      const wrapped = wrapText(ctx, paragraph, bodyTextMaxW);
      for (const line of wrapped) {
        y += bodyAsc;
        drawText(ctx, line, RECEIPT_W / 2, y, `normal ${bodySz}px ${SERIF}`, '#555555');
        y += bodySz - bodyAsc + 6;
      }
    }
    y += 18;
  }

  // ── Thank You! (48 px serif) ─────────────────────────────────────────────
  const tySz  = 48;
  const tyAsc = Math.round(tySz * 0.76);
  // Centre in remaining space, but at least (tyAsc + 16) below current y
  const remaining = footerTop + footerH - y;
  const gap = Math.max(Math.round(remaining / 2), tyAsc + 16);
  drawText(ctx, 'Thank You!', RECEIPT_W / 2, y + gap, `normal ${tySz}px ${SERIF}`, '#1a1a1a');

  return footerH;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function renderReceiptToCanvas(
  photos: string[],
  settings: Settings,
  frameCount: FrameCount,
): Promise<HTMLCanvasElement> {

  // ── 1. Determine header height ────────────────────────────────────────────
  let headerH = HEADER_H;
  if (settings.headerImageDataUrl) {
    try {
      const img = await loadImage(settings.headerImageDataUrl);
      headerH = Math.round(img.naturalHeight * RECEIPT_W / img.naturalWidth);
    } catch { /* fall back to text HEADER_H */ }
  }

  // ── 2. Slot geometry ──────────────────────────────────────────────────────
  const slots    = getSlots(frameCount, headerH);
  const lastSlot = slots[slots.length - 1];

  // ── 3. Determine footer height ────────────────────────────────────────────
  let actualFooterH = FOOTER_H;
  if (settings.footerImageDataUrl) {
    try {
      const img = await loadImage(settings.footerImageDataUrl);
      actualFooterH = Math.round(img.naturalHeight * RECEIPT_W / img.naturalWidth);
    } catch { /* fall back to text FOOTER_H */ }
  } else {
    // Measure wrapped line count with a temporary offscreen canvas
    const measureCtx = document.createElement('canvas').getContext('2d')!;
    const hasItem    = !!(settings.itemText?.trim());
    const bodyLines  = settings.footerText.split('\n').map(l => l.trim()).filter(Boolean);
    measureCtx.font  = `normal 40px ${SERIF}`;
    let totalWrappedLines = 0;
    for (const line of bodyLines) {
      totalWrappedLines += wrapText(measureCtx, line, RECEIPT_W - 64).length;
    }

    let footerContentH = 20; // top padding
    if (hasItem) {
      footerContentH += Math.round(40 * 1.15) + 12; // item row height + gap before dash
      footerContentH += 24;                          // dash (1.5 px) + 12 px gap each side
    }
    footerContentH += totalWrappedLines * Math.round(40 * 1.3); // body lines
    if (totalWrappedLines > 0) footerContentH += 18;             // gap before Thank You
    footerContentH += Math.round(48 * 1.2) + 160;               // Thank You! + 160 px bottom padding

    actualFooterH = Math.max(FOOTER_H, footerContentH);
  }

  const totalH = lastSlot.y + lastSlot.h + actualFooterH;

  // ── 4. Create canvas ──────────────────────────────────────────────────────
  const canvas  = document.createElement('canvas');
  canvas.width  = RECEIPT_W;
  canvas.height = totalH;
  const ctx     = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, RECEIPT_W, totalH);

  // ── 5. Header ─────────────────────────────────────────────────────────────
  await drawHeader(ctx, settings);

  // ── 6. Photos ─────────────────────────────────────────────────────────────
  const photoImages = await Promise.allSettled(
    slots.map((_, i) => photos[i] ? loadImage(photos[i]) : Promise.reject()),
  );
  for (let i = 0; i < slots.length; i++) {
    const { x, y, w, h } = slots[i];
    ctx.fillStyle = '#ABABAB';
    ctx.fillRect(x, y, w, h);
    const result = photoImages[i];
    if (result.status === 'fulfilled') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      drawCover(ctx, result.value, x, y, w, h);
      ctx.restore();
    }
  }

  // ── 7. Footer ─────────────────────────────────────────────────────────────
  await drawFooter(ctx, lastSlot.y + lastSlot.h, settings, actualFooterH);

  return canvas;
}
