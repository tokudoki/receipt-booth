import { useLocation } from 'wouter';
import { Settings, Delete } from 'lucide-react';
import { useLastReceipt, useSettings } from '@/lib/store';
import { useEffect, useState, useCallback } from 'react';

export default function Home() {
  const [, setLocation] = useLocation();
  const { lastReceipt } = useLastReceipt();
  const { settings } = useSettings();
  const [showBluetoothWarning, setShowBluetoothWarning] = useState(false);

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [shake, setShake] = useState(false);
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    const isStandalone = (navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    const wifiConfigured = Boolean(settings.printerIp?.trim());
    if (!wifiConfigured && !navigator.bluetooth && !isStandalone) {
      setShowBluetoothWarning(true);
    }
  }, [settings.printerIp]);

  const handleSettingsPress = () => {
    if (settings.settingsPin) {
      setPinEntry('');
      setPinError(false);
      setShowPinModal(true);
    } else {
      setLocation('/settings');
    }
  };

  const triggerShake = useCallback(() => {
    setShake(true);
    setPinError(true);
    setTimeout(() => {
      setShake(false);
      setPinEntry('');
      setPinError(false);
    }, 600);
  }, []);

  const handleDigit = useCallback((digit: string) => {
    if (shake) return;
    const next = pinEntry + digit;
    setPinEntry(next);
    if (next.length === 4) {
      if (next === settings.settingsPin) {
        setShowPinModal(false);
        setPinEntry('');
        setLocation('/settings');
      } else {
        triggerShake();
      }
    }
  }, [pinEntry, shake, settings.settingsPin, setLocation, triggerShake]);

  const handleDelete = useCallback(() => {
    if (shake) return;
    setPinEntry(p => p.slice(0, -1));
  }, [shake]);

  const PIN_KEYS = ['1','2','3','4','5','6','7','8','9','','0','del'];

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <button
        onClick={handleSettingsPress}
        className="absolute top-6 right-6 p-3 rounded-full hover-elevate transition-transform active:scale-95 text-foreground z-10"
        data-testid="link-settings"
        aria-label="Settings"
      >
        <Settings size={32} strokeWidth={2.5} />
      </button>

      {showBluetoothWarning && (
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

        <a href="/frames" onClick={(e) => { e.preventDefault(); setLocation('/frames'); }} className="group relative" data-testid="link-start">
          <div className="absolute inset-0 bg-foreground translate-x-3 translate-y-3 transition-transform group-hover:translate-x-4 group-hover:translate-y-4 group-active:translate-x-1 group-active:translate-y-1" />
          <button className="relative bg-background border-4 border-foreground text-foreground px-16 py-8 text-5xl md:text-7xl font-black uppercase tracking-widest transition-transform group-active:translate-x-2 group-active:translate-y-2">
            Start
          </button>
        </a>
      </div>

      {lastReceipt && (
        <div className="absolute -left-16 bottom-12 rotate-[-15deg] opacity-80 pointer-events-none drop-shadow-2xl">
          <div className="bg-white p-2 pb-8 border border-gray-200">
            <img src={lastReceipt} alt="Last receipt" className="w-48 object-contain mix-blend-multiply" />
          </div>
        </div>
      )}

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-xs flex flex-col items-center gap-8">

            {/* Title */}
            <div className="text-center">
              <h2 className="text-2xl font-black uppercase tracking-widest">Enter PIN</h2>
              <p className="font-thermal text-muted-foreground mt-1 text-sm">
                {pinError ? 'Incorrect PIN — try again' : 'Settings are protected'}
              </p>
            </div>

            {/* Dot indicator */}
            <div
              className="flex gap-4"
              style={{ animation: shake ? 'pin-shake 0.5s ease-in-out' : 'none' }}
            >
              {[0,1,2,3].map(i => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full border-2 transition-colors ${
                    i < pinEntry.length
                      ? pinError ? 'bg-destructive border-destructive' : 'bg-foreground border-foreground'
                      : 'bg-transparent border-border'
                  }`}
                />
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {PIN_KEYS.map((key, idx) => {
                if (key === '') return <div key={idx} />;
                if (key === 'del') return (
                  <button
                    key={idx}
                    onClick={handleDelete}
                    disabled={pinEntry.length === 0 || shake}
                    className="flex items-center justify-center h-16 border-2 border-border bg-card text-foreground font-bold text-xl hover:bg-secondary active:bg-secondary/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Delete"
                  >
                    <Delete size={22} />
                  </button>
                );
                return (
                  <button
                    key={idx}
                    onClick={() => handleDigit(key)}
                    disabled={pinEntry.length >= 4 || shake}
                    className="flex items-center justify-center h-16 border-2 border-border bg-card text-foreground font-black text-2xl hover:bg-secondary active:bg-secondary/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {key}
                  </button>
                );
              })}
            </div>

            {/* Cancel */}
            <button
              onClick={() => { setShowPinModal(false); setPinEntry(''); }}
              className="font-thermal text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors text-sm uppercase tracking-widest"
            >
              Cancel
            </button>
          </div>

          <style>{`
            @keyframes pin-shake {
              0%, 100% { transform: translateX(0); }
              15%       { transform: translateX(-10px); }
              30%       { transform: translateX(10px); }
              45%       { transform: translateX(-8px); }
              60%       { transform: translateX(8px); }
              75%       { transform: translateX(-4px); }
              90%       { transform: translateX(4px); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
