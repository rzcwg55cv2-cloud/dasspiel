import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

/**
 * Erzeugt beim Build einen Service Worker (sw.js), der sämtliche Dateien der App
 * vorab zwischenspeichert. Danach funktioniert die App vollständig offline.
 *
 * Bewusst ohne zusätzliche Abhängigkeit: Die Liste der Dateien stammt direkt aus
 * dem Vite-Bundle und dem public-Ordner.
 */
export function serviceWorker(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'das-spiel:service-worker',
    apply: 'build',
    enforce: 'post',
    configResolved(resolved) {
      config = resolved;
    },
    generateBundle(_options, bundle) {
      const hash = createHash('sha256');
      const files = new Set<string>(['./', 'index.html']);

      for (const [fileName, output] of Object.entries(bundle)) {
        if (fileName.endsWith('.map')) continue;
        files.add(fileName);
        hash.update(fileName);
        if (output.type === 'asset') hash.update(output.source);
      }

      for (const file of listFiles(config.publicDir)) {
        const fileName = relative(config.publicDir, file).split(sep).join('/');
        files.add(fileName);
        hash.update(fileName);
        hash.update(readFileSync(file));
      }

      const version = hash.digest('hex').slice(0, 12);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: renderServiceWorker(version, [...files].sort()),
      });
    },
  };
}

function listFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

function renderServiceWorker(version: string, files: string[]): string {
  return `/* Das Spiel – Service Worker (automatisch erzeugt) */
const CACHE = 'das-spiel-${version}';
const FILES = ${JSON.stringify(files, null, 2)};

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
`;
}
