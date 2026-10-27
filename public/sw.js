/**
 * Service Worker — PetaLoka
 *
 * Strategi:
 *  - App shell (/)                 : network-first (HTML selalu seversi asetnya)
 *  - Aset build statis             : network-first + cache fallback
 *  - GeoJSON /data/...            : stash-first sekali (simpan luring) + revalidate
 *  - Navigasi halaman             : network-first, fallback ke shell cache
 *  - /api/* (Peta Vektor Server): selalu jaringan (tidak di-cache)
 */

const VERSION = 'petaloka-v7';
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE = `${VERSION}-data`;
const STATIC_CACHE = `${VERSION}-static`;

const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/sidebar-logo.png',
  '/icons/favicon-32.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => Promise.allSettled(SHELL_ASSETS.map((asset) => cache.add(asset))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                (key.startsWith('petaloka-') || key.startsWith('sig-peta-hd-')) &&
                !key.startsWith(VERSION),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // tile basemap: biarkan jaringan
  if (url.pathname.startsWith('/api/')) return;   // API: selalu jaringan

  /* Navigasi: network-first dengan fallback shell luring */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/', clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/', { ignoreSearch: true });
          return (
            cached ||
            new Response('PetaLoka sedang luring.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }),
    );
    return;
  }

  /* Data GeoJSON: stash-first + revalidate beberapa hari */
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => null);

        if (cached) return cached;
        const res = await network;
        return res || new Response('Data luring tidak tersedia.', { status: 503 });
      }),
    );
    return;
  }

  /* Selalu cek deployment aktif agar HTML dan CSS tidak beda versi. */
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          const cached = await cache.match(request);
          return cached || new Response('Aset tidak tersedia.', { status: 503 });
        }
      }),
    );
    return;
  }
});
