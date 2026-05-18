import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { usePlan } from "../context/PlanContext"
import { useState } from "react"
import AuthModal from "./AuthModal"

// ── 5 main nav groups ─────────────────────────────────────
const NAV = [
  {
    to: "/",
    label: "Home",
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    matches: ["/"],
  },
  {
    to: "/billing",
    label: "Sales",
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    matches: ["/billing", "/udhar", "/customers"],
    badge: null,
  },
  {
    to: "/inventory",
    label: "Stock",
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      </svg>
    ),
    matches: ["/inventory", "/wastage", "/demand"],
  },
  {
    to: "/voice",
    label: "Assistant",
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
        <path d="M19 10v2a7 7 0 01-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    ),
    matches: ["/voice", "/agent"],
  },
  {
    to: "/day",
    label: "More",
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    ),
    matches: ["/day", "/insights", "/help", "/settings", "/install"],
  },
]

// More menu sub-items
const MORE_ITEMS = [
  { to:"/day",      label:"Day Ops",    icon:"📅" },
  { to:"/insights", label:"Insights",   icon:"📈" },
  { to:"/help",     label:"Help",       icon:"❓" },
  { to:"/settings", label:"Settings",   icon:"⚙️" },
  { to:"/install",  label:"Install App",icon:"📲" },
]

// Sales sub-items
const SALES_ITEMS = [
  { to:"/billing",   label:"GST Billing",   icon:"🧾" },
  { to:"/udhar",     label:"Udhar Khata",   icon:"📒" },
  { to:"/customers", label:"Customers",     icon:"👥" },
]

// Stock sub-items
const STOCK_ITEMS = [
  { to:"/inventory", label:"Inventory",      icon:"📦" },
  { to:"/wastage",   label:"Wastage",        icon:"🗑️" },
  { to:"/demand",    label:"Demand Intel",   icon:"🧠" },
]

// Assistant sub-items
const ASSISTANT_ITEMS = [
  { to:"/voice",  label:"Voice Agent",  icon:"🎤" },
  { to:"/agent",  label:"AI Agent",     icon:"🤖" },
]

