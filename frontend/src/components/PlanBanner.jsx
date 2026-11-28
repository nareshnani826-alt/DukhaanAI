// Free trial / plan banner above every page.
// Last 7 days of the trial: a reminder with the days left. Ended: the shop is locked
// (the server refuses new bills) — say so plainly and that nothing is lost.
import { usePlanStatus } from "./usePlanStatus"
import PayProButton from "./PayProButton"
import { useAuth } from "../context/AuthContext"
import { isNativeApp } from "../utils/features"
import { tr, uiLang } from "../i18n/kiranaStrings"

const L = k => tr(k, uiLang())
const SUPPORT = "support@dukhaanai.in"

export default function PlanBanner() {
  const s = usePlanStatus()
  const { role } = useAuth()
  if (!s || s.days_left == null) return null
  const locked = s.locked
  if (!locked && !(s.days_left <= 7)) return null

  const days = s.days_left
  const text = locked
    ? L("Your free trial has ended. Your bills and stock are safe — renew your plan to keep billing.")
    : `${s.trial ? L("Free trial") : L("Your plan")}: ${days === 1 ? L("1 day left") : `${days} ${L("days left")}`}. ${L("Renew to keep billing without a break.")}`

  return (
    <div role={locked ? "alert" : "status"}
      style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", margin:"10px 16px 0", padding:"10px 14px", borderRadius:14,
        background: locked ? "#fdecea" : "#fff4e0", border:`1px solid ${locked ? "#f1b0a8" : "#f2cf8f"}`,
        color: locked ? "#8e1f14" : "#7a4f0a", fontSize:14, fontWeight:700 }}>
      <span style={{ fontSize:18 }}>{locked ? "🔒" : "⏳"}</span>
      <span style={{ flex:1, minWidth:200 }}>{text}</span>
      {/* Website owner pays right here; the Android app and staff get the contact link */}
      {role === "owner" && !isNativeApp()
        ? <PayProButton className="" style={{ padding:"8px 14px", borderRadius:10, border:"none", cursor:"pointer",
            background: locked ? "#c0392b" : "#d4621f", color:"#fff", fontWeight:800, fontSize:14 }} />
        : <a href={`mailto:${SUPPORT}?subject=${encodeURIComponent("Renew my DukhaanAI plan")}`}
            style={{ padding:"8px 14px", borderRadius:10, background: locked ? "#c0392b" : "#d4621f", color:"#fff", fontWeight:800,
              textDecoration:"none", whiteSpace:"nowrap" }}>
            {L("Contact us to renew")}
          </a>}
    </div>
  )
}
