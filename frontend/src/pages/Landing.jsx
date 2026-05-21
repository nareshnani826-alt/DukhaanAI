import { useState } from "react"
import { useNavigate } from "react-router-dom"
import AuthModal from "../components/AuthModal"

const RESPONSIVE_CSS = `
  .lp-nav        { padding: 16px 64px; }
  .lp-nav-links  { display: flex; gap: 32px; }
  .lp-hero       { padding: 72px 64px 100px; }
  .lp-headline   { font-size: clamp(52px,8vw,108px); }
  .lp-subtext    { font-size: 19px; margin-bottom: 60px; }
  .lp-hero-mic   { width: 480px; height: 480px; margin: 0 auto 64px; }
  .lp-cta-row    { display: flex; gap: 16px; justify-content: center; margin-bottom: 80px; }
  .lp-trust      { display: flex; justify-content: center; gap: 56px; flex-wrap: wrap; }
  .lp-section-pad { padding: 80px 64px; }
  .lp-preview-scenes { display: flex; }
  .lp-features-grid  { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
  .lp-pricing-grid   { display: grid; grid-template-columns: 1.4fr 1fr; gap: 48px; align-items: center; }
  .lp-pricing-pad    { padding: 64px; }
  .lp-pricing-btns   { display: flex; gap: 14px; flex-wrap: wrap; }
  .lp-footer-pad     { padding: 64px; }
  .lp-footer-grid    { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 48px; margin-bottom: 40px; }
  .lp-footer-bottom  { display: flex; justify-content: space-between; }

  @media (max-width: 768px) {
    .lp-nav        { padding: 14px 18px; }
    .lp-nav-links  { display: none !important; }
    .lp-nav-signin { display: none !important; }

    .lp-hero       { padding: 36px 18px 56px; }
    .lp-headline   { font-size: clamp(44px, 12vw, 72px) !important; letter-spacing: -1px !important; }
    .lp-subtext    { font-size: 15px !important; margin-bottom: 32px !important; }

    .lp-hero-mic   { width: min(85vw, 300px) !important; height: min(85vw, 300px) !important; margin-bottom: 36px !important; }
    .lp-hero-chip  { display: none !important; }

    .lp-cta-row    { flex-direction: column; align-items: stretch; gap: 12px; margin-bottom: 48px !important; }
    .lp-cta-row button { width: 100%; justify-content: center; padding: 16px 20px !important; font-size: 15px !important; border-radius: 16px !important; }

    .lp-trust      { gap: 20px 32px; }
    .lp-trust > div { min-width: 120px; }

    .lp-section-pad   { padding: 48px 18px !important; }
    .lp-preview-frame { margin-left: 0 !important; margin-right: 0 !important; }
    .lp-preview-scenes { display: none !important; }
    .lp-preview-body  { padding: 32px 18px !important; min-height: 200px !important; }
    .lp-preview-play  { width: 60px !important; height: 60px !important; margin-bottom: 16px !important; }
    .lp-preview-play svg { width: 24px !important; height: 24px !important; }
    .lp-preview-title { font-size: 22px !important; }

    .lp-features-grid  { grid-template-columns: 1fr !important; gap: 10px !important; }
    .lp-features-grid > div { min-height: auto !important; padding: 20px 16px !important; }
    .lp-features-num   { margin-bottom: 12px !important; }
    .lp-features-title { font-size: 17px !important; margin-bottom: 6px !important; }

    .lp-pricing-grid   { grid-template-columns: 1fr !important; gap: 24px !important; }
    .lp-pricing-pad    { padding: 28px 18px !important; border-radius: 20px !important; }
    .lp-pricing-price  { font-size: 52px !important; }
    .lp-pricing-btns   { flex-direction: column; }
    .lp-pricing-btns button { width: 100%; text-align: center; }

    .lp-footer-pad     { padding: 40px 18px !important; }
    .lp-footer-grid    { grid-template-columns: 1fr 1fr !important; gap: 28px 20px !important; margin-bottom: 28px !important; }
    .lp-footer-brand   { grid-column: 1 / -1; }
    .lp-footer-bottom  { flex-direction: column; gap: 8px; text-align: center; }

    .lp-eyebrow span   { display: none; }
  }
`

