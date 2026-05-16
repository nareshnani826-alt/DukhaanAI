import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useState, useEffect } from "react"
import AuthModal from "./AuthModal"
import { isCloud, api } from "../sync/db"

function useDayPrompt(loggedIn) {
  const [show, setShow] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!loggedIn) return
    const today = new Date().toISOString().slice(0, 10)
    const lastPrompt = localStorage.getItem("dk_day_prompt_date")
    if (lastPrompt === today) return  // already prompted today

    // Check if day is open
    async function check() {
      try {
        let sess = null
        if (isCloud()) {
          sess = await api.get("/day-sessions/today").catch(() => null)
        } else {
          const raw = localStorage.getItem("dk_day_session")
          if (raw) {
            const s = JSON.parse(raw)
            if (s.date === today) sess = s
          }
        }
        if (!sess) {
          setTimeout(() => setShow(true), 2000)
          localStorage.setItem("dk_day_prompt_date", today)
        }
      } catch {}
    }
    check()
  }, [loggedIn])

  return { show, dismiss: () => setShow(false), navigate }
}

const NAV = [
  { to:"/",          label:"Dashboard",  icon:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { to:"/inventory", label:"Inventory",  icon:"M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" },
  { to:"/billing",   label:"GST Billing",icon:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8" },
  { to:"/day",       label:"Day Ops",    icon:"M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", badge:"" },
  { to:"/customers", label:"Customers",  icon:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75" },
  { to:"/voice",     label:"Voice Agent",icon:"M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z M19 10v2a7 7 0 01-14 0v-2 M12 19v4 M8 23h8", badge:"NEW" },
  { to:"/agent",     label:"AI Agent",   icon:"M12 2a10 10 0 100 20A10 10 0 0012 2z M12 6v6l4 2" },
  { to:"/insights",  label:"Insights",   icon:"M18 20V10 M12 20V4 M6 20v-6" },
]

function DayPromptBanner({ loggedIn }) {
  const { show, dismiss, navigate } = useDayPrompt(loggedIn)
  if (!show) return null
  return (
    <div style={{
      position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)",
      background:"#1D9E75", color:"#fff", borderRadius:12,
      padding:"14px 20px", zIndex:300, display:"flex",
      alignItems:"center", gap:12, boxShadow:"0 4px 20px rgba(0,0,0,0.2)",
      maxWidth:400, width:"90vw",
    }}>
      <span style={{ fontSize:20 }}>🏪</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600 }}>Open today's day?</div>
        <div style={{ fontSize:11, opacity:0.85, marginTop:2 }}>
          Track stock, sales and profit for today
        </div>
      </div>
      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
        <button onClick={() => { dismiss(); navigate("/day") }}
          style={{ background:"#fff", color:"#1D9E75", border:"none",
            borderRadius:8, padding:"6px 14px", fontSize:12,
            fontWeight:600, cursor:"pointer" }}>
          Open Day
        </button>
        <button onClick={dismiss}
          style={{ background:"rgba(255,255,255,0.2)", color:"#fff",
            border:"none", borderRadius:8, padding:"6px 10px",
            fontSize:12, cursor:"pointer" }}>
          Later
        </button>
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  const { vendor, loggedIn, cloud, logout } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  return (
    <div className="flex h-screen">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <DayPromptBanner loggedIn={loggedIn} />
      <aside className="w-48 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="px-4 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-1.5 text-primary font-semibold text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            DukaanAI
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Inventory & Billing Agent</div>
        </div>

        <nav className="mt-1 flex-1 overflow-y-auto">
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
                {n.icon.split(" M").map((d, i) => <path key={i} d={(i === 0 ? "" : " M") + d} />)}
              </svg>
              <span className="flex-1">{n.label}</span>
              {n.badge && (
                <span className="text-[9px] bg-primary text-white px-1 py-0.5 rounded font-medium">
                  {n.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <div className="text-xs font-medium text-gray-700 truncate">
            {vendor?.store_name || "DukaanAI"}
          </div>
          <div className="text-[10px] mt-1">
            {cloud
              ? <span className="text-primary">● Cloud sync ON</span>
              : loggedIn
                ? <span className="text-amber-600">● Free plan</span>
                : <span className="text-gray-400">● Local only</span>
            }
          </div>
          <div className="mt-2">
            {!loggedIn
              ? <button onClick={() => setShowAuth(true)} className="text-[10px] text-primary underline">
                  Login / Register
                </button>
              : <button onClick={logout} className="text-[10px] text-gray-400 underline">
                  Logout
                </button>
            }
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  )
}
