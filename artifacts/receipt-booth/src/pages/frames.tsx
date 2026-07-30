import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { useFrameSelection, type FrameCount } from '@/lib/store';

// ─── Receipt template preview cards ─────────────────────────────────────────
// Each mimics the exact Figma template layouts:
//   • Photos are edge-to-edge (no side padding)
//   • Separated by a thin white gap
//   • No border outlines on photos

const GAP = '3px'; // thin white gap between photos

function ReceiptCard({ children, selected }: { children: React.ReactNode; selected: boolean }) {
  return (
    <div
      className={[
        'w-full bg-white flex flex-col overflow-hidden transition-all duration-150',
        selected
          ? 'outline outline-[3px] outline-foreground shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'
          : 'outline outline-[1.5px] outline-border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.12)]',
      ].join(' ')}
      style={{ aspectRatio: '1 / 2.1' }}
    >
      {/* Serrated top tear */}
      <div className="w-full flex-shrink-0" style={{ height: 7 }}>
        <svg width="100%" height="7" preserveAspectRatio="none" viewBox="0 0 200 7">
          <polyline
            points={Array.from({ length: 21 }, (_, i) =>
              i % 2 === 0 ? `${i * 10},0` : `${i * 10 - 5},7`
            ).join(' ') + ' 200,0'}
            fill="none"
            stroke="#d0cdc8"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Header area — brand name placeholder */}
      <div className="flex flex-col items-center justify-center py-2 px-1 flex-shrink-0" style={{ height: '26%' }}>
        <div className="font-serif text-[clamp(10px,3vw,18px)] font-normal tracking-tight text-foreground leading-tight text-center">
          centered
        </div>
        <div className="text-[clamp(6px,1.5vw,9px)] text-muted-foreground tracking-wide text-center mt-0.5">
          of the traveling journal
        </div>
      </div>

      {/* Photo zone */}
      {children}

      {/* Footer area */}
      <div className="flex flex-col items-center justify-center flex-shrink-0 py-2" style={{ height: '16%' }}>
        <div className="text-[clamp(5px,1.2vw,8px)] font-bold uppercase tracking-wider text-foreground text-center font-mono">
          JOURNAL #0001
        </div>
        <div className="text-[clamp(5px,1.2vw,8px)] font-mono uppercase tracking-wider text-foreground text-center">
          STARTED, Jan 10, 2026
        </div>
      </div>
    </div>
  );
}

// Photo placeholder — flat gray, no border
function Photo({ style }: { style?: React.CSSProperties }) {
  return <div className="w-full bg-[#ABABAB]" style={style} />;
}

function OneFramePreview({ selected }: { selected: boolean }) {
  return (
    <ReceiptCard selected={selected}>
      <div className="flex-1 w-full">
        <Photo style={{ height: '100%' }} />
      </div>
    </ReceiptCard>
  );
}

function TwoFramePreview({ selected }: { selected: boolean }) {
  return (
    <ReceiptCard selected={selected}>
      <div className="flex-1 w-full flex flex-col" style={{ gap: GAP, backgroundColor: 'white' }}>
        <Photo style={{ flex: 1 }} />
        <Photo style={{ flex: 1 }} />
      </div>
    </ReceiptCard>
  );
}

function ThreeFramePreview({ selected }: { selected: boolean }) {
  return (
    <ReceiptCard selected={selected}>
      <div className="flex-1 w-full flex flex-col" style={{ gap: GAP, backgroundColor: 'white' }}>
        <Photo style={{ flex: 1 }} />
        <Photo style={{ flex: 1 }} />
        <Photo style={{ flex: 1 }} />
      </div>
    </ReceiptCard>
  );
}

function FourFramePreview({ selected }: { selected: boolean }) {
  return (
    <ReceiptCard selected={selected}>
      <div
        className="flex-1 w-full grid grid-cols-2"
        style={{ gap: GAP, backgroundColor: 'white' }}
      >
        <Photo />
        <Photo />
        <Photo />
        <Photo />
      </div>
    </ReceiptCard>
  );
}

// ─── Frame option definitions ────────────────────────────────────────────────

const FRAME_OPTIONS: {
  count: FrameCount;
  label: string;
  sub: string;
  Preview: (props: { selected: boolean }) => JSX.Element;
}[] = [
  { count: 1, label: '1 FRAME',  sub: 'Full portrait',  Preview: OneFramePreview   },
  { count: 2, label: '2 FRAMES', sub: 'Double strip',   Preview: TwoFramePreview   },
  { count: 3, label: '3 FRAMES', sub: 'Triple strip',   Preview: ThreeFramePreview },
  { count: 4, label: '4 FRAMES', sub: '2 × 2 grid',     Preview: FourFramePreview  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Frames() {
  const [_, setLocation] = useLocation();
  const { frameCount, saveFrameCount } = useFrameSelection();
  const [selected, setSelected] = useState<FrameCount>(frameCount);

  function handleContinue() {
    saveFrameCount(selected);
    setLocation('/capture');
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-8 pb-4">
        <Link href="/" className="p-2 hover:opacity-60 transition-opacity shrink-0">
          <ArrowLeft size={28} strokeWidth={2.5} />
        </Link>
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-none">
            Choose Your Frame
          </h1>
          <p className="font-thermal text-muted-foreground mt-1 text-sm md:text-base">
            Select a layout for your receipt
          </p>
        </div>
      </div>

      {/* Cards — 2-col on mobile, 4-col on md+ (iPad landscape) */}
      <div className="flex-1 px-4 md:px-8 py-4 overflow-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 max-w-5xl mx-auto">
          {FRAME_OPTIONS.map(({ count, label, sub, Preview }) => {
            const isSelected = selected === count;
            return (
              <button
                key={count}
                onClick={() => setSelected(count)}
                className="flex flex-col items-center gap-3 focus:outline-none group"
              >
                {/* Selected ring wrapper */}
                <div className="relative w-full">
                  <Preview selected={isSelected} />
                  {/* Check badge */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-foreground flex items-center justify-center z-10">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Label */}
                <div className="text-center">
                  <p className={`font-black uppercase text-sm md:text-base tracking-wider leading-tight transition-colors ${isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                    {label}
                  </p>
                  <p className="font-thermal text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Continue button */}
      <div className="px-6 py-8 shrink-0">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={handleContinue}
            className="group relative w-full md:w-auto md:min-w-[280px]"
          >
            <div className="absolute inset-0 bg-foreground translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3 group-active:translate-x-0.5 group-active:translate-y-0.5" />
            <div className="relative bg-background border-4 border-foreground text-foreground px-12 py-5 text-2xl md:text-3xl font-black uppercase tracking-widest text-center transition-transform group-active:translate-x-1 group-active:translate-y-1">
              Continue →
            </div>
          </button>
        </div>
      </div>

    </div>
  );
}
