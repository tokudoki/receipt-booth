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
                className="flex flex-col items-center gap-3 focus:outline-none group w-full"
              >
                {/* Template — outline and check badge are rendered inside ScaledReceiptTemplate */}
                <ScaledReceiptTemplate
                  frameCount={count}
                  settings={settings}
                  maxHeight={maxCardHeight}
                  selected={isSelected}
                />

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
