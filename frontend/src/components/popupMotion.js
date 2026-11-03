// Shared enter/exit motion for pop-ups. Spread onto motion elements inside <AnimatePresence>:
//   <motion.div {...backdrop}> dimmed overlay  →  <motion.div {...sheet}> panel

// Dimmed background fades in and out
export const backdrop = {
  initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 },
  transition: { duration: 0.2 },
}

// Bottom sheet slides up from the edge of the screen
export const sheet = {
  initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" },
  transition: { type: "spring", bounce: 0, visualDuration: 0.32 },
}

// Centred dialog rises and settles
export const pop = {
  initial: { opacity: 0, y: 24, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 16, scale: 0.98 },
  transition: { type: "spring", bounce: 0.15, visualDuration: 0.3 },
}

// "Done" screens: the tick pops in with a bounce, then the rest rises in turn.
// Use initial="hidden" animate="show" with variants={celebrate.list} on the parent.
export const celebrate = {
  list: { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2, staggerChildren: 0.08, delayChildren: 0.12 } } },
  tick: { hidden: { scale: 0, rotate: -40 }, show: { scale: 1, rotate: 0, transition: { type: "spring", bounce: 0.5, visualDuration: 0.5 } } },
  ring: { hidden: { scale: 1, opacity: 0.5 }, show: { scale: 1.9, opacity: 0, transition: { duration: 0.9, ease: "easeOut", delay: 0.2 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, visualDuration: 0.35 } } },
}

// Panel that is a bottom sheet on phones and centred on desktop
export const rise = {
  initial: { opacity: 0, y: 80 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 80 },
  transition: { type: "spring", bounce: 0, visualDuration: 0.32 },
}
