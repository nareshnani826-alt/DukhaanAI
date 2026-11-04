// Android back button (Play Store app only). Without this the app closes on every back press.
//  - An open pop-up can claim the press: listen for "dk:back" and call e.preventDefault().
//  - Inside the app: go to the previous screen, or to the shop's home if there is none.
//  - On a home screen: first press shows "Press back again to exit", second press within 2 s exits.
import { useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { isNativeApp } from "../utils/features"

const SHOP_HOME    = { kirana:"/dashboard", chai:"/chai-dashboard", bangle_fancy:"/bangle-dashboard" }
const CASHIER_HOME = { kirana:"/billing",   chai:"/chai-billing",   bangle_fancy:"/bangle-billing" }
const ALWAYS_HOME  = ["/", "/kirana", "/chai", "/onboarding"]

function toast(text) {
  try {
    document.getElementById("dk-back-toast")?.remove()
    const el = document.createElement("div")
    el.id = "dk-back-toast"
    el.textContent = text
    el.style.cssText = "position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);" +
      "background:rgba(20,20,20,0.88);color:#fff;font-size:13px;padding:9px 16px;border-radius:20px;z-index:99999;pointer-events:none"
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 2000)
  } catch {}
}

// The top full-screen pop-up (dark backdrop) currently open, if any
function topOverlay() {
  const vw = window.innerWidth, vh = window.innerHeight
  let best = null, bestZ = -Infinity
  for (const el of document.body.querySelectorAll("div")) {
    const cs = getComputedStyle(el)
    if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden" || cs.pointerEvents === "none") continue
    const r = el.getBoundingClientRect()
    if (r.width < vw * 0.95 || r.height < vh * 0.95) continue
    const z = parseInt(cs.zIndex) || 0
    if (z >= bestZ) { best = el; bestZ = z }
  }
  return best
}

// Tap the backdrop of the top pop-up. Resolves true if that closed it.
function closeTopOverlay() {
  const el = topOverlay()
  if (!el) return Promise.resolve(false)
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
  return new Promise(res => setTimeout(() => res(!el.isConnected || topOverlay() !== el), 80))
}

export default function AndroidBackButton() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { vendor, role } = useAuth()
  const state = useRef({})
  state.current = { pathname, vendor, role, navigate }
  const lastPress = useRef(0)

  useEffect(() => {
    if (!isNativeApp()) return
    let handle
    let cancelled = false
    async function onBack(exitApp) {
        const { vendor, role, navigate } = state.current
        // 1. An open pop-up / sheet closes first (its own "dk:back" handler, else its backdrop)
        const ev = new CustomEvent("dk:back", { cancelable: true })
        if (!window.dispatchEvent(ev)) return
        if (await closeTopOverlay()) return
        const pathname = window.location.pathname

        const shop = (() => { try { return localStorage.getItem("storeMode") || "kirana" } catch { return "kirana" } })()
        // Home = the shop's dashboard (also for "use without account" on this phone); cashiers: billing
        const home = vendor && role === "cashier" ? (CASHIER_HOME[shop] || "/billing") : (SHOP_HOME[shop] || "/dashboard")
        const atHome = pathname === home || ALWAYS_HOME.includes(pathname)

        // 2. Inside the app: previous screen, else home
        if (!atHome) {
          if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
          else navigate(home, { replace: true })
          return
        }
        // 3. Home screen: press twice to exit
        const now = Date.now()
        if (now - lastPress.current < 2000) exitApp()
        else { lastPress.current = now; toast("Press back again to exit") }
    }
    window.__dkBack = () => onBack(() => { window.__dkExited = true })   // for automated tests
    import("@capacitor/app").then(({ App }) => App.addListener("backButton", () => onBack(() => App.exitApp())))
      .then(h => { if (cancelled) h.remove(); else handle = h }).catch(() => {})
    return () => { cancelled = true; handle?.remove() }
  }, [])

  return null
}
