import { useState, useEffect, useRef } from "react"
import { Products, Sales, Invoices, Udhar, Wastage, Customers } from "../sync/db"
import { getSavedLang, saveLang } from "../voice/i18n.js"
import { LANGUAGES } from "../voice/languages.js"

// ── Quick suggestions per language ───────────────────────
const QUICK_BY_LANG = {
  "te-IN": [
    { icon:"📦", text:"అమూల్ మిల్క్ అందుబాటులో ఉందా?" },
    { icon:"🔢", text:"టాటా సాల్ట్ ఎంత ఉంది?" },
    { icon:"💰", text:"ఆశీర్వాద్ అట్ట ధర ఎంత?" },
    { icon:"⚠️", text:"తక్కువ స్టాక్ ఉన్న వస్తువులు ఏవి?" },
    { icon:"📊", text:"అత్యధిక మార్జిన్ ఉన్న వస్తువు ఏది?" },
    { icon:"💵", text:"ఈరోజు మొత్తం అమ్మకాలు?" },
    { icon:"🔄", text:"ఈరోజు ఏమి రీఆర్డర్ చేయాలి?" },
    { icon:"🏆", text:"అత్యధికంగా అమ్ముడైన వస్తువులు?" },
  ],
  "hi-IN": [
    { icon:"📦", text:"क्या अमूल मिल्क उपलब्ध है?" },
    { icon:"🔢", text:"टाटा सॉल्ट कितना बचा है?" },
    { icon:"💰", text:"आशीर्वाद आटे का भाव क्या है?" },
    { icon:"⚠️", text:"कौन से सामान का स्टॉक कम है?" },
    { icon:"📊", text:"सबसे ज़्यादा मार्जिन किसमें है?" },
    { icon:"💵", text:"आज का कुल कमाई?" },
    { icon:"🔄", text:"आज क्या मँगवाना है?" },
    { icon:"🏆", text:"सबसे ज़्यादा बिकने वाले सामान?" },
  ],
  "ta-IN": [
    { icon:"📦", text:"அமுல் மில்க் கிடைக்குமா?" },
    { icon:"🔢", text:"டாடா சால்ட் எவ்வளவு இருக்கு?" },
    { icon:"💰", text:"ஆஷீர்வாத் அட்டா விலை என்ன?" },
    { icon:"⚠️", text:"குறைந்த ஸ்டாக் உள்ள பொருட்கள்?" },
    { icon:"📊", text:"அதிக மார்ஜின் உள்ள பொருள் எது?" },
    { icon:"💵", text:"இன்றைய மொத்த விற்பனை?" },
    { icon:"🔄", text:"இன்று என்ன ஆர்டர் செய்யணும்?" },
    { icon:"🏆", text:"அதிகம் விற்கும் பொருட்கள்?" },
  ],
  "kn-IN": [
    { icon:"📦", text:"ಅಮೂಲ್ ಮಿಲ್ಕ್ ಲಭ್ಯವಿದೆಯೇ?" },
    { icon:"🔢", text:"ಟಾಟಾ ಸಾಲ್ಟ್ ಎಷ್ಟಿದೆ?" },
    { icon:"💰", text:"ಆಶೀರ್ವಾದ್ ಆಟಾ ಬೆಲೆ ಎಷ್ಟು?" },
    { icon:"⚠️", text:"ಕಡಿಮೆ ಸ್ಟಾಕ್ ಇರುವ ವಸ್ತುಗಳು?" },
    { icon:"📊", text:"ಅತ್ಯಧಿಕ ಮಾರ್ಜಿನ್ ಯಾವುದು?" },
    { icon:"💵", text:"ಇಂದಿನ ಒಟ್ಟು ಮಾರಾಟ?" },
    { icon:"🔄", text:"ಇಂದು ಏನು ಆರ್ಡರ್ ಮಾಡಬೇಕು?" },
    { icon:"🏆", text:"ಹೆಚ್ಚು ಮಾರಾಟವಾಗುವ ವಸ್ತುಗಳು?" },
  ],
  "ml-IN": [
    { icon:"📦", text:"അമൂൽ മിൽക്ക് ലഭ്യമാണോ?" },
    { icon:"🔢", text:"ടാറ്റ സാൾട്ട് എത്ര ഉണ്ട്?" },
    { icon:"💰", text:"ആശീർവാദ് ആട്ടയുടെ വില?" },
    { icon:"⚠️", text:"സ്റ്റോക്ക് കുറഞ്ഞ ഉൽപ്പന്നങ്ങൾ?" },
    { icon:"📊", text:"ഏറ്റവും കൂടുതൽ മാർജിൻ?" },
    { icon:"💵", text:"ഇന്നത്തെ മൊത്തം വില്പന?" },
    { icon:"🔄", text:"ഇന്ന് എന്ത് ഓർഡർ ചെയ്യണം?" },
    { icon:"🏆", text:"ഏറ്റവും കൂടുതൽ വിറ്റ ഉൽപ്പന്നങ്ങൾ?" },
  ],
  "mr-IN": [
    { icon:"📦", text:"अमूल मिल्क उपलब्ध आहे का?" },
    { icon:"🔢", text:"टाटा सॉल्ट किती आहे?" },
    { icon:"💰", text:"आशीर्वाद आट्याची किंमत काय?" },
    { icon:"⚠️", text:"कमी स्टॉक असलेल्या वस्तू?" },
    { icon:"📊", text:"सर्वात जास्त मार्जिन कशात?" },
    { icon:"💵", text:"आजची एकूण विक्री?" },
    { icon:"🔄", text:"आज काय ऑर्डर करायचे?" },
    { icon:"🏆", text:"सर्वात जास्त विकल्या गेलेल्या वस्तू?" },
  ],
  "bn-IN": [
    { icon:"📦", text:"আমুল মিল্ক পাওয়া যাচ্ছে?" },
    { icon:"🔢", text:"টাটা সল্ট কতটুকু আছে?" },
    { icon:"💰", text:"আশীর্বাদ আটার দাম কত?" },
    { icon:"⚠️", text:"কম স্টক আছে কোন পণ্যে?" },
    { icon:"📊", text:"সবচেয়ে বেশি মার্জিন কোনটায়?" },
    { icon:"💵", text:"আজকের মোট বিক্রয়?" },
    { icon:"🔄", text:"আজ কী অর্ডার করতে হবে?" },
    { icon:"🏆", text:"সবচেয়ে বেশি বিক্রি হওয়া পণ্য?" },
  ],
  "gu-IN": [
    { icon:"📦", text:"અમૂલ મિલ્ક ઉપલબ્ધ છે?" },
    { icon:"🔢", text:"ટાટા સોલ્ટ કેટલું છે?" },
    { icon:"💰", text:"આશીર્વાદ આટાની કિંમત?" },
    { icon:"⚠️", text:"ઓછો સ્ટોક ધરાવતી વસ્તુઓ?" },
    { icon:"📊", text:"સૌથી વધુ માર્જિન ક્યામાં?" },
    { icon:"💵", text:"આજનું કુલ વેચાણ?" },
    { icon:"🔄", text:"આજે શું ઓર્ડર કરવું?" },
    { icon:"🏆", text:"સૌથી વધુ વેચાતી વસ્તુઓ?" },
  ],
  "pa-IN": [
    { icon:"📦", text:"ਅਮੁਲ ਮਿਲਕ ਉਪਲਬਧ ਹੈ?" },
    { icon:"🔢", text:"ਟਾਟਾ ਸਾਲਟ ਕਿੰਨਾ ਹੈ?" },
    { icon:"💰", text:"ਆਸ਼ੀਰਵਾਦ ਆਟੇ ਦੀ ਕੀਮਤ?" },
    { icon:"⚠️", text:"ਘੱਟ ਸਟਾਕ ਵਾਲੀਆਂ ਚੀਜ਼ਾਂ?" },
    { icon:"📊", text:"ਸਭ ਤੋਂ ਵੱਧ ਮਾਰਜਿਨ ਕਿਸ ਵਿੱਚ?" },
    { icon:"💵", text:"ਅੱਜ ਦੀ ਕੁੱਲ ਵਿਕਰੀ?" },
    { icon:"🔄", text:"ਅੱਜ ਕੀ ਆਰਡਰ ਕਰਨਾ ਹੈ?" },
    { icon:"🏆", text:"ਸਭ ਤੋਂ ਵੱਧ ਵਿਕਣ ਵਾਲੀਆਂ ਚੀਜ਼ਾਂ?" },
  ],
  "en-IN": [
    { icon:"📦", text:"Is Amul Milk available?" },
    { icon:"🔢", text:"How much Tata Salt do I have?" },
    { icon:"💰", text:"What's the price of Aashirvaad Atta?" },
    { icon:"⚠️", text:"Which products are low stock?" },
    { icon:"📊", text:"What's my best margin product?" },
    { icon:"💵", text:"Total revenue today" },
    { icon:"🔄", text:"What should I reorder today?" },
    { icon:"🏆", text:"Top selling products this month" },
  ],
}

