// ── Indian Grocery Alias Dictionary ───────────────────────
// Maps local/regional names → standard product names
// This runs BEFORE translation so Google Translate's generic
// translations don't confuse common grocery items
//
// Key  = what vendor says (original OR translated)
// Value = standard product name to search in inventory

export const GROCERY_ALIASES = {

  // ══════════════════════════════════════════════════════
  // DALS / LENTILS
  // ══════════════════════════════════════════════════════

  // Toor Dal / Kandi Pappu
  "kandi pappu":       "toor dal",
  "kandi":             "toor dal",
  "togari bele":       "toor dal",   // Kannada
  "tuvaram paruppu":   "toor dal",   // Tamil
  "arhar dal":         "toor dal",   // Hindi
  "tur dal":           "toor dal",
  "toor dal":          "toor dal",
  "lentils":           "toor dal",   // Google Translate gives this for kandi pappu
  "lentil":            "toor dal",
  "pigeon pea":        "toor dal",

  // Moong Dal
  "pesara pappu":      "moong dal",  // Telugu
  "hesaru bele":       "moong dal",  // Kannada
  "pachai payaru":     "moong dal",  // Tamil
  "moong":             "moong dal",
  "mung dal":          "moong dal",
  "green gram":        "moong dal",
  "mung bean":         "moong dal",

  // Chana Dal
  "senaga pappu":      "chana dal",  // Telugu
  "kadale bele":       "chana dal",  // Kannada
  "kadalai paruppu":   "chana dal",  // Tamil
  "bengal gram":       "chana dal",
  "split chickpea":    "chana dal",

  // Urad Dal
  "minapa pappu":      "urad dal",   // Telugu
  "uddina bele":       "urad dal",   // Kannada
  "ulundu paruppu":    "urad dal",   // Tamil
  "black gram":        "urad dal",
  "urid dal":          "urad dal",

  // Masoor Dal
  "masoor":            "masoor dal",
  "red lentil":        "masoor dal",
  "red lentils":       "masoor dal",
  "lal dal":           "masoor dal",

  // Rajma
  "rajma":             "rajma",
  "kidney bean":       "rajma",
  "kidney beans":      "rajma",
  "red kidney beans":  "rajma",

  // Chana / Chickpeas
  "kabuli chana":      "chana",
  "chickpea":          "chana",
  "chickpeas":         "chana",
  "white chickpeas":   "chana",
  "chole":             "chana",

  // ══════════════════════════════════════════════════════
  // RICE
  // ══════════════════════════════════════════════════════
  "biyyam":            "rice",       // Telugu
  "akki":              "rice",       // Kannada
  "arisi":             "rice",       // Tamil
  "chawal":            "rice",       // Hindi
  "bhat":              "rice",       // Marathi/Bengali
  "chaaval":           "rice",

  "sona masoori":      "sona masoori rice",
  "sona masuri":       "sona masoori rice",
  "basmati":           "basmati rice",
  "ponni":             "ponni rice",  // Tamil Nadu rice
  "raw rice":          "raw rice",
  "boiled rice":       "boiled rice",
  "idli rice":         "idli rice",
  "dosa rice":         "dosa rice",

  // ══════════════════════════════════════════════════════
  // WHEAT / FLOUR
  // ══════════════════════════════════════════════════════
  "goduma":            "wheat",      // Telugu
  "godhuma pindi":     "wheat flour",// Telugu
  "atta":              "wheat flour",
  "aata":              "wheat flour",
  "maida":             "maida",
  "refined flour":     "maida",
  "all purpose flour": "maida",
  "gothambu podi":     "wheat flour",// Malayalam
  "godhi hittu":       "wheat flour",// Kannada

  // ══════════════════════════════════════════════════════
  // OIL
  // ══════════════════════════════════════════════════════
  "nune":              "oil",        // Telugu
  "oil":               "oil",
  "sunflower oil":     "sunflower oil",
  "palakaya nune":     "coconut oil",// Telugu
  "thengai ennai":     "coconut oil",// Tamil
  "nariyal tel":       "coconut oil",// Hindi
  "coconut oil":       "coconut oil",
  "groundnut oil":     "groundnut oil",
  "peanut oil":        "groundnut oil",
  "mustard oil":       "mustard oil",
  "sesame oil":        "sesame oil",
  "gingelly oil":      "sesame oil", // Tamil name
  "palm oil":          "palm oil",
  "vanaspati":         "vanaspati",
  "dalda":             "vanaspati",

  // ══════════════════════════════════════════════════════
  // SUGAR / SALT / SPICES
  // ══════════════════════════════════════════════════════
  "bellam":            "jaggery",    // Telugu
  "vellam":            "jaggery",    // Tamil
  "gur":               "jaggery",    // Hindi
  "gud":               "jaggery",
  "jaggery":           "jaggery",
  "brown sugar":       "jaggery",

  "uppu":              "salt",       // Telugu/Tamil
  "uppu":              "salt",
  "namak":             "salt",       // Hindi
  "melagu":            "pepper",     // Tamil
  "miriyalu":          "pepper",     // Telugu
  "kali mirch":        "black pepper",

  "mirchi":            "chilli",
  "mirchi podi":       "chilli powder",
  "red chilli":        "red chilli",
  "red chili":         "red chilli",
  "green chilli":      "green chilli",
  "haldi":             "turmeric",
  "pasupu":            "turmeric",   // Telugu
  "manjal":            "turmeric",   // Tamil
  "turmeric":          "turmeric",
  "turmeric powder":   "turmeric powder",
  "dhania":            "coriander",
  "kothamalli":        "coriander",  // Tamil
  "kothimera":         "coriander",  // Telugu
  "jeera":             "cumin",
  "jilakarra":         "cumin",      // Telugu
  "seeragam":          "cumin",      // Tamil
  "cumin":             "cumin",
  "cumin seeds":       "cumin",
  "mustard":           "mustard seeds",
  "avalu":             "mustard seeds",// Telugu
  "kadugu":            "mustard seeds",// Tamil
  "rai":               "mustard seeds",// Hindi

  // ══════════════════════════════════════════════════════
  // VEGETABLES
  // ══════════════════════════════════════════════════════
  "tomato":            "tomato",
  "tomatoes":          "tomato",
  "tamatar":           "tomato",     // Hindi
  "tomata":            "tomato",     // Telugu colloquial
  "thakkali":          "tomato",     // Tamil

  "aloo":              "potato",     // Hindi
  "potato":            "potato",
  "potatoes":          "potato",
  "bangaladumpa":      "potato",     // Telugu
  "bangala dumpa":     "potato",
  "urulaikizhangu":    "potato",     // Tamil

  "pyaz":              "onion",      // Hindi
  "vengayam":          "onion",      // Tamil
  "ulli":              "onion",      // Telugu/Kannada
  "onion":             "onion",
  "onions":            "onion",
  "eerulli":           "onion",      // Kannada

  "palakura":          "spinach",    // Telugu
  "pasalai keerai":    "spinach",    // Tamil
  "palak":             "spinach",    // Hindi
  "spinach":           "spinach",

  "vankaya":           "brinjal",    // Telugu
  "kathirikai":        "brinjal",    // Tamil
  "baingan":           "brinjal",    // Hindi
  "eggplant":          "brinjal",
  "brinjal":           "brinjal",

  "bendakaya":         "okra",       // Telugu
  "vendaikkai":        "okra",       // Tamil
  "bhindi":            "okra",       // Hindi
  "ladies finger":     "okra",
  "okra":              "okra",

  "dondakaya":         "ivy gourd",  // Telugu
  "tindora":           "ivy gourd",  // Hindi
  "kovakkai":          "ivy gourd",  // Tamil

  "carrot":            "carrot",
  "gajar":             "carrot",     // Hindi
  "gajjara":           "carrot",     // Telugu colloquial

  "capsicum":          "capsicum",
  "bell pepper":       "capsicum",
  "donne mirchi":      "capsicum",   // Kannada
  "kudamilagai":       "capsicum",   // Tamil

  // ══════════════════════════════════════════════════════
  // DAIRY
  // ══════════════════════════════════════════════════════
  "palu":              "milk",       // Telugu
  "paal":              "milk",       // Tamil
  "doodh":             "milk",       // Hindi
  "milk":              "milk",
  "aavin milk":        "aavin milk",

  "perugu":            "curd",       // Telugu
  "thayir":            "curd",       // Tamil
  "dahi":              "curd",       // Hindi
  "curd":              "curd",
  "yogurt":            "curd",

  "venna":             "butter",     // Telugu
  "vennai":            "butter",     // Tamil
  "makhan":            "butter",     // Hindi
  "butter":            "butter",
  "amul butter":       "amul butter",

  "paneer":            "paneer",
  "cottage cheese":    "paneer",

  "ghee":              "ghee",
  "neyyi":             "ghee",       // Telugu
  "nei":               "ghee",       // Tamil

  // ══════════════════════════════════════════════════════
  // COMMON PACKAGED GOODS
  // ══════════════════════════════════════════════════════
  "biscuit":           "biscuits",
  "parle g":           "parle-g",
  "parleg":            "parle-g",
  "glucose biscuit":   "parle-g",

  "maggi":             "maggi noodles",
  "noodles":           "maggi noodles",
  "instant noodles":   "maggi noodles",

  "tea":               "tea",
  "chai":              "tea",
  "tata tea":          "tata tea",
  "red label":         "red label tea",
  "three roses":       "three roses tea",

  "coffee":            "coffee",
  "filter coffee":     "coffee",
  "bru":               "bru coffee",
  "nescafe":           "nescafe",

  "soap":              "soap",
  "sabun":             "soap",       // Hindi
  "savon":             "soap",

  "shampoo":           "shampoo",
  "toothpaste":        "toothpaste",
  "paste":             "toothpaste",
  "colgate":           "colgate",
  "pepsodent":         "pepsodent",

  "detergent":         "detergent",
  "surf":              "surf excel",
  "ariel":             "ariel",
  "rin":               "rin",
  "washing powder":    "washing powder",

  // ══════════════════════════════════════════════════════
  // FRUITS
  // ══════════════════════════════════════════════════════
  "aratipandu":        "banana",     // Telugu
  "vazhaipazham":      "banana",     // Tamil
  "kela":              "banana",     // Hindi
  "banana":            "banana",
  "bananas":           "banana",

  "apple":             "apple",
  "apples":            "apple",
  "seb":               "apple",      // Hindi

  "orange":            "orange",
  "narangi":           "orange",     // Hindi
  "kittaley hannu":    "orange",     // Kannada

  "mango":             "mango",
  "mamidi pandu":      "mango",      // Telugu
  "manga":             "mango",      // Tamil/Malayalam
  "aam":               "mango",      // Hindi

  "grapes":            "grapes",
  "draksha":           "grapes",     // Telugu
  "angoor":            "grapes",     // Hindi

  "watermelon":        "watermelon",
  "puchakaya":         "watermelon", // Telugu
  "tarbuj":            "watermelon", // Hindi
}

// ── Apply alias lookup to translated text ─────────────────
// Checks both original and translated text for known aliases
export function applyGroceryAliases(text) {
  if (!text) return text
  const lower = text.toLowerCase().trim()

  // Try full phrase match first (longer matches win)
  const sorted = Object.keys(GROCERY_ALIASES).sort((a, b) => b.length - a.length)
  for (const alias of sorted) {
    if (lower.includes(alias)) {
      return text.toLowerCase().replace(alias, GROCERY_ALIASES[alias])
    }
  }
  return text
}

// ── Get standard name for a spoken term ──────────────────
export function resolveGroceryName(text) {
  if (!text) return text
  const lower = text.toLowerCase().trim()
  const sorted = Object.keys(GROCERY_ALIASES).sort((a,b) => b.length - a.length)
  for (const alias of sorted) {
    if (lower.includes(alias)) return GROCERY_ALIASES[alias]
  }
  return text
}
