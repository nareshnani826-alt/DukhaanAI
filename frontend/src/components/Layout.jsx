import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { usePlan } from "../context/PlanContext"
import { useTheme } from "../context/ThemeContext"
import { useAppMode } from "../context/AppModeContext"
import { useState, useEffect, useRef } from "react"
import AuthModal from "./AuthModal"
import { LANG_KEY, getSavedLang } from "../voice/i18n"
import { getToken, Products, Sales, Invoices, Udhar } from "../sync/db"

const KIRANA_NAV = [
  { label:"Home", to:"/dashboard",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>,
    sub:null },
  { label:"Sales", to:"/billing",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>,
    sub:[{to:"/billing",label:"GST Billing"},{to:"/history",label:"History"},{to:"/udhar",label:"Udhar Khata"},{to:"/customers",label:"Customers"}] },
  { label:"Stock", to:"/inventory",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    sub:[{to:"/inventory",label:"Inventory"},{to:"/bulk-import",label:"Bulk Import ✨"},{to:"/wastage",label:"Wastage"},{to:"/demand",label:"Demand Intel"},{to:"/expiry",label:"Expiry Intel 🕐"}] },
  { label:"Assistant", to:"/voice",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    sub:[{to:"/voice",label:"Voice Agent"}] },
  { label:"More", to:"/day",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    sub:[{to:"/day",label:"Day Ops"},{to:"/insights",label:"Insights"},{to:"/app-screens",label:"App Screens"},{to:"/help",label:"Help"},{to:"/settings",label:"Settings"},{to:"/install",label:"Install App"}] },
]

const BANGLE_NAV = [
  { label:"Home", to:"/bangle-dashboard",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>,
    sub:null },
  { label:"Inventory", to:"/bangle-inventory",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>,
    sub:[{to:"/bangle-inventory",label:"💍 Stock"},{to:"/bangle-billing",label:"🧾 Billing"},{to:"/bangle-festivals",label:"🗓️ Festival Calendar"},{to:"/bangle-insights",label:"📊 Insights"}] },
  { label:"Assistant", to:"/voice",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    sub:null },
  { label:"More", to:"/more",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    sub:[{to:"/settings",label:"Settings"},{to:"/help",label:"Help"},{to:"/install",label:"Install App"}] },
]

const BANGLE_MOB_TABS = [
  { to:"/bangle-inventory", label:"Stock",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg> },
  { to:"/bangle-billing", label:"Bill",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { to:"/voice", label:"", voice:true },
  { to:"/bangle-dashboard", label:"Home",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg> },
  { to:"/more", label:"More",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg> },
]

const MOB_TABS = [
  { to:"/dashboard", label:"Home",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg> },
  { to:"/billing", label:"Bill",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg> },
  { to:"/voice", label:"", voice:true },
  { to:"/demand", label:"Demand",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-7"/></svg> },
  { to:"/more", label:"More",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg> },
]

const API = import.meta.env.VITE_API_URL

const CHIPS_BY_LANG = {
  "en-IN": ["Check stock", "Today's sales", "Low stock", "Udhaar dues"],
  "te-IN": ["స్టాక్ చెక్", "ఈరోజు అమ్మకాలు", "తక్కువ స్టాక్", "ఉధార్ బాకీలు"],
  "hi-IN": ["स्टॉक चेक", "आज की बिक्री", "कम स्टॉक", "उधार बकाया"],
  "ta-IN": ["ஸ்டாக் பார்", "இன்றைய விற்பனை", "குறைந்த ஸ்டாக்", "கடன் நிலுவை"],
  "kn-IN": ["ಸ್ಟಾಕ್ ಚೆಕ್", "ಇಂದಿನ ಮಾರಾಟ", "ಕಡಿಮೆ ಸ್ಟಾಕ್", "ಉಧಾರ್ ಬಾಕಿ"],
  "ml-IN": ["സ്റ്റോക്ക്", "ഇന്നത്തെ വിൽപ്പന", "കുറഞ്ഞ സ്റ്റോക്ക്", "കടം ബാക്കി"],
  "mr-IN": ["स्टॉक तपासा", "आजची विक्री", "कमी स्टॉक", "उधार थकबाकी"],
  "bn-IN": ["স্টক চেক", "আজকের বিক্রয়", "কম স্টক", "উধার বকেয়া"],
  "gu-IN": ["સ્ટોક ચેક", "આજનું વેચાણ", "ઓછો સ્ટોક", "ઉધાર બાકી"],
  "pa-IN": ["ਸਟਾਕ ਚੈੱਕ", "ਅੱਜ ਦੀ ਵਿਕਰੀ", "ਘੱਟ ਸਟਾਕ", "ਉਧਾਰ ਬਕਾਇਆ"],
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })
}

