import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { usePlan } from "../context/PlanContext"
import { useState } from "react"
import AuthModal from "./AuthModal"

const NAV = [
  {
    label:"Home", to:"/", exact:true,
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    sub: null,
  },
  {
    label:"Sales", to:"/billing", exact:false,
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    sub:[
      { to:"/billing",   label:"GST Billing" },
      { to:"/udhar",     label:"Udhar Khata" },
      { to:"/customers", label:"Customers" },
    ],
  },
  {
    label:"Stock", to:"/inventory", exact:false,
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    sub:[
      { to:"/inventory", label:"Inventory" },
      { to:"/wastage",   label:"Wastage" },
      { to:"/demand",    label:"Demand Intel" },
    ],
  },
  {
    label:"Assistant", to:"/voice", exact:false,
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    sub:[
      { to:"/voice", label:"Voice Agent" },
      { to:"/agent", label:"AI Agent" },
    ],
  },
  {
    label:"More", to:"/day", exact:false,
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    sub:[
      { to:"/day",      label:"Day Ops" },
      { to:"/insights", label:"Insights" },
      { to:"/help",     label:"Help" },
      { to:"/settings", label:"Settings" },
      { to:"/install",  label:"Install App" },
    ],
  },
]

export default function Layout({ children }) {
  const { vendor, loggedIn, cloud, logout } = useAuth()
  const { plan, planLabel } = usePlan()
  const [showAuth,  setShowAuth]  = useState(false)
  const [expanded,  setExpanded]  = useState("Sales") // default open
  const navigate = useNavigate()
  const location = useLocation()

  function isActive(nav) {
    if (nav.sub) return nav.sub.some(s => location.pathname.startsWith(s.to))
    return location.pathname.startsWith(nav.to)
  }

  const planColors = { free:"#94a3b8", pro:"#1D9E75", wholesale:"#7F77DD" }
  const planColor  = planColors[plan] || "#94a3b8"

  return (
    <div className="app-shell">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="app-sidebar" style={{ background:"#fff", borderRight:"1px solid #e8f0e8" }}>

        {/* Logo */}
        <div style={{ padding:"18px 16px 14px", borderBottom:"1px solid #f0f7f0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:36, height:36, borderRadius:10, flexShrink:0,
              background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:"#0F6E56", lineHeight:1 }}>DukaanAI</div>
              <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>Inventory & Billing</div>
            </div>
          </div>
          {loggedIn && (
            <div style={{
              marginTop:10, display:"inline-flex", alignItems:"center", gap:4,
              background:"#E1F5EE", color:planColor,
              fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:20,
            }}>
              ★ {planLabel?.name || "Free"} Plan
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, overflowY:"auto", overflowX:"hidden", padding:"8px 0" }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#94a3b8", letterSpacing:"1px",
            padding:"8px 16px 4px", textTransform:"uppercase" }}>
            Menu
          </div>

          {NAV.map(nav => {
            const active   = isActive(nav)
            const isOpen   = expanded === nav.label
            const hasSub   = nav.sub && nav.sub.length > 0

            return (
              <div key={nav.label}>
                {/* Main nav item */}
                <div
                  onClick={() => {
                    if (hasSub) {
                      setExpanded(isOpen ? null : nav.label)
                    } else {
                      navigate(nav.to)
                    }
                  }}
                  style={{
                    display:"flex", alignItems:"center", gap:10,
                    padding:"10px 16px", cursor:"pointer",
                    borderLeft:`3px solid ${active ? "#1D9E75" : "transparent"}`,
                    background: active ? "#f0faf6" : "transparent",
                    color: active ? "#0F6E56" : "#555",
                    fontWeight: active ? 600 : 400,
                    fontSize:13, transition:"all 0.15s",
                    userSelect:"none",
                  }}
                  onMouseEnter={e => { if(!active) e.currentTarget.style.background="#f8fffe" }}
                  onMouseLeave={e => { if(!active) e.currentTarget.style.background="transparent" }}
                >
                  <span style={{ width:16, height:16, display:"flex", alignItems:"center",
                    justifyContent:"center", flexShrink:0, color: active ? "#0F6E56" : "#777" }}>
                    {nav.icon}
                  </span>
                  <span style={{ flex:1, color: active ? "#0F6E56" : "#444" }}>{nav.label}</span>
                  {hasSub && (
                    <svg width="12" height="12" fill="none" stroke="#aaa" strokeWidth="2"
                      strokeLinecap="round" viewBox="0 0 24 24"
                      style={{ transform: isOpen ? "rotate(90deg)" : "none", transition:"0.2s" }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  )}
                </div>

                {/* Sub items */}
                {hasSub && isOpen && (
                  <div style={{ background:"#f8fffe", paddingBottom:4 }}>
                    {nav.sub.map(s => {
                      const subActive = location.pathname === s.to ||
                        (s.to !== "/" && location.pathname.startsWith(s.to))
                      return (
                        <div key={s.to}
                          onClick={() => navigate(s.to)}
                          style={{
                            display:"flex", alignItems:"center", gap:8,
                            padding:"8px 16px 8px 40px", cursor:"pointer", fontSize:12,
                            color: subActive ? "#0F6E56" : "#666",
                            fontWeight: subActive ? 600 : 400,
                            background: subActive ? "#E1F5EE" : "transparent",
                            borderLeft: subActive ? "3px solid #1D9E75" : "3px solid transparent",
                            transition:"all 0.1s",
                          }}
                          onMouseEnter={e => { if(!subActive) e.currentTarget.style.color="#0F6E56" }}
                          onMouseLeave={e => { if(!subActive) e.currentTarget.style.color="#666" }}
                        >
                          <div style={{ width:5, height:5, borderRadius:"50%",
                            background: subActive ? "#1D9E75" : "#ccc", flexShrink:0 }}/>
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
        <div style={{ padding:"12px 16px", borderTop:"1px solid #f0f7f0", flexShrink:0 }}>
          <div style={{ fontSize:11, fontWeight:600, color:"#333", marginBottom:2 }}>
            {vendor?.store_name || "DukaanAI"}
          </div>
          <div style={{ fontSize:10, color: cloud ? "#1D9E75" : "#94a3b8" }}>
            {cloud ? "● Cloud sync ON" : loggedIn ? "● Free plan" : "● Local only"}
          </div>
          <div style={{ marginTop:8 }}>
            {!loggedIn
              ? <button onClick={() => setShowAuth(true)} style={{
                    background:"#1D9E75", color:"#fff", border:"none",
                    borderRadius:8, padding:"5px 12px", fontSize:10,
                    fontWeight:600, cursor:"pointer",
                  }}>
                  Login / Register
                </button>
              : <button onClick={logout} style={{
                    background:"none", color:"#94a3b8", border:"none",
                    fontSize:10, cursor:"pointer", padding:0,
                  }}>
                  Logout
                </button>
            }
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────── */}
      <main className="app-main">
        {/* Mobile header */}
        <div className="mobile-header">
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
              background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <span style={{ fontWeight:700, color:"#0F6E56", fontSize:14 }}>DukaanAI</span>
            <span style={{ fontSize:9, color: cloud?"#1D9E75":"#aaa" }}>
              {cloud ? "● Cloud" : "● Local"}
            </span>
          </div>
          <div>
            {!loggedIn
              ? <button onClick={() => setShowAuth(true)} style={{
                    background:"#1D9E75", color:"#fff", border:"none",
                    borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer",
                  }}>Login</button>
              : <button onClick={logout} style={{
                    background:"#f5f5f5", color:"#666", border:"none",
                    borderRadius:8, padding:"5px 10px", fontSize:10, cursor:"pointer",
                  }}>Logout</button>
            }
          </div>
        </div>

        {children}
      </main>

      {/* ── Mobile bottom nav ──────────────────────────────── */}
      <nav style={{
        display:"none", position:"fixed", bottom:0, left:0, right:0,
        height:60, background:"#fff", borderTop:"1px solid #f0f0f0",
        zIndex:100, boxShadow:"0 -4px 20px rgba(0,0,0,0.08)",
      }} className="mobile-bottom-nav">
        {NAV.map(nav => {
          const active = isActive(nav)
          return (
            <div key={nav.label}
              onClick={() => navigate(nav.to)}
              style={{
                flex:1, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                gap:3, cursor:"pointer", padding:"6px 4px",
                borderTop: active ? "2px solid #1D9E75" : "2px solid transparent",
                background: active ? "#f0faf6" : "transparent",
              }}>
              <span style={{
                width:22, height:22, display:"flex",
                alignItems:"center", justifyContent:"center",
                color: active ? "#0F6E56" : "#94a3b8",
              }}>
                {nav.icon}
              </span>
              <span style={{
                fontSize:9, fontWeight: active ? 700 : 500,
                color: active ? "#0F6E56" : "#94a3b8",
                letterSpacing:"-0.2px",
              }}>
                {nav.label}
              </span>
            </div>
          )
        })}
      </nav>

      {/* ── Floating mic ─────────────────────────────────── */}
      <button onClick={() => navigate("/voice")} title="Voice Entry"
        style={{
          position:"fixed", bottom:24, right:24, zIndex:50,
          width:54, height:54, borderRadius:"50%",
          background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
          border:"3px solid #fff",
          boxShadow:"0 6px 24px rgba(15,110,86,0.45)",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", transition:"transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform="scale(1.1)"; e.currentTarget.style.boxShadow="0 8px 32px rgba(15,110,86,0.6)" }}
        onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(15,110,86,0.45)" }}>
        <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2.5"
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
