import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getToken, api, isCloud } from "../sync/db"
import { useLang, LangToggle } from "../hooks/useLang"

const API = import.meta.env.VITE_API_URL ?? ""
const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN")

function greetingKey() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function authHeaders() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders() })
  if (!res.ok) throw new Error("Request failed")
  return res.json()
}

// ── Bangle Briefing Card ───────────────────────────────────────
// ── Bangle Stock Popup ────────────────────────────────────────
function BangleStockPopup({ type, items, storeName, onClose, onStockUpdate }) {
  const [editing, setEditing] = useState(null)
  const [editVal, setEditVal] = useState("")
  const [saving,  setSaving]  = useState(false)

  const meta = {
    out_of_stock: { label:"Out of Stock",    icon:"🔴", desc:"Zero stock. Restock immediately." },
    low_stock:    { label:"Low Stock",        icon:"🟡", desc:"Below minimum stock level." },
    dead_stock:   { label:"Dead Stock (30d)", icon:"💤", desc:"No sales in 30 days. Consider discounting." },
  }[type] || { label:"Stock Alert", icon:"⚠️", desc:"" }

  function buildWAMessage() {
    const lines = items.map(p =>
      type === "out_of_stock"
        ? `• ${p.name}${p.colour ? " · " + p.colour : ""}${p.size ? " · " + p.size : ""}: OUT OF STOCK ❌`
        : type === "low_stock"
        ? `• ${p.name}${p.colour ? " · " + p.colour : ""}${p.size ? " · " + p.size : ""}: ${p.stock} left (min: ${p.min_stock})`
        : `• ${p.name}${p.colour ? " · " + p.colour : ""}${p.size ? " · " + p.size : ""}: ${p.stock} unsold`
    ).join("\n")
    const header = type === "out_of_stock"
      ? `🚨 *Out of Stock Alert — ${storeName}*\nRestock these items immediately:\n\n`
      : type === "low_stock"
      ? `⚠️ *Low Stock Alert — ${storeName}*\nPlease arrange stock for:\n\n`
      : `📦 *Dead Stock Report — ${storeName}*\nConsider discounting:\n\n`
    return encodeURIComponent(header + lines + "\n\n_Sent from DukhaanAI_")
  }

  async function saveEdit() {
    if (!editing) return
    const newStock = parseFloat(editVal)
    if (isNaN(newStock) || newStock < 0) return
    setSaving(true)
    try {
      const delta = newStock - editing.stock
      await api.patch(`/bangle/variants/${editing.id}/stock?adjustment=${delta}&reason=manual+update`)
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
            background: type === "out_of_stock" ? "rgba(192,57,43,0.10)" : type === "low_stock" ? "rgba(217,119,6,0.10)" : "rgba(124,92,191,0.10)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
            {meta.icon}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:"var(--ink)" }}>{meta.label}</div>
            <div style={{ fontSize:11, color:"var(--ink-faint)", marginTop:3 }}>{meta.desc}</div>
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
              <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:1 }}>Share with your supplier or staff</div>
            </div>
            <svg style={{ marginLeft:"auto", flexShrink:0 }} width="14" height="14" fill="none"
              stroke="#128C7E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
        </div>

        {/* Items */}
        <div style={{ overflowY:"auto", flex:1 }}>
          {items.length === 0 && (
            <div style={{ padding:"32px", textAlign:"center", color:"var(--ink-faint)", fontSize:13 }}>No items to show</div>
          )}
          {items.map((p, i) => (
            <div key={p.id || i} style={{ padding:"11px 22px",
              borderBottom: i < items.length-1 ? "1px solid var(--rule-soft,rgba(0,0,0,0.05))" : "none",
              display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
                background: p.stock <= 0 ? "var(--ember)" : "#d97706" }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                {(p.colour || p.size) && (
                  <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:1 }}>
                    {[p.colour, p.size].filter(Boolean).join(" · ")}
                  </div>
                )}
                {editing?.id === p.id ? (
                  <div style={{ display:"flex", gap:6, marginTop:5, alignItems:"center" }}>
                    <input type="number" min="0" value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && saveEdit()}
                      style={{ width:80, padding:"5px 8px", borderRadius:8, fontSize:12,
                        border:"1.5px solid var(--saffron)", outline:"none", background:"#fffbeb" }}
                      autoFocus />
                    <button onClick={saveEdit} disabled={saving}
                      style={{ padding:"5px 12px", borderRadius:8, border:"none",
                        background:"var(--saffron)", color:"#fff", fontSize:11, fontWeight:700,
                        cursor:saving?"default":"pointer", opacity:saving?0.7:1 }}>
                      {saving ? "…" : "Save"}
                    </button>
                    <button onClick={() => setEditing(null)}
                      style={{ padding:"5px 8px", borderRadius:8, border:"1px solid var(--rule)",
                        background:"transparent", fontSize:11, color:"var(--ink-faint)", cursor:"pointer" }}>✕</button>
                  </div>
                ) : (
                  <div style={{ fontSize:11, fontWeight:600, marginTop:2,
                    color: p.stock <= 0 ? "var(--ember)" : "#d97706" }}>
                    {p.stock <= 0 ? "Out of stock" : `${p.stock} left`}
                    {p.min_stock > 0 && p.stock > 0 && <span style={{ color:"var(--ink-faint)", fontWeight:400 }}> · min {p.min_stock}</span>}
                  </div>
                )}
              </div>
              {editing?.id !== p.id && p.id && (
                <button onClick={() => { setEditing(p); setEditVal(String(p.stock)) }}
                  style={{ padding:"5px 12px", borderRadius:9, border:"1.5px solid var(--rule)",
                    background:"var(--bg2)", fontSize:11, fontWeight:600, color:"var(--ink)",
                    cursor:"pointer", flexShrink:0 }}>✏️ Edit</button>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding:"10px 22px", borderTop:"1px solid var(--rule)",
          textAlign:"center", fontSize:11, color:"var(--ink-faint)" }}>
          {items.length} item{items.length !== 1 ? "s" : ""} shown
        </div>
      </div>
    </div>
  )
}

