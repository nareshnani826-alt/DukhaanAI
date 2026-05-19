import { useNavigate, useLocation } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { usePlan } from "../context/PlanContext"
import { useState } from "react"
import AuthModal from "./AuthModal"

const T = {
  bg0:"#140b06",bg1:"#1c1209",bg2:"#261810",
  ink:"#f4e4c1",inkDim:"#b9a382",inkFaint:"#7a6a51",
  rule:"rgba(244,228,193,0.12)",
  brass:"#c08a3a",brassLite:"#f6c768",
  saffron:"#e87722",saffronHot:"#ff8e35",
  jade:"#3a8a6b",jadeLite:"#4cb892",
}

const NAV = [
  { label:"Home", to:"/dashboard", exact:false,
    icon:<svg fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>,
    sub:null },
  { label:"Sales", to:"/billing", exact:false,
    icon:<svg fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>,
    sub:[{to:"/billing",label:"GST Billing"},{to:"/udhar",label:"Udhar Khata"},{to:"/customers",label:"Customers"}] },
  { label:"Stock", to:"/inventory", exact:false,
    icon:<svg fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    sub:[{to:"/inventory",label:"Inventory"},{to:"/bulk-import",label:"Bulk Import ✨"},{to:"/wastage",label:"Wastage"},{to:"/demand",label:"Demand Intel"}] },
  { label:"Assistant", to:"/voice", exact:false,
    icon:<svg fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    sub:[{to:"/voice",label:"Voice Agent"},{to:"/agent",label:"AI Agent"}] },
  { label:"More", to:"/day", exact:false,
    icon:<svg fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    sub:[{to:"/day",label:"Day Ops"},{to:"/insights",label:"Insights"},{to:"/help",label:"Help"},{to:"/settings",label:"Settings"},{to:"/install",label:"Install App"}] },
]

// Mobile bottom nav tabs
const MOB_TABS = [
  { to:"/dashboard", label:"Home",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg> },
  { to:"/billing",   label:"Sales",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg> },
  { to:"/voice",     label:"",      voice:true },
  { to:"/inventory", label:"Stock",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> },
  { to:"/day",       label:"More",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg> },
]

