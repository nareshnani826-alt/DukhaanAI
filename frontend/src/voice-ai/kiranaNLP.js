/**
 * kiranaNLP.js — Kirana-specific NLP: code-switching, abbreviations, slang, quantity shortcuts
 *
 * Handles how real kirana shop owners actually speak during billing:
 *   - Mixed language: "do maggi aur 1 milk dena"
 *   - Abbreviations: GF→Gold Flake, SM→Sona Masoori
 *   - Quantity shortcuts: half kilo, paav, chota packet, bada wala
 *   - Context shortcuts: wahi wala, ek aur, last wala
 *   - Speed billing: "5 SM" → 5 kg Sona Masoori
 */

// ── Kirana abbreviations ─────────────────────────────────────
// Format: abbreviation (lowercase) → canonical product name
// Vendor-learned abbreviations come from patternLearner's ABBR_KEY,
// these are the universal known ones for Indian kirana stores.
export const KIRANA_ABBREVIATIONS = {
  // Cigarettes / Tobacco
  "gf":    "Gold Flake Kings",
  "gfk":   "Gold Flake Kings",
  "gfl":   "Gold Flake Kings",
  "gfs":   "Gold Flake Special",
  "cl":    "Classic Milds",
  "clm":   "Classic Milds",
  "wills": "Wills Navy Cut",
  "nb":    "Navy Cut",
  "bs":    "Benson & Hedges",
  "lm":    "Lucky Strike",

  // Rice
  "sm":    "Sona Masoori Rice",
  "smr":   "Sona Masoori Rice",
  "ig":    "India Gate Basmati",
  "db":    "Daawat Basmati",
  "dw":    "Daawat Basmati",
  "kr":    "Kohinoor Basmati",

  // Atta / Flour
  "att":   "Aashirvaad Atta",
  "aa":    "Aashirvaad Atta",
  "pk":    "Pilsbury Atta",

  // Dal / Pulses
  "md":    "Moong Dal",
  "td":    "Toor Dal",
  "cd":    "Chana Dal",
  "ud":    "Urad Dal",
  "rd":    "Rajma",
  "ml":    "Masoor Dal",

  // Oil
  "fo":    "Fortune Sunflower Oil",
  "so":    "Sundrop Oil",
  "go":    "Groundnut Oil",
  "co":    "Coconut Oil",
  "mo":    "Mustard Oil",
  "ko":    "Kachi Ghani Mustard Oil",

  // Beverages
  "bt":    "Brooke Bond Taj Mahal Tea",
  "3r":    "Three Roses Tea",
  "3roses":"Three Roses Tea",
  "rb":    "Red Label Tea",
  "rl":    "Red Label Tea",
  "gl":    "Green Label Tea",
  "gr":    "Green Label Tea",
  "nescafe":"Nescafe Classic",
  "nc":    "Nescafe Classic",
  "bru":   "Bru Coffee",

  // Dairy
  "mtr":   "MTR Foods",
  "amul":  "Amul Butter",

  // Biscuits
  "gb":    "Good Day Biscuit",
  "gdb":   "Good Day Biscuit",
  "pb":    "Parle-G Biscuit",
  "pg":    "Parle-G Biscuit",
  "mg":    "Marie Gold Biscuit",
  "hh":    "Hide & Seek Biscuit",
  "kk":    "Krackjack Biscuit",
  "bf":    "Bourbon Biscuit",

  // Noodles
  "ma":    "Maggi Noodles",
  "mag":   "Maggi Noodles",

  // Masala
  "mdh":   "MDH Masala",
  "ev":    "Everest Masala",
  "ca":    "Catch Masala",
  "kp":    "Kitchen King Masala",

  // Soap / Personal Care
  "lux":   "Lux Soap",
  "lf":    "Lifebouy Soap",
  "lb":    "Lifebouy Soap",
  "dv":    "Dove Soap",
  "pr":    "Pears Soap",
  "sv":    "Savlon Soap",
  "nv":    "Nivea Cream",

  // Shampoo
  "hs":    "Head & Shoulders Shampoo",
  "pnt":   "Pantene Shampoo",

  // Toothpaste
  "cg":    "Colgate Toothpaste",
  "pr":    "Pepsodent Toothpaste",

  // Health drinks
  "hx":    "Horlicks",
  "bv":    "Bournvita",
  "bo":    "Boost",
  "cp":    "Complan",
  "gd":    "Glucon D",

  // Snacks
  "lays":  "Lays Chips",
  "kk":    "Kurkure",
  "bingo": "Bingo Mad Angles",

  // Household
  "vim":   "Vim Bar",
  "hp":    "Harpic Toilet Cleaner",
  "lz":    "Lizol Floor Cleaner",
  "sfe":   "Surf Excel",
  "sx":    "Surf Excel",
  "ariel": "Ariel Detergent",
  "rin":   "Rin Detergent",
  "wheel": "Wheel Detergent",

  // Oil (Hair)
  "para":  "Parachute Coconut Oil",
  "pc":    "Parachute Coconut Oil",
}

