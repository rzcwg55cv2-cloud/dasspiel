/* Das Bierspiel – Service Worker (automatisch erzeugt) */
const CACHE = 'das-spiel-0b202f8e16e0';
const FILES = [
  "./",
  "assets/index-B9eEf3x7.js",
  "assets/index-CN8MAAXS.css",
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
    // Mit Netz immer die neueste Version laden (sonst läge man nach einem Update eine Version zurück),
    // ohne Netz bzw. nach 3 Sekunden die gespeicherte.
    const indexUrl = new URL('index.html', self.registration.scope).href;
    const cached = () => caches.match(indexUrl, { cacheName: CACHE });
    const network = fetch(request, { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error('offline');
      return response;
    });
    const timeout = new Promise((resolve) => setTimeout(resolve, 3000)).then(cached);
    event.respondWith(
      Promise.race([network, timeout])
        .then((response) => response || network)
        .catch(() => cached().then((response) => response || network)),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { cacheName: CACHE, ignoreSearch: true }).then((cached) => cached || fetch(request)),
  );
});
