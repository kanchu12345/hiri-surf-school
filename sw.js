const CACHE_NAME = 'hiri-surf-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './surf-guide.html',
  './style.css',
  './app.js',
  './firebase-init.js',
  './manifest.json',
  './gallery_list.json',
  './images/hiri.jpg',
  './images/20702.jpg.jpeg',
  './images/69546.jpg.jpeg',
  './images/69606.jpg.jpeg',
  './images/69535.jpg.jpeg',
  './images/20713.jpg.jpeg',
  './images/20681.jpg.jpeg',
  './images/69528.jpg.jpeg'
];

// Install: Cache critical static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA caching non-critical warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean up older cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Stale-while-revalidate for super fast mobile loads with offline fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET or chrome-extension requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
