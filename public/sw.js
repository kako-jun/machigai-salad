// Build date is stamped into CACHE_NAME at build time (in the output, not this source file)
const CACHE_NAME = 'machigai-salad-__BUILD_DATE__'

const PRECACHE_URLS = ['/', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
  // No unconditional self.skipWaiting() here: on an update (a previous SW is
  // already controlling open tabs), this worker should sit in `waiting`
  // until the client explicitly approves via postMessage (see below). This
  // lets the client defer taking over until the user is safely idle instead
  // of forcing a mid-task reload. First-time installs (no existing
  // controller) still activate immediately regardless — skipWaiting() only
  // affects the update case.
})

// Client-driven activation: the client (ServiceWorkerRegister) posts this
// once it has confirmed the user isn't mid-task, so the new SW can take
// over and the client can reload on the resulting controllerchange.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
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
