/** Registriert den beim Build erzeugten Service Worker für den Offline-Betrieb. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Ohne Service Worker funktioniert die App weiterhin, nur nicht offline.
    });
  });
}
