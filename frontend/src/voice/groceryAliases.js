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

  // ══════════════════════════════════════════════════════
  // GUJARATI
  // ══════════════════════════════════════════════════════
  "bhaat":             "rice",       // Gujarati
  "rotlo":             "wheat flour",// Gujarati
  "ghau no lot":       "wheat flour",// Gujarati
  "doodh":             "milk",       // shared Hindi/Gujarati
  "dahi":              "curd",       // shared Hindi/Gujarati
  "maka":              "maize",      // Gujarati
  "kanda":             "onion",      // Gujarati/Marathi
  "bateta":            "potato",     // Gujarati
  "tameta":            "tomato",     // Gujarati
  "marcha":            "chilli",     // Gujarati
  "lasan":             "garlic",     // Gujarati
  "marchu":            "chilli powder",// Gujarati
  "tel":               "oil",        // Gujarati/Telugu shared
  "khaand":            "sugar",      // Gujarati
  "meth":              "fenugreek",  // Gujarati
  "methi":             "fenugreek",  // Gujarati/Hindi
  "dhana":             "coriander",  // Gujarati
  "jeeru":             "cumin",      // Gujarati

  // ══════════════════════════════════════════════════════
  // PUNJABI
  // ══════════════════════════════════════════════════════
  "sarson":            "mustard seeds",// Punjabi/Hindi
  "makki di roti":     "maize flour",  // Punjabi
  "makki":             "maize flour",  // Punjabi
  "sarson da saag":    "spinach",      // Punjabi
  "shakkhar":          "sugar",        // Punjabi
  "gehun":             "wheat",        // Punjabi/Hindi
  "makkhan":           "butter",       // Punjabi
  "lassi":             "curd",         // Punjabi
  "chawal":            "rice",         // Punjabi/Hindi (already mapped above, safe duplicate)
  "kanak":             "wheat",        // Punjabi

  // ══════════════════════════════════════════════════════
  // MARATHI
  // ══════════════════════════════════════════════════════
  "tandool":           "rice",         // Marathi
  "tandu":             "rice",         // Marathi colloquial
  "pith":              "wheat flour",  // Marathi
  "gavhache pith":     "wheat flour",  // Marathi
  "kaanda":            "onion",        // Marathi
  "batata":            "potato",       // Marathi
  "tomato":            "tomato",       // universal
  "mirchi pud":        "chilli powder",// Marathi
  "halad":             "turmeric",     // Marathi
  "kothimbir":         "coriander",    // Marathi
  "jeera":             "cumin",        // shared
  "mohari":            "mustard seeds",// Marathi
  "hing":              "asafoetida",   // shared
  "shengdana":         "groundnut",    // Marathi
  "khobra":            "coconut",      // Marathi
  "narali":            "coconut",      // Marathi
  "dahi":              "curd",         // shared
  "takka":             "curd",         // Marathi (thin curd/buttermilk)

  // ══════════════════════════════════════════════════════
  // BENGALI
  // ══════════════════════════════════════════════════════
  "chaal":             "rice",         // Bengali
  "aata":              "wheat flour",  // Bengali/Hindi
  "daal":              "lentils",      // Bengali
  "musur dal":         "masoor dal",   // Bengali
  "moong dal":         "moong dal",    // universal
  "chhola":            "chana",        // Bengali
  "alu":               "potato",       // Bengali
  "peyaj":             "onion",        // Bengali
  "begun":             "brinjal",      // Bengali
  "dhone pata":        "coriander",    // Bengali
  "ada":               "ginger",       // Bengali
  "rasun":             "garlic",       // Bengali
  "halud":             "turmeric",     // Bengali
  "lonka guro":        "chilli powder",// Bengali
  "sorisha":           "mustard seeds",// Bengali
  "dudh":              "milk",         // Bengali
  "doi":               "curd",         // Bengali
  "ghee":              "ghee",         // universal

  // ══════════════════════════════════════════════════════
  // MALAYALAM
  // ══════════════════════════════════════════════════════
  "ari":               "rice",         // Malayalam
  "gothambu podi":     "wheat flour",  // Malayalam (already above, safe)
  "payar":             "lentils",      // Malayalam
  "uzhunnu":           "urad dal",     // Malayalam
  "cherupayar":        "moong dal",    // Malayalam
  "kadala":            "chana",        // Malayalam
  "urulakkizhangu":    "potato",       // Malayalam
  "savola":            "onion",        // Malayalam
  "thakkali":          "tomato",       // Malayalam (also Tamil)
  "paav":              "bread",        // Malayalam/Marathi
  "ellum kaya":        "coconut",      // Malayalam
  "venna":             "butter",       // Malayalam/Telugu (already mapped)
  "thenga enna":       "coconut oil",  // Malayalam
  "kaduku":            "mustard seeds",// Malayalam
  "jeerakam":          "cumin",        // Malayalam
  "malli":             "coriander",    // Malayalam
  "manjapu":           "turmeric",     // Malayalam
  "mulaku podi":       "chilli powder",// Malayalam
  "paal":              "milk",         // Malayalam (already above, safe)
  "thayir":            "curd",         // Malayalam/Tamil (already above, safe)

  // ══════════════════════════════════════════════════════
  // PERSONAL CARE & HOUSEHOLD (spoken brand/product names)
  // ══════════════════════════════════════════════════════
  "paste":             "toothpaste",
  "brush":             "toothbrush",
  "sabun":             "soap",
  "kapda dhone ka":    "washing powder",
  "bartan dhone ka":   "dishwash",
  "jhadu":             "broom",
  "pocha":             "mop",
  "agarbatti":         "incense sticks",
  "diya":              "diya",
  "matchbox":          "matches",
  "maachis":           "matches",
  "tissue":            "tissue paper",
  "cotton":            "cotton",

  // ══════════════════════════════════════════════════════
  // SNACKS & NAMKEEN
  // ══════════════════════════════════════════════════════
  "namkeen":           "namkeen",
  "sev":               "sev",
  "bhujia":            "bhujia",
  "chivda":            "chivda",
  "murmura":           "puffed rice",
  "kurmura":           "puffed rice",
  "mamra":             "puffed rice",  // Gujarati
  "popcorn":           "popcorn",
  "chips":             "chips",
  "wafers":            "chips",

  // ══════════════════════════════════════════════════════
  // CIGARETTES & TOBACCO (critical for kirana stores)
  // ══════════════════════════════════════════════════════
  "gold flake":        "Gold Flake Kings",
  "gold flek":         "Gold Flake Kings",
  "goldflek":          "Gold Flake Kings",
  "gold":              "Gold Flake Kings",   // common short form
  "goldu":             "Gold Flake Kings",   // South Indian pronunciation
  "gf":                "Gold Flake Kings",
  "gfk":               "Gold Flake Kings",
  "kings":             "Gold Flake Kings",
  "gold flake special": "Gold Flake Special",
  "gfs":               "Gold Flake Special",
  "classic":           "Classic Milds",
  "classic mild":      "Classic Milds",
  "classic milds":     "Classic Milds",
  "classic cigarette": "Classic Milds",
  "wills":             "Wills Navy Cut",
  "wills navy":        "Wills Navy Cut",
  "navy cut":          "Wills Navy Cut",
  "navy":              "Wills Navy Cut",
  "four square":       "Four Square",
  "4 square":          "Four Square",
  "panama":            "Panama Cigarette",
  "capstan":           "Capstan Cigarette",
  "charms":            "Charms Cigarette",
  "red and white":     "Red & White Cigarette",

  // Bidis
  "bidi":              "bidi",
  "beedi":             "bidi",
  "501 bidi":          "501 Bidi",

  // Gutka / Pan Masala
  "rajnigandha":       "Rajnigandha Pan Masala",
  "rajni":             "Rajnigandha Pan Masala",
  "rajniganda":        "Rajnigandha Pan Masala",
  "tulsi":             "Tulsi Pan Masala",
  "vimal":             "Vimal Pan Masala",
  "manikchand":        "Manikchand",
  "goa":               "Goa Pan Masala",
  "pan parag":         "Pan Parag",
  "panparag":          "Pan Parag",
  "gutka":             "gutka",
  "pan masala":        "pan masala",
  "khaini":            "khaini",
  "zarda":             "zarda",
  "tobacco":           "tobacco",

  // ══════════════════════════════════════════════════════
  // RAJASTHAN / HARYANA regional slang
  // ══════════════════════════════════════════════════════
  "baajra":            "bajra",          // pearl millet
  "bajra":             "bajra",
  "jawar":             "jowar",          // sorghum
  "juwar":             "jowar",
  "gehun":             "wheat",
  "gaehun":            "wheat",
  "makki":             "corn flour",     // Punjabi/Rajasthani
  "makai ka atta":     "corn flour",
  "besan":             "besan",          // already mapped probably — safe to re-add
  "chana atta":        "besan",
  "methi":             "fenugreek",
  "ajwain":            "carom seeds",
  "jeera":             "cumin",
  "zeera":             "cumin",          // common mispronunciation
  "dhaniya":           "coriander",
  "laal mirchi":       "red chilli",
  "hari mirchi":       "green chilli",

  // ══════════════════════════════════════════════════════
  // ODISHA / EASTERN INDIA regional slang
  // ══════════════════════════════════════════════════════
  "chaula":            "rice",           // Odia
  "dali":              "dal",            // Odia (generic dal)
  "tamatar":           "tomato",         // Hindi variant
  "aloo":              "potato",         // Hindi (already common)
  "palak":             "spinach",
  "gobhi":             "cauliflower",
  "phool gobhi":       "cauliflower",
  "bund gobhi":        "cabbage",
  "patta gobhi":       "cabbage",
  "bhindi":            "okra",
  "lady finger":       "okra",
  "tinda":             "tinda",
  "kaddu":             "pumpkin",
  "lauki":             "bottle gourd",
  "ghiya":             "bottle gourd",
  "karela":            "bitter gourd",
  "parwal":            "pointed gourd",
  "seem":              "beans",
  "suran":             "yam",

  // ══════════════════════════════════════════════════════
  // FMCG BRANDS — common short/spoken forms
  // ══════════════════════════════════════════════════════
  // Detergent
  "surf":              "Surf Excel",
  "surfeel":           "Surf Excel",     // common mispronunciation
  "tide":              "Tide Detergent",
  "ariel":             "Ariel Detergent",
  "rin":               "Rin Detergent",
  "wheel":             "Wheel Detergent",
  "nirma":             "Nirma Detergent",

  // Toilet / Floor cleaner
  "harpic":            "Harpic Toilet Cleaner",
  "harpeek":           "Harpic Toilet Cleaner",
  "lizol":             "Lizol Floor Cleaner",
  "lyzol":             "Lizol Floor Cleaner",
  "phenyl":            "phenyl",
  "flinyl":            "phenyl",

  // Dishwash
  "vim":               "Vim Bar",
  "pril":              "Pril Dishwash",
  "exo":               "Exo Dishwash",

  // Hair oil
  "parachute":         "Parachute Coconut Oil",
  "bajaj":             "Bajaj Almond Oil",
  "dabur":             "Dabur Amla Oil",

  // Cream / Lotion
  "fair lovely":       "Fair & Lovely Cream",
  "fair and lovely":   "Fair & Lovely Cream",
  "glow lovely":       "Glow & Lovely Cream",
  "vaseline":          "Vaseline",
  "ponds":             "Ponds Cream",
  "pond's":            "Ponds Cream",
  "himalaya":          "Himalaya Cream",

  // Deodorant / Talc
  "deo":               "deodorant",
  "talcum":            "talcum powder",
  "prickly heat":      "Nycil Prickly Heat Powder",
  "nycil":             "Nycil Prickly Heat Powder",
  "shower to shower":  "Shower to Shower Talc",

  // ══════════════════════════════════════════════════════
  // BABY PRODUCTS
  // ══════════════════════════════════════════════════════
  "pampers":           "Pampers Diapers",
  "huggies":           "Huggies Diapers",
  "diaper":            "diapers",
  "baby powder":       "Johnson Baby Powder",
  "johnsons":          "Johnson Baby Powder",
  "baby oil":          "Johnson Baby Oil",
  "baby soap":         "Johnson Baby Soap",
  "baby shampoo":      "Johnson Baby Shampoo",
  "cerelac":           "Cerelac Baby Food",
  "farex":             "Farex Baby Food",
  "nestum":            "Nestum Baby Food",

  // ══════════════════════════════════════════════════════
  // HEALTH & WELLNESS
  // ══════════════════════════════════════════════════════
  "ors":               "ORS Sachet",
  "electral":          "Electral ORS",
  "glucon":            "Glucon D",
  "gluco d":           "Glucon D",
  "glucon d":          "Glucon D",
  "glucose":           "Glucon D",
  "zincovit":          "Zincovit Tablets",
  "revital":           "Revital Capsules",
  "digene":            "Digene Antacid",
  "gelusil":           "Gelusil Antacid",
  "eno":               "Eno Antacid",
  "pudin hara":        "Pudin Hara",
  "vicks":             "Vicks VapoRub",
  "balm":              "pain balm",
  "moov":              "Moov Pain Relief",
  "iodex":             "Iodex Balm",
  "bandaid":           "Band Aid",
  "band aid":          "Band Aid",
  "dettol":            "Dettol Antiseptic",

  // ══════════════════════════════════════════════════════
  // COOKING STAPLES (additional)
  // ══════════════════════════════════════════════════════
  "dalda":             "Dalda Vanaspati",
  "ration":            "ration",         // PDS/government ration
  "shakkar":           "jaggery",        // Hindi
  "khandsari":         "raw sugar",
  "mishri":            "rock sugar",
  "saunf":             "fennel seeds",
  "sabut dhania":      "coriander seeds",
  "kali mirch":        "black pepper",
  "elaichi":           "cardamom",
  "lavang":            "cloves",
  "dalchini":          "cinnamon",
  "tejpatta":          "bay leaves",
  "chakri phool":      "star anise",
  "jaiphal":           "nutmeg",
  "javitri":           "mace",
  "imli":              "tamarind",
  "amchur":            "dry mango powder",
  "anardana":          "pomegranate seeds",
  "kasuri methi":      "dried fenugreek leaves",
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
