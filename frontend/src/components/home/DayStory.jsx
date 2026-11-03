import { useRef, useState } from "react"
import { motion, AnimatePresence, useScroll, useSpring } from "motion/react"
import { Icon } from "./kit"
import { rootScroller } from "./utils"

// "A day at your dukaan" — chapters scroll past while the phone beside them
// stays pinned and changes screen. On phones each chapter carries its own screen.

const CHAPTERS = [
  { id:"open",  time:"9:00 AM",  icon:"sun",     color:"#d98a1c", title:"Open the shop",
    text:"Count the cash drawer and open the day in one tap. DukaanAI shows what's running low before the first customer walks in." },
  { id:"rush",  time:"11:30 AM", icon:"zap",     color:"#d4621f", title:"The morning rush",
    text:"Speak or scan — every item lands on the bill in a second. Send the GST bill straight to the customer's WhatsApp." },
  { id:"udhar", time:"4:00 PM",  icon:"book",    color:"#7c5cbf", title:"Udhar, sorted",
    text:"Regular customer short on cash? Add it to their khata. Every pending amount is there at a glance — no more notebook." },
  { id:"close", time:"9:00 PM",  icon:"moon",    color:"#1f7a5e", title:"Close the day",
    text:"Close the day and see today's sales, profit and best sellers. Go home knowing exactly how the shop did." },
]

const list = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}
const row = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, visualDuration: 0.35 } },
}

function Row({ left, sub, right, dot }) {
  return (
    <motion.div variants={row} className="hm-s-row">
      <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
        {dot && <span style={{ width:7, height:7, borderRadius:"50%", background:dot, flexShrink:0 }}/>}
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700 }}>{left}</div>
          {sub && <div style={{ fontSize:11, color:"#7a6346" }}>{sub}</div>}
        </div>
      </div>
      <div style={{ fontSize:13, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", whiteSpace:"nowrap" }}>{right}</div>
    </motion.div>
  )
}

function Screen({ id }) {
  if (id === "open") return (
    <>
      <motion.div variants={row} className="hm-s-hero" style={{ background:"#fff4e0" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#9a6a12" }}>DAY OPENED</div>
        <div style={{ fontSize:22, fontWeight:800 }}>₹2,000</div>
        <div style={{ fontSize:11, color:"#7a6346" }}>cash in drawer</div>
      </motion.div>
      <motion.div variants={row} className="hm-s-label">Running low</motion.div>
      <Row left="Amul milk 500 ml" right="4 left" dot="#c0382d"/>
      <Row left="Sugar 1 kg"       right="2 left" dot="#c0382d"/>
      <Row left="Parle-G biscuit"  right="6 left" dot="#d98a1c"/>
    </>
  )
  if (id === "rush") return (
    <>
      <motion.div variants={row} className="hm-s-label">Bill #46</motion.div>
      <Row left="Tata salt 1 kg"    sub="1 pc"  right="₹28"/>
      <Row left="Fortune oil 1 L"   sub="1 pc"  right="₹165"/>
      <Row left="Toor dal"          sub="1 kg"  right="₹160"/>
      <motion.div variants={row} className="hm-s-total"><span>Total</span><span>₹353</span></motion.div>
      <motion.div variants={row} className="hm-s-chip"><Icon name="check" size={14}/> Sent on WhatsApp</motion.div>
    </>
  )
  if (id === "udhar") return (
    <>
      <motion.div variants={row} className="hm-s-hero" style={{ background:"#f1ebfa" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#5b3fa6" }}>TOTAL UDHAR</div>
        <div style={{ fontSize:22, fontWeight:800 }}>₹1,830</div>
        <div style={{ fontSize:11, color:"#7a6346" }}>3 customers</div>
      </motion.div>
      <Row left="Lakshmi"      sub="12 days" right="₹1,200" dot="#7c5cbf"/>
      <Row left="Ramesh Kumar" sub="5 days"  right="₹450"   dot="#7c5cbf"/>
      <Row left="Suresh"       sub="Today"   right="₹180"   dot="#7c5cbf"/>
    </>
  )
  const bars = [38, 52, 44, 70, 58, 84, 100]
  return (
    <>
      <motion.div variants={row} className="hm-s-hero" style={{ background:"#e6f3ee" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#1f7a5e" }}>TODAY'S SALES</div>
        <div style={{ fontSize:22, fontWeight:800 }}>₹8,420</div>
        <div style={{ fontSize:11, color:"#7a6346" }}>46 bills · ₹1,260 profit</div>
      </motion.div>
      <motion.div variants={row} className="hm-s-label">This week</motion.div>
      <div className="hm-s-bars">
        {bars.map((h, i) => (
          <motion.div key={i} style={{ height:`${h}%`, originY:1, background: i === bars.length - 1 ? "#1f7a5e" : "#bfe0d3" }}
            variants={{ hidden:{ scaleY:0 }, show:{ scaleY:1, transition:{ type:"spring", bounce:0.2, visualDuration:0.5, delay:0.25 + i * 0.05 } } }}/>
        ))}
      </div>
      <Row left="Best seller" sub="Amul milk 500 ml" right="62 sold"/>
    </>
  )
}

function Phone({ chapter, inline }) {
  return (
    <div className="hm-s-phone" style={{ "--ch": chapter.color }}>
      <div className="hm-phone-notch"/>
      <div className="hm-s-bar">
        <span>{chapter.time}</span>
        <span style={{ display:"flex", alignItems:"center", gap:5, color: chapter.color, transition:"color .3s" }}>
          <Icon name={chapter.icon} size={14}/> {chapter.title}
        </span>
      </div>
      {inline ? (
        <motion.div variants={list} initial="hidden" whileInView="show" viewport={{ once:true, amount:0.4 }}>
          <Screen id={chapter.id}/>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={chapter.id}
            initial={{ opacity:0, x:24 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-24 }}
            transition={{ type:"spring", bounce:0, visualDuration:0.3 }}>
            <motion.div variants={list} initial="hidden" animate="show">
              <Screen id={chapter.id}/>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

export default function DayStory() {
  const [active, setActive] = useState(0)
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, container: rootScroller, offset: ["start center", "end center"] })
  const fill = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 })

  return (
    <div className="hm-story" ref={ref}>
      <div className="hm-chapters">
        <div className="hm-rail" aria-hidden="true">
          <motion.div className="hm-rail-fill" style={{ scaleY: fill, background: CHAPTERS[active].color }}/>
        </div>
        {CHAPTERS.map((c, i) => (
          <motion.div key={c.id} className="hm-chapter"
            viewport={{ amount: 0.6 }} onViewportEnter={() => setActive(i)}
            animate={{ opacity: active === i ? 1 : 0.35 }} transition={{ duration: 0.3 }}>
            <div className="hm-ch-dot" style={{ background: active >= i ? c.color : "#e8dccb" }}/>
            <div className="hm-ch-time" style={{ color: c.color }}>
              <Icon name={c.icon} size={16}/> {c.time}
            </div>
            <h3 className="hm-ch-title">{c.title}</h3>
            <p className="hm-sub">{c.text}</p>
            <div className="hm-ch-screen"><Phone chapter={c} inline/></div>
          </motion.div>
        ))}
      </div>
      <div className="hm-story-pin">
        <Phone chapter={CHAPTERS[active]}/>
      </div>
    </div>
  )
}
