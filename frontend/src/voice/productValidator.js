// ── Indian Grocery Product Database ──────────────────────
// Used to validate if a spoken product actually exists
// before adding to inventory

export const KNOWN_PRODUCTS = [
  // ── Dairy ─────────────────────────────────────────────
  { name:"Amul Milk", variants:["500ml","1L","2L","5L"], unit:"litre", category:"Dairy", gst:0 },
  { name:"Aavin Milk", variants:["500ml","1L","2L"], unit:"litre", category:"Dairy", gst:0 },
  { name:"Amul Butter", variants:["100g","500g"], unit:"g", category:"Dairy", gst:12 },
  { name:"Amul Cheese", variants:["200g","400g"], unit:"g", category:"Dairy", gst:12 },
  { name:"Amul Ghee", variants:["500ml","1L","5L"], unit:"litre", category:"Dairy", gst:12 },
  { name:"Mother Dairy Milk", variants:["500ml","1L"], unit:"litre", category:"Dairy", gst:0 },
  { name:"Nestle Milkmaid", variants:["400g","1kg"], unit:"g", category:"Dairy", gst:5 },
  { name:"Amul Curd", variants:["200g","400g","1kg"], unit:"g", category:"Dairy", gst:5 },
  { name:"Amul Paneer", variants:["200g","500g"], unit:"g", category:"Dairy", gst:5 },

  // ── Staples ───────────────────────────────────────────
  { name:"Tata Salt", variants:["1kg","2kg","500g"], unit:"kg", category:"Staples", gst:5 },
  { name:"Fortune Salt", variants:["1kg","2kg"], unit:"kg", category:"Staples", gst:5 },
  { name:"Aashirvaad Atta", variants:["1kg","2kg","5kg","10kg"], unit:"kg", category:"Staples", gst:0 },
  { name:"Pillsbury Atta", variants:["1kg","2kg","5kg"], unit:"kg", category:"Staples", gst:0 },
  { name:"Fortune Atta", variants:["1kg","5kg","10kg"], unit:"kg", category:"Staples", gst:0 },
  { name:"Shakti Bhog Atta", variants:["5kg","10kg"], unit:"kg", category:"Staples", gst:0 },
  { name:"Rajdhani Besan", variants:["500g","1kg"], unit:"kg", category:"Staples", gst:5 },
  { name:"MDH Besan", variants:["500g","1kg"], unit:"kg", category:"Staples", gst:5 },
  { name:"India Gate Basmati Rice", variants:["1kg","5kg","10kg","25kg"], unit:"kg", category:"Staples", gst:5 },
  { name:"Daawat Basmati Rice", variants:["1kg","5kg","10kg"], unit:"kg", category:"Staples", gst:5 },
  { name:"Sona Masoori Rice", variants:["1kg","5kg","10kg","25kg"], unit:"kg", category:"Staples", gst:5 },
  { name:"Ponni Rice", variants:["1kg","5kg","10kg"], unit:"kg", category:"Staples", gst:5 },
  { name:"Toor Dal", variants:["500g","1kg","2kg","5kg"], unit:"kg", category:"Staples", gst:5 },
  { name:"Moong Dal", variants:["500g","1kg","2kg"], unit:"kg", category:"Staples", gst:5 },
  { name:"Chana Dal", variants:["500g","1kg","2kg"], unit:"kg", category:"Staples", gst:5 },
  { name:"Urad Dal", variants:["500g","1kg","2kg"], unit:"kg", category:"Staples", gst:5 },
  { name:"Masoor Dal", variants:["500g","1kg"], unit:"kg", category:"Staples", gst:5 },
  { name:"Rajma", variants:["500g","1kg"], unit:"kg", category:"Staples", gst:5 },
  { name:"Sugar", variants:["1kg","2kg","5kg"], unit:"kg", category:"Staples", gst:5 },
  { name:"Jaggery", variants:["500g","1kg","2kg"], unit:"kg", category:"Staples", gst:5 },

  // ── Oils ──────────────────────────────────────────────
  { name:"Fortune Sunflower Oil", variants:["1L","2L","5L","15L"], unit:"litre", category:"Oils", gst:5 },
  { name:"Saffola Gold Oil", variants:["1L","2L","5L"], unit:"litre", category:"Oils", gst:5 },
  { name:"Sundrop Oil", variants:["1L","2L","5L"], unit:"litre", category:"Oils", gst:5 },
  { name:"Parachute Coconut Oil", variants:["200ml","500ml","1L"], unit:"litre", category:"Oils", gst:5 },
  { name:"Patanjali Mustard Oil", variants:["1L","2L","5L"], unit:"litre", category:"Oils", gst:5 },
  { name:"Engine Brand Groundnut Oil", variants:["1L","5L"], unit:"litre", category:"Oils", gst:5 },

  // ── Beverages ─────────────────────────────────────────
  { name:"Tata Tea Gold", variants:["100g","250g","500g","1kg"], unit:"g", category:"Beverages", gst:5 },
  { name:"Red Label Tea", variants:["100g","250g","500g","1kg"], unit:"g", category:"Beverages", gst:5 },
  { name:"Three Roses Tea", variants:["100g","250g","500g"], unit:"g", category:"Beverages", gst:5 },
  { name:"Bru Coffee", variants:["50g","100g","200g"], unit:"g", category:"Beverages", gst:5 },
  { name:"Nescafe Classic", variants:["50g","100g","200g"], unit:"g", category:"Beverages", gst:5 },
  { name:"Horlicks", variants:["200g","500g","1kg"], unit:"g", category:"Beverages", gst:18 },
  { name:"Bournvita", variants:["200g","500g","1kg"], unit:"g", category:"Beverages", gst:18 },
  { name:"Complan", variants:["200g","500g"], unit:"g", category:"Beverages", gst:18 },
  { name:"Coca Cola", variants:["250ml","500ml","1L","2L"], unit:"litre", category:"Beverages", gst:28 },
  { name:"Pepsi", variants:["250ml","500ml","1L","2L"], unit:"litre", category:"Beverages", gst:28 },
  { name:"Sprite", variants:["250ml","500ml","1L","2L"], unit:"litre", category:"Beverages", gst:28 },
  { name:"Frooti", variants:["200ml","500ml","1L"], unit:"litre", category:"Beverages", gst:12 },
  { name:"Real Juice", variants:["200ml","1L"], unit:"litre", category:"Beverages", gst:12 },

  // ── Snacks ────────────────────────────────────────────
  { name:"Parle-G Biscuits", variants:["100g","200g","500g","1kg"], unit:"g", category:"Snacks", gst:12 },
  { name:"Britannia Good Day", variants:["100g","200g"], unit:"g", category:"Snacks", gst:12 },
  { name:"Sunfeast Marie", variants:["100g","200g","400g"], unit:"g", category:"Snacks", gst:12 },
  { name:"Maggi Noodles", variants:["70g","140g","280g","420g"], unit:"g", category:"Snacks", gst:12 },
  { name:"Yippee Noodles", variants:["70g","140g"], unit:"g", category:"Snacks", gst:12 },
  { name:"Lays Chips", variants:["26g","52g","78g"], unit:"g", category:"Snacks", gst:12 },
  { name:"Kurkure", variants:["22g","50g","100g"], unit:"g", category:"Snacks", gst:12 },
  { name:"Haldirams Bhujia", variants:["200g","400g","1kg"], unit:"g", category:"Snacks", gst:12 },

  // ── Personal Care ─────────────────────────────────────
  { name:"Colgate Toothpaste", variants:["50g","100g","200g","500g"], unit:"g", category:"Personal Care", gst:18 },
  { name:"Pepsodent Toothpaste", variants:["80g","150g","300g"], unit:"g", category:"Personal Care", gst:18 },
  { name:"Lux Soap", variants:["100g","150g"], unit:"g", category:"Personal Care", gst:18 },
  { name:"Lifebuoy Soap", variants:["100g","125g"], unit:"g", category:"Personal Care", gst:18 },
  { name:"Dettol Soap", variants:["75g","125g"], unit:"g", category:"Personal Care", gst:18 },
  { name:"Dove Soap", variants:["100g","135g"], unit:"g", category:"Personal Care", gst:18 },
  { name:"Head Shoulders Shampoo", variants:["72ml","180ml","340ml"], unit:"ml", category:"Personal Care", gst:18 },
  { name:"Clinic Plus Shampoo", variants:["80ml","175ml","340ml"], unit:"ml", category:"Personal Care", gst:18 },
  { name:"Pantene Shampoo", variants:["75ml","180ml","340ml"], unit:"ml", category:"Personal Care", gst:18 },
  { name:"Parachute Hair Oil", variants:["100ml","200ml","500ml"], unit:"ml", category:"Personal Care", gst:18 },
  { name:"Surf Excel", variants:["500g","1kg","2kg","4kg"], unit:"kg", category:"Personal Care", gst:18 },
  { name:"Ariel Detergent", variants:["500g","1kg","2kg"], unit:"kg", category:"Personal Care", gst:18 },
  { name:"Vim Dishwash", variants:["200g","500g","1kg"], unit:"g", category:"Personal Care", gst:18 },
  { name:"Harpic Toilet Cleaner", variants:["500ml","1L"], unit:"litre", category:"Personal Care", gst:18 },
]

