// ── Voice NLP Parser ──────────────────────────────────────
import { NUMBER_WORDS, UNIT_ALIASES, ACTION_KEYWORDS } from "./languages.js"
import { applyGroceryAliases, resolveGroceryName, GROCERY_ALIASES } from "./groceryAliases.js"
import { phoneticMatch, getConfidenceLevel } from "./phonetic.js"
import { getFrequencyBoost, findCorrection, recordProductUse } from "./sessionMemory.js"

// Re-export so VoiceAgent can import everything from one place
export { applyGroceryAliases } from "./groceryAliases.js"

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
  const digitMatch = t.match(/(\d+\.?\d*)\s*(kg|g|l|ml|ltr|litre|liter|piece|pcs|pc|packet|pack|bottle|box|bag|kilo|gram|dozen|doz|darjan|set|sets)?/i)
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
// 5-layer matching with confidence scoring:
// 1. Community corrections (vendor's own fixes)
// 2. Alias map (regional name dictionary)
// 3. Exact/partial name match
// 4. Word-by-word scoring + frequency boost
// 5. Phonetic matching (fuzzy brand names)
export function matchProduct(originalText, translatedText, products) {
  if (!products || !products.length) return null

  const textsToCheck = [originalText, translatedText].filter(Boolean)

  // ── Layer 0: Community corrections (highest priority) ──
  for (const text of textsToCheck) {
    const corrected = findCorrection(text)
    if (corrected) {
      const found = products.find(p =>
        p.name.toLowerCase() === corrected.toLowerCase() ||
        p.name.toLowerCase().includes(corrected.toLowerCase())
      )
      if (found) return { ...found, _confidence: 0.99, _method: "correction" }
    }
  }

  // ── Layer 1: Alias map ──────────────────────────────────
  for (const text of textsToCheck) {
    const lower = text.toLowerCase()
    const aliasKeys = Object.keys(GROCERY_ALIASES).sort((a,b) => b.length - a.length)
    for (const alias of aliasKeys) {
      if (lower.includes(alias)) {
        const standardName = GROCERY_ALIASES[alias]
        const found = products.find(p =>
          p.name.toLowerCase().includes(standardName) ||
          standardName.includes(p.name.toLowerCase())
        )
        if (found) return { ...found, _confidence: 0.95, _method: "alias" }
      }
    }
  }

  // ── Layer 2: Direct exact/partial name match ────────────
  for (const text of textsToCheck) {
    const t = text.toLowerCase()
    const exact = products.find(p => t.includes(p.name.toLowerCase()))
    if (exact) return { ...exact, _confidence: 0.90, _method: "exact" }
  }

  // ── Layer 3: Word scoring + frequency boost ─────────────
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
      // Session frequency boost — products used more today score higher
      score += getFrequencyBoost(product.id, product.name)
      if (score > bestScore) { bestScore = score; best = product }
    }
  }
  if (bestScore > 15 && best) {
    const confidence = Math.min(0.88, 0.50 + (bestScore / 120))
    return { ...best, _confidence: confidence, _method: "word-score" }
  }

  // ── Layer 4: Phonetic matching ──────────────────────────
  const productNames = products.map(p => p.name)
  for (const text of textsToCheck) {
    const phoneticResult = phoneticMatch(text, productNames)
    if (phoneticResult) {
      const found = products.find(p => p.name === phoneticResult.product)
      if (found) return { ...found, _confidence: phoneticResult.confidence, _method: "phonetic" }
    }
  }

  return null
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
      // Hindi
      "karo","daalo","mein","ko","se","ka","ki","ke","lo","do","de","hai","hain","kya","aur","bhi","yeh","woh",
      // Telugu
      "cheyyi","lo","add","chesamu","ichha","ivvu","mariyu","inkaa","kooda",
      // Tamil
      "pannu","la","seer","poddu","mattum","um","ku","add",
      // Kannada
      "hakku","ge","seri","mattu","kuda",
      // Bengali
      "koro","te","aar","ebong","dao",
      // Marathi
      "kar","madhye","ani","please","ghya",
      // Gujarati
      "karo","ma","ane","nakho","laav",
      // Punjabi
      "karo","vich","te","tey","add",
      // Malayalam
      "cheyyu","il","um","kku","aayi",
      "bill","invoice",
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

// ── Split multi-product utterance into segments ───────────
// Handles: "rendu palu, okati uppu, aidu biscuit"
// or: "do doodh aur ek namak aur paanch biscuit"
// Returns array of raw text segments, each containing one product
export function splitMultiProduct(text) {
  if (!text) return [text]

  // Split on connectors: aur, and, comma, semicolon, also, plus
  // Telugu: mariyu, inkaa, kooda
  // Tamil: mattum, um
  // Kannada: mattu, kuda
  const connectors = /\s*(?:,|;|aur|and|also|plus|mariyu|inkaa|kooda|mattu|kuda|mattum|\bum\b)\s*/gi
  const segments = text.split(connectors).map(s => s.trim()).filter(s => s.length > 1)
  return segments.length > 0 ? segments : [text]
}

// ── Parse multiple products from one utterance ────────────
// Returns array of { qty, unit, rawText } for each segment
export function parseMultipleProducts(text, translatedText, products) {
  const origSegments = splitMultiProduct(text)
  const transSegments = splitMultiProduct(translatedText)

  // Use whichever gave more segments (better split)
  const segments = origSegments.length >= transSegments.length ? origSegments : transSegments

  return segments.map((seg, i) => {
    // Use corresponding segment from other language if available
    const origSeg = origSegments[i] || seg
    const transSeg = transSegments[i] || seg

    const aliased = applyGroceryAliases(transSeg || origSeg)
    const { qty, unit } = parseQuantity(aliased || transSeg || origSeg)
    const action = detectAction(aliased || transSeg || origSeg)
    const product = matchProduct(origSeg, aliased || transSeg, products)

    let productName = product?.name || null
    if (!productName) {
      productName = resolveGroceryName(origSeg) || resolveGroceryName(transSeg)
    }
    if (!productName) {
      const stopWords = new Set(["add","to","bill","the","a","an","of","and","please","karo","daalo","cheyyi","pannu","mein","ko","ka","ki","ke","hai","do","ek","teen","char","aur","lo","de","karo","koru","koro","cheyyu","kar","nakho","kku","ge","la","te","vich","il","madhye","ma","pannu","hakku","seri"])
      const words = (aliased || transSeg || "").toLowerCase().split(/\s+/)
      productName = words.find(w => w.length > 2 && !stopWords.has(w)) || seg
    }

    return { qty, unit, rawText: origSeg, translatedText: transSeg, product, productName, action }
  }).filter(r => r.productName || r.product)
}