export default function Landing() {
  const navigate = useNavigate()
  const [showAuth, setShowAuth] = useState(false)

  function goToApp() { navigate("/dashboard") }

  return (
    <div style={{
      minHeight:"100vh", overflowX:"hidden",
      fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif",
      background:"#140b06", color:"#f4e4c1",
    }}>
      <style>{RESPONSIVE_CSS}</style>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* ── NAV ───────────────────────────────────────────── */}
      <nav className="lp-nav" style={{
        position:"sticky", top:0, zIndex:50,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        borderBottom:"1px solid rgba(244,228,193,0.10)",
        background:"rgba(20,11,6,0.85)",
        backdropFilter:"blur(12px)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:36, height:36, borderRadius:10, fontSize:18, flexShrink:0,
            background:"linear-gradient(135deg,#f6c768,#c08a3a,#5a3e18)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>🏪</div>
          <div>
            <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:20, color:"#f4e4c1", letterSpacing:"0.5px" }}>
              दुकान<span style={{ color:"#e87722" }}>•</span>AI
            </div>
            <div style={{ fontSize:9, color:"#7a6a51", letterSpacing:"1.8px", textTransform:"uppercase", marginTop:1 }}>
              Bahi‑Khata for India
            </div>
          </div>
        </div>

        <nav className="lp-nav-links" style={{ fontSize:14, fontWeight:500, color:"#b9a382" }}>
          {["How it works","Demand AI","Languages","Pricing"].map(l => (
            <a key={l} href={"#"+l.toLowerCase().replace(/ /g,"-")}
              style={{ color:"#b9a382", textDecoration:"none" }}
              onMouseEnter={e=>e.target.style.color="#f4e4c1"}
              onMouseLeave={e=>e.target.style.color="#b9a382"}>
              {l}
            </a>
          ))}
        </nav>

        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <button className="lp-nav-signin" onClick={() => setShowAuth(true)}
            style={{ color:"#f4e4c1", fontSize:14, fontWeight:500, background:"none", border:"none", cursor:"pointer" }}>
            Sign in
          </button>
          <button onClick={goToApp}
            style={{
              background:"linear-gradient(135deg,#e87722,#ff8e35)",
              color:"#1a0c04", border:"none", borderRadius:999,
              padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer",
              boxShadow:"0 6px 18px rgba(232,119,34,0.35)", whiteSpace:"nowrap",
            }}>
            Try free
          </button>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="lp-hero" style={{ position:"relative", textAlign:"center", overflow:"hidden" }}>
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none",
          background:"radial-gradient(circle at 50% 35%, rgba(232,119,34,0.09), transparent 60%)",
        }}/>

        {/* Eyebrow */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
          <div className="lp-eyebrow" style={{
            display:"inline-flex", gap:10, alignItems:"center",
            background:"rgba(232,119,34,0.10)", border:"1px solid rgba(232,119,34,0.30)",
            borderRadius:999, padding:"6px 18px", fontSize:12, color:"#e87722", fontWeight:600,
          }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#ff8e35", boxShadow:"0 0 12px #ff8e35", flexShrink:0 }}/>
            10 भारतीय भाषाएँ <span>&nbsp;·&nbsp; Free forever &nbsp;·&nbsp; Works offline</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="lp-headline" style={{
          fontFamily:"'Tiro Devanagari Hindi','Fraunces',serif",
          lineHeight:0.95, letterSpacing:"-2px", color:"#f4e4c1", marginBottom:20,
        }}>
          बोलो.<br/>
          <span style={{ color:"#e87722" }}>Bill ban gaya.</span>
        </h1>

        <p className="lp-subtext" style={{ lineHeight:1.6, color:"#b9a382", maxWidth:680, margin:"0 auto" }}>
          India's first voice‑first POS for kirana stores. Speak items in
          Hindi, Telugu, Tamil — any of <b style={{ color:"#f4e4c1" }}>10 languages</b> — and DukaanAI
          bills, tracks stock, and warns you about demand spikes.
        </p>

        {/* Mic SVG */}
        <div className="lp-hero-mic" style={{ position:"relative" }}>
          <svg viewBox="0 0 480 480" style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}>
            <defs>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#e87722" stopOpacity="0.55"/>
                <stop offset="55%" stopColor="#b3261e" stopOpacity="0.18"/>
                <stop offset="100%" stopColor="#140b06" stopOpacity="0"/>
              </radialGradient>
              <radialGradient id="brass" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#f6c768"/>
                <stop offset="50%" stopColor="#c08a3a"/>
                <stop offset="100%" stopColor="#5a3e18"/>
              </radialGradient>
            </defs>
            <circle cx="240" cy="240" r="240" fill="url(#glow)"/>
            <circle cx="240" cy="240" r="210" fill="none" stroke="#c08a3a" strokeOpacity="0.22" strokeWidth="1"/>
            <circle cx="240" cy="240" r="182" fill="none" stroke="#c08a3a" strokeOpacity="0.30" strokeWidth="1"/>
            <circle cx="240" cy="240" r="155" fill="none" stroke="#c08a3a" strokeOpacity="0.38" strokeWidth="1"/>
            {[...Array(72)].map((_,i) => {
              const a=(i/72)*Math.PI*2, h=8+((i*7)%18), r0=210, r1=210+h, hot=i%9===0
              return <line key={i}
                x1={240+Math.cos(a)*r0} y1={240+Math.sin(a)*r0}
                x2={240+Math.cos(a)*r1} y2={240+Math.sin(a)*r1}
                stroke={hot?"#ff8e35":"#f6c768"} strokeOpacity={hot?0.9:0.45}
                strokeWidth={hot?2:1} strokeLinecap="round"/>
            })}
            <circle cx="240" cy="240" r="100" fill="url(#brass)"/>
            <circle cx="240" cy="240" r="100" fill="none" stroke="#f6c768" strokeWidth="1.5" strokeOpacity="0.6"/>
            <rect x="216" y="196" width="48" height="76" rx="24" fill="#1a0f06"/>
            {[0,1,2,3].map(i => <line key={i} x1="226" y1={210+i*14} x2="254" y2={210+i*14} stroke="#c08a3a" strokeWidth="1.5" strokeOpacity="0.7"/>)}
            <path d="M 204 252 a 38 38 0 0 0 72 0" fill="none" stroke="#1a0f06" strokeWidth="6" strokeLinecap="round"/>
            <line x1="240" y1="290" x2="240" y2="306" stroke="#1a0f06" strokeWidth="6" strokeLinecap="round"/>
            <line x1="224" y1="310" x2="256" y2="310" stroke="#1a0f06" strokeWidth="6" strokeLinecap="round"/>
            <circle cx="240" cy="150" r="8" fill="#ff8e35">
              <animate attributeName="r" values="5;9;5" dur="1.6s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite"/>
            </circle>
          </svg>

          {/* Language chips — hidden on mobile */}
          {[
            { lang:"Hindi",   phrase:"दूध दो किलो",       roman:"doodh do kilo",     style:{top:10,left:-140} },
            { lang:"Telugu",  phrase:"ఉప్పు ఒక కిలో",    roman:"uppu okati kilo",   style:{top:10,right:-140} },
            { lang:"Tamil",   phrase:"அரிசி ஐந்து கிலோ", roman:"arisi anju kilo",   style:{top:210,left:-200} },
            { lang:"Marathi", phrase:"चहा अर्धा किलो",     roman:"chaha ardha kilo",  style:{top:210,right:-200} },
            { lang:"Kannada", phrase:"ಸಕ್ಕರೆ ಎರಡು ಕಿಲೋ", roman:"sakkare eradu kilo",style:{bottom:10,left:-130} },
            { lang:"Bengali", phrase:"আটা পাঁচ কিলো",      roman:"atta panch kilo",   style:{bottom:10,right:-130} },
          ].map((c,i) => (
            <div key={i} className="lp-hero-chip" style={{
              position:"absolute", ...c.style,
              background:"rgba(38,24,16,0.88)", border:"1px solid rgba(244,228,193,0.10)",
              backdropFilter:"blur(8px)", borderRadius:14, padding:"10px 14px",
              display:"flex", flexDirection:"column", gap:2,
              boxShadow:"0 12px 32px rgba(0,0,0,0.5)", minWidth:140,
            }}>
              <div style={{ fontSize:10, color:"#f6c768", fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase" }}>🇮🇳 {c.lang}</div>
              <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:16, color:"#f4e4c1", lineHeight:1.2 }}>{c.phrase}</div>
              <div style={{ fontSize:10, color:"#7a6a51", fontStyle:"italic" }}>"{c.roman}"</div>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="lp-cta-row">
          <button onClick={goToApp} style={{
            background:"linear-gradient(135deg,#e87722,#ff8e35)",
            color:"#1a0c04", border:"none", borderRadius:999,
            padding:"18px 36px", fontSize:17, fontWeight:700, cursor:"pointer",
            display:"flex", alignItems:"center", gap:12,
            boxShadow:"0 12px 32px rgba(232,119,34,0.45)",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a0c04" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            Tap &amp; speak — try it now
          </button>
          <button onClick={() => navigate("/hero-loop")} style={{
            background:"transparent", color:"#f4e4c1",
            border:"1px solid #c08a3a", borderRadius:999,
            padding:"18px 28px", fontSize:17, fontWeight:600, cursor:"pointer",
            display:"flex", alignItems:"center", gap:10,
          }}>
            <span style={{ fontSize:18 }}>▶</span> Watch 34s demo
          </button>
        </div>

        {/* Trust strip */}
        <div className="lp-trust">
          {[["1,200+","kirana stores"],["₹4.2 Cr","billed via voice"],["9 mins","avg. day‑close"],["₹0","API cost, forever"]].map(([n,l],i) => (
            <div key={i} style={{ textAlign:"center" }}>
              <div style={{ fontWeight:800, fontSize:26, color:"#f4e4c1" }}>{n}</div>
              <div style={{ fontSize:10, color:"#7a6a51", letterSpacing:"1px", textTransform:"uppercase", fontWeight:600, marginTop:4 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEMO PREVIEW ──────────────────────────────────── */}
      <section className="lp-section-pad" style={{ borderTop:"1px solid rgba(244,228,193,0.10)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontSize:11, color:"#e87722", fontWeight:700, letterSpacing:"2.5px",
            textTransform:"uppercase", marginBottom:14 }}>See it in action</div>
          <h2 style={{ fontFamily:"'Tiro Devanagari Hindi',serif",
            fontSize:"clamp(28px,3.5vw,48px)", color:"#f4e4c1",
            letterSpacing:"-0.5px", lineHeight:1.05, marginBottom:16 }}>
            34 seconds. <span style={{ color:"#c08a3a" }}>Poori kahani.</span>
          </h2>
          <p style={{ fontSize:15, color:"#b9a382", lineHeight:1.6, maxWidth:520, margin:"0 auto 36px" }}>
            From paper ledger chaos to voice-first billing — watch the full story in under a minute.
          </p>

          <div className="lp-preview-frame" style={{ position:"relative", borderRadius:20, overflow:"hidden",
            border:"1px solid rgba(244,228,193,0.12)",
            boxShadow:"0 40px 80px rgba(0,0,0,0.6)",
            background:"#140b06", maxWidth:900, margin:"0 auto 28px", cursor:"pointer" }}
            onClick={() => navigate("/hero-loop")}>
            <div className="lp-preview-body" style={{ padding:"48px 32px", display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", minHeight:280,
              background:"radial-gradient(ellipse 70% 55% at 50% 50%, rgba(232,119,34,0.08), transparent 60%), #140b06" }}>
              <div className="lp-preview-play" style={{ width:80, height:80, borderRadius:"50%",
                background:"linear-gradient(135deg,#ff8e35,#e87722,#a23f10)",
                boxShadow:"0 0 60px rgba(232,119,34,0.5)",
                display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M5 3l14 9-14 9V3z" fill="white"/>
                </svg>
              </div>
              <div className="lp-preview-title" style={{ fontFamily:"'Tiro Devanagari Hindi',serif",
                fontSize:28, color:"#f4e4c1", marginBottom:8 }}>
                बोलो. <span style={{ color:"#e87722" }}>Bill ban gaya.</span>
              </div>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11,
                color:"#7a6a51", letterSpacing:"2px", textTransform:"uppercase" }}>
                Tap to play · 34 seconds
              </div>
            </div>

            <div className="lp-preview-scenes" style={{ borderTop:"1px solid rgba(244,228,193,0.08)" }}>
              {[
                { label:"Problem",    time:"0s",  color:"#7a6a51" },
                { label:"बस बोलिए",  time:"7s",  color:"#e87722" },
                { label:"Voice Bill", time:"10s", color:"#e87722" },
                { label:"Udhaar",     time:"15s", color:"#c08a3a" },
                { label:"Demand AI",  time:"20s", color:"#e87722" },
                { label:"Offline",    time:"25s", color:"#7ec98a" },
                { label:"Outcome",    time:"28s", color:"#f6c768" },
                { label:"Logo",       time:"32s", color:"#e87722" },
              ].map((scene, i) => (
                <div key={i} style={{ flex:1, padding:"10px 6px", textAlign:"center",
                  borderRight: i < 7 ? "1px solid rgba(244,228,193,0.06)" : "none",
                  background:"rgba(244,228,193,0.02)" }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace",
                    fontSize:8, color:scene.color, fontWeight:700, letterSpacing:"0.8px", marginBottom:3 }}>{scene.time}</div>
                  <div style={{ fontSize:9, color:"#7a6a51" }}>{scene.label}</div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => navigate("/hero-loop")} style={{
            background:"linear-gradient(135deg,#e87722,#ff8e35)",
            color:"#1a0c04", border:"none", borderRadius:999,
            padding:"14px 32px", fontSize:14, fontWeight:700, cursor:"pointer",
            boxShadow:"0 8px 24px rgba(232,119,34,0.4)",
            display:"inline-flex", alignItems:"center", gap:10,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 3l14 9-14 9V3z" fill="#1a0c04"/>
            </svg>
            Watch full demo
          </button>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section className="lp-section-pad" style={{ borderTop:"1px solid rgba(244,228,193,0.10)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <div style={{ fontSize:12, color:"#e87722", letterSpacing:"2.5px", fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>
              04 · The toolkit
            </div>
            <h2 style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:"clamp(32px,4vw,56px)", color:"#f4e4c1", letterSpacing:"-1px", lineHeight:1.05 }}>
              A full kirana <span style={{ color:"#f6c768" }}>operating system.</span>
            </h2>
          </div>

          <div className="lp-features-grid">
            {[
              ["01","Voice billing","10 Indian languages, including Hinglish.","Try saying \"do kilo aata\""],
              ["02","Udhaar Khata","Digital credit ledger with WhatsApp reminders.","₹3,420 due from Ravi bhai"],
              ["03","Bulk import","300+ products catalog + CSV upload.","2,400 SKUs in 90 sec"],
              ["04","Day open/close","Cash drawer, drops, expenses — 9 minutes.","Today: ₹12,840 / 47 invoices"],
              ["05","WhatsApp invoice","Send the bill to customer's phone instantly.","📲 Click-to-send"],
              ["06","Offline‑first","Works without internet. Syncs when back.","Local‑first IndexedDB"],
            ].map(([num,title,desc,tag],i) => (
              <div key={i}
                style={{
                  background:"#1c1209", border:"1px solid rgba(244,228,193,0.10)",
                  borderRadius:18, padding:"28px 24px",
                  display:"flex", flexDirection:"column", minHeight:200,
                  cursor:"pointer", transition:"all 0.2s",
                }}
                onClick={goToApp}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(192,138,58,0.4)"; e.currentTarget.style.transform="translateY(-3px)" }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(244,228,193,0.10)"; e.currentTarget.style.transform="none" }}>
                <div className="lp-features-num" style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:13, color:"#e87722", fontWeight:600, letterSpacing:"2px", marginBottom:18 }}>{num}</div>
                <div className="lp-features-title" style={{ fontSize:20, fontWeight:700, color:"#f4e4c1", marginBottom:8 }}>{title}</div>
                <div style={{ fontSize:14, color:"#b9a382", lineHeight:1.5, flex:1 }}>{desc}</div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#f6c768", paddingTop:14, borderTop:"1px solid rgba(244,228,193,0.10)", marginTop:18 }}>// {tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────── */}
      <section className="lp-section-pad" style={{ paddingBottom:120 }} id="pricing">
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{
            background:"linear-gradient(135deg,#261810,#2e1d12,#261810)",
            border:"1px solid rgba(192,138,58,0.3)",
            borderRadius:28,
          }}>
            <div className="lp-pricing-pad lp-pricing-grid">
              <div>
                <div style={{ fontSize:12, color:"#e87722", letterSpacing:"2.5px", fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>
                  05 · The price
                </div>
                <h2 className="lp-pricing-price" style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:64, color:"#f4e4c1", marginBottom:16, lineHeight:1 }}>
                  ₹0. <span style={{ color:"#f6c768" }}>Hamesha.</span>
                </h2>
                <p style={{ fontSize:16, color:"#b9a382", lineHeight:1.65, marginBottom:24, maxWidth:480 }}>
                  The voice agent, demand intel, udhaar khata, and offline POS — all free, forever.
                  No card, no trial.
                </p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:14, marginBottom:28 }}>
                  {["No API cost","No subscription","No card needed","Works in Hindi by default"].map(c => (
                    <div key={c} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#b9a382" }}>
                      <div style={{ width:18, height:18, borderRadius:"50%", background:"#3a8a6b", color:"#0a1c14", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, flexShrink:0 }}>✓</div>
                      {c}
                    </div>
                  ))}
                </div>
                <div className="lp-pricing-btns">
                  <button onClick={goToApp} style={{
                    background:"linear-gradient(135deg,#e87722,#ff8e35)",
                    color:"#1a0c04", border:"none", borderRadius:999,
                    padding:"15px 30px", fontSize:15, fontWeight:700, cursor:"pointer",
                  }}>
                    Open in browser — free
                  </button>
                  <button onClick={goToApp} style={{
                    background:"transparent", color:"#f4e4c1",
                    border:"1px solid #c08a3a", borderRadius:999,
                    padding:"15px 24px", fontSize:15, fontWeight:600, cursor:"pointer",
                  }}>
                    Enter app →
                  </button>
                </div>
              </div>

              <div style={{ background:"#1c1209", border:"1px solid rgba(244,228,193,0.10)", borderRadius:20, padding:28 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#f6c768", letterSpacing:"2px", textTransform:"uppercase", marginBottom:14 }}>Optional · Multi‑staff</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:18 }}>
                  <span style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:44, color:"#f4e4c1", fontWeight:700 }}>₹199</span>
                  <span style={{ fontSize:13, color:"#7a6a51" }}>/ month · per shop</span>
                </div>
                <div style={{ height:1, background:"rgba(244,228,193,0.10)", marginBottom:18 }}/>
                {["Up to 4 staff accounts","Cloud sync across devices","Printed thermal receipts","Priority WhatsApp support","7‑day free trial · cancel anytime"].map(f => (
                  <div key={f} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, fontSize:13, color:"#b9a382" }}>
                    <span style={{ color:"#e87722", fontSize:15, flexShrink:0 }}>+</span>{f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="lp-footer-pad" style={{ borderTop:"1px solid rgba(244,228,193,0.10)", background:"#140b06" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:22, color:"#f4e4c1", marginBottom:10 }}>
                दुकान<span style={{ color:"#e87722" }}>•</span>AI
              </div>
              <div style={{ fontSize:13, color:"#7a6a51", lineHeight:1.6, maxWidth:280 }}>
                Built in Hyderabad for the 12 million kirana shops that run India.
              </div>
            </div>
            {[
              ["Product", [["Voice billing","/voice"],["Demand AI","/demand"],["Udhaar Khata","/udhar"],["Day operations","/day"],["Bulk import","/bulk-import"]]],
              ["Support", [["Install guide","/install"],["Help center","/help"],["WhatsApp","#"],["Privacy","#"]]],
              ["Company", [["About","#"],["Hindi blog","#"],["Careers","#"],["Press kit","#"]]],
            ].map(([title,links]) => (
              <div key={title}>
                <div style={{ fontSize:11, fontWeight:700, color:"#f6c768", letterSpacing:"2px", textTransform:"uppercase", marginBottom:14 }}>{title}</div>
                {links.map(([label,href]) => (
                  <div key={label} onClick={() => href==="#" ? null : navigate(href)}
                    style={{ fontSize:13, color:"#b9a382", marginBottom:10, cursor:"pointer" }}
                    onMouseEnter={e=>e.target.style.color="#f4e4c1"}
                    onMouseLeave={e=>e.target.style.color="#b9a382"}>
                    {label}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="lp-footer-bottom" style={{ paddingTop:24, borderTop:"1px solid rgba(244,228,193,0.10)", fontSize:12, color:"#7a6a51" }}>
            <span>© 2026 DukaanAI · Made with ☕ in Hyderabad</span>
            <span>व्यापार में लक्ष्मी।</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