// ── Detect store-related questions ────────────────────────────
function isStoreQuestion(q) {
  return /stock|inventory|price|mrp|cost|margin|profit|sale|revenue|invoice|bill|udh|khata|due|baki|wastage|expire|damage|product|item|low|reorder|categ|brand|sku|unit|స్టాక్|అమ్మకాలు|బాకీ|ధర|ఉధార్|తక్కువ|వస్తువు|లాభ|स्टॉक|बिक्री|उधार|कीमत|लाभ|ஸ்டாக்|விற்பனை|கடன்|ಸ್ಟಾಕ್|ಮಾರಾಟ|ಬಾಕಿ/i.test(q)
}

// ── Helper: margin % ──────────────────────────────────────────
function calcMargin(p) {
  const mrp  = parseFloat(p.mrp || 0)
  const cost = parseFloat(p.cost_price || 0)
  if (mrp <= 0 || cost <= 0) return 0
  return Math.round((mrp - cost) / mrp * 100)
}

// ── Answer using db.js APIs (auth handled internally, no raw fetch) ──
async function localReply(q) {
  const query = q.toLowerCase()

  // Always fetch products via db.js
  const products = await Products.list({ limit: 1000 }).catch(() => [])

  // ── Specific product search ──────────────────────────────
  const stopWords = new Set(["stock","price","mrp","cost","margin","the","and","is","in","of","what","how","many","much","about","tell","me","give","show","do","we","have","any","for","check"])
  const words   = query.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))
  const matched = words.length > 0
    ? products.filter(p => words.some(w => p.name?.toLowerCase().includes(w)))
    : []

  if (matched.length > 0 && !/sale|revenue|udh|baki|wastage|low|reorder|categ|margin|profit|top|best/.test(query)) {
    const lines = matched.slice(0,6).map(p => {
      const isOut = parseFloat(p.stock||0) === 0
      const isLow = !isOut && parseFloat(p.stock||0) < parseFloat(p.min_stock||0)
      const status = isOut ? "❌ Out of stock" : isLow ? "⚠️ Low stock" : "✅ In stock"
      const m = calcMargin(p)
      return `• ${p.name}${p.category ? ` (${p.category})` : ""}
  Stock: ${p.stock} ${p.unit||""} ${status}
  MRP: ₹${p.mrp||0} | Cost: ₹${p.cost_price||0} | Margin: ${m}%`
    })
    return `🔍 Found ${matched.length} product(s):\n\n${lines.join("\n\n")}`
  }

  // ── Sales ────────────────────────────────────────────────
  if (/sale|revenue|invoice|bill|అమ్మకాలు|बिक्री|விற்பனை|ಮಾರಾಟ/.test(query)) {
    const [today, month, bills] = await Promise.all([
      Sales.today().catch(() => ({ total:0, count:0, sales:[] })),
      Sales.summary({ days:30 }).catch(() => ({ total_revenue:0, transaction_count:0, top_products:[] })),
      Invoices.list().catch(() => []),
    ])
    const todayBills = bills.filter(b => {
      const d = new Date(b.created_at)
      const now = new Date()
      return d.toDateString() === now.toDateString()
    })
    const topLines = (month.top_products||[]).slice(0,5).map(p => `  • ${p.name} — ${p.units} sold`)
    return `💰 Sales Summary:
• Today: ₹${today.total||0} (${today.count||0} sales, ${todayBills.length} invoices)
• This month: ₹${month.total_revenue||0} (${month.transaction_count||0} sales)
${topLines.length ? `\n🏆 Top products this month:\n${topLines.join("\n")}` : ""}`
  }

  // ── Bill / Invoice history ───────────────────────────────
  if (/history|invoice|bill history|recent bill/.test(query)) {
    const bills = await Invoices.list().catch(() => [])
    if (!bills.length) return "No bills generated yet."
    const lines = bills.slice(0,8).map(b =>
      `• ${b.invoice_no} — ${b.customer_name} — ₹${b.total} (${new Date(b.created_at).toLocaleDateString("en-IN")})`
    )
    return `🧾 Recent Bills (${bills.length} total):\n\n${lines.join("\n")}`
  }

  // ── Udhaar ───────────────────────────────────────────────
  if (/udh|khata|due|baki|bakaya|బాకీ|उधार|கடன்|ಬಾಕಿ/.test(query)) {
    const customers = await Udhar.listCustomers().catch(() => [])
    const due   = customers.filter(c => parseFloat(c.total_due||0) > 0)
    const total = due.reduce((s,c) => s + parseFloat(c.total_due||0), 0)
    if (due.length === 0) return "✅ No udhaar dues! All customers are clear."
    const lines = due.slice(0,8).map(c => `• ${c.name}${c.phone?` (${c.phone})`:""} — ₹${parseFloat(c.total_due).toFixed(2)}`)
    return `🧾 Udhaar Summary:
• Total due: ₹${total.toFixed(2)}
• Customers with dues: ${due.length}

Top dues:
${lines.join("\n")}`
  }

  // ── Low stock / reorder ──────────────────────────────────
  if (/low|reorder|out of|minimum|min|తక్కువ|कम|குறைந்த|ಕಡಿಮೆ/.test(query)) {
    const low = products.filter(p => parseFloat(p.stock||0) > 0 && parseFloat(p.stock||0) < parseFloat(p.min_stock||0))
    const out = products.filter(p => parseFloat(p.stock||0) === 0)
    if (low.length === 0 && out.length === 0) return "✅ All products have sufficient stock! Nothing to reorder."
    let reply = ""
    if (out.length > 0) reply += `❌ Out of stock (${out.length}):\n${out.slice(0,8).map(p=>`• ${p.name}`).join("\n")}\n\n`
    if (low.length > 0) reply += `⚠️ Low stock (${low.length}):\n${low.slice(0,8).map(p=>`• ${p.name} — ${p.stock}/${p.min_stock} ${p.unit||""}`).join("\n")}`
    return reply.trim()
  }

  // ── Best margin / most profitable ───────────────────────
  if (/margin|profit|profitable|best|top|లాభ|लाभ/.test(query)) {
    const withMargin = products
      .filter(p => parseFloat(p.mrp||0) > 0 && parseFloat(p.cost_price||0) > 0)
      .map(p => ({ ...p, m: calcMargin(p) }))
      .sort((a,b) => b.m - a.m)
    if (withMargin.length === 0) return "No margin data available. Please add MRP and cost price to your products."
    const lines = withMargin.slice(0,8).map(p => `• ${p.name} — ${p.m}% margin (MRP ₹${p.mrp} | Cost ₹${p.cost_price})`)
    return `🏆 Best Margin Products:\n\n${lines.join("\n")}`
  }

  // ── Categories ───────────────────────────────────────────
  if (/categ|type|section|group/.test(query)) {
    const cats = [...new Set(products.map(p=>p.category).filter(Boolean))].sort()
    if (cats.length === 0) return "No categories found. Add categories to your products in inventory."
    const lines = cats.map(c => {
      const count = products.filter(p => p.category === c).length
      return `• ${c} — ${count} product(s)`
    })
    return `📂 Product Categories (${cats.length}):\n\n${lines.join("\n")}`
  }

  // ── Full inventory overview ──────────────────────────────
  if (/stock|inventory|all|list|total|overview|సమాచారం|स्टॉक|ஸ்டாக்|ಸ್ಟಾಕ್/.test(query)) {
    const low      = products.filter(p => parseFloat(p.stock||0) > 0 && parseFloat(p.stock||0) < parseFloat(p.min_stock||0))
    const out      = products.filter(p => parseFloat(p.stock||0) === 0)
    const ok       = products.filter(p => parseFloat(p.stock||0) >= parseFloat(p.min_stock||0))
    const cats     = [...new Set(products.map(p=>p.category).filter(Boolean))]
    const totalVal = products.reduce((s,p) => s + parseFloat(p.stock||0) * parseFloat(p.cost_price||0), 0)
    return `📦 Inventory Overview:
• Total products: ${products.length}
• ✅ In stock: ${ok.length}
• ⚠️ Low stock: ${low.length}
• ❌ Out of stock: ${out.length}
• 📂 Categories: ${cats.length > 0 ? cats.join(", ") : "None set"}
• 💰 Inventory value: ₹${totalVal.toFixed(2)}`
  }

  return null // not handled locally
}

