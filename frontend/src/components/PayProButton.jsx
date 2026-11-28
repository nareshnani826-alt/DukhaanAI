// "Pay ₹299" — website only (the Android app must use Google Play Billing) and owner only
// (the server allows /subscriptions for owners). Adds 30 days of Pro after the payment is verified.
import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { getVendor, setVendor } from "../sync/db"
import { isNativeApp } from "../utils/features"
import { payForPro } from "../utils/razorpay"
import { tr, uiLang, dateLocale } from "../i18n/kiranaStrings"

const L = k => tr(k, uiLang())

export default function PayProButton({ label, style, className = "btn btn-primary" }) {
  const { vendor, role } = useAuth()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg]   = useState(null)   // { ok, text }
  if (!vendor || role !== "owner" || isNativeApp()) return null

  async function pay() {
    setBusy(true); setMsg(null)
    try {
      const r = await payForPro()
      // The shop is Pro now (a Free shop too): remember it so the app reads the cloud after reload
      try { const v = getVendor(); if (v) setVendor({ ...v, plan: "pro" }) } catch { /* ignore */ }
      const until = r?.plan_expires_at ? new Date(r.plan_expires_at).toLocaleDateString(dateLocale(), { day:"numeric", month:"short", year:"numeric" }) : ""
      setMsg({ ok: true, text: `${L("Payment received")} ✓ ${until ? `${L("Pro until")} ${until}` : ""}` })
      setTimeout(() => window.location.reload(), 2500)
    } catch (e) {
      if (!e?.cancelled) setMsg({ ok: false, text: e?.message || L("Payment did not go through. Please try again.") })
      setBusy(false)
    }
  }

  return (
    <span style={{ display:"inline-flex", flexDirection:"column", gap:6 }}>
      <button onClick={pay} disabled={busy} className={className} style={{ whiteSpace:"nowrap", opacity: busy ? 0.7 : 1, ...style }}>
        {msg?.ok ? `${L("Paid")} ✓` : busy ? L("Opening payment…") : (label || L("Pay ₹299 · 30 days"))}
      </button>
      {msg && <span role="status" style={{ fontSize:12, fontWeight:700, color: msg.ok ? "var(--jade, #1D9E75)" : "#c0392b" }}>{msg.text}</span>}
    </span>
  )
}
