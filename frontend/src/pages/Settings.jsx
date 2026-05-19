import { useState } from "react"
import { LANGUAGES } from "../voice/languages.js"
import { getSavedLang, saveLang, LANG_KEY } from "../voice/i18n.js"
import { usePlan } from "../context/PlanContext"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"

const TOGGLE_FEATURES = [
  { key:"voice_agent",      label:"Voice Agent",         desc:"Speak in Telugu, Hindi, Tamil and 7 more languages",  plan:"pro" },
  { key:"barcode_scanner",  label:"Barcode Scanner",     desc:"Scan product barcodes with camera",                   plan:"pro" },
  { key:"customer_history", label:"Customer History",    desc:"Track what each customer buys",                       plan:"pro" },
  { key:"day_ops",          label:"Day Open/Close",      desc:"Daily profit report and stock snapshot",              plan:"pro" },
  { key:"insights",         label:"Insights",            desc:"Sales trends, GST summary, demand forecast",          plan:"pro" },
  { key:"low_stock_alerts", label:"Low Stock Alerts",    desc:"Alert when stock falls below minimum",                plan:"pro" },
  { key:"multi_staff",      label:"Multi-staff Login",   desc:"Owner, manager, cashier roles",                       plan:"wholesale" },
  { key:"ai_vision",        label:"AI Image Scanner",    desc:"Identify products by photo (uses AI credits)",        plan:"wholesale" },
  { key:"audit_log",        label:"Audit Log",           desc:"Track all staff actions",                             plan:"wholesale" },
]

const PLAN_INFO = {
  free:      { name:"Free",      price:"₹0",    color:"var(--ink-faint)",    bg:"#f3f4f6" },
  pro:       { name:"Pro",       price:"₹299",  color:"var(--jade)", bg:"#E1F5EE" },
  wholesale: { name:"Wholesale", price:"₹799",  color:"#7F77DD", bg:"#EEEDFE" },
}

