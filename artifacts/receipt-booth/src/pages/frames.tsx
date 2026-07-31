import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { useFrameSelection, useSettings, type FrameCount } from '@/lib/store';
import { ScaledReceiptTemplate } from '@/components/receipt-template';

const FRAME_OPTIONS: { count: FrameCount; label: string; sub: string }[] = [
  { count: 1, label: '1 FRAME',  sub: 'Full portrait'  },
  { count: 2, label: '2 FRAMES', sub: 'Double strip'   },
  { count: 3, label: '3 FRAMES', sub: 'Triple strip'   },
  { count: 4, label: '4 FRAMES', sub: '2 × 2 grid'     },
];

// Height of the label area below each card (text + gap-3 = 12px)
const LABEL_H_PX = 56;
// Row gap between the two grid rows
const ROW_GAP_PX = 16; // gap-4

export default function Frames() {
  const [_, setLocation] = useLocation();
  const { frameCount, saveFrameCount } = useFrameSelection();
  const { settings } = useSettings();
  const [selected, setSelected] = useState<FrameCount>(frameCount);

  // Measure the cards container so ScaledReceiptTemplate can cap its height
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridHeight, setGridHeight] = useState(0);

  useEffect(() => {
    const update = () => {
      if (gridRef.current) setGridHeight(gridRef.current.clientHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    if (gridRef.current) ro.observe(gridRef.current);
    return () => ro.disconnect();
  }, []);

  // Max receipt-image height per card so both rows fit without overflow
  const maxCardHeight = gridHeight > 0
    ? Math.max(60, Math.floor((gridHeight - ROW_GAP_PX) / 2) - LABEL_H_PX)
    : undefined;

  function handleContinue() {
    saveFrameCount(selected);
    setLocation('/capture');
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-background text-foreground">

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

      {/* Cards — 2×2 grid; height-constrained so both rows fit without scrolling */}
      <div className="flex-1 min-h-0 px-4 md:px-8 py-4 overflow-hidden">
        <div ref={gridRef} className="grid grid-cols-2 gap-4 h-full max-w-5xl mx-auto items-start">
          {FRAME_OPTIONS.map(({ count, label, sub }) => {
            const isSelected = selected === count;
            return (
              <button
                key={count}
                onClick={() => setSelected(count)}
                className="flex flex-col items-center gap-3 focus:outline-none group"
              >
                {/* Card shell — selection border wraps the scaled template */}
                <div className="relative w-full">
                  <div
                    className={[
                      'w-full overflow-hidden transition-all duration-150',
                      isSelected
                        ? 'outline outline-[3px] outline-foreground shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'
                        : 'outline outline-[1.5px] outline-border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.12)] group-hover:outline-foreground/50 group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]',
                    ].join(' ')}
                  >
                    {/* The actual template, scaled to fit within its grid cell */}
                    <ScaledReceiptTemplate frameCount={count} settings={settings} maxHeight={maxCardHeight} />
                  </div>

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
            className="group relative w-full"
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
