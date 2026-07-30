import { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { useCapturedPhotos, useSettings, useLastReceipt } from '@/lib/store';
import { composeReceipt } from '@/lib/receipt';
import { floydSteinbergDither } from '@/lib/dither';
import { connectPrinter, printReceipt, isPrinterConnected } from '@/lib/printer';
import { QRCodeCanvas } from 'qrcode.react';
import { Printer, RefreshCcw, Download, CheckCircle, Bluetooth, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Preview() {
  const [_, setLocation] = useLocation();
  const { photos, clearPhotos } = useCapturedPhotos();
  const { settings } = useSettings();
  const { saveLastReceipt } = useLastReceipt();
  const { toast } = useToast();

  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(true);
  
  const qrRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [printStatus, setPrintStatus] = useState<'idle' | 'connecting' | 'printing' | 'done'>('idle');

  useEffect(() => {
    if (photos.length !== 4) {
      setLocation('/');
      return;
    }

    async function doCompose() {
      // Need a tiny delay to ensure QR code renders to DOM so we can extract its canvas
      await new Promise(r => setTimeout(r, 100));
      
      const qrCanvas = qrRef.current?.querySelector('canvas');
      const qrDataUrl = qrCanvas ? qrCanvas.toDataURL() : '';

      try {
        const composedCanvas = await composeReceipt(photos, settings, qrDataUrl);
        canvasRef.current = composedCanvas;

        // Create a dithered version for the preview screen
        const ditheredCanvas = document.createElement('canvas');
        ditheredCanvas.width = composedCanvas.width;
        ditheredCanvas.height = composedCanvas.height;
        const dctx = ditheredCanvas.getContext('2d')!;
        dctx.drawImage(composedCanvas, 0, 0);
        
        const imageData = dctx.getImageData(0, 0, ditheredCanvas.width, ditheredCanvas.height);
        dctx.putImageData(floydSteinbergDither(imageData), 0, 0);

        const url = ditheredCanvas.toDataURL('image/png');
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
  }, [photos, settings, setLocation, saveLastReceipt, toast]);

  const handlePrint = async () => {
    if (!canvasRef.current) return;
    
    try {
      if (!isPrinterConnected()) {
        setPrintStatus('connecting');
        await connectPrinter();
      }
      
      setPrintStatus('printing');
      await printReceipt(canvasRef.current);
      setPrintStatus('done');
      
      setTimeout(() => setPrintStatus('idle'), 3000);
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: 'Printing Failed', 
        description: err.message || 'Check printer connection.',
        variant: 'destructive' 
      });
      setPrintStatus('idle');
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col md:flex-row bg-background text-foreground">
      
      {/* Hidden QR Code for composition */}
      <div className="absolute opacity-0 pointer-events-none -left-[9999px]" ref={qrRef}>
        <QRCodeCanvas value={settings.qrCodeUrl} size={200} level="M" />
      </div>

      {/* Left: Preview Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-border min-h-[60vh] bg-[#E8E6E1] relative overflow-hidden">
        {isComposing ? (
          <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground font-mono uppercase">
            <Loader2 className="animate-spin" size={48} />
            <p>Composing Receipt...</p>
          </div>
        ) : receiptUrl ? (
          <div className="relative h-full w-full max-w-sm flex items-center justify-center">
            {/* The physical paper look */}
            <div className="w-full max-w-[300px] shadow-xl transform rotate-[-2deg] transition-transform hover:rotate-0 duration-500 ease-out">
              <img src={receiptUrl} alt="Receipt Preview" className="w-full h-auto object-contain mix-blend-multiply bg-white p-2 pb-6 border-b-4 border-r-2 border-border/20" />
            </div>
          </div>
        ) : null}
      </div>

      {/* Right: Actions */}
      <div className="w-full md:w-96 lg:w-[450px] p-8 flex flex-col justify-center gap-6 bg-card">
        
        <div className="space-y-2 mb-4">
          <h2 className="text-4xl font-black uppercase">Ready to Print</h2>
          <p className="text-muted-foreground font-thermal flex items-center gap-2">
            <Bluetooth size={16} />
            {isPrinterConnected() ? 'Printer Connected' : 'Printer Ready'}
          </p>
        </div>

        <button
          onClick={handlePrint}
          disabled={!receiptUrl || printStatus === 'connecting' || printStatus === 'printing'}
          className={`relative group w-full ${printStatus === 'done' ? 'bg-green-600 text-white' : 'bg-foreground text-background'} p-6 text-3xl font-black uppercase transition-all disabled:opacity-50`}
        >
          <div className="flex items-center justify-center gap-4">
            {printStatus === 'connecting' ? <Loader2 className="animate-spin" /> : 
             printStatus === 'printing' ? <Printer className="animate-bounce" /> :
             printStatus === 'done' ? <CheckCircle /> :
             <Printer size={32} />}
            
            <span>
              {printStatus === 'connecting' ? 'Connecting...' : 
               printStatus === 'printing' ? 'Printing...' :
               printStatus === 'done' ? 'Printed!' :
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
            onClick={() => {
              clearPhotos();
              setLocation('/capture');
            }}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-border p-4 font-bold uppercase hover:bg-secondary transition-colors"
          >
            <RefreshCcw size={20} /> Retake
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex justify-center">
          <Link href="/" className="text-muted-foreground hover:text-foreground font-thermal font-bold underline underline-offset-4 decoration-2">
            BACK TO HOME
          </Link>
        </div>
      </div>

    </div>
  );
}
