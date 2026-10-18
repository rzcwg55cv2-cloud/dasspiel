/* Das Bierspiel – Service Worker (automatisch erzeugt) */
const CACHE = 'das-spiel-c9c226a1dea7';
const FILES = [
  "./",
  "assets/index--0SFG2iI.js",
  "assets/index-BwsrXvtA.css",
  "assets/inter-latin-ext-wght-normal-DO1Apj_S.woff2",
  "assets/inter-latin-wght-normal-Dx4kXJAl.woff2",
  "assets/schlemmersonntag-uWRzkULO.mp3",
  "assets/wappen-Cnc3KLHE.png",
  "icons/apple-touch-icon-v3.png",
  "icons/icon-192-v3.png",
  "icons/icon-512-v3.png",
  "icons/icon-maskable-512-v3.png",
  "icons/icon-maskable-v3.svg",
  "icons/icon-v3.svg",
  "index.html",
  "manifest.webmanifest"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('das-spiel-') && key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    const indexUrl = new URL('index.html', self.registration.scope).href;
    event.respondWith(
      caches.match(indexUrl, { cacheName: CACHE }).then((cached) => cached || fetch(request)),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { cacheName: CACHE, ignoreSearch: true }).then((cached) => cached || fetch(request)),
  );
});
