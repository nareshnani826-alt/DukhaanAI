import { createContext, useContext, useState, useEffect } from "react"
import { api, setTokens, setVendor, clearAuth, getVendor, getToken, isCloud, getRefresh } from "../sync/db"

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [vendor, setVendorState] = useState(getVendor)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  const loggedIn   = !!vendor
  const cloud      = !!vendor && ["pro","wholesale"].includes(vendor?.plan)
  const hasModule  = (m) => vendor?.modules?.includes(m) ?? (m === "kirana")

  useEffect(() => {
    function onLogout() { setVendorState(null) }
    window.addEventListener("dk:logout", onLogout)
    return () => window.removeEventListener("dk:logout", onLogout)
  }, [])

  async function login(identifier, password, remember = true) {
    setLoading(true); setError("")
    try {
      const d = await api.post("/auth/login", { identifier, password })
      setTokens(d.access_token, d.refresh_token, remember)
      const v = { id: d.vendor_id, store_name: d.store_name, plan: d.plan, modules: d.modules || ["kirana"] }
      setVendor(v); setVendorState(v)
      return d
    } catch(e) { setError(e.message); throw e }
    finally { setLoading(false) }
  }

  async function register(data) {
    setLoading(true); setError("")
    try {
      const d = await api.post("/auth/register", data)
      // Phone provided → backend returns {status:"otp_required"} — don't log in yet
      if (d.status === "otp_required") return d   // { status, email, pending_token }
      // No phone → account created immediately
      setTokens(d.access_token, d.refresh_token, true)
      const v = { id: d.vendor_id, store_name: d.store_name, plan: d.plan, modules: d.modules || ["kirana"] }
      setVendor(v); setVendorState(v)
      return d
    } catch(e) { setError(e.message); throw e }
    finally { setLoading(false) }
  }

  async function registerConfirm(pendingToken, otp, remember = true) {
    setLoading(true); setError("")
    try {
      const d = await api.post("/auth/register/confirm", { pending_token: pendingToken, otp })
      setTokens(d.access_token, d.refresh_token, remember)
      const v = { id: d.vendor_id, store_name: d.store_name, plan: d.plan, modules: d.modules || ["kirana"] }
      setVendor(v); setVendorState(v)
      return d
    } catch(e) { setError(e.message); throw e }
    finally { setLoading(false) }
  }

  async function sendOtp(phone) {
    setLoading(true); setError("")
    try { return await api.post("/auth/send-otp", { phone }) }
    catch(e) { setError(e.message); throw e }
    finally { setLoading(false) }
  }

  async function verifyOtp(phone, otp, remember = true) {
    setLoading(true); setError("")
    try {
      const d = await api.post("/auth/verify-otp", { phone, otp })
      setTokens(d.access_token, d.refresh_token, remember)
      const v = { id: d.vendor_id, store_name: d.store_name, plan: d.plan, modules: d.modules || ["kirana"] }
      setVendor(v); setVendorState(v)
      return d
    } catch(e) { setError(e.message); throw e }
    finally { setLoading(false) }
  }

  async function forgotPassword(email) {
    setLoading(true); setError("")
    try { return await api.post("/auth/forgot-password", { email }) }
    catch(e) { setError(e.message); throw e }
    finally { setLoading(false) }
  }

  async function logout() {
    const r = getRefresh()
    if (r) await api.post("/auth/logout", { refresh_token: r }).catch(() => {})
    clearAuth()
    window.location.href = "/"
  }

  return (
    <AuthCtx.Provider value={{ vendor, loggedIn, cloud, hasModule, loading, error, setError, login, register, registerConfirm, sendOtp, verifyOtp, forgotPassword, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