const INR = n => "₹" + (n||0).toLocaleString("en-IN")

// ── Build comprehensive store context ────────────────────
async function buildStoreContext(userQuestion = "") {
  const ql = userQuestion.toLowerCase()

  // Always fetch: products + today + monthly
  const [products, todaySales, monthlySummary] = await Promise.all([
    Products.list(),
    Sales.today().catch(() => ({ total:0, count:0, sales:[] })),
    Sales.summary({ days:30 }).catch(() => ({ total_revenue:0, transaction_count:0, top_products:[] })),
  ])

  // Conditionally fetch extra data based on question topic
  const needsUdhar    = /udhar|credit|due|baaki|baki|unpaid|customer debt|కస్టమర్|ఉధార్|उधार|கடன்/.test(ql) || ql === ""
  const needsWastage  = /wastage|expired|damaged|stolen|loss|నష్టం|waste|கழிவு|बर्बाद/.test(ql) || ql === ""
  const needsSales    = /sold|sales|sell|revenue|top product|best sell|recent|becha|amm|అమ్మ|விற்/.test(ql) || ql === ""
  const needsInvoice  = /invoice|bill|gst|tax|receipt|बिल|బిల్|பில்/.test(ql)

  const [udharData, wastageData, recentSales, invoices] = await Promise.all([
    needsUdhar   ? Udhar.listCustomers().catch(() => [])           : Promise.resolve(null),
    needsWastage ? Wastage.summary().catch(() => null)             : Promise.resolve(null),
    needsSales   ? Sales.list({ days:30, limit:200 }).catch(() => []) : Promise.resolve(null),
    needsInvoice ? Invoices.list().catch(() => [])                 : Promise.resolve(null),
  ])

  // Full product list — all products, no slice limit
  const allProducts = products.map(p => {
    const margin = p.mrp > 0 && p.cost_price > 0
      ? Math.round((p.mrp - p.cost_price) / p.mrp * 100) : null
    return {
      name: p.name,
      category: p.category || "General",
      stock: p.stock,
      unit: p.unit || "pc",
      mrp: p.mrp || 0,
      cost: p.cost_price || 0,
      min_stock: p.min_stock || 0,
      gst_pct: p.gst_percent || 0,
      margin_pct: margin,
      status: p.stock <= 0 ? "OUT_OF_STOCK"
            : p.stock <= (p.min_stock||0) ? "LOW_STOCK"
            : "IN_STOCK",
      barcode: p.barcode || null,
    }
  })

  const lowStock    = allProducts.filter(p => p.status === "LOW_STOCK")
  const outOfStock  = allProducts.filter(p => p.status === "OUT_OF_STOCK")
  const inStock     = allProducts.filter(p => p.status === "IN_STOCK")
  const withMargin  = allProducts.filter(p => p.margin_pct !== null)
    .sort((a,b) => b.margin_pct - a.margin_pct)

  // Sales analysis
  let salesAnalysis = null
  if (recentSales) {
    const byProduct = {}
    recentSales.forEach(s => {
      if (!byProduct[s.product_name]) byProduct[s.product_name] = { units:0, revenue:0, txns:0 }
      byProduct[s.product_name].units   += s.qty
      byProduct[s.product_name].revenue += s.total
      byProduct[s.product_name].txns    += 1
    })
    salesAnalysis = {
      top_by_units:   Object.entries(byProduct).sort((a,b) => b[1].units-a[1].units).slice(0,10).map(([name,v]) => ({name,...v})),
      top_by_revenue: Object.entries(byProduct).sort((a,b) => b[1].revenue-a[1].revenue).slice(0,10).map(([name,v]) => ({name,...v})),
      never_sold:     allProducts.filter(p => !byProduct[p.name]).map(p => p.name).slice(0,20),
      recent_sales:   recentSales.slice(0,20).map(s => ({
        product: s.product_name, qty: s.qty,
        total: s.total, customer: s.customer,
        when: new Date(s.sold_at).toLocaleString("en-IN"),
      })),
    }
  }

  // Udhar analysis
  let udharAnalysis = null
  if (udharData) {
    udharAnalysis = {
      total_due: udharData.reduce((s,c) => s + (c.total_due||0), 0),
      customer_count: udharData.length,
      overdue_customers: udharData.filter(c => c.total_due > 0).map(c => ({
        name: c.name, phone: c.phone, amount_due: c.total_due,
        last_txn: c.last_txn_at ? new Date(c.last_txn_at).toLocaleDateString("en-IN") : "Never",
      })).slice(0,15),
    }
  }

  // Token estimate — if too many products, summarize
  // Claude context: ~100k tokens. Each product ~50 tokens. 2000 products = 100k tokens alone.
  // Strategy: always send full list but compress fields
  const ctx = {
    store_summary: {
      total_products:      allProducts.length,
      in_stock_count:      inStock.length,
      low_stock_count:     lowStock.length,
      out_of_stock_count:  outOfStock.length,
      today_revenue:       todaySales.total,
      today_invoices:      todaySales.count,
      today_sales_list:    todaySales.sales?.slice(0,10).map(s => ({
        product: s.product_name || s.customer, qty: s.qty, total: s.total, customer: s.customer
      })),
      monthly_revenue:     monthlySummary.total_revenue || 0,
      monthly_transactions: monthlySummary.transaction_count || 0,
      top_monthly_products: monthlySummary.top_products || [],
    },

    // All products — full list
    all_products: allProducts,

    // Pre-computed useful lists
    out_of_stock:    outOfStock.map(p => ({ name:p.name, unit:p.unit, mrp:p.mrp })),
    low_stock:       lowStock.map(p => ({ name:p.name, stock:p.stock, min:p.min_stock, unit:p.unit })),
    best_margins:    withMargin.slice(0,15).map(p => ({ name:p.name, margin:p.margin_pct, mrp:p.mrp, cost:p.cost })),
    worst_margins:   withMargin.slice(-10).map(p => ({ name:p.name, margin:p.margin_pct })),

    // Conditionally included
    sales_analysis:  salesAnalysis,
    udhar:           udharAnalysis,
    wastage_summary: wastageData,
    recent_invoices: invoices?.slice(0,5).map(inv => ({
      no: inv.invoice_no, customer: inv.customer_name,
      total: inv.total, date: new Date(inv.created_at).toLocaleDateString("en-IN"),
    })),
  }

  // Remove null/undefined keys to save tokens
  Object.keys(ctx).forEach(k => { if (ctx[k] == null) delete ctx[k] })
  return ctx
}

