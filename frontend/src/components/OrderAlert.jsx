// New QR-order alert, shown on every screen of the owner app (Pro shops with QR ordering on).
// Checks every 6 s while the app is open. A new order rings loudly (and vibrates) until someone
// taps the banner. Push notifications for when the app is closed are a later stage.
import { useEffect, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { api } from "../sync/db"
import { useAuth } from "../context/AuthContext"
import { tr, uiLang } from "../i18n/kiranaStrings"

const L = k => tr(k, uiLang())
const SEEN_KEY = "dk_order_alert_seen"   // newest order already acknowledged on this phone

let ctx = null
function audio() {
  try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)() } catch { return null }
  if (ctx.state === "suspended") ctx.resume().catch(() => {})
  return ctx
}
// Browsers only allow sound after the first tap: wake the audio on any tap
if (typeof window !== "undefined") {
  const unlock = () => { audio(); window.removeEventListener("pointerdown", unlock) }
  window.addEventListener("pointerdown", unlock)
}

function ringOnce() {
  const a = audio(); if (!a) return
  const t0 = a.currentTime
  ;[[880, 0], [1175, 0.18], [880, 0.36], [1175, 0.54]].forEach(([f, at]) => {
    const o = a.createOscillator(), g = a.createGain()
    o.type = "square"; o.frequency.value = f
    g.gain.setValueAtTime(0.0001, t0 + at)
    g.gain.exponentialRampToValueAtTime(0.35, t0 + at + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.16)
    o.connect(g).connect(a.destination); o.start(t0 + at); o.stop(t0 + at + 0.17)
  })
  try { navigator.vibrate?.([300, 120, 300]) } catch {}
}

export default function OrderAlert() {
  const { cloud } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [enabled, setEnabled] = useState(false)
  const [pending, setPending] = useState({ count: 0, latest: null })
  const [ringing, setRinging] = useState(false)
  const seen = useRef((() => { try { return localStorage.getItem(SEEN_KEY) || "" } catch { return "" } })())
  const onOrders = pathname === "/online-orders"

  // Is QR ordering switched on? (re-checked when the owner changes it or every 2 min)
  useEffect(() => {
    if (!cloud) return
    let stop = false
    const check = () => api.get("/online-orders/settings").then(s => !stop && setEnabled(!!s.enabled)).catch(() => {})
    check()
    const t = setInterval(check, 120000)
    window.addEventListener("dk:orders-changed", check)
    return () => { stop = true; clearInterval(t); window.removeEventListener("dk:orders-changed", check) }
  }, [cloud])

  // Poll for new orders while the app is visible
  useEffect(() => {
    if (!cloud || !enabled) return
    let stop = false, t
    const poll = async () => {
      if (document.visibilityState === "visible") {
        try {
          const d = await api.get("/online-orders/pending-count")
          if (stop) return
          setPending(d)
          if (d.count > 0 && d.latest && d.latest.id !== seen.current) setRinging(true)
          if (d.count === 0) setRinging(false)
        } catch {}
      }
      if (!stop) t = setTimeout(poll, 6000)
    }
    poll()
    const refresh = () => { clearTimeout(t); poll() }
    window.addEventListener("dk:orders-changed", refresh)
    return () => { stop = true; clearTimeout(t); window.removeEventListener("dk:orders-changed", refresh) }
  }, [cloud, enabled])

  // Ring every 2.5 s until acknowledged
  useEffect(() => {
    if (!ringing) return
    ringOnce()
    const t = setInterval(ringOnce, 2500)
    return () => clearInterval(t)
  }, [ringing])

  function acknowledge() {
    setRinging(false)
    if (pending.latest) { seen.current = pending.latest.id; try { localStorage.setItem(SEEN_KEY, pending.latest.id) } catch {} }
  }

  // On the orders screen itself the list shows them: stop ringing once it's open
  useEffect(() => { if (onOrders && ringing) acknowledge() }, [onOrders, ringing])   // eslint-disable-line react-hooks/exhaustive-deps

  if (!cloud || !enabled || pending.count === 0 || onOrders) return null
  return (
    <button onClick={() => { acknowledge(); navigate("/online-orders") }}
      style={{ position:"fixed", left:12, right:12, top:"calc(10px + env(safe-area-inset-top, 0px))", zIndex:80,
        display:"flex", alignItems:"center", gap:10, padding:"13px 16px", borderRadius:16, border:"none", cursor:"pointer",
        background: ringing ? "linear-gradient(135deg,#e87722,#c25500)" : "#1f1208", color:"#fff", textAlign:"left",
        boxShadow:"0 10px 28px rgba(0,0,0,.3)", animation: ringing ? "dkPulse 1s ease-in-out infinite" : "none" }}>
      <style>{`@keyframes dkPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}`}</style>
      <span style={{ fontSize:24 }}>🔔</span>
      <span style={{ flex:1, fontSize:15, fontWeight:800 }}>
        {pending.count === 1 ? L("New online order") : `${pending.count} ${L("new online orders")}`}
        <span style={{ display:"block", fontSize:12, fontWeight:600, opacity:.85 }}>{L("Tap to see and accept")}</span>
      </span>
      <span style={{ fontSize:18, fontWeight:900 }}>→</span>
    </button>
  )
}
