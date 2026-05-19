import { useState } from "react"

// ── Theme tokens (Variant A: Dark brass + saffron) ────────────────
const T = {
  bg0:"#140b06", bg1:"#1c1209", bg2:"#261810", bg3:"#33200f",
  ink:"#f4e4c1", inkDim:"#b9a382", inkFaint:"#7a6a51",
  rule:"rgba(244,228,193,0.12)", ruleSoft:"rgba(244,228,193,0.06)",
  brass:"#c08a3a", brassLite:"#f6c768",
  saffron:"#e87722", saffronHot:"#ff8e35",
  ember:"#b3261e", emberLite:"#ff8e7a",
  jade:"#3a8a6b", jadeLite:"#4cb892",
  sky:"#5aa7d8",
  font:"'Plus Jakarta Sans', system-ui, sans-serif",
  display:"'Tiro Devanagari Hindi', 'Plus Jakarta Sans', serif",
  mono:"'IBM Plex Mono', monospace",
}

const INR = n => "₹" + (n||0).toLocaleString("en-IN")

// ── Shared components ──────────────────────────────────────────────
function StatusBar({ time="9:41", mode="cloud" }) {
  return (
    <div style={{ height:30, padding:"0 18px", display:"flex", alignItems:"center",
      justifyContent:"space-between", fontFamily:T.mono, fontSize:11,
      color:T.inkDim, background:T.bg0, fontWeight:600, flexShrink:0 }}>
      <span style={{color:T.ink}}>{time}</span>
      <span style={{display:"flex",alignItems:"center",gap:6}}>
        {mode==="cloud" && <span style={{fontSize:9,color:T.jadeLite}}>● sync</span>}
        {mode==="offline" && <span style={{fontSize:9,color:T.brassLite}}>● local</span>}
        <span>5G</span><span>▮▮▮▯</span>
      </span>
    </div>
  )
}

function TopBar({ titleEn, titleHi, sub, rightLabel, back, sticky=true }) {
  return (
    <div style={{ position:sticky?"sticky":"relative", top:0, zIndex:5,
      background:"rgba(20,11,6,0.86)", backdropFilter:"blur(6px)",
      borderBottom:`1px solid ${T.rule}`, padding:"12px 16px",
      display:"flex", alignItems:"center", gap:12 }}>
      {back && (
        <div style={{ width:36,height:36,borderRadius:10,border:`1px solid ${T.rule}`,
          background:"transparent",color:T.ink,fontSize:18,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>←</div>
      )}
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8}}>
          <div style={{fontSize:16,fontWeight:700,color:T.ink,lineHeight:1.1,letterSpacing:"-0.3px"}}>{titleEn}</div>
          {titleHi && <div style={{fontFamily:T.display,fontSize:13,color:T.brassLite}}>{titleHi}</div>}
        </div>
        {sub && <div style={{fontSize:10,color:T.inkFaint,marginTop:2,letterSpacing:"0.5px"}}>{sub}</div>}
      </div>
      {rightLabel && (
        <button style={{ background:`linear-gradient(135deg,${T.saffron},${T.saffronHot})`,
          color:"#1a0c04",border:"none",borderRadius:999,padding:"8px 14px",
          fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0 }}>{rightLabel}</button>
      )}
    </div>
  )
}

