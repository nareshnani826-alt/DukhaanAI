import { useRef, useState } from "react"
import { motion, AnimatePresence, useScroll, useSpring } from "motion/react"
import { Icon } from "./kit"
import { rootScroller } from "./utils"
import { STORIES } from "./shopContent"

// "A day at your dukaan" — chapters scroll past while the phone beside them
// stays pinned and changes screen. On phones each chapter carries its own screen.


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

// One phone screen, drawn from the chapter's data (see STORIES in shopContent.js)
function Screen({ c }) {
  return (
    <>
      {c.hero && (
        <motion.div variants={row} className="hm-s-hero" style={{ background:c.hero.bg }}>
          <div style={{ fontSize:11, fontWeight:700, color:c.hero.fg }}>{c.hero.label}</div>
          <div style={{ fontSize:22, fontWeight:800 }}>{c.hero.value}</div>
          <div style={{ fontSize:11, color:"#7a6346" }}>{c.hero.sub}</div>
        </motion.div>
      )}
      {c.label && <motion.div variants={row} className="hm-s-label">{c.label}</motion.div>}
      {c.bars && (
        <div className="hm-s-bars">
          {c.bars.map((h, i) => (
            <motion.div key={i} style={{ height:`${h}%`, originY:1, background: i === c.bars.length - 1 ? "#1f7a5e" : "#bfe0d3" }}
              variants={{ hidden:{ scaleY:0 }, show:{ scaleY:1, transition:{ type:"spring", bounce:0.2, visualDuration:0.5, delay:0.25 + i * 0.05 } } }}/>
          ))}
        </div>
      )}
      {(c.rows || []).map(([left, sub, right, dot]) => <Row key={left} left={left} sub={sub} right={right} dot={dot}/>)}
      {c.total && <motion.div variants={row} className="hm-s-total"><span>Total</span><span>{c.total}</span></motion.div>}
      {c.chip && <motion.div variants={row} className="hm-s-chip"><Icon name="check" size={14}/> {c.chip}</motion.div>}
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
          <Screen c={chapter}/>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={chapter.id}
            initial={{ opacity:0, x:24 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-24 }}
            transition={{ type:"spring", bounce:0, visualDuration:0.3 }}>
            <motion.div variants={list} initial="hidden" animate="show">
              <Screen c={chapter}/>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

export default function DayStory({ chapters = STORIES.kirana }) {
  const CH = chapters
  const [active, setActive] = useState(0)
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, container: rootScroller, offset: ["start center", "end center"] })
  const fill = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 })

  return (
    <div className="hm-story" ref={ref}>
      <div className="hm-chapters">
        <div className="hm-rail" aria-hidden="true">
          <motion.div className="hm-rail-fill" style={{ scaleY: fill, background: (CH[active] || CH[0]).color }}/>
        </div>
        {CH.map((c, i) => (
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
        <Phone chapter={CH[active] || CH[0]}/>
      </div>
    </div>
  )
}
