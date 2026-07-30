import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { getCameraStream, captureFrame } from '@/lib/camera';
import { useCapturedPhotos } from '@/lib/store';
import { Camera, AlertCircle } from 'lucide-react';

type Step = 'init' | 'countdown' | 'flash' | 'wait' | 'done';

export default function Capture() {
  const [_, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { savePhotos, clearPhotos } = useCapturedPhotos();
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const photoCountRef = useRef(0);
  
  const [step, setStep] = useState<Step>('init');
  const [countdown, setCountdown] = useState(3);
  
  // Initialize camera
  useEffect(() => {
    clearPhotos();
    
    let activeStream: MediaStream | null = null;
    
    getCameraStream()
      .then((s) => {
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((e) => {
        setError(e.message || 'Failed to access camera.');
      });
      
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [clearPhotos]);

  // Sequence logic
  useEffect(() => {
    if (!stream || step === 'done') return;

    if (step === 'init') {
      // Small delay before starting first countdown
      const t = setTimeout(() => {
        setStep('countdown');
        setCountdown(3);
      }, 1000);
      return () => clearTimeout(t);
    }

    if (step === 'countdown') {
      if (countdown > 0) {
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
      } else {
        setStep('flash');
        return undefined;
      }
    }

    if (step === 'flash') {
      if (videoRef.current) {
        const photo = captureFrame(videoRef.current);
        photoCountRef.current += 1;
        setLocalPhotos(prev => [...prev, photo]);
      }
      
      const capturedSoFar = photoCountRef.current;
      const t = setTimeout(() => {
        if (capturedSoFar >= 4) {
          setStep('done');
        } else {
          setStep('wait');
        }
      }, 150); // Flash duration
      return () => clearTimeout(t);
    }

    if (step === 'wait') {
      const t = setTimeout(() => {
        setStep('countdown');
        setCountdown(1); // Shorter countdown between photos
      }, 850); // total 1s gap
      return () => clearTimeout(t);
    }

    return undefined;
  }, [stream, step, countdown]);

  // Handle completion
  useEffect(() => {
    if (step === 'done' && localPhotos.length === 4) {
      savePhotos(localPhotos);
      // Wait a sec before redirecting so user sees the last photo
      const t = setTimeout(() => {
        setLocation('/preview');
      }, 1000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [step, localPhotos, savePhotos, setLocation]);


  if (error) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={64} className="text-destructive mb-6" />
        <h2 className="text-3xl font-black uppercase mb-4">Camera Error</h2>
        <p className="text-xl font-mono mb-8 max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="border-4 border-foreground px-8 py-4 text-2xl font-black uppercase hover:bg-foreground hover:text-background transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-foreground text-background flex flex-col relative overflow-hidden">
      
      {/* Video Preview */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* We crop it square using CSS, but actual capture is done in canvas */}
        <div className="w-full max-w-3xl aspect-square relative bg-black">
          {!stream && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera size={64} className="animate-pulse opacity-50" />
            </div>
          )}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover -scale-x-100" 
          />

          {/* Flash overlay */}
          <div 
            className={`absolute inset-0 bg-white z-20 transition-opacity duration-75 ${step === 'flash' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          ></div>
        </div>
      </div>

      {/* Countdown overlay */}
      {step === 'countdown' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <span 
            key={countdown} 
            className="text-[30vw] font-black leading-none drop-shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-bounce"
          >
            {countdown}
          </span>
        </div>
      )}

      {/* Strip preview */}
      <div className="h-40 md:h-48 w-full p-4 flex gap-4 items-center justify-center bg-black border-t border-white/20">
        {[0, 1, 2, 3].map(i => (
          <div 
            key={i} 
            className={`h-full aspect-square border-2 ${localPhotos[i] ? 'border-white' : 'border-white/20 border-dashed'} flex items-center justify-center bg-white/5 relative overflow-hidden transition-all duration-300`}
          >
            {localPhotos[i] && (
              <img 
                src={localPhotos[i]} 
                alt={`Photo ${i+1}`} 
                className="w-full h-full object-cover transition-opacity duration-300" 
              />
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
