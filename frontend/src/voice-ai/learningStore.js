const STORE_KEY   = "dk_learning_store"
const PHONETIC_KEY = "dk_learning_phonetic"

export const AUTO_CONFIRM_THRESHOLD = 3

// ── Soundex (inline — avoids circular dep with phonetic.js) ──
function soundexKey(text) {
  const s = text.toLowerCase().replace(/[^a-z]/g, "")
  if (!s) return "0000"
  const map = { b:1,f:1,p:1,v:1, c:2,g:2,j:2,k:2,q:2,s:2,x:2,z:2, d:3,t:3, l:4, m:5,n:5, r:6 }
  let code = s[0].toUpperCase()
  let prev  = map[s[0]] || 0
  for (let i = 1; i < s.length && code.length < 4; i++) {
    const c = map[s[i]] || 0
    if (c && c !== prev) { code += c; prev = c }
    else if (!c) prev = 0
  }
  return code.padEnd(4, "0")
}

function normalize(text) {
  return text.toLowerCase().trim().replace(/\s+/g, " ")
}

function load(key) {
  try { return JSON.parse(localStorage.getItem(key) || "{}") } catch { return {} }
}

function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

// ── Write ─────────────────────────────────────────────────────
export function learnCorrection(spoken, selected) {
  const store = load(STORE_KEY)
  const pIdx  = load(PHONETIC_KEY)

  const exactKey    = normalize(spoken)
  const phoneticKey = soundexKey(spoken)

  // Store exact correction vote
  if (!store[exactKey]) store[exactKey] = {}
  store[exactKey][selected] = (store[exactKey][selected] || 0) + 1
  save(STORE_KEY, store)

  // Update phonetic cluster index: phoneticKey → [exactKey, ...]
  if (!pIdx[phoneticKey]) pIdx[phoneticKey] = []
  if (!pIdx[phoneticKey].includes(exactKey)) pIdx[phoneticKey].push(exactKey)
  save(PHONETIC_KEY, pIdx)
}

// ── Read ──────────────────────────────────────────────────────
export function getLearnedMatches(spoken) {
  const store = load(STORE_KEY)
  const exactKey = normalize(spoken)

  // 1. Exact key match — highest confidence
  if (store[exactKey]) {
    return Object.entries(store[exactKey])
      .sort((a, b) => b[1] - a[1])
      .map(([product, count]) => ({ product, count, source: "exact" }))
  }

  // 2. Phonetic cluster — inherit learning from phonetically similar phrases
  const pIdx        = load(PHONETIC_KEY)
  const phoneticKey = soundexKey(spoken)
  const clusterKeys = pIdx[phoneticKey] || []

  const agg = {}
  for (const ck of clusterKeys) {
    for (const [product, count] of Object.entries(store[ck] || {})) {
      agg[product] = (agg[product] || 0) + count
    }
  }

  return Object.entries(agg)
    .sort((a, b) => b[1] - a[1])
    .map(([product, count]) => ({ product, count, source: "phonetic-cluster" }))
}

// Returns product name if system should auto-confirm (no button needed)
export function getAutoConfirmMatch(spoken) {
  const matches = getLearnedMatches(spoken)
  if (!matches[0]) return null
  // Phonetic cluster matches auto-confirm one step earlier (inherited confidence)
  const threshold = matches[0].source === "exact"
    ? AUTO_CONFIRM_THRESHOLD
    : AUTO_CONFIRM_THRESHOLD - 1
  return matches[0].count >= threshold ? matches[0].product : null
}

// Full store for history display
export function getAllLearned() {
  return load(STORE_KEY)
}

export function deleteLearnedKey(spoken) {
  const store = load(STORE_KEY)
  const pIdx  = load(PHONETIC_KEY)
  const exactKey    = normalize(spoken)
  const phoneticKey = soundexKey(spoken)

  delete store[exactKey]
  save(STORE_KEY, store)

  // Clean up phonetic index entry
  if (pIdx[phoneticKey]) {
    pIdx[phoneticKey] = pIdx[phoneticKey].filter(k => k !== exactKey)
    if (pIdx[phoneticKey].length === 0) delete pIdx[phoneticKey]
    save(PHONETIC_KEY, pIdx)
  }
}

// Bulk-write seed data without overwriting existing user-learned corrections
// seeds: [{ spoken: string, product: string, count: number }]
export function seedLearningStore(seeds) {
  const store = load(STORE_KEY)
  const pIdx  = load(PHONETIC_KEY)

  for (const { spoken, product, count } of seeds) {
    const exactKey    = normalize(spoken)
    const phoneticKey = soundexKey(spoken)

    // Never overwrite a correction the user already made
    if (!store[exactKey]) store[exactKey] = {}
    if (!store[exactKey][product]) {
      store[exactKey][product] = count
    }

    // Build phonetic index
    if (!pIdx[phoneticKey]) pIdx[phoneticKey] = []
    if (!pIdx[phoneticKey].includes(exactKey)) pIdx[phoneticKey].push(exactKey)
  }

  save(STORE_KEY, store)
  save(PHONETIC_KEY, pIdx)
}
