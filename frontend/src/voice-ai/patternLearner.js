/**
 * patternLearner.js — Autonomous phoneme + pattern learning engine
 *
 * Never stops learning. Every confirmed billing action teaches the system
 * how THIS vendor speaks. Over time the system evolves into understanding
 * the shop owner's exact dialect, accent, and shorthand.
 *
 * Layers:
 *  1. Exact learned patterns  (spoken → product, confirmed N times)
 *  2. Indian phoneme rules     (goldu → gold, maagi → maggi, …)
 *  3. Vendor abbreviations     (GF → Gold Flake, SM → Sona Masoori)
 *  4. Rule reinforcement       (which rules fired and succeeded)
 */

// ── Storage keys ────────────────────────────────────────────
const PATTERN_KEY  = "dk_pl_patterns"   // spoken → { product: {count,last} }
const ABBR_KEY     = "dk_pl_abbr"       // short-word → product
const RULE_KEY     = "dk_pl_rules"      // ruleName → { hits, misses }
const META_KEY     = "dk_pl_meta"       // stats

// ── Indian phoneme transformation rules ─────────────────────
// Each rule: { name, test, transform }
// Applied to generate candidate forms from the raw spoken word.
// Rules are sorted by their historical hit-rate so better rules run first.
const PHONEME_RULES = [
  // ── Regional suffix rules ────────────────────────────────
  // South India: trailing "u" added to consonant-final brand names
  // goldu→gold, parleg u→parle, amool u→amul
  { name: "strip_u",       test: s => s.length > 3 && /[^aeiou]u$/i.test(s),
                           transform: s => s.slice(0, -1) },
  // East India: trailing "o"
  { name: "strip_o",       test: s => s.length > 4 && /[^aeiou]o$/i.test(s),
                           transform: s => s.slice(0, -1) },
  // North India: trailing "aa"
  { name: "strip_aa",      test: s => s.endsWith("aa"),
                           transform: s => s.slice(0, -1) },
  // Duplicate trailing vowel: amool→amul, titoo→tito
  { name: "dedup_vowel",   test: s => /(.)\1$/i.test(s) && /[aeiou]{2}$/.test(s),
                           transform: s => s.slice(0, -1) },

  // ── Vowel normalization rules ────────────────────────────
  // "aa" sound elongation: taata→tata, maagi→magi
  { name: "aa_a",          test: s => s.includes("aa"),
                           transform: s => s.replace(/aa/g, "a") },
  // "ee" for "i": magee→maggi, parlee→parle
  { name: "ee_i",          test: s => s.includes("ee"),
                           transform: s => s.replace(/ee/g, "i") },
  // "oo" for "u": amool→amul, daboor→dabur
  { name: "oo_u",          test: s => s.includes("oo"),
                           transform: s => s.replace(/oo/g, "u") },
  // "ie" for "i": magie→maggi
  { name: "ie_i",          test: s => s.includes("ie"),
                           transform: s => s.replace(/ie/g, "i") },
  // "ei" for "i": magei→maggi
  { name: "ei_i",          test: s => s.includes("ei"),
                           transform: s => s.replace(/ei/g, "i") },
  // "ai" for "ay": colgate→kolgait (reverse: kolgait→colgate)
  { name: "ai_ay",         test: s => s.includes("ai"),
                           transform: s => s.replace(/ai/g, "ay") },

  // ── Consonant normalization rules ────────────────────────
  // "ph" → "f": forchun/phorchun → fortune
  { name: "ph_f",          test: s => s.includes("ph"),
                           transform: s => s.replace(/ph/g, "f") },
  // "v" / "b" confusion: "bournvita" → sometimes said "bournbita"
  { name: "b_v",           test: s => s.includes("b"),
                           transform: s => s.replace(/b/g, "v") },
  { name: "v_b",           test: s => s.includes("v"),
                           transform: s => s.replace(/v/g, "b") },
  // "kh" → "k": khichdi, khaana
  { name: "kh_k",          test: s => s.includes("kh"),
                           transform: s => s.replace(/kh/g, "k") },
  // "gh" → "g": ghee, ghar
  { name: "gh_g",          test: s => s.includes("gh"),
                           transform: s => s.replace(/gh/g, "g") },
  // "th" → "t": thanda, thyroid
  { name: "th_t",          test: s => s.includes("th"),
                           transform: s => s.replace(/th/g, "t") },
  // "sh" → "s" or "ch": shampoo vs champoo
  { name: "sh_s",          test: s => s.includes("sh"),
                           transform: s => s.replace(/sh/g, "s") },
  { name: "sh_ch",         test: s => s.includes("sh"),
                           transform: s => s.replace(/sh/g, "ch") },
  // "ch" → "c": colgate → cholgate, chips → chipse
  { name: "ch_c",          test: s => s.startsWith("ch"),
                           transform: s => s.replace(/^ch/, "c") },
  // "z" / "j" confusion: zeera→jeera, juice→joos
  { name: "z_j",           test: s => s.includes("z"),
                           transform: s => s.replace(/z/g, "j") },
  { name: "j_z",           test: s => s.includes("j"),
                           transform: s => s.replace(/j/g, "z") },
  // "w" / "v" confusion in Hindi: wala→vala
  { name: "w_v",           test: s => s.includes("w"),
                           transform: s => s.replace(/w/g, "v") },

  // ── Deduplication rules ──────────────────────────────────
  // Doubled consonants: maggi→magi, khatam→katam (hearing loss)
  { name: "dedup_cons",    test: s => /([bcdfghjklmnpqrstvwxyz])\1/i.test(s),
                           transform: s => s.replace(/([bcdfghjklmnpqrstvwxyz])\1/gi, "$1") },
  // Insert missing vowel between doubled consonants (reverse)
  { name: "insert_i",      test: s => /[bcdfghjklmnpqrstvwxyz]{3}/i.test(s),
                           transform: s => s.replace(/([bcdfghjklmnpqrstvwxyz])([bcdfghjklmnpqrstvwxyz]{2})/gi,
                             (_, a, b) => a + "i" + b) },

  // ── Brand-specific shortening ────────────────────────────
  // Drop "s" suffix plurals: chips→chip, biscuits→biscuit
  { name: "strip_s",       test: s => s.endsWith("s") && s.length > 4,
                           transform: s => s.slice(0, -1) },
  // Drop "wala" suffix: chaiwala→chai
  { name: "strip_wala",    test: s => /wala|wale|wali$/i.test(s),
                           transform: s => s.replace(/\s*(wala|wale|wali)$/i, "").trim() },
]

