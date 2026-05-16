// ── Voice NLP Parser ──────────────────────────────────────
import { NUMBER_WORDS, UNIT_ALIASES, ACTION_KEYWORDS } from "./languages.js"
import { applyGroceryAliases, resolveGroceryName, GROCERY_ALIASES } from "./groceryAliases.js"

// ── Detect action intent ──────────────────────────────────
export function detectAction(text) {
  const t = text.toLowerCase().trim()
  for (const [action, keywords] of Object.entries(ACTION_KEYWORDS)) {
    for (const kw of keywords) {
      if (t.includes(kw.toLowerCase())) return action
    }
  }
  return "ADD_BILL"
}

// ── Parse quantity from text ──────────────────────────────
export function parseQuantity(text) {
  const t = text.toLowerCase()

  // Digit numbers first — most reliable
  const digitMatch = t.match(/(\d+\.?\d*)\s*(kg|g|l|ml|ltr|litre|liter|piece|pcs|pc|packet|pack|bottle|box|bag|kilo|gram)?/i)
  if (digitMatch && digitMatch[1]) {
    return { qty: parseFloat(digitMatch[1]), unit: resolveUnit(digitMatch[2] || "") }
  }

  // Word numbers (ek, do, teen / okati, rendu / onnu, rendu...)
  const words = t.split(/\s+/)
  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase()
    if (NUMBER_WORDS[word] !== undefined) {
      const nextWord = words[i + 1] || ""
      return { qty: NUMBER_WORDS[word], unit: resolveUnit(nextWord) || "pc" }
    }
  }

  // Default
  return { qty: 1, unit: "pc" }
}

// ── Resolve unit string ───────────────────────────────────
export function resolveUnit(raw) {
  if (!raw) return "pc"
  const n = raw.toLowerCase().trim()
  return UNIT_ALIASES[n] || UNIT_ALIASES[n.replace(/s$/, "")] || "pc"
}

// ── Match product against inventory ──────────────────────
// 3-layer matching: alias map → exact name → word-by-word
export function matchProduct(originalText, translatedText, products) {
  if (!products || !products.length) return null

  // Layer 1: check BOTH original and translated against alias map
  // e.g. "kandi pappu" → "toor dal", then find "toor dal" in inventory
  const textsToCheck = [originalText, translatedText].filter(Boolean)

  for (const text of textsToCheck) {
    const lower = text.toLowerCase()
    // Sort aliases longest first so "sona masoori rice" wins over "rice"
    const aliasKeys = Object.keys(GROCERY_ALIASES).sort((a,b) => b.length - a.length)

    for (const alias of aliasKeys) {
      if (lower.includes(alias)) {
        const standardName = GROCERY_ALIASES[alias]
        // Now find standardName in inventory
        const found = products.find(p =>
          p.name.toLowerCase().includes(standardName) ||
          standardName.includes(p.name.toLowerCase())
        )
        if (found) return found
      }
    }
  }

  // Layer 2: direct name match against inventory (exact/partial)
  for (const text of textsToCheck) {
    const t = text.toLowerCase()
    // Exact full name match
    const exact = products.find(p => t.includes(p.name.toLowerCase()))
    if (exact) return exact
  }

  // Layer 3: word-by-word scoring
  let best = null, bestScore = 0
  for (const text of textsToCheck) {
    const t = text.toLowerCase()
    for (const product of products) {
      const name = product.name.toLowerCase()
      const words = name.split(/\s+/)
      let score = 0
      for (const word of words) {
        if (word.length > 2 && t.includes(word)) score += 20
      }
      if (product.sku && t.includes(product.sku.toLowerCase())) score += 50
      if (score > bestScore) { bestScore = score; best = product }
    }
  }
  return bestScore > 15 ? best : null
}

// ── Full parse ────────────────────────────────────────────
export function parseVoiceCommand(originalText, translatedText, products) {
  // Apply alias map to translated text first
  const aliasedText = applyGroceryAliases(translatedText || originalText)
  const { qty, unit } = parseQuantity(aliasedText || translatedText || originalText)
  const action  = detectAction(aliasedText || translatedText || originalText)

  // Match product using all three layers
  const product = matchProduct(originalText, aliasedText || translatedText, products)

  // Extract spoken product name for display
  let productName = product?.name || null
  if (!productName) {
    // Try alias resolution first
    productName = resolveGroceryName(originalText) || resolveGroceryName(translatedText)
  }
  if (!productName || productName === originalText) {
    // Fall back: extract noun from translated text
    const stopWords = new Set([
      "add","to","bill","invoice","the","a","an","of","in","for","and","please",
      "karo","daalo","cheyyi","pannu","hakku","mein","ko","se","ka","ki","ke",
      "lo","do","de","hai","hain","kya","bill","invoice",
      ...Object.values(UNIT_ALIASES),
    ])
    const words = (aliasedText || translatedText || "").toLowerCase().split(/\s+/)
    const nouns = words.filter(w => w.length > 2 && !stopWords.has(w) && isNaN(w))
    productName = nouns.slice(0, 3).join(" ") || "Unknown product"
  }

  return {
    action,
    product,
    productName,
    qty,
    unit,
    originalText,
    translatedText: aliasedText || translatedText,
    confidence: product ? "high" : productName !== "Unknown product" ? "medium" : "low",
  }
}

// ── Voice confirmation message ────────────────────────────
export function formatConfirmation(parsed, lang = "en-IN") {
  const { action, productName, qty, unit } = parsed
  const msgs = {
    ADD_BILL: {
      "hi-IN": `${productName} ${qty} ${unit} bill mein add kiya`,
      "te-IN": `${productName} ${qty} ${unit} bill lo add chesamu`,
      "ta-IN": `${productName} ${qty} ${unit} bill la serthu`,
      "kn-IN": `${productName} ${qty} ${unit} bill ge serichenvu`,
      "ml-IN": `${productName} ${qty} ${unit} bill il chertthu`,
      "mr-IN": `${productName} ${qty} ${unit} bill madhe add kele`,
      "bn-IN": `${productName} ${qty} ${unit} bill e add kora hoyeche`,
      "en-IN": `Added ${qty} ${unit} of ${productName} to bill`,
    },
    STOCK_QUERY: {
      "hi-IN": `${productName} ka stock check kar raha hoon`,
      "te-IN": `${productName} stock chektu unnam`,
      "en-IN": `Checking stock for ${productName}`,
    },
    ADD_STOCK: {
      "hi-IN": `${productName} ka ${qty} ${unit} stock mein add kiya`,
      "te-IN": `${productName} ${qty} ${unit} stock lo add chesamu`,
      "en-IN": `Added ${qty} ${unit} of ${productName} to stock`,
    },
    REMOVE_STOCK: {
      "hi-IN": `${productName} se ${qty} ${unit} hataya`,
      "en-IN": `Removed ${qty} ${unit} of ${productName}`,
    },
  }
  const actionMsgs = msgs[action] || msgs.ADD_BILL
  return actionMsgs[lang] || actionMsgs["en-IN"]
}
