import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"

// Billing hooks: fly-to-bill animation layer and the wide-screen check.

// A small "+1 Item" chip that arcs from the tapped product into the bill.
// The bill total marks itself with data-bill-target; the first visible one is the destination.
export function useFlyToBill() {
  const reduce = useReducedMotion()
  const [flights, setFlights] = useState([])
  const nextId = useRef(0)

  const fly = useCallback((fromEl, label) => {
    if (reduce || !fromEl) return
    const a = fromEl.getBoundingClientRect()
    const target = [...document.querySelectorAll("[data-bill-target]")].find(el => el.offsetParent)
    const b = target
      ? target.getBoundingClientRect()
      : { left: window.innerWidth / 2 - 40, top: window.innerHeight - 150, width: 80, height: 40 }  // where the phone bar appears
    const from = { x: a.left + a.width / 2, y: a.top + a.height / 2 }
    const to   = { x: b.left + b.width / 2, y: b.top + b.height / 2 }
    const id = nextId.current++
    setFlights(f => [...f.slice(-5), { id, from, dx: to.x - from.x, dy: to.y - from.y, label }])
  }, [reduce])

  const layer = (
    <AnimatePresence>
      {flights.map(f => (
        <motion.div key={f.id} aria-hidden="true"
          initial={{ x: 0, y: 0, scale: 0.6, opacity: 0 }}
          animate={{
            x: [0, f.dx * 0.45, f.dx], y: [0, f.dy * 0.45 - 90, f.dy],
            scale: [0.6, 1, 0.45], opacity: [0, 1, 0.9, 0],
          }}
          transition={{ duration: 0.62, ease: [0.33, 0, 0.2, 1], opacity: { duration: 0.62, times: [0, 0.15, 0.8, 1] } }}
          onAnimationComplete={() => setFlights(list => list.filter(x => x.id !== f.id))}
          style={{ position: "fixed", left: f.from.x, top: f.from.y, zIndex: 320, pointerEvents: "none",
            translateX: "-50%", translateY: "-50%", whiteSpace: "nowrap",
            background: "var(--saffron)", color: "#fff", borderRadius: 999, padding: "6px 12px",
            fontSize: 13, fontWeight: 800, boxShadow: "0 6px 18px rgba(232,119,34,0.45)" }}>
          +1 {f.label}
        </motion.div>
      ))}
    </AnimatePresence>
  )
  return { fly, layer }
}

// True on screens wide enough to show the bill beside the products
export function useWideBilling(query = "(min-width: 1024px)") {
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setWide(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [query])
  return wide
}
