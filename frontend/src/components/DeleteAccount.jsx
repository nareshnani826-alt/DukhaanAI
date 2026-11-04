// Delete account (Google Play requires in-app account deletion).
// Signed in as owner: password check → server deletes the shop and all its data → this phone is wiped.
// Not signed in (free, data only on this phone): wipes the data stored on this phone.
// Staff logins see nothing — only the owner can delete the shop.
import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../sync/db"
import { tr, uiLang } from "../i18n/kiranaStrings"

const L = k => tr(k, uiLang())

async function wipeThisPhone() {
  try { localStorage.clear() } catch {}
  try { sessionStorage.clear() } catch {}
  try { indexedDB.deleteDatabase("dukaanai-offline") } catch {}
  try {
    if (window.caches) for (const k of await caches.keys()) await caches.delete(k)
  } catch {}
}

const inputStyle = {
  width:"100%", padding:"9px 12px", borderRadius:9,
  border:"1.5px solid var(--rule)", fontSize:13,
  background:"var(--bg2)", color:"var(--ink)", outline:"none",
}

export default function DeleteAccount() {
  const { vendor, role } = useAuth()
  const [open, setOpen]         = useState(false)
  const [password, setPassword] = useState("")
  const [sure, setSure]         = useState(false)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState("")

  if (vendor && role !== "owner") return null
  const signedIn = !!vendor

  async function confirm() {
    setBusy(true); setError("")
    try {
      if (signedIn) await api.post("/auth/me/delete", { password })
      await wipeThisPhone()
      window.location.replace("/")
    } catch (e) {
      setError(e.message || L("Could not delete. Check your internet and try again."))
      setBusy(false)
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="btn w-full text-xs text-red-600 hover:bg-red-50 border-red-200 py-2 mt-2">
      {L(signedIn ? "Delete my account" : "Delete all data on this phone")}
    </button>
  )

  return (
    <div style={{ marginTop:10, padding:12, borderRadius:10, border:"1.5px solid #fecaca", background:"rgba(254,226,226,0.35)" }}>
      <div style={{ fontSize:13, fontWeight:800, color:"#b91c1c", marginBottom:6 }}>
        {L(signedIn ? "Delete my account" : "Delete all data on this phone")}
      </div>
      <div style={{ fontSize:12, color:"var(--ink)", lineHeight:1.5, marginBottom:10 }}>
        {signedIn
          ? L("This permanently deletes your shop account and everything in it: products, stock, bills, khata, customers, staff logins and reports. Your paid plan is cancelled. This cannot be undone.")
          : L("This permanently deletes every product, bill and khata entry saved on this phone. This cannot be undone.")}
      </div>
      {signedIn && (
        <input type="password" value={password} autoComplete="current-password"
          onChange={e => setPassword(e.target.value)}
          placeholder={L("Type your password")} style={{ ...inputStyle, marginBottom:8 }} />
      )}
      <label style={{ display:"flex", gap:8, alignItems:"flex-start", fontSize:12, color:"var(--ink)", marginBottom:10, cursor:"pointer" }}>
        <input type="checkbox" checked={sure} onChange={e => setSure(e.target.checked)} style={{ marginTop:2 }} />
        <span>{L("I understand my data cannot be recovered")}</span>
      </label>
      {error && <div style={{ fontSize:12, color:"#b91c1c", marginBottom:8 }}>{error}</div>}
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => { setOpen(false); setPassword(""); setSure(false); setError("") }} disabled={busy}
          className="btn flex-1 text-xs py-2">
          {L("Cancel")}
        </button>
        <button onClick={confirm} disabled={busy || !sure || (signedIn && !password)}
          style={{
            flex:1, padding:"8px 12px", borderRadius:9, border:"none", fontSize:12, fontWeight:700,
            color:"#fff", background:"#dc2626", cursor:"pointer",
            opacity: (busy || !sure || (signedIn && !password)) ? 0.5 : 1,
          }}>
          {busy ? L("Deleting…") : L("Delete forever")}
        </button>
      </div>
    </div>
  )
}
