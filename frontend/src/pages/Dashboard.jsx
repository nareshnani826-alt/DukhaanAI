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

const QUICK_ACTIONS = [
  { label:"New Sale",    color:"#E1F5EE", stroke:"#0F6E56", to:"/billing",
    icon:<svg fill="none" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> },
  { label:"Add Stock",   color:"#EFF6FF", stroke:"#378ADD", to:"/inventory",
    icon:<svg fill="none" stroke="#378ADD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
  { label:"Add Udhar",   color:"#FFFBEB", stroke:"#EF9F27", to:"/udhar",
    icon:<svg fill="none" stroke="#EF9F27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="12" y1="11" x2="12" y2="7"/><line x1="10" y1="9" x2="14" y2="9"/></svg> },
  { label:"Scan Item",   color:"#F5F3FF", stroke:"#7F77DD", to:"/billing",
    icon:<svg fill="none" stroke="#7F77DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg> },
  { label:"Voice Entry", color:"#FFF1F2", stroke:"#E24B4A", to:"/voice",
    icon:<svg fill="none" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> },
  { label:"Bulk Import", color:"#FEF3C7", stroke:"#D97706", to:"/bulk-import",
    icon:<svg fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> },
  { label:"Day Report",  color:"#F0FDF4", stroke:"#16A34A", to:"/day",
    icon:<svg fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
]

export default function Dashboard() {
  const { vendor, cloud } = useAuth()
  const navigate = useNavigate()
  const [today,   setToday]   = useState({ total:0, count:0, sales:[] })
  const [summary, setSummary] = useState({ total_revenue:0, top_products:[] })
  const [low,     setLow]     = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([Sales.today(), Sales.summary({days:30}), Products.lowStock(), Products.list()])
      .then(([t,s,l,p]) => { setToday(t); setSummary(s); setLow(l); setTotal(p.length) })
      .finally(() => setLoading(false))
  }, [cloud])

  const avgInvoice = today.count > 0 ? Math.round(today.total / today.count) : 0

  const stats = [
    { label:"Today's Sales",   value:INR(today.total),              sub:`${today.count} invoices`,   color:"#0F6E56", grad:"135deg,#0F6E56,#1D9E75", bg:"#E1F5EE",
      icon:<svg fill="none" stroke="#0F6E56" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
    { label:"Total Products",  value:total,                          sub:low.length>0?`${low.length} low stock`:"All stocked", color:"#378ADD", grad:"135deg,#378ADD,#60A5FA", bg:"#EFF6FF",
      icon:<svg fill="none" stroke="#378ADD" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> },
    { label:"Avg Invoice",     value:INR(avgInvoice),                sub:"Per transaction",           color:"#EF9F27", grad:"135deg,#EF9F27,#F59E0B", bg:"#FFFBEB",
      icon:<svg fill="none" stroke="#EF9F27" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { label:"Monthly Revenue", value:INR(summary.total_revenue||0),  sub:"Last 30 days",              color:"#7F77DD", grad:"135deg,#7F77DD,#A78BFA", bg:"#F5F3FF",
      icon:<svg fill="none" stroke="#7F77DD" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  ]

  return (
    <div className="flex-1 overflow-y-auto" style={{ background:"#f8faf8" }}>
      {/* Top bar */}
      <div style={{
        background:"#fff", padding:"0 24px", height:56,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        borderBottom:"1px solid #eef2ee", position:"sticky", top:0, zIndex:10,
      }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a1a1a" }}>
            {greeting()}{vendor?.store_name ? `, ${vendor.store_name.split(" ")[0]}` : ""} 👋
          </div>
          <div style={{ fontSize:11, color:"#94a3b8" }}>
            {new Date().toLocaleDateString("en-IN",{ weekday:"long", day:"numeric", month:"long" })}
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{
            fontSize:10, fontWeight:600, padding:"4px 10px", borderRadius:20,
            background: cloud ? "#E1F5EE" : "#f5f5f5",
            color: cloud ? "#0F6E56" : "#94a3b8",
          }}>
            {cloud ? "● Cloud sync" : "● Local mode"}
          </span>
          <button onClick={() => navigate("/billing")}
            style={{
              background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
              color:"#fff", border:"none", borderRadius:10,
              padding:"8px 16px", fontSize:12, fontWeight:600, cursor:"pointer",
              display:"flex", alignItems:"center", gap:6,
            }}>
            <span>+</span> New Invoice
          </button>
        </div>
      </div>

      <div style={{ padding:24 }}>

        {/* Low stock alert */}
        {low.length > 0 && (
          <div style={{
            background:"linear-gradient(135deg,#FCEBEB,#FEF0F0)",
            border:"1px solid #FECACA", borderRadius:14,
            padding:"12px 16px", marginBottom:20,
            display:"flex", alignItems:"center", gap:12,
          }}>
            <div style={{
              width:34, height:34, background:"#E24B4A", borderRadius:9,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            }}>
              <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#991B1B" }}>
                {low.length} product{low.length>1?"s":""} need restocking
              </div>
              <div style={{ fontSize:10, color:"#EF4444", marginTop:2 }}>
                {low.slice(0,3).map(p=>p.name).join(", ")}{low.length>3?` +${low.length-3} more`:""}
              </div>
            </div>
            <button onClick={() => navigate("/inventory")}
              style={{ background:"#E24B4A", color:"#fff", border:"none",
                borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>
              View →
            </button>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
          {stats.map((s,i) => (
            <div key={i} style={{
              background:"#fff", borderRadius:16, padding:16,
              border:"1px solid #eef2ee", position:"relative", overflow:"hidden",
            }}>
              <div style={{
                position:"absolute", top:0, left:0, right:0, height:3,
                background:`linear-gradient(${s.grad})`, borderRadius:"3px 3px 0 0",
              }}/>
              <div style={{
                position:"absolute", top:14, right:14,
                width:36, height:36, borderRadius:10,
                background:s.bg, display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24">{s.icon.props.children}</svg>
              </div>
              <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6, marginTop:4 }}>
                {s.label}
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:"#1a1a1a", marginBottom:2 }}>
                {loading ? "—" : s.value}
              </div>
              <div style={{ fontSize:10, color: s.label==="Total Products" && low.length>0 ? "#E24B4A" : "#94a3b8" }}>
                {loading ? "..." : s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ fontSize:13, fontWeight:700, color:"#333", marginBottom:12, letterSpacing:"-0.2px" }}>
          ⚡ Quick Actions
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:20 }}>
          {QUICK_ACTIONS.map((qa,i) => (
            <button key={i} onClick={() => navigate(qa.to)}
              style={{
                background:"#fff", border:"1.5px solid #eef2ee",
                borderRadius:14, padding:"14px 8px", textAlign:"center",
                cursor:"pointer", transition:"all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=qa.stroke; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 4px 16px ${qa.color}` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="#eef2ee"; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none" }}>
              <div style={{
                width:44, height:44, borderRadius:13,
                background:qa.color, display:"flex", alignItems:"center",
                justifyContent:"center", margin:"0 auto 8px",
              }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"
                  stroke={qa.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {qa.icon.props.children}
                </svg>
              </div>
              <div style={{ fontSize:10, fontWeight:600, color:"#444" }}>{qa.label}</div>
            </button>
          ))}
        </div>

        {/* Two columns */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>

          {/* Recent sales */}
          <div style={{ background:"#fff", borderRadius:16, padding:16, border:"1px solid #eef2ee" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#333" }}>Recent Sales</div>
              <button onClick={() => navigate("/billing")}
                style={{ fontSize:10, color:"#1D9E75", fontWeight:600, background:"none", border:"none", cursor:"pointer" }}>
                View all →
              </button>
            </div>
            {loading ? (
              <div style={{ space:"y-2" }}>
                {[1,2,3].map(i => <div key={i} style={{ height:40, background:"#f5f5f5", borderRadius:8, marginBottom:8, animation:"pulse 1.5s infinite" }}/>)}
              </div>
            ) : today.sales.length === 0 ? (
              <div style={{ textAlign:"center", padding:"24px 0", color:"#94a3b8", fontSize:12 }}>
                No sales today yet — start billing!
              </div>
            ) : today.sales.slice(0,5).map((s,i) => (
              <div key={i} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"8px 0", borderBottom: i<4?"1px solid #f5f7f5":"none",
              }}>
                <div style={{
                  width:32, height:32, borderRadius:9,
                  background:["#E1F5EE","#EFF6FF","#FFFBEB","#F5F3FF","#FFF1F2"][i%5],
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:12, fontWeight:700,
                  color:["#0F6E56","#378ADD","#EF9F27","#7F77DD","#E24B4A"][i%5],
                  flexShrink:0,
                }}>
                  {(s.customer||"W").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#333" }}>{s.customer||"Walk-in"}</div>
                  <div style={{ fontSize:10, color:"#94a3b8" }}>
                    {s.qty} items · {new Date(s.sold_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:"#0F6E56" }}>{INR(s.total)}</div>
              </div>
            ))}
          </div>

          {/* Low stock / top sellers */}
          <div style={{ background:"#fff", borderRadius:16, padding:16, border:"1px solid #eef2ee" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#333" }}>
                {low.length > 0 ? "⚠ Low Stock Items" : "Top Sellers"}
              </div>
              <button onClick={() => navigate("/inventory")}
                style={{ fontSize:10, color:"#1D9E75", fontWeight:600, background:"none", border:"none", cursor:"pointer" }}>
                View all →
              </button>
            </div>
            {loading ? (
              [1,2,3].map(i => <div key={i} style={{ height:40, background:"#f5f5f5", borderRadius:8, marginBottom:8 }}/>)
            ) : low.length > 0 ? low.slice(0,5).map((p,i) => (
              <div key={i} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"8px 0", borderBottom: i<4?"1px solid #f5f7f5":"none",
              }}>
                <div style={{
                  width:32, height:32, borderRadius:9,
                  background: p.stock<=0 ? "#FCEBEB" : "#FAEEDA",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0,
                }}>
                  {p.stock<=0 ? "🔴" : "🟡"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#333" }}>{p.name}</div>
                  <div style={{ fontSize:10, color:"#94a3b8" }}>Min: {p.min_stock} · Left: {p.stock}</div>
                </div>
                <div style={{
                  fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:8,
                  background: p.stock<=0?"#FCEBEB":"#FAEEDA",
                  color: p.stock<=0?"#E24B4A":"#EF9F27",
                }}>
                  {p.stock<=0 ? "Out!" : "Low"}
                </div>
              </div>
            )) : (
              <div style={{ textAlign:"center", padding:"24px 0", color:"#94a3b8", fontSize:12 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
                All stock levels healthy!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
