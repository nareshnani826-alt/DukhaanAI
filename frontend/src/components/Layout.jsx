import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { usePlan } from "../context/PlanContext"
import { useTheme } from "../context/ThemeContext"
import { useState, useEffect, useRef } from "react"
import AuthModal from "./AuthModal"
import { LANG_KEY, getSavedLang } from "../voice/i18n"
import { getToken } from "../sync/db"

const NAV = [
  { label:"Home", to:"/dashboard",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>,
    sub:null },
  { label:"Sales", to:"/billing",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>,
    sub:[{to:"/billing",label:"GST Billing"},{to:"/udhar",label:"Udhar Khata"},{to:"/customers",label:"Customers"}] },
  { label:"Stock", to:"/inventory",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    sub:[{to:"/inventory",label:"Inventory"},{to:"/bulk-import",label:"Bulk Import ✨"},{to:"/wastage",label:"Wastage"},{to:"/demand",label:"Demand Intel"}] },
  { label:"Assistant", to:"/voice",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    sub:[{to:"/voice",label:"Voice Agent"},{to:"/agent",label:"AI Agent"}] },
  { label:"More", to:"/day",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    sub:[{to:"/day",label:"Day Ops"},{to:"/insights",label:"Insights"},{to:"/app-screens",label:"App Screens"},{to:"/help",label:"Help"},{to:"/settings",label:"Settings"},{to:"/install",label:"Install App"}] },
]

