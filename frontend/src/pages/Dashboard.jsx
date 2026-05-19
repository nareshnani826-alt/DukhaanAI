import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Products, Sales } from "../sync/db"
import { useAuth } from "../context/AuthContext"

const T = {
  bg0:"#140b06",bg1:"#1c1209",bg2:"#261810",bg3:"#33200f",
  ink:"#f4e4c1",inkDim:"#b9a382",inkFaint:"#7a6a51",
  rule:"rgba(244,228,193,0.12)",ruleSoft:"rgba(244,228,193,0.06)",
  brass:"#c08a3a",brassLite:"#f6c768",
  saffron:"#e87722",saffronHot:"#ff8e35",
  ember:"#b3261e",emberLite:"#ff8e7a",
  jade:"#3a8a6b",jadeLite:"#4cb892",
}

const INR = n => "₹" + (n||0).toLocaleString("en-IN")

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "नमस्ते"
  if (h < 17) return "नमस्कार"
  return "प्रणाम"
}

function StatTile({ label, value, sub, tone=T.brassLite, loading }) {
  return (
    <div className="stat-card">
      <div className="stat-bar" style={{ background:tone }}/>
      <div style={{ fontSize:9,color:T.inkFaint,letterSpacing:"1.2px",fontWeight:700,textTransform:"uppercase",marginTop:4 }}>{label}</div>
      <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif",fontSize:22,color:T.ink,fontWeight:700,marginTop:6,lineHeight:1 }}>
        {loading ? <span style={{color:T.inkFaint}}>—</span> : value}
      </div>
      {sub && <div style={{ fontSize:9,color:tone,marginTop:4,fontWeight:600 }}>{loading?"...":sub}</div>}
    </div>
  )
}

