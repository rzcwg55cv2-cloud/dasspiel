import { useEffect } from 'react';

/**
 * Hält den Bildschirm während des Spiels eingeschaltet (Screen Wake Lock API).
 * Browser geben die Sperre frei, sobald die Seite unsichtbar wird – sie wird dann
 * bei Rückkehr erneut angefordert. Ohne Browserunterstützung passiert nichts.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let pending = false;
    let disposed = false;

    const request = async () => {
      if (disposed || pending || document.visibilityState !== 'visible') return;
      if (sentinel && !sentinel.released) return;
      pending = true;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (disposed) await lock.release();
        else sentinel = lock;
      } catch {
        // z. B. Energiesparmodus oder fehlende Benutzeraktion – beim nächsten Antippen erneut versuchen.
      } finally {
        pending = false;
      }
    };

    const onActivity = () => void request();
    void request();
    document.addEventListener('visibilitychange', onActivity);
    window.addEventListener('pointerdown', onActivity, { passive: true });

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onActivity);
      window.removeEventListener('pointerdown', onActivity);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
