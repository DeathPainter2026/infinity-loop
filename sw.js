// ∞ Infinity Loop — Service Worker
const CACHE = 'il-v2';
const STATIC = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/themes.css',
  '/js/db.js',
  '/js/data.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/analytics.js',
  '/js/app.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network first for API calls, cache first for static assets
  if (e.request.url.includes('supabase.co')) {
    e.respondWith(fetch(e.request).catch(() => new Response('[]')));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
