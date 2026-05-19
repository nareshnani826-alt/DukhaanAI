// ── Improvement 2: Phonetic Matching ─────────────────────
// Soundex-style algorithm tuned for Indian grocery brand names
// Handles: "Amoool"→"Amul", "Parley Jee"→"Parle-G", "Tatta"→"Tata"

// Simplified Soundex for Indian phonetics
function soundex(str) {
  if (!str) return ""
  const s = str.toLowerCase().replace(/[^a-z]/g, "")
  if (!s) return ""
  const map = { b:1,f:1,p:1,v:1, c:2,g:2,j:2,k:2,q:2,s:2,x:2,z:2, d:3,t:3, l:4, m:5,n:5, r:6 }
  let code = s[0].toUpperCase()
  let prev = map[s[0]] || 0
  for (let i = 1; i < s.length && code.length < 4; i++) {
    const c = map[s[i]] || 0
    if (c && c !== prev) { code += c; prev = c }
    else if (!c) prev = 0
  }
  return code.padEnd(4, "0")
}

// Double Metaphone simplified — better for Indian brand names
function metaphone(str) {
  if (!str) return ""
  return str.toLowerCase()
    .replace(/[aeiou]+/g, "a") // collapse vowels
    .replace(/ck/g, "k").replace(/ph/g, "f")
    .replace(/([a-z])\1+/g, "$1") // deduplicate
    .replace(/[^a-z]/g, "")
}

// Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({length: m+1}, (_, i) => Array.from({length: n+1}, (_, j) => i===0?j:j===0?i:0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

// Common Indian brand name misspellings
const BRAND_PHONETICS = {
  "amul":    ["amoool","amool","amul","amull","aml"],
  "tata":    ["tatta","tata","taata","tata salt"],
  "parle":   ["parley","parl","parlee","parale"],
  "maggi":   ["magi","maagi","magee","maggy"],
  "haldiram":["halderam","haldiraam","haldirams"],
  "fortune": ["forchun","fortun","fortyun"],
  "aashirvaad":["ashirvad","ashirvaad","aashirvad"],
  "britannia":["britania","britanya","britannia"],
  "colgate": ["colgait","colget","colagate"],
  "lifebuoy":["lifebouy","lifebuy","lifeboy"],
  "dettol":  ["detol","dettoll","detall"],
  "patanjali":["patanjal","patanjalli","patanjaly"],
  "dabur":   ["daber","dabar","daboor"],
}

// ── Main phonetic match function ──────────────────────────
export function phoneticMatch(query, productNames) {
  if (!query || !productNames?.length) return null

  const q = query.toLowerCase().trim()
  const qSdx = soundex(q)
  const qMph = metaphone(q)

  let bestMatch = null
  let bestScore = 0

  // First: check brand misspelling dictionary
  for (const [brand, variants] of Object.entries(BRAND_PHONETICS)) {
    for (const v of variants) {
      if (q.includes(v) || levenshtein(q, v) <= 2) {
        // Find product with this brand
        const found = productNames.find(p => p.toLowerCase().includes(brand))
        if (found) return { product: found, confidence: 0.85, method: "brand-phonetic" }
      }
    }
  }

  // Second: Soundex + Metaphone on product words
  for (const name of productNames) {
    const words = name.toLowerCase().split(/\s+/)
    const qWords = q.split(/\s+/)

    let score = 0
    for (const qw of qWords) {
      if (qw.length < 3) continue
      for (const pw of words) {
        if (pw.length < 3) continue
        // Exact
        if (pw === qw) { score += 40; continue }
        // Soundex match
        if (soundex(pw) === soundex(qw)) score += 25
        // Metaphone match
        if (metaphone(pw) === metaphone(qw)) score += 20
        // Levenshtein ≤ 2 for longer words
        if (qw.length > 4 && levenshtein(pw, qw) <= 2) score += 18
        // Levenshtein ≤ 1 for shorter
        if (qw.length <= 4 && levenshtein(pw, qw) <= 1) score += 15
        // Starts with same letters
        if (pw.startsWith(qw.slice(0,3)) || qw.startsWith(pw.slice(0,3))) score += 10
      }
    }

    if (score > bestScore) { bestScore = score; bestMatch = name }
  }

  if (bestScore >= 20) {
    const confidence = Math.min(0.95, bestScore / 80)
    return { product: bestMatch, confidence, method: "phonetic", score: bestScore }
  }
  return null
}

// ── Confidence level helper ───────────────────────────────
export function getConfidenceLevel(confidence) {
  if (confidence >= 0.85) return "high"    // ✓ green
  if (confidence >= 0.60) return "medium"  // ~ amber — show "Did you mean?"
  return "low"                             // ? red — ask user
}
