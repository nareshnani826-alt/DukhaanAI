import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { usePlan } from "../context/PlanContext"
import { useState, useEffect } from "react"
import AuthModal from "./AuthModal"
import { isCloud, api } from "../sync/db"

function useDayPrompt(loggedIn) {
  const [show, setShow] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    if (!loggedIn) return
    const today = new Date().toISOString().slice(0,10)
    if (localStorage.getItem("dk_day_prompt_date") === today) return
    async function check() {
      try {
        let sess = null
        if (isCloud()) sess = await api.get("/day-sessions/today").catch(()=>null)
        else {
          const raw = localStorage.getItem("dk_day_session")
          if (raw) { const s=JSON.parse(raw); if(s.date===today) sess=s }
        }
        if (!sess) { setTimeout(()=>setShow(true),2500); localStorage.setItem("dk_day_prompt_date",today) }
      } catch {}
    }
    check()
  },[loggedIn])
  return { show, dismiss:()=>setShow(false), navigate }
}

function DayPromptBanner({ loggedIn }) {
  const { show, dismiss, navigate } = useDayPrompt(loggedIn)
  if (!show) return null
  return (
    <div style={{
      position:"fixed", bottom:70, left:"50%", transform:"translateX(-50%)",
      background:"#0F6E56", color:"#fff", borderRadius:14,
      padding:"12px 16px", zIndex:200, display:"flex",
      alignItems:"center", gap:10, boxShadow:"0 8px 32px rgba(15,110,86,0.35)",
      maxWidth:340, width:"90vw",
    }}>
      <span style={{ fontSize:20 }}>🏪</span>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:600, fontSize:12 }}>Open today's day?</div>
        <div style={{ opacity:0.8, fontSize:11 }}>Track stock, sales and profit</div>
      </div>
      <button onClick={()=>{ dismiss(); navigate("/day") }}
        style={{ background:"#5DCAA5", color:"#085041", border:"none",
          borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>
        Open
      </button>
      <button onClick={dismiss}
        style={{ background:"rgba(255,255,255,0.15)", color:"#fff",
          border:"none", borderRadius:8, padding:"5px 8px", fontSize:11, cursor:"pointer" }}>
        ✕
      </button>
    </div>
  )
}

const NAV = [
  { to:"/",          label:"Dashboard",  icon:<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/> },
  { to:"/inventory", label:"Inventory",  icon:<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/> },
  { to:"/billing",   label:"Billing",    icon:<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></> },
  { to:"/day",       label:"Day Ops",    icon:<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
  { to:"/customers", label:"Customers",  icon:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></> },
  { to:"/voice",     label:"Voice",      icon:<><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>, badge:"NEW" },
  { to:"/agent",     label:"AI Agent",   icon:<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></> },
  { to:"/insights",  label:"Insights",   icon:<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></> },
  { to:"/help",      label:"Help",       icon:<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></> },
  { to:"/settings",  label:"Settings",   icon:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></> },
]

export default function Layout({ children }) {
  const { vendor, loggedIn, cloud, logout } = useAuth()
  const { plan, planLabel } = usePlan()
  const [showAuth, setShowAuth] = useState(false)

  const planColors = { free:"#888780", pro:"#5DCAA5", wholesale:"#AFA9EC" }
  const planColor  = planColors[plan] || "#888"

  return (
    <div className="app-shell">
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} />}
      <DayPromptBanner loggedIn={loggedIn} />

      <aside className="app-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display:"flex", alignItems:"center", gap:8, color:"#fff", fontWeight:600, fontSize:14 }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            DukaanAI
          </div>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, marginTop:2 }}>
            Inventory & Billing
          </div>
          {loggedIn && (
            <div style={{
              display:"inline-block", marginTop:6,
              background:"rgba(255,255,255,0.12)", color:planColor,
              fontSize:9, padding:"2px 8px", borderRadius:10, fontWeight:600,
            }}>
              {planLabel?.name || "Free"} Plan
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to==="/"}
              className={({isActive})=>"nav-link"+(isActive?" active":"")}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {n.icon}
              </svg>
              <span style={{ flex:1 }}>{n.label}</span>
              {n.badge && (
                <span style={{ background:"#5DCAA5", color:"#085041",
                  fontSize:8, padding:"1px 5px", borderRadius:8, fontWeight:700 }}>
                  {n.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ color:"#fff", fontSize:11, fontWeight:500, marginBottom:2 }}>
            {vendor?.store_name || "DukaanAI"}
          </div>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:9 }}>
            {cloud ? "● Cloud sync ON" : loggedIn ? "● Free plan" : "● Local only"}
          </div>
          <div style={{ marginTop:8 }}>
            {!loggedIn
              ? <button onClick={()=>setShowAuth(true)}
                  style={{ background:"rgba(255,255,255,0.12)", color:"#fff", border:"none",
                    borderRadius:6, padding:"4px 10px", fontSize:10, cursor:"pointer", width:"100%" }}>
                  Login / Register
                </button>
              : <button onClick={logout}
                  style={{ background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.5)",
                    border:"none", borderRadius:6, padding:"4px 10px", fontSize:10, cursor:"pointer" }}>
                  Logout
                </button>
            }
          </div>
        </div>
      </aside>

      <main className="app-main">
        {/* Mobile top bar */}
        <div style={{ display:"none" }} className="mobile-header">
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <svg width="18" height="18" fill="none" stroke="#1D9E75" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            <span style={{ fontWeight:600, color:"#1D9E75", fontSize:14 }}>DukaanAI</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:10, color:cloud?"#1D9E75":"#aaa" }}>
              {cloud?"● Cloud":"● Local"}
            </span>
            {!loggedIn
              ? <button onClick={()=>setShowAuth(true)} className="btn btn-primary btn-sm">Login</button>
              : <button onClick={logout} style={{ fontSize:10, color:"#aaa", background:"none", border:"none", cursor:"pointer" }}>Logout</button>
            }
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