// ── Call Claude API ──────────────────────────────────────
async function askClaude(messages, storeContext, lang="en-IN") {
  // Map lang code to full language name for the AI
  const langNames = {
    "te-IN":"Telugu","hi-IN":"Hindi","ta-IN":"Tamil","kn-IN":"Kannada",
    "ml-IN":"Malayalam","mr-IN":"Marathi","bn-IN":"Bengali",
    "gu-IN":"Gujarati","pa-IN":"Punjabi","en-IN":"English"
  }
  const langName = langNames[lang] || "English"

  const systemPrompt = `You are DukaanAI's smart shop assistant for Indian kirana (grocery) store owners.

CRITICAL LANGUAGE RULE: You MUST respond ONLY in ${langName}. Every word of your answer must be in ${langName}. Do not mix languages. Do not use English unless the language is English.

You have access to real-time store data below. Use ONLY this data to answer.

STORE DATA:
${JSON.stringify(storeContext, null, 2)}

AVAILABLE DATA:
- all_products: complete inventory with stock, price, margin, status for ALL products
- out_of_stock: products with zero stock
- low_stock: products below minimum stock level
- best_margins: top 15 highest-margin products
- sales_analysis: top selling products, never-sold products, recent sales
- udhar: customer credit/due amounts and details
- wastage_summary: expired/damaged/stolen loss data
- store_summary: today's revenue, invoices, monthly totals

INSTRUCTIONS:
- Respond ENTIRELY in ${langName}. Every single word must be in ${langName}.
- To find a specific product: search all_products by name (case-insensitive partial match).
- For availability: report exact stock number + status (IN_STOCK/LOW_STOCK/OUT_OF_STOCK).
- For price: report mrp (selling price) and cost (purchase price), calculate margin if asked.
- For comparisons: scan all_products and compare relevant fields.
- For "which products haven't sold": check sales_analysis.never_sold.
- For customer dues: use udhar data.
- For wastage/loss: use wastage_summary.
- Use ₹ with Indian number format and emojis.
- If product not found, say so clearly and suggest similar names if any.
- Keep responses concise unless listing many items. Use • for lists.
- Never say "I don't have access to that data" — you have all the data above.`

  // Try backend proxy first (keeps API key secure on server)
  // Falls back to direct call for local dev
  const apiBase  = import.meta.env.VITE_API_URL || "http://localhost:8000"
  const proxyUrl = `${apiBase}/api/chat`
  const directUrl = "https://api.anthropic.com/v1/messages"

  const payload = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: systemPrompt,
    messages: messages.map(m => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.text,
    })),
  }

  // Try backend proxy first
  let response
  try {
    response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`proxy ${response.status}`)
  } catch {
    // Fallback: direct Anthropic call (works in Claude.ai environment)
    const apiKey = import.meta.env.VITE_ANTHROPIC_KEY || ""
    response = await fetch(directUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" } : {}),
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(`API error ${response.status}`)
  }

  const data = await response.json()
  // Handle both proxy response and direct Anthropic response
  return data.content?.[0]?.text || data.text || "Sorry, I couldn't get a response."
}

