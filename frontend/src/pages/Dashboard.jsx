import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Products, Sales, Invoices, api } from "../sync/db"
import { useAuth } from "../context/AuthContext"

const INR = n => "₹" + (n || 0).toLocaleString("en-IN")

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

// ── Morning Briefing card ─────────────────────────────────────
function BriefingCard({ briefing, navigate }) {
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
      to:    "/inventory",
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
      to:    "/inventory",
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
      to:    "/inventory",
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
      <div style={{ background:"var(--bg1)", border:"1px solid var(--rule)", borderRadius:18,
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
    <div style={{ background:"var(--bg1)", border:"1px solid var(--rule)", borderRadius:18,
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
            <button key={i} onClick={() => navigate(item.to)}
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

export default function Dashboard() {
  const { vendor, cloud } = useAuth()
  const navigate = useNavigate()
  const [today,    setToday]    = useState({ total:0, count:0, sales:[] })
  const [summary,  setSummary]  = useState({ total_revenue:0 })
  const [low,      setLow]      = useState([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [briefing, setBriefing] = useState(null)

  useEffect(() => {
    // Use Invoices.today() for revenue — it captures voice bills that have no
    // product_id and therefore no matching sales record.
    Promise.all([Invoices.today(), Sales.summary({ days:30 }), Products.lowStock(), Products.list()])
      .then(([t, s, l, p]) => { setToday(t); setSummary(s); setLow(l); setTotal(p.length) })
      .finally(() => setLoading(false))

    // Briefing only for authenticated (cloud) users
    if (vendor) {
      api.get("/insights/briefing").then(setBriefing).catch(() => {})
    }
  }, [cloud, vendor?.id])

  const avgInv = today.count > 0 ? Math.round(today.total / today.count) : 0
  const profit  = briefing?.profit

  return (
    <div style={{ flex:1, overflowY:"auto", background:"var(--bg0)" }}>

      {/* Top bar */}
      <div style={{ background:"var(--bg1)", borderBottom:"1px solid var(--rule)",
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
              {greeting()}, {vendor?.store_name?.split(" ")[0] || "ji"} 👋
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
        <button onClick={() => navigate("/billing")} className="btn btn-primary btn-sm"
          style={{ flexShrink:0, marginLeft:8 }}>
          + New Invoice
        </button>
      </div>

      <div className="page-content" style={{ padding:"16px" }}>

        {/* Hero card */}
        <div style={{ background:"var(--bg1)", borderRadius:16, padding:"18px 16px",
          border:"1px solid var(--rule)", marginBottom:14,
          boxShadow:"0 2px 12px var(--shadow)", position:"relative", overflow:"hidden" }}>
          {/* decorative circles */}
          <div style={{ position:"absolute", right:-40, top:-40, width:180, height:180,
            borderRadius:"50%", background:"var(--saffron-bg)", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", right:20, top:-20, width:100, height:100,
            borderRadius:"50%", background:"var(--saffron-bg)", pointerEvents:"none" }}/>
          <div style={{ position:"relative" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--ink-faint)",
              letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:6 }}>Today's Revenue</div>
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
                {today.count > 0 ? `${today.count} invoices today` : "No sales yet"}
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

        {/* Morning Briefing */}
        <BriefingCard briefing={briefing} navigate={navigate} />

        {/* Stats row */}
        <div className="dash-stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
          {[
            {
              label: "Open Udhaar",
              value: briefing ? INR(briefing.udhar.total_due) : "₹0",
              sub:   briefing?.udhar?.customer_count > 0
                       ? `${briefing.udhar.customer_count} customer${briefing.udhar.customer_count > 1 ? "s" : ""}`
                       : "Check khata",
              color: "var(--ember)", bar:"#c0392b",
            },
            {
              label: "Products",
              value: loading ? "—" : total,
              sub:   low.length > 0 ? `${low.length} low stock` : "All stocked",
              color: "var(--brass)", bar:"#b8860b",
            },
            {
              label: "Avg Invoice",
              value: loading ? "—" : INR(avgInv),
              sub:   "Today",
              color: "var(--jade)", bar:"#1a7a4a",
            },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-bar" style={{ background:s.bar }}/>
              <div style={{ fontSize:9, fontWeight:700, color:"var(--ink-faint)",
                textTransform:"uppercase", letterSpacing:"1.2px", marginTop:4 }}>{s.label}</div>
              <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif",
                fontSize:22, fontWeight:800, color:"var(--ink)", marginTop:6, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:10, color:s.color, marginTop:4, fontWeight:600 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Low stock alert banner */}
        {low.length > 0 && (
          <div style={{ background:"var(--ember-bg)", border:"1px solid rgba(192,57,43,0.25)",
            borderRadius:14, padding:"12px 16px", marginBottom:16,
            display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:20, flexShrink:0 }}>⚠️</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--ember)" }}>
                {low.length} product{low.length > 1 ? "s" : ""} need restocking
              </div>
              <div style={{ fontSize:11, color:"var(--ink-dim)", marginTop:2 }}>
                {low.slice(0,3).map(p => p.name).join(", ")}{low.length > 3 ? ` +${low.length - 3} more` : ""}
              </div>
            </div>
            <button onClick={() => navigate("/inventory")} className="btn btn-sm btn-danger">
              View →
            </button>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ fontSize:11, fontWeight:700, color:"var(--ink-faint)",
          letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:12 }}>⚡ Quick Actions</div>
        <div className="dash-quick-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
          {QUICK.map((qa, i) => (
            <button key={i} onClick={() => navigate(qa.to)}
              style={{ background:"var(--bg1)", border:"1px solid var(--rule)",
                borderRadius:14, padding:"14px 8px", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                transition:"all 0.15s", boxShadow:"0 1px 4px var(--shadow)" }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 4px 16px var(--shadow-md)"; e.currentTarget.style.borderColor=qa.border }}
              onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 1px 4px var(--shadow)"; e.currentTarget.style.borderColor="var(--rule)" }}>
              <div style={{ width:40, height:40, borderRadius:12,
                background:qa.color, border:`1px solid ${qa.border}`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{qa.icon}</div>
              <span style={{ fontSize:11, color:"var(--ink)", fontWeight:600 }}>{qa.label}</span>
            </button>
          ))}
        </div>

        {/* Two columns — stacks to single on mobile */}
        <div className="dash-bottom-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

          {/* Recent sales */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)" }}>Recent Sales</div>
              <button onClick={() => navigate("/billing")}
                style={{ fontSize:11, color:"var(--saffron)", fontWeight:600,
                  background:"none", border:"none", cursor:"pointer" }}>View all →</button>
            </div>
            <div style={{ background:"var(--bg1)", borderRadius:14,
              border:"1px solid var(--rule)", overflow:"hidden",
              boxShadow:"0 1px 4px var(--shadow)" }}>
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

          {/* Low stock / Reorder */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)" }}>
                {briefing?.stockout_predictions?.length > 0 ? "⏱ Stockout Predictions" : low.length > 0 ? "⚠ Low Stock" : "Stock Health"}
              </div>
              <button onClick={() => navigate("/inventory")}
                style={{ fontSize:11, color:"var(--saffron)", fontWeight:600,
                  background:"none", border:"none", cursor:"pointer" }}>View all →</button>
            </div>
            <div style={{ background:"var(--bg1)", borderRadius:14,
              border:"1px solid var(--rule)", overflow:"hidden",
              boxShadow:"0 1px 4px var(--shadow)" }}>
              {loading ? [1,2,3].map(i => (
                <div key={i} style={{ height:54, borderBottom:"1px solid var(--rule-soft)",
                  background:"var(--bg2)", margin:"2px 0" }}/>
              )) : briefing?.stockout_predictions?.length > 0 ? (
                briefing.stockout_predictions.slice(0, 5).map((p, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"12px 14px", borderBottom: i < 4 ? "1px solid var(--rule-soft)" : "none" }}>
                    <div style={{ width:34, height:34, borderRadius:10, flexShrink:0,
                      background: p.days_left < 1 ? "var(--ember-bg)" : "rgba(217,119,6,0.1)",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                      {p.days_left < 1 ? "🔴" : "🟠"}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                      <div style={{ fontSize:11, color:"var(--ink-faint)" }}>
                        {p.daily_rate} {p.unit}/day · {p.days_left}d left
                      </div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:999,
                      textTransform:"uppercase", letterSpacing:"0.8px",
                      background: p.days_left < 1 ? "var(--ember-bg)" : "rgba(217,119,6,0.12)",
                      color: p.days_left < 1 ? "var(--ember)" : "#b45309",
                      border: `1px solid ${p.days_left < 1 ? "rgba(192,57,43,0.3)" : "rgba(180,83,9,0.3)"}` }}>
                      {p.days_left < 1 ? "TODAY" : `${p.days_left}d`}
                    </span>
                  </div>
                ))
              ) : low.length === 0 ? (
                <div style={{ padding:"28px 16px", textAlign:"center",
                  color:"var(--ink-faint)", fontSize:13 }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
                  All stock levels healthy!
                </div>
              ) : low.slice(0, 5).map((p, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                  padding:"12px 14px", borderBottom: i < 4 ? "1px solid var(--rule-soft)" : "none" }}>
                  <div style={{ width:34, height:34, borderRadius:10, flexShrink:0,
                    background: p.stock <= 0 ? "var(--ember-bg)" : "var(--brass-bg)",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                    {p.stock <= 0 ? "🔴" : "🟡"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                    <div style={{ fontSize:11, color:"var(--ink-faint)" }}>Min: {p.min_stock} · Left: {p.stock}</div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:999,
                    textTransform:"uppercase", letterSpacing:"0.8px",
                    background: p.stock <= 0 ? "var(--ember-bg)" : "var(--brass-bg)",
                    color: p.stock <= 0 ? "var(--ember)" : "var(--brass)",
                    border: `1px solid ${p.stock <= 0 ? "rgba(192,57,43,0.3)" : "rgba(184,134,11,0.3)"}` }}>
                    {p.stock <= 0 ? "OUT!" : "LOW"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ height:24 }}/>
      </div>
    </div>
  )
}
