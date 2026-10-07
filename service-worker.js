const CACHE_NAME = 'intergalactique-pwa-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './game-state.js',
  './network-engine.js',
  './rules.js',
  './renderer.js',
  './ai.js',
  './app.js',
  './logo-ja.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
