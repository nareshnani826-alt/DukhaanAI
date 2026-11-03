import { useEffect } from "react"
import { animate } from "motion/react"

// App-wide entrance: when a screen opens, its card-like blocks (stat boxes, list rows,
// tiles, panels) rise in one after another. Works on every page without editing it —
// it finds rounded, filled/bordered blocks in view and animates each once.
//
// Rules that keep it safe:
// - skips fixed/absolute/sticky elements (pop-ups, badges, bars) and everything inside them
// - skips elements that already have a transform or partial opacity (they manage their own look)
// - animates only what is on screen, at most 24 blocks per pass, and restores inline styles after
// - does nothing for people who ask for reduced motion

const MAX_PER_PASS = 24
const SKIP_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA", "SVG", "IMG", "CANVAS", "VIDEO", "LABEL", "OPTION"])

function isCard(el, cs) {
  const h = el.offsetHeight, w = el.offsetWidth
  if (h < 40 || h > 700 || w < 80) return false
  if (parseFloat(cs.borderTopLeftRadius) < 8) return false
  const filled = cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent"
  const bordered = parseFloat(cs.borderTopWidth) >= 1
  const shadowed = cs.boxShadow && cs.boxShadow !== "none"
  return filled || bordered || shadowed || cs.backgroundImage !== "none"
}

function collect(root) {
  const found = []
  const vh = window.innerHeight
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(el) {
      if (SKIP_TAGS.has(el.tagName.toUpperCase())) return NodeFilter.FILTER_REJECT
      if (el.dataset.revealed) return NodeFilter.FILTER_REJECT
      const cs = getComputedStyle(el)
      if (cs.position === "fixed" || cs.position === "absolute" || cs.position === "sticky") return NodeFilter.FILTER_REJECT
      if (cs.display === "none") return NodeFilter.FILTER_REJECT
      if (isCard(el, cs)) {
        el.dataset.revealed = "1"
        const r = el.getBoundingClientRect()
        const usable = cs.transform === "none" && cs.opacity === "1" && r.top < vh + 40 && r.bottom > 0
        if (usable && found.length < MAX_PER_PASS) found.push(el)
        return NodeFilter.FILTER_REJECT          // its children belong to it
      }
      return NodeFilter.FILTER_SKIP
    },
  })
  while (walker.nextNode()) { /* acceptNode does the work */ }
  return found
}

function reveal(els) {
  els.forEach((el, i) => {
    const prev = { opacity: el.style.opacity, transform: el.style.transform }
    const delay = Math.min(i, 12) * 0.035
    // Ends on "none": even an identity transform left behind would re-anchor fixed pop-ups inside the card
    animate(el,
      { opacity: [0, 1], transform: ["translateY(14px)", "none"] },
      { duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] })
    setTimeout(() => { el.style.opacity = prev.opacity; el.style.transform = prev.transform }, (0.38 + delay) * 1000 + 80)
  })
}

export function useAutoReveal(ref, routeKey) {
  useEffect(() => {
    const root = ref.current
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let timer = null
    const pass = () => { timer = null; reveal(collect(root)) }
    const first = setTimeout(pass, 30)
    // Data often arrives a moment later — reveal blocks that appear during the first 2 seconds
    const mo = new MutationObserver(() => { if (!timer) timer = setTimeout(pass, 90) })
    mo.observe(root, { childList: true, subtree: true })
    const stop = setTimeout(() => mo.disconnect(), 2000)
    return () => { clearTimeout(first); clearTimeout(stop); clearTimeout(timer); mo.disconnect() }
  }, [ref, routeKey])
}
