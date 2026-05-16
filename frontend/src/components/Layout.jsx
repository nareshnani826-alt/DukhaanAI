import { NavLink } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useState } from "react"
import AuthModal from "./AuthModal"

const NAV = [
  { to:"/",         label:"Dashboard",  icon:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { to:"/inventory",label:"Inventory",  icon:"M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" },
  { to:"/billing",  label:"GST Billing",icon:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8" },
  { to:"/agent",    label:"AI Agent",   icon:"M12 2a10 10 0 100 20A10 10 0 0012 2z M12 6v6l4 2" },
  { to:"/insights", label:"Insights",   icon:"M18 20V10 M12 20V4 M6 20v-6" },
]

export default function Layout({ children }) {
  const { vendor, loggedIn, cloud, logout } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  return (
    <div className="flex h-screen">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Sidebar */}
      <aside className="w-48 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="px-4 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-1.5 text-primary font-semibold text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            DukaanAI
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Inventory & Billing Agent</div>
        </div>

        <nav className="mt-1 flex-1">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to==="/"}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 text-xs border-l-2 transition-colors ${
                  isActive ? "text-primary bg-primary-light border-primary font-medium" : "text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-50"
                }`
              }>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {n.icon.split(" M").map((d,i) => <path key={i} d={(i===0?"":" M")+d} />)}
              </svg>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-700 truncate">{vendor?.store_name || "DukaanAI"}</div>
          <div className="text-[10px] mt-1">
            {cloud
              ? <span className="text-primary">● Cloud sync ON</span>
              : loggedIn
                ? <span className="text-amber-600">● Free plan — local</span>
                : <span className="text-gray-400">● Local only</span>
            }
          </div>
          <div className="mt-2 flex items-center gap-2">
            {!loggedIn
              ? <button onClick={() => setShowAuth(true)} className="text-[10px] text-primary underline">Login / Register</button>
              : <button onClick={logout} className="text-[10px] text-gray-400 underline">Logout</button>
            }
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  )
}
