import { useState, useCallback } from 'react';

export type FrameCount = 1 | 2 | 3 | 4;

export type Settings = {
  /** Large serif title at the top of every receipt, e.g. "DOKI FEST 2026" */
  headerTitle: string;
  /** Left-side item label in the footer row, e.g. "x1 photo session" */
  itemText: string;
  /** Right-side status label in the footer row, e.g. "pre-order" */
  itemStatus: string;
  /** Optional body text in the footer (shown above "Thank You!") */
  footerText: string;
  qrCodeUrl: string;
  logoDataUrl: string | null;
  /**
   * Full-width header image. When set, replaces the entire header zone
   * (title / ORDER / DATE). Image is drawn at RECEIPT_W; height is
   * determined by the image's own aspect ratio.
   */
  headerImageDataUrl: string | null;
  /**
   * Full-width footer image. When set, replaces the entire footer zone
   * (item row / body text / Thank You). Drawn at RECEIPT_W; height from
   * aspect ratio.
   */
  footerImageDataUrl: string | null;
  printerName: string | null;
  /** IP address of the MUNBYN P905 on the local network, e.g. "192.168.1.42" */
  printerIp: string;
  /**
   * Base URL of the local print bridge.
   * Leave blank to auto-derive from window.location.origin (correct when the
   * iPad opens the app from the bridge itself at http://<mac-ip>:3001).
   * Only set manually if the bridge runs on a different machine.
   */
  bridgeUrl: string;
  /**
   * Optional shared secret matching the SECRET constant in bridge.js.
   * When set, sent as X-Bridge-Token header to authorise print requests.
   * Leave blank if bridge.js has no SECRET configured.
   */
  bridgeSecret: string;
  /**
   * Brightness multiplier applied to each pixel before Floyd-Steinberg
   * dithering. 1.0 = no change; 1.4 = 40% brighter (default — compensates
   * for thermal ink bloom that darkens prints). Range: 0.5–2.0.
   */
  printBrightness: number;
  /**
   * Which frame-count options are shown on the frame selection screen.
   * Defaults to all four. When exactly one value is present the frame
   * selection screen is skipped and that count is used automatically.
   */
  enabledFrameCounts: FrameCount[];
  /**
   * 4-digit PIN required to open Settings from the home screen.
   * Empty string means no PIN is set and Settings opens freely.
   */
  settingsPin: string;
};

export const defaultSettings: Settings = {
  headerTitle: '',
  itemText: '',
  itemStatus: '',
  footerText: '',
  qrCodeUrl: '',
  logoDataUrl: null,
  headerImageDataUrl: null,
  footerImageDataUrl: null,
  printerName: null,
  printerIp: '',
  bridgeUrl: '',
  bridgeSecret: '',
  printBrightness: 1.4,
  enabledFrameCounts: [1, 2, 3, 4],
  settingsPin: '',
};

/**
 * Returns a zero-padded 4-digit order number for the current session.
 * Increments a persistent counter in localStorage; caches the value
 * in sessionStorage so the same number is used throughout one session.
 */
export function getSessionOrderNumber(): string {
  const SESSION_KEY = 'receipt-booth-session-order';
  const COUNTER_KEY = 'receipt-booth-order-counter';
  try {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) return cached;
    const prev = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10);
    const next  = (prev % 9999) + 1;
    const padded = String(next).padStart(4, '0');
    localStorage.setItem(COUNTER_KEY, String(next));
    sessionStorage.setItem(SESSION_KEY, padded);
    return padded;
  } catch {
    return '0001';
  }
}

/** Returns today's date formatted as "AUGUST 2, 2026" (uppercase). */
export function getReceiptDateString(): string {
  try {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
  } catch {
    return new Date().toDateString().toUpperCase();
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem('receipt-booth-settings');
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return defaultSettings;
  });

  const saveSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      try {
        localStorage.setItem('receipt-booth-settings', JSON.stringify(merged));
      } catch (e) {
        console.error('Failed to save settings', e);
      }
      return merged;
    });
  }, []);

  return { settings, saveSettings };
}

export function useLastReceipt() {
  const [lastReceipt, setLastReceipt] = useState<string | null>(() => {
    try {
      return localStorage.getItem('receipt-booth-last-receipt');
    } catch (e) {
      return null;
    }
  });

  const saveLastReceipt = useCallback((dataUrl: string) => {
    setLastReceipt(dataUrl);
    try {
      localStorage.setItem('receipt-booth-last-receipt', dataUrl);
    } catch (e) {
      console.error('Failed to save last receipt', e);
    }
  }, []);

  return { lastReceipt, saveLastReceipt };
}

export function useFrameSelection() {
  const [frameCount, setFrameCount] = useState<FrameCount>(() => {
    try {
      const stored = sessionStorage.getItem('receipt-booth-frame-count');
      const n = stored ? parseInt(stored, 10) : 4;
      return ([1, 2, 3, 4].includes(n) ? n : 4) as FrameCount;
    } catch {
      return 4;
    }
  });

  const saveFrameCount = useCallback((count: FrameCount) => {
    setFrameCount(count);
    try {
      sessionStorage.setItem('receipt-booth-frame-count', String(count));
    } catch {}
  }, []);

  return { frameCount, saveFrameCount };
}

export function useCapturedPhotos() {
  const [photos, setPhotos] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('receipt-booth-photos');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const savePhotos = useCallback((newPhotos: string[]) => {
    setPhotos(newPhotos);
    try {
      sessionStorage.setItem('receipt-booth-photos', JSON.stringify(newPhotos));
    } catch (e) {
      console.error('Failed to save photos', e);
    }
  }, []);
  
  const clearPhotos = useCallback(() => {
    setPhotos([]);
    sessionStorage.removeItem('receipt-booth-photos');
  }, []);

  return { photos, savePhotos, clearPhotos };
}
