// Plan status from the server: { days_left, locked, trial, expires_at } — null until loaded
// or when the shop has no account. Used by PlanBanner and Settings.
import { useEffect, useState } from "react"
import { api, isCloud } from "../sync/db"
import { useAuth } from "../context/AuthContext"

export function usePlanStatus() {
  const { vendor } = useAuth()
  const [status, setStatus] = useState(null)
  useEffect(() => {
    if (!vendor || !isCloud()) return
    let live = true
    const load = () => api.get("/auth/plan-status").then(s => { if (live) setStatus(s) }).catch(() => {})
    load()
    const t = setInterval(load, 30 * 60 * 1000)   // a trial can end while the app is open
    return () => { live = false; clearInterval(t) }
  }, [vendor])
  return vendor ? status : null
}
