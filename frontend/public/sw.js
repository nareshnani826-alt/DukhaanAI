const CACHE = "dukaanai-v2"
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
  // Never intercept API calls
  const url = new URL(e.request.url)
  if (url.hostname.includes("railway.app") || url.hostname.includes("supabase.co")) return
  if (e.request.method !== "GET") return

  // Cache static assets only
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