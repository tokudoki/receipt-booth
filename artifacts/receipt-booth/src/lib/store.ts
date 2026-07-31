import { useState, useCallback } from 'react';

export type FrameCount = 1 | 2 | 3 | 4;

export type Settings = {
  footerText: string;
  qrCodeUrl: string;
  logoDataUrl: string | null;
  printerName: string | null;
};

export const defaultSettings: Settings = {
  footerText: "Footer Text\nThank You!",
  qrCodeUrl: "https://replit.com",
  logoDataUrl: null,
  printerName: null,
};

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