function SubMenu({ items, onClose }) {
  return (
    <div style={{
      position:"absolute", left:"100%", top:0,
      background:"#fff", borderRadius:12, padding:6,
      boxShadow:"0 8px 32px rgba(0,0,0,0.12)",
      minWidth:160, zIndex:200,
      border:"1px solid #f0f0f0",
    }}>
      {items.map(item => (
        <NavLink key={item.to} to={item.to} onClick={onClose}
          style={({ isActive }) => ({
            display:"flex", alignItems:"center", gap:10,
            padding:"9px 12px", borderRadius:8, textDecoration:"none",
            background: isActive ? "#E1F5EE" : "transparent",
            color: isActive ? "#0F6E56" : "#444",
            fontSize:12, fontWeight: isActive ? 600 : 400,
          })}>
          <span style={{ fontSize:16 }}>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}

export default function Layout({ children }) {
  const { vendor, loggedIn, cloud, logout } = useAuth()
  const { plan, planLabel } = usePlan()
  const [showAuth, setShowAuth] = useState(false)
  const [openSub, setOpenSub] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  const planColors = { free:"#888", pro:"#1D9E75", wholesale:"#7F77DD" }
  const planColor  = planColors[plan] || "#888"

  function isNavActive(nav) {
    if (nav.to === "/" && nav.matches?.includes("/")) {
      return location.pathname === "/"
    }
    return nav.matches?.some(m => location.pathname.startsWith(m) && m !== "/")
  }

  function getSubItems(label) {
    if (label === "Sales") return SALES_ITEMS
    if (label === "Stock") return STOCK_ITEMS
    if (label === "Assistant") return ASSISTANT_ITEMS
    if (label === "More") return MORE_ITEMS
    return null
  }

  function handleNavClick(nav, e) {
    const sub = getSubItems(nav.label)
    if (sub) {
      e.preventDefault()
      setOpenSub(openSub === nav.label ? null : nav.label)
    } else {
      setOpenSub(null)
    }
  }

  return (
    <div className="app-shell" onClick={() => setOpenSub(null)}>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Sidebar */}
      <aside className="app-sidebar" onClick={e => e.stopPropagation()}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            }}>
              <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:"#0F6E56" }}>DukaanAI</div>
              <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>Inventory & Billing</div>
            </div>
          </div>
          {loggedIn && (
            <div style={{
              marginTop:10, display:"inline-flex", alignItems:"center", gap:4,
              background:"#E1F5EE", color:planColor,
              fontSize:10, fontWeight:600, padding:"3px 8px", borderRadius:20,
            }}>
              ★ {planLabel?.name || "Free"} Plan
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div style={{ padding:"8px 0" }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#94a3b8", letterSpacing:"0.8px", padding:"6px 16px 4px", textTransform:"uppercase" }}>
              Menu
            </div>
            {NAV.map(nav => {
              const active  = isNavActive(nav)
              const hasSub  = !!getSubItems(nav.label)
              const subOpen = openSub === nav.label

              return (
                <div key={nav.label} style={{ position:"relative" }}>
                  <NavLink
                    to={nav.to}
                    end={nav.to === "/"}
                    onClick={e => handleNavClick(nav, e)}
                    style={{
                      display:"flex", alignItems:"center", gap:10,
                      padding:"10px 16px", textDecoration:"none",
                      borderLeft: `3px solid ${active ? "#1D9E75" : "transparent"}`,
                      background: active ? "#f0faf6" : "transparent",
                      color: active ? "#0F6E56" : "#555",
                      fontWeight: active ? 600 : 400,
                      fontSize:13, transition:"all 0.15s",
                    }}>
                    <span style={{ width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {nav.icon}
                    </span>
                    <span style={{ flex:1 }}>{nav.label}</span>
                    {hasSub && (
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                        style={{ transform: subOpen ? "rotate(90deg)" : "none", transition:"transform 0.2s" }}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    )}
                  </NavLink>

                  {/* Sub menu */}
                  {hasSub && subOpen && (
                    <SubMenu items={getSubItems(nav.label)} onClose={() => setOpenSub(null)} />
                  )}
                </div>
              )
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ fontSize:11, fontWeight:600, color:"#333", marginBottom:2 }}>
            {vendor?.store_name || "DukaanAI"}
          </div>
          <div style={{ fontSize:10, color: cloud ? "#1D9E75" : "#94a3b8" }}>
            {cloud ? "● Cloud sync ON" : loggedIn ? "● Free plan" : "● Local only"}
          </div>
          <div style={{ marginTop:8 }}>
            {!loggedIn
              ? <button onClick={() => setShowAuth(true)}
                  style={{ background:"#1D9E75", color:"#fff", border:"none",
                    borderRadius:8, padding:"5px 12px", fontSize:10, fontWeight:600, cursor:"pointer" }}>
                  Login / Register
                </button>
              : <button onClick={logout}
                  style={{ background:"none", color:"#94a3b8", border:"none",
                    fontSize:10, cursor:"pointer", padding:0 }}>
                  Logout
                </button>
            }
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="app-main">
        {/* Mobile header */}
        <div className="mobile-header">
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{
              width:28, height:28, borderRadius:8,
              background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <span style={{ fontWeight:700, color:"#0F6E56", fontSize:14 }}>DukaanAI</span>
            <span style={{ fontSize:9, color: cloud ? "#1D9E75" : "#aaa" }}>
              {cloud ? "● Cloud" : "● Local"}
            </span>
          </div>
          <div>
            {!loggedIn
              ? <button onClick={() => setShowAuth(true)}
                  style={{ background:"#1D9E75", color:"#fff", border:"none",
                    borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                  Login
                </button>
              : <button onClick={logout}
                  style={{ background:"#f5f5f5", color:"#666", border:"none",
                    borderRadius:8, padding:"5px 10px", fontSize:10, cursor:"pointer" }}>
                  Logout
                </button>
            }
          </div>
        </div>

        {children}
      </main>

      {/* Floating mic button */}
      <button
        onClick={() => navigate("/voice")}
        style={{
          position:"fixed", bottom:24, right:24, zIndex:50,
          width:56, height:56, borderRadius:"50%",
          background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
          border:"3px solid #fff",
          boxShadow:"0 6px 24px rgba(15,110,86,0.45)",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", transition:"transform 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.transform="scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
        title="Voice Entry">
        <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2.5"
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
