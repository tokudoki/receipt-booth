/**
 * render-receipt.ts
 *
 * Renders the receipt directly to a Canvas 2D context — no DOM serialisation,
 * no SVG foreignObject, no html-to-image. Works on every browser including
 * iOS Safari.
 *
 * Layout matches the Figma design and receipt-template.tsx exactly:
 *   Header: title + ORDER # + DATE + dashed separator (12px gap to photo)
 *   Photos: slots per frameCount
 *   Footer: item row + dashed + body text + "Thank You!"
 */

import type { Settings, FrameCount } from './store';
import { getSessionOrderNumber, getReceiptDateString } from './store';

// ─── Constants ────────────────────────────────────────────────────────────────

const RECEIPT_W = 800;
const PHOTO_GAP = 8;
const HEADER_H  = 280;
const FOOTER_H  = 360; // minimum footer height — grows with content

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

// ─── Slot geometry ────────────────────────────────────────────────────────────

interface Rect { x: number; y: number; w: number; h: number }

function getSlots(frameCount: FrameCount): Rect[] {
  switch (frameCount) {
    case 1:
      return [{ x: 0, y: HEADER_H, w: RECEIPT_W, h: RECEIPT_W }];
    case 2: {
      const h = Math.round(RECEIPT_W * 3 / 4);
      return [
        { x: 0, y: HEADER_H,                w: RECEIPT_W, h },
        { x: 0, y: HEADER_H + h + PHOTO_GAP, w: RECEIPT_W, h },
      ];
    }
    case 3: {
      const h = Math.round(RECEIPT_W * 3 / 4);
      return [
        { x: 0, y: HEADER_H,                       w: RECEIPT_W, h },
        { x: 0, y: HEADER_H + (h + PHOTO_GAP),     w: RECEIPT_W, h },
        { x: 0, y: HEADER_H + (h + PHOTO_GAP) * 2, w: RECEIPT_W, h },
      ];
    }
    case 4: {
      const cellW = Math.floor((RECEIPT_W - PHOTO_GAP) / 2);
      const cellH = Math.round(cellW * 4 / 3);
      return [
        { x: 0,                y: HEADER_H,                    w: cellW, h: cellH },
        { x: cellW + PHOTO_GAP, y: HEADER_H,                    w: cellW, h: cellH },
        { x: 0,                y: HEADER_H + cellH + PHOTO_GAP, w: cellW, h: cellH },
        { x: cellW + PHOTO_GAP, y: HEADER_H + cellH + PHOTO_GAP, w: cellW, h: cellH },
      ];
    }
  }
}

// ─── Text helper ──────────────────────────────────────────────────────────────

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

  // Dash sits 12px above the photo zone (photo starts at HEADER_H)
  const DASH_Y = HEADER_H - 12;

  if (hasLogo) {
    try {
      const logo  = await loadImage(settings.logoDataUrl!);
      const maxW  = 480, maxH = 100;
      const scale = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight, 1);
      const lw    = logo.naturalWidth  * scale;
      const lh    = logo.naturalHeight * scale;
      ctx.drawImage(logo, (RECEIPT_W - lw) / 2, (DASH_Y - lh) / 2, lw, lh);
    } catch {
      drawText(ctx, title, RECEIPT_W / 2, 80, `normal 48px ${SERIF}`, '#1a1a1a');
    }
  } else {
    // Font sizes per Figma spec
    const titleSize     = 48;
    const subSize       = 40;
    const titleAscender = Math.round(titleSize * 0.76); // ≈ 36
    const subAscender   = Math.round(subSize   * 0.76); // ≈ 30

    // Vertical centering in the zone from top-padding to DASH_Y-gap
    const blockH   = titleSize * 1.15 + 8 + subSize * 1.15 + 6 + subSize * 1.15;
    // = 55.2 + 8 + 46 + 6 + 46 = 161.2
    const zoneTop  = 16;
    const zoneEnd  = DASH_Y - 12; // 12px gap between text block and dash
    const blockTop = zoneTop + Math.max(0, (zoneEnd - zoneTop - blockH) / 2);

    drawText(ctx, title,
      RECEIPT_W / 2,
      blockTop + titleAscender,
      `normal ${titleSize}px ${SERIF}`,
      '#1a1a1a',
    );

    const orderY = blockTop + titleSize * 1.15 + 8 + subAscender;
    const dateY  = orderY  + subSize   * 1.15 + 6 + subAscender;

    drawText(ctx, `ORDER #${orderNum}`, RECEIPT_W / 2, orderY, `normal ${subSize}px ${MONO}`, '#555555');
    drawText(ctx, `DATE ${dateStr}`,    RECEIPT_W / 2, dateY,  `normal ${subSize}px ${MONO}`, '#555555');
  }

  // Dashed separator — 12px gap between dash and photo
  drawDashedLine(ctx, DASH_Y);
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

  const itemText   = settings.itemText?.trim()  || '';
  const itemStatus = settings.itemStatus?.trim() || '';
  const hasItem    = itemText.length > 0;
  const bodyLines  = settings.footerText.split('\n').map(l => l.trim()).filter(Boolean);

  // Start 20px below the last photo
  let y = footerTop + 20;

  // ── Item row (40px monospace) ──────────────────────────────────────────────
  if (hasItem) {
    const sz  = 40;
    const asc = Math.round(sz * 0.76); // ≈ 30
    const rowY = y + asc;
    drawText(ctx, itemText,   24,               rowY, `normal ${sz}px ${MONO}`, '#333333', 'left');
    if (itemStatus) {
      drawText(ctx, itemStatus, RECEIPT_W - 24, rowY, `normal ${sz}px ${MONO}`, '#333333', 'right');
    }
    y = rowY + (sz - asc) + 12; // descender + 12px gap before dash
    drawDashedLine(ctx, y);
    y += 12; // 12px gap after dash
  }

  // ── Body text (40px serif) ────────────────────────────────────────────────
  const bodySz  = 40;
  const bodyAsc = Math.round(bodySz * 0.76);

  if (bodyLines.length > 0) {
    y += 4;
    for (const line of bodyLines) {
      y += bodyAsc;
      drawText(ctx, line, RECEIPT_W / 2, y, `normal ${bodySz}px ${SERIF}`, '#555555');
      y += bodySz - bodyAsc + 6;
    }
    y += 18; // gap before Thank You
  }

  // ── Thank You! (48px serif) ───────────────────────────────────────────────
  const tySz  = 48;
  const tyAsc = Math.round(tySz * 0.76);
  const remaining = footerTop + footerH - y;
  const tyY = y + Math.max(Math.round(remaining / 2), tyAsc + 16);
  drawText(ctx, 'Thank You!', RECEIPT_W / 2, tyY, `normal ${tySz}px ${SERIF}`, '#1a1a1a');
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
  const hasItem   = !!(settings.itemText?.trim());
  const bodyLines = settings.footerText.split('\n').map(l => l.trim()).filter(Boolean);

  let footerContentH = 20; // top padding
  if (hasItem) {
    footerContentH += Math.round(40 * 1.15) + 12; // item row height + gap
    footerContentH += 24;                          // dash (12 above + 1.5 + 12 below)
  }
  footerContentH += bodyLines.length * Math.round(40 * 1.3); // body lines
  if (bodyLines.length > 0) footerContentH += 18;             // gap before Thank You
  footerContentH += Math.round(48 * 1.2) + 36;               // Thank You! + bottom padding

  const actualFooterH = Math.max(FOOTER_H, footerContentH);
  const totalH        = lastSlot.y + lastSlot.h + actualFooterH;

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