// ── Quantity normalization map ───────────────────────────────
// Maps spoken quantity phrases → { value, unit }
const QUANTITY_MAP = [
  // Fraction shortcuts
  { pattern: /\bpaav\s*kilo\b/i,          qty: 0.25, unit: "kg" },
  { pattern: /\bpaav\b/i,                  qty: 0.25, unit: "kg" },
  { pattern: /\bsawa\s*kilo\b/i,           qty: 1.25, unit: "kg" },
  { pattern: /\bdhaai\s*kilo\b/i,          qty: 2.5,  unit: "kg" },
  { pattern: /\bdhai\s*kilo\b/i,           qty: 2.5,  unit: "kg" },
  { pattern: /\bdhad\s*kilo\b/i,           qty: 1.5,  unit: "kg" },
  { pattern: /\bded\s*kilo\b/i,            qty: 1.5,  unit: "kg" },
  { pattern: /\bhalfa?\s*kilo\b/i,         qty: 0.5,  unit: "kg" },
  { pattern: /\bhalf\s*kilo\b/i,           qty: 0.5,  unit: "kg" },
  { pattern: /\badha\s*kilo\b/i,           qty: 0.5,  unit: "kg" },
  { pattern: /\b1\.5\s*kilo\b/i,           qty: 1.5,  unit: "kg" },
  { pattern: /\b2\.5\s*kilo\b/i,           qty: 2.5,  unit: "kg" },

  // Gram shortcut
  { pattern: /\b100\s*g(?:ram)?\b/i,       qty: 100,  unit: "g" },
  { pattern: /\b200\s*g(?:ram)?\b/i,       qty: 200,  unit: "g" },
  { pattern: /\b250\s*g(?:ram)?\b/i,       qty: 250,  unit: "g" },
  { pattern: /\b500\s*g(?:ram)?\b/i,       qty: 500,  unit: "g" },

  // Liter shortcuts
  { pattern: /\bhalf\s*litre?\b/i,         qty: 0.5,  unit: "L" },
  { pattern: /\badha\s*litre?\b/i,         qty: 0.5,  unit: "L" },
  { pattern: /\b1\s*litre?\b/i,            qty: 1,    unit: "L" },
  { pattern: /\b2\s*litre?\b/i,            qty: 2,    unit: "L" },
  { pattern: /\b5\s*litre?\b/i,            qty: 5,    unit: "L" },

  // Packet/piece shortcuts
  { pattern: /\bchota\s*packet\b/i,        qty: 1,    unit: "small" },
  { pattern: /\bbada\s*wala\b/i,           qty: 1,    unit: "large" },
  { pattern: /\bbada\s*packet\b/i,         qty: 1,    unit: "large" },
  { pattern: /\bchhota\s*wala\b/i,         qty: 1,    unit: "small" },
  { pattern: /\bsmall\s*packet\b/i,        qty: 1,    unit: "small" },
  { pattern: /\blarge\s*packet\b/i,        qty: 1,    unit: "large" },
  { pattern: /\bfamily\s*pack\b/i,         qty: 1,    unit: "family" },

  // Dozen / score
  { pattern: /\bdazan\b|\bdozen\b/i,       qty: 12,   unit: "pcs" },
  { pattern: /\bscore\b/i,                 qty: 20,   unit: "pcs" },

  // Hindi numbers
  { pattern: /\bek\b/i,                    qty: 1,    unit: "pcs" },
  { pattern: /\bdo\b/i,                    qty: 2,    unit: "pcs" },
  { pattern: /\bteen\b|\btin\b/i,          qty: 3,    unit: "pcs" },
  { pattern: /\bchaar\b|\bchar\b/i,        qty: 4,    unit: "pcs" },
  { pattern: /\bpaanch\b|\bpanch\b/i,      qty: 5,    unit: "pcs" },
  { pattern: /\bchheh\b|\bchhe\b/i,        qty: 6,    unit: "pcs" },
  { pattern: /\bsaat\b/i,                  qty: 7,    unit: "pcs" },
  { pattern: /\baath\b/i,                  qty: 8,    unit: "pcs" },
  { pattern: /\bnau\b/i,                   qty: 9,    unit: "pcs" },
  { pattern: /\bdas\b/i,                   qty: 10,   unit: "pcs" },
  { pattern: /\bbaara\b|\bbaarah\b/i,      qty: 12,   unit: "pcs" },
  { pattern: /\bpandrah\b/i,               qty: 15,   unit: "pcs" },
  { pattern: /\bbees\b/i,                  qty: 20,   unit: "pcs" },
  { pattern: /\bpachees\b/i,               qty: 25,   unit: "pcs" },
  { pattern: /\bpachhas\b|\bpachas\b/i,    qty: 50,   unit: "pcs" },
  { pattern: /\bsau\b/i,                   qty: 100,  unit: "pcs" },
]

