/**
 * App-shell service worker.
 *
 * Caches only the same-origin app shell (HTML, hashed JS/CSS/font/icon assets)
 * so the editor loads offline. It must NEVER cache:
 *  - project media: served from blob: URLs, which never reach this handler
 *  - Jamendo (or any cross-origin) requests: search/preview/download stay
 *    network-only and fail gracefully offline
 */
const CACHE_NAME = 'slideshow-shell-v1'
const SHELL_URL = '/'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(SHELL_URL)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  )
})

async function networkFirstShell(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(SHELL_URL, response.clone())
    return response
  } catch {
    const cached = await cache.match(SHELL_URL)
    if (cached) return cached
    throw new Error('offline and app shell not cached')
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => undefined)
  if (cached) return cached
  const fresh = await refresh
  if (fresh) return fresh
  throw new Error('offline and asset not cached')
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Cross-origin (e.g. Jamendo) and non-http schemes bypass the cache entirely.
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstShell(request))
    return
  }
  event.respondWith(staleWhileRevalidate(request))
})