import { scheduleSync } from "./syncPatterns"

// ── Load / save helpers ─────────────────────────────────────
function load(key) {
  try { return JSON.parse(localStorage.getItem(key) || "{}") } catch { return {} }
}
function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

// ── Normalize text ──────────────────────────────────────────
function norm(text) {
  return text.toLowerCase().trim().replace(/\s+/g, " ")
}

// ── Generate all phoneme candidates from a spoken phrase ────
// Returns [ {candidate, ruleChain}, … ] — unique candidates only
export function generateCandidates(spoken) {
  const base = norm(spoken)
  const results = new Map()  // candidate → shortest rule chain

  results.set(base, [])      // base form always included

  // Single-rule transforms
  for (const rule of PHONEME_RULES) {
    if (rule.test(base)) {
      const c = norm(rule.transform(base))
      if (c && c !== base && c.length > 1 && !results.has(c)) {
        results.set(c, [rule.name])
      }
    }
  }

  // Two-rule combinations (for complex pronunciations)
  for (const [c1, chain1] of [...results.entries()]) {
    if (chain1.length >= 2) continue   // don't go too deep
    for (const rule of PHONEME_RULES) {
      if (chain1.includes(rule.name)) continue
      if (rule.test(c1)) {
        const c2 = norm(rule.transform(c1))
        if (c2 && c2 !== base && c2.length > 1 && !results.has(c2)) {
          results.set(c2, [...chain1, rule.name])
        }
      }
    }
  }

  return [...results.entries()].map(([candidate, ruleChain]) => ({ candidate, ruleChain }))
}

// ── Record a confirmed match ────────────────────────────────
// Called every time vendor confirms a product — this is how the AI learns
export function recordConfirmation(spoken, productName, context = {}) {
  const key  = norm(spoken)
  const data = load(PATTERN_KEY)

  if (!data[key]) data[key] = {}
  if (!data[key][productName]) data[key][productName] = { count: 0, lastSeen: 0, ruleChains: [] }

  data[key][productName].count++
  data[key][productName].lastSeen = Date.now()

  // Detect if this was learned via a phoneme rule (compare against generateCandidates output)
  // We record which rule chains fire so we can weight them later
  const candidates = generateCandidates(key)
  const match = candidates.find(c => c.candidate === key && c.ruleChain.length > 0)
  if (match) {
    const chain = match.ruleChain.join("+")
    if (!data[key][productName].ruleChains.includes(chain)) {
      data[key][productName].ruleChains.push(chain)
    }
  }
  save(PATTERN_KEY, data)

  // If spoken is very short (1–4 chars) and gets confirmed multiple times → vendor abbreviation
  if (key.replace(/\s/g,"").length <= 4 && (data[key][productName].count >= 2)) {
    learnAbbreviation(key, productName)
  }

  // Reinforce the rule hits
  reinforceRules(spoken, productName)

  // Queue cloud sync (debounced 5s)
  scheduleSync()
}

// ── Reinforce rule hit/miss stats ───────────────────────────
function reinforceRules(spoken, productName) {
  const rules = load(RULE_KEY)
  const candidates = generateCandidates(norm(spoken))
  for (const { candidate, ruleChain } of candidates) {
    for (const ruleName of ruleChain) {
      if (!rules[ruleName]) rules[ruleName] = { hits: 0, misses: 0 }
      // We treat every confirmed match as a hit for all rule chains that led to this candidate
      rules[ruleName].hits++
    }
  }
  save(RULE_KEY, rules)
}

