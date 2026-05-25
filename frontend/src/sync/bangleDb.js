// Bangle Store offline-first layer.
// Strategy: always try the server; on failure serve from localStorage cache.
// Offline sales go into a queue and auto-sync when the network returns.

import { getToken } from "./db"

const CACHE_KEY = "dk_bangle"
const QUEUE_KEY = "dk_bangle_queue"
const API       = import.meta.env.VITE_API_URL ?? ""

// ── Storage helpers ────────────────────────────────────────────
function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {} }
  catch { return {} }
}
function writeCache(d) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)) } catch {}
}
function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [] }
  catch { return [] }
}
function writeQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) } catch {}
}
function enqueue(op, payload) {
  const q = readQueue()
  q.push({ id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
           op, payload, createdAt: new Date().toISOString() })
  writeQueue(q)
}

// ── API helper ─────────────────────────────────────────────────
function authHeaders() {
  const t = getToken()
  return t
    ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` }
    : { "Content-Type": "application/json" }
}
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, { headers: authHeaders(), ...opts })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.detail || "HTTP " + res.status)
  }
  return res.json()
}

// Multipart upload — do NOT set Content-Type; browser fills in the boundary
async function apiUpload(path, formData) {
  const t = getToken()
  const res = await fetch(API + path, {
    method: "POST",
    headers: t ? { Authorization: `Bearer ${t}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.detail || "Upload failed")
  }
  return res.json()
}

// ── Products ───────────────────────────────────────────────────
export const BangleProducts = {
  async list() {
    try {
      const data = await apiFetch("/bangle/products")
      const c = readCache()
      c.products = data
      c.productsSyncedAt = new Date().toISOString()
      writeCache(c)
      return data
    } catch {
      // Network down → serve from cache
      return readCache().products || []
    }
  },

  // Optimistically deduct stock in the local cache so the UI stays correct
  // while offline. The server will deduct authoritatively on sync.
  deductStock(variantId, pieces) {
    const c = readCache()
    for (const p of (c.products || [])) {
      const v = (p.variants || []).find(v => v.id === variantId)
      if (v) { v.stock = Math.max(0, (v.stock || 0) - pieces); break }
    }
    writeCache(c)
  },

  cached() { return readCache().products || [] },
  syncedAt() { return readCache().productsSyncedAt || null },

  async uploadImage(productId, file) {
    const fd = new FormData()
    fd.append("file", file)
    const data = await apiUpload(`/bangle/products/${productId}/image`, fd)
    const c = readCache()
    const p = (c.products || []).find(p => p.id === productId)
    if (p) { p.image_url = data.image_url; writeCache(c) }
    return data.image_url
  },

  async removeImage(productId) {
    await apiFetch(`/bangle/products/${productId}/image`, { method: "DELETE" })
    const c = readCache()
    const p = (c.products || []).find(p => p.id === productId)
    if (p) { p.image_url = null; writeCache(c) }
  },

  async autoImage(productId) {
    const data = await apiFetch(`/bangle/products/${productId}/auto-image`, { method: "POST" })
    const c = readCache()
    const p = (c.products || []).find(p => p.id === productId)
    if (p) { p.image_url = data.image_url; writeCache(c) }
    return data.image_url
  },
}

// ── Sales ──────────────────────────────────────────────────────
export const BangleSales = {
  async create(payload) {
    if (navigator.onLine) {
      try {
        const sale = await apiFetch("/bangle/sales", {
          method: "POST",
          body: JSON.stringify(payload),
        })
        // Keep cache stock consistent with the server deduction
        for (const item of (payload.items || []))
          BangleProducts.deductStock(item.variant_id, item.pieces)
        return sale
      } catch (e) {
        // Distinguish server-side validation errors (4xx) from network failures
        if (/^HTTP [45]/.test(e.message)) throw e
        // Network failure — fall through to offline path
      }
    }

    // ── Offline path ───────────────────────────────────────────
    const subtotal  = (payload.items || []).reduce((s, i) => s + (i.amount || 0), 0)
    const gstAmount = payload.apply_gst
      ? (payload.items || []).reduce((s, i) => s + i.amount * ((i.gst_percent || 3) / 100), 0)
      : 0

    const offlineSale = {
      id:             `offline-${Date.now()}`,
      items:          payload.items,
      customer_name:  payload.customer_name  || null,
      customer_phone: payload.customer_phone || null,
      payment_mode:   payload.payment_mode   || "cash",
      subtotal:       Math.round(subtotal  * 100) / 100,
      gst_amount:     Math.round(gstAmount * 100) / 100,
      total:          Math.round((subtotal + gstAmount) * 100) / 100,
      created_at:     new Date().toISOString(),
      _offline:       true,
    }

    // Deduct stock locally so billing totals stay accurate
    for (const item of (payload.items || []))
      BangleProducts.deductStock(item.variant_id, item.pieces)

    // Persist offline sale + queue for later sync
    const c = readCache()
    c.offlineSales = [...(c.offlineSales || []), offlineSale]
    writeCache(c)
    enqueue("create_sale", payload)

    return offlineSale
  },

  async todaySummary() {
    try {
      return await apiFetch("/bangle/sales/today")
    } catch {
      // Aggregate offline sales for today
      const c     = readCache()
      const today = new Date().toISOString().slice(0, 10)
      const ts    = (c.offlineSales || []).filter(s => s.created_at?.slice(0, 10) === today)
      return {
        total_revenue: Math.round(ts.reduce((s, x) => s + (x.total || 0), 0) * 100) / 100,
        total_bills:   ts.length,
        total_pieces:  ts.reduce((s, x) =>
          s + (x.items || []).reduce((ps, i) => ps + (i.pieces || 0), 0), 0),
        _offline: true,
      }
    }
  },
}

// ── Sync ───────────────────────────────────────────────────────
export const BangleSync = {
  pendingCount() { return readQueue().length },

  async processQueue() {
    if (!navigator.onLine) return { synced: 0, failed: 0, pending: readQueue().length }
    const q = readQueue()
    if (!q.length) return { synced: 0, failed: 0, pending: 0 }

    let synced = 0, failed = 0
    const remaining = []

    for (const item of q) {
      try {
        if (item.op === "create_sale") {
          await apiFetch("/bangle/sales", {
            method: "POST",
            body: JSON.stringify(item.payload),
          })
        }
        synced++
      } catch {
        remaining.push(item)
        failed++
      }
    }

    writeQueue(remaining)

    // Refresh product cache so stock levels are accurate again
    if (synced > 0) BangleProducts.list().catch(() => {})

    return { synced, failed, pending: remaining.length }
  },

  // Call on app boot and whenever navigator.onLine fires
  async maybeSync() {
    if (!navigator.onLine || !this.pendingCount()) return null
    return this.processQueue()
  },
}

// ── Auto-sync on network restore ───────────────────────────────
if (typeof window !== "undefined") {
  window.addEventListener("online", () => BangleSync.maybeSync())
}
