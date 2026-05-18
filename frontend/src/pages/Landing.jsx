import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function Landing() {
  const navigate = useNavigate()

  useEffect(() => {
    // Inject landing page styles into head
    const style = document.createElement("style")
    style.id = "landing-styles"
    style.textContent = LANDING_CSS
    document.head.appendChild(style)

    // Remove app's default body background
    document.body.style.background = "#140b06"
    document.body.style.overflow = "auto"

    return () => {
      // Cleanup on unmount
      document.getElementById("landing-styles")?.remove()
      document.body.style.background = ""
      document.body.style.overflow = ""
    }
  }, [])

  function goToApp() { navigate("/dashboard") }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      overflowY:"auto", overflowX:"hidden",
      fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif",
      background:"#140b06", color:"#f4e4c1",
    }}>

      {/* NAV */}
      <nav style={{
        position:"sticky", top:0, zIndex:50,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"20px 64px",
        borderBottom:"1px solid rgba(244,228,193,0.10)",
        background:"rgba(20,11,6,0.75)",
        backdropFilter:"blur(12px)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:36, height:36, borderRadius:10, fontSize:18,
            background:"linear-gradient(135deg,#f6c768,#c08a3a,#5a3e18)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>🏪</div>
          <div>
            <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:22, color:"#f4e4c1", letterSpacing:"0.5px" }}>
              दुकान<span style={{ color:"#e87722" }}>•</span>AI
            </div>
            <div style={{ fontSize:10, color:"#7a6a51", letterSpacing:"1.8px", textTransform:"uppercase", marginTop:2 }}>
              Bahi‑Khata for India
            </div>
          </div>
        </div>

        <nav style={{ display:"flex", gap:32, fontSize:14, fontWeight:500, color:"#b9a382" }}>
          {["How it works","Demand AI","Languages","Pricing"].map(l => (
            <a key={l} href={"#"+l.toLowerCase().replace(/ /g,"-")}
              style={{ color:"#b9a382", textDecoration:"none" }}
              onMouseEnter={e=>e.target.style.color="#f4e4c1"}
              onMouseLeave={e=>e.target.style.color="#b9a382"}>
              {l}
            </a>
          ))}
        </nav>

        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <button onClick={goToApp}
            style={{ color:"#f4e4c1", fontSize:14, fontWeight:500, background:"none", border:"none", cursor:"pointer" }}>
            Sign in
          </button>
          <button onClick={goToApp}
            style={{
              background:"linear-gradient(135deg,#e87722,#ff8e35)",
              color:"#1a0c04", border:"none", borderRadius:999,
              padding:"10px 22px", fontSize:14, fontWeight:700, cursor:"pointer",
              boxShadow:"0 8px 24px rgba(232,119,34,0.35)",
            }}>
            Get the app — free
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position:"relative", padding:"80px 64px 120px", textAlign:"center", overflow:"hidden" }}>
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none",
          background:"radial-gradient(circle at 50% 35%, rgba(232,119,34,0.09), transparent 60%)",
        }}/>

        {/* Eyebrow */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:28 }}>
          <div style={{
            display:"inline-flex", gap:10, alignItems:"center",
            background:"rgba(232,119,34,0.10)", border:"1px solid rgba(232,119,34,0.30)",
            borderRadius:999, padding:"6px 18px", fontSize:12, color:"#e87722", fontWeight:600,
          }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#ff8e35", boxShadow:"0 0 12px #ff8e35" }}/>
            10 भारतीय भाषाएँ &nbsp;·&nbsp; Free forever &nbsp;·&nbsp; Works offline
          </div>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily:"'Tiro Devanagari Hindi','Fraunces',serif",
          fontSize:"clamp(64px,8vw,108px)", lineHeight:0.95,
          letterSpacing:"-2px", color:"#f4e4c1", marginBottom:24,
        }}>
          बोलो.<br/>
          <span style={{ color:"#e87722" }}>Bill ban gaya.</span>
        </h1>

        <p style={{ fontSize:19, lineHeight:1.6, color:"#b9a382", maxWidth:720, margin:"0 auto 60px" }}>
          India's first voice‑first POS for kirana stores. Speak items in
          Hindi, Telugu, Tamil — any of <b style={{ color:"#f4e4c1" }}>10 languages</b> — and DukaanAI bills,
          tracks stock, and reads the day's news to warn you about demand spikes.
        </p>

        {/* Mic SVG */}
        <div style={{ position:"relative", width:480, height:480, margin:"0 auto 64px" }}>
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
            {/* waveform ticks */}
            {[...Array(72)].map((_,i) => {
              const a = (i/72)*Math.PI*2
              const h = 8 + ((i*7)%18)
              const r0=210, r1=210+h
              const hot = i%9===0
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

          {/* Phrase chips */}
          {[
            { lang:"Hindi",   phrase:"दूध दो किलो",        roman:"doodh do kilo",     style:{top:10,left:-140} },
            { lang:"Telugu",  phrase:"ఉప్పు ఒక కిలో",     roman:"uppu okati kilo",   style:{top:10,right:-140} },
            { lang:"Tamil",   phrase:"அரிசி ஐந்து கிலோ",  roman:"arisi anju kilo",   style:{top:210,left:-200} },
            { lang:"Marathi", phrase:"चहा अर्धा किलो",      roman:"chaha ardha kilo",  style:{top:210,right:-200} },
            { lang:"Kannada", phrase:"ಸಕ್ಕರೆ ಎರಡು ಕಿಲೋ",  roman:"sakkare eradu kilo",style:{bottom:10,left:-130} },
            { lang:"Bengali", phrase:"আটা পাঁচ কিলো",       roman:"atta panch kilo",   style:{bottom:10,right:-130} },
          ].map((c,i) => (
            <div key={i} style={{
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

        {/* CTA */}
        <div style={{ display:"flex", gap:16, justifyContent:"center", marginBottom:80 }}>
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
          <button onClick={goToApp} style={{
            background:"transparent", color:"#f4e4c1",
            border:"1px solid #c08a3a", borderRadius:999,
            padding:"18px 28px", fontSize:17, fontWeight:600, cursor:"pointer",
            display:"flex", alignItems:"center", gap:10,
          }}>
            <span style={{ fontSize:18 }}>▶</span> Open the app
          </button>
        </div>

        {/* Trust strip */}
        <div style={{ display:"flex", justifyContent:"center", gap:56, flexWrap:"wrap" }}>
          {[["1,200+","kirana stores"],["₹4.2 Cr","billed via voice"],["9 mins","avg. day‑close"],["₹0","API cost, forever"]].map(([n,l],i) => (
            <div key={i} style={{ textAlign:"center" }}>
              <div style={{ fontWeight:800, fontSize:26, color:"#f4e4c1" }}>{n}</div>
              <div style={{ fontSize:10, color:"#7a6a51", letterSpacing:"1px", textTransform:"uppercase", fontWeight:600, marginTop:4 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES STRIP */}
      <section style={{ padding:"80px 64px", borderTop:"1px solid rgba(244,228,193,0.10)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <div style={{ fontSize:12, color:"#e87722", letterSpacing:"2.5px", fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>
              04 · The toolkit
            </div>
            <h2 style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:"clamp(36px,4vw,56px)", color:"#f4e4c1", letterSpacing:"-1px", lineHeight:1.05 }}>
              A full kirana <span style={{ color:"#f6c768" }}>operating system.</span>
            </h2>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
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
                <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:13, color:"#e87722", fontWeight:600, letterSpacing:"2px", marginBottom:18 }}>{num}</div>
                <div style={{ fontSize:20, fontWeight:700, color:"#f4e4c1", marginBottom:8 }}>{title}</div>
                <div style={{ fontSize:14, color:"#b9a382", lineHeight:1.5, flex:1 }}>{desc}</div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#f6c768", paddingTop:14, borderTop:"1px solid rgba(244,228,193,0.10)", marginTop:18 }}>// {tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding:"80px 64px 120px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{
            background:"linear-gradient(135deg,#261810,#2e1d12,#261810)",
            border:"1px solid rgba(192,138,58,0.3)",
            borderRadius:28, padding:"64px",
            display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:48, alignItems:"center",
          }}>
            <div>
              <div style={{ fontSize:12, color:"#e87722", letterSpacing:"2.5px", fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>
                05 · The price
              </div>
              <h2 style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:"clamp(48px,5vw,64px)", color:"#f4e4c1", marginBottom:20, lineHeight:1 }}>
                ₹0. <span style={{ color:"#f6c768" }}>Hamesha.</span>
              </h2>
              <p style={{ fontSize:16, color:"#b9a382", lineHeight:1.65, marginBottom:28, maxWidth:480 }}>
                The voice agent, demand intel, udhaar khata, and offline POS — all free, forever.
                No card, no trial.
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:16, marginBottom:32 }}>
                {["No API cost","No subscription","No card needed","Works in Hindi by default"].map(c => (
                  <div key={c} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#b9a382" }}>
                    <div style={{ width:18, height:18, borderRadius:"50%", background:"#3a8a6b", color:"#0a1c14", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800 }}>✓</div>
                    {c}
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
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
                <span style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:48, color:"#f4e4c1", fontWeight:700 }}>₹199</span>
                <span style={{ fontSize:14, color:"#7a6a51" }}>/ month · per shop</span>
              </div>
              <div style={{ height:1, background:"rgba(244,228,193,0.10)", marginBottom:18 }}/>
              {["Up to 4 staff accounts","Cloud sync across devices","Printed thermal receipts","Priority WhatsApp support","7‑day free trial · cancel anytime"].map(f => (
                <div key={f} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, fontSize:13, color:"#b9a382" }}>
                  <span style={{ color:"#e87722", fontSize:15 }}>+</span>{f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding:"64px", borderTop:"1px solid rgba(244,228,193,0.10)", background:"#140b06" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr", gap:48, marginBottom:40 }}>
            <div>
              <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:24, color:"#f4e4c1", marginBottom:10 }}>
                दुकान<span style={{ color:"#e87722" }}>•</span>AI
              </div>
              <div style={{ fontSize:13, color:"#7a6a51", lineHeight:1.6, maxWidth:300 }}>
                Built in Hyderabad for the 12 million kirana shops that run India. Voice, vernacular, no jargon.
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
          <div style={{ display:"flex", justifyContent:"space-between", paddingTop:24, borderTop:"1px solid rgba(244,228,193,0.10)", fontSize:12, color:"#7a6a51" }}>
            <span>© 2026 DukaanAI · Made with ☕ in Hyderabad</span>
            <span>व्यापार में लक्ष्मी।</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

const LANDING_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`
