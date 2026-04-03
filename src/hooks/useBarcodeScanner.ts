import { useEffect } from 'react';

export const useBarcodeScanner = (onScan: (barcode: string) => void) => {
  useEffect(() => {
    let barcode = '';
    let timer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing within an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'Enter') {
        if (barcode.length > 3) {
          onScan(barcode);
        }
        barcode = '';
        return;
      }

      if (e.key !== 'Shift') {
        barcode += e.key;
      }

      // Barcode scanners are fast. If there's a > 50ms pause, it's probably human typing.
      clearTimeout(timer);
      timer = setTimeout(() => {
        barcode = '';
      }, 50); 
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);
};
