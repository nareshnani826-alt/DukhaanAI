// Speak a chai bill: "rendu tea oka samosa", "do chai ek samosa", "రెండు టీ ఒక సమోసా",
// "இரண்டு டீ" → [{ item, qty }]. Works on the shop's own menu, no AI needed.
import { NUMBER_WORDS } from "./languages.js"

// Number words in each script (romanised ones come from languages.js)
const NUM = {
  ...NUMBER_WORDS,
  oka:1, okka:1, okati:1, oru:1, ondu:1,
  // Telugu
  "ఒకటి":1, "ఒక":1, "ఒక్క":1, "రెండు":2, "మూడు":3, "నాలుగు":4, "ఐదు":5, "అయిదు":5, "ఆరు":6, "ఏడు":7, "ఎనిమిది":8, "తొమ్మిది":9, "పది":10,
  // Hindi
  "एक":1, "दो":2, "तीन":3, "चार":4, "पांच":5, "पाँच":5, "छह":6, "छः":6, "सात":7, "आठ":8, "नौ":9, "दस":10,
  // Tamil
  "ஒன்று":1, "ஒரு":1, "இரண்டு":2, "ரெண்டு":2, "மூன்று":3, "நான்கு":4, "ஐந்து":5, "ஆறு":6,
  // Kannada
  "ಒಂದು":1, "ಎರಡು":2, "ಮೂರು":3, "ನಾಲ್ಕು":4, "ಐದು":5, "ಆರು":6,
}

// Local words → the English word used in menu names
const WORDS = {
  chai:"tea", cha:"tea", chaay:"tea", chaai:"tea", chaya:"tea", teneer:"tea", "టీ":"tea", "చాయ్":"tea", "చాయ":"tea", "टी":"tea",
  "चाय":"tea", "டீ":"tea", "தேநீர்":"tea", "ಟೀ":"tea", "ಚಹಾ":"tea", "ചായ":"tea",
  kaapi:"coffee", kapi:"coffee", kafi:"coffee", "కాఫీ":"coffee", "कॉफ़ी":"coffee", "कॉफी":"coffee", "காபி":"coffee", "ಕಾಫಿ":"coffee",
  allam:"ginger", adrak:"ginger", inji:"ginger", "అల్లం":"ginger", "अदरक":"ginger", "இஞ்சி":"ginger", "ಶುಂಠಿ":"ginger",
  elachi:"elaichi", ilachi:"elaichi", yalakki:"elaichi", "ఇలాచి":"elaichi", "యాలకుల":"elaichi", "इलायची":"elaichi", "ஏலக்காய்":"elaichi",
  nimbu:"lemon", nimmakaya:"lemon", "నిమ్మ":"lemon", "నిమ్మకాయ":"lemon", "नींबू":"lemon", "எலுமிச்சை":"lemon",
  kali:"black", "బ్లాక్":"black", "काली":"black", "ब्लैक":"black",
  "సమోసా":"samosa", "समोसा":"samosa", "சமோசா":"samosa", "ಸಮೋಸ":"samosa", "ಸಮೋಸಾ":"samosa",
  "బన్":"bun", "బన్ను":"bun", "बन":"bun", "பன்":"bun",
  "పఫ్":"puff", "पफ":"puff", "பப்ஸ்":"puff",
  "బిస్కెట్":"biscuit", "బిస్కట్":"biscuit", "बिस्किट":"biscuit", "பிஸ்கட்":"biscuit",
  bajji:"bajji", bhajji:"bajji", "బజ్జీ":"bajji", "బజ్జి":"bajji", "भजिया":"bajji", "பஜ்ஜி":"bajji",
  "మిర్చి":"mirchi", "मिर्ची":"mirchi",
  "బూస్ట్":"boost", "बूस्ट":"boost", "బాదం":"badam", "बादाम":"badam", "पाल":"milk", "పాలు":"milk", "दूध":"milk",
  "నీళ్ళు":"water", "నీళ్లు":"water", "पानी":"water", "தண்ணீர்":"water", bottle:"bottle",
}

const tokenize = s => String(s || "").toLowerCase().replace(/[,.;!?।]/g, " ").split(/\s+/).filter(Boolean)

// English for one spoken word; native-script words may carry suffixes (టీలు, సమోసాలు)
function toEnglish(tok) {
  if (WORDS[tok]) return WORDS[tok]
  if (/[^\x00-\x7f]/.test(tok)) {  // eslint-disable-line no-control-regex
    const key = Object.keys(WORDS).filter(k => /[^\x00-\x7f]/.test(k) && k.length >= 2 && tok.startsWith(k))  // eslint-disable-line no-control-regex
      .sort((a, b) => b.length - a.length)[0]
    if (key) return WORDS[key]
  }
  return tok.replace(/(s|es)$/, m => (tok.length > 4 ? "" : m))   // "teas", "samosas"
}

function toNumber(tok) {
  if (/^\d+$/.test(tok)) return +tok
  if (NUM[tok] !== undefined) return NUM[tok]
  if (/[^\x00-\x7f]/.test(tok)) {  // eslint-disable-line no-control-regex
    const key = Object.keys(NUM).filter(k => /[^\x00-\x7f]/.test(k) && tok.startsWith(k)).sort((a, b) => b.length - a.length)[0]  // eslint-disable-line no-control-regex
    if (key) return NUM[key]
  }
  return null
}

/** Parse a spoken order against the menu. Returns { lines:[{item, qty}], unknown:[words] }. */
export function parseChaiOrder(text, menu) {
  const items = (menu || []).map(m => ({ m, words: tokenize(m.name).map(toEnglish) }))
  const toks = tokenize(text)
  const lines = new Map()
  const unknown = []
  let qty = null
  for (let i = 0; i < toks.length;) {
    const n = toNumber(toks[i])
    if (n !== null) { qty = n; i++; continue }
    // Longest run of spoken words found together in a menu name; a full-name match wins
    let best = null
    for (let k = Math.min(3, toks.length - i); k >= 1 && !best; k--) {
      const said = toks.slice(i, i + k).map(toEnglish)
      const hits = items.filter(({ words }) => said.every(w => words.includes(w)))
      if (hits.length) {
        hits.sort((a, b) => (a.words.length === said.length ? -1 : 0) - (b.words.length === said.length ? -1 : 0) || a.words.length - b.words.length)
        best = { item: hits[0].m, k }
      }
    }
    if (best) {
      const prev = lines.get(best.item.id)
      lines.set(best.item.id, { item: best.item, qty: (prev?.qty || 0) + (qty || 1) })
      qty = null
      i += best.k
    } else {
      if (toks[i].length > 2) unknown.push(toks[i])
      i++
    }
  }
  return { lines: [...lines.values()], unknown }
}
