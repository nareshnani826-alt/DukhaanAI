import { useEffect, useRef, useState } from "react"
import {
  motion, AnimatePresence, useInView, useMotionValue, useMotionValueEvent,
  useReducedMotion, useScroll, useTransform, animate,
} from "motion/react"
import {
  Icon, LogoMark, Reveal, ScrollProgress, Magnetic, SpotlightCard, CountUp, WordRotator, WordsReveal,
} from "./home/kit"
import { APK_URL, rootScroller, scrollToId } from "./home/utils"
import DayStory from "./home/DayStory"
import Faq from "./home/Faq"
import { HOME_CSS } from "./home/homeCss"
import { SHOPS, CONTENT, STORIES } from "./home/shopContent"

// Public marketing homepage (website only — the Android app keeps the plain login screen).
// The sign-in card is passed in from LoginHome so all auth logic stays there.
// `shop` picks the version (general / kirana / chai / bangle); the words live in home/shopContent.js.

const LANG_WORDS = ["हिन्दी", "తెలుగు", "தமிழ்", "ಕನ್ನಡ", "मराठी", "বাংলা", "ગુજરાતી", "ਪੰਜਾਬੀ", "മലയാളം", "English"]
const GREETINGS  = ["नमस्ते", "నమస్కారం", "வணக்கம்", "ನಮಸ್ಕಾರ", "नमस्कार", "নমস্কার", "નમસ્તે", "ਸਤ ਸ੍ਰੀ ਅਕਾਲ", "നമസ്കാരം", "Hello"]

const NAV = [
  { id:"story",    label:"A day with us" },
  { id:"features", label:"Features" },
  { id:"pricing",  label:"Pricing" },
  { id:"faq",      label:"FAQ" },
]

