/**
 * ReceiptTemplate — single source of truth for all receipt layouts.
 *
 * Used in two contexts:
 *   1. Frame picker cards (preview=true)  → scaled down, shows placeholder branding
 *   2. Preview / print page (preview=false) → full-size, captured with html-to-image
 *
 * Width is always 576px (80mm @ 203dpi). Height is content-driven.
 */

import { useEffect, useRef, useState } from 'react';
import type { Settings, FrameCount } from '@/lib/store';

// ─── Constants ────────────────────────────────────────────────────────────────

const RECEIPT_W = 576;
const PHOTO_GAP = 6; // thin white separator between photos
const HEADER_H = 160;
const FOOTER_H = 100;

// ─── Slot geometry ────────────────────────────────────────────────────────────

type Slot = { w: number; h: number };

function getSlots(frameCount: FrameCount): Slot[] {
  switch (frameCount) {
    case 1:
      return [{ w: RECEIPT_W, h: RECEIPT_W }];

    case 2: {
      const h = Math.round(RECEIPT_W * (2 / 3)); // 384px — 3:2 landscape
      return [{ w: RECEIPT_W, h }, { w: RECEIPT_W, h }];
    }

    case 3: {
      const h = Math.round(RECEIPT_W * (9 / 16)); // 324px — 16:9 landscape
      return [{ w: RECEIPT_W, h }, { w: RECEIPT_W, h }, { w: RECEIPT_W, h }];
    }

    case 4: {
      const cell = Math.floor((RECEIPT_W - PHOTO_GAP) / 2); // 285px square
      return [
        { w: cell, h: cell }, { w: cell, h: cell },
        { w: cell, h: cell }, { w: cell, h: cell },
      ];
    }
  }
}

/** Pre-computed total heights at 576px for the scaled picker wrapper. */
export const TEMPLATE_HEIGHT: Record<FrameCount, number> = {
  1: HEADER_H + RECEIPT_W + FOOTER_H,                                           // 836
  2: HEADER_H + Math.round(RECEIPT_W * 2 / 3) * 2 + PHOTO_GAP + FOOTER_H,     // 1034
  3: HEADER_H + Math.round(RECEIPT_W * 9 / 16) * 3 + PHOTO_GAP * 2 + FOOTER_H, // 1244
  4: HEADER_H + (Math.floor((RECEIPT_W - PHOTO_GAP) / 2) * 2 + PHOTO_GAP) + FOOTER_H, // 836
};

// ─── ReceiptTemplate ──────────────────────────────────────────────────────────

interface ReceiptTemplateProps {
  frameCount: FrameCount;
  photos?: string[];       // actual camera dataURLs; empty = show gray placeholders
  settings: Settings;
  preview?: boolean;       // true → show Figma placeholder branding instead of real content
}

export function ReceiptTemplate({
  frameCount,
  photos = [],
  settings,
  preview = false,
}: ReceiptTemplateProps) {
  const slots = getSlots(frameCount);
  const is4Grid = frameCount === 4;
  const hasLogo = !preview && !!settings.logoDataUrl;

  // Base font stack — must be available without web-font fetch for html-to-image
  const serif = 'Georgia, "Times New Roman", serif';
  const mono  = '"Space Mono", "Courier New", monospace';

  return (
    <div
      style={{
        width: RECEIPT_W,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          height: HEADER_H,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
        }}
      >
        {preview ? (
          <>
            <div style={{ fontFamily: serif, fontSize: 50, fontWeight: 'normal', letterSpacing: -1, lineHeight: 1, color: '#1a1a1a' }}>
              centered
            </div>
            <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 'normal', color: '#666666', marginTop: 8 }}>
              of the traveling journal
            </div>
          </>
        ) : hasLogo ? (
          <img
            src={settings.logoDataUrl!}
            crossOrigin="anonymous"
            style={{ maxWidth: 380, maxHeight: 90, objectFit: 'contain', display: 'block' }}
            alt="Logo"
          />
        ) : null}
      </div>

      {/* ── Photos ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: is4Grid ? 'row' : 'column',
          flexWrap: is4Grid ? 'wrap' : 'nowrap',
          gap: PHOTO_GAP,
          backgroundColor: '#ffffff',
          flexShrink: 0,
        }}
      >
        {slots.map((slot, i) => (
          <div
            key={i}
            style={{
              width: slot.w,
              height: slot.h,
              backgroundColor: '#ABABAB',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {photos[i] ? (
              <img
                src={photos[i]}
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                alt=""
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          height: FOOTER_H,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          padding: '0 24px',
        }}
      >
        {preview ? (
          <>
            <div style={{ fontFamily: mono, fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 2, color: '#1a1a1a' }}>
              JOURNAL #0001 FOR HELEN
            </div>
            <div style={{ fontFamily: mono, fontWeight: 'normal', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#1a1a1a' }}>
              STARTED, Jan 10, 2026
            </div>
          </>
        ) : (
          settings.footerText.split('\n').map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: mono,
                fontWeight: i === 0 ? 'bold' : 'normal',
                fontSize: i === 0 ? 18 : 14,
                textTransform: 'uppercase',
                letterSpacing: i === 0 ? 2 : 1,
                color: '#1a1a1a',
              }}
            >
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── ScaledReceiptTemplate ────────────────────────────────────────────────────
//
// Wraps ReceiptTemplate in a container that measures its own width and
// applies a CSS transform so the 576px template fits exactly.
// Used inside the frame picker cards.

interface ScaledProps {
  frameCount: FrameCount;
  settings: Settings;
}

export function ScaledReceiptTemplate({ frameCount, settings }: ScaledProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.43); // reasonable initial approximation

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setScale(containerRef.current.clientWidth / RECEIPT_W);
      }
    };
    update();

    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const templateH = TEMPLATE_HEIGHT[frameCount];
  const scaledH = Math.round(templateH * scale);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: scaledH, overflow: 'hidden', position: 'relative' }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: RECEIPT_W,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <ReceiptTemplate
          frameCount={frameCount}
          photos={[]}
          settings={settings}
          preview
        />
      </div>
    </div>
  );
}
