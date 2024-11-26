const cacheName = 'ChatAi';
const assets = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  // Weitere Ressourcen hinzufügen
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});