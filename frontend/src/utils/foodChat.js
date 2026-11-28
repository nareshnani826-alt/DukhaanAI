// Chat answers for chai shops and restaurants, from the shop's own bills, tables, menu and raw
// material (the general chat answers come from Kirana products, which these shops don't have).
// Returns a text answer, or null so the chat asks the AI instead.
import { ChaiMenu, ChaiMaterials, ChaiOrders, buildReport, localDay } from "../sync/chaiDb"
import { isRestaurant } from "./features"

// Quick-question buttons per language; the position says what is asked (see INTENTS)
export const FOOD_CHIPS_BY_LANG = {
  "en-IN": ["Today's sales", "Best sellers", "Open tables", "Low stock"],
  "te-IN": ["ఈరోజు అమ్మకాలు", "ఎక్కువ అమ్మినవి", "తెరిచిన టేబుల్స్", "తక్కువ స్టాక్"],
  "hi-IN": ["आज की बिक्री", "सबसे ज़्यादा बिके", "खुली टेबल", "कम स्टॉक"],
  "ta-IN": ["இன்றைய விற்பனை", "அதிகம் விற்றவை", "திறந்த டேபிள்கள்", "குறைந்த ஸ்டாக்"],
  "kn-IN": ["ಇಂದಿನ ಮಾರಾಟ", "ಹೆಚ್ಚು ಮಾರಾಟವಾದವು", "ತೆರೆದ ಟೇಬಲ್‌ಗಳು", "ಕಡಿಮೆ ಸ್ಟಾಕ್"],
  "ml-IN": ["ഇന്നത്തെ വിൽപ്പന", "കൂടുതൽ വിറ്റവ", "തുറന്ന ടേബിളുകൾ", "കുറഞ്ഞ സ്റ്റോക്ക്"],
  "mr-IN": ["आजची विक्री", "सर्वाधिक विकले", "उघडी टेबल्स", "कमी स्टॉक"],
  "bn-IN": ["আজকের বিক্রয়", "সবচেয়ে বেশি বিক্রি", "খোলা টেবিল", "কম স্টক"],
  "gu-IN": ["આજનું વેચાણ", "સૌથી વધુ વેચાયેલ", "ખુલ્લા ટેબલ", "ઓછો સ્ટોક"],
  "pa-IN": ["ਅੱਜ ਦੀ ਵਿਕਰੀ", "ਸਭ ਤੋਂ ਵੱਧ ਵਿਕੇ", "ਖੁੱਲ੍ਹੇ ਟੇਬਲ", "ਘੱਟ ਸਟਾਕ"],
}
const INTENTS = ["sales", "best", "tables", "low"]

// Typed questions (English, Hinglish, a few Indian-script words)
const WORDS = {
  sales:  /\b(sale|sales|sold|earning|collection|income|kitna|bikri|becha|amma?kalu)\b|बिक्री|अम्मकालु|అమ్మకాలు|விற்பனை|ಮಾರಾಟ|വിൽപ്പന|विक्री|বিক্রয়|વેચાણ|ਵਿਕਰੀ/i,
  best:   /\b(best|top|popular|most|selling|seller|sellers)\b/i,
  tables: /\b(table|tables|open|unpaid|pending|due today|parcel|token)\b|टेबल|టేబుల్|டேபிள்|ಟೇಬಲ್|ടേബിൾ|টেবিল|ટેબલ|ਟੇਬਲ/i,
  low:    /\b(low|stock|finish|finished|khatam|over|buy|reorder|material)\b|स्टॉक|స్టాక్|ஸ்டாக்|ಸ್ಟಾಕ್|സ്റ്റോക്ക്|স্টক|સ્ટોક|ਸਟਾਕ/i,
}

const INR = n => "₹" + (Math.round((+n || 0) * 100) / 100).toLocaleString("en-IN")
const fmtQty = (q, unit) => `${Math.round((+q || 0) * 1000) / 1000} ${unit || ""}`.trim()

function intentOf(q) {
  const text = q.trim()
  for (const chips of Object.values(FOOD_CHIPS_BY_LANG)) {
    const i = chips.findIndex(c => c.toLowerCase() === text.toLowerCase())
    if (i >= 0) return INTENTS[i]
  }
  for (const k of ["best", "tables", "low", "sales"]) if (WORDS[k].test(text)) return k
  return null
}

export async function foodReply(q) {
  const today = localDay()
  const [menu, materials] = await Promise.all([ChaiMenu.list().catch(() => []), ChaiMaterials.list().catch(() => [])])
  const intent = intentOf(q)

  // "Do you have X?" / "How much X?" — a material in stock, or a dish and its price
  if (!intent) {
    const words = q.toLowerCase().replace(/[?.!,]/g, " ").split(/\s+/).filter(w => w.length > 2)
    const mat = materials.find(m => words.some(w => m.name.toLowerCase().includes(w)))
    if (mat) {
      const low = +mat.min_stock > 0 && +mat.stock <= +mat.min_stock
      return `${mat.name}: ${fmtQty(mat.stock, mat.unit)} in stock${low ? ` — running low (alert below ${fmtQty(mat.min_stock, mat.unit)}).` : "."}`
    }
    const dish = menu.find(m => words.some(w => m.name.toLowerCase().includes(w)))
    if (dish) return `${dish.name} is on your menu at ${INR(dish.price)}.`
    return null
  }

  if (intent === "low") {
    const low = materials.filter(m => +m.min_stock > 0 && +m.stock <= +m.min_stock)
    if (!materials.length) return "No raw materials added yet. Add them in Stock → Raw material."
    if (!low.length) return "All raw materials are above their alert level. 👍"
    return `Running low (${low.length}):\n` + low.map(m => `• ${m.name}: ${fmtQty(m.stock, m.unit)} (alert below ${fmtQty(m.min_stock, m.unit)})`).join("\n")
  }

  const orders = await ChaiOrders.list({ from: today, to: today }).catch(() => [])

  if (intent === "tables") {
    const open = (await ChaiOrders.list({ status: "open" }).catch(() => [])) || []
    if (!open.length) return "No open tables right now — every bill is paid. ✅"
    const total = open.reduce((s, o) => s + (+o.total || 0), 0)
    return `${open.length} ${open.length === 1 ? "table" : "tables"} still to pay · ${INR(total)}:\n` +
      open.map(o => `• ${o.label || "#" + o.order_no}: ${INR(o.total)}`).join("\n")
  }

  const r = buildReport(orders, menu, materials)
  if (intent === "best") {
    if (!r.items.length) return "No paid bills yet today."
    return "Best sellers today:\n" + r.items.slice(0, 5).map((it, i) => `${i + 1}. ${it.name} × ${it.qty} — ${INR(it.amount)}`).join("\n")
  }

  // sales
  if (!r.bills) return "No paid bills yet today."
  const unit = isRestaurant() ? "items" : "cups"
  return `Today: ${INR(r.total)} from ${r.bills} ${r.bills === 1 ? "bill" : "bills"} · ${r.cups} ${unit} sold\n` +
    `Cash ${INR(r.byMode.cash)} · UPI ${INR(r.byMode.upi)} · Khata ${INR(r.byMode.credit)}` +
    (r.cost > 0 ? `\nApprox. profit: ${INR(r.total - r.cost)}` : "")
}
