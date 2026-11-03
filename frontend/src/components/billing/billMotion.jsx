import { useEffect } from "react"
import { motion, useMotionValue, useTransform, animate } from "motion/react"

// Motion pieces for the Billing screen: animated rupee total and icons (hooks live in billHooks.jsx).

const inr = (v, decimals) => "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

// Rupee amount that springs to each new value instead of jumping.
// Pass from={0} to count up when it first appears (dashboard figures).
export function AnimatedAmount({ value, from, style, className }) {
  const mv = useMotionValue(from ?? value)
  const decimals = useMotionValue(Number.isInteger(value) ? 0 : 2)   // whole rupees stay whole while counting
  const text = useTransform(() => inr(decimals.get() ? mv.get() : Math.round(mv.get()), decimals.get()))
  useEffect(() => {
    decimals.set(Number.isInteger(value) ? 0 : 2)
    const controls = animate(mv, value, { type: "spring", bounce: 0, visualDuration: 0.45 })
    return () => controls.stop()
  }, [value, mv, decimals])
  return <motion.span className={className} style={style}>{text}</motion.span>
}

// ── Icons (Lucide paths, 24×24 stroke) ───────────────────────
const PATHS = {
  search:  <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
  mic:     <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></>,
  scan:    <><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M17 7v10"/></>,
  x:       <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
  trash:   <><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
  plus:    <><path d="M5 12h14"/><path d="M12 5v14"/></>,
  minus:   <path d="M5 12h14"/>,
  receipt: <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></>,
  pause:   <><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></>,
  zap:     <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>,
  cart:    <><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></>,
}
export function BillIcon({ name, size = 20, stroke = 2.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {PATHS[name]}
    </svg>
  )
}
