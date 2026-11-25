// A phone with shop data saved on it (used without an account, or on the Free plan) signs in to a
// Pro account: offer to move that data into the account. Without this the shop looks empty on Pro,
// because Pro reads from the server. The phone keeps a backup copy either way.
import { useEffect, useState } from "react"
import { api } from "../sync/db"
import { useAuth } from "../context/AuthContext"
import { tr, uiLang } from "../i18n/kiranaStrings"

const L = k => tr(k, uiLang())
const KIRANA = "dukaanai_data", CHAI = "dk_chai"
const read = k => { try { return JSON.parse(localStorage.getItem(k) || "null") } catch { return null } }

function summary() {
  const k = read(KIRANA) || {}, c = read(CHAI) || {}
  const s = {
    products: (k.products || []).filter(p => p.is_active !== false).length,
    bills: (k.invoices || []).length,
    khata: (k.udhar_customers || []).length,
    chai: (c.orders || []).length,
  }
  s.any = s.products + s.bills + s.khata + s.chai > 0
  return s
}

export default function MoveToAccount() {
  const { vendor, cloud, role } = useAuth()
  const [s, setS]         = useState(null)
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState("")
  const doneKey = vendor ? `dk_moved_${vendor.id}` : ""
  const laterKey = vendor ? `dk_move_later_${vendor.id}` : ""

  useEffect(() => {
    if (!cloud || role !== "owner" || !vendor) return
    try {
      if (localStorage.getItem(doneKey)) return
      const later = +localStorage.getItem(laterKey) || 0
      if (Date.now() - later < 24 * 3600 * 1000) return       // "Not now" waits a day
    } catch { return }
    const sum = summary()
    if (sum.any) setS(sum)
  }, [cloud, role, vendor?.id])   // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return null

  async function move() {
    setBusy(true); setError("")
    try {
      const res = await api.post("/migrate/import", { kirana: read(KIRANA), chai: read(CHAI) })
      // Keep a backup on the phone, then let the app read from the account
      const stamp = new Date().toISOString().slice(0, 10)
      for (const key of [KIRANA, CHAI]) {
        const v = localStorage.getItem(key)
        if (v) { localStorage.setItem(`${key}_backup_${stamp}`, v); localStorage.removeItem(key) }
      }
      localStorage.setItem(doneKey, JSON.stringify(res))
      window.location.reload()
    } catch (e) { setError(e.message || L("Could not move the data. Check your internet and try again.")); setBusy(false) }
  }

  function later() { try { localStorage.setItem(laterKey, String(Date.now())) } catch {}; setS(null) }

  const n = (count, one, many) => `${count} ${L(count === 1 ? one : many)}`
  const parts = [
    s.products && n(s.products, "product", "products"),
    s.bills && n(s.bills, "bill", "bills"),
    s.khata && n(s.khata, "khata customer", "khata customers"),
    s.chai && n(s.chai, "chai order", "chai orders"),
  ].filter(Boolean).join(", ")

  return (
    <div style={{ position:"fixed", inset:0, zIndex:10000, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:400, background:"var(--bg1, #fff)", borderRadius:18, padding:20, boxShadow:"0 20px 50px rgba(0,0,0,.3)" }}>
        <div style={{ fontSize:34, textAlign:"center" }}>📦➡️☁️</div>
        <div style={{ fontSize:17, fontWeight:900, color:"var(--ink)", textAlign:"center", marginTop:8 }}>{L("Move your shop data to your account?")}</div>
        <div style={{ fontSize:13, color:"var(--ink-dim)", textAlign:"center", marginTop:8, lineHeight:1.5 }}>
          {L("We found data saved on this phone")}: <b>{parts}</b>.
          {" "}{L("Move it to")} <b>{vendor?.store_name}</b> {L("so it is safe online and shows on every phone you sign in on.")}
        </div>
        {error && <div style={{ fontSize:12, color:"#c0392b", marginTop:10, textAlign:"center" }}>{error}</div>}
        <button onClick={move} disabled={busy}
          style={{ width:"100%", marginTop:16, padding:"14px", borderRadius:12, border:"none", background:"#1D9E75", color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer", opacity: busy ? .6 : 1 }}>
          {busy ? L("Moving… please don't close the app") : L("Move to my account")}
        </button>
        {!busy && (
          <button onClick={later}
            style={{ width:"100%", marginTop:8, padding:"11px", borderRadius:12, border:"1px solid var(--rule)", background:"transparent", color:"var(--ink-dim)", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            {L("Not now")}
          </button>
        )}
        <div style={{ fontSize:11, color:"var(--ink-faint)", textAlign:"center", marginTop:10 }}>{L("A backup copy stays on this phone.")}</div>
      </div>
    </div>
  )
}