export default function Settings() {
  const { plan, hasFeature, planLabel } = usePlan()
  const { vendor, logout } = useAuth()
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
  }

  function isEnabled(key) {
    if (!hasFeature(key)) return false
    // If explicitly set to false → off. Otherwise ON by default
    return toggles[key] !== false
  }

  function isPlanAllowed(key) {
    // Check plan without toggle state
    const { vendor } = { vendor: null }
    const plan = localStorage.getItem("dk_vendor")
      ? JSON.parse(localStorage.getItem("dk_vendor"))?.plan || "free"
      : "free"
    const FEATURES = {
      free: ["basic_inventory","gst_billing","whatsapp_share","dashboard"],
      pro:  ["basic_inventory","gst_billing","whatsapp_share","dashboard","cloud_sync",
             "voice_agent","barcode_scanner","customer_history","day_ops","insights",
             "low_stock_alerts","unlimited_invoices"],
      wholesale: ["basic_inventory","gst_billing","whatsapp_share","dashboard","cloud_sync",
                  "voice_agent","barcode_scanner","customer_history","day_ops","insights",
                  "low_stock_alerts","unlimited_invoices","multi_staff","ai_vision","audit_log","bulk_export"],
    }
    return (FEATURES[plan] || FEATURES.free).includes(key)
  }

  const planI = PLAN_INFO[plan] || PLAN_INFO.free

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h1 className="text-sm font-semibold mb-4">Settings</h1>

      {/* Current plan card */}
      <div className="card mb-4" style={{ borderColor: planI.color, borderWidth:1.5 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold" style={{ color: planI.color }}>
                {planI.name} Plan
              </span>
              <span className="badge text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: planI.bg, color: planI.color }}>
                Active
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {vendor?.store_name} · {vendor?.email || ""}
            </div>
            {vendor?.plan_expires_at && (
              <div className="text-[10px] text-gray-400 mt-0.5">
                Expires: {new Date(vendor.plan_expires_at).toLocaleDateString("en-IN")}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold" style={{ color: planI.color }}>
              {planI.price}
            </div>
            <div className="text-[10px] text-gray-400">per month</div>
          </div>
        </div>

        {/* Upgrade buttons */}
        {plan === "free" && (
          <div className="mt-3 flex gap-2">
            <button className="btn btn-primary flex-1 py-2 text-xs font-medium">
              Upgrade to Pro — ₹299/month
            </button>
            <button className="btn flex-1 py-2 text-xs font-medium"
              style={{ borderColor:"#7F77DD", color:"#7F77DD" }}>
              Wholesale — ₹799/month
            </button>
          </div>
        )}
        {plan === "pro" && (
          <button className="btn w-full mt-3 py-2 text-xs font-medium"
            style={{ borderColor:"#7F77DD", color:"#7F77DD" }}>
            Upgrade to Wholesale — ₹799/month
          </button>
        )}
        {plan === "wholesale" && (
          <div className="mt-3 text-[10px] text-gray-400 text-center">
            You have the highest plan — all features unlocked!
          </div>
        )}
      </div>

      {/* Feature toggles */}
      <div className="card mb-4">
        <div className="text-xs font-medium text-gray-600 mb-1">Feature Settings</div>
        <div className="text-[10px] text-gray-400 mb-3">
          Turn features on or off. Locked features require a higher plan.
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
                    <span className="text-xs font-medium text-gray-700">{f.label}</span>
                    {!allowed && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: reqPlan.bg, color: reqPlan.color }}>
                        {reqPlan.name}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{f.desc}</div>
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
                    Enable
                  </button>
                ) : (
                  // Plan doesn't allow — show Upgrade button
                  <button
                    onClick={() => {}}
                    className="flex-shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg border font-medium"
                    style={{ borderColor: reqPlan.color, color: reqPlan.color }}>
                    Upgrade
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Plans comparison */}
      <div className="card mb-4">
        <div className="text-xs font-medium text-gray-600 mb-3">Plan Comparison</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PLAN_INFO).map(([key, p]) => (
            <div key={key} className={`rounded-xl p-3 text-center border ${
              plan === key ? "border-current" : "border-gray-100"
            }`}
            style={plan === key ? { borderColor: p.color, background: p.bg } : {}}>
              <div className="text-xs font-semibold mb-0.5" style={{ color: p.color }}>
                {p.name}
              </div>
              <div className="text-sm font-bold" style={{ color: p.color }}>
                {p.price}
              </div>
              <div className="text-[9px] text-gray-400">/month</div>
              {plan === key && (
                <div className="text-[9px] font-medium mt-1" style={{ color: p.color }}>
                  Current plan
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Account settings */}
      <div className="card mb-4">
        <div className="text-xs font-medium text-gray-600 mb-3">Account</div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs py-2 border-b border-gray-50">
            <span className="text-gray-500">Store name</span>
            <span className="font-medium">{vendor?.store_name || "—"}</span>
          </div>
          <div className="flex justify-between text-xs py-2 border-b border-gray-50">
            <span className="text-gray-500">Email</span>
            <span className="font-medium">{vendor?.email || "—"}</span>
          </div>
          <div className="flex justify-between text-xs py-2 border-b border-gray-50">
            <span className="text-gray-500">Plan</span>
            <span className="font-medium" style={{ color: planI.color }}>{planI.name}</span>
          </div>
          <div className="flex justify-between text-xs py-2">
            <span className="text-gray-500">App version</span>
            <span className="font-medium text-gray-400">DukaanAI v1.0</span>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card border-red-100">
        <div className="text-xs font-medium text-red-600 mb-3">Account actions</div>
        <button onClick={logout}
          className="btn w-full text-xs text-red-500 hover:bg-red-50 border-red-200 py-2">
          Logout from this device
        </button>
      </div>
    </div>
  )
}
