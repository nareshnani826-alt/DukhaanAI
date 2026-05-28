import { useState } from "react"
import { usePlan } from "../context/PlanContext"
import { startVoiceTrial, getTrialDaysLeft } from "../context/PlanContext"
import { useNavigate } from "react-router-dom"

export default function UpgradeWall({ feature, children }) {
  const { hasFeature, isToggledOff, FEATURE_LABELS, PLAN_LABELS } = usePlan()
  const navigate = useNavigate()
  const [trialStarted, setTrialStarted] = useState(false)

  // Feature is accessible — show the actual page
  if (hasFeature(feature)) return children

  // Re-check after trial start (local state triggers re-render)
  if (trialStarted && feature === "voice_agent" && getTrialDaysLeft() > 0) return children

  const info     = FEATURE_LABELS[feature] || { name: feature, desc:"", plan:"pro" }
  const reqPlan  = PLAN_LABELS[info.plan]  || PLAN_LABELS.pro
  const toggled  = isToggledOff(feature)   // plan allows but vendor turned it off

  // ── Turned off by vendor ──────────────────────────────────
  if (toggled) {
    function enableNow() {
      try {
        const t = JSON.parse(localStorage.getItem("dk_feature_toggles") || "{}")
        delete t[feature]  // remove the false — defaults back to ON
        localStorage.setItem("dk_feature_toggles", JSON.stringify(t))
        window.location.reload()
      } catch(e) { console.error(e) }
    }

    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4 text-3xl">
            🔕
          </div>
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            {info.name} is turned off
          </h2>
          <p className="text-xs text-gray-400 mb-6">
            You disabled this feature. Your plan supports it — tap below to turn it back on.
          </p>
          <button onClick={enableNow}
            className="btn btn-primary w-full py-2.5 text-xs font-semibold mb-2">
            Turn on {info.name}
          </button>
          <button onClick={() => navigate("/settings")}
            className="btn w-full text-xs text-gray-500 mb-2">
            Manage in Settings
          </button>
          <button onClick={() => navigate(-1)} className="btn w-full text-xs text-gray-400">
            Go back
          </button>
        </div>
      </div>
    )
  }

  // ── Voice Agent: offer 7-day free trial ──────────────────
  const trialLeft = getTrialDaysLeft()
  if (feature === "voice_agent" && trialLeft === -1) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div style={{ fontSize: 64, marginBottom: 12 }}>🎤</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", marginBottom: 8 }}>
            Try Voice Agent Free
          </h2>
          <p style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 24, lineHeight: 1.6 }}>
            Speak items in <strong>Telugu, Hindi, Tamil</strong> and 7 more Indian languages.
            Bill ban jata hai — instantly.
          </p>

          <div style={{ background: "var(--bg2)", borderRadius: 16, padding: "16px 20px",
            marginBottom: 24, textAlign: "left", border: "1px solid var(--rule)" }}>
            {["Speak product names in your language","Bills generate automatically",
              "Stock updates in real-time","Works offline too"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10,
                marginBottom: 10, fontSize: 13, color: "var(--ink-dim)" }}>
                <span style={{ color: "var(--jade)", fontWeight: 700, fontSize: 16 }}>✓</span> {f}
              </div>
            ))}
          </div>

          <button
            onClick={() => { startVoiceTrial(); setTrialStarted(true) }}
            style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg,var(--saffron),#d45f00)",
              color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer",
              marginBottom: 10 }}>
            🚀 Start 7-Day Free Trial
          </button>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 16 }}>
            No credit card · No sign-up · Just try it
          </div>
          <button onClick={() => navigate("/settings")}
            style={{ width: "100%", padding: "11px", borderRadius: 12,
              border: "1.5px solid var(--rule)", background: "transparent",
              color: "var(--ink-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer",
              marginBottom: 8 }}>
            Upgrade to Pro — ₹299/month
          </button>
          <button onClick={() => navigate(-1)}
            style={{ width: "100%", padding: "8px", background: "none", border: "none",
              color: "var(--ink-faint)", fontSize: 12, cursor: "pointer" }}>
            Go back
          </button>
        </div>
      </div>
    )
  }

  // ── Plan too low ──────────────────────────────────────────
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-3xl">
          🔒
        </div>
        <h2 className="text-sm font-semibold text-gray-800 mb-1">
          {info.name} is a {reqPlan.name} feature
        </h2>
        <p className="text-xs text-gray-400 mb-6">
          {info.desc}. Upgrade to {reqPlan.name} to unlock this and all premium features.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <div className="text-[10px] font-medium text-gray-500 mb-3">
            {reqPlan.name} plan includes:
          </div>
          {info.plan === "pro" ? (
            <div className="space-y-2">
              {["Voice agent in 10 Indian languages","Cloud sync across devices",
                "Barcode scanner","Customer purchase history",
                "Day open/close with profit report","Insights & GST reports",
                "Unlimited invoices"].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="text-primary">✓</span> {f}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {["Everything in Pro","Multi-staff login (owner, cashier)",
                "AI product image recognition","Staff audit log",
                "Bulk data export","Priority support"].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-gray-600">
                  <span style={{ color:"#7F77DD" }}>✓</span> {f}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="text-2xl font-semibold" style={{ color: reqPlan.color }}>
            {reqPlan.price}
          </div>
          <div className="text-[10px] text-gray-400">Cancel anytime</div>
        </div>

        <button onClick={() => navigate("/settings")}
          className="btn btn-primary w-full py-2.5 text-xs font-semibold mb-2"
          style={info.plan === "wholesale" ? { background:"#7F77DD", borderColor:"#7F77DD" } : {}}>
          Upgrade to {reqPlan.name}
        </button>
        <button onClick={() => navigate(-1)} className="btn w-full text-xs text-gray-400">
          Go back
        </button>
      </div>
    </div>
  )
}