// ── AIChatWidget ──────────────────────────────────────────────
function AIChatWidget() {
  const { vendor } = useAuth()

  const [open, setOpen]           = useState(false)
  const [lang, setLang]           = useState(getSavedLang)
  const [messages, setMessages]   = useState([
    { id:1, role:"assistant",
      text:"నమస్కారం! 👋 I'm your Shop Assistant.\nAsk me about stock, sales, margins, udhaar — or anything else!",
      time:timestamp() }
  ])
  const [input, setInput]         = useState("")
  const [loading, setLoading]     = useState(false)
  const [chipsUsed, setChipsUsed] = useState(false)
  const msgsRef  = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [messages, loading, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function send(text) {
    const q = (text || input).trim()
    if (!q || loading) return

    setInput("")
    setChipsUsed(true)
    setMessages(p => [...p, { id:Date.now(), role:"user", text:q, time:timestamp() }])
    setLoading(true)

    try {
      const token = getToken()
      let reply   = null

      // 1. Store question → local db.js APIs (zero latency, always free)
      if (token && isStoreQuestion(q)) {
        try { reply = await localReply(q) } catch(e) { console.error(e) }
      }

      // 2. No local answer → backend cascade: Groq → Gemini → sorry
      if (!reply) {
        try {
          const res = await fetch(`${API}/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ message: q, language: lang, history: [], store_context: {} }),
          })
          if (res.ok) {
            const data = await res.json()
            reply = data?.response || null
          } else if (res.status === 429 || res.status === 503) {
            reply = "😢 Sorry, I don't have information right now — our AI has hit its daily limit. It refreshes every day, so please try again later!"
          } else {
            reply = null
          }
        } catch(e) {
          console.error("AI fetch error:", e)
        }
      }

      // 3. Both local + AI failed
      if (!reply) {
        reply = "😢 Sorry, I don't have information on that right now. You can ask me about your stock, sales, udhaar, margins, or low-stock alerts!"
      }

      setMessages(p => [...p, { id:Date.now()+1, role:"assistant", text:reply, time:timestamp() }])
    } catch(e) {
      console.error("Chat error:", e)
      setMessages(p => [...p, { id:Date.now()+1, role:"assistant",
        text:"⚠️ Connection error. Please try again.", time:timestamp() }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function startMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec    = new SR()
    rec.lang     = lang
    rec.onresult = (e) => setInput(e.results[0][0].transcript)
    rec.start()
  }

  const chips = CHIPS_BY_LANG[lang] || CHIPS_BY_LANG["en-IN"]

  return (
    <>
      {open && (
        <div className="mob-chat-panel" style={{
          position:"fixed", bottom:90, right:24, zIndex:200,
          width:320, height:480, borderRadius:18,
          background:"var(--bg1, #f7f4f2)",
          boxShadow:"0 8px 40px rgba(0,0,0,0.18)",
          border:"1px solid var(--rule, #eee)",
          display:"flex", flexDirection:"column", overflow:"hidden",
          animation:"chatPop 0.2s ease-out",
        }}>
          {/* Header */}
          <div style={{ background:"var(--saffron, #e87722)", padding:"11px 13px",
            display:"flex", alignItems:"center", gap:9, flexShrink:0 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
              background:"rgba(255,255,255,0.2)", border:"2px solid rgba(255,255,255,0.35)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🤖</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:"white", fontWeight:700, fontSize:13 }}>Shop Assistant</div>
              <div style={{ color:"rgba(255,255,255,0.85)", fontSize:10,
                display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:"50%",
                  background:"#a3f0c4", display:"inline-block" }}/>
                Live data · Groq + Gemini AI
              </div>
            </div>
            <select value={lang} onChange={e => setLang(e.target.value)}
              style={{ fontSize:10, borderRadius:20, padding:"3px 7px", border:"none",
                background:"rgba(255,255,255,0.9)", color:"var(--saffron, #e87722)",
                outline:"none", cursor:"pointer", fontWeight:600 }}>
              <option value="en-IN">EN</option>
              <option value="te-IN">తె</option>
              <option value="hi-IN">हि</option>
              <option value="ta-IN">த</option>
              <option value="kn-IN">ಕ</option>
              <option value="ml-IN">മ</option>
              <option value="mr-IN">म</option>
              <option value="bn-IN">ব</option>
              <option value="gu-IN">ગ</option>
              <option value="pa-IN">ਪ</option>
            </select>
            <button onClick={() => setOpen(false)}
              style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:"50%",
                width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", color:"white", fontSize:13, flexShrink:0 }}>✕</button>
          </div>

          {/* Messages */}
          <div ref={msgsRef} style={{ flex:1, overflowY:"auto", padding:"10px",
            display:"flex", flexDirection:"column", gap:8,
            background:"var(--bg1, #f7f4f2)", scrollbarWidth:"none" }}>

            {messages.map(msg => (
              <div key={msg.id} style={{ display:"flex", alignItems:"flex-end", gap:6,
                flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                {msg.role === "assistant" && (
                  <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0,
                    background:"var(--saffron, #e87722)", display:"flex",
                    alignItems:"center", justifyContent:"center", fontSize:12 }}>🤖</div>
                )}
                <div style={{ maxWidth:"80%" }}>
                  <div style={{
                    padding:"8px 11px", fontSize:12, lineHeight:1.55, whiteSpace:"pre-wrap",
                    borderRadius: msg.role === "user" ? "13px 13px 4px 13px" : "13px 13px 13px 4px",
                    background: msg.role === "user" ? "var(--saffron, #e87722)" : "var(--bg0, #fff)",
                    color: msg.role === "user" ? "white" : "var(--ink, #1a1a1a)",
                    border: msg.role === "assistant" ? "0.5px solid var(--rule, #eee)" : "none",
                    boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
                  }}>{msg.text}</div>
                  <div style={{ fontSize:9, color:"var(--ink-faint, #bbb)", marginTop:2,
                    textAlign: msg.role === "user" ? "right" : "left" }}>{msg.time}</div>
                </div>
              </div>
            ))}

            {/* Typing dots */}
            {loading && (
              <div style={{ display:"flex", alignItems:"flex-end", gap:6 }}>
                <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0,
                  background:"var(--saffron, #e87722)", display:"flex",
                  alignItems:"center", justifyContent:"center", fontSize:12 }}>🤖</div>
                <div style={{ padding:"10px 13px", borderRadius:"13px 13px 13px 4px",
                  background:"var(--bg0, #fff)", border:"0.5px solid var(--rule, #eee)",
                  display:"flex", gap:4, alignItems:"center" }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{ width:6, height:6, borderRadius:"50%",
                      background:"var(--saffron, #e87722)", display:"inline-block",
                      animation:"dukaanTyping 1.1s infinite",
                      animationDelay:`${i*0.18}s`, opacity:0.4 }}/>
                  ))}
                </div>
              </div>
            )}

            {/* Quick chips */}
            {!chipsUsed && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:2 }}>
                {chips.map(chip => (
                  <button key={chip} onClick={() => send(chip)}
                    style={{ fontSize:11, fontWeight:500, borderRadius:20,
                      padding:"5px 11px", cursor:"pointer", transition:"all 0.15s",
                      background:"var(--bg0, white)",
                      border:"1.5px solid var(--saffron, #e87722)",
                      color:"var(--saffron, #e87722)" }}
                    onMouseEnter={e => { e.currentTarget.style.background="var(--saffron, #e87722)"; e.currentTarget.style.color="white" }}
                    onMouseLeave={e => { e.currentTarget.style.background="var(--bg0, white)"; e.currentTarget.style.color="var(--saffron, #e87722)" }}>
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ background:"var(--bg0, #fff)", borderTop:"0.5px solid var(--rule, #eee)",
            padding:"8px 10px", display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:6,
              background:"var(--bg1, #f7f4f2)", borderRadius:20,
              border:"0.5px solid var(--rule, #eee)", padding:"0 10px", minHeight:34 }}>
              <input ref={inputRef} type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask about your store..."
                disabled={loading}
                style={{ flex:1, border:"none", outline:"none", background:"transparent",
                  fontSize:12, color:"var(--ink, #1a1a1a)", fontFamily:"inherit", padding:"6px 0" }}/>
              <button onClick={startMic} aria-label="Voice input"
                style={{ background:"none", border:"none", cursor:"pointer", padding:"2px 0",
                  color:"var(--saffron, #e87722)", display:"flex", alignItems:"center", flexShrink:0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="11" rx="3"/>
                  <path d="M5 10a7 7 0 0 0 14 0"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                  <line x1="9" y1="22" x2="15" y2="22"/>
                </svg>
              </button>
            </div>
            <button onClick={() => send()} disabled={loading || !input.trim()} aria-label="Send"
              style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, border:"none",
                background:"var(--saffron, #e87722)", color:"white",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                opacity: loading || !input.trim() ? 0.5 : 1 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <div style={{ textAlign:"center", fontSize:9, color:"var(--ink-faint, #ccc)",
            padding:"3px", background:"var(--bg0, white)" }}>
            Store data: Free · AI: Groq → Gemini (daily limit refreshes)
          </div>
        </div>
      )}

      {/* Floating bubble button — hidden on Voice page (bill panel already occupies bottom-right) */}
      <button onClick={() => setOpen(o => !o)} title="AI Assistant"
        className="mob-chat-btn"
        style={{ position:"fixed", bottom:24, right:24, zIndex:201,
          width:52, height:52, borderRadius:"50%",
          display: location.pathname === "/voice" ? "none" : "flex",
          background: open ? "var(--ink, #333)" : "linear-gradient(135deg,var(--saffron, #e87722),#d45f00)",
          border:"3px solid var(--bg1, #fff)",
          boxShadow:"0 4px 20px rgba(232,119,34,0.45)",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", transition:"all 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.transform="scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
        {open ? (
          <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      <style>{`
        @keyframes chatPop {
          from { opacity:0; transform:scale(0.92) translateY(10px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes dukaanTyping {
          0%,80%,100% { transform:translateY(0); opacity:0.3; }
          40% { transform:translateY(-4px); opacity:1; }
        }
      `}</style>
    </>
  )
}

// ── Main Layout ───────────────────────────────────────────────
export default function Layout({ children }) {
  const { vendor, loggedIn, cloud, hasModule, logout } = useAuth()
  const hasBangle = hasModule("bangle_fancy")
  const hasKirana = hasModule("kirana")
  const multiStore = hasBangle && hasKirana

  const [storeMode, setStoreMode] = useState("kirana")

  // Re-derive mode whenever vendor changes (login/logout) or modules change
  useEffect(() => {
    let newMode = "kirana"
    if (!vendor) {
      // Logged out — restore last used mode from localStorage
      const saved = localStorage.getItem("storeMode")
      newMode = saved === "bangle_fancy" ? "bangle_fancy" : "kirana"
    } else if (hasBangle && !hasKirana) {
      newMode = "bangle_fancy"
    } else if (multiStore) {
      const saved = localStorage.getItem("storeMode")
      newMode = saved === "bangle_fancy" ? "bangle_fancy" : "kirana"
    }
    setStoreMode(newMode)

    // Redirect kirana routes → bangle home when vendor has no kirana access
    if (vendor && newMode === "bangle_fancy") {
      const BANGLE_ROUTES = ["/bangle", "/voice", "/more", "/settings", "/help", "/install"]
      const onBangleRoute = BANGLE_ROUTES.some(r => location.pathname.startsWith(r))
      if (!onBangleRoute) navigate("/bangle-dashboard")
    }
  }, [vendor, hasBangle, hasKirana])

  function switchMode(mode) {
    setStoreMode(mode)
    localStorage.setItem("storeMode", mode)
  }

  const NAV      = storeMode === "bangle_fancy" ? BANGLE_NAV : KIRANA_NAV
  const MOB_TABS_ACTIVE = storeMode === "bangle_fancy" ? BANGLE_MOB_TABS : MOB_TABS
  const storeLabel = !loggedIn ? "Retail POS" : (storeMode === "bangle_fancy" ? "Bangle Store" : "Kirana POS")

  const { planLabel } = usePlan()
  const { theme, toggleTheme, isDark } = useTheme()
  const { appMode } = useAppMode()
  const [showAuth, setShowAuth] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const navigate  = useNavigate()
  const location  = useLocation()

  useEffect(() => {
    if (location.state?.showLogin) {
      setShowAuth(true)
      navigate(location.pathname, { replace:true, state:{ ...location.state, showLogin:false } })
    }
  }, [location.state, location.pathname, navigate])

  function isActive(nav) {
    if (nav.sub) return nav.sub.some(s => location.pathname.startsWith(s.to))
    return location.pathname.startsWith(nav.to)
  }

  return (
    <div className="app-shell">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
              background:"linear-gradient(135deg,#e87722,#d45f00)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"'Tiro Devanagari Hindi',serif", fontWeight:700, fontSize:20, color:"#fff",
              boxShadow:"0 3px 10px rgba(232,119,34,0.35)" }}>द</div>
            <div>
              <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:17,
                color:"var(--ink)", fontWeight:700, lineHeight:1 }}>
                दुकान<span style={{color:"var(--saffron)"}}>•</span>AI
              </div>
              <div style={{ fontSize:9, color:"var(--ink-faint)", marginTop:2,
                letterSpacing:"1.2px", textTransform:"uppercase" }}>{storeLabel}</div>
            </div>
          </div>
          {loggedIn && (
            <div style={{ marginTop:10, display:"inline-flex", alignItems:"center", gap:4,
              background:"var(--saffron-bg)", color:"var(--saffron)",
              fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:20,
              border:"1px solid rgba(232,119,34,0.25)" }}>
              ★ {planLabel?.name || "Free"} Plan
            </div>
          )}
        </div>

        {multiStore && (
          <div style={{ display:"flex", gap:6, padding:"10px 14px 2px" }}>
            {[
              { id:"kirana",       label:"🛒 Kirana" },
              { id:"bangle_fancy", label:"💍 Bangle" },
            ].map(({ id, label }) => {
              const active = storeMode === id
              return (
                <button key={id} onClick={() => switchMode(id)}
                  style={{ flex:1, padding:"6px 4px", borderRadius:8, border:"1px solid",
                    fontSize:10, fontWeight:700, cursor:"pointer", transition:"all 0.15s",
                    background: active ? "var(--saffron)" : "var(--bg2)",
                    color:       active ? "#fff"          : "var(--ink-dim)",
                    borderColor: active ? "var(--saffron)": "var(--rule)" }}>
                  {label}
                </button>
              )
            })}
          </div>
        )}

        <nav className="sidebar-nav">
          <div style={{ fontSize:9, fontWeight:700, color:"var(--ink-faint)",
            letterSpacing:"1.5px", padding:"10px 16px 4px", textTransform:"uppercase" }}>Menu</div>
          {NAV.map(nav => {
            const active = isActive(nav)
            const isOpen = expanded === nav.label
            const hasSub = !!nav.sub?.length
            return (
              <div key={nav.label}>
                <div onClick={() => hasSub ? setExpanded(isOpen ? null : nav.label) : navigate(nav.to)}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px",
                    cursor:"pointer", userSelect:"none", transition:"all 0.15s",
                    borderLeft:`3px solid ${active ? "var(--saffron)" : "transparent"}`,
                    background: active ? "var(--saffron-bg)" : "transparent",
                    color: active ? "var(--saffron)" : "var(--ink-dim)" }}
                  onMouseEnter={e => { if(!active) e.currentTarget.style.background="var(--bg2)" }}
                  onMouseLeave={e => { if(!active) e.currentTarget.style.background="transparent" }}>
                  <span style={{ width:16, height:16, display:"flex", alignItems:"center",
                    justifyContent:"center", flexShrink:0,
                    color: active ? "var(--saffron)" : "var(--ink-faint)" }}>{nav.icon}</span>
                  <span style={{ flex:1, fontSize:13, fontWeight: active ? 700 : 500 }}>{nav.label}</span>
                  {hasSub && (
                    <svg width="10" height="10" fill="none" stroke="var(--ink-faint)" strokeWidth="2" viewBox="0 0 24 24"
                      style={{ transform: isOpen?"rotate(90deg)":"none", transition:"0.2s" }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  )}
                </div>
                {hasSub && isOpen && (
                  <div style={{ background:"var(--bg2)" }}>
                    {nav.sub.map(s => {
                      const on = location.pathname === s.to || location.pathname.startsWith(s.to)
                      return (
                        <div key={s.to} onClick={() => navigate(s.to)}
                          style={{ display:"flex", alignItems:"center", gap:8,
                            padding:"8px 16px 8px 42px", cursor:"pointer", fontSize:12,
                            color: on ? "var(--saffron)" : "var(--ink-dim)",
                            fontWeight: on ? 600 : 400,
                            background: on ? "var(--saffron-bg)" : "transparent",
                            borderLeft: on ? "3px solid var(--saffron)" : "3px solid transparent",
                            transition:"all 0.1s" }}
                          onMouseEnter={e => { if(!on) e.currentTarget.style.color="var(--ink)" }}
                          onMouseLeave={e => { if(!on) e.currentTarget.style.color="var(--ink-dim)" }}>
                          <div style={{ width:5, height:5, borderRadius:"50%",
                            background: on ? "var(--saffron)" : "var(--ink-faint)", flexShrink:0 }}/>
                          {s.label}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)", marginBottom:2 }}>
            {vendor?.store_name || "DukaanAI"}
          </div>
          <div style={{ fontSize:10, color: cloud ? "var(--jade)" : "var(--ink-faint)", marginBottom:10 }}>
            {cloud ? "● Cloud sync ON" : loggedIn ? "● Free plan" : "● Local only"}
          </div>
          <button onClick={toggleTheme}
            style={{ display:"flex", alignItems:"center", gap:8, width:"100%",
              background:"var(--bg2)", border:"1px solid var(--rule)",
              borderRadius:9, padding:"7px 12px", cursor:"pointer",
              color:"var(--ink-dim)", fontSize:11, fontWeight:600, marginBottom:8,
              transition:"all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor="var(--saffron)"}
            onMouseLeave={e => e.currentTarget.style.borderColor="var(--rule)"}>
            <span style={{ fontSize:15 }}>{isDark ? "☀️" : "🌙"}</span>
            {isDark ? "Switch to Light" : "Switch to Dark"}
          </button>
          {!loggedIn
            ? <button onClick={() => setShowAuth(true)} className="btn btn-primary btn-sm" style={{ width:"100%" }}>
                Login / Register
              </button>
            : <button onClick={logout}
                style={{ background:"none", color:"var(--ink-faint)", border:"none",
                  fontSize:10, cursor:"pointer", padding:0 }}>Logout</button>
          }
        </div>
      </aside>

      <main className="app-main">
        <div className="mobile-header">
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:9, flexShrink:0,
              background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"'Tiro Devanagari Hindi',serif", fontWeight:700, fontSize:16, color:"#fff",
              boxShadow:"0 2px 8px rgba(212,98,31,0.35)" }}>द</div>
            <div>
              <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:16,
                color:"var(--ink)", fontWeight:700, lineHeight:1 }}>
                दुकान<span style={{color:"var(--saffron)"}}>•</span>AI
              </div>
              <div style={{ fontSize:9, color: cloud ? "var(--jade)" : "var(--ink-faint)",
                letterSpacing:"0.5px", marginTop:1 }}>
                {cloud ? "● Cloud sync" : "● Local"}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <button onClick={toggleTheme}
              style={{ background:"var(--bg2)", border:"1px solid var(--rule)",
                borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:14,
                boxShadow:"0 1px 4px var(--shadow)" }}>
              {isDark ? "☀️" : "🌙"}
            </button>
            {!loggedIn
              ? <button onClick={() => setShowAuth(true)} className="btn btn-primary btn-sm">Login</button>
              : <button onClick={logout}
                  style={{ background:"var(--bg2)", color:"var(--ink-dim)",
                    border:"1px solid var(--rule)", borderRadius:8,
                    padding:"5px 10px", fontSize:10, cursor:"pointer" }}>Logout</button>
            }
          </div>
        </div>
        {children}
      </main>

      <nav className="mobile-bottom-nav" style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:100,
        background:"var(--bg2)", borderTop:"1px solid var(--rule)",
        display:"none", alignItems:"flex-end", justifyContent:"space-around",
        padding:"8px 4px 12px", boxShadow:"0 -4px 20px var(--shadow)" }}>
        {(storeMode === "bangle_fancy"
          ? MOB_TABS_ACTIVE
          : [
              ...MOB_TABS.slice(0, 3),
              appMode === "lite"
                ? { to:"/inventory", label:"Stock",
                    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> }
                : MOB_TABS[3],
              MOB_TABS[4],
            ]
        ).map(tab => {
          if (tab.voice) return (
            <div key="voice" onClick={() => navigate("/voice")}
              style={{ position:"relative", marginTop:-22, width:58, height:58, borderRadius:"50%",
                background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
                boxShadow:"0 0 0 4px var(--bg2), 0 8px 20px rgba(212,98,31,0.55)",
                display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </div>
          )
          const PRIMARY = storeMode === "bangle_fancy"
            ? ["/bangle-inventory", "/bangle-billing", "/voice", "/bangle-dashboard"]
            : ["/dashboard", "/billing", "/voice", "/demand"]
          const on = tab.to === "/more"
            ? !PRIMARY.some(p => location.pathname.startsWith(p)) && location.pathname !== "/"
            : location.pathname.startsWith(tab.to)
          return (
            <button key={tab.to} onClick={() => navigate(tab.to)}
              style={{ background:"transparent", border:"none", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                color: on ? "var(--saffron)" : "var(--ink-faint)", padding:"4px 10px",
                flex:1, position:"relative" }}>
              {on && <div style={{ position:"absolute", top:0, left:"25%", right:"25%",
                height:2, borderRadius:"0 0 2px 2px", background:"var(--saffron)" }}/>}
              <div style={{ width:22, height:22,
                background: on ? "var(--saffron-bg)" : "transparent",
                borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center",
                padding:2 }}>{tab.icon}</div>
              <span style={{ fontSize:10, fontWeight: on ? 700 : 500 }}>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Floating mic — hidden on mobile (bottom nav has the mic) and on Voice page */}
      <button onClick={() => navigate("/voice")} title="Voice Entry"
        className="mob-voice-fab"
        style={{ position:"fixed", bottom:24, right:86, zIndex:50,
          display: location.pathname === "/voice" ? "none" : undefined,
          width:52, height:52, borderRadius:"50%",
          background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
          border:"3px solid var(--bg1)",
          boxShadow:"0 4px 20px rgba(232,119,34,0.45)",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", transition:"transform 0.2s, box-shadow 0.2s" }}
        onMouseEnter={e => { e.currentTarget.style.transform="scale(1.1)"; e.currentTarget.style.boxShadow="0 6px 28px rgba(232,119,34,0.6)" }}
        onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow="0 4px 20px rgba(232,119,34,0.45)" }}>
        <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
          <path d="M19 10v2a7 7 0 01-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>

      {/* Groq AI chat bubble */}
      <AIChatWidget />
    </div>
  )
}
