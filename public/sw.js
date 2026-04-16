// Build date is stamped into CACHE_NAME at build time (in the output, not this source file)
const CACHE_NAME = 'machigai-salad-__BUILD_DATE__'

const PRECACHE_URLS = ['/', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
      )
  )
  self.clients.claim()
})

// Network-first strategy: always try network, fall back to cache when offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  // Don't intercept blob: or data: URLs (used for downloads)
  const url = event.request.url
  if (url.startsWith('blob:') || url.startsWith('data:')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || new Response('Offline', { status: 503 }))
      )
  )
})
