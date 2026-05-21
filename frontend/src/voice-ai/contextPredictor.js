/**
 * contextPredictor.js — Cart-context awareness and session habit learning
 *
 * Learns purchase patterns:
 *   - If milk added → suggest curd/butter next
 *   - If rice added → suggest dal next
 *   - Time-of-day context (morning chai, evening snacks)
 *   - Sequential patterns from billing history
 *
 * Everything stored in localStorage — zero server calls.
 */

const SESSION_KEY   = "dk_ctx_session"    // current bill items
const PATTERN_KEY   = "dk_ctx_patterns"   // product → { followedBy: { prod: count } }
const HABIT_KEY     = "dk_ctx_habits"     // time-of-day habits
const MAX_PAIRS     = 500                 // max co-occurrence pairs to store

// ── Known product affinity pairs ────────────────────────────
// These are universal kirana purchase patterns as starting data.
// User's real billing will reinforce/add to these over time.
const SEED_AFFINITIES = [
  // Chai ecosystem
  ["milk", "tea"],
  ["tea", "sugar"],
  ["milk", "sugar"],
  ["tea leaves", "sugar"],
  ["brooke bond", "sugar"],
  ["red label", "sugar"],

  // Breakfast
  ["bread", "butter"],
  ["bread", "jam"],
  ["eggs", "bread"],
  ["poha", "oil"],
  ["upma", "oil"],

  // Dal-chawal
  ["rice", "dal"],
  ["sona masoori", "toor dal"],
  ["basmati", "toor dal"],
  ["toor dal", "rice"],
  ["moong dal", "rice"],

  // Roti ecosystem
  ["atta", "oil"],
  ["aashirvaad", "oil"],
  ["atta", "ghee"],

  // Maggi combo
  ["maggi", "tomato sauce"],
  ["maggi", "ketchup"],

  // Snack time
  ["biscuit", "tea"],
  ["parle-g", "tea"],
  ["good day", "tea"],

  // Cooking basics together
  ["oil", "masala"],
  ["onion", "tomato"],
  ["garlic", "ginger"],
  ["salt", "oil"],

  // Dairy bundle
  ["milk", "curd"],
  ["milk", "paneer"],
  ["curd", "butter"],

  // Personal care bundle
  ["soap", "shampoo"],
  ["toothpaste", "toothbrush"],
  ["shampoo", "conditioner"],

  // Household bundle
  ["detergent", "dishwash"],
  ["surf excel", "vim"],
  ["harpic", "lizol"],

  // Baby products
  ["pampers", "baby soap"],
  ["baby powder", "baby oil"],

  // Health drinks
  ["horlicks", "milk"],
  ["bournvita", "milk"],
  ["boost", "milk"],
]

// ── Time-of-day product associations ────────────────────────
const TIME_CONTEXT = {
  morning:   ["tea", "milk", "bread", "eggs", "poha", "upma", "sugar", "butter"],  // 5am–11am
  afternoon: ["rice", "dal", "oil", "masala", "atta", "salt"],                      // 11am–4pm
  evening:   ["snacks", "biscuit", "chips", "kurkure", "tea", "coffee"],             // 4pm–8pm
  night:     ["milk", "bread", "eggs", "rice", "atta"],                              // 8pm–11pm
}

import { scheduleSync } from "./syncPatterns"

// ── Load / save helpers ──────────────────────────────────────
function load(key) {
  try { return JSON.parse(localStorage.getItem(key) || "{}") } catch { return {} }
}
function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

// ── Get current time period ──────────────────────────────────
function getTimePeriod() {
  const h = new Date().getHours()
  if (h >= 5  && h < 11) return "morning"
  if (h >= 11 && h < 16) return "afternoon"
  if (h >= 16 && h < 20) return "evening"
  return "night"
}

// ── Initialize seed affinities (run once) ────────────────────
const SEED_VERSION_KEY = "dk_ctx_seed_v"
const SEED_VERSION     = "v1"

export function initContextPredictor() {
  if (localStorage.getItem(SEED_VERSION_KEY) === SEED_VERSION) return

  const patterns = load(PATTERN_KEY)
  for (const [a, b] of SEED_AFFINITIES) {
    const ka = a.toLowerCase()
    const kb = b.toLowerCase()
    if (!patterns[ka]) patterns[ka] = { followedBy: {} }
    if (!patterns[ka].followedBy[kb]) patterns[ka].followedBy[kb] = 0
    patterns[ka].followedBy[kb] += 1

    // Symmetric seed
    if (!patterns[kb]) patterns[kb] = { followedBy: {} }
    if (!patterns[kb].followedBy[ka]) patterns[kb].followedBy[ka] = 0
    patterns[kb].followedBy[ka] += 1
  }
  save(PATTERN_KEY, patterns)
  localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION)
}

