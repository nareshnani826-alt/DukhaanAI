import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useState, useEffect } from "react"
import AuthModal from "./AuthModal"
import { isCloud, api } from "../sync/db"
import { usePlan } from "../context/PlanContext"

function useDayPrompt(loggedIn) {
  const [show, setShow] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!loggedIn) return
    const today = new Date().toISOString().slice(0, 10)
    if (localStorage.getItem("dk_day_prompt_date") === today) return
    async function check() {
      try {
        let sess = null
        if (isCloud()) sess = await api.get("/day-sessions/today").catch(() => null)
        else {
          const raw = localStorage.getItem("dk_day_session")
          if (raw) { const s = JSON.parse(raw); if (s.date === today) sess = s }
        }
        if (!sess) { setTimeout(() => setShow(true), 2000); localStorage.setItem("dk_day_prompt_date", today) }
      } catch {}
    }
    check()
  }, [loggedIn])

  return { show, dismiss: () => setShow(false), navigate }
}

function DayPromptBanner({ loggedIn }) {
  const { show, dismiss, navigate } = useDayPrompt(loggedIn)
  if (!show) return null
  return (
    <div style={{
      position:"fixed", bottom:70, left:"50%", transform:"translateX(-50%)",
      background:"#1D9E75", color:"#fff", borderRadius:12,
      padding:"12px 16px", zIndex:200, display:"flex",
      alignItems:"center", gap:10, boxShadow:"0 4px 20px rgba(0,0,0,0.2)",
      maxWidth:340, width:"90vw", fontSize:13,
    }}>
      <span style={{ fontSize:18 }}>🏪</span>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:600, fontSize:12 }}>Open today's day?</div>
        <div style={{ opacity:0.85, fontSize:11 }}>Track stock, sales and profit</div>
      </div>
      <button onClick={() => { dismiss(); navigate("/day") }}
        style={{ background:"#fff", color:"#1D9E75", border:"none",
          borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>
        Open
      </button>
      <button onClick={dismiss}
        style={{ background:"rgba(255,255,255,0.2)", color:"#fff",
          border:"none", borderRadius:8, padding:"5px 8px", fontSize:11, cursor:"pointer" }}>
        ✕
      </button>
    </div>
  )
}

const NAV = [
  { to:"/",          label:"Dashboard",  icon:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { to:"/inventory", label:"Inventory",  icon:"M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" },
  { to:"/billing",   label:"GST Billing",icon:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8" },
  { to:"/day",       label:"Day Ops",    icon:"M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { to:"/customers", label:"Customers",  icon:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75" },
  { to:"/voice",     label:"Voice",      icon:"M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z M19 10v2a7 7 0 01-14 0v-2 M12 19v4 M8 23h8" },
  { to:"/agent",     label:"AI Agent",   icon:"M12 2a10 10 0 100 20A10 10 0 0012 2z M12 6v6l4 2" },
  { to:"/insights",  label:"Insights",   icon:"M18 20V10 M12 20V4 M6 20v-6" },
  { to:"/settings",  label:"Settings",   icon:"M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" },
]

export default function Layout({ children }) {
  const { vendor, loggedIn, cloud, logout } = useAuth()
  const { plan, planLabel } = usePlan()
  const [showAuth, setShowAuth] = useState(false)

  return (
    <div className="app-shell">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <DayPromptBanner loggedIn={loggedIn} />

      <aside className="app-sidebar bg-white border-r border-gray-100">
        {/* Logo — hidden on mobile */}
        <div className="sidebar-logo px-4 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-1.5 text-primary font-semibold text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            DukaanAI
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Inventory & Billing</div>
        </div>

        <nav className="mt-1 flex-1 overflow-y-auto overflow-x-hidden">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 text-xs border-l-2 transition-colors ${
                  isActive
                    ? "text-primary bg-primary-light border-primary font-medium"
                    : "text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-50"
                }`
              }>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {n.icon.split(" M").map((d, i) => <path key={i} d={(i===0?"":"M")+d} />)}
              </svg>
              <span className="flex-1">{n.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer — hidden on mobile */}
        <div className="sidebar-footer px-4 py-3 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-700 truncate">{vendor?.store_name || "DukaanAI"}</div>
          <div className="text-[10px] mt-1">
            {cloud
              ? <span className="text-primary">● Cloud sync ON</span>
              : loggedIn
                ? <span className="text-amber-600">● Free plan</span>
                : <span className="text-gray-400">● Local only</span>}
          </div>
          {loggedIn && (
            <div className="text-[10px] mt-0.5 font-medium"
              style={{ color: planLabel?.color || "#888" }}>
              {planLabel?.name} plan
            </div>
          )}
          <div className="mt-2">
            {!loggedIn
              ? <button onClick={() => setShowAuth(true)} className="text-[10px] text-primary underline">Login / Register</button>
              : <button onClick={logout} className="text-[10px] text-gray-400 underline">Logout</button>}
          </div>
        </div>
      </aside>

      <main className="app-main">
        {/* Mobile header — shows store name + login on mobile */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span className="text-sm font-semibold text-primary">DukaanAI</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] ${cloud ? "text-primary" : "text-gray-400"}`}>
              {cloud ? "● Cloud" : "● Local"}
            </span>
            {!loggedIn
              ? <button onClick={() => setShowAuth(true)} className="btn btn-primary btn-sm">Login</button>
              : <button onClick={logout} className="text-[10px] text-gray-400 underline">Logout</button>}
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
