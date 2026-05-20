/* ═══════════════════════════════════════════
   sw.js — Guessdom 2  |  cache-first strategy
   Deploy URL: https://kkboi2000.github.io/guessdom2.0/
   Bump CACHE_VERSION on every deploy to force refresh
════════════════════════════════════════════ */

const CACHE_VERSION = 'guessdom2-v2';
const BASE = '/guessdom2.0';

const PRECACHE = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,

  /* ── Styles ── */
  `${BASE}/styles/base.css`,
  `${BASE}/styles/settings.css`,
  `${BASE}/styles/menu.css`,
  `${BASE}/styles/setup.css`,
  `${BASE}/styles/game.css`,

  /* ── Scripts ── */
  `${BASE}/src/main.js`,
  `${BASE}/src/settings.js`,
  `${BASE}/src/audio.js`,
  `${BASE}/src/game.js`,
  `${BASE}/src/ui.js`,
  `${BASE}/src/data/cards.js`,
  `${BASE}/src/i18n/en.js`,
  `${BASE}/src/i18n/th.js`,
  `${BASE}/src/i18n/jp.js`,

  /* ── Icons (PWA install requirement) ── */
  `${BASE}/assets/icons/icon-192.png`,
  `${BASE}/assets/icons/icon-512.png`,
  `${BASE}/assets/icons/icon-512-maskable.png`,

  /* ── Backgrounds ── */
  `${BASE}/assets/backgrounds/menu-portrait.gif`,
  `${BASE}/assets/backgrounds/menu-landscape.gif`,
  `${BASE}/assets/backgrounds/boardsetup-portrait.gif`,
  `${BASE}/assets/backgrounds/boardsetup-landscape.gif`,
  `${BASE}/assets/backgrounds/game-portrait.gif`,
  `${BASE}/assets/backgrounds/game-landscape.gif`,

  /* ── Card back ── */
  `${BASE}/assets/cards/back.webp`,

  /* ── Sounds ── */
  // `${BASE}/assets/sounds/flip.mp3`,
  // `${BASE}/assets/sounds/lock.mp3`,
  // `${BASE}/assets/sounds/reveal.mp3`,

  /* ── BGM ── */
  // `${BASE}/assets/music/bgm.mp3`,
];

/* ─────────────────────────────────────────
   INSTALL — precache everything above
──────────────────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

/* ─────────────────────────────────────────
   ACTIVATE — delete old caches
──────────────────────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())  // take control without reload
  );
});

/* ─────────────────────────────────────────
   FETCH — cache-first, network fallback
   Card images use a separate runtime cache
   so they don't block the precache install
──────────────────────────────────────────── */
const CARD_CACHE = 'guessdom2-cards-v1';

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Card images → runtime cache (lazy, cache-first)
  if (url.pathname.includes('/assets/cards/') && !url.pathname.endsWith('back.webp')) {
    event.respondWith(runtimeCacheFirst(event.request, CARD_CACHE));
    return;
  }

  // Everything else → precache-first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      });
    })
  );
});

/* ─────────────────────────────────────────
   HELPER — runtime cache-first
──────────────────────────────────────────── */
async function runtimeCacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.status === 200) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}
