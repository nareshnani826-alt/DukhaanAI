import { usePlan } from "../context/PlanContext"
import { useNavigate } from "react-router-dom"

export default function UpgradeWall({ feature, children }) {
  const { hasFeature, isToggledOff, FEATURE_LABELS, PLAN_LABELS } = usePlan()
  const navigate = useNavigate()

  // Feature is accessible — show the actual page
  if (hasFeature(feature)) return children

  const info     = FEATURE_LABELS[feature] || { name: feature, desc:"", plan:"pro" }
  const reqPlan  = PLAN_LABELS[info.plan]  || PLAN_LABELS.pro
  const toggled  = isToggledOff(feature)   // plan allows but vendor turned it off

  // ── Turned off by vendor ──────────────────────────────────
  if (toggled) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-3xl">
            🔕
          </div>
          <h2 className="text-sm font-semibold text-gray-800 mb-1">
            {info.name} is turned off
          </h2>
          <p className="text-xs text-gray-400 mb-6">
            You disabled this feature in Settings. Turn it back on to use it.
          </p>
          <button onClick={() => navigate("/settings")}
            className="btn btn-primary w-full py-2.5 text-xs font-semibold mb-2">
            Go to Settings to enable
          </button>
          <button onClick={() => navigate(-1)} className="btn w-full text-xs text-gray-400">
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