// ── Code-switching conjunctions ──────────────────────────────
// Words that signal "next product" in Hindi/Tamil/Telugu/Bengali/Marathi/etc.
const CODE_SWITCH_CONJUNCTIONS = [
  // Hindi / Urdu
  "aur", "aor", "or", "aur bhi", "aur ek", "phir",
  // Tamil
  "um", "matrum", "matum",
  // Telugu
  "mariyu", "inkaa",
  // Kannada
  "mattu", "haagu",
  // Bengali
  "ebong", "r", "aar",
  // Marathi
  "aani", "ani",
  // Gujarati
  "ane", "tatha",
  // Malayalam
  "um", "koode",
  // English
  "and", "also", "plus", "with",
]

// ── Context shortcut keywords ────────────────────────────────
// "wahi wala" / "same" / "ek aur" signal context-dependent actions
const CONTEXT_SHORTCUTS = {
  same:    ["wahi wala", "wahi", "same", "same wala", "wahi cheez", "usi wala", "usi"],
  oneMore: ["ek aur", "one more", "aur ek", "dobara", "again", "ek more", "phir se ek"],
  last:    ["last wala", "pehle wala", "wo wala", "uska", "previous", "jo tha"],
  cancel:  ["nahi", "cancel", "mat", "rokko", "band karo", "chod do", "no", "galat"],
  confirm: ["haan", "ha", "yes", "ok", "theek hai", "sahi hai", "correct", "bilkul"],
  repeat:  ["dobara", "again", "repeat", "phir", "wapas"],
}

// ── Expand abbreviation ──────────────────────────────────────
// Returns canonical product name or null
export function expandAbbreviation(word) {
  if (!word) return null
  const lc = word.toLowerCase().trim()
  return KIRANA_ABBREVIATIONS[lc] || null
}

// ── Extract quantity from spoken phrase ──────────────────────
// Returns { qty, unit, remaining } — remaining is text with qty phrase removed
export function extractQuantity(text) {
  const lower = text.toLowerCase()

  // Try multi-word quantity patterns first
  for (const { pattern, qty, unit } of QUANTITY_MAP) {
    if (pattern.test(lower)) {
      const remaining = lower.replace(pattern, "").trim()
      return { qty, unit, remaining }
    }
  }

  // Try numeric + unit: "2 kg", "500g", "3 pcs", "5 litre"
  const numericMatch = lower.match(
    /(\d+(?:\.\d+)?)\s*(kg|kilo|g|gram|gm|l|litre|liter|lt|ml|pcs?|pieces?|packets?|box|bottle|can|pouch|sachet|strip)/i
  )
  if (numericMatch) {
    const qty  = parseFloat(numericMatch[1])
    const rawU = numericMatch[2].toLowerCase()
    const unit = rawU.startsWith("k") ? "kg"
               : rawU.startsWith("g") ? "g"
               : rawU.startsWith("l") || rawU === "lt" ? "L"
               : rawU === "ml" ? "mL"
               : "pcs"
    const remaining = lower.replace(numericMatch[0], "").trim()
    return { qty, unit, remaining }
  }

  // Try standalone number: "2 maggi"
  const standaloneNum = lower.match(/^(\d+)\s+/)
  if (standaloneNum) {
    const qty  = parseInt(standaloneNum[1], 10)
    const remaining = lower.slice(standaloneNum[0].length).trim()
    if (qty > 0 && qty <= 999) {
      return { qty, unit: "pcs", remaining }
    }
  }

  return { qty: 1, unit: "pcs", remaining: lower }
}

