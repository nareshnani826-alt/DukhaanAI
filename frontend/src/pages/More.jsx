import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { usePlan } from "../context/PlanContext"
import { useTheme } from "../context/ThemeContext"
import { useAppMode, APP_MODES } from "../context/AppModeContext"
import { tr, uiLang } from "../i18n/kiranaStrings"

const L = k => tr(k, uiLang())

const SECTIONS = [
  {
    label: "Sales & money",
    items: [
      { label:"New bill",           to:"/billing",     icon:"🧾", desc:"Make a bill" },
      { label:"Past bills",         to:"/history",     icon:"📋", desc:"All bills you made" },
      { label:"Khata (udhaar)",     to:"/udhar",       icon:"📒", desc:"Who owes you money" },
      { label:"Customers",          to:"/customers",   icon:"👥", desc:"Regular customers" },
    ],
  },
  {
    label: "Stock",
    items: [
      { label:"Stock",              to:"/inventory",   icon:"📦", desc:"Items, prices, quantity" },
      { label:"Add many items",     to:"/bulk-import", icon:"📥", desc:"From an Excel / CSV file" },
      { label:"Damaged goods",      to:"/wastage",     icon:"🗑️", desc:"Broken or spoiled items" },
      { label:"Expiring soon",      to:"/expiry",      icon:"🕐", desc:"Sell these first" },
    ],
  },
  {
    label: "Reports & help",
    items: [
      { label:"Profit & reports",   to:"/insights",    icon:"📈", desc:"Profit, GST, trends" },
      { label:"Festival demand",    to:"/demand",      icon:"📊", desc:"What will sell more" },
      { label:"Speak a bill",       to:"/voice",       icon:"🎤", desc:"Bill by talking" },
      { label:"Ask AI",             chat:true,         icon:"💬", desc:"Ask about your shop" },
    ],
  },
  {
    label: "Shop",
    items: [
      { label:"Open / close day",   to:"/day",         icon:"☀️", desc:"Start and end the day" },
      { label:"Settings",           to:"/settings",    icon:"⚙️", desc:"Shop details, language" },
      { label:"Help",               to:"/help",        icon:"❓", desc:"How to use the app" },
    ],
  },
]

export default function More() {
  const navigate = useNavigate()
  const { vendor, cloud, logout, loggedIn, hasModule } = useAuth()
  const isBangleOnly = hasModule("bangle_fancy") && !hasModule("kirana")
  const { planLabel } = usePlan()
  const { isDark, toggleTheme } = useTheme()
  const { appMode, setAppMode, isScreenVisible, APP_MODES } = useAppMode()

  return (
    <div style={{ flex:1, overflowY:"auto", background:"var(--bg0)" }}>
      {/* Header */}
      <div style={{ background:"var(--bg0)", backdropFilter:"blur(6px)",
        borderBottom:"1px solid var(--rule)", padding:"14px 16px",
        position:"sticky", top:0, zIndex:10 }}>
        <div style={{ fontSize:20, fontWeight:800, color:"var(--ink)", letterSpacing:"-0.5px" }}>{L("More")}</div>
      </div>

      <div style={{ padding:"12px 14px 20px" }}>

        {/* Store card */}
        <div style={{ background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
          borderRadius:16, padding:"16px", marginBottom:18,
          display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
            background:"rgba(255,255,255,0.25)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"'Tiro Devanagari Hindi',serif", fontWeight:700, fontSize:22, color:"#fff" }}>
            {vendor?.store_name?.charAt(0) || "द"}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#fff",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {vendor?.store_name || L("Your Store")}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:3 }}>
              <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.9)",
                background:"rgba(255,255,255,0.2)", borderRadius:20, padding:"2px 9px" }}>
                ★ {L(planLabel?.name || "Free")} {L("Plan")}
              </span>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.8)" }}>
                {L(cloud ? "● Cloud sync" : "● Local only")}
              </span>
            </div>
          </div>
          <button onClick={toggleTheme}
            style={{ width:36, height:36, borderRadius:10, flexShrink:0,
              background:"rgba(255,255,255,0.2)", border:"none", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>

        {/* How many features to show */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:13, fontWeight:800, color:"var(--ink)", marginBottom:8 }}>{L("Show features")}</div>
          <div style={{ display:"flex", gap:6 }}>
            {Object.entries(APP_MODES).map(([key, m]) => {
              const active = appMode === key
              return (
                <button key={key} onClick={() => setAppMode(key)}
                  style={{ flex:1, padding:"10px 4px", borderRadius:12, cursor:"pointer",
                    border: active ? `2px solid ${m.color}` : "1.5px solid var(--rule)",
                    background: active ? `color-mix(in srgb, ${m.color} 10%, var(--bg2))` : "var(--bg2)",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                  <span style={{ fontSize:18 }}>{m.emoji}</span>
                  <span style={{ fontSize:13, fontWeight:800, color: active ? m.color : "var(--ink-dim)" }}>{L(m.label)}</span>
                </button>
              )
            })}
          </div>
          <div style={{ fontSize:12, color:"var(--ink-faint)", marginTop:6 }}>{L(APP_MODES[appMode]?.desc)}</div>
        </div>

        {/* Feature sections */}
        {SECTIONS.map(sec => {
          const visible = sec.items.filter(item => item.chat || isScreenVisible(item.to))
          if (visible.length === 0) return null
          return (
            <div key={sec.label} style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"var(--brass-deep)", marginBottom:10 }}>{L(sec.label)}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {visible.map(item => {
                  const effectiveTo = item.to === "/day" && isBangleOnly ? "/bangle-day" : item.to
                  return (
                  <button key={item.label}
                    onClick={() => item.chat ? window.dispatchEvent(new Event("dk:open-chat")) : navigate(effectiveTo)}
                    style={{ background:"var(--bg2)", border:"1px solid var(--rule)",
                      borderRadius:14, padding:"14px 12px", cursor:"pointer",
                      display:"flex", flexDirection:"column", alignItems:"flex-start", gap:6,
                      boxShadow:"0 2px 8px var(--shadow)", textAlign:"left",
                      transition:"all 0.15s" }}
                    onTouchStart={e => e.currentTarget.style.transform="scale(0.97)"}
                    onTouchEnd={e => e.currentTarget.style.transform="none"}>
                    <span style={{ fontSize:24 }}>{item.icon}</span>
                    <div style={{ fontSize:15, fontWeight:800, color:"var(--ink)", lineHeight:1.2 }}>
                      {L(item.label)}
                    </div>
                    <div style={{ fontSize:12, color:"var(--ink-faint)", lineHeight:1.35 }}>
                      {L(item.desc)}
                    </div>
                  </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Footer actions */}
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
          <button onClick={() => navigate("/install")}
            style={{ background:"var(--bg2)", border:"1px solid var(--rule)",
              borderRadius:12, padding:"12px 16px", cursor:"pointer",
              display:"flex", alignItems:"center", gap:12,
              boxShadow:"0 2px 8px var(--shadow)" }}>
            <span style={{ fontSize:20 }}>📲</span>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)" }}>{L("Install App")}</div>
              <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:1 }}>{L("Add to home screen for offline use")}</div>
            </div>
          </button>

          {loggedIn && (
            <button onClick={logout}
              style={{ background:"var(--bg2)", border:"1px solid var(--rule)",
                borderRadius:12, padding:"12px 16px", cursor:"pointer",
                display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:20 }}>🚪</span>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--ink-dim)", textAlign:"left" }}>{L("Logout")}</div>
            </button>
          )}
        </div>

        <div style={{ height:16 }} />
      </div>
    </div>
  )
}
