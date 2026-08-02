import { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { useCapturedPhotos, useSettings, useLastReceipt, useFrameSelection } from '@/lib/store';
import { floydSteinbergDither } from '@/lib/dither';
import { connectPrinter, printReceipt, isPrinterConnected, printReceiptWifi } from '@/lib/printer';
import { renderReceiptToCanvas } from '@/lib/render-receipt';
import { Printer, RefreshCcw, Download, CheckCircle, Bluetooth, Wifi, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Preview() {
  const [_, setLocation] = useLocation();
  const { photos, clearPhotos } = useCapturedPhotos();
  const { settings } = useSettings();
  const { saveLastReceipt } = useLastReceipt();
  const { frameCount } = useFrameSelection();
  const { toast } = useToast();

  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(true);

  // Ref to the captured canvas (full-color, for printing)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [printStatus, setPrintStatus] = useState<'idle' | 'connecting' | 'printing' | 'done'>('idle');

  useEffect(() => {
    if (photos.length !== frameCount) {
      setLocation('/');
      return;
    }

    async function doCompose() {
      try {
        // Render receipt directly to canvas — no DOM serialisation, no html-to-image.
        // This approach works on iOS Safari which cannot render <img> inside SVG foreignObject.
        const captured = await renderReceiptToCanvas(photos, settings, frameCount);
        canvasRef.current = captured;

        // Make a dithered copy for the on-screen preview
        const dithered = document.createElement('canvas');
        dithered.width  = captured.width;
        dithered.height = captured.height;
        const dctx = dithered.getContext('2d')!;
        dctx.drawImage(captured, 0, 0);
        const imgData = dctx.getImageData(0, 0, dithered.width, dithered.height);
        dctx.putImageData(floydSteinbergDither(imgData), 0, 0);

        const url = dithered.toDataURL('image/png');
        setReceiptUrl(url);
        saveLastReceipt(url);
      } catch (err) {
        console.error(err);
        toast({ title: 'Error composing receipt', variant: 'destructive' });
      } finally {
        setIsComposing(false);
      }
    }

    doCompose();
  }, [photos, settings, frameCount, setLocation, saveLastReceipt, toast]);

  const isWifiMode = Boolean(settings.printerIp?.trim());

  const handlePrint = async () => {
    if (!canvasRef.current) return;
    try {
      if (isWifiMode) {
        // WiFi path — send to local bridge, no pairing needed
        setPrintStatus('printing');
        // Pass bridgeUrl as-is (empty string is valid — printReceiptWifi derives from window.location.origin)
        await printReceiptWifi(canvasRef.current, settings.printerIp, settings.bridgeUrl, settings.bridgeSecret || '');
      } else {
        // Bluetooth fallback
        if (!isPrinterConnected()) {
          setPrintStatus('connecting');
          await connectPrinter();
        }
        setPrintStatus('printing');
        await printReceipt(canvasRef.current);
      }
      setPrintStatus('done');
      setTimeout(() => setPrintStatus('idle'), 3000);
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Printing Failed',
        description: err.message || 'Check printer connection.',
        variant: 'destructive',
      });
      setPrintStatus('idle');
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col lg:flex-row overflow-hidden bg-background text-foreground">

      {/* Left — dithered preview */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 border-b lg:border-b-0 lg:border-r border-border bg-[#E8E6E1] relative overflow-hidden">
        {isComposing ? (
          <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground font-mono uppercase">
            <Loader2 className="animate-spin" size={48} />
            <p>Composing Receipt…</p>
          </div>
        ) : receiptUrl ? (
          <div className="relative h-full w-full flex items-center justify-center">
            <img
              src={receiptUrl}
              alt="Receipt Preview"
              className="max-h-full max-w-[380px] w-auto object-contain mix-blend-multiply bg-white p-2 pb-6 shadow-xl border-b-4 border-r-2 border-border/20 transform rotate-[-2deg] transition-transform hover:rotate-0 duration-500 ease-out"
            />
          </div>
        ) : null}
      </div>

      {/* Right — actions */}
      <div className="w-full lg:w-[420px] shrink-0 p-6 flex flex-col justify-center gap-4 bg-card overflow-y-auto">

        <div className="space-y-2 mb-4">
          <h2 className="text-4xl font-black uppercase">Ready to Print</h2>
          <p className="text-muted-foreground font-thermal flex items-center gap-2">
            {isWifiMode ? <Wifi size={16} /> : <Bluetooth size={16} />}
            {isWifiMode
              ? `WiFi Printer · ${settings.printerIp}`
              : isPrinterConnected() ? 'Printer Connected' : 'Printer Ready'}
          </p>
        </div>

        <button
          onClick={handlePrint}
          disabled={!receiptUrl || printStatus === 'connecting' || printStatus === 'printing'}
          className={`relative group w-full ${printStatus === 'done' ? 'bg-green-600 text-white' : 'bg-foreground text-background'} p-6 text-3xl font-black uppercase transition-all disabled:opacity-50`}
        >
          <div className="flex items-center justify-center gap-4">
            {printStatus === 'connecting' ? <Loader2 className="animate-spin" /> :
             printStatus === 'printing'   ? <Printer className="animate-bounce" /> :
             printStatus === 'done'       ? <CheckCircle /> :
                                            <Printer size={32} />}
            <span>
              {printStatus === 'connecting' ? 'Connecting…' :
               printStatus === 'printing'   ? 'Printing…' :
               printStatus === 'done'       ? 'Printed!' :
                                             'Print Receipt'}
            </span>
          </div>
        </button>

        <div className="flex gap-4">
          <button
            onClick={() => {
              if (receiptUrl) {
                const a = document.createElement('a');
                a.href = receiptUrl;
                a.download = `receipt-booth-${Date.now()}.png`;
                a.click();
              }
            }}
            disabled={!receiptUrl}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-border p-4 font-bold uppercase hover:bg-secondary transition-colors"
          >
            <Download size={20} /> Save
          </button>

          <button
            onClick={() => { clearPhotos(); setLocation('/capture'); }}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-border p-4 font-bold uppercase hover:bg-secondary transition-colors"
          >
            <RefreshCcw size={20} /> Retake
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex justify-center">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground font-thermal font-bold underline underline-offset-4 decoration-2"
          >
            BACK TO HOME
          </Link>
        </div>
      </div>

    </div>
  );
}
