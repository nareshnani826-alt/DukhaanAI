import { createContext, useContext, useState, useEffect } from "react"
import { api, setTokens, setVendor, clearAuth, getVendor, getToken, isCloud, getRefresh } from "../sync/db"

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [vendor, setVendorState] = useState(getVendor)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  // Derived from vendor state — reactive when login/logout changes vendor
  const loggedIn = !!vendor
  const cloud    = !!vendor && ["pro","wholesale"].includes(vendor?.plan)

  // Handle session expiry from auto-refresh failure
  useEffect(() => {
    function onLogout() { setVendorState(null) }
    window.addEventListener("dk:logout", onLogout)
    return () => window.removeEventListener("dk:logout", onLogout)
  }, [])

  async function login(email, password) {
    setLoading(true); setError("")
    try {
      const d = await api.post("/auth/login", { email, password })
      setTokens(d.access_token, d.refresh_token)
      const v = { id:d.vendor_id, store_name:d.store_name, plan:d.plan }
      setVendor(v); setVendorState(v)
      return d
    } catch(e) { setError(e.message); throw e }
    finally { setLoading(false) }
  }

  async function register(data) {
    setLoading(true); setError("")
    try {
      const d = await api.post("/auth/register", data)
      setTokens(d.access_token, d.refresh_token)
      const v = { id:d.vendor_id, store_name:d.store_name, plan:d.plan }
      setVendor(v); setVendorState(v)
      return d
    } catch(e) { setError(e.message); throw e }
    finally { setLoading(false) }
  }

  async function logout() {
    const r = getRefresh()
    if (r) await api.post("/auth/logout", { refresh_token: r }).catch(()=>{})
    clearAuth(); setVendorState(null)
  }

  return (
    <AuthCtx.Provider value={{ vendor, loggedIn, cloud, loading, error, setError, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
