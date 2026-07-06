// ── Supported Indian languages ────────────────────────────
export const LANGUAGES = [
  { code: "te-IN", name: "Telugu",    native: "తెలుగు",   flag: "🇮🇳" },
  { code: "hi-IN", name: "Hindi",     native: "हिंदी",    flag: "🇮🇳" },
  { code: "ta-IN", name: "Tamil",     native: "தமிழ்",    flag: "🇮🇳" },
  { code: "kn-IN", name: "Kannada",   native: "ಕನ್ನಡ",   flag: "🇮🇳" },
  { code: "ml-IN", name: "Malayalam", native: "മലയാളം",   flag: "🇮🇳" },
  { code: "mr-IN", name: "Marathi",   native: "मराठी",    flag: "🇮🇳" },
  { code: "bn-IN", name: "Bengali",   native: "বাংলা",    flag: "🇮🇳" },
  { code: "gu-IN", name: "Gujarati",  native: "ગુજરાતી",  flag: "🇮🇳" },
  { code: "pa-IN", name: "Punjabi",   native: "ਪੰਜਾਬੀ",  flag: "🇮🇳" },
  { code: "en-IN", name: "English",   native: "English",  flag: "🇮🇳" },
]

export const DEFAULT_LANG = "hi-IN"

// ── Number words → digits (Hindi/Telugu/Tamil) ────────────
export const NUMBER_WORDS = {
  // Hindi
  "ek":1,"do":2,"teen":3,"char":4,"paanch":5,"chhe":6,"saat":7,"aath":8,"nau":9,"das":10,
  "gyarah":11,"barah":12,"terah":13,"chaudah":14,"pandrah":15,"solah":16,"satrah":17,"atharah":18,"unnees":19,"bees":20,
  "tees":30,"chaalees":40,"pachaas":50,"saath":60,"sattar":70,"assi":80,"nabbe":90,"sau":100,
  // Telugu
  "okati":1,"rendu":2,"moodu":3,"naalugu":4,"aidu":5,"aaru":6,"edu":7,"enimidi":8,"tommidi":9,"padi":10,
  "padakondu":11,"pannendu":12,"padinmoodu":13,"padinalugu":14,"padihenu":15,"padaaru":16,"padihedu":17,"padhenimidi":18,"pandommidi":19,"iyyi":20,
  // Tamil
  "onnu":1,"moonu":3,"naangu":4,"anju":5,"ezhu":7,"ettu":8,"ombodu":9,"pathu":10,
  "pathionnu":11,"pannrendu":12,
  // Common
  "half":0.5,"quarter":0.25,"one":1,"two":2,"three":3,"four":4,"five":5,"six":6,"seven":7,"eight":8,"nine":9,"ten":10,
  "eleven":11,"twelve":12,"fifteen":15,"twenty":20,"thirty":30,"fifty":50,"hundred":100,
}

// ── Unit aliases ──────────────────────────────────────────
export const UNIT_ALIASES = {
  // kg variants
  "kg":      "kg","kilo":   "kg","kilos":  "kg","kilogram":"kg","kilograms":"kg",
  "kilo gram":"kg","किलो":  "kg","కిలో":  "kg","கிலோ":  "kg",
  // gram variants
  "g":       "g", "gram":   "g", "grams":  "g", "grm":    "g",
  "ग्राम":   "g", "గ్రాము": "g",
  // litre variants
  "l":       "L", "ltr":    "L", "litre":  "L","litres": "L","liter":"L","liters":"L",
  "లీటర్": "L", "லிட்டர்":"L",
  // ml variants
  "ml":      "ml","milliliter":"ml","millilitre":"ml",
  // piece variants
  "piece":   "pc","pieces": "pc","pcs":    "pc","packet": "pkt","packets":"pkt",
  "pack":    "pkt","packs":  "pkt","bottle":"btl","bottles":"btl",
  "box":     "box","boxes":  "box","bag":   "bag","bags":   "bag",
  "number":  "pc","numbers":"pc","item":   "pc","items":  "pc",
  // dozen variants (bangle billing)
  "dozen":   "dozen","doz":  "dozen","darjan":"dozen","దజను":"dozen",
  "டஜன்":   "dozen","ಡಜನ್":"dozen","ডজন":  "dozen","ਦਰਜਨ":"dozen",
  // set variants (bangle billing — set = 6 pcs)
  "set":     "set","sets":   "set",
  // Hindi
  "पैकेट":   "pkt","बोतल":  "btl","डिब्बा": "box",
  // Telugu
  "పాకెట్": "pkt","బాటిల్":"btl","పెట్టె": "box",
}

// ── Action keywords per language ──────────────────────────
export const ACTION_KEYWORDS = {
  ADD_BILL: [
    // Hindi
    "bill","bill mein","add karo","daalo","jodo","invoice","becho","de do",
    // Telugu
    "bill lo","add cheyyi","cheri","ichha","ivvu",
    // Tamil
    "bill la","seer","poddu","ku add pannu",
    // Kannada
    "bill ge","seri","hakku",
    // English
    "add to bill","add to invoice","sell","charge",
  ],
  STOCK_QUERY: [
    // Hindi
    "kitna","kitne","bacha","bachi","stock","hai kya","available","kitna stock","stock kitna",
    // Telugu
    "enta","enni","stock enta","unnayi","unnaya","cheppandi",
    // Tamil
    "evvalavu","stock","irukka","irukkaa",
    // Kannada
    "eshtu","stock eshtu","ide",
    // English
    "how many","how much","stock","available","left","remaining",
  ],
  ADD_STOCK: [
    // Hindi
    "aaya","aya","stock mein daalo","mila","aa gaya","purchase","kharida","bhara",
    // Telugu
    "vacchindi","stocks penchandi","add cheyyi stock lo","kondi",
    // Tamil
    "vanduchu","stock podunga","vandiruku",
    // English
    "received","arrived","restock","add stock","purchased","got",
  ],
  REMOVE_STOCK: [
    // Hindi
    "gaya","khatam","nikalo","hatao","use kiya",
    // Telugu
    "poyindi","teeyyandi","vadilindi",
    // English
    "remove","used","consumed","damaged","expired",
  ],
}
