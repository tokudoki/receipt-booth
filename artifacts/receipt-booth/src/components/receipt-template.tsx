/**
 * ReceiptTemplate — single source of truth for all receipt layouts.
 *
 * Used in two contexts:
 *   1. Frame picker cards (preview=true)  → scaled down, shows Figma placeholder branding
 *   2. Preview / print page (preview=false) → full-size, captured with html-to-image
 *
 * Typography and proportions match the Figma templates exactly.
 * Width is always 576px (80mm @ 203dpi). Height is content-driven.
 */

import { useEffect, useRef, useState } from 'react';
import type { Settings, FrameCount } from '@/lib/store';

// ─── Constants ────────────────────────────────────────────────────────────────

const RECEIPT_W = 576;
const PHOTO_GAP = 6;   // thin white separator between photos (matches Figma)
const HEADER_H  = 216; // header zone height — matches Figma proportions (~22% of total)
const FOOTER_H  = 156; // footer zone height — matches Figma proportions (~16% of total)

// Fonts — system faces so html-to-image captures them without network fetches
const SERIF = 'Georgia, "Times New Roman", serif';

// ─── Slot geometry ────────────────────────────────────────────────────────────

type Slot = { w: number; h: number };

function getSlots(frameCount: FrameCount): Slot[] {
  switch (frameCount) {
    case 1:
      // Full-width square — matches Template 1
      return [{ w: RECEIPT_W, h: RECEIPT_W }];

    case 2: {
      // Two landscape photos (4:3 aspect) — matches Template 2
      const h = Math.round(RECEIPT_W * (3 / 4)); // 432px
      return [{ w: RECEIPT_W, h }, { w: RECEIPT_W, h }];
    }

    case 3: {
      // Three landscape photos (4:3 aspect) — matches Template 3
      const h = Math.round(RECEIPT_W * (3 / 4)); // 432px
      return [{ w: RECEIPT_W, h }, { w: RECEIPT_W, h }, { w: RECEIPT_W, h }];
    }

    case 4: {
      // 2×2 grid of square cells — matches Template 4
      const cell = Math.floor((RECEIPT_W - PHOTO_GAP) / 2); // 285px
      return [
        { w: cell, h: cell }, { w: cell, h: cell },
        { w: cell, h: cell }, { w: cell, h: cell },
      ];
    }
  }
}

/** Pre-computed total receipt heights at 576px wide (used by ScaledReceiptTemplate). */
export const TEMPLATE_HEIGHT: Record<FrameCount, number> = {
  1: HEADER_H + RECEIPT_W + FOOTER_H,
  2: HEADER_H + Math.round(RECEIPT_W * 3 / 4) * 2 + PHOTO_GAP + FOOTER_H,
  3: HEADER_H + Math.round(RECEIPT_W * 3 / 4) * 3 + PHOTO_GAP * 2 + FOOTER_H,
  4: HEADER_H + (Math.floor((RECEIPT_W - PHOTO_GAP) / 2) * 2 + PHOTO_GAP) + FOOTER_H,
};

// ─── Shared header / footer primitives ───────────────────────────────────────
//
// These render the exact Figma typography in BOTH preview and print modes.
// In print mode, real photos are shown; the serif branding remains unless
// the user has uploaded their own logo.

function DefaultHeader() {
  return (
    <>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 72,
          fontWeight: 'normal',
          letterSpacing: -2,
          lineHeight: 1,
          color: '#1a1a1a',
        }}
      >
        centered
      </div>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 18,
          fontWeight: 'normal',
          color: '#555555',
          marginTop: 10,
        }}
      >
        Sub Text
      </div>
    </>
  );
}

function DefaultFooter() {
  return (
    <>
      <div
        style={{
          fontFamily: SERIF,
          fontWeight: 'normal',
          fontSize: 16,
          letterSpacing: 0.5,
          color: '#1a1a1a',
        }}
      >
        Footer Text
      </div>
      <div
        style={{
          fontFamily: SERIF,
          fontWeight: 'normal',
          fontSize: 16,
          letterSpacing: 0.5,
          color: '#1a1a1a',
          marginTop: 2,
        }}
      >
        Thank You!
      </div>
    </>
  );
}

// ─── ReceiptTemplate ──────────────────────────────────────────────────────────

interface ReceiptTemplateProps {
  frameCount: FrameCount;
  photos?: string[];   // actual camera dataURLs; empty slots show gray fill
  settings: Settings;
  preview?: boolean;   // true → placeholder branding (picker cards); false → real content
}

export function ReceiptTemplate({
  frameCount,
  photos = [],
  settings,
  preview = false,
}: ReceiptTemplateProps) {
  const slots  = getSlots(frameCount);
  const is4    = frameCount === 4;
  const hasLogo = !preview && !!settings.logoDataUrl;

  // In print mode: show logo if the user has set one; otherwise fall through to
  // DefaultHeader so the receipt always has the Figma-style serif branding.
  const showDefaultHeader = preview || !hasLogo;

  // Footer lines from settings — rendered in serif, as-is (no forced uppercase)
  const footerLines = settings.footerText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  return (
    <div
      style={{
        width: RECEIPT_W,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
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
        {showDefaultHeader ? (
          <DefaultHeader />
        ) : (
          /* User's logo */
          <img
            src={settings.logoDataUrl!}
            crossOrigin="anonymous"
            style={{ maxWidth: 380, maxHeight: 100, objectFit: 'contain', display: 'block' }}
            alt="Logo"
          />
        )}
      </div>

      {/* ── Photos ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: is4 ? 'row' : 'column',
          flexWrap: is4 ? 'wrap' : 'nowrap',
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

      {/* ── Footer ────────────────────────────────────────────────────── */}
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
        {preview || footerLines.length === 0 ? (
          <DefaultFooter />
        ) : (
          footerLines.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: SERIF,
                fontWeight: 'normal',
                fontSize: 16,
                letterSpacing: 0.5,
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
// Used inside the frame picker cards in frames.tsx.

interface ScaledProps {
  frameCount: FrameCount;
  settings: Settings;
}

export function ScaledReceiptTemplate({ frameCount, settings }: ScaledProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.43);

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
  const scaledH   = Math.round(templateH * scale);

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