function BriefingCard({ data, navigate, onStockClick }) {
  const [open, setOpen] = useState(true)
  if (!data) return null

  const { low_stock_count, out_of_stock, dead_stock_count, next_festival } = data
  const festDays = next_festival
    ? Math.round((new Date(next_festival.date) - new Date()) / 86400000)
    : null

  const items = []

  if (out_of_stock > 0)
    items.push({
      icon: "❌", color: "var(--ember)", bg: "var(--ember-bg)",
      text: `${out_of_stock} variant${out_of_stock > 1 ? "s" : ""} OUT of stock`,
      sub: "Restock immediately", stockType: "out_of_stock",
    })

  if (low_stock_count > out_of_stock) {
    const extra = low_stock_count - out_of_stock
    items.push({
      icon: "⚠️", color: "var(--brass)", bg: "var(--brass-bg)",
      text: `${extra} variant${extra > 1 ? "s" : ""} running low`,
      sub: "Check stock levels", stockType: "low_stock",
    })
  }

  if (dead_stock_count > 0)
    items.push({
      icon: "💤", color: "#7c5cbf", bg: "rgba(124,92,191,0.1)",
      text: `${dead_stock_count} variant${dead_stock_count > 1 ? "s" : ""} with no sales in 30 days`,
      sub: "Consider discounting", stockType: "dead_stock",
    })

  if (next_festival && festDays !== null && festDays <= 30)
    items.push({
      icon: "🎉", color: "var(--saffron)", bg: "var(--saffron-bg)",
      text: `${next_festival.name} in ${festDays} day${festDays !== 1 ? "s" : ""}`,
      sub: `Stock up on festival colours & designs`, to: "/bangle-festivals",
    })

  if (items.length === 0)
    return (
      <div style={{ background: "var(--bg2)", border: "1px solid var(--rule)", borderRadius: 18,
        padding: "18px 20px", marginBottom: 16, boxShadow: "0 2px 12px var(--shadow)",
        display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 28 }}>✅</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>All clear today!</div>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
            Stock healthy · No alerts · Ready to sell
          </div>
        </div>
      </div>
    )

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--rule)", borderRadius: 18,
      marginBottom: 16, boxShadow: "0 2px 12px var(--shadow)", overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "13px 18px", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
        <span style={{ fontSize: 18 }}>🌅</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>Today's Briefing</div>
          <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 1 }}>
            {items.length} action item{items.length !== 1 ? "s" : ""} need attention
          </div>
        </div>
        <svg width="14" height="14" fill="none" stroke="var(--ink-faint)" strokeWidth="2" viewBox="0 0 24 24"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "0.2s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--rule)" }}>
          {items.map((item, i) => (
            <button key={i} onClick={() => item.stockType ? onStockClick?.(item.stockType) : navigate(item.to || "/bangle-inventory")}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer",
                padding: "11px 18px", display: "flex", alignItems: "flex-start", gap: 12,
                borderBottom: i < items.length - 1 ? "1px solid var(--rule-soft,rgba(0,0,0,0.05))" : "none",
                transition: "background 0.1s", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg2)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, marginTop: 1,
                background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
                {item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: item.color, lineHeight: 1.3 }}>{item.text}</div>
                <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 3 }}>{item.sub}</div>
              </div>
              <svg width="12" height="12" fill="none" stroke="var(--ink-faint)" strokeWidth="2"
                viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 4 }}>
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
    const s = JSON.parse(localStorage.getItem("dk_bangle_day_session") || "null")
    if (!s) return null
    return s.date === new Date().toISOString().slice(0, 10) ? s : null
  } catch { return null }
}
function localSetDaySession(s) {
  try { localStorage.setItem("dk_bangle_day_session", JSON.stringify(s)) } catch {}
}