// ── Aliases for common spoken names ───────────────────────
const SPOKEN_ALIASES = {
  "amul milk":        "Amul Milk",
  "aavin milk":       "Aavin Milk",
  "tata salt":        "Tata Salt",
  "tata tea":         "Tata Tea Gold",
  "red label":        "Red Label Tea",
  "three roses":      "Three Roses Tea",
  "parle g":          "Parle-G Biscuits",
  "parle-g":          "Parle-G Biscuits",
  "glucose biscuit":  "Parle-G Biscuits",
  "maggi":            "Maggi Noodles",
  "bournvita":        "Bournvita",
  "horlicks":         "Horlicks",
  "colgate":          "Colgate Toothpaste",
  "pepsodent":        "Pepsodent Toothpaste",
  "surf excel":       "Surf Excel",
  "ariel":            "Ariel Detergent",
  "lux":              "Lux Soap",
  "lifebuoy":         "Lifebuoy Soap",
  "dettol soap":      "Dettol Soap",
  "dove":             "Dove Soap",
  "head shoulders":   "Head Shoulders Shampoo",
  "clinic plus":      "Clinic Plus Shampoo",
  "pantene":          "Pantene Shampoo",
  "fortune oil":      "Fortune Sunflower Oil",
  "saffola":          "Saffola Gold Oil",
  "parachute":        "Parachute Coconut Oil",
  "parachute oil":    "Parachute Hair Oil",
  "india gate":       "India Gate Basmati Rice",
  "daawat":           "Daawat Basmati Rice",
  "aashirvaad":       "Aashirvaad Atta",
  "pillsbury":        "Pillsbury Atta",
  "frooti":           "Frooti",
  "coke":             "Coca Cola",
  "coca cola":        "Coca Cola",
  "pepsi":            "Pepsi",
  "sprite":           "Sprite",
}

