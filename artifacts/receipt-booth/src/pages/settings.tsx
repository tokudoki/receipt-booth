import { useState, useRef } from 'react';
import { Link } from 'wouter';
import { useSettings } from '@/lib/store';
import { connectPrinter, isPrinterConnected, disconnectPrinter } from '@/lib/printer';
import { ArrowLeft, Bluetooth, Image as ImageIcon, CheckCircle, Trash2, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { settings, saveSettings } = useSettings();
  const { toast } = useToast();
  
  const [footerText, setFooterText] = useState(settings.footerText);
  const [qrCodeUrl, setQrCodeUrl] = useState(settings.qrCodeUrl);
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(isPrinterConnected());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    saveSettings({
      footerText,
      qrCodeUrl
    });
    toast({ title: 'Settings saved successfully' });
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connectPrinter();
      setPrinterConnected(true);
      toast({ title: 'Printer connected' });
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: 'Connection failed', 
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleDisconnect = async () => {
    await disconnectPrinter();
    setPrinterConnected(false);
    toast({ title: 'Printer disconnected' });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        saveSettings({ logoDataUrl: event.target.result as string });
        toast({ title: 'Logo updated' });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border p-4 md:p-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold uppercase hover:opacity-70 transition-opacity">
          <ArrowLeft size={24} />
          Back
        </Link>
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest">Settings</h1>
        <div className="w-20" /> {/* spacer */}
      </header>

      <main className="max-w-2xl mx-auto p-6 md:p-12 space-y-12">
        
        {/* Printer Section */}
        <section className="space-y-6">
          <div className="border-b-4 border-foreground pb-2">
            <h2 className="text-3xl font-black uppercase flex items-center gap-3">
              <Printer size={32} />
              Thermal Printer
            </h2>
          </div>
          
          <div className="bg-card border-2 border-border p-6 space-y-4">
            <p className="font-thermal text-muted-foreground">
              Connect to an ESC/POS compatible Bluetooth thermal printer. Uses Web Bluetooth (requires Chrome/Edge).
            </p>
            
            <div className="flex items-center gap-4 mt-6">
              {printerConnected ? (
                <>
                  <div className="flex items-center gap-2 text-green-600 font-bold uppercase">
                    <CheckCircle /> Connected
                  </div>
                  <button 
                    onClick={handleDisconnect}
                    className="ml-auto px-4 py-2 border-2 border-border uppercase font-bold text-sm hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button 
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full md:w-auto px-8 py-4 bg-foreground text-background font-black uppercase tracking-wider flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Bluetooth size={24} />
                  {isConnecting ? 'Connecting...' : 'Pair Printer'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Receipt Customization Section */}
        <section className="space-y-6">
          <div className="border-b-4 border-foreground pb-2">
            <h2 className="text-3xl font-black uppercase flex items-center gap-3">
              <ImageIcon size={32} />
              Receipt Style
            </h2>
          </div>
          
          <div className="space-y-8">
            
            {/* Logo */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider block">Brand Logo</label>
              <p className="text-sm text-muted-foreground font-thermal mb-4">
                Will be printed in black and white at the bottom left. Max height 80px.
              </p>
              
              <div className="flex items-end gap-6">
                <div className="w-32 h-32 border-2 border-dashed border-border bg-card flex items-center justify-center relative overflow-hidden">
                  {settings.logoDataUrl ? (
                    <img src={settings.logoDataUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="text-muted-foreground opacity-50" size={32} />
                  )}
                </div>
                
                <div className="space-y-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-secondary text-secondary-foreground font-bold uppercase block w-full text-center"
                  >
                    Upload Logo
                  </button>
                  {settings.logoDataUrl && (
                    <button 
                      onClick={() => saveSettings({ logoDataUrl: null })}
                      className="px-6 py-2 text-destructive font-bold uppercase flex items-center gap-2 justify-center w-full hover:bg-destructive/10"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider block">QR Code URL</label>
              <p className="text-sm text-muted-foreground font-thermal mb-2">Printed at the bottom right.</p>
              <input 
                type="url" 
                value={qrCodeUrl}
                onChange={(e) => setQrCodeUrl(e.target.value)}
                onBlur={handleSave}
                placeholder="https://yourwebsite.com"
                className="w-full p-4 border-2 border-border bg-background font-mono text-lg outline-none focus:border-foreground transition-colors"
              />
            </div>

            {/* Footer Text */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider block">Footer Text</label>
              <p className="text-sm text-muted-foreground font-thermal mb-2">Centered at the very bottom. Keep lines short.</p>
              <textarea 
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                onBlur={handleSave}
                rows={3}
                placeholder="RECEIPT BOOTH\nTHANK YOU"
                className="w-full p-4 border-2 border-border bg-background font-mono text-lg uppercase outline-none focus:border-foreground transition-colors resize-none"
              />
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
