import { createContext, useContext } from "react"
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

export function PlanProvider({ children }) {
  const { vendor } = useAuth()
  const plan = vendor?.plan || "free"
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free

  function hasFeature(feature) {
    return features.includes(feature)
  }

  function requirePlan(feature) {
    // Returns null if allowed, or the required plan string if blocked
    if (hasFeature(feature)) return null
    const info = FEATURE_LABELS[feature]
    return info?.plan || "pro"
  }

  return (
    <PlanCtx.Provider value={{
      plan, features, hasFeature, requirePlan,
      planLabel: PLAN_LABELS[plan] || PLAN_LABELS.free,
      PLAN_LABELS, FEATURE_LABELS,
    }}>
      {children}
    </PlanCtx.Provider>
  )
}

export const usePlan = () => useContext(PlanCtx)
