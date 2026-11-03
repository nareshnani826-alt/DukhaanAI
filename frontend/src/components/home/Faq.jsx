import { useId, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Icon, Reveal } from "./kit"

const QUESTIONS = [
  { q:"Is DukaanAI really free?",
    a:"Yes. The Free plan costs nothing and has no time limit. Move to Pro (₹299/month) only when you want voice billing, barcode scanning and cloud sync." },
  { q:"Do I need internet to use it?",
    a:"No. You can keep billing without internet. With Pro, everything is also backed up to the cloud when you're back online, so you can see it from any device." },
  { q:"Which languages does it understand?",
    a:"Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi and English — including the mixed way most of us speak at the counter." },
  { q:"Do I need to buy a barcode scanner?",
    a:"No. Your phone's camera scans barcodes. Products without a barcode are added once by name and picked with a tap or by voice when billing." },
  { q:"Does it work on iPhone or a computer?",
    a:"The Android app is a free download. On an iPhone, laptop or desktop, open dukhaanai.in in the browser and sign in — it's the same shop and the same data." },
  { q:"I run a bangle or fancy store. Will it work for me?",
    a:"Yes. DukaanAI has a separate bangle and fancy store mode with its own stock, billing and a festival calendar for the busy seasons." },
]

function Item({ q, a, open, onToggle }) {
  const id = useId()
  return (
    <div className={`hm-faq-item ${open ? "is-open" : ""}`}>
      <button className="hm-faq-q" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <span>{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type:"spring", bounce:0, visualDuration:0.25 }}
          style={{ display:"flex", flexShrink:0, color:"#c25500" }}>
          <Icon name="chevron" size={20}/>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="a" id={id} role="region"
            initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }}
            transition={{ type:"spring", bounce:0, visualDuration:0.3 }}
            style={{ overflow:"hidden" }}>
            <p className="hm-faq-a">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <Reveal className="hm-faq">
      {QUESTIONS.map((item, i) => (
        <Item key={item.q} {...item} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)}/>
      ))}
    </Reveal>
  )
}