// ── Message bubble ───────────────────────────────────────
function Bubble({ msg, isLast }) {
  const isUser = msg.role === "user"
  return (
    <div style={{
      display:"flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom:10,
      animation: isLast ? "bubbleIn 0.2s ease" : "none",
    }}>
      {!isUser && (
        <div style={{
          width:30, height:30, borderRadius:"50%", flexShrink:0,
          background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot,#ff8e35))",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:14, marginRight:8, alignSelf:"flex-end", marginBottom:2,
        }}>🤖</div>
      )}
      <div style={{
        maxWidth:"78%",
        padding:"10px 14px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser
          ? "linear-gradient(135deg,var(--saffron),var(--saffron-hot,#ff8e35))"
          : "var(--bg1)",
        color: isUser ? "#fff" : "var(--ink)",
        fontSize:13,
        lineHeight:1.55,
        border: isUser ? "none" : "1px solid var(--rule)",
        boxShadow: isUser
          ? "0 2px 12px rgba(232,119,34,0.3)"
          : "0 1px 4px var(--shadow,rgba(0,0,0,0.06))",
        whiteSpace:"pre-wrap",
        wordBreak:"break-word",
      }}>
        {msg.text}
      </div>
      {isUser && (
        <div style={{
          width:30, height:30, borderRadius:"50%", flexShrink:0,
          background:"var(--bg3,#ede5d4)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:14, marginLeft:8, alignSelf:"flex-end", marginBottom:2,
          border:"1px solid var(--rule)",
        }}>👤</div>
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
      <div style={{
        width:30, height:30, borderRadius:"50%",
        background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot,#ff8e35))",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:14, flexShrink:0,
      }}>🤖</div>
      <div style={{
        padding:"12px 16px", borderRadius:"18px 18px 18px 4px",
        background:"var(--bg1)", border:"1px solid var(--rule)",
        display:"flex", gap:5, alignItems:"center",
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width:7, height:7, borderRadius:"50%",
            background:"var(--ink-faint)",
            animation:"typingBounce 1.2s ease infinite",
            animationDelay: i * 0.2 + "s",
          }}/>
        ))}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────
export default function Agent() {
  const [lang,     setLang]         = useState(() => getSavedLang())
  const [messages, setMessages]     = useState([])
  const [input,    setInput]        = useState("")
  const [loading,  setLoading]      = useState(false)
  const [context,  setContext]      = useState(null)
  const [ctxLoading, setCtxLoading] = useState(true)
  const [error,    setError]        = useState("")
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const langInfo = LANGUAGES.find(l => l.code === lang) || LANGUAGES[9]
  const QUICK    = QUICK_BY_LANG[lang] || QUICK_BY_LANG["en-IN"]

  // Reload when language changes
  useEffect(() => {
    if (!ctxLoading && context) {
      const s = context.store_summary
      const welcomes = {
        "te-IN": `నమస్కారం! 🙏 నేను మీ DukaanAI దుకాణ సహాయకుడిని.

మీ దుకాణం ఇప్పుడు:
• ${s.total_products} ఉత్పత్తులు
• ${s.low_stock_count} తక్కువ స్టాక్
• ఈరోజు అమ్మకాలు: ₹${s.today_revenue?.toLocaleString("en-IN")} (${s.today_invoices} బిల్లులు)

ఏదైనా అడగండి!`,
        "hi-IN": `नमस्ते! 🙏 मैं आपका DukaanAI दुकान सहायक हूँ।

आपकी दुकान अभी:
• ${s.total_products} उत्पाद
• ${s.low_stock_count} कम स्टॉक
• आज की बिक्री: ₹${s.today_revenue?.toLocaleString("en-IN")} (${s.today_invoices} बिल)

कुछ भी पूछें!`,
        "ta-IN": `வணக்கம்! 🙏 நான் உங்கள் DukaanAI கடை உதவியாளர்.

உங்கள் கடை இப்போது:
• ${s.total_products} பொருட்கள்
• ${s.low_stock_count} குறைந்த ஸ்டாக்
• இன்றைய விற்பனை: ₹${s.today_revenue?.toLocaleString("en-IN")} (${s.today_invoices} பில்கள்)

எதையும் கேளுங்கள்!`,
        "kn-IN": `ನಮಸ್ಕಾರ! 🙏 ನಾನು ನಿಮ್ಮ DukaanAI ಅಂಗಡಿ ಸಹಾಯಕ.

ನಿಮ್ಮ ಅಂಗಡಿ ಈಗ:
• ${s.total_products} ಉತ್ಪನ್ನಗಳು
• ${s.low_stock_count} ಕಡಿಮೆ ಸ್ಟಾಕ್
• ಇಂದಿನ ಮಾರಾಟ: ₹${s.today_revenue?.toLocaleString("en-IN")} (${s.today_invoices} ಬಿಲ್‌ಗಳು)

ಏನಾದರೂ ಕೇಳಿ!`,
        "ml-IN": `നമസ്കാരം! 🙏 ഞാൻ നിങ്ങളുടെ DukaanAI കട സഹായി.

നിങ്ങളുടെ കട ഇപ്പോൾ:
• ${s.total_products} ഉൽപ്പന്നങ്ങൾ
• ${s.low_stock_count} കുറഞ്ഞ സ്റ്റോക്ക്
• ഇന്നത്തെ വില്പന: ₹${s.today_revenue?.toLocaleString("en-IN")} (${s.today_invoices} ബില്ലുകൾ)

എന്തും ചോദിക്കൂ!`,
        "mr-IN": `नमस्कार! 🙏 मी तुमचा DukaanAI दुकान सहायक आहे.

तुमचे दुकान आत्ता:
• ${s.total_products} उत्पादने
• ${s.low_stock_count} कमी स्टॉक
• आजची विक्री: ₹${s.today_revenue?.toLocaleString("en-IN")} (${s.today_invoices} बिले)

काहीही विचारा!`,
        "bn-IN": `নমস্কার! 🙏 আমি আপনার DukaanAI দোকান সহায়ক।

আপনার দোকান এখন:
• ${s.total_products} পণ্য
• ${s.low_stock_count} কম স্টক
• আজকের বিক্রয়: ₹${s.today_revenue?.toLocaleString("en-IN")} (${s.today_invoices} বিল)

যেকোনো প্রশ্ন করুন!`,
        "gu-IN": `નમસ્તે! 🙏 હું તમારો DukaanAI દુકાન સહાયક છું.

તમારી દુકાન અત્યારે:
• ${s.total_products} ઉત્પાદનો
• ${s.low_stock_count} ઓછો સ્ટોક
• આજનું વેચાણ: ₹${s.today_revenue?.toLocaleString("en-IN")} (${s.today_invoices} બિલ)

કંઈ પણ પૂછો!`,
        "pa-IN": `ਸਤ ਸ੍ਰੀ ਅਕਾਲ! 🙏 ਮੈਂ ਤੁਹਾਡਾ DukaanAI ਦੁਕਾਨ ਸਹਾਇਕ ਹਾਂ।

ਤੁਹਾਡੀ ਦੁਕਾਨ ਹੁਣ:
• ${s.total_products} ਉਤਪਾਦ
• ${s.low_stock_count} ਘੱਟ ਸਟਾਕ
• ਅੱਜ ਦੀ ਵਿਕਰੀ: ₹${s.today_revenue?.toLocaleString("en-IN")} (${s.today_invoices} ਬਿੱਲ)

ਕੁਝ ਵੀ ਪੁੱਛੋ!`,
        "en-IN": `Namaste! 🙏 I'm your DukaanAI shop assistant.

Your store right now:
• ${s.total_products} products
• ${s.low_stock_count} low stock${s.out_of_stock_count > 0 ? ` · ${s.out_of_stock_count} out of stock` : ""}
• Today's sales: ₹${s.today_revenue?.toLocaleString("en-IN")} (${s.today_invoices} invoices)

Ask me anything!`,
      }
      setMessages([{ role:"ai", text: welcomes[lang] || welcomes["en-IN"] }])
    }
  }, [lang])

  // Load store context on mount
  useEffect(() => {
    buildStoreContext("")
      .then(ctx => {
        setContext(ctx)
        setCtxLoading(false)
        // Welcome message with live data
        const s = ctx.store_summary
        const currentLang = getSavedLang()
        setLang(currentLang)
        // Welcome message is handled by lang useEffect above
        // But set a default here for first load
        setMessages([{
          role:"ai",
          text: `Namaste! 🙏 I'm your DukaanAI shop assistant.

Your store right now:
• ${s.total_products} products
• ${s.low_stock_count} low stock${s.out_of_stock_count > 0 ? ` · ${s.out_of_stock_count} out of stock` : ""}
• Today's sales: ${INR(s.today_revenue)} (${s.today_invoices} invoices)

Ask me anything!`,
        }])
      })
      .catch(() => {
        setCtxLoading(false)
        setMessages([{ role:"ai", text:"Namaste! 🙏 Ask me about your products, stock, prices, or sales." }])
      })
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" })
  }, [messages, loading])

  function addMsg(role, text) {
    setMessages(m => [...m, { role, text }])
  }

  async function send(q) {
    const question = (q || input).trim()
    if (!question || loading) return
    setInput("")
    setError("")
    addMsg("user", question)
    setLoading(true)

    try {
      // Refresh context on each message so data is always fresh
      const freshCtx = await buildStoreContext(question)
      setContext(freshCtx)

      const allMsgs = [...messages, { role:"user", text:question }]
      const answer  = await askClaude(allMsgs, freshCtx, lang)
      addMsg("ai", answer)
    } catch(e) {
      const errMsg = e.message?.includes("API error 401")
        ? "API key not configured. Add VITE_ANTHROPIC_API_KEY to Vercel environment variables."
        : e.message?.includes("API error 529") || e.message?.includes("overloaded")
        ? "Claude is busy right now. Try again in a moment."
        : "Couldn't connect to AI. Check internet connection."
      setError(errMsg)
      addMsg("ai", `⚠️ ${errMsg}`)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const stats = context?.store_summary

  return (
    <div style={{
      flex:1, display:"flex", flexDirection:"column",
      height:"100%", overflow:"hidden",
      background:"var(--bg0)", fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",
    }}>
      <style>{`
        @keyframes bubbleIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes typingBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
      `}</style>

      {/* Header */}
      <div style={{
        background:"var(--bg1)", borderBottom:"1px solid var(--rule)",
        padding:"14px 20px", flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        boxShadow:"0 1px 6px var(--shadow,rgba(0,0,0,0.06))",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:40, height:40, borderRadius:12,
            background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot,#ff8e35))",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:20, boxShadow:"0 2px 10px rgba(232,119,34,0.35)",
          }}>🤖</div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"var(--ink)" }}>Shop Assistant</div>
            <div style={{ fontSize:11, color:"var(--ink-faint)", marginTop:1 }}>
              {ctxLoading ? "Loading store data..." : `${stats?.total_products||0} products · AI powered`}
            </div>
          </div>
        </div>

        {/* Language switcher */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <select
            value={lang}
            onChange={e => { setLang(e.target.value); saveLang(e.target.value) }}
            style={{
              padding:"5px 10px", borderRadius:8, fontSize:11, fontWeight:600,
              border:"1px solid var(--rule)", background:"var(--bg2)",
              color:"var(--ink)", cursor:"pointer", outline:"none",
            }}>
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.native} {l.name}</option>
            ))}
          </select>
        </div>

        {/* Live stats pills */}
        {stats && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {stats.low_stock_count > 0 && (
              <div style={{
                fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:20,
                background:"var(--ember-bg,rgba(192,57,43,0.1))",
                color:"var(--ember,#c0392b)",
                border:"1px solid rgba(192,57,43,0.25)",
              }}>⚠ {stats.low_stock_count} low stock</div>
            )}
            <div style={{
              fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:20,
              background:"var(--jade-bg,rgba(26,122,74,0.1))",
              color:"var(--jade,#1a7a4a)",
              border:"1px solid rgba(26,122,74,0.25)",
            }}>💰 {INR(stats.today_revenue)} today</div>
          </div>
        )}
      </div>

      {/* Quick question chips */}
      <div style={{
        padding:"10px 16px", borderBottom:"1px solid var(--rule-soft)",
        background:"var(--bg1)", flexShrink:0,
        display:"flex", gap:8, overflowX:"auto",
      }}>
        {QUICK.map((q, i) => (
          <button key={i} onClick={() => send(q.text)}
            disabled={loading || ctxLoading}
            style={{
              display:"flex", alignItems:"center", gap:5,
              whiteSpace:"nowrap", padding:"6px 12px", borderRadius:20,
              border:"1px solid var(--rule)", background:"var(--bg2)",
              color:"var(--ink-dim)", fontSize:11, fontWeight:600,
              cursor:"pointer", transition:"all 0.15s", flexShrink:0,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="var(--saffron)"; e.currentTarget.style.color="var(--saffron)" }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="var(--rule)"; e.currentTarget.style.color="var(--ink-dim)" }}>
            <span>{q.icon}</span>{q.text}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{
        flex:1, overflowY:"auto", padding:"16px",
        display:"flex", flexDirection:"column",
        minHeight:0,
      }}>
        {messages.map((m, i) => (
          <Bubble key={i} msg={m} isLast={i === messages.length - 1} />
        ))}
        {loading && <TypingDots/>}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{
        padding:"12px 16px", background:"var(--bg1)",
        borderTop:"1px solid var(--rule)", flexShrink:0,
      }}>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={
              lang === "te-IN" ? "ఏదైనా ఉత్పత్తి, స్టాక్, ధర గురించి అడగండి…" :
              lang === "hi-IN" ? "कोई भी सामान, स्टॉक, भाव पूछें…" :
              lang === "ta-IN" ? "பொருள், ஸ்டாக், விலை கேளுங்கள்…" :
              lang === "kn-IN" ? "ಯಾವುದಾದರೂ ಉತ್ಪನ್ನ, ಸ್ಟಾಕ್, ಬೆಲೆ ಕೇಳಿ…" :
              lang === "ml-IN" ? "ഏതെങ്കിലും ഉൽപ്പന്നം, സ്റ്റോക്ക്, വില ചോദിക്കൂ…" :
              lang === "mr-IN" ? "कोणताही उत्पाद, स्टॉक, किंमत विचारा…" :
              lang === "bn-IN" ? "যেকোনো পণ্য, স্টক, দাম জিজ্ঞেস করুন…" :
              lang === "gu-IN" ? "કોઈ પણ ઉત્પાદ, સ્ટોક, કિંમત પૂછો…" :
              lang === "pa-IN" ? "ਕੋਈ ਵੀ ਉਤਪਾਦ, ਸਟਾਕ, ਕੀਮਤ ਪੁੱਛੋ…" :
              "Ask about any product, stock, price…"
            }
            disabled={loading || ctxLoading}
            style={{
              flex:1, padding:"11px 14px", borderRadius:12,
              border:"1.5px solid var(--rule)",
              background:"var(--bg2)", color:"var(--ink)",
              fontSize:13, outline:"none",
              transition:"border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor="var(--saffron)"}
            onBlur={e => e.target.style.borderColor="var(--rule)"}
          />
          <button onClick={() => send()}
            disabled={!input.trim() || loading || ctxLoading}
            style={{
              width:44, height:44, borderRadius:12, border:"none",
              background: input.trim() && !loading
                ? "linear-gradient(135deg,var(--saffron),var(--saffron-hot,#ff8e35))"
                : "var(--bg3,#e0d5c8)",
              color: input.trim() && !loading ? "#fff" : "var(--ink-faint)",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor: input.trim() && !loading ? "pointer" : "default",
              transition:"all 0.2s",
              boxShadow: input.trim() && !loading ? "0 2px 10px rgba(232,119,34,0.35)" : "none",
              flexShrink:0,
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:6, textAlign:"center" }}>
          Powered by Claude AI · Reads your live inventory data
        </div>
      </div>
    </div>
  )
}