// ── Main page ──────────────────────────────────────────────────
export default function BangleDashboard() {
  const { vendor, cloud } = useAuth()
  const navigate = useNavigate()
  const { t } = useLang()

  const [briefing,     setBriefing]     = useState(null)
  const [profit,       setProfit]       = useState(null)
  const [sales,        setSales]        = useState([])
  const [stockSummary, setStockSummary] = useState(null)
  const [loading,      setLoading]      = useState(true)

  // ── Day session state ─────────────────────────────────────
  const [daySession,        setDaySession]        = useState(undefined)
  const [dayActing,         setDayActing]         = useState(false)
  const [dayError,          setDayError]          = useState("")
  const [showCloseConfirm,  setShowCloseConfirm]  = useState(false)
  const [showLowList,       setShowLowList]        = useState(false)
  const [stockPopup,        setStockPopup]         = useState(null)
  const [showReopenConfirm, setShowReopenConfirm] = useState(false)
  const [showAutoClose,     setShowAutoClose]     = useState(false)
  const [autoCloseSecsLeft, setAutoCloseSecsLeft] = useState(300)

  useEffect(() => {
    if (!vendor) { setDaySession(null); return }
    if (isCloud()) {
      api.get("/day-sessions/today?store_type=bangle")
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
        const s = await api.post("/day-sessions/open", { store_type: "bangle" })
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
        const s = await api.post("/day-sessions/close", { store_type: "bangle" })
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

  // ── 1 AM auto-close watchdog ──────────────────────────────
  useEffect(() => {
    if (!vendor) return
    // Calculate ms until next 1:00 AM
    const now  = new Date()
    const next1AM = new Date(now)
    next1AM.setHours(1, 0, 0, 0)
    if (now >= next1AM) next1AM.setDate(next1AM.getDate() + 1) // already past 1 AM today → next 1 AM
    const msUntil = next1AM - now

    const warningTimer = setTimeout(() => {
      // Only trigger if day is still open
      setDaySession(prev => {
        if (prev?.status === "open") {
          setShowAutoClose(true)
          setAutoCloseSecsLeft(300)
        }
        return prev
      })
    }, msUntil)

    return () => clearTimeout(warningTimer)
  }, [vendor?.id])

  // Countdown ticker for auto-close warning
  useEffect(() => {
    if (!showAutoClose) return
    if (autoCloseSecsLeft <= 0) {
      // Auto-close the day
      setShowAutoClose(false)
      closeDay()
      return
    }
    const tick = setTimeout(() => setAutoCloseSecsLeft(s => s - 1), 1000)
    return () => clearTimeout(tick)
  }, [showAutoClose, autoCloseSecsLeft])

  function goBilling() { navigate("/bangle-billing") }

  async function openStockPopup(type) {
    setStockPopup({ type, items: [] })
    try {
      // Fetch all low-stock variants (stock < min_stock) from bangle inventory
      const all = await api.get("/bangle/variants/low-stock").catch(async () => {
        // Fallback: use briefing low_stock_items
        return briefing?.low_stock_items || []
      })
      if (type === "out_of_stock") {
        setStockPopup({ type, items: all.filter(v => (v.stock || 0) <= 0) })
      } else if (type === "low_stock") {
        setStockPopup({ type, items: all.filter(v => (v.stock || 0) > 0) })
      } else {
        // dead_stock — use briefing data (no dedicated endpoint)
        const items = (briefing?.low_stock_items || []).map(p => ({
          id: p.id, name: p.name, colour: p.colour, size: p.size,
          stock: p.stock, min_stock: p.min_stock
        }))
        setStockPopup({ type, items })
      }
    } catch {
      setStockPopup({ type, items: [] })
    }
  }

  function handleBangleStockUpdate(id, newStock) {
    setStockPopup(prev => prev ? {
      ...prev,
      items: prev.items.map(p => p.id === id ? { ...p, stock: newStock } : p)
    } : null)
  }

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    Promise.all([
      apiFetch("/bangle/insights/briefing"),
      apiFetch("/bangle/insights/profit"),
      apiFetch(`/bangle/sales?sale_date=${today}`),
      apiFetch("/bangle/stock-summary"),
    ]).then(([b, p, s, ss]) => {
      setBriefing(b)
      setProfit(p)
      setSales(Array.isArray(s) ? s : (s.sales || []))
      setStockSummary(ss)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [vendor?.id])

  const tod      = briefing?.today || {}
  const todProfit = profit?.today  || {}
  const avgBill  = tod.bills > 0 ? Math.round(tod.revenue / tod.bills) : 0

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--bg0)" }}>

      {/* Top bar */}
      <div style={{ background: "var(--bg0)", backdropFilter: "blur(6px)",
        borderBottom: "1px solid var(--rule)",
        padding: "12px 16px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10,
        boxShadow: "0 1px 6px var(--shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg,#e87722,#d45f00)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Tiro Devanagari Hindi',serif", fontWeight: 700, fontSize: 17, color: "#fff",
            boxShadow: "0 2px 8px rgba(232,119,34,0.3)" }}>
            {vendor?.store_name?.charAt(0) || "द"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t(greetingKey())}, {vendor?.store_name?.split(" ")[0] || "ji"} 👋
            </div>
            <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 1,
              display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              </span>
              <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20, flexShrink: 0,
                background: cloud ? "var(--jade-bg)" : "var(--bg2)",
                color:      cloud ? "var(--jade)"   : "var(--ink-faint)",
                border: `1px solid ${cloud ? "rgba(26,122,74,0.3)" : "var(--rule)"}` }}>
                {cloud ? "● Cloud" : "● Local"}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, marginLeft: 8 }}>
          {/* Day open/close button in header */}
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
                  background:"var(--bg2)", whiteSpace:"nowrap" }}>
                  ✓ Day Closed
                </span>
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

      <div className="page-content" style={{ padding: "16px" }}>

        {/* ══ PRIMARY QUICK-ACTION TILES ══════════════════════ */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16, alignItems:"start" }}>

          {/* New Bill — full-width hero CTA */}
          <button onClick={goBilling}
            style={{ gridColumn:"1 / -1",
              background:"linear-gradient(135deg,var(--saffron,#e87722),#d45f00)",
              border:"none", borderRadius:18, padding:"20px 22px",
              display:"flex", alignItems:"center", gap:16,
              cursor:"pointer", boxShadow:"0 8px 24px rgba(232,119,34,0.4)",
              transition:"transform 0.15s" }}
            onPointerDown={e => e.currentTarget.style.transform="scale(0.97)"}
            onPointerUp={e   => e.currentTarget.style.transform="scale(1)"}
            onPointerLeave={e=> e.currentTarget.style.transform="scale(1)"}>
            <div style={{ width:52, height:52, borderRadius:14, background:"rgba(255,255,255,0.2)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>
              💍
            </div>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontSize:18, fontWeight:900, color:"#fff", lineHeight:1 }}>{t("New Bill")}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.8)", marginTop:4 }}>
                {loading ? "Loading…"
                  : tod.bills > 0
                  ? `${tod.bills} bill${tod.bills > 1 ? "s" : ""} today · ${INR(tod.revenue)}`
                  : "Tap to start billing"}
              </div>
            </div>
            <svg style={{ marginLeft:"auto", flexShrink:0 }} width="20" height="20" fill="none"
              stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {/* Add Stock */}
          <button onClick={() => navigate("/bangle-inventory")}
            style={{ background:"var(--bg2)", border:"1.5px solid var(--rule)", borderRadius:18,
              padding:"18px 16px", display:"flex", flexDirection:"column", alignItems:"flex-start",
              gap:8, cursor:"pointer", transition:"all 0.15s", textAlign:"left",
              boxShadow:"0 2px 8px var(--shadow)" }}
            onPointerDown={e => e.currentTarget.style.transform="scale(0.97)"}
            onPointerUp={e   => e.currentTarget.style.transform="scale(1)"}
            onPointerLeave={e=> e.currentTarget.style.transform="scale(1)"}>
            <div style={{ width:44, height:44, borderRadius:12, background:"rgba(166,124,46,0.12)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>💍</div>
            <div style={{ fontSize:14, fontWeight:800, color:"var(--ink)" }}>{t("Add Stock")}</div>
            <div style={{ fontSize:11, color:"var(--brass)", fontWeight:600 }}>
              {loading ? "—" : stockSummary ? stockSummary.total_pieces + " pcs" : "Inventory"}
            </div>
          </button>

          {/* Udhaar */}
          <button onClick={() => navigate("/bangle-udhar")}
            style={{ background:"var(--bg2)", border:"1.5px solid var(--rule)", borderRadius:18,
              padding:"18px 16px", display:"flex", flexDirection:"column", alignItems:"flex-start",
              gap:8, cursor:"pointer", transition:"all 0.15s", textAlign:"left",
              boxShadow:"0 2px 8px var(--shadow)" }}
            onPointerDown={e => e.currentTarget.style.transform="scale(0.97)"}
            onPointerUp={e   => e.currentTarget.style.transform="scale(1)"}
            onPointerLeave={e=> e.currentTarget.style.transform="scale(1)"}>
            <div style={{ width:44, height:44, borderRadius:12, background:"rgba(220,80,60,0.10)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>📒</div>
            <div style={{ fontSize:14, fontWeight:800, color:"var(--ink)" }}>{t("Udhaar")}</div>
            <div style={{ fontSize:11, fontWeight:600,
              color: (briefing?.udhar?.total_due || 0) > 0 ? "var(--ember)" : "var(--jade)" }}>
              {briefing
                ? briefing.udhar?.collected_today > 0 ? "Kaata: " + INR(briefing.udhar.collected_today)
                  : briefing.udhar?.total_due > 0 ? INR(briefing.udhar.total_due) + " due" : "All clear"
                : "—"}
            </div>
          </button>

          {/* Low Stock — expandable inline list */}
          <div style={{ display:"flex", flexDirection:"column" }}>
            <button onClick={() => (briefing?.low_stock_count || 0) > 0 ? setShowLowList(v => !v) : null}
              style={{ background: (briefing?.low_stock_count || 0) > 0 ? "var(--ember-bg,#fff5f5)" : "var(--bg2)",
                border:`1.5px solid ${(briefing?.low_stock_count || 0) > 0 ? "rgba(192,57,43,0.3)" : "var(--rule)"}`,
                borderRadius: showLowList ? "18px 18px 0 0" : 18,
                padding:"18px 16px",
                display:"flex", flexDirection:"column", alignItems:"flex-start",
                gap:8, cursor: (briefing?.low_stock_count || 0) > 0 ? "pointer" : "default",
                transition:"all 0.15s", textAlign:"left",
                boxShadow:"0 2px 8px var(--shadow)" }}>
              <div style={{ width:44, height:44, borderRadius:12,
                background: (briefing?.low_stock_count || 0) > 0 ? "rgba(192,57,43,0.12)" : "rgba(26,122,74,0.10)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
                position:"relative" }}>
                {(briefing?.low_stock_count || 0) > 0 ? "⚠️" : "✅"}
                {(briefing?.low_stock_count || 0) > 0 && (
                  <div style={{ position:"absolute", top:-6, right:-6, minWidth:18, height:18,
                    borderRadius:9, padding:"0 4px", background:"var(--ember,#c0392b)", color:"#fff",
                    fontSize:10, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {briefing.low_stock_count}
                  </div>
                )}
              </div>
              <div style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:"var(--ink)" }}>{t("Low Stock")}</div>
                  <div style={{ fontSize:11, fontWeight:600, marginTop:2,
                    color: (briefing?.low_stock_count || 0) > 0 ? "var(--ember)" : "var(--jade)" }}>
                    {loading ? "—" : (briefing?.low_stock_count || 0) > 0
                      ? `${briefing.low_stock_count} variants` : t("All stocked")}
                  </div>
                </div>
                {(briefing?.low_stock_count || 0) > 0 && (
                  <span style={{ fontSize:16, color:"var(--ember)", transition:"transform 0.2s",
                    transform: showLowList ? "rotate(90deg)" : "none" }}>›</span>
                )}
              </div>
            </button>

            {/* Inline expandable low-stock list */}
            {showLowList && (briefing?.low_stock_items || []).length > 0 && (
              <div style={{ background:"var(--ember-bg,#fff5f5)",
                border:"1.5px solid rgba(192,57,43,0.3)", borderTop:"none",
                borderRadius:"0 0 18px 18px", overflow:"hidden" }}>
                {(briefing.low_stock_items).map((v, i) => (
                  <div key={v.id} onClick={() => navigate("/bangle-inventory")}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"9px 16px", cursor:"pointer",
                      borderTop: i > 0 ? "1px solid rgba(192,57,43,0.1)" : "none" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {v.name}
                      </div>
                      {(v.colour || v.size) && (
                        <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:1 }}>
                          {[v.colour, v.size].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize:11, color:"var(--ember)", fontWeight:700, flexShrink:0, marginLeft:8 }}>
                      {v.stock} / {v.min_stock}
                    </div>
                  </div>
                ))}
                <div onClick={() => navigate("/bangle-inventory")}
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

        {/* Today's Takings hero */}
        <div style={{ background:"linear-gradient(135deg,var(--bg2),var(--bg3))",
          borderRadius:18, padding:"18px 16px",
          border:"1px solid rgba(166,124,46,0.25)", marginBottom:14,
          boxShadow:"0 12px 24px var(--shadow)", position:"relative", overflow:"hidden" }}>
          <svg viewBox="0 0 200 200" style={{ position:"absolute", top:-40, right:-40,
            width:180, height:180, opacity:0.12, pointerEvents:"none" }} aria-hidden="true">
            {[...Array(12)].map((_,i) => (
              <circle key={i} cx="100" cy="100" r={22+i*9} fill="none" stroke="var(--saffron)" strokeWidth="0.8"/>
            ))}
          </svg>
          <div style={{ position:"relative" }}>
            <div style={{ fontSize:10, fontWeight:800, color:"var(--brass-deep)",
              letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:6 }}>
              {t("Today's Takings — Bangle Store")}
            </div>
            <div className="hero-revenue" style={{ fontFamily:"'Tiro Devanagari Hindi',serif",
              fontSize:48, fontWeight:800, color:"var(--ink)", lineHeight:1, letterSpacing:"-1px" }}>
              {loading ? "—" : INR(tod.revenue)}
            </div>
            {profit && (
              todProfit.cost_known === false || todProfit.profit === null ? (
                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8,
                  padding:"7px 12px", borderRadius:10, width:"fit-content",
                  background:"#fffbeb", border:"1px solid rgba(202,138,4,0.3)" }}>
                  <span style={{ fontSize:14 }}>⚠️</span>
                  <span style={{ fontSize:12, color:"#92400e" }}>
                    Profit unavailable — <b>set cost prices</b> in Inventory
                  </span>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8,
                  padding:"7px 12px", borderRadius:10, width:"fit-content",
                  background: todProfit.profit >= 0 ? "var(--jade-bg)" : "var(--ember-bg)",
                  border:`1px solid ${todProfit.profit >= 0 ? "rgba(26,122,74,0.2)" : "rgba(192,57,43,0.2)"}` }}>
                  <span style={{ fontSize:14 }}>{todProfit.profit >= 0 ? "📈" : "📉"}</span>
                  <span style={{ fontSize:13, fontWeight:700,
                    color: todProfit.profit >= 0 ? "var(--jade)" : "var(--ember)" }}>
                    {todProfit.profit >= 0 ? "+" : ""}{INR(todProfit.profit)} profit
                  </span>
                  <span style={{ fontSize:11, color:"var(--ink-faint)", marginLeft:4 }}>
                    ({todProfit.margin_pct}% margin)
                  </span>
                </div>
              )
            )}
            <div style={{ display:"flex", gap:20, marginTop:10, fontSize:12, flexWrap:"wrap" }}>
              <span style={{ color:"var(--jade)", fontWeight:600 }}>
                {tod.bills > 0 ? `${tod.bills} bill${tod.bills > 1 ? "s" : ""} today` : "No bills yet"}
              </span>
              {tod.pieces > 0 && <span style={{ color:"var(--ink-faint)" }}>{tod.pieces} pieces sold</span>}
              {tod.top_colour && <span style={{ color:"var(--saffron)", fontWeight:600 }}>🏆 {tod.top_colour}</span>}
              {profit?.month && <span style={{ color:"var(--ink-faint)" }}>Monthly: {INR(profit.month.revenue)} · {profit.month.margin_pct}% margin</span>}
            </div>
          </div>
        </div>

        {/* ── Day Session Card ─────────────────────────────── */}
        {vendor && daySession !== undefined && (() => {
          const isOpen   = daySession?.status === "open"
          const isClosed = daySession?.status === "closed"
          const openedTime = daySession?.opened_at
            ? new Date(daySession.opened_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : null
          const closedTime = daySession?.closed_at
            ? new Date(daySession.closed_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : null
          const cardBg     = isOpen ? "var(--jade-bg,#e8f8f2)" : isClosed ? "var(--bg2)" : "#fffbeb"
          const cardBorder = isOpen ? "rgba(26,122,74,0.25)"   : isClosed ? "var(--rule)" : "rgba(202,138,4,0.35)"
          const dotColor   = isOpen ? "var(--jade)"            : isClosed ? "var(--ink-faint)" : "#d97706"
          const label      = isOpen ? "Day Open" : isClosed ? "Day Closed" : "Day Not Started"
          const sublabel   = isOpen ? `Opened at ${openedTime}`
                           : isClosed ? `${openedTime} → ${closedTime}`
                           : "Open the day to track stock & profit"
          return (
            <div style={{ background:cardBg, border:`1px solid ${cardBorder}`,
              borderRadius:16, padding:"12px 16px", marginBottom:14,
              display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:dotColor, flexShrink:0,
                    boxShadow: isOpen ? `0 0 0 3px ${dotColor}22` : "none" }}/>
                  <span style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{label}</span>
                </div>
                <div style={{ fontSize:11, color:"var(--ink-faint)" }}>{sublabel}</div>
                {isClosed && daySession.total_sales > 0 && (
                  <div style={{ fontSize:11, marginTop:4, display:"flex", gap:12 }}>
                    <span style={{ color:"var(--jade)", fontWeight:600 }}>{INR(daySession.total_sales)} sales</span>
                    {daySession.gross_profit != null && (
                      <span style={{ color: daySession.gross_profit >= 0 ? "var(--jade)" : "var(--ember)", fontWeight:600 }}>
                        {daySession.gross_profit >= 0 ? "+" : ""}{INR(daySession.gross_profit)} profit
                      </span>
                    )}
                  </div>
                )}
                {isOpen && tod.revenue > 0 && (
                  <div style={{ fontSize:11, marginTop:4, color:"var(--jade)", fontWeight:600 }}>
                    {INR(tod.revenue)} so far · {tod.bills} bills
                  </div>
                )}
                {dayError && <div style={{ fontSize:10, color:"var(--ember)", marginTop:4 }}>{dayError}</div>}
              </div>
              {isClosed && (
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  <button onClick={() => setShowReopenConfirm(true)} disabled={dayActing}
                    style={{ padding:"7px 14px", borderRadius:12,
                      border:"1.5px solid rgba(202,138,4,0.4)", background:"#fffbeb",
                      color:"#92400e", fontSize:11, fontWeight:700,
                      cursor:dayActing?"default":"pointer", opacity:dayActing?0.7:1 }}>↺ Reopen</button>
                  <button onClick={() => navigate("/bangle-day")}
                    style={{ padding:"7px 14px", borderRadius:12,
                      border:"1.5px solid var(--rule)", background:"transparent",
                      color:"var(--ink-dim)", fontSize:11, fontWeight:600, cursor:"pointer" }}>View Report</button>
                </div>
              )}
            </div>
          )
        })()}

        {/* Morning Briefing */}
        <BriefingCard data={briefing} navigate={navigate} onStockClick={openStockPopup} />

        {/* Secondary quick links — same 4-up row as Kirana */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:20 }}>
          {[
            { label:t("Udhaar"),    emoji:"📒", to:"/bangle-udhar" },
            { label:t("History"),   emoji:"🕑", to:"/bangle-history" },
            { label:t("Festivals"), emoji:"🎉", to:"/bangle-festivals" },
            { label:t("Day Ops"),   emoji:"📅", to:"/bangle-day" },
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

        {/* Bottom grid */}
        <div className="dash-bottom-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* Recent bills */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--brass-deep)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                {t("Recent Bills")}
              </div>
              <button onClick={() => navigate("/bangle-history")}
                style={{ fontSize: 11, color: "var(--saffron)", fontWeight: 600,
                  background: "none", border: "none", cursor: "pointer" }}>{t("View all →")}</button>
            </div>
            <div style={{ background: "var(--bg2)", borderRadius: 14,
              border: "1px solid var(--rule)", overflow: "hidden",
              boxShadow: "0 4px 10px var(--shadow)" }}>
              {loading ? [1,2,3].map(i => (
                <div key={i} style={{ height: 54, borderBottom: "1px solid var(--rule-soft)",
                  background: "var(--bg2)", margin: "2px 0" }}/>
              )) : sales.length === 0 ? (
                <div style={{ padding: "28px 16px", textAlign: "center",
                  color: "var(--ink-faint)", fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💍</div>
                  {t("No bills yet today")}
                </div>
              ) : sales.slice(0, 5).map((s, i) => {
                const pieces = (s.items || []).reduce((t, it) => t + (it.pieces || 0), 0)
                const time   = new Date(s.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 14px", borderBottom: i < 4 ? "1px solid var(--rule-soft)" : "none" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 13 }}>
                      {(s.customer_name || "W").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.customer_name || "Walk-in"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                        {pieces} pc · {time}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--saffron)" }}>
                      {INR(s.total)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stock health */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--brass-deep)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                {t("Stock Health")}
              </div>
              <button onClick={() => navigate("/bangle-inventory")}
                style={{ fontSize: 11, color: "var(--saffron)", fontWeight: 600,
                  background: "none", border: "none", cursor: "pointer" }}>{t("View all →")}</button>
            </div>
            <div style={{ background: "var(--bg2)", borderRadius: 14,
              border: "1px solid var(--rule)", overflow: "hidden",
              boxShadow: "0 4px 10px var(--shadow)" }}>
              {loading ? [1,2,3].map(i => (
                <div key={i} style={{ height: 54, borderBottom: "1px solid var(--rule-soft)",
                  background: "var(--bg2)", margin: "2px 0" }}/>
              )) : (
                <>
                  {/* Summary rows */}
                  {[
                    {
                      icon: "💰",
                      label: t("Stock Value"),
                      value: loading ? "—"
                        : stockSummary?.total_investment > 0
                          ? `₹${(stockSummary.total_investment/1000).toFixed(1)}k`
                          : "₹0",
                      sub: stockSummary ? `${stockSummary.total_pieces} pcs in inventory` : "Total inventory",
                      color: "var(--brass)",
                      bg: "rgba(184,134,11,0.10)",
                    },
                    {
                      icon: "💤",
                      label: t("Dead Stock (30d)"),
                      value: loading ? "—" : briefing?.dead_stock_count ?? 0,
                      sub: briefing?.dead_stock_count > 0 ? "No sales in 30 days" : "All variants selling",
                      color: briefing?.dead_stock_count > 0 ? "var(--brass)" : "var(--jade)",
                      bg: briefing?.dead_stock_count > 0 ? "rgba(184,134,11,0.10)" : "rgba(26,122,74,0.10)",
                      clickType: briefing?.dead_stock_count > 0 ? "dead_stock" : null,
                    },
                    {
                      icon: "📈",
                      label: t("Monthly Margin"),
                      value: loading ? "—" : `${profit?.month?.margin_pct ?? 0}%`,
                      sub: profit?.month
                        ? `${INR(profit.month.revenue)} revenue`
                        : "This month",
                      color: (profit?.month?.margin_pct ?? 0) > 15 ? "var(--jade)" : "var(--ember)",
                      bg: (profit?.month?.margin_pct ?? 0) > 15
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

                  {/* Next festival teaser */}
                  {briefing?.next_festival && (
                    <button onClick={() => navigate("/bangle-festivals")}
                      style={{ width: "100%", background: "var(--saffron-bg)", border: "none",
                        borderTop: "1px solid var(--rule)", padding: "11px 14px",
                        display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                        textAlign: "left" }}>
                      <span style={{ fontSize: 18 }}>🎉</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--saffron)" }}>
                          {briefing.next_festival.name}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                          {Math.round((new Date(briefing.next_festival.date) - new Date()) / 86400000)}d away · Check stock readiness
                        </div>
                      </div>
                      <svg width="12" height="12" fill="none" stroke="var(--saffron)" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ height: 24 }}/>
      </div>

      {/* ── Stock Popup ─────────────────────────────────── */}
      {stockPopup && (
        <BangleStockPopup
          type={stockPopup.type}
          items={stockPopup.items}
          storeName={vendor?.store_name || "Bangle Store"}
          onClose={() => setStockPopup(null)}
          onStockUpdate={handleBangleStockUpdate}
        />
      )}

      {/* ── Reopen Day Confirmation Modal ───────────────── */}
      {showReopenConfirm && (
        <div style={{ position:"fixed", inset:0, zIndex:300,
          background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)",
          display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}
          onClick={() => setShowReopenConfirm(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:"100%", maxWidth:440, background:"var(--bg1,#fff)",
              borderRadius:22, padding:"28px 24px",
              boxShadow:"0 12px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:44, height:44, borderRadius:13, flexShrink:0,
                background:"#fffbeb", border:"1.5px solid rgba(202,138,4,0.3)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>↺</div>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:"var(--ink)" }}>Reopen Today's Day?</div>
                <div style={{ fontSize:12, color:"var(--ink-faint)", marginTop:2 }}>This will unlock billing again</div>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:22 }}>
              {[
                { icon:"🔓", title:"Billing will be unlocked", sub:"You can continue making bills after reopening." },
                { icon:"🔄", title:"Sales will be recalculated on close", sub:"When you close again, all bills from the original open time onwards will be counted." },
                { icon:"📊", title:"Previous close data will be cleared", sub:"The incorrect totals will be wiped and recalculated fresh on next close." },
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
            {dayError && (
              <div style={{ background:"#fff5f5", border:"1px solid rgba(220,38,38,0.2)",
                borderRadius:10, padding:"9px 12px", fontSize:12, color:"#dc2626", marginBottom:14 }}>
                {dayError}
              </div>
            )}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowReopenConfirm(false)}
                style={{ flex:1, padding:"13px", borderRadius:13,
                  border:"1.5px solid var(--rule)", background:"transparent",
                  fontSize:13, fontWeight:700, color:"var(--ink-faint)", cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={() => { setShowReopenConfirm(false); reopenDay() }} disabled={dayActing}
                style={{ flex:2, padding:"13px", borderRadius:13, border:"none",
                  background:"linear-gradient(135deg,#d97706,#b45309)", color:"#fff",
                  fontSize:13, fontWeight:700, cursor:dayActing?"default":"pointer",
                  opacity:dayActing?0.7:1, boxShadow:"0 4px 14px rgba(217,119,6,0.3)" }}>
                {dayActing ? "Reopening…" : "↺ Yes, Reopen Day"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Auto-close Warning Modal (fires at 1:00 AM) ─── */}
      {showAutoClose && (
        <div style={{ position:"fixed", inset:0, zIndex:400,
          background:"rgba(0,0,0,0.70)", backdropFilter:"blur(6px)",
          display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ width:"100%", maxWidth:420, background:"var(--bg1,#fff)",
            borderRadius:22, padding:"28px 24px",
            boxShadow:"0 12px 48px rgba(0,0,0,0.3)" }}>

            {/* Header */}
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🌙</div>
              <div style={{ fontSize:18, fontWeight:800, color:"var(--ink)" }}>Day Still Open!</div>
              <div style={{ fontSize:13, color:"var(--ink-faint)", marginTop:6, lineHeight:1.5 }}>
                It's past 1:00 AM and your day session is still open.<br/>
                Please close it to save today's records.
              </div>
            </div>

            {/* Countdown ring */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
              marginBottom:22, gap:6 }}>
              <div style={{ width:80, height:80, borderRadius:"50%",
                background: autoCloseSecsLeft > 60 ? "rgba(220,38,38,0.08)" : "rgba(220,38,38,0.15)",
                border:`3px solid ${autoCloseSecsLeft > 60 ? "#f87171" : "#dc2626"}`,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                transition:"all 0.5s" }}>
                <div style={{ fontSize:22, fontWeight:900, color:"#dc2626", lineHeight:1 }}>
                  {Math.floor(autoCloseSecsLeft / 60)}:{String(autoCloseSecsLeft % 60).padStart(2,"0")}
                </div>
                <div style={{ fontSize:8, color:"#dc2626", fontWeight:700, letterSpacing:"1px" }}>LEFT</div>
              </div>
              <div style={{ fontSize:11, color:"var(--ink-faint)" }}>
                Day will auto-close when timer hits 0:00
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { setShowAutoClose(false); setAutoCloseSecsLeft(300) }}
                style={{ flex:1, padding:"12px", borderRadius:13,
                  border:"1.5px solid var(--rule)", background:"transparent",
                  fontSize:12, fontWeight:700, color:"var(--ink-faint)", cursor:"pointer" }}>
                Keep Open
              </button>
              <button onClick={() => { setShowAutoClose(false); closeDay() }}
                style={{ flex:2, padding:"12px", borderRadius:13, border:"none",
                  background:"linear-gradient(135deg,#dc2626,#b91c1c)", color:"#fff",
                  fontSize:13, fontWeight:700, cursor:"pointer",
                  boxShadow:"0 4px 14px rgba(220,38,38,0.35)" }}>
                Close Day Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Close Day Confirmation Modal ─────────────────── */}
      {showCloseConfirm && (
        <div style={{ position:"fixed", inset:0, zIndex:300,
          background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)",
          display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}
          onClick={() => setShowCloseConfirm(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:"100%", maxWidth:440, background:"var(--bg1,#fff)",
              borderRadius:22, padding:"28px 24px",
              boxShadow:"0 12px 48px rgba(0,0,0,0.25)" }}>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:44, height:44, borderRadius:13, flexShrink:0,
                background:"#fff7ed", border:"1.5px solid rgba(202,138,4,0.3)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
                ⚠️
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:"var(--ink)" }}>Close Today's Day?</div>
                <div style={{ fontSize:12, color:"var(--ink-faint)", marginTop:2 }}>
                  Please read before confirming
                </div>
              </div>
            </div>

            {/* What happens list */}
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:22 }}>
              {[
                { icon:"📊", title:"Sales & profit will be calculated",
                  sub:"Only bills made after today's opening time will be counted." },
                { icon:"📦", title:"Stock snapshot will be taken",
                  sub:"Current stock levels will be saved as your closing snapshot." },
                { icon:"🔒", title:"Billing will be locked",
                  sub:"You won't be able to create new bills after closing. Use ↺ Reopen if needed." },
                { icon:"📋", title:"A day report will be generated",
                  sub:"View full summary — bills, revenue, profit, and low stock — in Day Ops." },
              ].map((item, i) => (
                <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start",
                  background:"var(--bg2,#f7f5f0)", borderRadius:12, padding:"11px 14px" }}>
                  <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)", marginBottom:2 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize:11, color:"var(--ink-faint)", lineHeight:1.5 }}>
                      {item.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Today's summary preview */}
            {tod.revenue > 0 && (
              <div style={{ background:"var(--jade-bg,#e8f8f2)", border:"1px solid rgba(26,122,74,0.2)",
                borderRadius:12, padding:"10px 14px", marginBottom:20,
                display:"flex", gap:20 }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:15, fontWeight:800, color:"var(--jade)" }}>{INR(tod.revenue)}</div>
                  <div style={{ fontSize:9, color:"var(--ink-faint)", fontWeight:600, marginTop:2 }}>TODAY'S SALES</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:15, fontWeight:800, color:"var(--saffron)" }}>{tod.bills}</div>
                  <div style={{ fontSize:9, color:"var(--ink-faint)", fontWeight:600, marginTop:2 }}>BILLS</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:15, fontWeight:800, color:"var(--ink)" }}>{tod.pieces}</div>
                  <div style={{ fontSize:9, color:"var(--ink-faint)", fontWeight:600, marginTop:2 }}>PIECES</div>
                </div>
              </div>
            )}

            {dayError && (
              <div style={{ background:"#fff5f5", border:"1px solid rgba(220,38,38,0.2)",
                borderRadius:10, padding:"9px 12px", fontSize:12, color:"#dc2626", marginBottom:14 }}>
                {dayError}
              </div>
            )}

            {/* Actions */}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowCloseConfirm(false)}
                style={{ flex:1, padding:"13px", borderRadius:13,
                  border:"1.5px solid var(--rule)", background:"transparent",
                  fontSize:13, fontWeight:700, color:"var(--ink-faint)", cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={() => { setShowCloseConfirm(false); closeDay() }}
                disabled={dayActing}
                style={{ flex:2, padding:"13px", borderRadius:13, border:"none",
                  background:"linear-gradient(135deg,#185FA5,#2563eb)", color:"#fff",
                  fontSize:13, fontWeight:700, cursor:dayActing?"default":"pointer",
                  opacity:dayActing?0.7:1, boxShadow:"0 4px 14px rgba(37,99,235,0.35)" }}>
                {dayActing ? "Closing…" : "Yes, Close Day"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