// ── Fuzzy match score between two strings ─────────────────
function similarity(a, b) {
  a = a.toLowerCase().trim()
  b = b.toLowerCase().trim()
  if (a === b) return 1
  if (b.includes(a) || a.includes(b)) return 0.9
  const aWords = new Set(a.split(/\s+/))
  const bWords = new Set(b.split(/\s+/))
  const intersection = [...aWords].filter(w => bWords.has(w) && w.length > 2)
  const union = new Set([...aWords, ...bWords])
  return intersection.length / Math.max(union.size * 0.5, 1)
}

// ── Main validator ────────────────────────────────────────
export function validateProduct(spokenText) {
  const text = spokenText.toLowerCase().trim()

  // 1. Check aliases first
  for (const [alias, name] of Object.entries(SPOKEN_ALIASES)) {
    if (text.includes(alias)) {
      const product = KNOWN_PRODUCTS.find(p => p.name === name)
      if (product) return { found: true, product, confidence: "high" }
    }
  }

  // 2. Fuzzy match against known products
  let best = null, bestScore = 0
  for (const product of KNOWN_PRODUCTS) {
    const score = similarity(text, product.name)
    if (score > bestScore) { bestScore = score; best = product }

    // Also check words in product name
    const nameWords = product.name.toLowerCase().split(/\s+/)
    for (const word of nameWords) {
      if (word.length > 3 && text.includes(word)) {
        const ws = 0.6 + (word.length / product.name.length) * 0.3
        if (ws > bestScore) { bestScore = ws; best = product }
      }
    }
  }

  if (bestScore > 0.7) return { found: true, product: best, confidence: "high" }
  if (bestScore > 0.4) return { found: true, product: best, confidence: "medium" }

  // 3. Not found in database
  return { found: false, product: null, confidence: "low" }
}

// ── Extract variant (size) from spoken text ───────────────
export function extractVariant(text, product) {
  if (!product) return null
  const t = text.toLowerCase()
  for (const v of (product.variants || [])) {
    if (t.includes(v.toLowerCase())) return v
  }
  return null
}

// ── Build standard product name with variant ──────────────
export function buildProductName(product, variant) {
  if (!variant) return product.name
  return `${product.name} ${variant}`
}
