// Infinity Loop Service Worker v3
const CACHE = 'il-v3';
const STATIC = [
  '/img/bg-cthulhu.png',
  '/img/bg-classic.jpg',
  '/img/bg-cyberpunk.jpg',
  '/img/bg-horror.jpg',
  '/img/bg-anime.jpg',
  '/img/bg-samurai.jpg',
  '/img/bg-anime2.jpg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first for everything except images
self.addEventListener('fetch', e => {
  if (e.request.url.match(/\.(png|jpg|jpeg|webp)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
    return;
  }
  // Always network first for HTML/JS/CSS
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
