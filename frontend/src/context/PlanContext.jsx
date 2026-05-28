import { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "./AuthContext"

// ── Plan feature map ──────────────────────────────────────
const PLAN_FEATURES = {
  free: [
    "basic_inventory",
    "gst_billing",
    "whatsapp_share",
    "dashboard",
  ],
  pro: [
    "basic_inventory",
    "gst_billing",
    "whatsapp_share",
    "dashboard",
    "cloud_sync",
    "voice_agent",
    "barcode_scanner",
    "customer_history",
    "day_ops",
    "insights",
    "low_stock_alerts",
    "unlimited_invoices",
  ],
  wholesale: [
    "basic_inventory",
    "gst_billing",
    "whatsapp_share",
    "dashboard",
    "cloud_sync",
    "voice_agent",
    "barcode_scanner",
    "customer_history",
    "day_ops",
    "insights",
    "low_stock_alerts",
    "unlimited_invoices",
    "multi_staff",
    "ai_vision",
    "audit_log",
    "bulk_export",
    "custom_branding",
  ],
}

const PLAN_LABELS = {
  free:      { name:"Free",      price:"₹0/month",    color:"#888" },
  pro:       { name:"Pro",       price:"₹299/month",  color:"#1D9E75" },
  wholesale: { name:"Wholesale", price:"₹799/month",  color:"#7F77DD" },
}

const FEATURE_LABELS = {
  voice_agent:       { name:"Voice Agent",        desc:"Speak in 10 Indian languages", plan:"pro" },
  barcode_scanner:   { name:"Barcode Scanner",    desc:"Scan products with camera",    plan:"pro" },
  customer_history:  { name:"Customer History",   desc:"Track purchase history",       plan:"pro" },
  day_ops:           { name:"Day Open/Close",     desc:"Daily stock & profit report",  plan:"pro" },
  insights:          { name:"Insights & Reports", desc:"Sales trends and GST summary", plan:"pro" },
  cloud_sync:        { name:"Cloud Sync",         desc:"Access from any device",       plan:"pro" },
  unlimited_invoices:{ name:"Unlimited Invoices", desc:"No daily invoice limit",       plan:"pro" },
  multi_staff:       { name:"Multi-staff Login",  desc:"Owner, manager, cashier roles",plan:"wholesale" },
  ai_vision:         { name:"AI Image Scanner",   desc:"Identify products by photo",   plan:"wholesale" },
  audit_log:         { name:"Audit Log",          desc:"Track all staff actions",      plan:"wholesale" },
  bulk_export:       { name:"Bulk Export",        desc:"Export data to Excel/CSV",     plan:"wholesale" },
}

const PlanCtx = createContext(null)

// ── Voice trial helpers ───────────────────────────────────────
const VOICE_TRIAL_KEY  = "dk_voice_trial_start"
const VOICE_TRIAL_DAYS = 7

export function getTrialDaysLeft() {
  try {
    const start = localStorage.getItem(VOICE_TRIAL_KEY)
    if (!start) return -1  // never started
    const elapsed = Math.floor((Date.now() - new Date(start).getTime()) / 86400000)
    return Math.max(0, VOICE_TRIAL_DAYS - elapsed)
  } catch { return -1 }
}

export function startVoiceTrial() {
  try {
    if (!localStorage.getItem(VOICE_TRIAL_KEY))
      localStorage.setItem(VOICE_TRIAL_KEY, new Date().toISOString())
  } catch {}
}

// Read toggles from localStorage
function getToggles() {
  try { return JSON.parse(localStorage.getItem("dk_feature_toggles") || "{}") }
  catch { return {} }
}

export function PlanProvider({ children }) {
  const { vendor } = useAuth()
  const plan     = vendor?.plan || "free"
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free
  const [toggles, setToggles] = useState(getToggles)

  // Listen for toggle changes — cross-tab via storage event, same-tab via custom event
  useEffect(() => {
    function onStorage(e) {
      if (e.key === "dk_feature_toggles") setToggles(getToggles())
    }
    function onCustom() { setToggles(getToggles()) }
    window.addEventListener("storage", onStorage)
    window.addEventListener("dk:toggles-changed", onCustom)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("dk:toggles-changed", onCustom)
    }
  }, [])

  function hasFeature(feature) {
    // 1. Plan must include the feature
    if (!features.includes(feature)) {
      // Voice trial: free users get 7 days of voice_agent access
      if (feature === "voice_agent" && getTrialDaysLeft() > 0) return true
      return false
    }
    // 2. Feature must not be toggled OFF by vendor
    if (toggles[feature] === false) return false
    return true
  }

  function requirePlan(feature) {
    if (!features.includes(feature)) {
      const info = FEATURE_LABELS[feature]
      return info?.plan || "pro"
    }
    return null
  }

  function isToggledOff(feature) {
    return features.includes(feature) && toggles[feature] === false
  }

  return (
    <PlanCtx.Provider value={{
      plan, features, hasFeature, requirePlan, isToggledOff,
      planLabel: PLAN_LABELS[plan] || PLAN_LABELS.free,
      PLAN_LABELS, FEATURE_LABELS,
      trialDaysLeft: getTrialDaysLeft(),
    }}>
      {children}
    </PlanCtx.Provider>
  )
}

export const usePlan = () => useContext(PlanCtx)
