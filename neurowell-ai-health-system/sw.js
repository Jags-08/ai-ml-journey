/**
 * NEUROWELL — sw.js
 * Progressive Web App Service Worker
 * Enables offline functionality
 */

const CACHE_NAME  = 'neurowell-v1.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/chat.html',
  '/reports.html',
  '/manifest.json',
  '/css/main.css',
  '/css/dashboard.css',
  '/css/chat.css',
  '/js/storage.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/patterns.js',
  '/js/voice.js',
  '/js/pdf.js',
  '/js/dashboard.js',
  '/js/chat.js',
];

/* ── Install: cache static assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

/* ── Activate: clean old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first for assets, network-first for API ── */
self.addEventListener('fetch', event => {
  const { url, method } = event.request;

  // API calls: always network
  if (url.includes('anthropic.com') || url.includes('api.')) {
    return;
  }

  // CDN resources: network with cache fallback
  if (url.includes('cdnjs.cloudflare.com') || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
      ).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // App pages: cache-first
  if (method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => caches.match('/index.html'));
      })
    );
  }
});

/* ── Background Sync (future: sync health data) ── */
self.addEventListener('sync', event => {
  if (event.tag === 'health-sync') {
    console.log('[SW] Background health data sync');
  }
});

/* ── Push Notifications (future) ── */
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'NeuroWell', body: 'Health reminder!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/assets/icons/icon-192.png',
      badge:   '/assets/icons/icon-192.png',
      tag:     'neurowell-notification',
      renotify: true,
      data:    { url: data.url || '/dashboard.html' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/dashboard.html'));
});
