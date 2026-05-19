// ── Improvement 3: Session Frequency Weighting ────────────
// Tracks which products vendor uses most this session
// Boosts matching score for frequently-spoken products
// Also tracks community corrections across sessions

const SESSION_KEY = "dk_voice_session"
const CORRECTIONS_KEY = "dk_voice_corrections"
const MAX_SESSION_AGE_MS = 8 * 60 * 60 * 1000 // 8 hours

// ── Session frequency map: productId → count ─────────────
let _sessionMap = null

function getSession() {
  if (_sessionMap) return _sessionMap
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) { _sessionMap = {}; return _sessionMap }
    const { timestamp, map } = JSON.parse(raw)
    // Reset if session is stale (> 8 hours)
    if (Date.now() - timestamp > MAX_SESSION_AGE_MS) {
      _sessionMap = {}
    } else {
      _sessionMap = map || {}
    }
  } catch { _sessionMap = {} }
  return _sessionMap
}

function saveSession() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      timestamp: Date.now(),
      map: _sessionMap,
    }))
  } catch {}
}

// Record that a product was used this session
export function recordProductUse(productId, productName) {
  const s = getSession()
  const key = productId || productName?.toLowerCase()
  if (!key) return
  s[key] = (s[key] || 0) + 1
  saveSession()
}

// Get frequency boost for a product (0–30 extra score points)
export function getFrequencyBoost(productId, productName) {
  const s = getSession()
  const key = productId || productName?.toLowerCase()
  if (!key) return 0
  const count = s[key] || 0
  return Math.min(30, count * 8) // max 30 points after ~4 uses
}

// Get top N most-used products this session
export function getTopProducts(products, n = 5) {
  const s = getSession()
  return products
    .map(p => ({ ...p, freq: s[p.id] || s[p.name?.toLowerCase()] || 0 }))
    .filter(p => p.freq > 0)
    .sort((a, b) => b.freq - a.freq)
    .slice(0, n)
}

// ── Improvement 6: Community Corrections ─────────────────
// Stores vendor's manual corrections: "what I said" → "what I meant"

function getCorrections() {
  try { return JSON.parse(localStorage.getItem(CORRECTIONS_KEY) || "{}") }
  catch { return {} }
}

function saveCorrections(c) {
  try { localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(c)) } catch {}
}

// Record a correction: "amoool" was corrected to "Amul Milk 500ml"
export function recordCorrection(spokenText, correctProductName) {
  const c = getCorrections()
  const key = spokenText.toLowerCase().trim()
  c[key] = {
    product: correctProductName,
    count: (c[key]?.count || 0) + 1,
    lastUsed: Date.now(),
  }
  saveCorrections(c)
}

// Check if a correction exists for spoken text
export function findCorrection(spokenText) {
  const c = getCorrections()
  const key = spokenText.toLowerCase().trim()

  // Exact match
  if (c[key]?.count >= 1) return c[key].product

  // Partial match — any correction phrase contained in spoken text
  for (const [phrase, data] of Object.entries(c)) {
    if (key.includes(phrase) && data.count >= 2) return data.product
  }

  return null
}

// Get all corrections (for display in settings)
export function getAllCorrections() {
  return getCorrections()
}

// Clear old/wrong corrections
export function deleteCorrection(spokenText) {
  const c = getCorrections()
  delete c[spokenText.toLowerCase().trim()]
  saveCorrections(c)
}
