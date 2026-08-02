import { useState, useRef } from 'react';
import { Link } from 'wouter';
import { useSettings } from '@/lib/store';
import { connectPrinter, isPrinterConnected, disconnectPrinter } from '@/lib/printer';
import { ArrowLeft, Bluetooth, Wifi, Image as ImageIcon, CheckCircle, Trash2, Printer, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { settings, saveSettings } = useSettings();
  const { toast } = useToast();
  
  const [footerText, setFooterText] = useState(settings.footerText);
  const [qrCodeUrl, setQrCodeUrl] = useState(settings.qrCodeUrl);
  const [printerIp, setPrinterIp] = useState(settings.printerIp ?? '');
  const [bridgeUrl, setBridgeUrl] = useState(settings.bridgeUrl ?? '');
  const [bridgeSecret, setBridgeSecret] = useState(settings.bridgeSecret ?? '');

  const [isConnecting, setIsConnecting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(isPrinterConnected());
  const [isDiscovering, setIsDiscovering] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    saveSettings({ footerText, qrCodeUrl, printerIp, bridgeUrl, bridgeSecret });
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

  const handleDiscover = async () => {
    const base = bridgeUrl.trim();
    if (!base) {
      toast({ title: 'Bridge URL required', description: 'Enter the Bridge URL (e.g. http://192.168.1.x:3001) before scanning.', variant: 'destructive' });
      return;
    }
    setIsDiscovering(true);
    try {
      const res = await fetch(`${base}/discover`);
      if (!res.ok) throw new Error(`Bridge returned ${res.status}`);
      const data = await res.json();
      if (data.printers && data.printers.length > 0) {
        setPrinterIp(data.printers[0]);
        saveSettings({ printerIp: data.printers[0], footerText, qrCodeUrl, bridgeUrl, bridgeSecret });
        toast({ title: `Printer found: ${data.printers[0]}`, description: data.printers.length > 1 ? `${data.printers.length - 1} other(s) also found` : undefined });
      } else {
        toast({ title: 'No printers found', description: 'No devices listening on port 9100 were found on the local network.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Discovery failed', description: `Could not reach the bridge. Check the Bridge URL field. (${err.message})`, variant: 'destructive' });
    } finally {
      setIsDiscovering(false);
    }
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
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border p-4 md:p-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold uppercase hover:opacity-70 transition-opacity">
          <ArrowLeft size={24} />
          Back
        </Link>
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest">Settings</h1>
        <div className="w-20" /> {/* spacer */}
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 md:p-12 space-y-12 pb-16">
        
        {/* Printer Section */}
        <section className="space-y-6">
          <div className="border-b-4 border-foreground pb-2">
            <h2 className="text-3xl font-black uppercase flex items-center gap-3">
              <Printer size={32} />
              Thermal Printer
            </h2>
          </div>
          
          {/* WiFi mode (MUNBYN P905) */}
          <div className="bg-card border-2 border-border p-6 space-y-4">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
              <Wifi size={20} /> WiFi Printer (MUNBYN P905)
            </div>
            <p className="font-thermal text-muted-foreground text-sm">
              Enter the printer's IP address and run the local print bridge on your Mac. Leave Printer IP blank to use Bluetooth instead.
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-sm font-bold uppercase tracking-wider block">Printer IP Address</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={printerIp}
                    onChange={(e) => setPrinterIp(e.target.value)}
                    onBlur={handleSave}
                    placeholder="e.g. 192.168.1.42"
                    className="flex-1 p-3 border-2 border-border bg-background font-mono text-base outline-none focus:border-foreground transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleDiscover}
                    disabled={isDiscovering}
                    title="Scan local network for printers on port 9100"
                    className="px-4 py-3 border-2 border-border bg-secondary text-secondary-foreground font-bold uppercase text-sm flex items-center gap-2 whitespace-nowrap hover:bg-foreground hover:text-background hover:border-foreground transition-colors disabled:opacity-50"
                  >
                    {isDiscovering ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    {isDiscovering ? 'Scanning…' : 'Find Printer'}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold uppercase tracking-wider block">Bridge URL <span className="font-normal normal-case text-muted-foreground">(optional)</span></label>
                <input
                  type="text"
                  value={bridgeUrl}
                  onChange={(e) => setBridgeUrl(e.target.value)}
                  onBlur={handleSave}
                  placeholder="Auto (same origin)"
                  className="w-full p-3 border-2 border-border bg-background font-mono text-base outline-none focus:border-foreground transition-colors"
                />
                <p className="text-xs text-muted-foreground font-thermal">
                  Leave blank — print requests go to the same address you opened the app from. Only set this if the bridge runs on a different machine.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold uppercase tracking-wider block">Bridge Secret <span className="font-normal normal-case text-muted-foreground">(optional)</span></label>
                <input
                  type="password"
                  value={bridgeSecret}
                  onChange={(e) => setBridgeSecret(e.target.value)}
                  onBlur={handleSave}
                  placeholder="Leave blank if not configured"
                  className="w-full p-3 border-2 border-border bg-background font-mono text-base outline-none focus:border-foreground transition-colors"
                />
                <p className="text-xs text-muted-foreground font-thermal">
                  Must match the SECRET value set in bridge.js. Leave blank if SECRET is empty.
                </p>
              </div>
            </div>
          </div>

          {/* Bluetooth fallback */}
          <div className="bg-card border-2 border-border p-6 space-y-4">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
              <Bluetooth size={20} /> Bluetooth Printer (fallback)
            </div>
            <p className="font-thermal text-muted-foreground text-sm">
              Used only when Printer IP above is blank. Requires Chrome or Edge.
            </p>
            
            <div className="flex items-center gap-4 mt-2">
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

      </div>
      </main>
    </div>
  );
}