const QUICK = [
  { label:"New Sale",    emoji:"🧾", tone:T.saffron,   to:"/billing" },
  { label:"Add Stock",   emoji:"📦", tone:T.brassLite, to:"/inventory" },
  { label:"Add Udhar",   emoji:"📒", tone:T.ember,     to:"/udhar" },
  { label:"Scan Item",   emoji:"📷", tone:T.jadeLite,  to:"/billing" },
  { label:"Voice Entry", emoji:"🎤", tone:T.emberLite, to:"/voice" },
  { label:"Bulk Import", emoji:"📥", tone:T.brassLite, to:"/bulk-import" },
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
    <div style={{ flex:1, overflowY:"auto", background:T.bg0 }}>

      {/* Top bar */}
      <div style={{ background:"rgba(20,11,6,0.9)", backdropFilter:"blur(8px)",
        borderBottom:`1px solid ${T.rule}`, padding:"14px 20px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:10, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38,height:38,borderRadius:10,
            background:`linear-gradient(135deg,${T.brass},${T.saffron})`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontFamily:"'Tiro Devanagari Hindi',serif",fontWeight:700,fontSize:18,color:"#1a0c04" }}>
            {vendor?.store_name?.charAt(0) || "न"}
          </div>
          <div>
            <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif",fontSize:15,color:T.ink,fontWeight:600,lineHeight:1 }}>
              {greeting()}, {vendor?.store_name?.split(" ")[0] || "ji"} 🙏
            </div>
            <div style={{ fontSize:10,color:T.inkFaint,marginTop:2 }}>
              {vendor?.store_name || "DukaanAI"} · {new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}
            </div>
          </div>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <span style={{ fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:20,
            background: cloud ? "rgba(58,138,107,0.18)" : "rgba(244,228,193,0.06)",
            color: cloud ? T.jadeLite : T.inkFaint,
            border: `1px solid ${cloud ? "rgba(58,138,107,0.3)" : T.rule}` }}>
            {cloud ? "● Cloud sync" : "● Local"}
          </span>
          <button onClick={() => navigate("/billing")} className="btn btn-primary btn-sm" style={{ gap:6 }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Invoice
          </button>
        </div>
      </div>

      <div style={{ padding:"14px 18px" }}>

        {/* Hero takings */}
        <div style={{ background:`linear-gradient(135deg,${T.bg2} 0%,${T.bg3} 100%)`,
          borderRadius:18, padding:"20px 20px",
          border:`1px solid ${T.brass}40`, position:"relative", overflow:"hidden", marginBottom:14 }}>
          <svg viewBox="0 0 200 200" style={{ position:"absolute",top:-30,right:-30,width:200,height:200,opacity:0.15,pointerEvents:"none" }}>
            {[...Array(12)].map((_,i) => <circle key={i} cx="100" cy="100" r={20+i*9} fill="none" stroke={T.brassLite} strokeWidth="0.7"/>)}
          </svg>
          <div style={{ position:"relative" }}>
            <div style={{ fontSize:10,color:T.brassLite,letterSpacing:"1.5px",fontWeight:700,textTransform:"uppercase" }}>Today's takings</div>
            <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif",fontSize:48,color:T.ink,fontWeight:700,lineHeight:1,marginTop:8,letterSpacing:"-1px" }}>
              {loading ? "—" : INR(today.total)}
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,fontSize:11 }}>
              <span style={{ color:T.jadeLite,fontWeight:600 }}>
                {today.count > 0 ? `${today.count} invoices today` : "No sales yet"}
              </span>
              <span style={{ color:T.inkDim }}>{INR(avgInv)} avg · {INR(summary.total_revenue||0)} this month</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14 }}>
          <StatTile label="Open Udhaar" value="₹0" sub="Check khata" tone={T.ember} loading={loading}/>
          <StatTile label="Products" value={total} sub={low.length>0?`${low.length} low stock`:"All stocked"} tone={T.brass} loading={loading}/>
          <StatTile label="Avg Invoice" value={INR(avgInv)} sub="Today" tone={T.jadeLite} loading={loading}/>
        </div>

        {/* Low stock alert */}
        {low.length > 0 && (
          <div style={{ background:"rgba(179,38,30,0.08)",border:`1px solid ${T.ember}40`,
            borderRadius:14,padding:"12px 14px",marginBottom:14,
            display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ fontSize:20,flexShrink:0 }}>⚠️</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12,fontWeight:700,color:T.ink }}>{low.length} product{low.length>1?"s":""} need restocking</div>
              <div style={{ fontSize:10,color:T.emberLite,marginTop:2 }}>{low.slice(0,3).map(p=>p.name).join(", ")}{low.length>3?` +${low.length-3} more`:""}</div>
            </div>
            <button onClick={()=>navigate("/inventory")} className="btn btn-sm"
              style={{ background:T.ember,color:"#fff",border:"none",fontWeight:700 }}>Reorder →</button>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ fontSize:10,color:T.brassLite,fontWeight:700,letterSpacing:"2px",
          textTransform:"uppercase",marginBottom:10 }}>⚡ Quick Actions</div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16 }}>
          {QUICK.map((qa,i) => (
            <button key={i} onClick={()=>navigate(qa.to)}
              style={{ background:T.bg2,border:`1px solid ${T.rule}`,borderRadius:12,
                padding:"12px 8px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,
                transition:"all 0.15s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=qa.tone;e.currentTarget.style.transform="translateY(-2px)"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=`rgba(244,228,193,0.12)`;e.currentTarget.style.transform="none"}}>
              <div style={{ width:36,height:36,borderRadius:10,
                background:`${qa.tone}18`,border:`1px solid ${qa.tone}40`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:17 }}>{qa.emoji}</div>
              <span style={{ fontSize:10,color:T.ink,fontWeight:600 }}>{qa.label}</span>
            </button>
          ))}
        </div>

        {/* Two column */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>

          {/* Recent sales */}
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <div style={{ fontSize:10,color:T.brassLite,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase" }}>
                Recent Sales <span style={{ fontFamily:"'Tiro Devanagari Hindi',serif",color:T.inkFaint,fontSize:11 }}>आज की बिक्री</span>
              </div>
              <button onClick={()=>navigate("/billing")} style={{ fontSize:10,color:T.saffron,fontWeight:600,background:"none",border:"none",cursor:"pointer" }}>View all →</button>
            </div>
            <div style={{ background:T.bg2,borderRadius:14,border:`1px solid ${T.rule}`,overflow:"hidden" }}>
              {loading ? (
                [1,2,3].map(i => <div key={i} style={{ height:52,borderBottom:`1px solid ${T.ruleSoft}`,background:"transparent" }}/>)
              ) : today.sales.length === 0 ? (
                <div style={{ padding:"28px 16px",textAlign:"center",color:T.inkFaint,fontSize:12 }}>
                  <div style={{ fontSize:28,marginBottom:8 }}>🎤</div>
                  Speak to start your first sale!
                </div>
              ) : today.sales.slice(0,5).map((s,i) => (
                <div key={i} style={{ display:"flex",alignItems:"center",gap:10,
                  padding:"11px 14px",borderBottom:i<4?`1px solid ${T.ruleSoft}`:"none" }}>
                  <div style={{ width:30,height:30,borderRadius:"50%",flexShrink:0,
                    background:`linear-gradient(135deg,${T.brass},${T.saffron})`,
                    color:"#1a0c04",display:"flex",alignItems:"center",justifyContent:"center",
                    fontWeight:800,fontSize:12 }}>{(s.customer||"W").charAt(0).toUpperCase()}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:600,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.customer||"Walk-in"}</div>
                    <div style={{ fontSize:10,color:T.inkFaint }}>
                      {s.qty} items · {new Date(s.sold_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                  <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif",fontSize:15,color:T.brassLite,fontWeight:700 }}>{INR(s.total)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Low stock */}
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <div style={{ fontSize:10,color:T.brassLite,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase" }}>
                {low.length>0?"⚠ Low Stock":"Stock Health"}
                <span style={{ fontFamily:"'Tiro Devanagari Hindi',serif",color:T.inkFaint,fontSize:11,marginLeft:6 }}>कम स्टॉक</span>
              </div>
              <button onClick={()=>navigate("/inventory")} style={{ fontSize:10,color:T.saffron,fontWeight:600,background:"none",border:"none",cursor:"pointer" }}>View all →</button>
            </div>
            <div style={{ background:T.bg2,borderRadius:14,border:`1px solid ${T.rule}`,overflow:"hidden" }}>
              {loading ? (
                [1,2,3].map(i => <div key={i} style={{ height:52,borderBottom:`1px solid ${T.ruleSoft}` }}/>)
              ) : low.length === 0 ? (
                <div style={{ padding:"28px 16px",textAlign:"center",color:T.inkFaint,fontSize:12 }}>
                  <div style={{ fontSize:28,marginBottom:8 }}>✅</div>
                  All stock levels healthy!
                </div>
              ) : low.slice(0,5).map((p,i) => (
                <div key={i} style={{ display:"flex",alignItems:"center",gap:10,
                  padding:"11px 14px",borderBottom:i<4?`1px solid ${T.ruleSoft}`:"none" }}>
                  <div style={{ width:30,height:30,borderRadius:8,flexShrink:0,
                    background: p.stock<=0?"rgba(179,38,30,0.18)":"rgba(192,138,58,0.18)",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>
                    {p.stock<=0?"🔴":"🟡"}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:600,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.name}</div>
                    <div style={{ fontSize:10,color:T.inkFaint }}>Min: {p.min_stock} · Left: {p.stock}</div>
                  </div>
                  <span style={{ fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:999,textTransform:"uppercase",
                    background:p.stock<=0?"rgba(179,38,30,0.2)":"rgba(192,138,58,0.2)",
                    color:p.stock<=0?T.emberLite:T.brassLite,
                    border:`1px solid ${p.stock<=0?"rgba(179,38,30,0.4)":"rgba(192,138,58,0.4)"}` }}>
                    {p.stock<=0?"OUT!":"LOW"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