// ── Record a product added to cart ───────────────────────────
// previousProduct: last item added (to record pair)
export function recordCartAddition(productName, previousProduct = null) {
  const pn = productName.toLowerCase().split(" ")[0]  // normalize to first word

  // Record pair co-occurrence
  if (previousProduct) {
    const prev = previousProduct.toLowerCase().split(" ")[0]
    const patterns = load(PATTERN_KEY)

    if (!patterns[prev]) patterns[prev] = { followedBy: {} }
    if (!patterns[prev].followedBy[pn]) patterns[prev].followedBy[pn] = 0
    patterns[prev].followedBy[pn]++

    // Cap total pairs
    const allPairs = Object.values(patterns).reduce(
      (s, v) => s + Object.keys(v.followedBy || {}).length, 0
    )
    if (allPairs < MAX_PAIRS) {
      save(PATTERN_KEY, patterns)
      scheduleSync()
    }
  }

  // Record time-of-day habit
  const period = getTimePeriod()
  const habits = load(HABIT_KEY)
  if (!habits[period]) habits[period] = {}
  if (!habits[period][pn]) habits[period][pn] = 0
  habits[period][pn]++
  save(HABIT_KEY, habits)
}

// ── Predict next products ─────────────────────────────────────
// Returns [ { productName, score, reason } ] sorted by score
export function predictNext(cartItems = [], limit = 5) {
  if (!cartItems.length) return getTimeBasedSuggestions(limit)

  const patterns  = load(PATTERN_KEY)
  const period    = getTimePeriod()
  const habits    = load(HABIT_KEY)
  const inCart    = new Set(cartItems.map(n => n.toLowerCase().split(" ")[0]))
  const scores    = new Map()

  // Score based on purchase affinities
  for (const item of cartItems) {
    const key = item.toLowerCase().split(" ")[0]
    const patt = patterns[key]
    if (!patt?.followedBy) continue

    for (const [follower, count] of Object.entries(patt.followedBy)) {
      if (inCart.has(follower)) continue
      const cur = scores.get(follower) || { score: 0, reason: "pattern" }
      scores.set(follower, { score: cur.score + count * 0.1, reason: "pattern" })
    }
  }

  // Boost by time-of-day habits
  const todayHabits = habits[period] || {}
  for (const [prod, count] of Object.entries(todayHabits)) {
    if (inCart.has(prod)) continue
    const cur = scores.get(prod) || { score: 0, reason: "habit" }
    scores.set(prod, {
      score: cur.score + count * 0.05,
      reason: cur.reason === "pattern" ? "pattern+habit" : "habit"
    })
  }

  return [...scores.entries()]
    .map(([productName, { score, reason }]) => ({ productName, score, reason }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// ── Time-based suggestions when cart is empty ────────────────
function getTimeBasedSuggestions(limit) {
  const period = getTimePeriod()
  const habits = load(HABIT_KEY)
  const todayHabits = habits[period] || {}

  // Merge learned habits with seeded time context
  const all = { ...Object.fromEntries(TIME_CONTEXT[period].map((p, i) => [p, 10 - i])) }
  for (const [prod, cnt] of Object.entries(todayHabits)) {
    all[prod] = (all[prod] || 0) + cnt * 2
  }

  return Object.entries(all)
    .map(([productName, score]) => ({ productName, score, reason: "time-context" }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// ── Session management ────────────────────────────────────────
// Track current bill session for sequential learning

export function startSession() {
  save(SESSION_KEY, { items: [], startTime: Date.now() })
}

export function addToSession(productName) {
  const session = load(SESSION_KEY)
  if (!session.items) session.items = []
  const prev = session.items.length ? session.items[session.items.length - 1] : null
  session.items.push(productName)
  save(SESSION_KEY, session)
  recordCartAddition(productName, prev)
}

export function getSessionItems() {
  const session = load(SESSION_KEY)
  return session.items || []
}

export function clearSession() {
  save(SESSION_KEY, { items: [], startTime: Date.now() })
}

// ── Get stats ─────────────────────────────────────────────────
export function getContextStats() {
  const patterns = load(PATTERN_KEY)
  const habits   = load(HABIT_KEY)
  const totalPairs = Object.values(patterns).reduce(
    (s, v) => s + Object.keys(v.followedBy || {}).length, 0
  )
  const topAffinity = Object.entries(patterns)
    .flatMap(([a, v]) =>
      Object.entries(v.followedBy || {}).map(([b, c]) => ({ pair: `${a}→${b}`, count: c }))
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return { totalPairs, topAffinity, period: getTimePeriod() }
}