export default function Layout({ children }) {
  const { vendor, loggedIn, cloud, logout } = useAuth()
  const { theme, toggleTheme, isDark } = useTheme()
  const { plan, planLabel } = usePlan()
  const [showAuth,  setShowAuth]  = useState(false)
  const [expanded,  setExpanded]  = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  function isActive(nav) {
    if (nav.sub) return nav.sub.some(s => location.pathname.startsWith(s.to))
    return location.pathname.startsWith(nav.to)
  }

  const planColors = { free:T.jadeLite, pro:T.brassLite, wholesale:T.saffron }
  const planColor  = planColors[plan] || T.jadeLite

  return (
    <div className="app-shell">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* ── Desktop Sidebar ──────────────────────────────── */}
      <aside className="app-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:10,flexShrink:0,
              background:`linear-gradient(135deg,${T.brass},${T.saffron})`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"'Tiro Devanagari Hindi',serif",fontWeight:700,fontSize:18,color:"#1a0c04" }}>द</div>
            <div>
              <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif",fontSize:16,color:T.ink,lineHeight:1 }}>
                दुकान<span style={{color:T.saffron}}>•</span>AI
              </div>
              <div style={{ fontSize:9,color:T.inkFaint,marginTop:2,letterSpacing:"1px",textTransform:"uppercase" }}>Kirana POS</div>
            </div>
          </div>
          {loggedIn && (
            <div style={{ marginTop:10,display:"inline-flex",alignItems:"center",gap:4,
              background:`${planColor}18`,color:planColor,
              fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:20,letterSpacing:"0.5px",
              border:`1px solid ${planColor}40` }}>
              ★ {planLabel?.name || "Free"} Plan
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div style={{ fontSize:9,fontWeight:700,color:T.inkFaint,
            letterSpacing:"2px",padding:"8px 16px 4px",textTransform:"uppercase" }}>Menu</div>

          {NAV.map(nav => {
            const active  = isActive(nav)
            const isOpen  = expanded === nav.label
            const hasSub  = nav.sub && nav.sub.length > 0
            return (
              <div key={nav.label}>
                <div onClick={() => {
                    if (hasSub) setExpanded(isOpen ? null : nav.label)
                    else navigate(nav.to)
                  }}
                  style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 16px",
                    cursor:"pointer",userSelect:"none",transition:"all 0.15s",
                    borderLeft:`3px solid ${active ? T.saffron : "transparent"}`,
                    background: active ? `${T.saffron}12` : "transparent",
                    color: active ? T.ink : T.inkDim }}
                  onMouseEnter={e=>{ if(!active) e.currentTarget.style.background=`rgba(244,228,193,0.04)` }}
                  onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent" }}>
                  <span style={{ width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                    color: active ? T.saffron : T.inkFaint }}>{nav.icon}</span>
                  <span style={{ flex:1,fontSize:13,fontWeight: active ? 600 : 400 }}>{nav.label}</span>
                  {hasSub && (
                    <svg width="10" height="10" fill="none" stroke={T.inkFaint} strokeWidth="2" viewBox="0 0 24 24"
                      style={{ transform: isOpen ? "rotate(90deg)" : "none", transition:"0.2s" }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  )}
                </div>

                {hasSub && isOpen && (
                  <div style={{ background:`rgba(244,228,193,0.02)` }}>
                    {nav.sub.map(s => {
                      const on = location.pathname === s.to || (s.to !== "/" && location.pathname.startsWith(s.to))
                      return (
                        <div key={s.to} onClick={() => navigate(s.to)}
                          style={{ display:"flex",alignItems:"center",gap:8,
                            padding:"8px 16px 8px 42px",cursor:"pointer",fontSize:12,
                            color: on ? T.saffron : T.inkDim,
                            fontWeight: on ? 600 : 400,
                            background: on ? `${T.saffron}10` : "transparent",
                            borderLeft: on ? `3px solid ${T.saffron}` : "3px solid transparent",
                            transition:"all 0.1s" }}
                          onMouseEnter={e=>{ if(!on) e.currentTarget.style.color=T.ink }}
                          onMouseLeave={e=>{ if(!on) e.currentTarget.style.color=T.inkDim }}>
                          <div style={{ width:4,height:4,borderRadius:"50%",
                            background: on ? T.saffron : T.inkFaint,flexShrink:0 }}/>
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

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ fontSize:11,fontWeight:600,color:T.ink,marginBottom:2 }}>
            {vendor?.store_name || "DukaanAI"}
          </div>
          <div style={{ fontSize:10,color: cloud ? T.jadeLite : T.inkFaint }}>
            {cloud ? "● Cloud sync ON" : loggedIn ? "● Free plan" : "● Local only"}
          </div>
          <div style={{ marginTop:8 }}>
            {/* Theme toggle */}
          <button onClick={toggleTheme}
            style={{ display:"flex",alignItems:"center",gap:8,
              background:"transparent",border:`1px solid ${T.rule}`,
              borderRadius:8,padding:"6px 10px",cursor:"pointer",
              color:T.inkDim,fontSize:10,fontWeight:600,marginBottom:8,width:"100%" }}>
            <span style={{ fontSize:14 }}>{isDark ? "☀️" : "🌙"}</span>
            {isDark ? "Light mode" : "Dark mode"}
          </button>
          {!loggedIn
              ? <button onClick={()=>setShowAuth(true)} className="btn btn-primary btn-sm">Login / Register</button>
              : <button onClick={logout}
                  style={{ background:"none",color:T.inkFaint,border:"none",fontSize:10,cursor:"pointer",padding:0 }}>
                  Logout
                </button>
            }
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────── */}
      <main className="app-main">
        {/* Mobile header */}
        <div className="mobile-header">
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <div style={{ width:28,height:28,borderRadius:8,flexShrink:0,
              background:`linear-gradient(135deg,${T.brass},${T.saffron})`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"'Tiro Devanagari Hindi',serif",fontWeight:700,fontSize:14,color:"#1a0c04" }}>द</div>
            <span style={{ fontFamily:"'Tiro Devanagari Hindi',serif",fontSize:16,
              color:T.ink }}>दुकान<span style={{color:T.saffron}}>•</span>AI</span>
            <span style={{ fontSize:9,color: cloud ? T.jadeLite : T.inkFaint }}>
              {cloud ? "● Cloud" : "● Local"}
            </span>
          </div>
          <div style={{ display:"flex",gap:6,alignItems:"center" }}>
            <button onClick={toggleTheme}
              style={{ background:"transparent",border:`1px solid ${T.rule}`,
                borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:14 }}>
              {isDark ? "☀️" : "🌙"}
            </button>
            {!loggedIn
              ? <button onClick={()=>setShowAuth(true)} className="btn btn-primary btn-sm">Login</button>
              : <button onClick={logout}
                  style={{ background:`rgba(244,228,193,0.08)`,color:T.inkDim,border:`1px solid ${T.rule}`,
                    borderRadius:8,padding:"4px 10px",fontSize:10,cursor:"pointer" }}>Logout</button>
            }
          </div>
        </div>

        {children}
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────── */}
      <nav className="mobile-bottom-nav" style={{
        position:"fixed",bottom:0,left:0,right:0,zIndex:100,
        background:T.bg1,borderTop:`1px solid ${T.rule}`,
        display:"none",alignItems:"flex-end",justifyContent:"space-around",
        padding:"8px 4px 12px",
        boxShadow:`0 -4px 20px rgba(0,0,0,0.4)` }}>
        {MOB_TABS.map(tab => {
          if (tab.voice) return (
            <div key="voice" onClick={()=>navigate("/voice")}
              style={{ position:"relative",marginTop:-20,width:54,height:54,
                borderRadius:"50%",
                background:`linear-gradient(135deg,${T.saffron},${T.saffronHot})`,
                boxShadow:`0 0 0 4px ${T.bg1},0 8px 20px ${T.saffron}55`,
                display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a0c04" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </div>
          )
          const on = location.pathname.startsWith(tab.to)
          return (
            <button key={tab.to} onClick={()=>navigate(tab.to)}
              style={{ background:"transparent",border:"none",cursor:"pointer",
                display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                color: on ? T.saffron : T.inkFaint,padding:"4px 8px",
                borderTop: on ? `2px solid ${T.saffron}` : "2px solid transparent" }}>
              <div style={{width:22,height:22}}>{tab.icon}</div>
              <span style={{fontSize:9,fontWeight:on?700:500,letterSpacing:"0.3px"}}>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* ── Floating mic (desktop) ─────────────────────────── */}
      <button onClick={()=>navigate("/voice")} title="Voice Entry"
        style={{ position:"fixed",bottom:24,right:24,zIndex:50,
          width:52,height:52,borderRadius:"50%",
          background:`linear-gradient(135deg,${T.saffron},${T.saffronHot})`,
          border:`3px solid ${T.bg0}`,
          boxShadow:`0 6px 24px rgba(232,119,34,0.45)`,
          display:"flex",alignItems:"center",justifyContent:"center",
          cursor:"pointer",transition:"transform 0.2s,box-shadow 0.2s" }}
        onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.1)";e.currentTarget.style.boxShadow=`0 8px 32px rgba(232,119,34,0.6)`}}
        onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow=`0 6px 24px rgba(232,119,34,0.45)`}}>
        <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
          <path d="M19 10v2a7 7 0 01-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>
    </div>
  )
}