// ── Learn a vendor abbreviation ──────────────────────────────
function learnAbbreviation(abbr, productName) {
  const data = load(ABBR_KEY)
  if (!data[abbr]) data[abbr] = {}
  data[abbr][productName] = (data[abbr][productName] || 0) + 1
  save(ABBR_KEY, data)
}

// ── Look up learned patterns (exact + phoneme candidates) ──
// Returns [ { productName, score, source } ] sorted by score
export function findLearnedMatch(spoken) {
  const key      = norm(spoken)
  const patterns = load(PATTERN_KEY)
  const rules    = load(RULE_KEY)
  const results  = new Map()

  // 1. Exact pattern match
  if (patterns[key]) {
    for (const [prod, meta] of Object.entries(patterns[key])) {
      const score = 1.0 + (meta.count * 0.1)   // higher count = higher confidence
      results.set(prod, { score: Math.min(score, 2.0), source: "exact", count: meta.count })
    }
  }

  // 2. Phoneme-candidate matches — score weighted by rule hit-rate
  const candidates = generateCandidates(key)
  for (const { candidate, ruleChain } of candidates) {
    if (candidate === key) continue
    if (patterns[candidate]) {
      // Calculate rule confidence from historical hit rate
      const ruleConfidence = ruleChain.reduce((acc, name) => {
        const r    = rules[name] || { hits: 0, misses: 0 }
        const rate = r.hits / Math.max(1, r.hits + r.misses)
        return acc * (0.5 + rate * 0.5)   // range: 0.5–1.0 per rule
      }, 1.0)

      for (const [prod, meta] of Object.entries(patterns[candidate])) {
        const base  = 0.7 * ruleConfidence + (meta.count * 0.05)
        const score = Math.min(base, 1.5)
        const cur   = results.get(prod)
        if (!cur || score > cur.score) {
          results.set(prod, { score, source: "phoneme", count: meta.count,
            ruleChain, matchedCandidate: candidate })
        }
      }
    }
  }

  // 3. Abbreviation match
  const abbrs = load(ABBR_KEY)
  if (abbrs[key]) {
    const sorted = Object.entries(abbrs[key]).sort((a,b) => b[1]-a[1])
    if (sorted[0]) {
      const [prod, count] = sorted[0]
      const score = 0.9 + count * 0.05
      const cur   = results.get(prod)
      if (!cur || score > cur.score) {
        results.set(prod, { score: Math.min(score, 1.8), source: "abbr", count })
      }
    }
  }

  return [...results.entries()]
    .map(([productName, meta]) => ({ productName, ...meta }))
    .sort((a,b) => b.score - a.score)
}

// ── Match learned patterns against actual product list ───────
// Returns the best matching product object from products[], or null
export function matchFromLearned(spoken, products) {
  if (!spoken || !products?.length) return null

  const learned = findLearnedMatch(spoken)
  if (!learned.length) return null

  for (const { productName, score, source } of learned) {
    // Exact name match
    const exact = products.find(p => p.name.toLowerCase() === productName.toLowerCase())
    if (exact) return { ...exact, _confidence: Math.min(score, 1.0), _method: `learned-${source}` }

    // Partial name match (product may have size variant: "Maggi Noodles 70g" vs "Maggi")
    const partial = products.find(p =>
      p.name.toLowerCase().includes(productName.toLowerCase()) ||
      productName.toLowerCase().includes(p.name.toLowerCase().split(" ")[0])
    )
    if (partial) return { ...partial, _confidence: Math.min(score * 0.9, 1.0), _method: `learned-${source}-partial` }
  }
  return null
}

// ── Get top vendor habits (for UI display) ───────────────────
export function getVendorHabits(limit = 10) {
  const patterns = load(PATTERN_KEY)
  const habits   = []

  for (const [spoken, products] of Object.entries(patterns)) {
    const best = Object.entries(products).sort((a,b) => b[1].count - a[1].count)[0]
    if (best) habits.push({ spoken, product: best[0], count: best[1].count, lastSeen: best[1].lastSeen })
  }

  return habits.sort((a,b) => b.count - a.count).slice(0, limit)
}

// ── Delete a learned pattern (vendor correction) ─────────────
export function deletePattern(spoken, productName) {
  const key  = norm(spoken)
  const data = load(PATTERN_KEY)
  if (data[key]) {
    delete data[key][productName]
    if (!Object.keys(data[key]).length) delete data[key]
    save(PATTERN_KEY, data)
  }
}

// ── Export stats ─────────────────────────────────────────────
export function getLearnerStats() {
  const patterns = load(PATTERN_KEY)
  const abbrs    = load(ABBR_KEY)
  const rules    = load(RULE_KEY)
  return {
    totalPatterns:     Object.keys(patterns).length,
    totalAbbreviations: Object.keys(abbrs).length,
    totalRulesTracked: Object.keys(rules).length,
    topRules: Object.entries(rules)
      .map(([name, r]) => ({ name, hits: r.hits, rate: r.hits / Math.max(1, r.hits + r.misses) }))
      .sort((a,b) => b.hits - a.hits).slice(0, 5),
  }
}
