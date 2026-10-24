// ∞ Infinity Loop — Service Worker
const CACHE = 'il-v12';
const STATIC = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/themes.css',
  '/js/config.js',
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
  if (e.request.url.includes('supabase.co')) {
    e.respondWith(fetch(e.request).catch(() => new Response('[]')));
    return;
  }
  if (e.request.method !== 'GET') return;
  // Спочатку мережа (завжди свіжа версія), кеш — лише коли немає інтернету
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
