/* global __APP_VERSION__ -- injected by vite.config.js from android versionName */
import { useState, useEffect } from "react"
import { getUPIVpa, saveUPIVpa } from "../components/UPIQRCode.jsx"
import { getDefaultApplyGst, setDefaultApplyGst } from "../utils/gstSettings.js"
import { LANGUAGES } from "../voice/languages.js"
import { getSavedLang, saveLang, LANG_KEY } from "../voice/i18n.js"
import { usePlan, normalizePlan } from "../context/PlanContext"
import { useAuth } from "../context/AuthContext"
import { api } from "../sync/db"
import { usePlanStatus } from "../components/usePlanStatus"
import PayProButton from "../components/PayProButton"
import AddChildUser from "../components/AddChildUser"
import DeleteAccount from "../components/DeleteAccount"
import { shopEnabled, isNativeApp } from "../utils/features"
import { useTheme } from "../context/ThemeContext"
import { useAppMode, APP_MODES } from "../context/AppModeContext"
import { useNavigate } from "react-router-dom"
import { tr, uiLang, dateLocale } from "../i18n/kiranaStrings"

const L = k => tr(k, uiLang())

const TOGGLE_FEATURES = [
  { key:"voice_agent",      label:"Voice Agent",         desc:"Speak in Telugu, Hindi, Tamil and 7 more languages",  plan:"pro" },
  { key:"barcode_scanner",  label:"Barcode Scanner",     desc:"Scan product barcodes with camera",                   plan:"pro" },
  { key:"customer_history", label:"Customer History",    desc:"Track what each customer buys",                       plan:"pro" },
  { key:"day_ops",          label:"Day Open/Close",      desc:"Daily profit report and stock snapshot",              plan:"pro" },
  { key:"insights",         label:"Insights",            desc:"Sales trends, GST summary, demand forecast",          plan:"pro" },
  { key:"low_stock_alerts", label:"Low Stock Alerts",    desc:"Alert when stock falls below minimum",                plan:"pro" },
  { key:"multi_staff",      label:"Multi-staff Login",   desc:"Owner, manager, cashier roles",                       plan:"pro" },
  { key:"ai_vision",        label:"AI Image Scanner",    desc:"Identify products by photo (uses AI credits)",        plan:"pro" },
  { key:"audit_log",        label:"Audit Log",           desc:"Track all staff actions",                             plan:"pro" },
]

const PLAN_INFO = {
  free:      { name:"Free",      price:"₹0",    color:"var(--ink-faint)",    bg:"#f3f4f6" },
  pro:       { name:"Pro",       price:"₹299",  color:"var(--jade)", bg:"#E1F5EE" },
}

const SHOP_TYPES = [
  { id:"kirana",       icon:"🛒", label:"Kirana / General Store" },
  { id:"chai",         icon:"☕", label:"Chai / Tea Shop" },
  { id:"restaurant",   icon:"🍜", label:"Restaurant / Fast Food" },
  { id:"bangle_fancy", icon:"💍", label:"Bangle / Fancy Store" },
].filter(t => shopEnabled(t.id))

