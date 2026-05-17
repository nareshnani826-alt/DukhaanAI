// DukaanAI Service Worker — offline support + background sync
const CACHE    = "dukaanai-v2"
const STATIC   = ["/", "/index.html", "/manifest.json", "/icon-192.png", "/icon-512.png"]
const API_HOST = self.location.hostname === "localhost"
  ? "http://localhost:8000"
  : "https://web-production-0dbe4.up.railway.app"

// Install — cache shell
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {}))
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch strategy:
// - API calls: network first, queue if offline
// - Static assets: cache first, network fallback
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url)
  const isAPI = url.hostname.includes("railway.app") ||
                (url.hostname === "localhost" && url.port === "8000")

  if (isAPI) {
    // API — network only (GET), queue offline writes (POST/PUT/PATCH/DELETE)
    if (e.request.method !== "GET") {
      e.respondWith(
        fetch(e.request.clone()).catch(async () => {
          // Queue failed write for later sync
          await queueRequest(e.request.clone())
          return new Response(JSON.stringify({
            offline: true,
            message: "Saved offline — will sync when online"
          }), { headers:{ "Content-Type":"application/json" } })
        })
      )
    }
    return
  }

  // Static assets — cache first
  if (e.request.method !== "GET") return
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      }).catch(() => cached || caches.match("/index.html"))
      return cached || network
    })
  )
})

// Queue offline requests to IndexedDB
async function queueRequest(request) {
  const body = await request.text().catch(() => "")
  const item = {
    id:      Date.now(),
    url:     request.url,
    method:  request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body,
    timestamp: new Date().toISOString()
  }
  const db = await openDB()
  const tx = db.transaction("queue", "readwrite")
  tx.objectStore("queue").add(item)
  await tx.complete
}

// Open IndexedDB
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open("dukaanai-offline", 1)
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore("queue", { keyPath:"id" })
    }
    req.onsuccess = e => res(e.target.result)
    req.onerror   = e => rej(e.target.error)
  })
}

// Sync queued requests when online
self.addEventListener("sync", e => {
  if (e.tag === "sync-queue") e.waitUntil(syncQueue())
})

async function syncQueue() {
  const db    = await openDB()
  const tx    = db.transaction("queue", "readwrite")
  const store = tx.objectStore("queue")
  const items = await new Promise((res, rej) => {
    const req = store.getAll()
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })

  for (const item of items) {
    try {
      await fetch(item.url, {
        method:  item.method,
        headers: item.headers,
        body:    item.body || undefined,
      })
      // Remove from queue on success
      const delTx = db.transaction("queue", "readwrite")
      delTx.objectStore("queue").delete(item.id)
    } catch {}
  }

  // Notify clients that sync is done
  const clients = await self.clients.matchAll()
  clients.forEach(c => c.postMessage({ type:"SYNC_COMPLETE" }))
}

// Listen for online event from page to trigger sync
self.addEventListener("message", e => {
  if (e.data === "SYNC_NOW") syncQueue()
})
