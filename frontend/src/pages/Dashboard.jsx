import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Products, Sales, Invoices, api, isCloud } from "../sync/db"
import { useAuth } from "../context/AuthContext"
import { tr } from "../i18n/kiranaStrings"

const INR = n => "₹" + (n || 0).toLocaleString("en-IN")

// Read persisted UI language (same key as voice language)
function getUILang() {
  try { return localStorage.getItem("dk_voice_lang") || "en-IN" } catch { return "en-IN" }
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

const QUICK = [
  { label:"New Sale",    icon:"🧾", color:"var(--saffron-bg)", border:"rgba(232,119,34,0.25)", to:"/billing" },
  { label:"Add Stock",   icon:"📦", color:"var(--brass-bg)",   border:"rgba(184,134,11,0.25)",  to:"/inventory" },
  { label:"Add Udhar",   icon:"📒", color:"var(--ember-bg)",   border:"rgba(192,57,43,0.25)",   to:"/udhar" },
  { label:"Scan Item",   icon:"📷", color:"var(--jade-bg)",    border:"rgba(26,122,74,0.25)",   to:"/billing" },
  { label:"Voice Entry", icon:"🎤", color:"var(--saffron-bg)", border:"rgba(232,119,34,0.25)", to:"/voice" },
  { label:"Bulk Import", icon:"📥", color:"var(--brass-bg)",   border:"rgba(184,134,11,0.25)",  to:"/bulk-import" },
]

// ── Stock Popup ───────────────────────────────────────────────
function StockPopup({ type, items, storeName, onClose, onStockUpdate }) {
  const [editing,  setEditing]  = useState(null)   // { id, name, stock }
  const [editVal,  setEditVal]  = useState("")
  const [saving,   setSaving]   = useState(false)

  const titles = {
    out_of_stock: { label:"Out of Stock",     icon:"🔴", color:"var(--ember)",   desc:"These items have zero stock. Restock immediately." },
    low_stock:    { label:"Low Stock",         icon:"🟡", color:"#d97706",        desc:"These items are below their minimum stock level." },
    dead_stock:   { label:"Dead Stock (30d)",  icon:"💤", color:"var(--brass)",   desc:"No sales in the last 30 days. Consider discounting or returning." },
  }
  const meta = titles[type] || titles.low_stock

  function buildWAMessage() {
    const lines = items.map(p => {
      if (type === "out_of_stock") return `• ${p.name}: OUT OF STOCK ❌`
      if (type === "low_stock")    return `• ${p.name}: ${p.stock} ${p.unit || "units"} left (min: ${p.min_stock})`
      return `• ${p.name}: ${p.stock} ${p.unit || "units"} unsold`
    }).join("\n")
    const header = type === "out_of_stock"
      ? `🚨 *Out of Stock Alert — ${storeName}*\nRestock these items immediately:\n\n`
      : type === "low_stock"
      ? `⚠️ *Low Stock Alert — ${storeName}*\nPlease arrange stock for:\n\n`
      : `📦 *Dead Stock Report — ${storeName}*\nConsider discounting these items:\n\n`
    return encodeURIComponent(header + lines + "\n\n_Sent from DukhaanAI_")
  }

  async function saveEdit() {
    if (!editing) return
    const newStock = parseFloat(editVal)
    if (isNaN(newStock) || newStock < 0) return
    setSaving(true)
    try {
      const delta = newStock - editing.stock
      await api.patch(`/products/${editing.id}/adjust-stock?adjustment=${delta}&reason=manual+update`)
      onStockUpdate(editing.id, newStock)
      setEditing(null)
    } catch {}
    setSaving(false)
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:350, background:"rgba(0,0,0,0.55)",
      backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center",
      padding:"24px 16px" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width:"100%", maxWidth:460, background:"var(--bg1,#fff)", borderRadius:22,
          boxShadow:"0 12px 48px rgba(0,0,0,0.25)", display:"flex", flexDirection:"column",
          maxHeight:"80vh", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"20px 22px 16px", borderBottom:"1px solid var(--rule)",
          display:"flex", alignItems:"flex-start", gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:12, flexShrink:0,
            background: type === "out_of_stock" ? "rgba(192,57,43,0.10)" : type === "low_stock" ? "rgba(217,119,6,0.10)" : "rgba(184,134,11,0.10)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
            {meta.icon}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:"var(--ink)" }}>{meta.label}</div>
            <div style={{ fontSize:11, color:"var(--ink-faint)", marginTop:3, lineHeight:1.5 }}>{meta.desc}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
            fontSize:18, color:"var(--ink-faint)", flexShrink:0, padding:4 }}>✕</button>
        </div>

        {/* WhatsApp CTA */}
        <div style={{ padding:"10px 22px", borderBottom:"1px solid var(--rule)", background:"rgba(37,211,102,0.06)" }}>
          <a href={`https://wa.me/?text=${buildWAMessage()}`} target="_blank" rel="noreferrer"
            style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
            <div style={{ width:34, height:34, borderRadius:10, background:"#25D366",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>📲</div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#128C7E" }}>Send WhatsApp Stock Alert</div>
              <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:1 }}>Share this list with your supplier or staff</div>
            </div>
            <svg style={{ marginLeft:"auto", flexShrink:0 }} width="14" height="14" fill="none"
              stroke="#128C7E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
        </div>

        {/* Item list */}
        <div style={{ overflowY:"auto", flex:1 }}>
          {items.length === 0 && (
            <div style={{ padding:"32px 22px", textAlign:"center", color:"var(--ink-faint)", fontSize:13 }}>
              No items to show
            </div>
          )}
          {items.map((p, i) => (
            <div key={p.id || i} style={{ padding:"11px 22px",
              borderBottom: i < items.length-1 ? "1px solid var(--rule-soft,rgba(0,0,0,0.05))" : "none",
              display:"flex", alignItems:"center", gap:12 }}>

              {/* Status dot */}
              <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
                background: p.stock <= 0 ? "var(--ember)" : "#d97706" }}/>

              {/* Name + stock */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                {editing?.id === p.id ? (
                  <div style={{ display:"flex", gap:6, marginTop:5, alignItems:"center" }}>
                    <input type="number" min="0" value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && saveEdit()}
                      style={{ width:80, padding:"5px 8px", borderRadius:8, fontSize:12,
                        border:"1.5px solid var(--saffron)", outline:"none", background:"#fffbeb" }}
                      autoFocus />
                    <span style={{ fontSize:11, color:"var(--ink-faint)" }}>{p.unit || "units"}</span>
                    <button onClick={saveEdit} disabled={saving}
                      style={{ padding:"5px 12px", borderRadius:8, border:"none",
                        background:"var(--saffron)", color:"#fff", fontSize:11, fontWeight:700,
                        cursor:saving?"default":"pointer", opacity:saving?0.7:1 }}>
                      {saving ? "…" : "Save"}
                    </button>
                    <button onClick={() => setEditing(null)}
                      style={{ padding:"5px 8px", borderRadius:8, border:"1px solid var(--rule)",
                        background:"transparent", fontSize:11, color:"var(--ink-faint)", cursor:"pointer" }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize:11, color: p.stock <= 0 ? "var(--ember)" : "#d97706",
                    fontWeight:600, marginTop:2 }}>
                    {p.stock <= 0 ? "Out of stock" : `${p.stock} ${p.unit || "units"} left`}
                    {p.min_stock > 0 && p.stock > 0 && (
                      <span style={{ color:"var(--ink-faint)", fontWeight:400 }}> · min {p.min_stock}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Edit button */}
              {editing?.id !== p.id && p.id && (
                <button onClick={() => { setEditing(p); setEditVal(String(p.stock)) }}
                  style={{ padding:"5px 12px", borderRadius:9, border:"1.5px solid var(--rule)",
                    background:"var(--bg2)", fontSize:11, fontWeight:600,
                    color:"var(--ink)", cursor:"pointer", flexShrink:0, whiteSpace:"nowrap" }}>
                  ✏️ Edit
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer count */}
        <div style={{ padding:"10px 22px", borderTop:"1px solid var(--rule)", textAlign:"center",
          fontSize:11, color:"var(--ink-faint)" }}>
          {items.length} item{items.length !== 1 ? "s" : ""} shown
        </div>
      </div>
    </div>
  )
}

// ── Morning Briefing card ─────────────────────────────────────
function BriefingCard({ briefing, navigate, onStockClick }) {
  const [open, setOpen] = useState(true)
  if (!briefing) return null

  const { stockout_predictions, low_stock, out_of_stock, dead_stock, margin_alerts, udhar } = briefing

  const items = []

  // Stockout predictions (most urgent)
  stockout_predictions?.forEach(p => {
    const urgent = p.days_left < 1
    items.push({
      icon:  urgent ? "🔴" : "🟠",
      text:  `${p.name} — ${p.days_left < 1 ? "runs out TODAY" : `runs out in ${p.days_left} day${p.days_left !== 1 ? "s" : ""}`}`,
      sub:   `Selling ${p.daily_rate} ${p.unit}/day`,
      color: urgent ? "var(--ember)" : "#d97706",
      bg:    urgent ? "var(--ember-bg)" : "rgba(217,119,6,0.08)",
      to:    "/inventory",
    })
  })

  // Out of stock
  if (out_of_stock?.length > 0) {
    items.push({
      icon:  "❌",
      text:  `${out_of_stock.length} item${out_of_stock.length > 1 ? "s" : ""} OUT of stock`,
      sub:   out_of_stock.slice(0, 3).map(p => p.name).join(", "),
      color: "var(--ember)",
      bg:    "var(--ember-bg)",
      stockType: "out_of_stock",
    })
  }

  // Low stock (only if not already covered by stockout predictions)
  const predNames = new Set(stockout_predictions?.map(p => p.name) || [])
  const lowExtra  = low_stock?.filter(p => !predNames.has(p.name)) || []
  if (lowExtra.length > 0) {
    items.push({
      icon:  "⚠️",
      text:  `${lowExtra.length} item${lowExtra.length > 1 ? "s" : ""} running low`,
      sub:   lowExtra.slice(0, 3).map(p => p.name).join(", "),
      color: "var(--brass)",
      bg:    "var(--brass-bg)",
      stockType: "low_stock",
    })
  }

  // Dead stock
  if (dead_stock?.count > 0) {
    items.push({
      icon:  "💸",
      text:  `${INR(dead_stock.blocked_value)} blocked in dead stock`,
      sub:   `${dead_stock.count} item${dead_stock.count > 1 ? "s" : ""} unsold for 30+ days${dead_stock.items?.length ? " · " + dead_stock.items.slice(0,2).map(p=>p.name).join(", ") : ""}`,
      color: "var(--brass)",
      bg:    "rgba(184,134,11,0.07)",
      stockType: "dead_stock",
    })
  }

  // Udhar dues
  if (udhar?.total_due > 0) {
    items.push({
      icon:  "📒",
      text:  `${INR(udhar.total_due)} in pending Udhar`,
      sub:   `${udhar.customer_count} customer${udhar.customer_count > 1 ? "s" : ""} with dues${udhar.top?.length ? " · " + udhar.top.map(u => u.name).join(", ") : ""}`,
      color: "#7c3aed",
      bg:    "rgba(124,58,237,0.07)",
      to:    "/udhar",
    })
  }

  // Margin alerts
  if (margin_alerts?.length > 0) {
    items.push({
      icon:  "📉",
      text:  `${margin_alerts.length} product${margin_alerts.length > 1 ? "s" : ""} below 10% margin`,
      sub:   margin_alerts.slice(0, 3).map(p => `${p.name} (${p.margin_pct}%)`).join(", "),
      color: "var(--ember)",
      bg:    "var(--ember-bg)",
      to:    "/insights",
    })
  }

  if (items.length === 0) {
    return (
      <div style={{ background:"var(--bg2)", border:"1px solid var(--rule)", borderRadius:18,
        padding:"18px 20px", marginBottom:16, boxShadow:"0 2px 12px var(--shadow)",
        display:"flex", alignItems:"center", gap:14 }}>
        <span style={{ fontSize:28 }}>✅</span>
        <div>
          <div style={{ fontWeight:700, fontSize:13, color:"var(--ink)" }}>All clear today!</div>
          <div style={{ fontSize:11, color:"var(--ink-faint)", marginTop:2 }}>Stock healthy · No pending udhar · Margins good</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background:"var(--bg2)", border:"1px solid var(--rule)", borderRadius:18,
      marginBottom:16, boxShadow:"0 2px 12px var(--shadow)", overflow:"hidden" }}>
      {/* Header */}
      <button onClick={() => setOpen(o => !o)}
        style={{ width:"100%", background:"none", border:"none", cursor:"pointer",
          padding:"13px 18px", display:"flex", alignItems:"center", gap:10, textAlign:"left" }}>
        <span style={{ fontSize:18 }}>🌅</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:13, color:"var(--ink)" }}>Today's Briefing</div>
          <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:1 }}>
            {items.length} action item{items.length !== 1 ? "s" : ""} need attention
          </div>
        </div>
        <svg width="14" height="14" fill="none" stroke="var(--ink-faint)" strokeWidth="2" viewBox="0 0 24 24"
          style={{ transform: open ? "rotate(180deg)" : "none", transition:"0.2s", flexShrink:0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{ borderTop:"1px solid var(--rule)" }}>
          {items.map((item, i) => (
            <button key={i} onClick={() => item.stockType ? onStockClick?.(item.stockType) : navigate(item.to || "/inventory")}
              style={{ width:"100%", background:"none", border:"none", cursor:"pointer",
                padding:"11px 18px", display:"flex", alignItems:"flex-start", gap:12,
                borderBottom: i < items.length - 1 ? "1px solid var(--rule-soft, rgba(0,0,0,0.05))" : "none",
                transition:"background 0.1s", textAlign:"left" }}
              onMouseEnter={e => e.currentTarget.style.background="var(--bg2)"}
              onMouseLeave={e => e.currentTarget.style.background="none"}>
              <div style={{ width:32, height:32, borderRadius:10, flexShrink:0, marginTop:1,
                background: item.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>
                {item.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color: item.color, lineHeight:1.3 }}>{item.text}</div>
                <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:3,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.sub}</div>
              </div>
              <svg width="12" height="12" fill="none" stroke="var(--ink-faint)" strokeWidth="2"
                viewBox="0 0 24 24" style={{ flexShrink:0, marginTop:4 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Local day-session helpers (free-plan users) ───────────────
function localGetDaySession() {
  try {
    const s = JSON.parse(localStorage.getItem("dk_day_session") || "null")
    if (!s) return null
    const today = new Date().toISOString().slice(0, 10)
    return s.date === today ? s : null
  } catch { return null }
}
function localSetDaySession(s) {
  try { localStorage.setItem("dk_day_session", JSON.stringify(s)) } catch {}
}

export default function Dashboard() {
  const { vendor, cloud } = useAuth()
  const navigate = useNavigate()
  const [uiLang, setUiLang] = useState(getUILang)
  // Re-read lang if voice language changes (same event key used in voice/i18n.js)
  useEffect(() => {
    const onStorage = () => setUiLang(getUILang())
    window.addEventListener("storage", onStorage)
    window.addEventListener("dk:voice-lang", onStorage)
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("dk:voice-lang", onStorage) }
  }, [])
  const t = (key) => tr(key, uiLang)
  const [today,       setToday]       = useState({ total:0, count:0, sales:[] })
  const [summary,     setSummary]     = useState({ total_revenue:0 })
  const [low,         setLow]         = useState([])
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [briefing,    setBriefing]    = useState(null)
  const [showLowList,  setShowLowList]  = useState(false)
  const [stockToast,   setStockToast]   = useState(false)

  // ── Day session state ─────────────────────────────────────
  const [daySession,        setDaySession]        = useState(undefined)
  const [dayActing,         setDayActing]         = useState(false)
  const [dayError,          setDayError]          = useState("")
  const [showCloseConfirm,  setShowCloseConfirm]  = useState(false)
  const [stockPopup,        setStockPopup]        = useState(null) // { type, items }
  const [showReopenConfirm, setShowReopenConfirm] = useState(false)
  const [showAutoClose,     setShowAutoClose]     = useState(false)
  const [autoCloseSecsLeft, setAutoCloseSecsLeft] = useState(300)

  useEffect(() => {
    // Use Invoices.today() for revenue — it captures voice bills that have no
    // product_id and therefore no matching sales record.
    Promise.all([
      Invoices.today().catch(() => null),
      Sales.summary({ days:30 }).catch(() => null),
      Products.lowStock().catch(() => []),
      Products.count().catch(() => 0),
    ]).then(([t, s, l, count]) => {
      if (t) setToday({ ...t, sales: t.invoices || t.sales || [] })
      if (s) setSummary(s)
      setLow(Array.isArray(l) ? l : [])
      setTotal(typeof count === "number" ? count : 0)
    }).finally(() => setLoading(false))

    // Briefing only for authenticated (cloud) users
    if (vendor) {
      api.get("/insights/briefing").then(setBriefing).catch(() => {})
    }
  }, [cloud, vendor?.id])

  // Load day session
  useEffect(() => {
    if (!vendor) { setDaySession(null); return }
    if (isCloud()) {
      api.get("/day-sessions/today")
        .then(s => setDaySession(s))
        .catch(() => setDaySession(null))
    } else {
      setDaySession(localGetDaySession())
    }
  }, [vendor?.id])

  async function openDay() {
    setDayActing(true); setDayError("")
    try {
      if (isCloud()) {
        const s = await api.post("/day-sessions/open", {})
        setDaySession(s)
      } else {
        const s = { id:"local-day-"+Date.now(), date:new Date().toISOString().slice(0,10),
          opened_at:new Date().toISOString(), status:"open", opening_stock:[] }
        localSetDaySession(s); setDaySession(s)
      }
    } catch { setDayError("Could not open — try Day Ops page") }
    setDayActing(false)
  }

  async function closeDay() {
    setDayActing(true); setDayError("")
    try {
      if (isCloud()) {
        const s = await api.post("/day-sessions/close", { store_type: "kirana" })
        setDaySession(s)
      } else {
        const s = localGetDaySession()
        if (s) {
          const closed = { ...s, status:"closed", closed_at:new Date().toISOString() }
          localSetDaySession(closed); setDaySession(closed)
        }
      }
    } catch { setDayError("Could not close — try Day Ops page") }
    setDayActing(false)
  }

  async function reopenDay() {
    setDayActing(true); setDayError("")
    try {
      if (isCloud()) {
        const s = await api.post("/day-sessions/reopen")
        setDaySession(s)
      } else {
        const s = localGetDaySession()
        if (s) {
          const reopened = { ...s, status:"open", closed_at:null, total_sales:null, gross_profit:null }
          localSetDaySession(reopened); setDaySession(reopened)
        }
      }
    } catch { setDayError("Could not reopen — try again") }
    setDayActing(false)
  }

  function goBilling() { navigate("/billing") }

  async function openStockPopup(type) {
    setStockPopup({ type, items: [], loading: true })
    try {
      if (type === "dead_stock") {
        // Use briefing dead stock items (already fetched)
        const items = (briefing?.dead_stock?.items || []).map(p => ({
          id: p.id, name: p.name, stock: p.stock, unit: p.unit || ""
        }))
        setStockPopup({ type, items })
      } else {
        // Fetch low-stock endpoint — returns all items with stock < min_stock
        const all = await api.get("/products/low-stock")
        const items = type === "out_of_stock"
          ? all.filter(p => (p.stock || 0) <= 0)
          : all.filter(p => (p.stock || 0) > 0)
        setStockPopup({ type, items })
      }
    } catch {
      setStockPopup({ type, items: [] })
    }
  }

  function handleStockUpdate(id, newStock) {
    // Update local low/out lists
    setLow(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p)
      .filter(p => p.stock < p.min_stock))
    // Update popup items live
    setStockPopup(prev => prev ? {
      ...prev,
      items: prev.items.map(p => p.id === id ? { ...p, stock: newStock } : p)
    } : null)
  }

  // ── 1 AM auto-close watchdog ──────────────────────────────
  useEffect(() => {
    if (!vendor) return
    const now = new Date()
    const next1AM = new Date(now)
    next1AM.setHours(1, 0, 0, 0)
    if (now >= next1AM) next1AM.setDate(next1AM.getDate() + 1)
    const warningTimer = setTimeout(() => {
      setDaySession(prev => {
        if (prev?.status === "open") { setShowAutoClose(true); setAutoCloseSecsLeft(300) }
        return prev
      })
    }, next1AM - now)
    return () => clearTimeout(warningTimer)
  }, [vendor?.id])

  useEffect(() => {
    if (!showAutoClose) return
    if (autoCloseSecsLeft <= 0) { setShowAutoClose(false); closeDay(); return }
    const tick = setTimeout(() => setAutoCloseSecsLeft(s => s - 1), 1000)
    return () => clearTimeout(tick)
  }, [showAutoClose, autoCloseSecsLeft])

  const avgInv = useMemo(
    () => today.count > 0 ? Math.round(today.total / today.count) : 0,
    [today.total, today.count]
  )
  const profit = useMemo(() => briefing?.profit, [briefing])

  return (
    <div style={{ flex:1, overflowY:"auto", background:"var(--bg0)" }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:none } }`}</style>

      {/* Top bar */}
      <div style={{ background:"var(--bg0)", backdropFilter:"blur(6px)",
        borderBottom:"1px solid var(--rule)",
        padding:"12px 16px", display:"flex", alignItems:"center",
        justifyContent:"space-between", position:"sticky", top:0, zIndex:10,
        boxShadow:"0 1px 6px var(--shadow)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0, flex:1 }}>
          <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
            background:"linear-gradient(135deg,#e87722,#d45f00)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"'Tiro Devanagari Hindi',serif", fontWeight:700, fontSize:17, color:"#fff",
            boxShadow:"0 2px 8px rgba(232,119,34,0.3)" }}>
            {vendor?.store_name?.charAt(0) || "न"}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {t(greeting())}, {vendor?.store_name?.split(" ")[0] || "ji"} 👋
            </div>
            <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:1,
              display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                maxWidth:120 }}>{new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}</span>
              <span style={{ fontSize:9, fontWeight:600, padding:"2px 7px", borderRadius:20, flexShrink:0,
                background: cloud ? "var(--jade-bg)" : "var(--bg2)",
                color: cloud ? "var(--jade)" : "var(--ink-faint)",
                border: `1px solid ${cloud ? "rgba(26,122,74,0.3)" : "var(--rule)"}` }}>
                {cloud ? "● Cloud" : "● Local"}
              </span>
            </div>
          </div>
        </div>
        {/* Day open/close in header */}
        <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0, marginLeft:8 }}>
          {vendor && daySession !== undefined && (() => {
            const isOpen   = daySession?.status === "open"
            const isClosed = daySession?.status === "closed"
            if (!daySession) return (
              <button onClick={openDay} disabled={dayActing}
                style={{ padding:"7px 14px", borderRadius:20, border:"none", fontSize:11, fontWeight:700,
                  background:"linear-gradient(135deg,#d97706,#b45309)", color:"#fff",
                  cursor:dayActing?"default":"pointer", opacity:dayActing?0.7:1,
                  boxShadow:"0 2px 8px rgba(217,119,6,0.35)", whiteSpace:"nowrap" }}>
                {dayActing ? "Opening…" : "▶ Open Day"}
              </button>
            )
            if (isOpen) return (
              <button onClick={() => setShowCloseConfirm(true)} disabled={dayActing}
                style={{ padding:"7px 14px", borderRadius:20, border:"1.5px solid rgba(26,122,74,0.4)",
                  fontSize:11, fontWeight:700, background:"var(--jade-bg,#e8f8f2)",
                  color:"var(--jade,#1a7a4a)", cursor:dayActing?"default":"pointer",
                  opacity:dayActing?0.7:1, whiteSpace:"nowrap" }}>
                {dayActing ? "Closing…" : "■ Close Day"}
              </button>
            )
            if (isClosed) return (
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:10, fontWeight:600, color:"var(--ink-faint)",
                  padding:"5px 10px", borderRadius:20, border:"1px solid var(--rule)",
                  background:"var(--bg2)", whiteSpace:"nowrap" }}>✓ Day Closed</span>
                <button onClick={() => setShowReopenConfirm(true)} disabled={dayActing}
                  style={{ padding:"5px 10px", borderRadius:20, border:"1.5px solid rgba(202,138,4,0.4)",
                    fontSize:10, fontWeight:700, background:"#fffbeb", color:"#92400e",
                    cursor:dayActing?"default":"pointer", opacity:dayActing?0.7:1, whiteSpace:"nowrap" }}>
                  ↺ Reopen
                </button>
              </div>
            )
          })()}
        </div>
      </div>

      <div className="page-content" style={{ padding:"16px" }}>

        {/* ══ 4 BIG QUICK-ACTION TILES ════════════════════════ */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>

          {/* 1 — New Bill (primary CTA) */}
          <button onClick={goBilling}
            style={{ gridColumn:"1 / -1",          /* full width */
              background:"linear-gradient(135deg,var(--saffron,#e87722),#d45f00)",
              border:"none", borderRadius:18, padding:"20px 22px",
              display:"flex", alignItems:"center", gap:16,
              cursor:"pointer", boxShadow:"0 8px 24px rgba(232,119,34,0.4)",
              transition:"transform 0.15s",
            }}
            onPointerDown={e => e.currentTarget.style.transform = "scale(0.97)"}
            onPointerUp={e   => e.currentTarget.style.transform = "scale(1)"}
            onPointerLeave={e=> e.currentTarget.style.transform = "scale(1)"}>
            <div style={{ width:52, height:52, borderRadius:14, background:"rgba(255,255,255,0.2)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>
              🧾
            </div>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontSize:18, fontWeight:900, color:"#fff", lineHeight:1 }}>
                {t("New Bill")}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.8)", marginTop:4 }}>
                {loading ? "Loading…"
                  : today.count > 0
                  ? `${today.count} bill${today.count > 1 ? "s" : ""} today · ${INR(today.total)}`
                  : "Tap to start billing"}
              </div>
            </div>
            <svg style={{ marginLeft:"auto", flexShrink:0 }} width="20" height="20" fill="none"
              stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {/* 2 — Add Stock */}
          <button onClick={() => navigate("/inventory")}
            style={{ background:"var(--bg2)", border:"1.5px solid var(--rule)", borderRadius:18,
              padding:"18px 16px", display:"flex", flexDirection:"column", alignItems:"flex-start",
              gap:8, cursor:"pointer", transition:"all 0.15s", textAlign:"left",
              boxShadow:"0 2px 8px var(--shadow)",
            }}
            onPointerDown={e => e.currentTarget.style.transform="scale(0.97)"}
            onPointerUp={e   => e.currentTarget.style.transform="scale(1)"}
            onPointerLeave={e=> e.currentTarget.style.transform="scale(1)"}>
            <div style={{ width:44, height:44, borderRadius:12,
              background:"rgba(29,158,117,0.12)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
              📦
            </div>
            <div style={{ fontSize:14, fontWeight:800, color:"var(--ink)" }}>{t("Add Stock")}</div>
            <div style={{ fontSize:11, color:"var(--jade)", fontWeight:600 }}>
              {loading ? "—" : `${total} products`}
            </div>
          </button>

          {/* 3 — Open Udhaar */}
          <button onClick={() => navigate("/udhar")}
            style={{ background:"var(--bg2)", border:"1.5px solid var(--rule)", borderRadius:18,
              padding:"18px 16px", display:"flex", flexDirection:"column", alignItems:"flex-start",
              gap:8, cursor:"pointer", transition:"all 0.15s", textAlign:"left",
              boxShadow:"0 2px 8px var(--shadow)",
            }}
            onPointerDown={e => e.currentTarget.style.transform="scale(0.97)"}
            onPointerUp={e   => e.currentTarget.style.transform="scale(1)"}
            onPointerLeave={e=> e.currentTarget.style.transform="scale(1)"}>
            <div style={{ width:44, height:44, borderRadius:12,
              background:"rgba(220,80,60,0.10)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
              📒
            </div>
            <div style={{ fontSize:14, fontWeight:800, color:"var(--ink)" }}>{t("Udhaar")}</div>
            <div style={{ fontSize:11, fontWeight:600,
              color: (briefing?.udhar?.total_due || 0) > 0 ? "var(--ember)" : "var(--jade)" }}>
              {briefing
                ? (briefing.udhar.collected_today > 0
                    ? "Kaata: " + INR(briefing.udhar.collected_today)
                    : briefing.udhar.total_due > 0
                      ? INR(briefing.udhar.total_due) + " due"
                      : "All clear")
                : "—"}
            </div>
          </button>

          {/* 4 — Low Stock (tap to expand inline list) */}
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            <button onClick={() => {
              if (low.length > 0) { setShowLowList(v => !v) }
              else { setStockToast(true); setTimeout(() => setStockToast(false), 3000) }
            }}
              style={{ background: low.length > 0 ? "var(--ember-bg,#fff5f5)" : "var(--bg2)",
                border: `1.5px solid ${low.length > 0 ? "rgba(192,57,43,0.3)" : "var(--rule)"}`,
                borderRadius: showLowList ? "18px 18px 0 0" : 18,
                padding:"18px 16px",
                display:"flex", flexDirection:"column", alignItems:"flex-start",
                gap:8, cursor: "pointer",
                transition:"all 0.15s", textAlign:"left",
                boxShadow:"0 2px 8px var(--shadow)",
              }}>
              <div style={{ width:44, height:44, borderRadius:12,
                background: low.length > 0 ? "rgba(192,57,43,0.12)" : "rgba(26,122,74,0.10)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
                position:"relative" }}>
                {low.length > 0 ? "⚠️" : "✅"}
                {low.length > 0 && (
                  <div style={{ position:"absolute", top:-6, right:-6,
                    minWidth:18, height:18, borderRadius:9, padding:"0 4px",
                    background:"var(--ember,#c0392b)", color:"#fff",
                    fontSize:10, fontWeight:900,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {low.length}
                  </div>
                )}
              </div>
              <div style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:"var(--ink)" }}>{t("Low Stock")}</div>
                  <div style={{ fontSize:11, fontWeight:600, marginTop:2,
                    color: low.length > 0 ? "var(--ember)" : "var(--jade)" }}>
                    {loading ? "—" : low.length > 0 ? `${low.length} item${low.length>1?"s":""}` : "All stocked"}
                  </div>
                </div>
                {low.length > 0 && (
                  <span style={{ fontSize:16, color:"var(--ember)", transition:"transform 0.2s",
                    transform: showLowList ? "rotate(90deg)" : "none" }}>›</span>
                )}
              </div>

              {/* All-stocked toast */}
              {stockToast && (
                <div style={{
                  marginTop: 8, padding: "8px 12px", borderRadius: 10,
                  background: "rgba(26,122,74,0.12)",
                  border: "1px solid rgba(26,122,74,0.25)",
                  fontSize: 11, fontWeight: 600, color: "var(--jade)",
                  display: "flex", alignItems: "center", gap: 6,
                  animation: "fadeIn 0.2s ease",
                }}>
                  🎉 All shelves are fully stocked — great job!
                </div>
              )}
            </button>

            {/* Inline expandable low-stock list */}
            {showLowList && low.length > 0 && (
              <div style={{ background:"var(--ember-bg,#fff5f5)",
                border:"1.5px solid rgba(192,57,43,0.3)", borderTop:"none",
                borderRadius:"0 0 18px 18px", overflow:"hidden" }}>
                {low.slice(0,6).map((p, i) => (
                  <div key={p.id} onClick={() => navigate("/inventory")}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"9px 16px", cursor:"pointer",
                      borderTop: i > 0 ? "1px solid rgba(192,57,43,0.1)" : "none" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:"var(--ink)",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"60%" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize:10, color:"var(--ember)", fontWeight:700, flexShrink:0 }}>
                      {p.stock} / {p.min_stock} {p.unit || ""}
                    </div>
                  </div>
                ))}
                <div onClick={() => navigate("/inventory")}
                  style={{ padding:"9px 16px", borderTop:"1px solid rgba(192,57,43,0.15)",
                    fontSize:11, fontWeight:700, color:"var(--ember)", cursor:"pointer",
                    textAlign:"center" }}>
                  View all in Inventory →
                </div>
              </div>
            )}
          </div>

        </div>
        {/* ══ END QUICK TILES ══════════════════════════════════ */}

        {/* Hero card */}
        <div style={{ background:"linear-gradient(135deg,var(--bg2),var(--bg3))",
          borderRadius:18, padding:"18px 16px",
          border:"1px solid rgba(166,124,46,0.25)", marginBottom:14,
          boxShadow:"0 12px 24px var(--shadow)", position:"relative", overflow:"hidden" }}>
          {/* concentric brass rings — matches design system */}
          <svg viewBox="0 0 200 200" style={{ position:"absolute", top:-40, right:-40,
            width:180, height:180, opacity:0.13, pointerEvents:"none" }} aria-hidden="true">
            {[...Array(14)].map((_,i) => (
              <circle key={i} cx="100" cy="100" r={20+i*8}
                fill="none" stroke="var(--brass)"
                strokeWidth="0.6"/>
            ))}
          </svg>
          <div style={{ position:"relative" }}>
            <div style={{ fontSize:10, fontWeight:800, color:"var(--brass-deep)",
              letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:6 }}>{t("Today's Takings")}</div>
            <div className="hero-revenue" style={{ fontFamily:"'Tiro Devanagari Hindi',serif",
              fontSize:48, fontWeight:800, color:"var(--ink)", lineHeight:1, letterSpacing:"-1px" }}>
              {loading ? "—" : INR(today.total)}
            </div>

            {/* Profit clarity row */}
            {profit && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8,
                padding:"7px 12px", borderRadius:10,
                background: profit.today >= 0 ? "var(--jade-bg)" : "var(--ember-bg)",
                border: `1px solid ${profit.today >= 0 ? "rgba(26,122,74,0.2)" : "rgba(192,57,43,0.2)"}`,
                width:"fit-content" }}>
                <span style={{ fontSize:14 }}>{profit.today >= 0 ? "📈" : "📉"}</span>
                <div>
                  <span style={{ fontSize:13, fontWeight:700,
                    color: profit.today >= 0 ? "var(--jade)" : "var(--ember)" }}>
                    {profit.today >= 0 ? "+" : ""}{INR(profit.today)} profit
                  </span>
                  <span style={{ fontSize:11, color:"var(--ink-faint)", marginLeft:6 }}>
                    ({profit.margin_pct}% margin)
                  </span>
                </div>
              </div>
            )}

            <div style={{ display:"flex", gap:20, marginTop:10, fontSize:12, flexWrap:"wrap" }}>
              <span style={{ color:"var(--jade)", fontWeight:600 }}>
                {today.count > 0 ? `${today.count} ${t(today.count===1?"invoice today":"invoices today")}` : t("No sales yet")}
              </span>
              <span style={{ color:"var(--ink-faint)" }}>
                {INR(avgInv)} avg · {INR(summary.total_revenue || 0)} this month
              </span>
              {profit && (
                <span style={{ color:"var(--ink-faint)" }}>
                  Monthly profit: {INR(profit.month?.profit || 0)} ({profit.month?.margin_pct || 0}%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Day Session Card ─────────────────────────────── */}
        {vendor && daySession !== undefined && (() => {
          const isOpen   = daySession?.status === "open"
          const isClosed = daySession?.status === "closed"
          const notOpened = !daySession

          const openedTime = daySession?.opened_at
            ? new Date(daySession.opened_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})
            : null
          const closedTime = daySession?.closed_at
            ? new Date(daySession.closed_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})
            : null

          const cardBg     = isOpen ? "var(--jade-bg,#e8f8f2)" : isClosed ? "var(--bg2)" : "#fffbeb"
          const cardBorder = isOpen ? "rgba(26,122,74,0.25)"   : isClosed ? "var(--rule)" : "rgba(202,138,4,0.35)"
          const dotColor   = isOpen ? "var(--jade)"            : isClosed ? "var(--ink-faint)" : "#d97706"
          const label      = isOpen ? "Day Open"               : isClosed ? "Day Closed"       : "Day Not Started"
          const sublabel   = isOpen   ? `Opened at ${openedTime}`
                           : isClosed ? `${openedTime} → ${closedTime}`
                           : "Open the day to track stock & profit"

          return (
            <div style={{ background:cardBg, border:`1px solid ${cardBorder}`,
              borderRadius:16, padding:"12px 16px", marginBottom:14,
              display:"flex", alignItems:"center", gap:12 }}>

              {/* Status dot + label */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:dotColor,
                    flexShrink:0, boxShadow: isOpen ? `0 0 0 3px ${dotColor}22` : "none" }}/>
                  <span style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{label}</span>
                </div>
                <div style={{ fontSize:11, color:"var(--ink-faint)" }}>{sublabel}</div>
                {isClosed && daySession.total_sales > 0 && (
                  <div style={{ fontSize:11, marginTop:4, display:"flex", gap:12 }}>
                    <span style={{ color:"var(--jade)", fontWeight:600 }}>
                      {INR(daySession.total_sales)} sales
                    </span>
                    {daySession.gross_profit != null && (
                      <span style={{ color: daySession.gross_profit >= 0 ? "var(--jade)" : "var(--ember)", fontWeight:600 }}>
                        {daySession.gross_profit >= 0 ? "+" : ""}{INR(daySession.gross_profit)} profit
                      </span>
                    )}
                  </div>
                )}
                {isOpen && today.total > 0 && (
                  <div style={{ fontSize:11, marginTop:4, color:"var(--jade)", fontWeight:600 }}>
                    {INR(today.total)} so far · {today.count} invoices
                  </div>
                )}
                {dayError && (
                  <div style={{ fontSize:10, color:"var(--ember)", marginTop:4 }}>{dayError}</div>
                )}
              </div>

              {isClosed && (
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  <button onClick={() => setShowReopenConfirm(true)} disabled={dayActing}
                    style={{ padding:"7px 14px", borderRadius:12,
                      border:"1.5px solid rgba(202,138,4,0.4)", background:"#fffbeb",
                      color:"#92400e", fontSize:11, fontWeight:700,
                      cursor:dayActing?"default":"pointer", opacity:dayActing?0.7:1 }}>
                    ↺ Reopen
                  </button>
                  <button onClick={() => navigate("/day")}
                    style={{ padding:"7px 14px", borderRadius:12,
                      border:"1.5px solid var(--rule)", background:"transparent",
                      color:"var(--ink-dim)", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                    View Report
                  </button>
                </div>
              )}
            </div>
          )
        })()}

        {/* Morning Briefing */}
        <BriefingCard briefing={briefing} navigate={navigate} onStockClick={openStockPopup} />

        {/* Secondary quick links row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:20 }}>
          {[
            { label:t("Udhaar"),     emoji:"📒", to:"/udhar" },
            { label:t("History"),    emoji:"🕑", to:"/history" },
            { label:t("Voice"),      emoji:"🎤", to:"/voice" },
            { label:t("Day Ops"),    emoji:"📅", to:"/day" },
          ].map((qa, i) => (
            <button key={i} onClick={() => navigate(qa.to)}
              style={{ background:"var(--bg2)", border:"1px solid var(--rule)",
                borderRadius:12, padding:"10px 6px", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:5,
                transition:"all 0.15s", boxShadow:"0 1px 4px var(--shadow)" }}
              onMouseEnter={e => e.currentTarget.style.borderColor="var(--saffron)"}
              onMouseLeave={e => e.currentTarget.style.borderColor="var(--rule)"}>
              <span style={{ fontSize:18 }}>{qa.emoji}</span>
              <span style={{ fontSize:10, color:"var(--ink)", fontWeight:600 }}>{qa.label}</span>
            </button>
          ))}
        </div>

        {/* Two columns — stacks to single on mobile */}
        <div className="dash-bottom-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

          {/* Recent sales */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"var(--brass-deep)", letterSpacing:"1.5px", textTransform:"uppercase" }}>{t("RECENT SALES")}</div>
              <button onClick={() => navigate("/billing")}
                style={{ fontSize:11, color:"var(--saffron)", fontWeight:600,
                  background:"none", border:"none", cursor:"pointer" }}>{t("View all →")}</button>
            </div>
            <div style={{ background:"var(--bg2)", borderRadius:14,
              border:"1px solid var(--rule)", overflow:"hidden",
              boxShadow:"0 4px 10px var(--shadow)" }}>
              {loading ? [1,2,3].map(i => (
                <div key={i} style={{ height:54, borderBottom:"1px solid var(--rule-soft)",
                  background:"var(--bg2)", margin:"2px 0" }}/>
              )) : today.sales.length === 0 ? (
                <div style={{ padding:"28px 16px", textAlign:"center",
                  color:"var(--ink-faint)", fontSize:13 }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>🎤</div>
                  Start your first sale!
                </div>
              ) : today.sales.slice(0, 5).map((s, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                  padding:"12px 14px", borderBottom: i < 4 ? "1px solid var(--rule-soft)" : "none" }}>
                  <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0,
                    background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
                    color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                    fontWeight:800, fontSize:13 }}>{(s.customer || "W").charAt(0).toUpperCase()}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.customer || "Walk-in"}</div>
                    <div style={{ fontSize:11, color:"var(--ink-faint)" }}>
                      {s.qty} items · {new Date(s.sold_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:"var(--saffron)" }}>{INR(s.total)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Health — inventory snapshot (complements briefing) */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"var(--brass-deep)", letterSpacing:"1.5px", textTransform:"uppercase" }}>
                Stock Health
              </div>
              <button onClick={() => navigate("/inventory")}
                style={{ fontSize:11, color:"var(--saffron)", fontWeight:600,
                  background:"none", border:"none", cursor:"pointer" }}>View all →</button>
            </div>
            <div style={{ background:"var(--bg2)", borderRadius:14, border:"1px solid var(--rule)",
              overflow:"hidden", boxShadow:"0 4px 10px var(--shadow)" }}>
              {[
                {
                  icon: "💰",
                  label: "Stock Value",
                  value: loading || !briefing ? "—"
                    : briefing.stock_value > 0
                      ? `₹${(briefing.stock_value/1000).toFixed(1)}k`
                      : "₹0",
                  sub: loading ? "" : `${briefing?.total_products ?? total} products`,
                  color: "var(--brass)",
                  bg: "rgba(184,134,11,0.10)",
                },
                {
                  icon: "💤",
                  label: "Dead Stock",
                  value: loading || !briefing ? "—" : briefing.dead_stock?.count ?? 0,
                  sub: briefing?.dead_stock?.blocked_value > 0
                    ? `₹${(briefing.dead_stock.blocked_value/1000).toFixed(1)}k blocked`
                    : "No dead stock",
                  color: briefing?.dead_stock?.count > 0 ? "var(--brass)" : "var(--jade)",
                  bg: briefing?.dead_stock?.count > 0 ? "rgba(184,134,11,0.10)" : "rgba(26,122,74,0.10)",
                  clickType: briefing?.dead_stock?.count > 0 ? "dead_stock" : null,
                },
                {
                  icon: "📈",
                  label: "Monthly Margin",
                  value: loading || !briefing ? "—"
                    : `${briefing.profit?.month?.margin_pct ?? 0}%`,
                  sub: briefing?.profit?.month
                    ? `${INR(briefing.profit.month.profit || 0)} profit`
                    : "This month",
                  color: (briefing?.profit?.month?.margin_pct ?? 0) > 15 ? "var(--jade)" : "var(--ember)",
                  bg: (briefing?.profit?.month?.margin_pct ?? 0) > 15
                    ? "rgba(26,122,74,0.10)" : "var(--ember-bg)",
                },
              ].map((row, i) => (
                <div key={i} onClick={() => row.clickType && openStockPopup(row.clickType)}
                  style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px",
                    borderBottom: i < 2 ? "1px solid var(--rule-soft,rgba(0,0,0,0.05))" : "none",
                    cursor: row.clickType ? "pointer" : "default", transition:"background 0.1s" }}
                  onMouseEnter={e => row.clickType && (e.currentTarget.style.background="rgba(0,0,0,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                  <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
                    background: row.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                    {row.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"var(--ink)" }}>{row.label}</div>
                    <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:2 }}>{row.sub}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{ fontSize:16, fontWeight:800, color: row.color }}>{row.value}</span>
                    {row.clickType && <svg width="12" height="12" fill="none" stroke="var(--ink-faint)"
                      strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ height:24 }}/>
      </div>

      {/* ── Stock Popup ─────────────────────────────────── */}
      {stockPopup && (
        <StockPopup
          type={stockPopup.type}
          items={stockPopup.items}
          storeName={vendor?.store_name || "Store"}
          onClose={() => setStockPopup(null)}
          onStockUpdate={handleStockUpdate}
        />
      )}

      {/* ── Reopen Confirm Modal ─────────────────────────── */}
      {showReopenConfirm && (
        <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.55)",
          backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}
          onClick={() => setShowReopenConfirm(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:"100%", maxWidth:440, background:"var(--bg1,#fff)", borderRadius:22,
              padding:"28px 24px", boxShadow:"0 12px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:44, height:44, borderRadius:13, flexShrink:0, background:"#fffbeb",
                border:"1.5px solid rgba(202,138,4,0.3)", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:22 }}>↺</div>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:"var(--ink)" }}>Reopen Today's Day?</div>
                <div style={{ fontSize:12, color:"var(--ink-faint)", marginTop:2 }}>This will unlock billing again</div>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:22 }}>
              {[
                { icon:"🔓", title:"Billing will be unlocked", sub:"You can continue making bills after reopening." },
                { icon:"🔄", title:"Sales will be recalculated on close", sub:"All bills from the original open time will be counted." },
                { icon:"📊", title:"Previous close data will be cleared", sub:"Incorrect totals will be wiped and recalculated fresh." },
              ].map((item, i) => (
                <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start",
                  background:"var(--bg2,#f7f5f0)", borderRadius:12, padding:"11px 14px" }}>
                  <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)", marginBottom:2 }}>{item.title}</div>
                    <div style={{ fontSize:11, color:"var(--ink-faint)", lineHeight:1.5 }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            {dayError && <div style={{ background:"#fff5f5", border:"1px solid rgba(220,38,38,0.2)",
              borderRadius:10, padding:"9px 12px", fontSize:12, color:"#dc2626", marginBottom:14 }}>{dayError}</div>}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowReopenConfirm(false)}
                style={{ flex:1, padding:"13px", borderRadius:13, border:"1.5px solid var(--rule)",
                  background:"transparent", fontSize:13, fontWeight:700, color:"var(--ink-faint)", cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={() => { setShowReopenConfirm(false); reopenDay() }} disabled={dayActing}
                style={{ flex:2, padding:"13px", borderRadius:13, border:"none",
                  background:"linear-gradient(135deg,#d97706,#b45309)", color:"#fff",
                  fontSize:13, fontWeight:700, cursor:dayActing?"default":"pointer", opacity:dayActing?0.7:1,
                  boxShadow:"0 4px 14px rgba(217,119,6,0.3)" }}>
                {dayActing ? "Reopening…" : "↺ Yes, Reopen Day"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Close Day Confirm Modal ──────────────────────── */}
      {showCloseConfirm && (
        <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.55)",
          backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}
          onClick={() => setShowCloseConfirm(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:"100%", maxWidth:440, background:"var(--bg1,#fff)", borderRadius:22,
              padding:"28px 24px", boxShadow:"0 12px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:44, height:44, borderRadius:13, flexShrink:0, background:"#fff7ed",
                border:"1.5px solid rgba(202,138,4,0.3)", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:22 }}>⚠️</div>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:"var(--ink)" }}>Close Today's Day?</div>
                <div style={{ fontSize:12, color:"var(--ink-faint)", marginTop:2 }}>Please read before confirming</div>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:22 }}>
              {[
                { icon:"📊", title:"Sales & profit will be calculated", sub:"Only bills made after today's opening time will be counted." },
                { icon:"📦", title:"Stock snapshot will be taken", sub:"Current stock levels saved as your closing snapshot." },
                { icon:"🔒", title:"Billing will be locked", sub:"You won't be able to create new bills. Use ↺ Reopen if needed." },
                { icon:"📋", title:"A day report will be generated", sub:"View full summary in Day Ops." },
              ].map((item, i) => (
                <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start",
                  background:"var(--bg2,#f7f5f0)", borderRadius:12, padding:"11px 14px" }}>
                  <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)", marginBottom:2 }}>{item.title}</div>
                    <div style={{ fontSize:11, color:"var(--ink-faint)", lineHeight:1.5 }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            {today.total > 0 && (
              <div style={{ background:"var(--jade-bg,#e8f8f2)", border:"1px solid rgba(26,122,74,0.2)",
                borderRadius:12, padding:"10px 14px", marginBottom:20, display:"flex", gap:20 }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:15, fontWeight:800, color:"var(--jade)" }}>{INR(today.total)}</div>
                  <div style={{ fontSize:9, color:"var(--ink-faint)", fontWeight:600, marginTop:2 }}>TODAY'S SALES</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:15, fontWeight:800, color:"var(--saffron)" }}>{today.count}</div>
                  <div style={{ fontSize:9, color:"var(--ink-faint)", fontWeight:600, marginTop:2 }}>BILLS</div>
                </div>
              </div>
            )}
            {dayError && <div style={{ background:"#fff5f5", border:"1px solid rgba(220,38,38,0.2)",
              borderRadius:10, padding:"9px 12px", fontSize:12, color:"#dc2626", marginBottom:14 }}>{dayError}</div>}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowCloseConfirm(false)}
                style={{ flex:1, padding:"13px", borderRadius:13, border:"1.5px solid var(--rule)",
                  background:"transparent", fontSize:13, fontWeight:700, color:"var(--ink-faint)", cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={() => { setShowCloseConfirm(false); closeDay() }} disabled={dayActing}
                style={{ flex:2, padding:"13px", borderRadius:13, border:"none",
                  background:"linear-gradient(135deg,#185FA5,#2563eb)", color:"#fff",
                  fontSize:13, fontWeight:700, cursor:dayActing?"default":"pointer", opacity:dayActing?0.7:1,
                  boxShadow:"0 4px 14px rgba(37,99,235,0.35)" }}>
                {dayActing ? "Closing…" : "Yes, Close Day"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 1AM Auto-close Warning ───────────────────────── */}
      {showAutoClose && (
        <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,0.70)",
          backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ width:"100%", maxWidth:420, background:"var(--bg1,#fff)", borderRadius:22,
            padding:"28px 24px", boxShadow:"0 12px 48px rgba(0,0,0,0.3)" }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🌙</div>
              <div style={{ fontSize:18, fontWeight:800, color:"var(--ink)" }}>Day Still Open!</div>
              <div style={{ fontSize:13, color:"var(--ink-faint)", marginTop:6, lineHeight:1.5 }}>
                It's past 1:00 AM and your day session is still open.<br/>Please close it to save today's records.
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:22, gap:6 }}>
              <div style={{ width:80, height:80, borderRadius:"50%",
                background: autoCloseSecsLeft > 60 ? "rgba(220,38,38,0.08)" : "rgba(220,38,38,0.15)",
                border:`3px solid ${autoCloseSecsLeft > 60 ? "#f87171" : "#dc2626"}`,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", transition:"all 0.5s" }}>
                <div style={{ fontSize:22, fontWeight:900, color:"#dc2626", lineHeight:1 }}>
                  {Math.floor(autoCloseSecsLeft/60)}:{String(autoCloseSecsLeft%60).padStart(2,"0")}
                </div>
                <div style={{ fontSize:8, color:"#dc2626", fontWeight:700, letterSpacing:"1px" }}>LEFT</div>
              </div>
              <div style={{ fontSize:11, color:"var(--ink-faint)" }}>Day will auto-close when timer hits 0:00</div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { setShowAutoClose(false); setAutoCloseSecsLeft(300) }}
                style={{ flex:1, padding:"12px", borderRadius:13, border:"1.5px solid var(--rule)",
                  background:"transparent", fontSize:12, fontWeight:700, color:"var(--ink-faint)", cursor:"pointer" }}>
                Keep Open
              </button>
              <button onClick={() => { setShowAutoClose(false); closeDay() }}
                style={{ flex:2, padding:"12px", borderRadius:13, border:"none",
                  background:"linear-gradient(135deg,#dc2626,#b91c1c)", color:"#fff",
                  fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(220,38,38,0.35)" }}>
                Close Day Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
