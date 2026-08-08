import { useState, useRef } from 'react';
import { Link } from 'wouter';
import { useSettings, type FrameCount } from '@/lib/store';
import { connectPrinter, isPrinterConnected, disconnectPrinter } from '@/lib/printer';
import { ArrowLeft, Bluetooth, Wifi, Image as ImageIcon, CheckCircle, Trash2, Printer, Search, Loader2, LayoutGrid } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { settings, saveSettings } = useSettings();
  const { toast } = useToast();
  
  const [headerTitle, setHeaderTitle] = useState(settings.headerTitle ?? '');
  const [itemText, setItemText] = useState(settings.itemText ?? '');
  const [itemStatus, setItemStatus] = useState(settings.itemStatus ?? '');
  const [footerText, setFooterText] = useState(settings.footerText);
  const [qrCodeUrl, setQrCodeUrl] = useState(settings.qrCodeUrl);
  const [printerIp, setPrinterIp] = useState(settings.printerIp ?? '');
  const [bridgeUrl, setBridgeUrl] = useState(settings.bridgeUrl ?? '');
  const [bridgeSecret, setBridgeSecret] = useState(settings.bridgeSecret ?? '');
  const [printBrightness, setPrintBrightness] = useState(settings.printBrightness ?? 1.4);
  const [enabledFrameCounts, setEnabledFrameCounts] = useState<FrameCount[]>(
    settings.enabledFrameCounts?.length > 0 ? settings.enabledFrameCounts : [1, 2, 3, 4]
  );
  const [settingsPin, setSettingsPin] = useState(settings.settingsPin ?? '');

  const [isConnecting, setIsConnecting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(isPrinterConnected());
  const [isDiscovering, setIsDiscovering] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerImageInputRef = useRef<HTMLInputElement>(null);
  const footerImageInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    saveSettings({ headerTitle, itemText, itemStatus, footerText, qrCodeUrl, printerIp, bridgeUrl, bridgeSecret, printBrightness });
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
        saveSettings({ printerIp: data.printers[0], headerTitle, itemText, itemStatus, footerText, qrCodeUrl, bridgeUrl, bridgeSecret });
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

  const handleHeaderImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        saveSettings({ headerImageDataUrl: event.target.result as string });
        toast({ title: 'Header image updated' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFooterImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        saveSettings({ footerImageDataUrl: event.target.result as string });
        toast({ title: 'Footer image updated' });
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
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={printerIp}
                    onChange={(e) => setPrinterIp(e.target.value)}
                    onBlur={handleSave}
                    placeholder="e.g. 192.168.1.42"
                    className="w-full p-3 border-2 border-border bg-background font-mono text-base outline-none focus:border-foreground transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleDiscover}
                    disabled={isDiscovering}
                    title="Scan local network for printers on port 9100"
                    className="w-full px-4 py-3 border-2 border-border bg-secondary text-secondary-foreground font-bold uppercase text-sm flex items-center justify-center gap-2 hover:bg-foreground hover:text-background hover:border-foreground transition-colors disabled:opacity-50"
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

        {/* Receipt Content Section */}
        <section className="space-y-6">
          <div className="border-b-4 border-foreground pb-2">
            <h2 className="text-3xl font-black uppercase flex items-center gap-3">
              <ImageIcon size={32} />
              Receipt Content
            </h2>
          </div>

          <div className="space-y-8">

            {/* Header Image */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider block">Header Image</label>
              <p className="text-sm text-muted-foreground font-thermal mb-4">
                Upload your designed header artwork. It will fill the full receipt width.
                When set, this replaces the Header Title text below.
              </p>
              <div className="flex items-end gap-6">
                <div className="w-32 h-20 border-2 border-dashed border-border bg-card flex items-center justify-center relative overflow-hidden">
                  {settings.headerImageDataUrl ? (
                    <img src={settings.headerImageDataUrl} alt="Header" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-muted-foreground opacity-50" size={28} />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={headerImageInputRef}
                    className="hidden"
                    onChange={handleHeaderImageUpload}
                  />
                  <button
                    onClick={() => headerImageInputRef.current?.click()}
                    className="px-6 py-2 bg-secondary text-secondary-foreground font-bold uppercase block w-full text-center"
                  >
                    Upload Header
                  </button>
                  {settings.headerImageDataUrl && (
                    <button
                      onClick={() => saveSettings({ headerImageDataUrl: null })}
                      className="px-6 py-2 text-destructive font-bold uppercase flex items-center gap-2 justify-center w-full hover:bg-destructive/10"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Header Title */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider block">Header Title <span className="font-normal normal-case text-muted-foreground">(text fallback)</span></label>
              <p className="text-sm text-muted-foreground font-thermal mb-2">
                Used when no Header Image is uploaded.
              </p>
              <input
                type="text"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                onBlur={handleSave}
                placeholder="Receipt Booth"
                className="w-full p-4 border-2 border-border bg-background font-mono text-lg outline-none focus:border-foreground transition-colors"
              />
            </div>

            {/* Item Row */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider block">Item Row</label>
              <p className="text-sm text-muted-foreground font-thermal mb-2">
                Two-column row above the footer text, e.g. "x1 photo session" and "pre-order".
                Leave blank to hide this row.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={itemText}
                  onChange={(e) => setItemText(e.target.value)}
                  onBlur={handleSave}
                  placeholder="x1 photo session"
                  className="flex-1 p-3 border-2 border-border bg-background font-mono text-base outline-none focus:border-foreground transition-colors"
                />
                <input
                  type="text"
                  value={itemStatus}
                  onChange={(e) => setItemStatus(e.target.value)}
                  onBlur={handleSave}
                  placeholder="pre-order"
                  className="w-36 p-3 border-2 border-border bg-background font-mono text-base outline-none focus:border-foreground transition-colors"
                />
              </div>
            </div>

            {/* Footer Image */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider block">Footer Image</label>
              <p className="text-sm text-muted-foreground font-thermal mb-4">
                Upload your designed footer artwork. It will fill the full receipt width.
                When set, this replaces the item row, body text, and "Thank You!" below.
              </p>
              <div className="flex items-end gap-6">
                <div className="w-32 h-20 border-2 border-dashed border-border bg-card flex items-center justify-center relative overflow-hidden">
                  {settings.footerImageDataUrl ? (
                    <img src={settings.footerImageDataUrl} alt="Footer" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-muted-foreground opacity-50" size={28} />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={footerImageInputRef}
                    className="hidden"
                    onChange={handleFooterImageUpload}
                  />
                  <button
                    onClick={() => footerImageInputRef.current?.click()}
                    className="px-6 py-2 bg-secondary text-secondary-foreground font-bold uppercase block w-full text-center"
                  >
                    Upload Footer
                  </button>
                  {settings.footerImageDataUrl && (
                    <button
                      onClick={() => saveSettings({ footerImageDataUrl: null })}
                      className="px-6 py-2 text-destructive font-bold uppercase flex items-center gap-2 justify-center w-full hover:bg-destructive/10"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Body Text */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider block">Footer Body Text <span className="font-normal normal-case text-muted-foreground">(text fallback)</span></label>
              <p className="text-sm text-muted-foreground font-thermal mb-2">
                Used when no Footer Image is uploaded. Centered above "Thank You!".
              </p>
              <textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                onBlur={handleSave}
                rows={3}
                placeholder="e.g. Thank you for coming!"
                className="w-full p-4 border-2 border-border bg-background font-mono text-lg outline-none focus:border-foreground transition-colors resize-none"
              />
            </div>

            {/* Print Brightness */}
            <div className="space-y-3">
              <div>
                <label className="font-bold uppercase tracking-wider block">Print Brightness</label>
                <p className="text-sm text-muted-foreground font-thermal mt-1">
                  Lighten photos before dithering so they don't print too dark. 140% is a good starting point for most indoor selfies.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={50}
                  max={200}
                  step={10}
                  value={Math.round(printBrightness * 100)}
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100;
                    setPrintBrightness(v);
                    saveSettings({ printBrightness: v });
                  }}
                  className="flex-1 accent-foreground"
                />
                <span className="font-mono font-bold text-lg w-14 text-right">
                  {Math.round(printBrightness * 100)}%
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground font-thermal px-0.5">
                <span>50% (darker)</span>
                <span>100% (original)</span>
                <span>200% (lighter)</span>
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider block">Logo <span className="font-normal normal-case text-muted-foreground">(optional)</span></label>
              <p className="text-sm text-muted-foreground font-thermal mb-4">
                When set, replaces the Header Title with your logo image.
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

          </div>
        </section>

        {/* Kiosk Options Section */}
        <section className="space-y-6">
          <div className="border-b-4 border-foreground pb-2">
            <h2 className="text-3xl font-black uppercase flex items-center gap-3">
              <LayoutGrid size={32} />
              Kiosk Options
            </h2>
          </div>

          <div className="space-y-8">

            {/* Settings PIN */}
            <div className="space-y-3">
              <div>
                <label className="font-bold uppercase tracking-wider block">Settings PIN</label>
                <p className="text-sm text-muted-foreground font-thermal mt-1">
                  Set a 4-digit PIN to stop guests from opening Settings. Leave blank for no PIN.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  value={settingsPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setSettingsPin(val);
                    saveSettings({ settingsPin: val });
                  }}
                  placeholder="e.g. 1234"
                  className="w-36 p-3 border-2 border-border bg-background font-mono text-2xl tracking-widest outline-none focus:border-foreground transition-colors"
                />
                {settingsPin && (
                  <button
                    onClick={() => { setSettingsPin(''); saveSettings({ settingsPin: '' }); toast({ title: 'PIN cleared' }); }}
                    className="px-5 py-3 border-2 border-border font-bold uppercase text-sm hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Clear PIN
                  </button>
                )}
              </div>
              {settingsPin.length > 0 && settingsPin.length < 4 && (
                <p className="text-xs text-destructive font-thermal">PIN must be exactly 4 digits.</p>
              )}
              {settingsPin.length === 4 && (
                <p className="text-xs text-muted-foreground font-thermal">✓ PIN is set. Guests will see a keypad when they tap the settings icon.</p>
              )}
            </div>

            {/* Show Save Button */}
            <div className="space-y-3">
              <label
                className="flex items-start gap-4 cursor-pointer select-none"
                onClick={() => saveSettings({ showSaveButton: !(settings.showSaveButton !== false) })}
              >
                <div className={`mt-0.5 w-10 h-6 shrink-0 rounded-full border-2 transition-colors relative ${settings.showSaveButton !== false ? 'bg-foreground border-foreground' : 'bg-card border-border'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-background transition-transform ${settings.showSaveButton !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wider leading-tight">Show Save Button</p>
                  <p className="text-sm text-muted-foreground font-thermal mt-1">
                    Show the Save button on the Ready to Print screen. Turn off to prevent guests from saving receipt images to their device.
                  </p>
                </div>
              </label>
            </div>

            {/* Frame Options */}
            <div className="space-y-3">
              <div>
                <label className="font-bold uppercase tracking-wider block">Frame Options</label>
                <p className="text-sm text-muted-foreground font-thermal mt-1">
                  Choose which layouts guests can pick. Uncheck all but one to skip the selection screen entirely.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { count: 1 as FrameCount, label: '1 Photo',  sub: 'Full portrait'  },
                  { count: 2 as FrameCount, label: '2 Photos', sub: 'Double strip'   },
                  { count: 3 as FrameCount, label: '3 Photos', sub: 'Triple strip'   },
                  { count: 4 as FrameCount, label: '4 Photos', sub: '2 × 2 grid'     },
                ]).map(({ count, label, sub }) => {
                  const isChecked = enabledFrameCounts.includes(count);
                  return (
                    <label
                      key={count}
                      className={`flex items-center gap-3 p-4 border-2 cursor-pointer transition-colors select-none ${
                        isChecked ? 'border-foreground bg-foreground/5' : 'border-border bg-card hover:border-foreground/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const next = isChecked
                            ? enabledFrameCounts.filter(c => c !== count)
                            : [...enabledFrameCounts, count].sort((a, b) => a - b) as FrameCount[];
                          if (next.length === 0) {
                            toast({ title: 'At least one frame option must stay enabled', variant: 'destructive' });
                            return;
                          }
                          setEnabledFrameCounts(next);
                          saveSettings({ enabledFrameCounts: next });
                        }}
                        className="w-5 h-5 accent-foreground shrink-0"
                      />
                      <div>
                        <p className="font-bold uppercase text-sm tracking-wide leading-tight">{label}</p>
                        <p className="font-thermal text-xs text-muted-foreground">{sub}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {enabledFrameCounts.length === 1 && (
                <p className="text-sm font-thermal text-muted-foreground border border-border bg-card p-3">
                  Only one option is enabled — guests will skip the frame selection screen and go straight to capture.
                </p>
              )}
            </div>
          </div>
        </section>

      </div>
      </main>
    </div>
  );
}