// Owner picks which shop types this account runs; the header then shows a switcher
function ShopTypes() {
  const { vendor, setModules, role } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg]   = useState("")
  if (vendor && role !== "owner") return null
  const HOME = { kirana:"/dashboard", bangle_fancy:"/bangle-dashboard", chai:"/chai-dashboard", restaurant:"/chai-dashboard" }
  const current = (() => { try { return localStorage.getItem("storeMode") || "kirana" } catch { return "kirana" } })()
  // Not signed in (data on this phone): every shop type is available, pick one to open
  const mods = vendor ? (vendor.modules || ["kirana"]) : [current]
  const openShop = id => { localStorage.setItem("storeMode", id); window.location.assign(HOME[id]) }

  // Signed in: each kind of shop is its own account, so this only explains how to add one
  if (vendor) return (
    <div className="card mb-4">
      <div className="text-xs font-medium text-gray-600 mb-1">{L("Shop type")}</div>
      <div className="text-sm" style={{ color:"var(--ink)", fontWeight:700 }}>
        {SHOP_TYPES.find(t => t.id === mods[0])?.icon} {L(SHOP_TYPES.find(t => t.id === mods[0])?.label || "Kirana / General Store")}
      </div>
      <div className="text-[11px] mt-1" style={{ color:"var(--ink-faint)" }}>
        {L("Also run another kind of shop? Sign out and create a new account for it — you can use the same email.")}
      </div>
    </div>
  )

  async function toggle(id) {
    if (!vendor) return openShop(id)
    const next = mods.includes(id) ? mods.filter(m => m !== id) : [...mods, id]
    if (!next.length) return setMsg(L("Keep at least one shop type."))
    setBusy(true); setMsg("")
    try {
      await setModules(next)
      if (!mods.includes(id)) {
        // Jump straight into the shop type just turned on
        localStorage.setItem("storeMode", id)
        navigate(HOME[id])
      }
    } catch (e) { setMsg(e.message) }
    setBusy(false)
  }

  return (
    <div className="card mb-4">
      <div className="text-xs font-medium text-gray-600 mb-1">{L("Shop type")}</div>
      <div className="text-[11px] mb-3" style={{ color:"var(--ink-faint)" }}>{L("Your shop opens straight into its own app. Only turn on another type if you also run that kind of shop.")}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {SHOP_TYPES.map(t => {
          const on = mods.includes(t.id)
          return (
            <button key={t.id} disabled={busy} onClick={() => toggle(t.id)}
              style={{ display:"flex", alignItems:"center", gap:10, minHeight:50, padding:"0 14px", borderRadius:12, cursor:"pointer",
                border:"1.5px solid", borderColor: on ? "var(--jade)" : "var(--rule)", background: on ? "rgba(29,158,117,0.08)" : "var(--bg1)",
                color:"var(--ink)", fontWeight:700, fontSize:14, textAlign:"left" }}>
              <span style={{ fontSize:22 }}>{t.icon}</span>
              <span style={{ flex:1 }}>{L(t.label)}</span>
              <span style={{ fontSize:12, fontWeight:800, color: on ? "var(--jade)" : "var(--ink-faint)" }}>{on ? "✓ " + L("On") : L("Off")}</span>
            </button>
          )
        })}
      </div>
      {msg && <div className="text-xs mt-2" style={{ color:"#c0392b" }}>{msg}</div>}
    </div>
  )
}