const MOB_TABS = [
  { to:"/dashboard", label:"Home",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg> },
  { to:"/billing", label:"Sales",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { to:"/voice", label:"", voice:true },
  { to:"/inventory", label:"Stock",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> },
  { to:"/day", label:"More",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg> },
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

// ── Rule-based smart reply (no API needed) ────────────────────
function generateReply(q, data, lang) {
  const { products = [], sales = {}, udhar_customers = [] } = data
  const query = q.toLowerCase()

  const low   = products.filter(p => parseFloat(p.stock||0) <= parseFloat(p.min_stock||0) && parseFloat(p.stock||0) > 0)
  const out   = products.filter(p => parseFloat(p.stock||0) === 0)
  const today = parseFloat(sales.today_total || 0)
  const month = parseFloat(sales.month_total || 0)
  const totalDue = udhar_customers.reduce((s,c) => s + parseFloat(c.total_due||0), 0)

  // Stock check
  if (/stock|inventory|items|products|వస్తువు|స్టాక్|स्टॉक|สต็อก|ಸ್ಟಾಕ್|സ്റ്റോക്ക്/.test(query)) {
    if (/low|less|తక్కువ|कम|குறைந்த|ಕಡಿಮೆ|കുറഞ്ഞ/.test(query)) {
      if (low.length === 0) return lang === "te-IN" ? "అన్ని వస్తువులు తగినంత స్టాక్‌లో ఉన్నాయి! ✅" : "All items have sufficient stock! ✅"
      return `⚠️ Low stock items (${low.length}):\n` + low.slice(0,8).map(p => `• ${p.name} — ${p.stock} ${p.unit||""}`).join("\n")
    }
    if (/out|zero|అయిపో|खत्म|தீர்ந்த/.test(query)) {
      if (out.length === 0) return "No items are out of stock! ✅"
      return `❌ Out of stock (${out.length}):\n` + out.slice(0,8).map(p => `• ${p.name}`).join("\n")
    }
    return `📦 Stock Summary:\n• Total products: ${products.length}\n• Low stock: ${low.length}\n• Out of stock: ${out.length}\n• In stock: ${products.length - out.length}`
  }

  // Sales
  if (/sale|sell|అమ్మకాలు|बिक्री|விற்பனை|ಮಾರಾಟ|വിൽപ്പന/.test(query)) {
    return `💰 Sales Summary:\n• Today: ₹${today.toFixed(2)}\n• This month: ₹${month.toFixed(2)}`
  }

  // Udhaar
  if (/udh|khata|due|బాకీ|बकाया|நிலுவை|ಬಾಕಿ|ബാക്കി/.test(query)) {
    if (udhar_customers.length === 0) return "No udhaar customers found."
    const top = udhar_customers.filter(c => parseFloat(c.total_due||0) > 0).slice(0,5)
    return `🧾 Udhaar Dues:\n• Total due: ₹${totalDue.toFixed(2)}\n• Customers: ${udhar_customers.length}\n\nTop dues:\n` +
      top.map(c => `• ${c.name} — ₹${parseFloat(c.total_due).toFixed(2)}`).join("\n")
  }

  // Top sellers
  if (/top|best|seller|popular|best/.test(query)) {
    const sorted = [...products].sort((a,b) => parseFloat(b.price||0) - parseFloat(a.price||0)).slice(0,5)
    return `🏆 Top Products by Price:\n` + sorted.map(p => `• ${p.name} — ₹${p.price}`).join("\n")
  }

  // Search specific product
  const found = products.filter(p => p.name?.toLowerCase().includes(query))
  if (found.length > 0) {
    return `🔍 Found ${found.length} product(s):\n` +
      found.slice(0,5).map(p => `• ${p.name}\n  Stock: ${p.stock} ${p.unit||""} | Price: ₹${p.price}`).join("\n")
  }

  // Default
  const defaults = {
    "te-IN": "నేను అర్థం చేసుకోలేదు. దయచేసి స్టాక్, అమ్మకాలు, లేదా ఉధార్ గురించి అడగండి.",
    "hi-IN": "मुझे समझ नहीं आया। कृपया स्टॉक, बिक्री या उधार के बारे में पूछें।",
    "en-IN": "I can help with:\n• Stock levels\n• Today's sales\n• Low stock items\n• Udhaar dues\n• Search a product by name",
  }
  return defaults[lang] || defaults["en-IN"]
}

// ── AIChatWidget ──────────────────────────────────────────────
function AIChatWidget() {
  const [open, setOpen]           = useState(false)
  const [lang, setLang]           = useState(getSavedLang)
  const [messages, setMessages]   = useState([
    { id:1, role:"assistant",
      text:"నమస్కారం! 👋 I'm your Shop Assistant.\nAsk me about stock, sales, or udhaar!",
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

  async function fetchStoreData(question) {
    const token   = getToken()
    if (!token) return {}
    const headers = { Authorization:`Bearer ${token}` }
    const data    = {}
    try {
      const [prodRes, salesRes] = await Promise.all([
        fetch(`${API}/api/products?limit=1000`, { headers }),
        fetch(`${API}/api/sales/summary`, { headers }),
      ])
      data.products = prodRes.ok  ? await prodRes.json()  : []
      data.sales    = salesRes.ok ? await salesRes.json() : {}

      if (/udh|khata|due|బాకీ|बकाया|நிலுவை|ಬಾಕಿ|ബാക്കി/.test(question.toLowerCase())) {
        const ucRes = await fetch(`${API}/api/udhar/customers`, { headers })
        data.udhar_customers = ucRes.ok ? await ucRes.json() : []
      }
    } catch(e) { console.error("fetch error:", e) }
    return data
  }

  async function send(text) {
    const q = (text || input).trim()
    if (!q || loading) return
    setInput("")
    setChipsUsed(true)
    setMessages(p => [...p, { id:Date.now(), role:"user", text:q, time:timestamp() }])
    setLoading(true)

    try {
      const data  = await fetchStoreData(q)
      const reply = generateReply(q, data, lang)
      setTimeout(() => {
        setMessages(p => [...p, { id:Date.now()+1, role:"assistant", text:reply, time:timestamp() }])
        setLoading(false)
      }, 600)
    } catch(e) {
      setMessages(p => [...p, { id:Date.now()+1, role:"assistant",
        text:"⚠️ Could not load store data. Please try again.", time:timestamp() }])
      setLoading(false)
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
        <div style={{
          position:"fixed", bottom:90, right:24, zIndex:200,
          width:320, height:460, borderRadius:18,
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
              <div style={{ color:"rgba(255,255,255,0.85)", fontSize:10, display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#a3f0c4", display:"inline-block" }}/>
                Live store data
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
          <div ref={msgsRef} style={{ flex:1, overflowY:"auto", padding:"10px 10px",
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

            {!chipsUsed && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:2 }}>
                {chips.map(chip => (
                  <button key={chip} onClick={() => send(chip)}
                    style={{ fontSize:11, fontWeight:500, borderRadius:20, padding:"5px 11px",
                      cursor:"pointer", transition:"all 0.15s",
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
                placeholder="Type your message..."
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
            Reads your live store data
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button onClick={() => setOpen(o => !o)} title="AI Assistant"
        style={{ position:"fixed", bottom:24, right:24, zIndex:201,
          width:52, height:52, borderRadius:"50%",
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
  const { vendor, loggedIn, cloud, logout } = useAuth()
  const { planLabel } = usePlan()
  const { theme, toggleTheme, isDark } = useTheme()
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
                letterSpacing:"1.2px", textTransform:"uppercase" }}>Kirana POS</div>
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
            <div style={{ width:30, height:30, borderRadius:8, flexShrink:0,
              background:"linear-gradient(135deg,#e87722,#d45f00)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"'Tiro Devanagari Hindi',serif", fontWeight:700, fontSize:15, color:"#fff" }}>द</div>
            <span style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:16,
              color:"var(--ink)", fontWeight:700 }}>
              दुकान<span style={{color:"var(--saffron)"}}>•</span>AI
            </span>
            <span style={{ fontSize:9, color: cloud ? "var(--jade)" : "var(--ink-faint)" }}>
              {cloud ? "● Cloud" : "● Local"}
            </span>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <button onClick={toggleTheme}
              style={{ background:"var(--bg2)", border:"1px solid var(--rule)",
                borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:14 }}>
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
        background:"var(--bg1)", borderTop:"1px solid var(--rule)",
        display:"none", alignItems:"flex-end", justifyContent:"space-around",
        padding:"8px 4px 12px", boxShadow:"0 -4px 20px var(--shadow)" }}>
        {MOB_TABS.map(tab => {
          if (tab.voice) return (
            <div key="voice" onClick={() => navigate("/voice")}
              style={{ position:"relative", marginTop:-22, width:56, height:56, borderRadius:"50%",
                background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
                boxShadow:"0 0 0 4px var(--bg1), 0 6px 20px rgba(232,119,34,0.4)",
                display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </div>
          )
          const on = location.pathname.startsWith(tab.to)
          return (
            <button key={tab.to} onClick={() => navigate(tab.to)}
              style={{ background:"transparent", border:"none", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                color: on ? "var(--saffron)" : "var(--ink-faint)", padding:"4px 8px",
                borderTop: on ? "2px solid var(--saffron)" : "2px solid transparent" }}>
              <div style={{width:22, height:22}}>{tab.icon}</div>
              <span style={{ fontSize:9, fontWeight: on?700:500 }}>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Floating mic — moved left */}
      <button onClick={() => navigate("/voice")} title="Voice Entry"
        style={{ position:"fixed", bottom:24, right:86, zIndex:50,
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

      {/* Floating AI chat bubble */}
      <AIChatWidget />
    </div>
  )
}
