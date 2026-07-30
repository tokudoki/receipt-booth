import { Link } from 'wouter';
import { Settings } from 'lucide-react';
import { useLastReceipt } from '@/lib/store';
import { useEffect, useState } from 'react';

export default function Home() {
  const { lastReceipt } = useLastReceipt();
  const [isBluetoothSupported, setIsBluetoothSupported] = useState(true);

  useEffect(() => {
    if (!navigator.bluetooth) {
      setIsBluetoothSupported(false);
    }
  }, []);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <Link href="/settings" className="absolute top-6 right-6 p-3 rounded-full hover-elevate transition-transform active:scale-95 text-foreground z-10" data-testid="link-settings">
        <Settings size={32} strokeWidth={2.5} />
      </Link>

      {!isBluetoothSupported && (
        <div className="absolute top-6 left-6 max-w-xs bg-destructive text-destructive-foreground p-4 text-sm font-mono uppercase font-bold z-10 shadow-lg">
          WARNING: WEB BLUETOOTH NOT SUPPORTED. USE CHROME OR EDGE ON ANDROID/MAC/PC.
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl z-10 gap-16">
        
        <div className="text-center space-y-4">
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter">
            Receipt Booth
          </h1>
          <p className="text-xl md:text-2xl font-thermal">
            Instant Thermal Portraits
          </p>
        </div>

        <Link href="/frames" className="group relative" data-testid="link-start">
          <div className="absolute inset-0 bg-foreground translate-x-3 translate-y-3 transition-transform group-hover:translate-x-4 group-hover:translate-y-4 group-active:translate-x-1 group-active:translate-y-1"></div>
          <button className="relative bg-background border-4 border-foreground text-foreground px-16 py-8 text-5xl md:text-7xl font-black uppercase tracking-widest transition-transform group-active:translate-x-2 group-active:translate-y-2">
            Start
          </button>
        </Link>
      </div>

      {lastReceipt && (
        <div className="absolute -left-16 bottom-12 rotate-[-15deg] opacity-80 pointer-events-none drop-shadow-2xl">
          <div className="bg-white p-2 pb-8 border border-gray-200">
            <img src={lastReceipt} alt="Last receipt" className="w-48 object-contain mix-blend-multiply" />
          </div>
        </div>
      )}

      {/* Decorative noise/texture overlay handled in css body */}
    </div>
  );
}
