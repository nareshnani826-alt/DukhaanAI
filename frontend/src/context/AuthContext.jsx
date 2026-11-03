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
  const role       = vendor?.role || "owner"   // staff sign-ins carry "manager" / "cashier"

  useEffect(() => {
    function onLogout() { setVendorState(null) }
    window.addEventListener("dk:logout", onLogout)
    return () => window.removeEventListener("dk:logout", onLogout)
  }, [])

  // Owner turns shop types (kirana / bangle_fancy / chai) on or off
  async function setModules(modules) {
    const d = await api.patch("/auth/me", { modules })
    const v = { ...vendor, modules: d.modules || modules }
    setVendor(v); setVendorState(v)
    return v
  }

  // shopType: which of this login's shops to open (kirana / chai / bangle_fancy). Left out, the shop
  // in use on this device is asked for; null asks for none (the server picks or lists the shops).
  const deviceShop = () => { try { return localStorage.getItem("storeMode") || null } catch { return null } }

  async function login(identifier, password, remember = true, shopType) {
    setLoading(true); setError("")
    try {
      const d = await api.post("/auth/login", { identifier, password, shop_type: shopType === undefined ? deviceShop() : shopType })
      setTokens(d.access_token, d.refresh_token, remember)
      const v = { id: d.vendor_id, store_name: d.store_name, plan: d.plan, modules: d.modules || ["kirana"] }
      setVendor(v); setVendorState(v)
      return d
    } catch(e) { setError(e.message); throw e }
    finally { setLoading(false) }
  }

  // Staff sign in on the shop's device with the shop's phone/email + their username + PIN
  async function staffLogin(shop, username, pin, remember = true, shopType) {
    setLoading(true); setError("")
    try {
      const d = await api.post("/auth/staff-login", { shop, username, pin, shop_type: shopType === undefined ? deviceShop() : shopType })
      setTokens(d.access_token, d.refresh_token, remember)
      const v = { id: d.vendor_id, store_name: d.store_name, plan: d.plan, modules: d.modules || ["kirana"],
        role: d.role, staff_name: d.staff_name }
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

  async function forgotPassword(email, shopType) {
    setLoading(true); setError("")
    try { return await api.post("/auth/forgot-password", { email, shop_type: shopType ?? null }) }
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
    <AuthCtx.Provider value={{ vendor, loggedIn, cloud, hasModule, setModules, role, loading, error, setError, login, staffLogin, register, registerConfirm, sendOtp, verifyOtp, forgotPassword, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
