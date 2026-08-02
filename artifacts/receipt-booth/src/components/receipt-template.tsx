/**
 * ReceiptTemplate — single source of truth for all receipt layouts.
 *
 * Matches the Figma design:
 *   Header: large serif title + ORDER # + DATE + dashed separator
 *   Photos: 1 / 2 / 3 stacked full-width, or 2×2 grid
 *   Footer: optional item row + dashed separator + body text + "Thank You!"
 */

import { useEffect, useRef, useState } from 'react';
import type { Settings, FrameCount } from '@/lib/store';
import { getSessionOrderNumber, getReceiptDateString } from '@/lib/store';

// ─── Constants ────────────────────────────────────────────────────────────────

const RECEIPT_W = 576;
const PHOTO_GAP = 6;
const HEADER_H  = 200;
const FOOTER_H  = 200;

const SERIF = 'Georgia, "Times New Roman", serif';

// ─── Slot geometry ────────────────────────────────────────────────────────────

type Slot = { w: number; h: number };

function getSlots(frameCount: FrameCount): Slot[] {
  switch (frameCount) {
    case 1:
      return [{ w: RECEIPT_W, h: RECEIPT_W }];
    case 2: {
      const h = Math.round(RECEIPT_W * 3 / 4);
      return [{ w: RECEIPT_W, h }, { w: RECEIPT_W, h }];
    }
    case 3: {
      const h = Math.round(RECEIPT_W * 3 / 4);
      return [{ w: RECEIPT_W, h }, { w: RECEIPT_W, h }, { w: RECEIPT_W, h }];
    }
    case 4: {
      const cellW = Math.floor((RECEIPT_W - PHOTO_GAP) / 2);
      const cellH = Math.round(cellW * 4 / 3);
      return [
        { w: cellW, h: cellH }, { w: cellW, h: cellH },
        { w: cellW, h: cellH }, { w: cellW, h: cellH },
      ];
    }
  }
}

/** Pre-computed total receipt heights used by ScaledReceiptTemplate. */
export const TEMPLATE_HEIGHT: Record<FrameCount, number> = {
  1: HEADER_H + RECEIPT_W + FOOTER_H,
  2: HEADER_H + Math.round(RECEIPT_W * 3 / 4) * 2 + PHOTO_GAP + FOOTER_H,
  3: HEADER_H + Math.round(RECEIPT_W * 3 / 4) * 3 + PHOTO_GAP * 2 + FOOTER_H,
  4: HEADER_H + (Math.round(Math.floor((RECEIPT_W - PHOTO_GAP) / 2) * 4 / 3) * 2 + PHOTO_GAP) + FOOTER_H,
};

// ─── Dashed line ──────────────────────────────────────────────────────────────

function Dash({ mx = 16 }: { mx?: number }) {
  return (
    <div style={{
      marginLeft: mx,
      marginRight: mx,
      borderTop: '1px dashed #AAAAAA',
      flexShrink: 0,
    }} />
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function ReceiptHeader({ settings, preview }: { settings: Settings; preview: boolean }) {
  const title    = preview ? 'Title Text'      : (settings.headerTitle?.trim() || 'Receipt Booth');
  const orderNum = preview ? '0000'            : getSessionOrderNumber();
  const dateStr  = preview ? 'AUGUST 22, 2026' : getReceiptDateString();
  const hasLogo  = !preview && !!settings.logoDataUrl;

  return (
    <div style={{
      width: RECEIPT_W,
      height: HEADER_H,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Text block — grows to fill space above the dashed line */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 24,
        paddingRight: 24,
        gap: 5,
        paddingTop: 8,
        paddingBottom: 12,
      }}>
        {hasLogo ? (
          <img
            src={settings.logoDataUrl!}
            crossOrigin="anonymous"
            style={{ maxWidth: 360, maxHeight: 72, objectFit: 'contain', display: 'block' }}
            alt="Logo"
          />
        ) : (
          <div style={{
            fontFamily: SERIF,
            fontSize: 42,
            fontWeight: 'normal',
            letterSpacing: -1,
            lineHeight: 1,
            color: '#1a1a1a',
            textAlign: 'center',
          }}>
            {title}
          </div>
        )}
        <div style={{ fontFamily: SERIF, fontSize: 12, color: '#888', letterSpacing: 0.5 }}>
          ORDER #{orderNum}
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 12, color: '#888', letterSpacing: 0.5 }}>
          DATE {dateStr}
        </div>
      </div>
      <Dash />
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function ReceiptFooter({ settings, preview }: { settings: Settings; preview: boolean }) {
  const itemText   = preview ? 'x1 photo session' : (settings.itemText?.trim()   || '');
  const itemStatus = preview ? 'pre-order'         : (settings.itemStatus?.trim() || '');
  const hasItem    = itemText.length > 0;

  const bodyLines = preview
    ? []
    : settings.footerText.split('\n').map(l => l.trim()).filter(Boolean);

  return (
    <div style={{
      width: RECEIPT_W,
      minHeight: FOOTER_H,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Item row */}
      {hasItem && (
        <>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 14,
            paddingBottom: 12,
            fontFamily: SERIF,
            fontSize: 12,
            color: '#333',
            letterSpacing: 0.3,
            flexShrink: 0,
          }}>
            <span>{itemText}</span>
            {itemStatus && <span>{itemStatus}</span>}
          </div>
          <Dash />
        </>
      )}

      {/* Spacer + body text + Thank You */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 24,
        paddingRight: 24,
        paddingTop: 12,
        paddingBottom: 24,
        gap: 4,
      }}>
        {bodyLines.map((line, i) => (
          <div key={i} style={{
            fontFamily: SERIF,
            fontSize: 13,
            color: '#555',
            textAlign: 'center',
            letterSpacing: 0.3,
          }}>
            {line}
          </div>
        ))}
        <div style={{
          fontFamily: SERIF,
          fontSize: 20,
          fontWeight: 'normal',
          color: '#1a1a1a',
          letterSpacing: 0.5,
          marginTop: bodyLines.length > 0 ? 10 : 0,
        }}>
          Thank You!
        </div>
      </div>
    </div>
  );
}