function UPISetting() {
  const [vpa,    setVpa]    = useState(getUPIVpa)
  const [draft,  setDraft]  = useState(getUPIVpa)
  const [saved,  setSaved]  = useState(false)

  function handleSave() {
    saveUPIVpa(draft)
    setVpa(draft.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="card mb-4" style={{ padding: 14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <span style={{ fontSize:20 }}>📱</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{L("UPI Payment ID")}</div>
          <div style={{ fontSize:10, color:"var(--ink-faint)" }}>
            {L("Customers scan a QR on every bill to pay instantly")}
          </div>
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="9876543210@paytm or name@okaxis"
          style={{
            flex:1, padding:"9px 12px", borderRadius:9,
            border:"1.5px solid var(--rule)", fontSize:12,
            background:"var(--bg2)", color:"var(--ink)", outline:"none",
          }}
          onFocus={e  => e.target.style.borderColor = "var(--jade)"}
          onBlur={e   => e.target.style.borderColor = "var(--rule)"}
          onKeyDown={e => e.key === "Enter" && handleSave()}
        />
        <button onClick={handleSave}
          style={{
            padding:"9px 16px", borderRadius:9, border:"none",
            background: saved ? "#059669" : "var(--jade)",
            color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer",
            transition:"background 0.2s", whiteSpace:"nowrap",
          }}>
          {L(saved ? "✓ Saved" : "Save")}
        </button>
      </div>
      {vpa && (
        <div style={{ marginTop:8, fontSize:10, color:"var(--jade)", fontWeight:600 }}>
          ✓ UPI active: {vpa}
        </div>
      )}
    </div>
  )
}

function GstDefaultSetting() {
  const [applyGst, setApplyGst] = useState(getDefaultApplyGst)

  function toggle() {
    const next = !applyGst
    setApplyGst(next)
    setDefaultApplyGst(next)
  }

  return (
    <div className="card mb-4" style={{ padding: 14 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
          <span style={{ fontSize:20 }}>🧾</span>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{L("Apply GST by default")}</div>
            <div style={{ fontSize:10, color:"var(--ink-faint)" }}>
              {L("Turn on if you issue GST invoices. Off by default — most local vendors don't. You can still switch it per bill.")}
            </div>
          </div>
        </div>
        <button
          onClick={toggle}
          className="flex-shrink-0 w-10 h-6 rounded-full transition-colors relative"
          style={{ background: applyGst ? "var(--jade)" : "#d1d5db" }}>
          <span className="absolute top-0.5 transition-all rounded-full bg-white w-5 h-5"
            style={{ left: applyGst ? "18px" : "2px" }} />
        </button>
      </div>
    </div>
  )
}

// Testing period: Pro is free — signed-in Free owners switch with one tap
function FreeProOffer() {
  const { vendor, role, claimPro } = useAuth()
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  useEffect(() => {
    if (!vendor || role !== "owner" || ["pro", "wholesale"].includes(vendor.plan)) return
    api.get("/auth/promo").then(d => setOn(!!d.free_pro)).catch(() => {})
  }, [vendor?.plan, role])   // eslint-disable-line react-hooks/exhaustive-deps
  if (!on || !vendor || ["pro", "wholesale"].includes(vendor.plan)) return null
  return (
    <div style={{ marginTop:12, padding:12, borderRadius:12, background:"#fff6e5", border:"1.5px solid #f6c768" }}>
      <div style={{ fontSize:13, fontWeight:800, color:"#7a4a00" }}>🎁 {L("Pro is free while we test")}</div>
      <div style={{ fontSize:12, color:"#7a5a2a", marginTop:4, lineHeight:1.45 }}>
        {L("Get cloud backup, use your shop on more than one phone, staff logins, QR ordering and reports — free during testing.")}
      </div>
      {err && <div style={{ fontSize:12, color:"#c0392b", marginTop:6 }}>{err}</div>}
      <button disabled={busy} onClick={async () => { setBusy(true); setErr(""); try { await claimPro() } catch (e) { setErr(e.message); setBusy(false) } }}
        style={{ width:"100%", marginTop:10, padding:"11px", borderRadius:10, border:"none", background:"#e87722", color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer", opacity: busy ? .6 : 1 }}>
        {busy ? L("Switching…") : L("Switch to Pro — free")}
      </button>
    </div>
  )
}

export default function Settings() {
  const { plan, hasFeature, planLabel } = usePlan()
  const { vendor, logout } = useAuth()
  const planStatus = usePlanStatus()   // trial / plan end date and days left
  const { theme, setTheme } = useTheme()
  const { appMode, setAppMode } = useAppMode()
  const navigate = useNavigate()

  // Feature toggles stored locally (premium features can be toggled off even if plan allows)
  const [voiceLang, setVoiceLang] = useState(() => getSavedLang())

  function handleLangChange(code) {
    setVoiceLang(code)
    saveLang(code)
  }

  const [toggles, setToggles] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dk_feature_toggles") || "{}") }
    catch { return {} }
  })

  function setToggle(key, val) {
    const updated = { ...toggles, [key]: val }
    setToggles(updated)
    localStorage.setItem("dk_feature_toggles", JSON.stringify(updated))
    window.dispatchEvent(new Event("dk:toggles-changed"))
  }

  function isEnabled(key) {
    if (!hasFeature(key)) return false
    // If explicitly set to false → off. Otherwise ON by default
    return toggles[key] !== false
  }

  function isPlanAllowed(key) {
    // Check plan without toggle state
    const { vendor } = { vendor: null }
    let plan = localStorage.getItem("dk_vendor")
      ? JSON.parse(localStorage.getItem("dk_vendor"))?.plan || "free"
      : "free"
    const FEATURES = {
      free: ["basic_inventory","gst_billing","whatsapp_share","dashboard"],
      pro:  ["basic_inventory","gst_billing","whatsapp_share","dashboard","cloud_sync",
             "voice_agent","barcode_scanner","customer_history","day_ops","insights",
             "low_stock_alerts","unlimited_invoices","multi_staff","ai_vision","audit_log","bulk_export"],
    }
    plan = normalizePlan(plan)
    return (FEATURES[plan] || FEATURES.free).includes(key)
  }

  const planI = PLAN_INFO[plan] || PLAN_INFO.free

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="page-sticky-header flex items-center mb-4">
        <h1 className="text-sm font-semibold">{L("Settings")}</h1>
      </div>

      {/* Current plan card: status + end date with a days-left bar on the left, price + Pay on the right */}
      {(() => {
        const st = planStatus
        const locked = !!st?.locked
        const tone = locked ? { fg:"#c0392b", bg:"#fdecea" } : st?.trial ? { fg:"#1a7f4b", bg:"#e3f5ec" } : { fg:"#2a5bd7", bg:"#e6effd" }
        const badge = plan === "free" ? L("Free") : L(locked ? "Ended" : st?.trial ? "Free trial" : "Active")
        const until = st?.expires_at ? new Date(st.expires_at).toLocaleDateString(dateLocale(), { day:"numeric", month:"short", year:"numeric" }) : ""
        const line = !st?.expires_at ? "" : locked
          ? `${L("Ended on")} ${until} — ${L("renew to keep billing")}`
          : `${L(st.trial ? "Trial ends on" : "Paid until")} ${until}`
        const fill = st?.expires_at && !locked ? Math.min(1, (st.days_left || 0) / 30) : 0
        const low = !locked && st?.days_left != null && st.days_left <= 7
        const who = [vendor?.store_name, vendor?.email].filter(Boolean).join(" · ")
        return (
          <div className="card mb-4" style={{ padding:"18px 20px", border:`1.5px solid ${locked ? "#f1b0a8" : "var(--rule)"}` }}>
            <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:"14px 24px" }}>
              <div style={{ flex:"1 1 260px", minWidth:0, display:"flex", gap:14, alignItems:"flex-start" }}>
                <div aria-hidden="true" style={{ width:44, height:44, borderRadius:12, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                  background:"linear-gradient(135deg,#e87722,#c25500)", color:"#fff", fontSize:20 }}>★</div>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:17, fontWeight:800, color:"var(--ink)" }}>{plan === "free" ? L("Free plan") : L("Pro plan")}</span>
                    <span style={{ fontSize:11, fontWeight:800, padding:"3px 10px", borderRadius:20, background:tone.bg, color:tone.fg, textTransform:"uppercase", letterSpacing:.4 }}>{badge}</span>
                  </div>
                  {who && <div style={{ fontSize:13, color:"var(--ink-faint)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{who}</div>}
                  {line && (
                    <div style={{ marginTop:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", gap:10, fontSize:13, fontWeight:700,
                        color: locked ? "#c0392b" : low ? "#b45309" : "var(--ink-dim)" }}>
                        <span>{line}</span>
                        {!locked && <span style={{ whiteSpace:"nowrap" }}>{st.days_left} {L(st.days_left === 1 ? "day left" : "days left")}</span>}
                      </div>
                      {!locked && (
                        <div style={{ height:6, borderRadius:6, background:"var(--bg2)", marginTop:6, overflow:"hidden" }}>
                          <div style={{ width:`${Math.max(4, fill * 100)}%`, height:"100%", borderRadius:6, background: low ? "#e0902f" : "var(--jade, #1D9E75)" }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {!isNativeApp() && (plan === "free" || st?.expires_at) && (
                <div style={{ flex:"0 0 auto", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, marginLeft:"auto" }}>
                  <div style={{ textAlign:"right", lineHeight:1.1 }}>
                    <span style={{ fontSize:24, fontWeight:900, color:"var(--ink)" }}>₹299</span>
                    <span style={{ fontSize:12, color:"var(--ink-faint)", fontWeight:600 }}> / {L("month")}</span>
                  </div>
                  <PayProButton className="btn btn-primary" style={{ minHeight:42, padding:"0 18px", fontSize:14, fontWeight:800, borderRadius:12 }}
                    label={plan === "free" ? L("Upgrade to Pro") : L(locked ? "Pay ₹299 to unlock" : "Pay ₹299 · add 30 days")} />
                </div>
              )}
            </div>
            <FreeProOffer />
          </div>
        )
      })()}

      {/* Appearance — theme picker */}
      <div className="card mb-4" style={{ padding: 14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{
            width:34, height:34, borderRadius:9,
            background:"var(--saffron,#e87722)1a",
            border:"1px solid var(--saffron,#e87722)88",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
          }}>☀</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{L("Theme")}</div>
            <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:2 }}>{L("Light is better for shop daylight")}</div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
          {[
            { key:"light", label:"☀ Light",  previewBg:"#fbf5e8", previewText:"#1a0c04" },
            { key:"dark",  label:"🌙 Dark",   previewBg:"#1c1209", previewText:"#f5deb3" },
            { key:"auto",  label:"Auto",      previewBg:"linear-gradient(135deg, #fbf5e8 50%, #1c1209 50%)", previewText:"var(--ink)" },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => setTheme(m.key)}
              style={{
                background: theme === m.key
                  ? "linear-gradient(135deg, var(--saffron,#e87722), #d4621f)"
                  : m.previewBg,
                color: theme === m.key ? "#fff" : m.previewText,
                border: theme === m.key ? "none" : "1px solid var(--rule,#e0d8d0)",
                borderRadius:10, padding:"12px 8px",
                fontSize:11, fontWeight:700, cursor:"pointer",
                boxShadow: theme === m.key ? "0 6px 14px rgba(232,119,34,0.35)" : "none",
              }}
            >{L(m.label)}</button>
          ))}
        </div>
      </div>

      {/* App Mode selector */}
      <div className="card mb-4" style={{ padding:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{ width:34, height:34, borderRadius:9,
            background:"var(--saffron-bg)", border:"1px solid rgba(212,98,31,0.3)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📱</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{L("App Mode")}</div>
            <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:2 }}>
              {L("Choose how many features you want to see")}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {Object.entries(APP_MODES).map(([key, m]) => {
            const active = appMode === key
            return (
              <button key={key} onClick={() => setAppMode(key)}
                style={{ display:"flex", alignItems:"center", gap:12,
                  padding:"12px 14px", borderRadius:12, cursor:"pointer", textAlign:"left",
                  border: active ? `2px solid ${m.color}` : "1.5px solid var(--rule)",
                  background: active ? `color-mix(in srgb, ${m.color} 8%, var(--bg2))` : "var(--bg2)",
                  transition:"all 0.15s" }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{m.emoji}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                    <span style={{ fontSize:13, fontWeight:700,
                      color: active ? m.color : "var(--ink)" }}>{L(m.label)}</span>
                    <span style={{ fontFamily:"'Tiro Devanagari Hindi',serif",
                      fontSize:11, color:"var(--ink-faint)" }}>{m.hindi}</span>
                  </div>
                  <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:1 }}>{L(m.desc)}</div>
                </div>
                {active && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke={m.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* UPI Payment Setting */}
      <UPISetting />

      {/* GST default */}
      <GstDefaultSetting />

      {/* Feature toggles */}
      <div className="card mb-4">
        <div className="text-xs font-medium text-gray-600 mb-1">{L("Feature Settings")}</div>
        <div className="text-[10px] text-gray-400 mb-3">
          {L("Turn features on or off. Locked features require a higher plan.")}
        </div>
        <div className="space-y-1">
          {TOGGLE_FEATURES.map(f => {
            const allowed  = isPlanAllowed(f.key)
            const enabled  = toggles[f.key] !== false
            const reqPlan  = PLAN_INFO[f.plan]

            return (
              <div key={f.key} className={`flex items-center justify-between p-3 rounded-xl ${
                allowed ? "bg-gray-50" : "bg-gray-50 opacity-60"
              }`}>
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">{L(f.label)}</span>
                    {!allowed && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: reqPlan.bg, color: reqPlan.color }}>
                        {reqPlan.name}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{L(f.desc)}</div>
                </div>

                {allowed ? (
                  // Toggle switch
                  <button
                    onClick={() => setToggle(f.key, !enabled)}
                    className="flex-shrink-0 w-10 h-6 rounded-full transition-colors relative"
                    style={{ background: enabled ? "var(--jade)" : "#d1d5db" }}>
                    <span className="absolute top-0.5 transition-all rounded-full bg-white w-5 h-5"
                      style={{ left: enabled ? "18px" : "2px" }} />
                  </button>
                ) : allowed ? (
                  // Plan allows it but toggled off — show Enable button
                  <button
                    onClick={() => setToggle(f.key, true)}
                    className="flex-shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg border font-medium"
                    style={{ borderColor:"var(--jade)", color:"var(--jade)" }}>
                    {L("Enable")}
                  </button>
                ) : isNativeApp() ? (
                  // Android app: no in-app selling (Play Billing rules) — just name the plan
                  <span className="flex-shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg font-medium"
                    style={{ color: reqPlan.color, background:"var(--bg2)" }}>
                    {L(reqPlan.name)}
                  </span>
                ) : (
                  // Plan doesn't allow — show Upgrade button
                  <button
                    onClick={() => { const r = document.getElementById("root"); (r && r.scrollHeight > r.clientHeight ? r : window).scrollTo({ top: 0, behavior: "smooth" }) }}   // the plan card with the Pay button is at the top
                    className="flex-shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg border font-medium"
                    style={{ borderColor: reqPlan.color, color: reqPlan.color }}>
                    {L("Upgrade")}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>


      {/* Account settings */}
      <div className="card mb-4">
        <div className="text-xs font-medium text-gray-600 mb-3">{L("Account")}</div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs py-2 border-b border-gray-50">
            <span className="text-gray-500">{L("Store name")}</span>
            <span className="font-medium">{vendor?.store_name || "—"}</span>
          </div>
          <div className="flex justify-between text-xs py-2 border-b border-gray-50">
            <span className="text-gray-500">{L("Email")}</span>
            <span className="font-medium">{vendor?.email || "—"}</span>
          </div>
          <div className="flex justify-between text-xs py-2 border-b border-gray-50">
            <span className="text-gray-500">{L("Plan")}</span>
            <span className="font-medium" style={{ color: planI.color }}>{L(planI.name)}</span>
          </div>
          <div className="flex justify-between text-xs py-2">
            <span className="text-gray-500">{L("App version")}</span>
            <span className="font-medium text-gray-400">
              DukhaanAI v{__APP_VERSION__}{window.Capacitor?.isNativePlatform?.() ? " (app)" : " (web)"}
            </span>
          </div>
        </div>
        {/* Add Child User UI for admins/owners */}
        {normalizePlan(vendor?.plan) === "pro" && !vendor?.role && (
          <AddChildUser />
        )}
      </div>

      <ShopTypes />

      {/* Danger zone */}
      <div className="card border-red-100">
        <div className="text-xs font-medium text-red-600 mb-3">{L("Account actions")}</div>
        <button onClick={logout}
          className="btn w-full text-xs text-red-500 hover:bg-red-50 border-red-200 py-2">
          {L("Logout from this device")}
        </button>
        <DeleteAccount />
        <div className="text-[11px] mt-3 text-center" style={{ color:"var(--ink-faint)" }}>
          <a href="/privacy" style={{ color:"inherit", textDecoration:"underline" }}>{L("Privacy policy")}</a>
          {" · "}
          <a href="/delete-account" style={{ color:"inherit", textDecoration:"underline" }}>{L("Account deletion help")}</a>
        </div>
      </div>
    </div>
  )
}
