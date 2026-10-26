const CACHE = "dukaanai-v5"
const STATIC = ["/", "/index.html", "/manifest.json"]

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})))
  self.skipWaiting()
})

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
  self.clients.claim()
})

self.addEventListener("fetch", e => {
  // Never intercept API calls — only cache the app's own static files
  const url = new URL(e.request.url)
  if (url.origin !== self.location.origin) return
  if (e.request.method !== "GET") return
  // App download: always fetch fresh (a cached copy would hide new releases)
  if (url.pathname.startsWith("/download/")) return

  // Pages (index.html): network first, so a new deploy shows on the next visit;
  // the cached copy is only the offline fallback
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put("/index.html", clone))
        }
        return res
      }).catch(() => caches.match("/index.html").then(r => r || caches.match("/")))
    )
    return
  }

  // Hashed static assets never change — cache first
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
    ).catch(() => caches.match("/index.html"))
  )
})