import { useEffect, useRef, useState } from "react"
import {
  motion, AnimatePresence, useInView, useMotionValue, useMotionTemplate,
  useReducedMotion, useScroll, useSpring, useTransform, animate,
} from "motion/react"
import { rootScroller } from "./utils"

// Shared building blocks for the public homepage.

// ── Icons (Lucide paths, 24×24 stroke) ───────────────────────
const ICONS = {
  mic:      <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></>,
  scan:     <><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M17 7v10"/></>,
  book:     <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
  bell:     <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  wifiOff:  <><path d="M12 20h.01"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/><path d="M5 12.86a10 10 0 0 1 5.17-2.69"/><path d="M19 12.86a10 10 0 0 0-2-1.52"/><path d="M2 8.82a15 15 0 0 1 4.18-2.64"/><path d="M22 8.82a15 15 0 0 0-11.29-3.76"/><path d="m2 2 20 20"/></>,
  receipt:  <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></>,
  languages:<><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></>,
  check:    <path d="M20 6 9 17l-5-5"/>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></>,
  arrow:    <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
  shield:   <><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></>,
  chart:    <><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></>,
  chevron:  <path d="m6 9 6 6 6-6"/>,
  sun:      <><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></>,
  moon:     <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>,
  users:    <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  store:    <><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></>,
  coffee:   <><path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/></>,
  gem:      <><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></>,
  qr:       <><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></>,
  truck:    <><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></>,
  utensils: <><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></>,
  calendar: <><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></>,
  zap:      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>,
}
export function Icon({ name, size = 22, stroke = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      style={{ width:`calc(${size}px * var(--k, 1))`, height:`calc(${size}px * var(--k, 1))`, flexShrink:0 }}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}

export function LogoMark({ size = 38 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:size * 0.27, flexShrink:0,
      background:"linear-gradient(135deg,#e87722,#c25500)",
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M8 23 L24 11 L40 23 Z" fill="white"/>
        <rect x="9" y="23" width="30" height="17" rx="1" fill="white"/>
        <path d="M18.5 40 L18.5 33 C18.5 29.96 21 28 24 28 C27 28 29.5 29.96 29.5 33 L29.5 40 Z" fill="#e87722"/>
        <circle cx="38.5" cy="9.5" r="6" fill="#1D9E75"/>
        <line x1="38.5" y1="6.5" x2="38.5" y2="12.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="35.5" y1="9.5" x2="41.5" y2="9.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

// Fades a block up the first time it scrolls into view
export function Reveal({ children, delay = 0, className, style, as = "div" }) {
  const M = motion[as]
  return (
    <M className={className} style={style}
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ type: "spring", bounce: 0, visualDuration: 0.5, delay }}>
      {children}
    </M>
  )
}

// Thin saffron bar across the top that fills as the page is read
export function ScrollProgress() {
  const { scrollYProgress } = useScroll({ container: rootScroller })
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 32, restDelta: 0.001 })
  return <motion.div className="hm-progress" style={{ scaleX }} aria-hidden="true"/>
}

// Leans toward the mouse pointer and springs back — desktop pointers only
export function Magnetic({ children, strength = 0.3 }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const x = useSpring(0, { stiffness: 260, damping: 18, mass: 0.4 })
  const y = useSpring(0, { stiffness: 260, damping: 18, mass: 0.4 })
  function move(e) {
    if (reduce || e.pointerType !== "mouse") return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  function leave() { x.set(0); y.set(0) }
  return (
    <motion.div ref={ref} className="hm-mag" style={{ x, y }} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </motion.div>
  )
}

// Card with a glow that follows the cursor and a slight 3D tilt
export function SpotlightCard({ children, className, delay = 0 }) {
  const reduce = useReducedMotion()
  const mx = useMotionValue(-400)
  const my = useMotionValue(-400)
  const rotateX = useSpring(0, { stiffness: 180, damping: 18 })
  const rotateY = useSpring(0, { stiffness: 180, damping: 18 })
  const glow = useMotionTemplate`radial-gradient(360px circle at ${mx}px ${my}px, rgba(232,119,34,0.16), transparent 70%)`

  function move(e) {
    if (e.pointerType !== "mouse") return
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left, py = e.clientY - r.top
    mx.set(px); my.set(py)
    if (!reduce) { rotateY.set((px / r.width - 0.5) * 7); rotateX.set(-(py / r.height - 0.5) * 7) }
  }
  function leave() { mx.set(-400); my.set(-400); rotateX.set(0); rotateY.set(0) }

  return (
    <motion.div className={className} onPointerMove={move} onPointerLeave={leave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} whileHover="hover"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ type: "spring", bounce: 0, visualDuration: 0.5, delay }}>
      <motion.div className="hm-spot" style={{ background: glow }} aria-hidden="true"/>
      {children}
    </motion.div>
  )
}

// Number that counts up the first time it is seen
export function CountUp({ to, prefix = "", suffix = "" }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const value = useMotionValue(0)
  const text = useTransform(() => `${prefix}${Math.round(value.get())}${suffix}`)
  useEffect(() => {
    if (!inView) return
    const controls = animate(value, to, { duration: 1.4, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [inView, to, value])
  return <motion.span ref={ref}>{text}</motion.span>
}

// Cycles through words in place (stays on the first word for reduced motion)
export function WordRotator({ words, interval = 2000, className }) {
  const [i, setI] = useState(0)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setI(n => (n + 1) % words.length), interval)
    return () => clearInterval(id)
  }, [reduce, words.length, interval])
  return (
    <span className={className} aria-hidden="true" style={{ display: "inline-grid", verticalAlign: "bottom" }}>
      <AnimatePresence initial={false}>
        <motion.span key={words[i]} style={{ gridArea: "1 / 1", whiteSpace: "nowrap" }}
          initial={{ y: "70%", opacity: 0, filter: "blur(6px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-70%", opacity: 0, filter: "blur(6px)" }}
          transition={{ type: "spring", bounce: 0.2, visualDuration: 0.5 }}>
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

// Heading whose words rise in one after another when scrolled into view
export function WordsReveal({ text, className, style }) {
  const words = text.split(" ")
  return (
    <motion.h2 className={className} style={style} aria-label={text}
      initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.6 }}
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true" style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: 4 }}>
          <motion.span style={{ display: "inline-block" }}
            variants={{ hidden: { y: "110%" }, show: { y: "0%", transition: { type: "spring", bounce: 0, visualDuration: 0.6 } } }}>
            {w}{i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.h2>
  )
}
