import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Products, Sales } from "../sync/db"
import { useAuth } from "../context/AuthContext"

const INR = n => "₹" + (n||0).toLocaleString("en-IN")

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

export default function Dashboard() {
  const { vendor, cloud } = useAuth()
  const navigate = useNavigate()
  const [today,   setToday]   = useState({ total:0, count:0, sales:[] })
  const [summary, setSummary] = useState({ total_revenue:0 })
  const [low,     setLow]     = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([Sales.today(), Sales.summary({days:30}), Products.lowStock(), Products.list()])
      .then(([t,s,l,p]) => { setToday(t); setSummary(s); setLow(l); setTotal(p.length) })
      .finally(() => setLoading(false))
  }, [cloud])

  const avgInv = today.count > 0 ? Math.round(today.total / today.count) : 0

  return (
    <div style={{ flex:1, overflowY:"auto", background:"var(--bg0)" }}>

      {/* Top bar */}
      <div style={{ background:"var(--bg1)", borderBottom:"1px solid var(--rule)",
        padding:"14px 20px", display:"flex", alignItems:"center",
        justifyContent:"space-between", position:"sticky", top:0, zIndex:10,
        boxShadow:"0 1px 6px var(--shadow)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:12, flexShrink:0,
            background:"linear-gradient(135deg,#e87722,#d45f00)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"'Tiro Devanagari Hindi',serif", fontWeight:700, fontSize:20, color:"#fff",
            boxShadow:"0 2px 8px rgba(232,119,34,0.3)" }}>
            {vendor?.store_name?.charAt(0) || "न"}
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"var(--ink)" }}>
              {greeting()}, {vendor?.store_name?.split(" ")[0] || "ji"} 👋
            </div>
            <div style={{ fontSize:11, color:"var(--ink-faint)", marginTop:1 }}>
              {vendor?.store_name || "DukaanAI"} · {new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:10, fontWeight:600, padding:"4px 10px", borderRadius:20,
            background: cloud ? "var(--jade-bg)" : "var(--bg2)",
            color: cloud ? "var(--jade)" : "var(--ink-faint)",
            border: `1px solid ${cloud ? "rgba(26,122,74,0.3)" : "var(--rule)"}` }}>
            {cloud ? "● Cloud sync" : "● Local"}
          </span>
          <button onClick={() => navigate("/billing")} className="btn btn-primary btn-sm">
            + New Invoice
          </button>
        </div>
      </div>

      <div style={{ padding:"20px" }}>

        {/* Hero card */}
        <div style={{ background:"var(--bg1)", borderRadius:18, padding:"24px",
          border:"1px solid var(--rule)", marginBottom:16,
          boxShadow:"0 2px 12px var(--shadow)", position:"relative", overflow:"hidden" }}>
          {/* decorative circles */}
          <div style={{ position:"absolute", right:-40, top:-40, width:180, height:180,
            borderRadius:"50%", background:"var(--saffron-bg)", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", right:20, top:-20, width:100, height:100,
            borderRadius:"50%", background:"var(--saffron-bg)", pointerEvents:"none" }}/>
          <div style={{ position:"relative" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--ink-faint)",
              letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:6 }}>Today's Sales</div>
            <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif",
              fontSize:48, fontWeight:800, color:"var(--ink)", lineHeight:1, letterSpacing:"-1px" }}>
              {loading ? "—" : INR(today.total)}
            </div>
            <div style={{ display:"flex", gap:20, marginTop:12, fontSize:12, flexWrap:"wrap" }}>
              <span style={{ color:"var(--jade)", fontWeight:600 }}>
                {today.count > 0 ? `${today.count} invoices today` : "No sales yet"}
              </span>
              <span style={{ color:"var(--ink-faint)" }}>
                {INR(avgInv)} avg · {INR(summary.total_revenue||0)} this month
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
          {[
            { label:"Open Udhaar", value:"₹0", sub:"Check khata",    color:"var(--ember)",   bar:"#c0392b" },
            { label:"Products",    value:loading?"—":total, sub:low.length>0?`${low.length} low stock`:"All stocked", color:"var(--brass)", bar:"#b8860b" },
            { label:"Avg Invoice", value:loading?"—":INR(avgInv), sub:"Today", color:"var(--jade)", bar:"#1a7a4a" },
          ].map((s,i) => (
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

        {/* Low stock alert */}
        {low.length > 0 && (
          <div style={{ background:"var(--ember-bg)", border:"1px solid rgba(192,57,43,0.25)",
            borderRadius:14, padding:"12px 16px", marginBottom:16,
            display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:20, flexShrink:0 }}>⚠️</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--ember)" }}>
                {low.length} product{low.length>1?"s":""} need restocking
              </div>
              <div style={{ fontSize:11, color:"var(--ink-dim)", marginTop:2 }}>
                {low.slice(0,3).map(p=>p.name).join(", ")}{low.length>3?` +${low.length-3} more`:""}
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
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
          {QUICK.map((qa,i) => (
            <button key={i} onClick={() => navigate(qa.to)}
              style={{ background:"var(--bg1)", border:`1px solid var(--rule)`,
                borderRadius:14, padding:"14px 8px", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                transition:"all 0.15s", boxShadow:"0 1px 4px var(--shadow)" }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 4px 16px var(--shadow-md)"; e.currentTarget.style.borderColor=`${qa.border}` }}
              onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 1px 4px var(--shadow)"; e.currentTarget.style.borderColor="var(--rule)" }}>
              <div style={{ width:40, height:40, borderRadius:12,
                background:qa.color, border:`1px solid ${qa.border}`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{qa.icon}</div>
              <span style={{ fontSize:11, color:"var(--ink)", fontWeight:600 }}>{qa.label}</span>
            </button>
          ))}
        </div>

        {/* Two columns */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

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
              ) : today.sales.slice(0,5).map((s,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                  padding:"12px 14px", borderBottom: i<4 ? "1px solid var(--rule-soft)" : "none" }}>
                  <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0,
                    background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
                    color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                    fontWeight:800, fontSize:13 }}>{(s.customer||"W").charAt(0).toUpperCase()}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.customer||"Walk-in"}</div>
                    <div style={{ fontSize:11, color:"var(--ink-faint)" }}>
                      {s.qty} items · {new Date(s.sold_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:"var(--saffron)" }}>{INR(s.total)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Low stock */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)" }}>
                {low.length > 0 ? "⚠ Low Stock" : "Stock Health"}
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
              )) : low.length === 0 ? (
                <div style={{ padding:"28px 16px", textAlign:"center",
                  color:"var(--ink-faint)", fontSize:13 }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
                  All stock levels healthy!
                </div>
              ) : low.slice(0,5).map((p,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                  padding:"12px 14px", borderBottom: i<4 ? "1px solid var(--rule-soft)" : "none" }}>
                  <div style={{ width:34, height:34, borderRadius:10, flexShrink:0,
                    background: p.stock<=0 ? "var(--ember-bg)" : "var(--brass-bg)",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                    {p.stock<=0 ? "🔴" : "🟡"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                    <div style={{ fontSize:11, color:"var(--ink-faint)" }}>Min: {p.min_stock} · Left: {p.stock}</div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:999,
                    textTransform:"uppercase", letterSpacing:"0.8px",
                    background: p.stock<=0 ? "var(--ember-bg)" : "var(--brass-bg)",
                    color: p.stock<=0 ? "var(--ember)" : "var(--brass)",
                    border: `1px solid ${p.stock<=0 ? "rgba(192,57,43,0.3)" : "rgba(184,134,11,0.3)"}` }}>
                    {p.stock<=0 ? "OUT!" : "LOW"}
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
