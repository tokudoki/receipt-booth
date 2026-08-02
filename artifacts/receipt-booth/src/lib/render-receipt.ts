/**
 * render-receipt.ts
 *
 * Renders the receipt directly to a Canvas 2D context — no DOM serialisation,
 * no SVG foreignObject, no html-to-image. Works on every browser including
 * iOS Safari.
 *
 * Layout matches the Figma design and receipt-template.tsx exactly:
 *   Header: title + ORDER # + DATE + dashed separator
 *   Photos: slots per frameCount
 *   Footer: item row + dashed + body text + "Thank You!"
 */

import type { Settings, FrameCount } from './store';
import { getSessionOrderNumber, getReceiptDateString } from './store';

// ─── Constants ────────────────────────────────────────────────────────────────

const RECEIPT_W = 576;
const PHOTO_GAP = 6;
const HEADER_H  = 200;
const FOOTER_H  = 200; // minimum footer height — grows with content

const MONO = '"Courier New", Courier, monospace';

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
  x1 = 16,
  x2 = RECEIPT_W - 16,
) {
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#AAAAAA';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── Slot geometry ────────────────────────────────────────────────────────────

interface Rect { x: number; y: number; w: number; h: number }

function getSlots(frameCount: FrameCount): Rect[] {
  switch (frameCount) {
    case 1:
      return [{ x: 0, y: HEADER_H, w: RECEIPT_W, h: RECEIPT_W }];
    case 2: {
      const h = Math.round(RECEIPT_W * 3 / 4);
      return [
        { x: 0, y: HEADER_H,              w: RECEIPT_W, h },
        { x: 0, y: HEADER_H + h + PHOTO_GAP, w: RECEIPT_W, h },
      ];
    }
    case 3: {
      const h = Math.round(RECEIPT_W * 3 / 4);
      return [
        { x: 0, y: HEADER_H,                      w: RECEIPT_W, h },
        { x: 0, y: HEADER_H + (h + PHOTO_GAP),    w: RECEIPT_W, h },
        { x: 0, y: HEADER_H + (h + PHOTO_GAP) * 2, w: RECEIPT_W, h },
      ];
    }
    case 4: {
      const cellW = Math.floor((RECEIPT_W - PHOTO_GAP) / 2);
      const cellH = Math.round(cellW * 4 / 3);
      return [
        { x: 0,               y: HEADER_H,                   w: cellW, h: cellH },
        { x: cellW + PHOTO_GAP, y: HEADER_H,                   w: cellW, h: cellH },
        { x: 0,               y: HEADER_H + cellH + PHOTO_GAP, w: cellW, h: cellH },
        { x: cellW + PHOTO_GAP, y: HEADER_H + cellH + PHOTO_GAP, w: cellW, h: cellH },
      ];
    }
  }
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

const SERIF = 'Georgia, "Times New Roman", serif';

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

// ─── Header renderer ──────────────────────────────────────────────────────────

async function drawHeader(
  ctx: CanvasRenderingContext2D,
  settings: Settings,
) {
  const title    = settings.headerTitle?.trim() || 'Receipt Booth';
  const orderNum = getSessionOrderNumber();
  const dateStr  = getReceiptDateString();
  const hasLogo  = !!settings.logoDataUrl;

  // ── logo or title text ──
  if (hasLogo) {
    try {
      const logo  = await loadImage(settings.logoDataUrl!);
      const maxW  = 360, maxH = 72;
      const scale = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight, 1);
      const lw    = logo.naturalWidth  * scale;
      const lh    = logo.naturalHeight * scale;
      ctx.drawImage(logo, (RECEIPT_W - lw) / 2, (HEADER_H - lh) / 2 - 20, lw, lh);
    } catch {
      // Fall through to text title
      drawText(ctx, title, RECEIPT_W / 2, 74, `normal 42px ${SERIF}`, '#1a1a1a');
    }
  } else {
    // Text block: title(34px) + gap(6) + ORDER(11px) + gap(4) + DATE(11px) ≈ 82px
    const titleSize     = 34;
    const titleAscender = Math.round(titleSize * 0.76);
    const subSize       = 15;
    const subAscender   = Math.round(subSize * 0.76);
    const blockH        = titleSize * 1.2 + 8 + subSize * 1.3 + 5 + subSize * 1.3;
    const available     = HEADER_H - 14; // 14px for the dashed line zone
    const blockTop      = (available - blockH) / 2;

    // Title in serif
    drawText(ctx, title, RECEIPT_W / 2, blockTop + titleAscender, `normal ${titleSize}px ${SERIF}`, '#1a1a1a');

    // ORDER / DATE in monospace, darker grey
    const orderY = blockTop + titleSize * 1.2 + 8 + subAscender;
    const dateY  = orderY + subSize * 1.3 + 5 + subAscender;
    drawText(ctx, `ORDER #${orderNum}`, RECEIPT_W / 2, orderY, `normal ${subSize}px ${MONO}`, '#555555');
    drawText(ctx, `DATE ${dateStr}`,    RECEIPT_W / 2, dateY,  `normal ${subSize}px ${MONO}`, '#555555');
  }

  // ── Dashed separator at bottom of header ──
  drawDashedLine(ctx, HEADER_H - 1);
}

// ─── Footer renderer ──────────────────────────────────────────────────────────

function drawFooter(
  ctx: CanvasRenderingContext2D,
  footerTop: number,
  settings: Settings,
  footerH: number,
) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, footerTop, RECEIPT_W, footerH);

  const itemText   = settings.itemText?.trim()   || '';
  const itemStatus = settings.itemStatus?.trim()  || '';
  const hasItem    = itemText.length > 0;
  const bodyLines  = settings.footerText.split('\n').map(l => l.trim()).filter(Boolean);

  let y = footerTop;

  // ── Item row ──
  if (hasItem) {
    const itemFontSize = 15;
    const itemAscender = Math.round(itemFontSize * 0.76);
    const rowY         = y + 16 + itemAscender;
    const font         = `normal ${itemFontSize}px ${MONO}`;
    drawText(ctx, itemText,   16,               rowY, font, '#333333', 'left');
    if (itemStatus) {
      drawText(ctx, itemStatus, RECEIPT_W - 16, rowY, font, '#333333', 'right');
    }
    y = rowY + (itemFontSize - itemAscender) + 10;
    drawDashedLine(ctx, y);
    y += 14;
  }

  // ── Body text ──
  const bodyFontSize = 16;
  const bodyAscender = Math.round(bodyFontSize * 0.76);
  const bodyLineH    = Math.round(bodyFontSize * 1.4);

  if (bodyLines.length > 0) {
    y += 4;
    for (const line of bodyLines) {
      y += bodyAscender;
      drawText(ctx, line, RECEIPT_W / 2, y, `normal ${bodyFontSize}px ${SERIF}`, '#555555');
      y += bodyFontSize - bodyAscender + 5; // descender + gap
    }
    y += 14; // gap before Thank You
  }

  // ── Thank You! ──
  const tySize     = 26;
  const tyAscender = Math.round(tySize * 0.76);

  // Centre "Thank You!" in the remaining footer space
  const remaining = footerTop + footerH - y;
  const tyY       = y + Math.max(remaining / 2, tyAscender + 8);
  drawText(ctx, 'Thank You!', RECEIPT_W / 2, tyY, `normal ${tySize}px ${SERIF}`, '#1a1a1a');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function renderReceiptToCanvas(
  photos: string[],
  settings: Settings,
  frameCount: FrameCount,
): Promise<HTMLCanvasElement> {
  const slots    = getSlots(frameCount);
  const lastSlot = slots[slots.length - 1];

  // Compute actual footer height based on content (min FOOTER_H)
  const hasItem    = !!(settings.itemText?.trim());
  const bodyLines  = settings.footerText.split('\n').map(l => l.trim()).filter(Boolean);
  let footerContentH = 14; // top padding
  if (hasItem) footerContentH += 14 + 13 + 14; // item row + dashed + gap
  footerContentH += bodyLines.length * Math.round(13 * 1.4) + (bodyLines.length > 0 ? 12 : 0);
  footerContentH += 20 + 32; // Thank You! + bottom padding
  const actualFooterH = Math.max(FOOTER_H, footerContentH);

  const totalH = lastSlot.y + lastSlot.h + actualFooterH;

  const canvas  = document.createElement('canvas');
  canvas.width  = RECEIPT_W;
  canvas.height = totalH;
  const ctx     = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, RECEIPT_W, totalH);

  // ── Header ────────────────────────────────────────────────────────────────
  await drawHeader(ctx, settings);

  // ── Photos ────────────────────────────────────────────────────────────────
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

  // ── Footer ────────────────────────────────────────────────────────────────
  drawFooter(ctx, lastSlot.y + lastSlot.h, settings, actualFooterH);

  return canvas;
}
