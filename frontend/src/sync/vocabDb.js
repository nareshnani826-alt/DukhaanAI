/**
 * Global Vocabulary Store — central repository shared across ALL users.
 * Architecture:
 *   1. localStorage cache  — instant lookups, no network latency
 *   2. Backend API         — `/vocab/*` endpoints backed by Supabase global_vocab table
 *   3. Write-through       — local write is immediate; API write is fire-and-forget
 *   4. Preload on boot     — top-100 popular aliases fetched once per session
 */

const API     = import.meta.env.VITE_API_URL ?? ""
const CACHE_KEY  = "dukaanVocabCache_v2"   // { term: { product_name, hits, confidence, ts } }
const PRELOADED  = "dukaanVocabPreloaded"  // sessionStorage flag

// ── Cache helpers ─────────────────────────────────────────────
function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") } catch { return {} }
}
function saveCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch {}
}
const ENTRY_TTL = 12 * 60 * 60 * 1000  // 12 hours before re-validating from API

function cacheSet(term, entry) {
  const cache = loadCache()
  cache[term.toLowerCase().trim()] = { ...entry, ts: Date.now() }
  saveCache(cache)
}

function cacheGet(term) {
  const c = loadCache()[term.toLowerCase().trim()]
  if (!c) return null
  if (Date.now() - (c.ts || 0) > ENTRY_TTL) return null  // stale
  return c
}

// ── API helpers (fire-and-forget on writes) ───────────────────
function getToken() {
  return localStorage.getItem("dk_access") || sessionStorage.getItem("dk_access") || null
}

async function apiFetch(path, body) {
  const headers = { "Content-Type": "application/json" }
  const token = getToken()
  if (token) headers["Authorization"] = "Bearer " + token
  const res = await fetch(`${API}${path}`, { method: "POST", headers, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

// ── Preload popular vocab into cache (once per browser session) ──
export async function preloadVocab(storeType = "kirana") {
  try {
    const flag = `${PRELOADED}_${storeType}`
    if (sessionStorage.getItem(flag)) return   // already loaded this session
    sessionStorage.setItem(flag, "1")

    const res = await fetch(`${API}/vocab/popular?store_type=${storeType}&limit=200`)
    if (!res.ok) return
    const rows = await res.json()
    if (!Array.isArray(rows)) return

    const cache = loadCache()
    rows.forEach(r => {
      if (r.term && r.product_name) {
        cache[r.term] = { product_name: r.product_name, hits: r.hits, confidence: r.confidence, ts: Date.now() }
      }
    })
    saveCache(cache)
  } catch { /* silent — offline or API down */ }
}

// ── Public API ────────────────────────────────────────────────
export const VocabDB = {

  /**
   * Look up multiple terms.
   * Fast path: cache hit.
   * Slow path: batch API call for cache-miss terms, then cache results.
   */
  async lookup(terms, storeType = "kirana") {
    if (!terms || terms.length === 0) return []

    const results = []
    const missing = []

    terms.forEach(t => {
      const cached = cacheGet(t)
      if (cached) results.push({ term: t.toLowerCase(), ...cached })
      else missing.push(t.toLowerCase().trim())
    })

    if (missing.length > 0) {
      try {
        const rows = await apiFetch("/vocab/lookup", { terms: missing, store_type: storeType })
        if (Array.isArray(rows)) {
          rows.forEach(r => {
            cacheSet(r.term, r)
            results.push(r)
          })
        }
      } catch { /* offline — return only cached results */ }
    }

    return results
  },

  /**
   * Save a term → product mapping.
   * Writes to cache immediately, then syncs to central API in background.
   */
  async save(term, productId, productName, autoLearned = false, storeType = "kirana", lang = "te-IN") {
    const key = term.toLowerCase().trim()
    if (!key || !productName) return

    // 1. Write to local cache instantly
    const existing = cacheGet(key) || {}
    cacheSet(key, {
      product_name: productName,
      hits:         (existing.hits || 0) + 1,
      confidence:   autoLearned ? Math.max(existing.confidence || 0, 1) : 10,
    })

    // 2. Sync to central API (fire and forget — don't await, don't block UI)
    apiFetch("/vocab/teach", {
      term,
      product_name: productName,
      lang,
      store_type:   storeType,
      auto_learned: autoLearned,
    }).catch(() => { /* offline — local cache still has it */ })
  },

  /** Return all cached entries (for a settings/review page). */
  async list() {
    const cache = loadCache()
    return Object.entries(cache)
      .map(([term, v]) => ({ term, ...v }))
      .sort((a, b) => (b.hits || 0) - (a.hits || 0))
  },

  /** Remove a term from local cache (server entry remains but won't surface until re-confirmed). */
  async remove(term) {
    const cache = loadCache()
    delete cache[term.toLowerCase().trim()]
    saveCache(cache)
  },

  async count() { return Object.keys(loadCache()).length },
}