// ── Detect context shortcut type ─────────────────────────────
// Returns "same" | "oneMore" | "last" | "cancel" | "confirm" | "repeat" | null
export function detectContextShortcut(text) {
  const lower = text.toLowerCase().trim()
  for (const [type, phrases] of Object.entries(CONTEXT_SHORTCUTS)) {
    for (const phrase of phrases) {
      if (lower === phrase || lower.startsWith(phrase + " ") || lower.endsWith(" " + phrase)) {
        return type
      }
    }
  }
  return null
}

// ── Split code-switched utterance into product segments ───────
// "do maggi aur 1 milk dena" → ["do maggi", "1 milk"]
// Returns array of non-empty trimmed segments
export function splitCodeSwitched(text) {
  let working = text.toLowerCase()

  // Sort conjunctions by length descending (avoid "or" eating "aur bhi")
  const sorted = [...CODE_SWITCH_CONJUNCTIONS].sort((a, b) => b.length - a.length)

  // Build a regex that matches any conjunction as a word/phrase boundary
  const escaped = sorted.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const conjRe  = new RegExp(`\\s+(?:${escaped.join("|")})\\s+`, "gi")

  const parts = working.split(conjRe).map(p => p.trim()).filter(p => p.length > 2)
  return parts.length > 1 ? parts : [text.trim()]
}

// ── Normalize a single product phrase ────────────────────────
// Strips filler words, expands abbreviations, returns cleaned phrase
const FILLER_WORDS = /\b(dena|dedo|dete|lao|laana|laado|wala|wale|wali|ka|ki|ke|ek|please|zara|jaldi|abhi|thoda|thodi|theek)\b/gi

export function normalizeProductPhrase(phrase) {
  if (!phrase) return ""
  let text = phrase.toLowerCase().trim()

  // Remove filler words
  text = text.replace(FILLER_WORDS, " ").replace(/\s+/g, " ").trim()

  // Try abbreviation expansion on the cleaned text (exact word match)
  const words = text.split(/\s+/)
  if (words.length === 1) {
    const expanded = expandAbbreviation(words[0])
    if (expanded) return expanded.toLowerCase()
  }

  // Try abbreviation on first word (e.g., "gf 5" → "Gold Flake Kings 5")
  if (words.length >= 1) {
    const expanded = expandAbbreviation(words[0])
    if (expanded) {
      return (expanded + " " + words.slice(1).join(" ")).toLowerCase().trim()
    }
  }

  return text
}

// ── Full NLP parse of a voice utterance ──────────────────────
// Returns array of { productPhrase, qty, unit, contextShortcut }
export function parseVoiceUtterance(text) {
  if (!text) return []

  const trimmed = text.trim()

  // Check for full-utterance context shortcut first
  const shortcut = detectContextShortcut(trimmed)
  if (shortcut) return [{ productPhrase: "", qty: 1, unit: "pcs", contextShortcut: shortcut }]

  // Split by code-switching conjunctions
  const segments = splitCodeSwitched(trimmed)

  return segments.map(segment => {
    const { qty, unit, remaining } = extractQuantity(segment)
    const productPhrase = normalizeProductPhrase(remaining)
    return { productPhrase, qty, unit, contextShortcut: null }
  }).filter(r => r.productPhrase.length > 0 || r.contextShortcut)
}

// ── Speed billing: "5 SM" / "2 ATT 10 SM" parse ──────────────
// Handles tight billing shorthand with no natural language
const SPEED_PATTERN = /(\d+)\s+([a-z]{1,5})(?:\s+|$)/gi

export function parseSpeedBilling(text) {
  const results = []
  let match
  const re = new RegExp(SPEED_PATTERN.source, "gi")
  while ((match = re.exec(text)) !== null) {
    const qty  = parseInt(match[1], 10)
    const abbr = match[2].toLowerCase()
    const expanded = expandAbbreviation(abbr)
    if (expanded) {
      results.push({ productPhrase: expanded.toLowerCase(), qty, unit: "pcs", contextShortcut: null })
    }
  }
  return results
}

// ── Check if utterance looks like speed billing ───────────────
export function isSpeedBilling(text) {
  const lower = text.toLowerCase().trim()
  // Looks like "2 sm" or "5 gf 3 sm" — short abbr pairs
  return /^(\d+\s+[a-z]{1,5}\s*)+$/i.test(lower)
}
