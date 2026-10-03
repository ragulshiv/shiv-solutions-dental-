/*
 * Service worker for the installed app.
 *
 * What it caches: only the app's own code, styles, fonts and icons. Next.js
 * gives those files content-hashed names under /_next/static/, so a cached copy
 * can never be stale. That is what makes a second open feel instant.
 *
 * What it never caches: pages (HTML) and /api/ responses. Those carry patient
 * data and must always come fresh from the server, and must not sit on a shared
 * phone. If the server can't be reached, page loads fall back to /offline.html.
 *
 * Bump VERSION to drop every old cache on the next visit.
 */
const VERSION = 'v2'
const STATIC_CACHE = `chairos-static-${VERSION}`
const SHELL = ['/offline.html', '/icon-192.png', '/icon-512.png', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) => (k.startsWith('chairos-') || k.startsWith('shiv-')) && k !== STATIC_CACHE
            )
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

// Each deploy adds new hashed files and old ones are never requested again, so
// keep the cache bounded: drop the oldest entries past the limit.
const MAX_ENTRIES = 400
async function trimCache(cache) {
  const keys = await cache.keys()
  const excess = keys.length - MAX_ENTRIES
  for (let i = 0; i < excess; i++) {
    if (!SHELL.includes(new URL(keys[i].url).pathname)) await cache.delete(keys[i])
  }
}

function isImmutableAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    /^\/(icon-[\w-]+|apple-touch-icon|favicon-32)\.png$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // Hashed build files and icons: cache first, then network.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) {
          await cache.put(request, response.clone())
          trimCache(cache)
        }
        return response
      })
    )
    return
  }

  // Page loads: always the network (fresh data); the offline page only if it fails.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')))
  }
})