// ── Voice billing demo: phrases turn into bill lines ─────────
function VoiceDemo({ lines: DEMO_LINES, pay }) {
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.4 })
  const [step, setStep] = useState(0)            // how many lines are on the bill
  const total = useMotionValue(0)
  const totalText = useTransform(() => `₹${Math.round(total.get())}`)

  // Add a line every 1.6s while visible, hold the full bill, then start over
  useEffect(() => {
    if (!inView) return
    const delay = step < DEMO_LINES.length ? 1600 : 3200
    const id = setTimeout(() => setStep(s => (s < DEMO_LINES.length ? s + 1 : 0)), delay)
    return () => clearTimeout(id)
  }, [inView, step])

  useEffect(() => {
    const target = DEMO_LINES.slice(0, step).reduce((sum, l) => sum + l.amount, 0)
    const controls = animate(total, target, { duration: 0.6, ease: "easeOut" })
    return () => controls.stop()
  }, [step, total])

  const speaking = DEMO_LINES[Math.min(step, DEMO_LINES.length - 1)]
  const listening = step < DEMO_LINES.length

  return (
    <div ref={ref} className="hm-phone" role="img"
      aria-label="Animation: a shopkeeper says items aloud and they appear on the bill with a running total">
      <div className="hm-phone-notch"/>
      <div className="hm-phone-head">
        <span style={{ fontWeight:800 }}>New Bill</span>
        <span className="hm-live"><span className="hm-live-dot"/>Listening</span>
      </div>

      {/* What the shopkeeper said */}
      <div style={{ minHeight:46, display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div className={`hm-mic ${listening ? "is-on" : ""}`}><Icon name="mic" size={18}/></div>
        <AnimatePresence mode="wait">
          {listening && (
            <motion.div key={speaking.said} className="hm-bubble"
              initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
              transition={{ duration:0.2 }}>
              “{speaking.said}”
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bill lines */}
      <div className="hm-bill">
        <AnimatePresence initial={false}>
          {DEMO_LINES.slice(0, step).map(l => (
            <motion.div key={l.item} layout className="hm-line"
              initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}
              transition={{ type:"spring", bounce:0.15, visualDuration:0.35 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#1a0c04" }}>{l.item}</div>
                <div style={{ fontSize:11, color:"#7a6346" }}>{l.qty}</div>
              </div>
              <div style={{ fontSize:13, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace" }}>₹{l.amount}</div>
            </motion.div>
          ))}
        </AnimatePresence>
        {step === 0 && <div className="hm-empty">Speak to add items…</div>}
      </div>

      <div className="hm-total">
        <span>Total</span>
        <motion.span style={{ fontFamily:"'IBM Plex Mono',monospace" }}>{totalText}</motion.span>
      </div>
      <div className="hm-pay">{pay || "Share bill on WhatsApp"}</div>
    </div>
  )
}

// Language scripts drifting behind the hero at three scroll speeds
const GLYPHS = [
  [{ t:"తెలుగు", top:"12%", left:"4%",  s:20, r:-12 }, { t:"मराठी", top:"70%", left:"44%", s:22, r:6 }, { t:"ગુજરાતી", top:"86%", left:"8%", s:15, r:10 }],
  [{ t:"हिन्दी", top:"8%",  left:"52%", s:26, r:8 },   { t:"ಕನ್ನಡ", top:"58%", left:"2%",  s:18, r:14 }, { t:"বাংলা", top:"90%", left:"62%", s:17, r:-8 }],
  [{ t:"தமிழ்", top:"30%", left:"40%", s:15, r:-6 },  { t:"മലയാളം", top:"44%", left:"92%", s:14, r:-10 }, { t:"ਪੰਜਾਬੀ", top:"20%", left:"88%", s:17, r:-14 }],
]
function HeroGlyphs() {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll({ container: rootScroller })
  const y0 = useTransform(scrollY, [0, 800], [0, -60])
  const y1 = useTransform(scrollY, [0, 800], [0, -140])
  const y2 = useTransform(scrollY, [0, 800], [0, -240])
  const ys = [y0, y1, y2]
  return (
    <div className="hm-glyphs" aria-hidden="true">
      {GLYPHS.map((layer, li) => (
        <motion.div key={li} style={{ position:"absolute", inset:0, y: reduce ? 0 : ys[li] }}>
          {layer.map(g => (
            <span key={g.t} style={{ position:"absolute", top:g.top, left:g.left, fontSize:g.s,
              transform:`rotate(${g.r}deg)`, opacity: 0.10 + li * 0.03 }}>{g.t}</span>
          ))}
        </motion.div>
      ))}
    </div>
  )
}

// ── Content ──────────────────────────────────────────────────
const PLANS = [
  { name:"Free", price:"₹0", per:"forever", blurb:"To get your shop started",
    items:["Billing & stock", "Udhar khata", "UPI QR & WhatsApp bills", "Daily dashboard"] },
  { name:"Pro", price:"₹299", per:"/month", popular:true },
]

// Swapping one shop's words for another's
const swap = {
  initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 },
  transition: { type: "spring", bounce: 0, visualDuration: 0.35 },
}

// "What shop do you run?" — the sliding pill follows the choice
function ShopPicker({ shop, onShop }) {
  // Nothing picked yet: three big cards that ask for attention
  if (shop === "general") return (
    <div className="hm-shop-big" role="radiogroup" aria-label="What shop do you run?">
      <div className="hm-shop-big-q">
        <motion.span animate={{ y:[0, -3, 0] }} transition={{ duration:1.6, repeat:Infinity, ease:"easeInOut" }}
          style={{ display:"inline-block" }}>👇</motion.span> What shop do you run?
      </div>
      <div className="hm-shop-big-row">
        {SHOPS.map((s, i) => (
          <motion.button key={s.id} role="radio" aria-checked="false" onClick={() => onShop(s.id)}
            className="hm-shop-card"
            initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
            transition={{ type:"spring", bounce:0.25, visualDuration:0.45, delay:0.15 + i * 0.08 }}
            whileHover={{ y:-4 }} whileTap={{ scale:0.96 }}>
            <motion.span className="hm-shop-card-glow" aria-hidden="true"
              animate={{ opacity:[0, 0.9, 0] }} transition={{ duration:2.4, repeat:Infinity, delay:1 + i * 0.8, repeatDelay:1.2 }}/>
            <span className="hm-shop-card-icon"><Icon name={s.icon} size={24}/></span>
            <span className="hm-shop-card-name">{s.label}</span>
            <span className="hm-shop-card-sub">{s.sub}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
  return (
    <div className="hm-shop-pick" role="radiogroup" aria-label="What shop do you run?">
      <span className="hm-shop-q">I run a</span>
      <div className="hm-shop-opts">
        {SHOPS.map(s => (
          <button key={s.id} role="radio" aria-checked={shop === s.id} onClick={() => onShop(s.id)}
            className={`hm-shop-opt ${shop === s.id ? "is-on" : ""}`}>
            {shop === s.id && (
              <motion.span layoutId="hm-shop-pill" className="hm-shop-pill"
                transition={{ type:"spring", bounce:0.2, visualDuration:0.35 }}/>
            )}
            <span style={{ position:"relative", display:"inline-flex", alignItems:"center", gap:8 }}>
              <Icon name={s.icon} size={22}/>{s.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function SectionHead({ kicker, title, sub }) {
  return (
    <Reveal className="hm-head">
      <div className="hm-kicker">{kicker}</div>
      <h2 className="hm-h2">{title}</h2>
      {sub && <p className="hm-sub">{sub}</p>}
    </Reveal>
  )
}

// ── Page ─────────────────────────────────────────────────────
export default function HomeSections({ formCard, shop = "general", onShop = () => {} }) {
  const C = CONTENT[shop] || CONTENT.general
  const pageRef = useRef(null)
  const [activeNav, setActiveNav] = useState(null)
  const [scrolled, setScrolled]   = useState(false)
  const [showDock, setShowDock]   = useState(false)
  const [hoverPlan, setHoverPlan] = useState("Pro")

  const { scrollY } = useScroll({ container: rootScroller })
  useMotionValueEvent(scrollY, "change", v => {
    setScrolled(v > 8)
    setShowDock(v > 900)
  })

  // Scale the whole page with the window: 1× up to 1440px wide, growing in step on bigger monitors
  useEffect(() => {
    const fit = () => pageRef.current?.style.setProperty("--k", Math.min(1.8, Math.max(1, window.innerWidth / 1440)).toFixed(3))
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [])

  // Highlight the menu item for the section in the middle of the screen
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveNav(e.target.id) })
    }, { rootMargin: "-45% 0px -50% 0px" })
    NAV.forEach(n => { const el = document.getElementById(n.id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  const heroItem = {
    hidden: { opacity: 0, y: 16 },
    show:   { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, visualDuration: 0.5 } },
  }

  return (
    <div className="hm" ref={pageRef}>
      <ScrollProgress/>

      {/* Nav */}
      <header className={`hm-nav ${scrolled ? "is-scrolled" : ""}`}>
        <div className="hm-wrap hm-nav-in">
          <a href="/" className="hm-brand" aria-label="DukaanAI home">
            <LogoMark size={34}/>
            <span style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:22, fontWeight:800, color:"#1a0800" }}>
              दुकान<span style={{ color:"#d4621f" }}>•AI</span>
            </span>
          </a>
          <nav className="hm-links" aria-label="Sections">
            {NAV.map(n => (
              <button key={n.id} onClick={() => scrollToId(n.id)} aria-current={activeNav === n.id ? "true" : undefined}>
                {activeNav === n.id && (
                  <motion.span layoutId="hm-nav-pill" className="hm-nav-pill"
                    transition={{ type:"spring", bounce:0.15, visualDuration:0.35 }}/>
                )}
                <span style={{ position:"relative" }}>{n.label}</span>
              </button>
            ))}
          </nav>
          <button className="hm-btn hm-btn-primary hm-btn-sm" onClick={() => scrollToId("start")}>Sign in</button>
        </div>
      </header>

      {/* Hero */}
      <section className="hm-hero">
        <HeroGlyphs/>
        <div className="hm-wrap hm-hero-grid">
          <motion.div className="hm-hero-copy" initial="hidden" animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
            <motion.div variants={heroItem}>
              <ShopPicker shop={shop} onShop={onShop}/>
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.div key={shop} {...swap}>
                <h1 className="hm-h1" aria-label={`${C.h1[0]} ${C.h1[1]}, in your own language.`}>
                  <span aria-hidden="true">{C.h1[0]} <span className="hm-accent">{C.h1[1]}</span>,</span>
                  <span aria-hidden="true" className="hm-h1-line2">
                    in <WordRotator words={LANG_WORDS} className="hm-rot"/>
                  </span>
                </h1>
                <p className="hm-lead">{C.lead}</p>
              </motion.div>
            </AnimatePresence>
            <motion.div variants={heroItem} className="hm-cta-row">
              <Magnetic>
                <button className="hm-btn hm-btn-primary hm-hero-start" onClick={() => scrollToId("start")}>
                  Start free <Icon name="arrow" size={18}/>
                </button>
              </Magnetic>
              <Magnetic>
                <a className="hm-btn hm-btn-ghost" href={APK_URL}>
                  <Icon name="download" size={18}/> Android app
                </a>
              </Magnetic>
            </motion.div>
            <motion.ul variants={heroItem} className="hm-trust">
              <li><Icon name="check" size={16}/> Free plan, no card needed</li>
              <li><Icon name="languages" size={16}/> 10 Indian languages</li>
              <li><Icon name="wifiOff" size={16}/> Works offline</li>
            </motion.ul>
          </motion.div>

          <motion.div id="start" className="hm-hero-form"
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            transition={{ type:"spring", bounce:0, visualDuration:0.6, delay:0.15 }}>
            {formCard}
          </motion.div>
        </div>
      </section>

      {/* Greetings marquee */}
      <div className="hm-marquee" aria-hidden="true">
        <div className="hm-marquee-track">
          {[...GREETINGS, ...GREETINGS].map((g, i) => <span key={i}>{g}<i>•</i></span>)}
        </div>
      </div>

      {/* Stats */}
      <section className="hm-stats-band">
        <div className="hm-wrap hm-stats">
          {C.stats.map((s, i) => (
            <Reveal key={shop + s.label} delay={i * 0.06} className="hm-stat">
              <div className="hm-stat-n"><CountUp to={s.to} prefix={s.prefix} suffix={s.suffix}/></div>
              <div className="hm-stat-l">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Voice demo */}
      <section className="hm-section hm-white">
        <div className="hm-wrap hm-split">
          <AnimatePresence mode="wait">
            <motion.div key={shop} {...swap}>
              <div className="hm-kicker">{C.demo.kicker}</div>
              <h2 className="hm-h2">{C.demo.title}</h2>
              <p className="hm-sub" style={{ marginBottom:24 }}>{C.demo.sub}</p>
              <ul className="hm-checks">
                {C.demo.checks.map(t => <li key={t}><Icon name="check" size={18}/> {t}</li>)}
              </ul>
            </motion.div>
          </AnimatePresence>
          <Reveal delay={0.1} style={{ display:"flex", justifyContent:"center" }}>
            <VoiceDemo key={shop} lines={C.demo.lines} pay={C.demo.pay}/>
          </Reveal>
        </div>
      </section>

      {/* A day at your dukaan */}
      <section id="story" className="hm-section hm-story-section">
        <div className="hm-wrap">
          <SectionHead key={shop} kicker={C.storyKicker} title={C.storyTitle}
            sub="Scroll through a day at the counter and see where DukaanAI saves you time."/>
          <DayStory key={shop} chapters={STORIES[C.story]}/>
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="hm-section hm-white">
        <div className="hm-wrap">
          <SectionHead key={shop} kicker="Everything in one app"
            title={C.featuresTitle}
            sub="From the morning stock check to the evening cash count — no notebook, no calculator."/>
          <div className="hm-bento">
            {C.features.map((f, i) => (
              <SpotlightCard key={shop + f.title} delay={(i % 3) * 0.06} className={`hm-card ${f.wide ? "is-wide" : ""}`}>
                <motion.div className="hm-card-icon"
                  variants={{ hover: { rotate: [0, -10, 8, 0], scale: 1.08 } }}
                  transition={{ duration: 0.5 }}>
                  <Icon name={f.icon} size={22}/>
                </motion.div>
                <div style={{ position:"relative" }}>
                  <h3 className="hm-h3">{f.title}</h3>
                  <p className="hm-card-text">{f.text}</p>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="hm-section">
        <div className="hm-wrap">
          <SectionHead kicker="Get started" title="Billing in three steps"/>
          <div style={{ position:"relative" }}>
            <motion.div className="hm-steps-line" aria-hidden="true"
              initial={{ scaleX:0 }} whileInView={{ scaleX:1 }} viewport={{ once:true, amount:0.5 }}
              transition={{ duration:1.1, ease:[0.16, 1, 0.3, 1], delay:0.2 }}/>
            <ol className="hm-steps">
              {C.steps.map((s, i) => (
                <Reveal as="li" key={shop + s.n} delay={0.15 + i * 0.25} className="hm-step">
                  <motion.div className="hm-step-n"
                    initial={{ scale:0.4 }} whileInView={{ scale:1 }} viewport={{ once:true }}
                    transition={{ type:"spring", bounce:0.45, visualDuration:0.5, delay:0.25 + i * 0.25 }}>
                    {s.n}
                  </motion.div>
                  <h3 className="hm-h3">{s.title}</h3>
                  <p className="hm-card-text">{s.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="hm-section hm-white">
        <div className="hm-wrap">
          <SectionHead kicker="Pricing" title="Simple prices. Start free."
            sub="Upgrade only when your shop needs more."/>
          <div className="hm-plans" onPointerLeave={() => setHoverPlan("Pro")}>
            {PLANS.map(p => p.popular ? { ...p, blurb: C.proBlurb, items: C.proItems } : p).map((p, i) => (
              <Reveal key={p.name} delay={i * 0.08} className={`hm-plan ${p.popular ? "is-popular" : ""}`}>
                <div onPointerEnter={e => e.pointerType === "mouse" && setHoverPlan(p.name)}
                  style={{ display:"flex", flexDirection:"column", height:"100%" }}>
                  {hoverPlan === p.name && (
                    <motion.div layoutId="hm-plan-glow" className="hm-plan-glow" aria-hidden="true"
                      transition={{ type:"spring", bounce:0.15, visualDuration:0.4 }}/>
                  )}
                  {p.popular && <div className="hm-plan-tag">Most popular</div>}
                  <div style={{ position:"relative", display:"flex", flexDirection:"column", height:"100%" }}>
                    <div style={{ fontSize:"calc(15px * var(--k))", fontWeight:800 }}>{p.name}</div>
                    <div style={{ fontSize:"calc(13px * var(--k))", color:"#6b5436", marginTop:2 }}>{p.blurb}</div>
                    <div style={{ display:"flex", alignItems:"baseline", gap:4, margin:"18px 0 20px" }}>
                      <span style={{ fontSize:"calc(40px * var(--k))", fontWeight:800, letterSpacing:"-1px" }}>{p.price}</span>
                      <span style={{ fontSize:"calc(14px * var(--k))", color:"#6b5436" }}>{p.per}</span>
                    </div>
                    <ul className="hm-checks hm-checks-sm">
                      {p.items.map(it => <li key={it}><Icon name="check" size={16}/> {it}</li>)}
                    </ul>
                    <button className={`hm-btn ${p.popular ? "hm-btn-primary" : "hm-btn-ghost"}`}
                      style={{ width:"100%", marginTop:"auto" }} onClick={() => scrollToId("start")}>
                      {p.name === "Free" ? "Start free" : "Choose Pro"}
                    </button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="hm-section">
        <div className="hm-wrap">
          <SectionHead kicker="Questions" title="Asked at every counter"/>
          <Faq key={shop} questions={C.faq}/>
        </div>
      </section>

      {/* Final CTA */}
      <section className="hm-section hm-dark">
        <div className="hm-blob hm-blob-1" aria-hidden="true"/>
        <div className="hm-blob hm-blob-2" aria-hidden="true"/>
        <div className="hm-wrap" style={{ position:"relative" }}>
          <div className="hm-final">
            <WordsReveal key={shop} text={C.final} className="hm-h2 hm-final-h"/>
            <Reveal delay={0.3}>
              <p className="hm-sub" style={{ color:"#e3cfb0" }}>
                Get the Android app for the counter, or use it right here in your browser.
              </p>
              <div className="hm-cta-row" style={{ justifyContent:"center" }}>
                <Magnetic>
                  <a className="hm-btn hm-btn-primary" href={APK_URL}>
                    <Icon name="download" size={18}/> Download Android app
                  </a>
                </Magnetic>
                <Magnetic>
                  <button className="hm-btn hm-btn-onDark" onClick={() => scrollToId("start")}>
                    Use in browser <Icon name="arrow" size={18}/>
                  </button>
                </Magnetic>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <footer className="hm-footer">
        <div className="hm-wrap hm-footer-in">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <LogoMark size={28}/>
            <span>© 2026 DukhaanAI · Built for Bharat</span>
          </div>
          <a href="mailto:support@dukhaanai.in">support@dukhaanai.in</a>
        </div>
      </footer>

      {/* Phone-only sticky call to action once the hero has scrolled away */}
      <AnimatePresence>
        {showDock && (
          <motion.div className="hm-dock" key="dock"
            initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }}
            transition={{ type:"spring", bounce:0.2, visualDuration:0.4 }}>
            <button className="hm-btn hm-btn-primary" onClick={() => scrollToId("start")}>
              Start free <Icon name="arrow" size={18}/>
            </button>
            <a className="hm-btn hm-btn-ghost" href={APK_URL} aria-label="Download Android app">
              <Icon name="download" size={18}/>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{HOME_CSS + SHOP_PICK_CSS}</style>
    </div>
  )
}

const SHOP_PICK_CSS = `
  .hm-shop-big { margin-bottom:calc(8px * var(--k)); }
  .hm-shop-big-q { font-size:calc(17px * var(--k)); font-weight:800; color:#1a0c04; margin-bottom:calc(12px * var(--k)); }
  .hm-shop-big-row { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:calc(12px * var(--k)); max-width:calc(560px * var(--k)); }
  .hm-shop-card { position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:flex-start; gap:4px; cursor:pointer;
    text-align:left; padding:calc(16px * var(--k)); border-radius:18px; border:2px solid rgba(212,98,31,.28); background:#fff;
    font:inherit; color:#1a0c04; box-shadow:0 8px 24px rgba(150,80,10,.10); transition:border-color .2s, box-shadow .2s; }
  .hm-shop-card:hover { border-color:#d4621f; box-shadow:0 12px 30px rgba(212,98,31,.22); }
  .hm-shop-card:focus-visible { outline:3px solid #d4621f; outline-offset:3px; }
  .hm-shop-card-glow { position:absolute; inset:0; border-radius:16px; pointer-events:none;
    background:linear-gradient(120deg, transparent 20%, rgba(232,119,34,.16) 50%, transparent 80%); }
  .hm-shop-card-icon { position:relative; width:calc(44px * var(--k)); height:calc(44px * var(--k)); border-radius:12px; display:flex;
    align-items:center; justify-content:center; background:linear-gradient(135deg,#e87722,#c25500); color:#fff; margin-bottom:6px; }
  .hm-shop-card-name { position:relative; font-weight:800; font-size:calc(17px * var(--k)); }
  .hm-shop-card-sub { position:relative; font-size:calc(13px * var(--k)); color:#7a5a3a; line-height:1.35; }
  @media (max-width: 520px) {
    .hm-shop-big-row { gap:8px; }
    .hm-shop-card { padding:12px 10px; align-items:center; text-align:center; }
    .hm-shop-card-sub { display:none; }
  }
  .hm-shop-pick { display:flex; align-items:center; gap:calc(12px * var(--k)); flex-wrap:wrap; margin-bottom:calc(6px * var(--k)); }
  .hm-shop-q { font-size:calc(16px * var(--k)); font-weight:700; color:#7a5a3a; }
  .hm-shop-opts { display:flex; gap:4px; padding:5px; border-radius:16px; background:rgba(255,255,255,.7);
    border:1px solid rgba(212,98,31,.16); }
  .hm-shop-opt { position:relative; border:0; background:transparent; cursor:pointer; min-height:calc(52px * var(--k));
    padding:0 calc(18px * var(--k)); border-radius:12px; font:inherit; font-weight:800; font-size:calc(16px * var(--k));
    color:#6b4a2a; transition:color .2s; }
  .hm-shop-opt:hover { color:#1a0c04; }
  .hm-shop-opt.is-on { color:#fff; }
  .hm-shop-opt:focus-visible { outline:3px solid #d4621f; outline-offset:2px; }
  .hm-shop-pill { position:absolute; inset:0; border-radius:12px; background:linear-gradient(135deg,#e87722,#c25500);
    box-shadow:0 4px 12px rgba(212,98,31,.3); }
  /* Two-line headline with room around it */
  .hm .hm-h1 { font-size:clamp(calc(34px * var(--k)), 4.1vw, calc(54px * var(--k))); margin:calc(20px * var(--k)) 0 calc(16px * var(--k)); }
  .hm .hm-accent { white-space:nowrap; }
  .hm .hm-lead { max-width:calc(500px * var(--k)); }
  .hm .hm-hero { padding:calc(64px * var(--k)) 0 calc(80px * var(--k)); }
  .hm .hm-hero-grid { gap:calc(72px * var(--k)); grid-template-columns:minmax(0,1fr) auto; }
  @media (max-width: 1024px) { .hm .hm-hero-grid { grid-template-columns:minmax(0,1fr); } }
  .hm .hm-hero-copy { min-width:0; }
  .hm .hm-hero-form { width:440px; max-width:100%; justify-self:end; }
  @media (max-width: 1024px) { .hm .hm-hero-form { justify-self:center; } }
  @media (max-width: 520px) {
    .hm-shop-pick { flex-direction:column; align-items:stretch; gap:8px; }
    .hm-shop-opts { width:100%; } .hm-shop-opt { flex:1; padding:0 4px; font-size:15px; white-space:nowrap; }
    .hm-shop-opt > span { gap:5px !important; }
    .hm .hm-hero { padding:24px 0 40px; }
  }
`