function TabBar({ active="home" }) {
  const tabs = [
    { id:"home",   label:"Home",   icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg> },
    { id:"bill",   label:"Bill",   icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg> },
    { id:"voice",  label:"",       icon:null },
    { id:"demand", label:"Demand", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-7"/></svg> },
    { id:"more",   label:"More",   icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg> },
  ]
  return (
    <div style={{ position:"relative",flexShrink:0,background:T.bg1,
      borderTop:`1px solid ${T.rule}`,padding:"8px 8px 12px",
      display:"flex",justifyContent:"space-around",alignItems:"flex-end" }}>
      {tabs.map(t => {
        if (t.id==="voice") return (
          <div key="voice" style={{ position:"relative",marginTop:-22,
            width:58,height:58,borderRadius:"50%",
            background:`linear-gradient(135deg,${T.saffron},${T.saffronHot})`,
            boxShadow:`0 0 0 4px ${T.bg1},0 8px 20px ${T.saffron}55`,
            display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a0c04" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
        )
        const on = active===t.id
        return (
          <button key={t.id} style={{ background:"transparent",border:"none",cursor:"pointer",
            display:"flex",flexDirection:"column",alignItems:"center",gap:3,
            color:on?T.saffron:T.inkFaint,padding:"4px 8px" }}>
            <div style={{width:22,height:22}}>{t.icon}</div>
            <span style={{fontSize:9,fontWeight:600,letterSpacing:"0.3px"}}>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function Card({ children, padding=14, accent, style={} }) {
  return (
    <div style={{ background:T.bg2,borderRadius:14,padding,
      border:`1px solid ${T.rule}`,
      ...(accent?{borderLeft:`3px solid ${accent}`}:{}), ...style }}>
      {children}
    </div>
  )
}

function SectionLabel({ children, action, hindi, style={} }) {
  return (
    <div style={{ display:"flex",alignItems:"baseline",justifyContent:"space-between",
      margin:"4px 4px 10px", ...style }}>
      <div style={{display:"flex",alignItems:"baseline",gap:8}}>
        <div style={{fontSize:11,color:T.brassLite,fontWeight:700,letterSpacing:"2px",textTransform:"uppercase"}}>{children}</div>
        {hindi && <div style={{fontFamily:T.display,fontSize:12,color:T.inkFaint}}>{hindi}</div>}
      </div>
      {action && <div style={{fontSize:11,color:T.saffron,fontWeight:600,cursor:"pointer"}}>{action}</div>}
    </div>
  )
}

function StatTile({ label, value, sub, tone=T.brassLite }) {
  return (
    <div style={{ background:T.bg2,borderRadius:12,padding:"12px",
      border:`1px solid ${T.rule}`,position:"relative",overflow:"hidden" }}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:tone}}/>
      <div style={{fontSize:9,color:T.inkFaint,letterSpacing:"1.2px",fontWeight:700,textTransform:"uppercase"}}>{label}</div>
      <div style={{fontFamily:T.display,fontSize:22,color:T.ink,fontWeight:700,marginTop:6,lineHeight:1}}>{value}</div>
      {sub && <div style={{fontSize:9,color:tone,marginTop:4,fontWeight:600}}>{sub}</div>}
    </div>
  )
}

function Pill({ children, tone=T.brass, solid=false }) {
  return (
    <span style={{ fontSize:9,fontWeight:700,letterSpacing:"1px",
      padding:"3px 8px",borderRadius:999,textTransform:"uppercase",
      background:solid?tone:`${tone}22`,
      color:solid?"#1a0c04":tone,
      border:solid?"none":`1px solid ${tone}55` }}>{children}</span>
  )
}

function Screen({ children, tabActive="home", topBar }) {
  return (
    <div style={{ width:"100%",height:"100%",background:T.bg0,color:T.ink,
      fontFamily:T.font,display:"flex",flexDirection:"column",
      overflow:"hidden",borderRadius:18 }}>
      <StatusBar/>
      {topBar}
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden"}}>{children}</div>
      <TabBar active={tabActive}/>
    </div>
  )
}

function Waveform({ width=200, height=60, hot=false }) {
  const bars=28
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{display:"block",margin:"0 auto"}}>
      {[...Array(bars)].map((_,i)=>{
        const w=(width-(bars-1)*3)/bars
        const x=i*(w+3)
        const base=Math.sin(i*0.7)*0.4+0.55
        const noise=((i*17)%9)/9*0.35
        const h=(base+noise)*height*(hot?0.9:0.55)
        const y=(height-h)/2
        const color=hot?(i%7===0?T.saffronHot:T.brassLite):(i%5===0?T.brass:T.inkFaint)
        return <rect key={i} x={x} y={y} width={w} height={h} rx={w/2} fill={color}/>
      })}
    </svg>
  )
}

// WhatsApp icon
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
    <path d="M20.5 3.5A11 11 0 003.6 17.4L2 22l4.7-1.5A11 11 0 1020.5 3.5zm-8.5 17a8.5 8.5 0 01-4.3-1.2l-.3-.2-2.8.9.9-2.7-.2-.3a8.5 8.5 0 1112.7-3.5 8.5 8.5 0 01-6 7zm4.7-6.4c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.6.1a7 7 0 01-3.4-3c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.5l-.8-2c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3a3 3 0 00-1 2.2c0 1.3 1 2.6 1.1 2.8.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.1-1.4-.1-.1-.3-.2-.5-.3z"/>
  </svg>
)

// ─────────────────────────────────────────────────────────────────
// SCREEN IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────

function OnboardingScreen() {
  return (
    <div style={{ width:"100%",height:"100%",background:T.bg0,color:T.ink,
      fontFamily:T.font,display:"flex",flexDirection:"column",overflow:"hidden",borderRadius:18 }}>
      <StatusBar/>
      <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",overflowY:"auto"}}>
        <div style={{position:"absolute",inset:0,background:`radial-gradient(circle at 50% 22%, rgba(232,119,34,0.18), transparent 55%)`,pointerEvents:"none"}}/>
        <div style={{position:"relative",padding:"28px 22px 0",textAlign:"center"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:30}}>
            <div style={{width:38,height:38,borderRadius:10,
              background:`linear-gradient(135deg,${T.brass},${T.saffron})`,
              display:"flex",alignItems:"center",justifyContent:"center",
              color:"#1a0c04",fontFamily:T.display,fontWeight:700,fontSize:18}}>द</div>
            <span style={{fontFamily:T.display,fontSize:22,color:T.ink,letterSpacing:"0.5px"}}>
              दुकान<span style={{color:T.saffron}}>•</span>AI
            </span>
          </div>
          <div style={{width:160,height:160,margin:"0 auto 24px",borderRadius:"50%",
            background:`radial-gradient(circle at 35% 30%,${T.brassLite},${T.brass} 55%,#5a3e18)`,
            boxShadow:`0 0 0 14px rgba(232,119,34,0.12),0 0 0 28px rgba(232,119,34,0.06),0 20px 40px rgba(0,0,0,0.5)`,
            display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#1a0c04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            <div style={{position:"absolute",bottom:8,right:8,width:18,height:18,
              borderRadius:"50%",background:T.jadeLite,color:"#0a1c14",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,fontWeight:800,border:`3px solid ${T.bg0}`}}>✓</div>
          </div>
          <div style={{fontFamily:T.display,fontSize:32,color:T.ink,lineHeight:1.1,
            marginBottom:10,letterSpacing:"-0.5px"}}>
            बोलो,<br/><span style={{color:T.saffron}}>Bill ban gaya.</span>
          </div>
          <p style={{fontSize:13,color:T.inkDim,lineHeight:1.5,maxWidth:280,margin:"0 auto 22px"}}>
            Speak items in your language. We'll handle the bill, GST, stock, and udhaar.
          </p>
        </div>
        <div style={{position:"relative",padding:"0 22px 16px"}}>
          <SectionLabel hindi="भाषा चुनें">PICK YOUR PRIMARY LANGUAGE</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{native:"हिंदी",label:"Hindi",selected:true},{native:"తెలుగు",label:"Telugu"},
              {native:"தமிழ்",label:"Tamil"},{native:"ಕನ್ನಡ",label:"Kannada"},
              {native:"मराठी",label:"Marathi"},{native:"বাংলা",label:"Bengali"}].map((l,i)=>(
              <div key={i} style={{
                background:l.selected?`linear-gradient(135deg,${T.saffron},${T.saffronHot})`:T.bg2,
                color:l.selected?"#1a0c04":T.ink,
                border:l.selected?"none":`1px solid ${T.rule}`,
                borderRadius:10,padding:"10px 12px",
                display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                <div style={{fontFamily:T.display,fontSize:16,fontWeight:600}}>{l.native}</div>
                <div style={{fontSize:10,opacity:0.75,letterSpacing:"0.5px"}}>{l.label}</div>
                {l.selected && <div style={{marginLeft:"auto",fontSize:14,fontWeight:800}}>✓</div>}
              </div>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:8,fontSize:10,color:T.inkFaint}}>+ 4 more in settings</div>
        </div>
      </div>
      <div style={{flexShrink:0,padding:"14px 22px 20px",borderTop:`1px solid ${T.rule}`,background:"rgba(20,11,6,0.92)"}}>
        <button style={{width:"100%",background:`linear-gradient(135deg,${T.saffron},${T.saffronHot})`,
          color:"#1a0c04",border:"none",borderRadius:12,padding:"14px",
          fontSize:14,fontWeight:800,cursor:"pointer",
          boxShadow:`0 8px 20px ${T.saffron}40`,letterSpacing:"0.3px",
          display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          🎙 Start with Hindi <span style={{fontSize:18}}>→</span>
        </button>
        <div style={{textAlign:"center",marginTop:10,fontSize:11,color:T.inkFaint}}>
          Free forever · No card · Works offline
        </div>
      </div>
    </div>
  )
}

function DashboardScreen() {
  return (
    <Screen tabActive="home" topBar={
      <div style={{background:"rgba(20,11,6,0.9)",backdropFilter:"blur(6px)",
        borderBottom:`1px solid ${T.rule}`,padding:"12px 16px",
        display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:38,height:38,borderRadius:10,
          background:`linear-gradient(135deg,${T.brass},${T.saffron})`,
          display:"flex",alignItems:"center",justifyContent:"center",
          color:"#1a0c04",fontFamily:T.display,fontWeight:700,fontSize:17}}>न</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,color:T.ink,fontWeight:700,lineHeight:1.1}}>नमस्ते, Naresh ji</div>
          <div style={{fontSize:10,color:T.inkFaint,marginTop:2}}>Naresh General Store · Today</div>
        </div>
        <button style={{width:36,height:36,borderRadius:10,background:T.bg2,
          border:`1px solid ${T.rule}`,color:T.brassLite,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          <div style={{position:"absolute",top:6,right:6,width:8,height:8,borderRadius:"50%",background:T.saffronHot,boxShadow:`0 0 6px ${T.saffronHot}`}}/>
        </button>
      </div>
    }>
      <div style={{padding:"12px 14px"}}>
        {/* Hero takings */}
        <div style={{background:`linear-gradient(135deg,${T.bg2} 0%,#2e1d12 100%)`,
          borderRadius:18,padding:"18px",border:`1px solid ${T.brass}40`,
          position:"relative",overflow:"hidden",marginBottom:12}}>
          <svg viewBox="0 0 200 200" style={{position:"absolute",top:-40,right:-40,width:180,height:180,opacity:0.18}}>
            {[...Array(14)].map((_,i)=><circle key={i} cx="100" cy="100" r={20+i*8} fill="none" stroke={T.brassLite} strokeWidth="0.6"/>)}
          </svg>
          <div style={{position:"relative"}}>
            <div style={{fontSize:10,color:T.brassLite,letterSpacing:"1.5px",fontWeight:700,textTransform:"uppercase"}}>Today's takings</div>
            <div style={{fontFamily:T.display,fontSize:42,color:T.ink,fontWeight:700,lineHeight:1,marginTop:8,letterSpacing:"-1px"}}>₹12,840</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,fontSize:11}}>
              <span style={{color:T.jadeLite,fontWeight:600}}>↗ +18% vs avg</span>
              <span style={{color:T.inkDim}}>47 invoices · 9 udhaar</span>
            </div>
          </div>
        </div>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          <StatTile label="UDHAAR" value="₹6,440" sub="7 customers" tone={T.ember}/>
          <StatTile label="PRODUCTS" value="2,412" sub="12 low stock" tone={T.brass}/>
          <StatTile label="AVG INV" value="₹273" sub="this week" tone={T.jadeLite}/>
        </div>
        {/* Alert */}
        <Card accent={T.ember} padding={12} style={{marginBottom:14,background:"rgba(179,38,30,0.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:18}}>🎉</div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:T.ink}}>Holi in 7 days</div>
              <div style={{fontSize:10,color:T.inkDim,marginTop:2}}>Milk 3×, sugar 2× — stock now</div>
            </div>
            <button style={{background:T.ember,color:"#fff",border:"none",
              borderRadius:8,padding:"5px 10px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Order →</button>
          </div>
        </Card>
        {/* Quick actions */}
        <SectionLabel hindi="त्वरित">QUICK ACTIONS</SectionLabel>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:18}}>
          {[{label:"New Sale",emoji:"🛒",tone:T.saffron},{label:"Add Stock",emoji:"📦",tone:T.brassLite},
            {label:"Udhaar",emoji:"📒",tone:T.ember},{label:"Scan",emoji:"📷",tone:T.jadeLite}].map((qa,i)=>(
            <button key={i} style={{background:T.bg2,border:`1px solid ${T.rule}`,borderRadius:12,
              padding:"12px 6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
              <div style={{width:34,height:34,borderRadius:9,background:`${qa.tone}18`,
                border:`1px solid ${qa.tone}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{qa.emoji}</div>
              <span style={{fontSize:10,color:T.ink,fontWeight:600}}>{qa.label}</span>
            </button>
          ))}
        </div>
        {/* Recent sales */}
        <SectionLabel action="View all →" hindi="आज की बिक्री">RECENT SALES</SectionLabel>
        <Card padding={0} style={{marginBottom:14}}>
          {[{who:"Ramesh",last:"2 min ago",amt:540,udhaar:true},{who:"Sunita aunty",last:"18 min ago",amt:312},
            {who:"Walk-in",last:"42 min ago",amt:68},{who:"Ravi bhai",last:"1 hr ago",amt:420}].map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,
              padding:"12px 14px",borderBottom:i<3?`1px solid ${T.ruleSoft}`:"none"}}>
              <div style={{width:32,height:32,borderRadius:"50%",
                background:`linear-gradient(135deg,${T.brass},${T.saffron})`,
                color:"#1a0c04",display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:800,fontSize:13,flexShrink:0}}>{r.who.charAt(0)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:T.ink,display:"flex",alignItems:"center",gap:6}}>
                  {r.who}{r.udhaar&&<Pill tone={T.ember}>UDHAAR</Pill>}
                </div>
                <div style={{fontSize:10,color:T.inkFaint,marginTop:2}}>{r.last}</div>
              </div>
              <div style={{fontFamily:T.display,fontSize:16,color:r.udhaar?T.ember:T.brassLite,fontWeight:700}}>{INR(r.amt)}</div>
            </div>
          ))}
        </Card>
        {/* Low stock */}
        <SectionLabel action="Reorder →" hindi="कम स्टॉक">LOW STOCK</SectionLabel>
        <Card padding={0} style={{marginBottom:24}}>
          {[{name:"Amul Butter 100g",stock:2,min:8,out:true},{name:"Aashirvaad Atta 5kg",stock:4,min:10},{name:"Tata Salt 1kg",stock:6,min:15}].map((p,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,
              padding:"12px 14px",borderBottom:i<2?`1px solid ${T.ruleSoft}`:"none"}}>
              <div style={{width:32,height:32,borderRadius:8,
                background:p.out?"rgba(179,38,30,0.18)":"rgba(192,138,58,0.18)",
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14}}>
                {p.out?"🔴":"🟡"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:T.ink}}>{p.name}</div>
                <div style={{fontSize:10,color:T.inkFaint,marginTop:2}}>Min: {p.min} · Left: {p.stock}</div>
              </div>
              <Pill tone={p.out?T.ember:T.brass}>{p.out?"OUT!":"LOW"}</Pill>
            </div>
          ))}
        </Card>
      </div>
    </Screen>
  )
}

function VoiceIdleScreen() {
  return (
    <Screen tabActive="voice" topBar={<TopBar titleEn="Voice Agent" titleHi="🎤 बोलो" sub="Telugu · Hindi · Tamil · Kannada · 6 more" rightLabel="Lang ▾"/>}>
      <div style={{padding:"16px",display:"flex",flexDirection:"column",height:"100%"}}>
        <div style={{background:"rgba(58,138,107,0.12)",border:`1px solid ${T.jade}40`,
          borderRadius:10,padding:"8px 12px",marginBottom:14,
          display:"flex",alignItems:"center",gap:8,fontSize:11,color:T.jadeLite,fontWeight:600}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:T.jadeLite}}/>
          Free · No API cost · Works offline
        </div>
        <div style={{background:`linear-gradient(180deg,${T.bg2} 0%,${T.bg1} 100%)`,
          borderRadius:18,padding:"28px 16px",textAlign:"center",
          border:`1px solid ${T.rule}`,marginBottom:14}}>
          <div style={{width:120,height:120,margin:"0 auto 14px",borderRadius:"50%",
            background:`radial-gradient(circle at 35% 30%,${T.brassLite},${T.brass} 60%,#5a3e18)`,
            boxShadow:`0 0 0 8px ${T.brass}18,0 16px 32px rgba(0,0,0,0.4)`,
            display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#1a0c04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <div style={{fontFamily:T.display,fontSize:22,color:T.ink,fontWeight:600,marginBottom:6,letterSpacing:"-0.3px"}}>Tap &amp; speak</div>
          <div style={{fontSize:12,color:T.inkDim,lineHeight:1.5,maxWidth:240,margin:"0 auto"}}>
            Try: <span style={{color:T.brassLite,fontFamily:T.display}}>"दो किलो आटा और एक तेल"</span>
          </div>
        </div>
        <SectionLabel hindi="उदाहरण">TRY SAYING</SectionLabel>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {[{hi:"दूध दो किलो",rom:"doodh do kilo",lang:"Hindi"},
            {hi:"அரிசி ஐந்து கிலோ",rom:"arisi anju kilo",lang:"Tamil"},
            {hi:"ఉప్పు ఒక కిలో",rom:"uppu okati kilo",lang:"Telugu"}].map((ex,i)=>(
            <div key={i} style={{background:T.bg2,border:`1px solid ${T.rule}`,
              borderRadius:12,padding:"10px 14px",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontFamily:T.display,fontSize:15,color:T.ink}}>"{ex.hi}"</div>
                <div style={{fontFamily:T.mono,fontSize:10,color:T.inkFaint,marginTop:2}}>{ex.rom}</div>
              </div>
              <Pill tone={T.brass}>{ex.lang}</Pill>
            </div>
          ))}
        </div>
        <SectionLabel action="0 items">CURRENT BILL</SectionLabel>
        <div style={{flex:1,background:T.bg2,borderRadius:12,
          border:`1px dashed ${T.rule}`,padding:"24px 16px",
          textAlign:"center",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontSize:34,marginBottom:8,opacity:0.6}}>🎤</div>
          <div style={{fontSize:12,color:T.inkFaint}}>Speak a product to add</div>
        </div>
      </div>
    </Screen>
  )
}

function VoiceListeningScreen() {
  return (
    <Screen tabActive="voice" topBar={<TopBar titleEn="Voice Agent" titleHi="🎤 सुन रहा हूँ" sub="Listening · Hindi · 00:14"/>}>
      <div style={{padding:"16px",display:"flex",flexDirection:"column",height:"100%"}}>
        <div style={{background:`radial-gradient(circle at 50% 60%,rgba(232,119,34,0.18),transparent 70%)`,
          borderRadius:18,padding:"20px 16px",textAlign:"center",
          border:`1px solid ${T.saffron}55`,marginBottom:12,position:"relative",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,
            fontSize:10,color:T.saffron,fontWeight:700,letterSpacing:"2px",marginBottom:8}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:T.saffronHot,boxShadow:`0 0 12px ${T.saffronHot}`}}/>
            LISTENING
          </div>
          <Waveform width={280} height={56} hot/>
          <div style={{fontFamily:T.display,fontSize:22,color:T.ink,marginTop:10,lineHeight:1.2}}>"दो किलो आटा और एक…"</div>
          <div style={{fontFamily:T.mono,fontSize:10,color:T.inkFaint,marginTop:4}}>do kilo aata aur ek…</div>
        </div>
        <SectionLabel hindi="संवाद">CONVERSATION</SectionLabel>
        <div style={{flex:1,overflowY:"auto",marginBottom:12}}>
          {[{who:"shop",hi:"दूध दो किलो",rom:"doodh do kilo",t:"00:08"},
            {who:"ai",text:"✓ Amul Milk × 2 kg",amt:"₹120",t:"00:09"},
            {who:"shop",hi:"पारले-जी एक पैकेट",rom:"parle-g ek packet",t:"00:11"},
            {who:"ai",text:"✓ Parle-G 250g × 1 pkt",amt:"₹30",t:"00:11"},
            {who:"shop",hi:"दो किलो आटा और एक…",rom:"do kilo aata aur ek… (typing)",t:"00:14",live:true}].map((l,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:10}}>
              <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,
                background:l.who==="shop"?T.brass:T.saffron,color:"#1a0c04",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800}}>
                {l.who==="shop"?"आप":"AI"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                {l.who==="shop"?(
                  <>
                    <div style={{fontFamily:T.display,fontSize:15,color:l.live?T.saffron:T.ink,lineHeight:1.2}}>{l.hi}</div>
                    <div style={{fontFamily:T.mono,fontSize:9,color:T.inkFaint,marginTop:2}}>{l.rom} · {l.t}</div>
                  </>
                ):(
                  <div style={{background:"rgba(232,119,34,0.08)",border:`1px solid ${T.saffron}30`,
                    borderRadius:10,padding:"8px 10px",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:11,color:T.brassLite}}>{l.text}</div>
                    <div style={{fontFamily:T.display,fontSize:13,color:T.ink,fontWeight:700}}>{l.amt}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{background:`linear-gradient(180deg,${T.bg2},${T.bg1})`,
          border:`1px solid ${T.brass}55`,borderRadius:14,padding:"12px 14px",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
            <div style={{fontSize:10,color:T.brassLite,letterSpacing:"1.5px",fontWeight:700}}>BILL · 2 ITEMS</div>
            <div style={{fontFamily:T.display,fontSize:24,color:T.saffron,fontWeight:700}}>₹150</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={{flex:1,background:T.bg0,color:T.inkDim,border:`1px solid ${T.rule}`,
              borderRadius:10,padding:"10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>Clear</button>
            <button style={{flex:2,background:`linear-gradient(135deg,${T.saffron},${T.saffronHot})`,
              color:"#1a0c04",border:"none",borderRadius:10,padding:"10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
              🧾 Generate invoice
            </button>
          </div>
        </div>
      </div>
    </Screen>
  )
}

function DemandScreen() {
  return (
    <Screen tabActive="demand" topBar={<TopBar titleEn="Demand AI" titleHi="🧠 माँग" sub="Festivals · News · Patterns" rightLabel="● LIVE"/>}>
      <div style={{padding:"12px 14px"}}>
        <div style={{background:`linear-gradient(135deg,${T.ember}25,${T.saffron}18)`,
          border:`1px solid ${T.ember}40`,borderRadius:14,padding:"14px",marginBottom:12,
          display:"flex",alignItems:"center",gap:12,position:"relative",overflow:"hidden"}}>
          <div style={{fontSize:32,flexShrink:0}}>🌡️</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:T.emberLite}}>Peak Summer · Heatwave week</div>
            <div style={{fontSize:10,color:T.inkDim,marginTop:2,lineHeight:1.4}}>ORS, lemon, cold drinks — never run out</div>
          </div>
          <div style={{fontFamily:T.display,fontSize:30,color:T.emberLite,fontWeight:700,lineHeight:1}}>5×</div>
        </div>
        <div style={{background:T.bg2,borderRadius:10,padding:3,display:"flex",marginBottom:14,border:`1px solid ${T.rule}`}}>
          {["🚨 Alerts (4)","🎉 Festivals","📰 News","📊 Patterns"].map((t,i)=>(
            <button key={i} style={{flex:1,padding:"7px 4px",border:"none",
              background:i===0?`linear-gradient(135deg,${T.saffron},${T.saffronHot})`:"transparent",
              color:i===0?"#1a0c04":T.inkDim,fontSize:9,fontWeight:700,borderRadius:8,cursor:"pointer"}}>{t}</button>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[{icon:"🎉",tone:T.saffron,title:"Holi in 7 days — low stock",body:"Milk, sugar, dry fruits, curd",tip:"Stock 3× normal for milk",tag:"URGENT"},
            {icon:"📰",tone:T.emberLite,title:"Heatwave alert · S. India",body:"ORS, cold drinks, lemon, salt",tip:"4 articles in last 3 days",tag:"NEWS"},
            {icon:"📈",tone:T.brassLite,title:"Onion price rising",body:"Mandi up 18% vs last week",tip:"Lasalgaon supply thin",tag:"PRICE"},
            {icon:"🔴",tone:T.ember,title:"Amul Butter critically low",body:"2 left (min: 8) — reorder today",tip:"Distributor: Murthy & Co.",tag:"STOCK"}].map((a,i)=>(
            <Card key={i} accent={a.tone} padding={12}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{width:32,height:32,borderRadius:9,background:`${a.tone}22`,
                  border:`1px solid ${a.tone}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{a.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:4}}>
                    <div style={{fontSize:12,fontWeight:700,color:T.ink,lineHeight:1.25}}>{a.title}</div>
                    <Pill tone={a.tone}>{a.tag}</Pill>
                  </div>
                  <div style={{fontSize:10,color:T.inkDim,marginBottom:6}}>{a.body}</div>
                  <div style={{fontSize:10,color:a.tone,padding:"4px 8px",background:`${a.tone}15`,borderRadius:6,display:"inline-block"}}>💡 {a.tip}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div style={{marginTop:18}}>
          <SectionLabel action="View all →" hindi="आगामी">UPCOMING FESTIVALS</SectionLabel>
          <Card padding={0}>
            {[{name:"Holi",days:7,boost:70,urgent:true},{name:"Ugadi / Tamil NY",days:34,boost:50},{name:"Ramzan begins",days:14,boost:80,urgent:true}].map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                padding:"10px 12px",borderBottom:i<2?`1px solid ${T.ruleSoft}`:"none"}}>
                <div style={{fontFamily:T.display,fontSize:18,color:f.urgent?T.ember:T.brassLite,
                  fontWeight:700,width:38,textAlign:"center",lineHeight:1}}>{f.days}d</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.ink}}>{f.name}</div>
                  <div style={{height:4,background:T.bg0,borderRadius:2,marginTop:5,overflow:"hidden"}}>
                    <div style={{width:`${f.boost}%`,height:"100%",background:f.urgent?T.ember:T.brass}}/>
                  </div>
                </div>
                <div style={{fontSize:11,fontWeight:700,color:f.urgent?T.ember:T.brassLite}}>+{f.boost}%</div>
              </div>
            ))}
          </Card>
        </div>
        <div style={{height:20}}/>
      </div>
    </Screen>
  )
}

function UdhaarScreen() {
  return (
    <Screen tabActive="more" topBar={<TopBar back titleEn="Udhaar Khata" titleHi="उधार-खाता" sub="7 accounts · 2 overdue" rightLabel="+ Add"/>}>
      <div style={{padding:"12px 14px"}}>
        <div style={{background:`linear-gradient(135deg,${T.bg2} 0%,${T.bg3} 100%)`,
          border:`1px solid ${T.ember}40`,borderRadius:18,padding:"18px",marginBottom:14,position:"relative",overflow:"hidden"}}>
          <div style={{fontSize:10,color:T.emberLite,letterSpacing:"1.5px",fontWeight:700,textTransform:"uppercase"}}>Total open udhaar</div>
          <div style={{fontFamily:T.display,fontSize:42,color:T.ink,fontWeight:700,lineHeight:1,marginTop:6,letterSpacing:"-1px"}}>₹6,440</div>
          <div style={{display:"flex",gap:12,marginTop:12,fontSize:11}}>
            <span style={{color:T.ember,fontWeight:700}}>● 2 overdue</span>
            <span style={{color:T.brassLite,fontWeight:700}}>● 3 due soon</span>
            <span style={{color:T.jadeLite,fontWeight:700}}>● 2 fresh</span>
          </div>
          <button style={{marginTop:14,width:"100%",
            background:`linear-gradient(135deg,${T.jade},${T.jadeLite})`,
            color:"#0a1c14",border:"none",borderRadius:10,padding:"10px",
            fontSize:11,fontWeight:700,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <div style={{width:14,height:14,color:"#0a1c14"}}><WhatsAppIcon/></div>
            Send WhatsApp reminders to 2 overdue
          </button>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
          {["All (7)","Overdue (2)","Due soon (3)","Fresh (2)","Paid"].map((f,i)=>(
            <button key={i} style={{padding:"6px 12px",borderRadius:999,
              background:i===0?T.saffron:T.bg2,color:i===0?"#1a0c04":T.inkDim,
              border:i===0?"none":`1px solid ${T.rule}`,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{f}</button>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[{name:"Ramesh Kumar",days:21,amt:3420,phone:"+91 98xxx 4221",overdue:true,items:"7 visits",last:"2 days ago"},
            {name:"Pawan Sharma",days:18,amt:1800,phone:"+91 98xxx 7782",overdue:true,items:"4 visits",last:"5 days ago"},
            {name:"Lakshmi aunty",days:8,amt:980,phone:"+91 90xxx 4421",items:"12 visits",last:"today",soon:true},
            {name:"Mohit Yadav",days:3,amt:240,phone:"+91 95xxx 2334",items:"1 visit",last:"today"}].map((c,i)=>{
            const tone=c.overdue?T.ember:c.soon?T.brassLite:T.jadeLite
            return (
              <Card key={i} padding={0} accent={tone}>
                <div style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{width:38,height:38,borderRadius:"50%",
                      background:`linear-gradient(135deg,${T.brass},${T.saffron})`,
                      color:"#1a0c04",display:"flex",alignItems:"center",justifyContent:"center",
                      fontWeight:800,fontSize:14,flexShrink:0}}>{c.name.charAt(0)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:T.ink,display:"flex",alignItems:"center",gap:8}}>
                        {c.name}{c.overdue&&<Pill tone={T.ember} solid>OVERDUE</Pill>}
                      </div>
                      <div style={{fontFamily:T.mono,fontSize:10,color:T.inkFaint,marginTop:2}}>{c.phone}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:T.display,fontSize:18,color:tone,fontWeight:700,lineHeight:1}}>{INR(c.amt)}</div>
                      <div style={{fontSize:9,color:T.inkFaint,marginTop:3,letterSpacing:"0.5px"}}>{c.days}d · {c.last}</div>
                    </div>
                  </div>
                  <div style={{paddingTop:8,borderTop:`1px solid ${T.ruleSoft}`,display:"flex",gap:6}}>
                    <button style={{flex:1,background:T.bg0,color:T.inkDim,border:`1px solid ${T.rule}`,
                      borderRadius:8,padding:"7px",fontSize:10,fontWeight:600,cursor:"pointer"}}>{c.items}</button>
                    <button style={{flex:1,background:"rgba(58,138,107,0.18)",color:T.jadeLite,
                      border:`1px solid ${T.jade}55`,borderRadius:8,padding:"7px",fontSize:10,fontWeight:700,cursor:"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                      <div style={{width:11,height:11,color:T.jadeLite}}><WhatsAppIcon/></div> Remind
                    </button>
                    <button style={{flex:1,background:`linear-gradient(135deg,${T.saffron},${T.saffronHot})`,
                      color:"#1a0c04",border:"none",borderRadius:8,padding:"7px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Mark paid</button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
        <div style={{height:20}}/>
      </div>
    </Screen>
  )
}

function InventoryScreen() {
  return (
    <Screen tabActive="more" topBar={<TopBar back titleEn="Inventory" titleHi="स्टॉक" sub="2,412 SKUs · 12 low" rightLabel="+ Add"/>}>
      <div style={{padding:"12px 14px"}}>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <div style={{flex:1,background:T.bg2,border:`1px solid ${T.rule}`,borderRadius:10,padding:"9px 12px",display:"flex",alignItems:"center",gap:8}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.inkFaint} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search products…" style={{background:"transparent",border:"none",color:T.ink,fontSize:12,outline:"none",flex:1}}/>
          </div>
          <button style={{width:42,height:42,borderRadius:10,
            background:`linear-gradient(135deg,${T.saffron},${T.saffronHot})`,
            color:"#1a0c04",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a0c04" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
          </button>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
          {["All (2412)","Dairy (78)","Atta & Rice (124)","Oil (66)","Tea/Coffee (89)","Snacks (412)"].map((c,i)=>(
            <button key={i} style={{padding:"6px 12px",borderRadius:999,whiteSpace:"nowrap",
              background:i===0?T.saffron:T.bg2,color:i===0?"#1a0c04":T.inkDim,
              border:i===0?"none":`1px solid ${T.rule}`,fontSize:10,fontWeight:600,cursor:"pointer"}}>{c}</button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          <StatTile label="VALUE" value="₹2.4L" sub="at cost" tone={T.brassLite}/>
          <StatTile label="LOW" value="12" sub="reorder" tone={T.brass}/>
          <StatTile label="OUT" value="3" sub="critical" tone={T.ember}/>
        </div>
        <SectionLabel hindi="उत्पाद">PRODUCTS</SectionLabel>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[{name:"Amul Butter 100g",stock:2,min:8,cost:48,mrp:62,sold:34,color:"#f6c768"},
            {name:"Aashirvaad Atta 5kg",stock:4,min:10,cost:235,mrp:275,sold:18,color:"#c08a3a"},
            {name:"Tata Salt 1kg",stock:6,min:15,cost:18,mrp:22,sold:42,color:"#f4e4c1"},
            {name:"Parle-G 250g",stock:48,min:30,cost:24,mrp:30,sold:67,color:"#e87722"},
            {name:"Amul Milk 1L",stock:32,min:40,cost:54,mrp:60,sold:89,color:"#5aa7d8"},
            {name:"Sunflower Oil 1L",stock:24,min:20,cost:142,mrp:160,sold:21,color:"#3a8a6b"}].map((p,i)=>{
            const low=p.stock<p.min; const out=p.stock<p.min*0.3
            return (
              <div key={i} style={{background:T.bg2,borderRadius:12,padding:"10px 12px",
                border:`1px solid ${T.rule}`,display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:38,height:38,borderRadius:9,background:`${p.color}25`,
                  border:`1px solid ${p.color}55`,display:"flex",alignItems:"center",justifyContent:"center",
                  flexShrink:0,fontFamily:T.display,fontSize:16,color:p.color,fontWeight:700}}>{p.name.charAt(0)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.ink}}>{p.name}</div>
                  <div style={{fontSize:10,color:T.inkFaint,marginTop:2,display:"flex",gap:8}}>
                    <span>MRP {INR(p.mrp)}</span><span>·</span>
                    <span style={{color:T.jadeLite}}>{p.sold} sold/wk</span>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:T.display,fontSize:16,color:out?T.ember:low?T.brassLite:T.ink,fontWeight:700,lineHeight:1}}>{p.stock}</div>
                  <div style={{fontSize:9,color:T.inkFaint,marginTop:3,letterSpacing:"0.5px"}}>min {p.min}</div>
                </div>
                {out&&<Pill tone={T.ember} solid>OUT</Pill>}
                {low&&!out&&<Pill tone={T.brass}>LOW</Pill>}
              </div>
            )
          })}
        </div>
        <div style={{height:20}}/>
      </div>
    </Screen>
  )
}

function DayOpsScreen() {
  return (
    <Screen tabActive="more" topBar={<TopBar back titleEn="Day Operations" titleHi="दिन का हिसाब" sub="OPEN since 06:42 · 13h 19m"/>}>
      <div style={{padding:"12px 14px"}}>
        <div style={{background:"linear-gradient(135deg,rgba(58,138,107,0.2),rgba(74,184,146,0.08))",
          border:`1px solid ${T.jade}55`,borderRadius:14,padding:"14px",marginBottom:14,
          display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:46,height:46,borderRadius:"50%",
            background:`linear-gradient(135deg,${T.jade},${T.jadeLite})`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,color:"#0a1c14"}}>☀</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:T.jadeLite}}>Day is OPEN</div>
            <div style={{fontFamily:T.mono,fontSize:10,color:T.inkDim,marginTop:2,letterSpacing:"0.5px"}}>Opened at 06:42 · 13h 19m ago</div>
          </div>
        </div>
        <SectionLabel hindi="आज का हिसाब">SUMMARY</SectionLabel>
        <Card padding={0} style={{marginBottom:14}}>
          {[{label:"Opening cash",amt:"₹1,200",tone:T.inkDim},{label:"Sales · cash",amt:"+₹8,420",tone:T.jadeLite},
            {label:"Sales · UPI",amt:"+₹3,280",tone:T.jadeLite},{label:"Sales · udhaar",amt:"+₹1,140",tone:T.brassLite},
            {label:"Expenses",amt:"−₹420",tone:T.ember},{label:"Drops to bank",amt:"−₹5,000",tone:T.inkDim},
            {label:"Expected in drawer",amt:"₹8,620",tone:T.ink,big:true}].map((r,i,a)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:r.big?"14px 14px":"10px 14px",
              borderTop:r.big?`1px solid ${T.brass}55`:"none",
              borderBottom:i<a.length-1&&!r.big?`1px solid ${T.ruleSoft}`:"none",
              background:r.big?"rgba(192,138,58,0.08)":"transparent"}}>
              <span style={{fontSize:r.big?13:12,color:r.big?T.brassLite:T.inkDim,fontWeight:r.big?700:500,
                textTransform:r.big?"uppercase":"none",letterSpacing:r.big?"0.5px":0}}>{r.label}</span>
              <span style={{fontFamily:T.display,fontSize:r.big?22:14,color:r.tone,fontWeight:700}}>{r.amt}</span>
            </div>
          ))}
        </Card>
        <SectionLabel hindi="जोड़ें">LOG SOMETHING</SectionLabel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          {[{label:"Expense",emoji:"💸",tone:T.ember},{label:"Cash drop",emoji:"🏦",tone:T.brass},
            {label:"Petty in",emoji:"💰",tone:T.jade},{label:"Note",emoji:"📝",tone:T.inkDim}].map((b,i)=>(
            <button key={i} style={{background:T.bg2,border:`1px solid ${T.rule}`,borderRadius:12,
              padding:"12px",display:"flex",alignItems:"center",gap:10,
              cursor:"pointer",color:T.ink,fontSize:12,fontWeight:600}}>
              <span style={{width:30,height:30,borderRadius:8,background:`${b.tone}22`,
                border:`1px solid ${b.tone}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{b.emoji}</span>
              {b.label}
            </button>
          ))}
        </div>
        <div style={{background:T.bg2,border:`1px dashed ${T.brass}55`,borderRadius:14,
          padding:"14px",textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:12,color:T.inkDim,marginBottom:10}}>End of day? Reconcile cash and close.</div>
          <button style={{width:"100%",background:`linear-gradient(135deg,${T.ember},#c0382d)`,
            color:"#fff",border:"none",borderRadius:10,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:"0.3px"}}>
            🌙 Close day · 9 min avg
          </button>
        </div>
      </div>
    </Screen>
  )
}

function CustomersScreen() {
  return (
    <Screen tabActive="more" topBar={<TopBar back titleEn="Customers" titleHi="ग्राहक" sub="142 active · 7 with udhaar" rightLabel="+ Add"/>}>
      <div style={{padding:"12px 14px"}}>
        <div style={{background:T.bg2,border:`1px solid ${T.rule}`,borderRadius:10,padding:"9px 12px",
          display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.inkFaint} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search by name or phone…" style={{background:"transparent",border:"none",color:T.ink,fontSize:12,outline:"none",flex:1}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          <StatTile label="ACTIVE" value="142" sub="this month" tone={T.brassLite}/>
          <StatTile label="REPEAT" value="68%" sub="loyalty" tone={T.jadeLite}/>
          <StatTile label="AVG VAL" value="₹245" sub="per visit" tone={T.saffron}/>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
          {["All","Top spenders","Udhaar (7)","Birthday this mo.","Inactive 30d"].map((f,i)=>(
            <button key={i} style={{padding:"6px 12px",borderRadius:999,whiteSpace:"nowrap",
              background:i===0?T.saffron:T.bg2,color:i===0?"#1a0c04":T.inkDim,
              border:i===0?"none":`1px solid ${T.rule}`,fontSize:11,fontWeight:600,cursor:"pointer"}}>{f}</button>
          ))}
        </div>
        <SectionLabel action="Sort: spend ▾">CUSTOMERS</SectionLabel>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[{name:"Sunita Devi",visits:42,spent:38400,last:"today",udhaar:0,tag:"TOP"},
            {name:"Ramesh Kumar",visits:31,spent:24800,last:"2d ago",udhaar:3420,tag:"UDHAAR"},
            {name:"Lakshmi aunty",visits:24,spent:18200,last:"today",udhaar:980},
            {name:"Mohit Yadav",visits:8,spent:4200,last:"today",udhaar:240,tag:"NEW"},
            {name:"Priya Reddy",visits:18,spent:12600,last:"5d ago",udhaar:0},
            {name:"Iqbal bhai",visits:36,spent:29200,last:"yesterday",udhaar:0}].map((c,i)=>{
            const tagTone=c.tag==="TOP"?T.jadeLite:c.tag==="UDHAAR"?T.ember:c.tag==="NEW"?T.brassLite:T.brass
            return (
              <div key={i} style={{background:T.bg2,borderRadius:12,padding:"10px 12px",
                border:`1px solid ${T.rule}`,display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:38,height:38,borderRadius:"50%",
                  background:`linear-gradient(135deg,${T.brass},${T.saffron})`,
                  color:"#1a0c04",display:"flex",alignItems:"center",justifyContent:"center",
                  fontWeight:800,fontSize:14,flexShrink:0}}>{c.name.charAt(0)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.ink,display:"flex",alignItems:"center",gap:6}}>
                    {c.name}{c.tag&&<Pill tone={tagTone}>{c.tag}</Pill>}
                  </div>
                  <div style={{fontSize:10,color:T.inkFaint,marginTop:2}}>{c.visits} visits · {c.last}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:T.display,fontSize:14,color:T.ink,fontWeight:700,lineHeight:1}}>{INR(c.spent)}</div>
                  {c.udhaar>0&&<div style={{fontSize:9,color:T.ember,marginTop:3,fontWeight:700}}>{INR(c.udhaar)} due</div>}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{height:20}}/>
      </div>
    </Screen>
  )
}

function BulkImportScreen() {
  return (
    <Screen tabActive="more" topBar={<TopBar back titleEn="Bulk Import" titleHi="एक साथ डालें" sub="CSV · Excel · Voice · 90 sec"/>}>
      <div style={{padding:"14px"}}>
        <div style={{background:"rgba(232,119,34,0.08)",border:`1px solid ${T.saffron}40`,
          borderRadius:14,padding:"14px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontFamily:T.display,fontSize:32,color:T.saffron,fontWeight:700,lineHeight:1}}>90s</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:T.ink}}>2,400 SKUs in 90 seconds</div>
            <div style={{fontSize:10,color:T.inkDim,marginTop:2,lineHeight:1.4}}>Last import: 412 items · 4 errors auto-fixed</div>
          </div>
        </div>
        <SectionLabel hindi="कैसे">CHOOSE METHOD</SectionLabel>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
          {[{icon:"📑",label:"Upload CSV/Excel",desc:"Drag your distributor sheet here",tone:T.saffron,primary:true},
            {icon:"🎤",label:"Speak the list",desc:"\"Atta paanch kilo, chini do kilo…\"",tone:T.brassLite},
            {icon:"📷",label:"Scan barcodes",desc:"Tap each item to scan + price",tone:T.jadeLite},
            {icon:"📋",label:"Copy from template",desc:"Pick from 300+ kirana catalog",tone:T.sky}].map((m,i)=>(
            <div key={i} style={{
              background:m.primary?"linear-gradient(135deg,rgba(232,119,34,0.12),rgba(232,119,34,0.04))":T.bg2,
              border:m.primary?`1px solid ${T.saffron}55`:`1px solid ${T.rule}`,
              borderRadius:12,padding:"14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
              <div style={{width:42,height:42,borderRadius:10,background:`${m.tone}22`,
                border:`1px solid ${m.tone}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{m.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:T.ink}}>{m.label}</div>
                <div style={{fontSize:11,color:T.inkDim,marginTop:2}}>{m.desc}</div>
              </div>
              <span style={{fontSize:18,color:T.inkFaint}}>›</span>
            </div>
          ))}
        </div>
        <SectionLabel hindi="पिछले" action="View all →">RECENT IMPORTS</SectionLabel>
        <Card padding={0}>
          {[{date:"18 Feb",file:"Murthy_distributor_feb.csv",items:412,ok:true,errors:4},
            {date:"04 Feb",file:"Inventory_jan_close.xlsx",items:2412,ok:true,errors:0},
            {date:"22 Jan",file:"Voice_dictation_22jan.txt",items:38,ok:true,errors:1}].map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,
              padding:"10px 14px",borderBottom:i<2?`1px solid ${T.ruleSoft}`:"none"}}>
              <div style={{width:32,height:32,borderRadius:8,
                background:r.ok?"rgba(58,138,107,0.18)":"rgba(179,38,30,0.18)",
                color:r.ok?T.jadeLite:T.ember,display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:14,flexShrink:0}}>{r.ok?"✓":"!"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:600,color:T.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.file}</div>
                <div style={{fontFamily:T.mono,fontSize:9,color:T.inkFaint,marginTop:2,letterSpacing:"0.5px"}}>
                  {r.date} · {r.items} items{r.errors>0?` · ${r.errors} errors fixed`:""}
                </div>
              </div>
            </div>
          ))}
        </Card>
        <div style={{height:20}}/>
      </div>
    </Screen>
  )
}

function SettingsScreen() {
  return (
    <Screen tabActive="more" topBar={<TopBar back titleEn="Settings" titleHi="सेटिंग्स" sub="v2.0.4 · synced 2 min ago"/>}>
      <div style={{padding:"12px 14px"}}>
        <div style={{background:`linear-gradient(135deg,${T.bg2},${T.bg3})`,
          border:`1px solid ${T.brass}40`,borderRadius:14,padding:"16px 14px",marginBottom:14,
          display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:52,height:52,borderRadius:"50%",
            background:`linear-gradient(135deg,${T.brass},${T.saffron})`,
            color:"#1a0c04",display:"flex",alignItems:"center",justifyContent:"center",
            fontFamily:T.display,fontWeight:700,fontSize:22,flexShrink:0}}>न</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700,color:T.ink}}>Naresh Yadav</div>
            <div style={{fontSize:11,color:T.brassLite,marginTop:2}}>Naresh General Store · Hyderabad</div>
            <div style={{fontFamily:T.mono,fontSize:10,color:T.inkFaint,marginTop:4,letterSpacing:"0.5px"}}>GSTIN · 36AABCS1234X1Z5</div>
          </div>
          <button style={{background:"transparent",border:`1px solid ${T.brass}`,color:T.brassLite,
            borderRadius:8,padding:"6px 10px",fontSize:10,fontWeight:600,cursor:"pointer"}}>Edit</button>
        </div>
        <div style={{background:"linear-gradient(135deg,rgba(232,119,34,0.1),rgba(232,119,34,0.02))",
          border:`1px solid ${T.saffron}55`,borderRadius:12,padding:"12px 14px",marginBottom:14,
          display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:T.saffron,color:"#1a0c04",
            display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14}}>★</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:T.ink}}>Wholesale plan · active</div>
            <div style={{fontSize:10,color:T.inkDim,marginTop:2}}>All features · cloud sync · multi-staff</div>
          </div>
          <button style={{background:T.saffron,color:"#1a0c04",border:"none",
            borderRadius:8,padding:"6px 12px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Manage</button>
        </div>
        {[{heading:"PREFERENCES",hindi:"पसंद",items:[
            {icon:"🗣",label:"Voice language",value:"Hindi · हिंदी",chev:true},
            {icon:"🔤",label:"App language",value:"English",chev:true},
            {icon:"🌒",label:"Theme",value:"Dark brass",chev:true},
            {icon:"💰",label:"Currency / GST",value:"₹ INR · 18%",chev:true}]},
          {heading:"DATA & SYNC",hindi:"डाटा",items:[
            {icon:"☁",label:"Cloud sync",value:"On · 2 min ago",tone:T.jadeLite},
            {icon:"📦",label:"Backup",value:"Auto · daily",chev:true},
            {icon:"📤",label:"Export data",value:"CSV · PDF",chev:true}]},
          {heading:"HELP & MORE",hindi:"मदद",items:[
            {icon:"❓",label:"Install guide",chev:true},
            {icon:"📲",label:"WhatsApp support",value:"+91 98xxx ____",chev:true},
            {icon:"🚪",label:"Sign out",tone:T.ember}]}].map((sec,si)=>(
          <div key={si} style={{marginBottom:14}}>
            <SectionLabel hindi={sec.hindi}>{sec.heading}</SectionLabel>
            <Card padding={0}>
              {sec.items.map((it,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,
                  padding:"12px 14px",borderBottom:i<sec.items.length-1?`1px solid ${T.ruleSoft}`:"none"}}>
                  <div style={{width:30,height:30,borderRadius:8,background:T.bg0,
                    border:`1px solid ${T.rule}`,display:"flex",alignItems:"center",
                    justifyContent:"center",fontSize:14,flexShrink:0}}>{it.icon}</div>
                  <div style={{flex:1,fontSize:12,color:it.tone===T.ember?T.ember:T.ink,fontWeight:600}}>{it.label}</div>
                  {it.value&&<div style={{fontSize:11,color:it.tone||T.inkDim}}>{it.value}</div>}
                  {it.chev&&<span style={{fontSize:16,color:T.inkFaint}}>›</span>}
                </div>
              ))}
            </Card>
          </div>
        ))}
        <div style={{textAlign:"center",padding:"18px 0 24px",fontFamily:T.mono,fontSize:10,color:T.inkFaint,letterSpacing:"1.5px"}}>
          DUKHAAN<span style={{color:T.saffron}}>•</span>AI · v2.0.4 · MADE WITH ☕ IN HYDERABAD
        </div>
      </div>
    </Screen>
  )
}

// ─────────────────────────────────────────────────────────────────
// SCREEN CATALOG
// ─────────────────────────────────────────────────────────────────
const SCREENS = [
  { id:"onboarding",  label:"Onboarding",    hi:"पहली बार",    component: OnboardingScreen },
  { id:"dashboard",   label:"Dashboard",     hi:"होम",          component: DashboardScreen },
  { id:"voice-idle",  label:"Voice (idle)",  hi:"🎤 बोलो",      component: VoiceIdleScreen },
  { id:"voice-live",  label:"Voice (live)",  hi:"🎤 सुन रहा",   component: VoiceListeningScreen },
  { id:"demand",      label:"Demand AI",     hi:"माँग",         component: DemandScreen },
  { id:"udhar",       label:"Udhaar Khata",  hi:"उधार-खाता",   component: UdhaarScreen },
  { id:"inventory",   label:"Inventory",     hi:"स्टॉक",        component: InventoryScreen },
  { id:"dayops",      label:"Day Ops",       hi:"दिन का हिसाब", component: DayOpsScreen },
  { id:"customers",   label:"Customers",     hi:"ग्राहक",       component: CustomersScreen },
  { id:"bulk-import", label:"Bulk Import",   hi:"एक साथ डालें", component: BulkImportScreen },
  { id:"settings",    label:"Settings",      hi:"सेटिंग्स",     component: SettingsScreen },
]

// ─────────────────────────────────────────────────────────────────
// MAIN SHOWCASE COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function AppScreens() {
  const [active, setActive] = useState("dashboard")
  const [fullscreen, setFullscreen] = useState(false)
  const current = SCREENS.find(s => s.id === active)
  const CurrentComponent = current.component

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, fontFamily:T.font, color:T.ink }}>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{ background:T.bg1, borderBottom:`1px solid ${T.rule}`,
        padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:9,
            background:`linear-gradient(135deg,${T.brass},${T.saffron})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:T.display, fontWeight:700, fontSize:16, color:"#1a0c04" }}>द</div>
          <div>
            <div style={{ fontFamily:T.display, fontSize:18, color:T.ink }}>
              दुकान<span style={{color:T.saffron}}>•</span>AI
            </div>
            <div style={{ fontSize:10, color:T.inkFaint, letterSpacing:"1px" }}>APP SCREEN DESIGNS · VARIANT A</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:11, color:T.inkFaint }}>{SCREENS.indexOf(current)+1} / {SCREENS.length}</div>
          <button onClick={()=>setFullscreen(f=>!f)}
            style={{ background:T.bg2, border:`1px solid ${T.rule}`, color:T.brassLite,
              borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>
            {fullscreen?"Exit fullscreen":"Fullscreen ⛶"}
          </button>
        </div>
      </div>

      <div style={{ display:"flex", height:"calc(100vh - 65px)" }}>

        {/* Sidebar nav */}
        {!fullscreen && (
          <div style={{ width:200, background:T.bg1, borderRight:`1px solid ${T.rule}`,
            overflowY:"auto", flexShrink:0 }}>
            <div style={{ padding:"12px 12px 8px", fontSize:9, color:T.inkFaint,
              letterSpacing:"2px", fontWeight:700, textTransform:"uppercase" }}>
              SCREENS
            </div>
            {SCREENS.map(s => (
              <button key={s.id} onClick={()=>setActive(s.id)}
                style={{ width:"100%", textAlign:"left", padding:"10px 14px",
                  background:active===s.id?`${T.saffron}18`:"transparent",
                  border:"none", borderLeft:active===s.id?`3px solid ${T.saffron}`:"3px solid transparent",
                  color:active===s.id?T.ink:T.inkDim, cursor:"pointer",
                  display:"flex", flexDirection:"column", gap:2 }}>
                <div style={{ fontSize:12, fontWeight:active===s.id?700:400 }}>{s.label}</div>
                <div style={{ fontFamily:T.display, fontSize:11, color:T.inkFaint }}>{s.hi}</div>
              </button>
            ))}
          </div>
        )}

        {/* Phone frame + screen */}
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          padding:"24px", background:T.bg0,
          backgroundImage:`radial-gradient(circle at 50% 50%, rgba(232,119,34,0.04), transparent 60%)` }}>

          {/* Phone shell */}
          <div style={{ position:"relative" }}>
            {/* Outer phone */}
            <div style={{ width:380, height:780, borderRadius:44, padding:10,
              background:`linear-gradient(160deg,#2a1a0a,#180d05)`,
              boxShadow:`0 0 0 1px ${T.brass}30, 0 40px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(246,199,104,0.2)` }}>
              {/* Screen area */}
              <div style={{ width:"100%", height:"100%", borderRadius:36, overflow:"hidden",
                background:T.bg0, boxShadow:"inset 0 0 20px rgba(0,0,0,0.3)" }}>
                <CurrentComponent/>
              </div>
            </div>
            {/* Side buttons */}
            <div style={{ position:"absolute", right:-4, top:120, width:4, height:60,
              background:`#2a1a0a`, borderRadius:"0 3px 3px 0" }}/>
            <div style={{ position:"absolute", left:-4, top:100, width:4, height:40,
              background:`#2a1a0a`, borderRadius:"3px 0 0 3px" }}/>
            <div style={{ position:"absolute", left:-4, top:150, width:4, height:40,
              background:`#2a1a0a`, borderRadius:"3px 0 0 3px" }}/>
          </div>

          {/* Screen info + prev/next */}
          {!fullscreen && (
            <div style={{ marginLeft:40, maxWidth:260 }}>
              <div style={{ fontFamily:T.display, fontSize:28, color:T.ink, lineHeight:1.1, marginBottom:8 }}>
                {current.label}
              </div>
              <div style={{ fontFamily:T.display, fontSize:20, color:T.brassLite, marginBottom:16 }}>
                {current.hi}
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:24 }}>
                <button
                  onClick={()=>{const i=SCREENS.indexOf(current);if(i>0)setActive(SCREENS[i-1].id)}}
                  disabled={SCREENS.indexOf(current)===0}
                  style={{ flex:1, background:T.bg2, border:`1px solid ${T.rule}`, color:T.ink,
                    borderRadius:10, padding:"10px", fontSize:13, fontWeight:600, cursor:"pointer",
                    opacity:SCREENS.indexOf(current)===0?0.3:1 }}>← Prev</button>
                <button
                  onClick={()=>{const i=SCREENS.indexOf(current);if(i<SCREENS.length-1)setActive(SCREENS[i+1].id)}}
                  disabled={SCREENS.indexOf(current)===SCREENS.length-1}
                  style={{ flex:1, background:`linear-gradient(135deg,${T.saffron},${T.saffronHot})`,
                    border:"none", color:"#1a0c04", borderRadius:10, padding:"10px",
                    fontSize:13, fontWeight:700, cursor:"pointer",
                    opacity:SCREENS.indexOf(current)===SCREENS.length-1?0.3:1 }}>Next →</button>
              </div>
              <div style={{ background:T.bg2, border:`1px solid ${T.rule}`, borderRadius:12, padding:16 }}>
                <div style={{ fontSize:10, color:T.brassLite, fontWeight:700, letterSpacing:"1.5px",
                  textTransform:"uppercase", marginBottom:10 }}>ALL SCREENS</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {SCREENS.map(s => (
                    <button key={s.id} onClick={()=>setActive(s.id)}
                      style={{ padding:"4px 10px", borderRadius:999, fontSize:10, fontWeight:600,
                        border:"none", cursor:"pointer",
                        background:active===s.id?T.saffron:T.bg1,
                        color:active===s.id?"#1a0c04":T.inkDim }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
