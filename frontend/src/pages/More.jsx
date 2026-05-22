import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { usePlan } from "../context/PlanContext"
import { useTheme } from "../context/ThemeContext"

const SECTIONS = [
  {
    label: "Sales & Money",
    hindi: "बिक्री",
    items: [
      { label:"POS Billing",    hindi:"बिलिंग",    to:"/billing",     icon:"🧾", desc:"New sale / GST invoice" },
      { label:"Sale History",   hindi:"इतिहास",    to:"/history",     icon:"📋", desc:"All past bills" },
      { label:"Udhaar Khata",   hindi:"उधार",      to:"/udhar",       icon:"📒", desc:"Credit customers" },
      { label:"Customers",      hindi:"ग्राहक",    to:"/customers",   icon:"👥", desc:"Customer profiles" },
    ],
  },
  {
    label: "Stock & Products",
    hindi: "स्टॉक",
    items: [
      { label:"Inventory",      hindi:"सामान",     to:"/inventory",   icon:"📦", desc:"View & edit stock" },
      { label:"Bulk Import",    hindi:"आयात",      to:"/bulk-import", icon:"📥", desc:"Upload products via CSV" },
      { label:"Wastage",        hindi:"नुकसान",    to:"/wastage",     icon:"🗑️", desc:"Record damaged goods" },
      { label:"Expiry Intel",   hindi:"एक्सपायरी", to:"/expiry",      icon:"🕐", desc:"Items expiring soon" },
    ],
  },
  {
    label: "Intelligence",
    hindi: "विश्लेषण",
    items: [
      { label:"Demand Intel",   hindi:"मांग",      to:"/demand",      icon:"📊", desc:"Festival & demand forecast" },
      { label:"Insights",       hindi:"जानकारी",   to:"/insights",    icon:"📈", desc:"Profit, GST, trends" },
      { label:"Voice Agent",    hindi:"बोलो",      to:"/voice",       icon:"🎤", desc:"Bill by speaking" },
    ],
  },
  {
    label: "Operations",
    hindi: "संचालन",
    items: [
      { label:"Day Open/Close", hindi:"दिन",       to:"/day",         icon:"☀️", desc:"Daily cash reconciliation" },
      { label:"Settings",       hindi:"सेटिंग",    to:"/settings",    icon:"⚙️", desc:"Theme, language, plan" },
      { label:"Help",           hindi:"मदद",       to:"/help",        icon:"❓", desc:"How to use DukaanAI" },
    ],
  },
]

export default function More() {
  const navigate = useNavigate()
  const { vendor, cloud, logout, loggedIn } = useAuth()
  const { planLabel } = usePlan()
  const { isDark, toggleTheme } = useTheme()

  return (
    <div style={{ flex:1, overflowY:"auto", background:"var(--bg0)" }}>
      {/* Header */}
      <div style={{ background:"var(--bg0)", backdropFilter:"blur(6px)",
        borderBottom:"1px solid var(--rule)", padding:"14px 16px",
        position:"sticky", top:0, zIndex:10 }}>
        <div style={{ fontSize:20, fontWeight:800, color:"var(--ink)", letterSpacing:"-0.5px" }}>More</div>
        <div style={{ fontSize:11, color:"var(--ink-faint)", marginTop:2 }}>All features & settings</div>
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
              {vendor?.store_name || "Your Store"}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:3 }}>
              <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.9)",
                background:"rgba(255,255,255,0.2)", borderRadius:20, padding:"2px 9px" }}>
                ★ {planLabel?.name || "Free"} Plan
              </span>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.8)" }}>
                {cloud ? "● Cloud sync" : "● Local only"}
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

        {/* Feature sections */}
        {SECTIONS.map(sec => (
          <div key={sec.label} style={{ marginBottom:20 }}>
            {/* Section label */}
            <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:800, color:"var(--brass-deep)",
                letterSpacing:"2px", textTransform:"uppercase" }}>{sec.label}</div>
              <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif",
                fontSize:12, color:"var(--ink-faint)" }}>{sec.hindi}</div>
            </div>

            {/* 2-column grid */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {sec.items.map(item => (
                <button key={item.to} onClick={() => navigate(item.to)}
                  style={{ background:"var(--bg2)", border:"1px solid var(--rule)",
                    borderRadius:14, padding:"14px 12px", cursor:"pointer",
                    display:"flex", flexDirection:"column", alignItems:"flex-start", gap:6,
                    boxShadow:"0 2px 8px var(--shadow)", textAlign:"left",
                    transition:"all 0.15s" }}
                  onTouchStart={e => e.currentTarget.style.transform="scale(0.97)"}
                  onTouchEnd={e => e.currentTarget.style.transform="none"}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%" }}>
                    <span style={{ fontSize:22 }}>{item.icon}</span>
                    <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif",
                      fontSize:11, color:"var(--ink-faint)" }}>{item.hindi}</div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)", lineHeight:1.2 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize:10, color:"var(--ink-faint)", lineHeight:1.4 }}>
                    {item.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Footer actions */}
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
          <button onClick={() => navigate("/install")}
            style={{ background:"var(--bg2)", border:"1px solid var(--rule)",
              borderRadius:12, padding:"12px 16px", cursor:"pointer",
              display:"flex", alignItems:"center", gap:12,
              boxShadow:"0 2px 8px var(--shadow)" }}>
            <span style={{ fontSize:20 }}>📲</span>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)" }}>Install App</div>
              <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:1 }}>Add to home screen for offline use</div>
            </div>
          </button>

          {loggedIn && (
            <button onClick={logout}
              style={{ background:"var(--bg2)", border:"1px solid var(--rule)",
                borderRadius:12, padding:"12px 16px", cursor:"pointer",
                display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:20 }}>🚪</span>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--ink-dim)", textAlign:"left" }}>Logout</div>
            </button>
          )}
        </div>

        <div style={{ height:16 }} />
      </div>
    </div>
  )
}