// ─── ReceiptTemplate ──────────────────────────────────────────────────────────

interface ReceiptTemplateProps {
  frameCount: FrameCount;
  photos?: string[];
  settings: Settings;
  preview?: boolean;
}

export function ReceiptTemplate({
  frameCount,
  photos = [],
  settings,
  preview = false,
}: ReceiptTemplateProps) {
  const slots = getSlots(frameCount);
  const is4   = frameCount === 4;

  return (
    <div style={{
      width: RECEIPT_W,
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <ReceiptHeader settings={settings} preview={preview} />

      {/* Photos */}
      <div style={{
        display: 'flex',
        flexDirection: is4 ? 'row' : 'column',
        flexWrap: is4 ? 'wrap' : 'nowrap',
        gap: PHOTO_GAP,
        backgroundColor: '#ffffff',
        flexShrink: 0,
      }}>
        {slots.map((slot, i) => (
          <div
            key={i}
            style={{
              width: slot.w,
              height: slot.h,
              backgroundColor: '#ABABAB',
              overflow: 'hidden',
              flexShrink: 0,
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

      <ReceiptFooter settings={settings} preview={preview} />
    </div>
  );
}

// ─── ScaledReceiptTemplate ────────────────────────────────────────────────────

interface ScaledProps {
  frameCount: FrameCount;
  settings: Settings;
  maxHeight?: number;
  selected?: boolean;
}

export function ScaledReceiptTemplate({ frameCount, settings, maxHeight, selected }: ScaledProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.43);

  useEffect(() => {
    const update = () => {
      if (!measureRef.current) return;
      const widthScale  = measureRef.current.clientWidth / RECEIPT_W;
      const heightScale = maxHeight !== undefined
        ? maxHeight / TEMPLATE_HEIGHT[frameCount]
        : Infinity;
      setScale(Math.min(widthScale, heightScale));
    };
    update();
    const ro = new ResizeObserver(update);
    if (measureRef.current) ro.observe(measureRef.current);
    return () => ro.disconnect();
  }, [frameCount, maxHeight]);

  const templateH = TEMPLATE_HEIGHT[frameCount];
  const scaledH   = Math.round(templateH * scale);
  const scaledW   = Math.round(RECEIPT_W * scale);

  return (
    <div ref={measureRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div
        style={{ width: scaledW, height: scaledH, overflow: 'hidden', position: 'relative', flexShrink: 0 }}
        className={
          selected
            ? 'outline outline-[3px] outline-foreground shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all duration-150'
            : 'group-hover:outline group-hover:outline-[1.5px] group-hover:outline-foreground/40 transition-all duration-150'
        }
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: RECEIPT_W,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}>
          <ReceiptTemplate
            frameCount={frameCount}
            photos={[]}
            settings={settings}
            preview
          />
        </div>

        {selected && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-foreground flex items-center justify-center z-10">
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
