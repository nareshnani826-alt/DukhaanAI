import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { isTokenValid, clearAuth } from "../sync/db"
import { tr } from "../i18n/kiranaStrings"

// Language is picked during onboarding, before this page is ever shown
// (see FirstRunGuard in App.jsx), so it's already in localStorage here.
function currentLang() {
  try { return localStorage.getItem("dk_voice_lang") || "en-IN" } catch { return "en-IN" }
}

const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const isValidPhone = v => /^(\+91|0|91)?[6-9]\d{9}$/.test(v.replace(/\s/g, ""))

const MODULES = [
  { id:"kirana",       label:"Kirana / General Store",    sub:"Grocery, FMCG, daily essentials", emoji:"🏪", route:"/dashboard",        gradient:"linear-gradient(135deg,#e87722,#c25500)", border:"rgba(232,119,34,0.4)", bg:"rgba(232,119,34,0.08)" },
  { id:"bangle_fancy", label:"Bangle / Jewellery Store",  sub:"Bangles, earrings, accessories",  emoji:"💍", route:"/bangle-dashboard",  gradient:"linear-gradient(135deg,#7c5cbf,#5b3fa6)", border:"rgba(124,92,191,0.4)",  bg:"rgba(124,92,191,0.08)"  },
]

// ── Canvas promo video + scene overlay ───────────────────────

const SCENES = [
  {
    tag:"VOICE BILLING",
    title:"Bill in your language",
    sub:'Say "Teen GM Parle-G" and watch the magic',
    accent:"#e87722",
    duration: 5000,
    render: (t) => ({
      type:"voice",
      words:["Teen", "GM", "Parle-G"].filter((_, i) => t > i * 0.28),
      items:[
        { label:"Parle-G 200g", qty:"3 pc", amt:"₹42",  show: t > 0.55 },
        { label:"Tata Salt 1kg",qty:"2 pc", amt:"₹56",  show: t > 0.70 },
        { label:"Sunflower Oil",qty:"1 L",  amt:"₹140", show: t > 0.85 },
      ],
    }),
  },
  {
    tag:"PROFIT INTELLIGENCE",
    title:"Know your margin every day",
    sub:"Revenue, cost, profit — all clear by evening",
    accent:"#1D9E75",
    duration: 4500,
    render: (t) => ({
      type:"stats",
      bars:[
        { label:"Mon", h: Math.min(t * 3, 0.55), color:"#e87722" },
        { label:"Tue", h: Math.min(Math.max(t-0.15,0)*3, 0.72), color:"#e87722" },
        { label:"Wed", h: Math.min(Math.max(t-0.28,0)*3, 0.48), color:"#e87722" },
        { label:"Thu", h: Math.min(Math.max(t-0.40,0)*3, 0.88), color:"#1D9E75" },
        { label:"Fri", h: Math.min(Math.max(t-0.52,0)*3, 0.64), color:"#e87722" },
        { label:"Sat", h: Math.min(Math.max(t-0.65,0)*3, 0.95), color:"#1D9E75" },
      ],
      profit:{ val:`+₹${Math.round(t * 1240)}`, show: t > 0.7 },
    }),
  },
  {
    tag:"UDHAR KHATA",
    title:"Never miss a credit",
    sub:"WhatsApp reminders in one tap",
    accent:"#E24B4A",
    duration: 4500,
    render: (t) => ({
      type:"udhar",
      items:[
        { name:"Ravi Kumar",  amt:"₹1,200", paid: t > 0.65, show: t > 0.15 },
        { name:"Sita Devi",   amt:"₹580",   paid: false,    show: t > 0.38 },
        { name:"Mohan Lal",   amt:"₹340",   paid: false,    show: t > 0.58 },
      ],
    }),
  },
  {
    tag:"STOCK INTELLIGENCE",
    title:"Reorder before you run out",
    sub:"Auto-alerts, dead stock, velocity tracking",
    accent:"#7c5cbf",
    duration: 4500,
    render: (t) => ({
      type:"stock",
      items:[
        { name:"Toor Dal 1kg",   pct: Math.min(t * 2.2, 0.18), color:"#E24B4A", show: t > 0.10 },
        { name:"Basmati Rice",   pct: Math.min(t * 2.2, 0.72), color:"#1D9E75", show: t > 0.28 },
        { name:"Vanaspati 500g", pct: Math.min(t * 2.2, 0.05), color:"#E24B4A", show: t > 0.46 },
        { name:"Parle-G 200g",   pct: Math.min(t * 2.2, 0.88), color:"#1D9E75", show: t > 0.64 },
      ],
    }),
  },

  // Scene 5: GST Invoice generation
  {
    tag:"GST INVOICING",
    title:"Professional invoices in seconds",
    sub:"Auto GST calculation, PDF ready, WhatsApp in one tap",
    accent:"#2563eb",
    duration: 5000,
    render: (t) => ({
      type:"invoice",
      invoiceNo: "INV-2024-" + String(Math.floor(t * 847 + 1001)).slice(-4),
      lines:[
        { name:"Parle-G 200g",  qty:3, rate:14,  gst:5,  show: t > 0.18 },
        { name:"Tata Salt 1kg", qty:2, rate:28,  gst:5,  show: t > 0.36 },
        { name:"Sunflower Oil", qty:1, rate:140, gst:5,  show: t > 0.54 },
      ],
      stamped: t > 0.82,
    }),
  },

  // Scene 6: Multi-language voice commands
  {
    tag:"10+ LANGUAGES",
    title:"Speak in your mother tongue",
    sub:"Telugu, Hindi, Tamil, Kannada, Bengali & more",
    accent:"#e87722",
    duration: 5500,
    render: (t) => ({
      type:"multilang",
      phrases:[
        { lang:"తెలుగు",    text:"మూడు పార్లే-జీ బిల్లులో వేయి",  color:"#e87722", show: t > 0.05, done: t > 0.32 },
        { lang:"हिन्दी",    text:"पाँच अरहर दाल बिल में डालो",    color:"#1D9E75", show: t > 0.38, done: t > 0.62 },
        { lang:"தமிழ்",    text:"ரெண்டு கடலை எண்ணெய் பில்லில்",  color:"#7c5cbf", show: t > 0.66, done: t > 0.88 },
      ],
    }),
  },

  // Scene 7: Day open → close summary
  {
    tag:"DAY OPERATIONS",
    title:"Open your day, close with clarity",
    sub:"Track stock movement and profit from open to close",
    accent:"#1D9E75",
    duration: 5000,
    render: (t) => ({
      type:"day",
      phase: t < 0.35 ? "opening" : t < 0.65 ? "billing" : "closing",
      bills:  Math.floor(t * 24),
      revenue: Math.floor(t * 11400),
      profit:  Math.floor(t * 2280),
      topItem: t > 0.5 ? "Parle-G 200g" : "",
    }),
  },

  // Scene 8: WhatsApp share
  {
    tag:"WHATSAPP BILLING",
    title:"Send bills on WhatsApp instantly",
    sub:"Customers get their receipt before they leave the counter",
    accent:"#25D366",
    duration: 4500,
    render: (t) => ({
      type:"whatsapp",
      typed: Math.floor(t * 11),   // chars of phone number typed
      sent:  t > 0.65,
      read:  t > 0.82,
      items:["Parle-G 200g x3 — ₹42","Tata Salt x2 — ₹56"],
      total:"₹238",
    }),
  },

  // Scene 9: Festival stock intelligence
  {
    tag:"FESTIVAL INTELLIGENCE",
    title:"Never miss a festival sale",
    sub:"Stock up before Diwali, Pongal, Eid — AI predicts demand",
    accent:"#f59e0b",
    duration: 5000,
    render: (t) => ({
      type:"festival",
      upcoming:[
        { name:"Diwali",  days:12, boost:"↑ 340%", color:"#f59e0b", show: t > 0.10 },
        { name:"Pongal",  days:28, boost:"↑ 180%", color:"#e87722", show: t > 0.38 },
        { name:"Eid",     days:45, boost:"↑ 220%", color:"#1D9E75", show: t > 0.62 },
      ],
      alert: t > 0.78,
    }),
  },

  // Scene 10: Barcode scan
  {
    tag:"BARCODE SCANNER",
    title:"Scan any product instantly",
    sub:"Camera scan adds product to bill in under a second",
    accent:"#06b6d4",
    duration: 4500,
    render: (t) => ({
      type:"barcode",
      scanning: t < 0.42,
      found:    t > 0.42,
      product:  t > 0.42 ? { name:"Amul Butter 500g", price:"₹290", stock:24 } : null,
      added:    t > 0.72,
    }),
  },
]

// Canvas background — particles + glowing orbs
function useCanvasBg(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let raf

    // Particles
    const PARTICLES = Array.from({ length: 55 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 1 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.0003,
      vy: -0.0001 - Math.random() * 0.0003,
      a: 0.15 + Math.random() * 0.35,
    }))

    // Orbs
    const ORBS = [
      { x:0.78, y:0.15, r:0.22, c:"rgba(232,119,34,0.30)", sp:0.0004, phase:0 },
      { x:0.15, y:0.75, r:0.18, c:"rgba(29,158,117,0.20)", sp:0.0003, phase:2 },
      { x:0.55, y:0.55, r:0.14, c:"rgba(124,92,191,0.18)", sp:0.0005, phase:4 },
    ]

    let t = 0
    function draw() {
      const W = canvas.width, H = canvas.height
      if (!W || !H) { raf = requestAnimationFrame(draw); return }  // skip when hidden/0-size
      ctx.clearRect(0, 0, W, H)

      // Background
      const grd = ctx.createLinearGradient(0, 0, W, H)
      grd.addColorStop(0,   "#120500")
      grd.addColorStop(0.5, "#1c0900")
      grd.addColorStop(1,   "#0e0400")
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, W, H)

      // Orbs
      ORBS.forEach(o => {
        const ox = (o.x + Math.sin(t * o.sp + o.phase) * 0.06) * W
        const oy = (o.y + Math.cos(t * o.sp + o.phase) * 0.04) * H
        const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, o.r * W)
        grad.addColorStop(0, o.c)
        grad.addColorStop(1, "transparent")
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, W, H)
      })

      // Grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.045)"
      ctx.lineWidth = 1
      for (let gx = 0; gx < W; gx += 60) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke() }
      for (let gy = 0; gy < H; gy += 60) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke() }

      // Particles
      PARTICLES.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.y < -0.02) p.y = 1.02
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0
        ctx.beginPath()
        ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(232,119,34,${p.a})`
        ctx.fill()
      })

      // Scan line sweep
      const scanY = ((t * 0.3) % H)
      const scanGrad = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 4)
      scanGrad.addColorStop(0, "transparent")
      scanGrad.addColorStop(1, "rgba(232,119,34,0.04)")
      ctx.fillStyle = scanGrad
      ctx.fillRect(0, scanY - 60, W, 64)

      t++
      raf = requestAnimationFrame(draw)
    }

    function resize() {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    draw()
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])
}

// Scene content renderer
function SceneContent({ scene, progress }) {
  const data = scene.render(progress)

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center",
      gap:20, minHeight:0 }}>

      {/* Voice billing scene */}
      {data.type === "voice" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Mic + waveform */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
            <div style={{ width:44, height:44, borderRadius:"50%",
              background:"rgba(232,119,34,0.15)", border:"1.5px solid rgba(232,119,34,0.4)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:20,
              boxShadow:"0 0 20px rgba(232,119,34,0.25)" }}>🎤</div>
            <div style={{ display:"flex", gap:3, alignItems:"flex-end", height:28 }}>
              {[14,22,10,28,18,24,12,20,16,26].map((h, i) => (
                <div key={i} style={{ width:3, borderRadius:2,
                  height: data.words.length > 0 ? h : 4,
                  background:"#e87722", opacity: data.words.length > 0 ? 0.7 + (i%3)*0.1 : 0.2,
                  transition:"height 0.3s ease",
                  animation: data.words.length > 0 ? `wave ${0.4 + i*0.07}s ease-in-out infinite alternate` : "none" }}/>
              ))}
            </div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", fontStyle:"italic" }}>
              {data.words.join(" ")}{data.words.length > 0 && data.words.length < 3 ? "▌" : ""}
            </div>
          </div>

          {/* Bill card */}
          <div style={{ background:"rgba(255,255,255,0.06)", backdropFilter:"blur(12px)",
            border:"1px solid rgba(255,255,255,0.10)", borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)",
              display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:"#1D9E75",
                boxShadow:"0 0 8px #1D9E75" }}/>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.45)", fontWeight:600, letterSpacing:"1.2px" }}>VOICE BILLING — LIVE</span>
            </div>
            {data.items.map((item, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"10px 14px",
                borderBottom: i < data.items.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                opacity: item.show ? 1 : 0,
                transform: item.show ? "translateX(0)" : "translateX(-12px)",
                transition:"opacity 0.4s ease, transform 0.4s ease" }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{item.label}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:2 }}>{item.qty}</div>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:"#e87722" }}>{item.amt}</div>
              </div>
            ))}
            {data.items.some(i => i.show) && (
              <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 14px",
                background:"rgba(29,158,117,0.12)", borderTop:"1px solid rgba(29,158,117,0.2)" }}>
                <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.7)" }}>Total</span>
                <span style={{ fontSize:14, fontWeight:800, color:"#1D9E75" }}>
                  ₹{data.items.filter(i=>i.show).reduce((s,i)=>s+parseInt(i.amt.replace(/[₹,]/g,"")),0)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats / bar chart scene */}
      {data.type === "stats" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120,
            background:"rgba(255,255,255,0.04)", borderRadius:14, padding:"12px 16px",
            border:"1px solid rgba(255,255,255,0.08)" }}>
            {data.bars.map((b, i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"flex-end", height:"100%", gap:5 }}>
                <div style={{ width:"100%", borderRadius:"4px 4px 0 0",
                  height:`${b.h * 100}%`, background:b.color,
                  opacity:0.85, transition:"height 0.6s ease",
                  boxShadow:`0 0 8px ${b.color}60` }}/>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", fontWeight:600 }}>{b.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {[["₹18,240","Weekly Revenue","#e87722"],["20.1%","Avg Margin","#1D9E75"]].map(([v,l,c],i) => (
              <div key={i} style={{ flex:1, background:"rgba(255,255,255,0.05)",
                border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"12px 14px" }}>
                <div style={{ fontSize:18, fontWeight:800, color:c }}>{v}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>
          {data.profit.show && (
            <div style={{ background:"rgba(29,158,117,0.12)", border:"1px solid rgba(29,158,117,0.25)",
              borderRadius:12, padding:"11px 14px", display:"flex", alignItems:"center", gap:10,
              animation:"fadeIn 0.4s ease" }}>
              <span style={{ fontSize:16 }}>📈</span>
              <span style={{ fontSize:14, fontWeight:700, color:"#1D9E75" }}>
                {data.profit.val} profit today
              </span>
            </div>
          )}
        </div>
      )}

      {/* Udhar scene */}
      {data.type === "udhar" && (
        <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:14, overflow:"hidden" }}>
          <div style={{ padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", fontWeight:600, letterSpacing:"1.2px" }}>PENDING UDHAAR</div>
          </div>
          {data.items.map((d, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"12px 14px",
              borderBottom: i < data.items.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              opacity: d.show ? 1 : 0, transition:"opacity 0.5s ease",
              background: d.paid ? "rgba(29,158,117,0.08)" : "transparent" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:30, height:30, borderRadius:"50%",
                  background: d.paid ? "rgba(29,158,117,0.25)" : "rgba(226,75,74,0.2)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:13, fontWeight:700, color: d.paid ? "#1D9E75" : "#E24B4A" }}>
                  {d.paid ? "✓" : d.name.charAt(0)}
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)",
                  textDecoration: d.paid ? "line-through" : "none" }}>{d.name}</div>
              </div>
              <div style={{ fontSize:13, fontWeight:700,
                color: d.paid ? "#1D9E75" : "#E24B4A" }}>{d.paid ? "Paid ✓" : d.amt}</div>
            </div>
          ))}
        </div>
      )}

      {/* Stock scene */}
      {data.type === "stock" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {data.items.map((s, i) => (
            <div key={i} style={{ opacity: s.show ? 1 : 0,
              transform: s.show ? "translateX(0)" : "translateX(-16px)",
              transition:"opacity 0.4s ease, transform 0.4s ease" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:5 }}>
                <span style={{ fontSize:12, color:"rgba(255,255,255,0.75)" }}>{s.name}</span>
                <span style={{ fontSize:11, fontWeight:700, color:s.color }}>
                  {Math.round(s.pct * 100)}%
                </span>
              </div>
              <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${s.pct * 100}%`, borderRadius:3,
                  background:s.color, transition:"width 0.6s ease",
                  boxShadow:`0 0 6px ${s.color}80` }}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GST Invoice scene */}
      {data.type === "invoice" && (
        <div style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.10)",
          borderRadius:14, overflow:"hidden", position:"relative" }}>
          <div style={{ padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,0.08)",
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.45)", letterSpacing:"1px" }}>TAX INVOICE</span>
            <span style={{ fontSize:10, fontWeight:600, color:"#2563eb" }}>{data.invoiceNo}</span>
          </div>
          {data.lines.map((l, i) => {
            const subtotal = l.qty * l.rate
            const gstAmt   = +(subtotal * l.gst / 100).toFixed(2)
            return (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"9px 14px", borderBottom:"1px solid rgba(255,255,255,0.05)",
                opacity: l.show ? 1 : 0, transform: l.show ? "translateY(0)" : "translateY(8px)",
                transition:"opacity 0.4s ease, transform 0.4s ease" }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{l.name}</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginTop:2 }}>
                    {l.qty} × ₹{l.rate} + {l.gst}% GST
                  </div>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:"#2563eb" }}>₹{subtotal + gstAmt}</div>
              </div>
            )
          })}
          {data.lines.some(l => l.show) && (
            <div style={{ padding:"10px 14px", background:"rgba(37,99,235,0.12)",
              borderTop:"1px solid rgba(37,99,235,0.2)",
              display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.6)" }}>Grand Total</span>
              <span style={{ fontSize:14, fontWeight:800, color:"#60a5fa" }}>
                ₹{data.lines.filter(l=>l.show).reduce((s,l)=>s + l.qty*l.rate + (l.qty*l.rate*l.gst/100),0).toFixed(0)}
              </span>
            </div>
          )}
          {/* PAID stamp */}
          {data.stamped && (
            <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              animation:"fadeIn 0.4s ease", pointerEvents:"none" }}>
              <div style={{ border:"3px solid #1D9E75", borderRadius:8, padding:"6px 18px",
                fontSize:22, fontWeight:900, color:"#1D9E75", opacity:0.85,
                transform:"rotate(-15deg)", letterSpacing:"4px" }}>PAID</div>
            </div>
          )}
        </div>
      )}

      {/* Multi-language scene */}
      {data.type === "multilang" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {data.phrases.map((p, i) => (
            <div key={i} style={{ opacity: p.show ? 1 : 0,
              transform: p.show ? "translateX(0)" : "translateX(-20px)",
              transition:"opacity 0.5s ease, transform 0.5s ease" }}>
              <div style={{ background: p.done ? `${p.color}18` : "rgba(255,255,255,0.05)",
                border:`1px solid ${p.done ? p.color+"40" : "rgba(255,255,255,0.08)"}`,
                borderRadius:12, padding:"10px 14px",
                transition:"background 0.4s, border 0.4s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                  <span style={{ fontSize:9, fontWeight:700, color:p.color,
                    background:`${p.color}20`, padding:"2px 8px", borderRadius:10,
                    letterSpacing:"0.5px" }}>{p.lang}</span>
                  {p.done && <span style={{ fontSize:10, color:"#1D9E75" }}>✓ Understood</span>}
                </div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.8)", lineHeight:1.4 }}>{p.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Day operations scene */}
      {data.type === "day" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", gap:10 }}>
            {[
              { label:"Bills Today",   val: data.bills,              color:"#e87722", icon:"🧾" },
              { label:"Revenue",       val:`₹${data.revenue.toLocaleString("en-IN")}`, color:"#2563eb", icon:"💰" },
              { label:"Profit",        val:`₹${data.profit.toLocaleString("en-IN")}`,  color:"#1D9E75", icon:"📈" },
            ].map((s, i) => (
              <div key={i} style={{ flex:1, background:"rgba(255,255,255,0.05)",
                border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"10px 10px",
                textAlign:"center" }}>
                <div style={{ fontSize:16, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:13, fontWeight:800, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginTop:3, fontWeight:600,
                  letterSpacing:"0.5px" }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
          <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontWeight:600,
              letterSpacing:"1px", marginBottom:8 }}>DAY STATUS</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:"50%",
                background: data.phase === "closing" ? "#1D9E75" : "#e87722",
                boxShadow:`0 0 8px ${data.phase === "closing" ? "#1D9E75" : "#e87722"}` }}/>
              <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.75)" }}>
                {data.phase === "opening" ? "Day Opened · Stock counted" :
                 data.phase === "billing" ? `${data.bills} bills billed so far...` :
                                            "Day Closed · Profit calculated ✓"}
              </span>
            </div>
            {data.topItem && (
              <div style={{ marginTop:8, fontSize:11, color:"rgba(255,255,255,0.4)" }}>
                🏆 Top seller: <span style={{ color:"#e87722", fontWeight:600 }}>{data.topItem}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp scene */}
      {data.type === "whatsapp" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)",
            borderRadius:14, padding:"14px 16px" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontWeight:600,
              letterSpacing:"1px", marginBottom:8 }}>BILL PREVIEW</div>
            {data.items.map((item, i) => (
              <div key={i} style={{ fontSize:12, color:"rgba(255,255,255,0.7)",
                padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                {item}
              </div>
            ))}
            <div style={{ marginTop:8, fontSize:14, fontWeight:800, color:"#1D9E75" }}>
              Total: {data.total}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ flex:1, background:"rgba(37,211,102,0.10)",
              border:"1px solid rgba(37,211,102,0.3)", borderRadius:12, padding:"11px 14px",
              display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>📱</span>
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.6)" }}>
                {"9876543210".slice(0, data.typed)}
                {data.typed < 10 && <span style={{ opacity:0.4 }}>{"9876543210".slice(data.typed)}</span>}
              </span>
            </div>
            <div style={{ width:42, height:42, borderRadius:12, flexShrink:0,
              background: data.sent ? "#25D366" : "rgba(37,211,102,0.2)",
              border: "1px solid rgba(37,211,102,0.4)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
              transition:"background 0.4s ease" }}>
              {data.sent ? "✓" : "→"}
            </div>
          </div>
          {data.sent && (
            <div style={{ background:"rgba(37,211,102,0.10)", border:"1px solid rgba(37,211,102,0.25)",
              borderRadius:10, padding:"10px 14px", fontSize:12,
              color:"#25D366", animation:"fadeIn 0.4s ease",
              display:"flex", alignItems:"center", gap:8 }}>
              <span>✓✓</span>
              <span>{data.read ? "Bill read by customer" : "Bill sent on WhatsApp"}</span>
            </div>
          )}
        </div>
      )}

      {/* Festival scene */}
      {data.type === "festival" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {data.upcoming.map((f, i) => (
            <div key={i} style={{ opacity: f.show ? 1 : 0,
              transform: f.show ? "translateY(0)" : "translateY(12px)",
              transition:"opacity 0.5s ease, transform 0.5s ease" }}>
              <div style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${f.color}30`,
                borderRadius:12, padding:"10px 14px",
                display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                  background:`${f.color}20`, border:`1px solid ${f.color}40`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🎉</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.85)" }}>{f.name}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:2 }}>
                    in {f.days} days
                  </div>
                </div>
                <div style={{ fontSize:12, fontWeight:800, color:f.color,
                  background:`${f.color}18`, padding:"3px 10px", borderRadius:20 }}>{f.boost}</div>
              </div>
            </div>
          ))}
          {data.alert && (
            <div style={{ background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.3)",
              borderRadius:11, padding:"10px 14px", fontSize:12, color:"#f59e0b",
              animation:"fadeIn 0.4s ease", display:"flex", gap:8, alignItems:"center" }}>
              <span>⚡</span>
              <span>Stock up sweets & crackers — Diwali in 12 days!</span>
            </div>
          )}
        </div>
      )}

      {/* Barcode scene */}
      {data.type === "barcode" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:"rgba(6,182,212,0.06)", border:"1px solid rgba(6,182,212,0.2)",
            borderRadius:14, padding:"16px", display:"flex", flexDirection:"column",
            alignItems:"center", gap:10, minHeight:110 }}>
            {data.scanning && (
              <>
                <div style={{ display:"flex", gap:3 }}>
                  {[...Array(12)].map((_, i) => (
                    <div key={i} style={{ width: 2 + (i%3), height:40 + (i%4)*8, borderRadius:1,
                      background:`rgba(6,182,212,${0.4 + (i%3)*0.2})` }}/>
                  ))}
                </div>
                <div style={{ fontSize:10, color:"rgba(6,182,212,0.7)", fontWeight:600,
                  letterSpacing:"1.5px", animation:"scanPulse 0.8s ease-in-out infinite" }}>
                  SCANNING...
                </div>
              </>
            )}
            {data.found && data.product && (
              <div style={{ width:"100%", animation:"fadeIn 0.4s ease" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <div style={{ width:36, height:36, borderRadius:10,
                    background:"rgba(6,182,212,0.15)", border:"1px solid rgba(6,182,212,0.3)",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📦</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.9)" }}>{data.product.name}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>
                      Stock: {data.product.stock} units
                    </div>
                  </div>
                  <div style={{ marginLeft:"auto", fontSize:16, fontWeight:800, color:"#06b6d4" }}>
                    {data.product.price}
                  </div>
                </div>
                <div style={{ height:2, background:"rgba(6,182,212,0.15)", borderRadius:1 }}>
                  <div style={{ height:"100%", width: data.added ? "100%" : "0%",
                    background:"#06b6d4", borderRadius:1, transition:"width 0.6s ease" }}/>
                </div>
                {data.added && (
                  <div style={{ marginTop:8, fontSize:11, color:"#06b6d4", fontWeight:600,
                    animation:"fadeIn 0.3s ease" }}>✓ Added to bill</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PromoVideo() {
  const canvasRef    = useRef(null)
  const [sceneIdx,  setSceneIdx]  = useState(0)
  const [progress,  setProgress]  = useState(0)
  const [visible,   setVisible]   = useState(true)
  const transitingRef = useRef(false)  // guard: prevents double-advance
  const sceneIdxRef   = useRef(0)

  useCanvasBg(canvasRef)

  // Progress ticker — uses setInterval per-scene, clean guard
  useEffect(() => {
    let elapsed   = 0
    const FPS     = 60
    const TICK_MS = 1000 / FPS

    const iv = setInterval(() => {
      if (transitingRef.current) return   // mid-transition, pause ticking
      elapsed += TICK_MS
      const dur = SCENES[sceneIdxRef.current].duration
      const t   = Math.min(elapsed / dur, 1)
      setProgress(t)

      if (t >= 1 && !transitingRef.current) {
        transitingRef.current = true
        elapsed = 0
        // Fade out
        setVisible(false)
        setTimeout(() => {
          // Advance scene
          const next = (sceneIdxRef.current + 1) % SCENES.length
          sceneIdxRef.current = next
          setSceneIdx(next)
          setProgress(0)
          // Fade in
          setVisible(true)
          transitingRef.current = false
        }, 450)
      }
    }, TICK_MS)

    return () => clearInterval(iv)
  }, [])

  function goTo(i) {
    if (transitingRef.current) return
    transitingRef.current = true
    setVisible(false)
    setTimeout(() => {
      sceneIdxRef.current = i
      setSceneIdx(i)
      setProgress(0)
      setVisible(true)
      transitingRef.current = false
    }, 300)
  }

  function prev() { goTo((sceneIdxRef.current - 1 + SCENES.length) % SCENES.length) }
  function next() { goTo((sceneIdxRef.current + 1) % SCENES.length) }

  const scene = SCENES[sceneIdx]

  return (
    <div style={{ position:"relative", flex:1, overflow:"hidden", minHeight:"100dvh" }}>
      <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}/>

      <div style={{ position:"relative", zIndex:1, height:"100%", display:"flex",
        flexDirection:"column", padding:"40px 38px" }}>

        {/* Brand + scene counter */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
              background:"linear-gradient(135deg,#e87722,#c25500)",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 4px 14px rgba(232,119,34,0.45)" }}>
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                <path d="M8 23 L24 11 L40 23 Z" fill="white"/>
                <rect x="9" y="23" width="30" height="17" rx="1" fill="white"/>
                <path d="M18.5 40 L18.5 33 C18.5 29.96 21 28 24 28 C27 28 29.5 29.96 29.5 33 L29.5 40 Z" fill="#e87722"/>
                <circle cx="38.5" cy="9.5" r="6" fill="#1D9E75"/>
                <line x1="38.5" y1="6.5" x2="38.5" y2="12.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="35.5" y1="9.5" x2="41.5" y2="9.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:18,
              fontWeight:800, color:"#fff" }}>
              दुकान<span style={{ color:"#e87722" }}>•AI</span>
            </div>
          </div>
          {/* Scene counter */}
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontWeight:600,
            background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.10)",
            borderRadius:20, padding:"4px 12px" }}>
            {sceneIdx + 1} / {SCENES.length}
          </div>
        </div>

        {/* Scene tag */}
        <div style={{ marginTop:32, marginBottom:10 }}>
          <span style={{ fontSize:10, fontWeight:800, letterSpacing:"2px",
            color:scene.accent, background:`${scene.accent}18`,
            border:`1px solid ${scene.accent}40`, borderRadius:20, padding:"4px 12px" }}>
            {scene.tag}
          </span>
        </div>

        {/* Title + content — fade with visibility toggle */}
        <div style={{ opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(10px)",
          transition:"opacity 0.4s ease, transform 0.4s ease", flex:1,
          display:"flex", flexDirection:"column" }}>
          <div style={{ fontSize:22, fontWeight:800, color:"#fff", lineHeight:1.2,
            marginBottom:8, letterSpacing:"-0.3px" }}>{scene.title}</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", lineHeight:1.6,
            marginBottom:18, maxWidth:300 }}>{scene.sub}</div>
          <SceneContent scene={scene} progress={progress} />
        </div>

        {/* Bottom controls */}
        <div style={{ paddingTop:20 }}>
          {/* Progress bar */}
          <div style={{ height:2, background:"rgba(255,255,255,0.08)", borderRadius:1,
            overflow:"hidden", marginBottom:14 }}>
            <div style={{ height:"100%", width:`${progress * 100}%`,
              background:scene.accent, borderRadius:1,
              boxShadow:`0 0 8px ${scene.accent}`,
              transition:"width 0.08s linear" }}/>
          </div>

          {/* Dots + nav buttons */}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {/* Prev */}
            <button onClick={prev}
              style={{ width:28, height:28, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.15)",
                background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.6)",
                cursor:"pointer", fontSize:13, display:"flex", alignItems:"center",
                justifyContent:"center", flexShrink:0 }}>‹</button>

            {/* Dots */}
            <div style={{ display:"flex", gap:5, flex:1 }}>
              {SCENES.map((_, i) => (
                <div key={i} onClick={() => goTo(i)}
                  style={{ height:4, flex: i === sceneIdx ? 3 : 1, borderRadius:2,
                    cursor:"pointer", transition:"flex 0.3s ease, background 0.3s ease",
                    background: i === sceneIdx ? scene.accent : "rgba(255,255,255,0.15)" }}/>
              ))}
            </div>

            {/* Next */}
            <button onClick={next}
              style={{ width:28, height:28, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.15)",
                background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.6)",
                cursor:"pointer", fontSize:13, display:"flex", alignItems:"center",
                justifyContent:"center", flexShrink:0 }}>›</button>
          </div>

          {/* Trust */}
          <div style={{ display:"flex", gap:16, marginTop:14, flexWrap:"wrap" }}>
            {["🇮🇳 Made for Bharat","🔒 Privacy first","⚡ Free to start"].map((b, i) => (
              <span key={i} style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontWeight:500 }}>{b}</span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.6); }
          to   { transform: scaleY(1.0); }
        }
        @keyframes fadeIn {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes scanPulse {
          0%,100% { opacity:0.5; }
          50%     { opacity:1; }
        }
      `}</style>
    </div>
  )
}

// ── Replaced feature data (kept for reference in SCENES above) ──
const FEATURES = [
  {
    icon:"🎤",
    title:"Voice Billing in 10+ Languages",
    sub:"Say \"Teen GM Parle-G\" and it bills instantly — Telugu, Hindi, Tamil & more",
    accent:"#e87722",
    mockup: [
      { label:"Parle-G 200g", qty:"3 pc", amt:"₹42" },
      { label:"Tata Salt 1kg", qty:"2 pc", amt:"₹56" },
      { label:"Sunflower Oil", qty:"1 L",  amt:"₹140" },
    ],
  },
  {
    icon:"📊",
    title:"Daily Profit Clarity",
    sub:"Know your exact margin every evening — cost vs revenue, no guesswork",
    accent:"#1D9E75",
    stats:[
      { label:"Today's Revenue", val:"₹4,280", color:"#1D9E75" },
      { label:"Profit",          val:"+₹860",  color:"#1D9E75" },
      { label:"Margin",          val:"20.1%",   color:"#e87722" },
    ],
  },
  {
    icon:"📒",
    title:"Udhar Khata — Never Miss a Credit",
    sub:"Track who owes what, send WhatsApp reminders in one tap",
    accent:"#E24B4A",
    debtors:[
      { name:"Ravi Kumar",  amt:"₹1,200", days:"3d" },
      { name:"Sita Devi",   amt:"₹580",   days:"7d" },
      { name:"Mohan Lal",   amt:"₹340",   days:"1d" },
    ],
  },
  {
    icon:"📦",
    title:"Smart Stock Intelligence",
    sub:"Auto reorder alerts, dead stock detection, low-stock warnings",
    accent:"#7c5cbf",
    stock:[
      { name:"Toor Dal",    status:"Low",  color:"#e87722" },
      { name:"Basmati Rice",status:"Good", color:"#1D9E75" },
      { name:"Vanaspati",   status:"Out",  color:"#E24B4A" },
    ],
  },
]

function AnimatedShowcase() {
  const [idx, setIdx]       = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % FEATURES.length); setVisible(true) }, 500)
    }, 3800)
    return () => clearInterval(cycle)
  }, [])

  const f = FEATURES[idx]

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center",
      padding:"48px 40px", position:"relative", overflow:"hidden",
      background:"linear-gradient(145deg,#1a0a00 0%,#2d1200 40%,#1a0500 100%)",
      minHeight:"100dvh" }}>

      {/* Decorative rings */}
      <div style={{ position:"absolute", top:-80, right:-80, width:340, height:340,
        borderRadius:"50%", border:"1.5px solid rgba(232,119,34,0.12)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", top:-40, right:-40, width:220, height:220,
        borderRadius:"50%", border:"1.5px solid rgba(232,119,34,0.18)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:-60, left:-60, width:280, height:280,
        borderRadius:"50%", border:"1.5px solid rgba(255,255,255,0.06)", pointerEvents:"none" }}/>

      {/* Floating dots */}
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          position:"absolute",
          top:`${15 + i * 13}%`, left:`${8 + i * 14}%`,
          width: 4 + (i % 3) * 3, height: 4 + (i % 3) * 3,
          borderRadius:"50%",
          background:`rgba(232,119,34,${0.15 + (i % 3) * 0.08})`,
          animation:`floatDot${i % 3} ${3 + i * 0.7}s ease-in-out infinite`,
          pointerEvents:"none",
        }}/>
      ))}

      {/* Brand mark */}
      <div style={{ marginBottom:48 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:11, flexShrink:0,
            background:"linear-gradient(135deg,#e87722,#c25500)",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 4px 16px rgba(232,119,34,0.4)" }}>
            <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
              <path d="M8 23 L24 11 L40 23 Z" fill="white"/>
              <rect x="9" y="23" width="30" height="17" rx="1" fill="white"/>
              <path d="M18.5 40 L18.5 33 C18.5 29.96 21 28 24 28 C27 28 29.5 29.96 29.5 33 L29.5 40 Z" fill="#e87722"/>
              <circle cx="38.5" cy="9.5" r="6" fill="#1D9E75"/>
              <line x1="38.5" y1="6.5" x2="38.5" y2="12.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="35.5" y1="9.5" x2="41.5" y2="9.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:20, fontWeight:800,
              color:"#fff", letterSpacing:"-0.3px" }}>
              दुकान<span style={{ color:"#e87722" }}>•AI</span>
            </div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", marginTop:1, letterSpacing:"1px" }}>
              SMART STORE MANAGER
            </div>
          </div>
        </div>
      </div>

      {/* Feature showcase */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center" }}>
        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(16px)",
          transition:"opacity 0.5s ease, transform 0.5s ease",
        }}>
          {/* Icon + title */}
          <div style={{ fontSize:44, marginBottom:16 }}>{f.icon}</div>
          <div style={{ fontSize:22, fontWeight:800, color:"#fff", lineHeight:1.25,
            marginBottom:10, letterSpacing:"-0.3px" }}>
            {f.title}
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.55)", lineHeight:1.6,
            marginBottom:28, maxWidth:320 }}>
            {f.sub}
          </div>

          {/* Mock UI card */}
          <div style={{ background:"rgba(255,255,255,0.06)", backdropFilter:"blur(10px)",
            border:"1px solid rgba(255,255,255,0.10)", borderRadius:16, padding:"16px 18px",
            maxWidth:340 }}>

            {/* Billing mockup */}
            {f.mockup && (
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"#1D9E75",
                    boxShadow:"0 0 6px #1D9E75" }}/>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontWeight:600,
                    letterSpacing:"1px" }}>VOICE BILLING — LIVE</span>
                </div>
                {f.mockup.map((item, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", padding:"7px 0",
                    borderBottom: i < f.mockup.length-1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{item.label}</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{item.qty}</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#e87722" }}>{item.amt}</div>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:10,
                  paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.12)" }}>
                  <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.7)" }}>Total</span>
                  <span style={{ fontSize:14, fontWeight:800, color:"#1D9E75" }}>₹238</span>
                </div>
              </div>
            )}

            {/* Stats mockup */}
            {f.stats && (
              <div style={{ display:"flex", gap:12 }}>
                {f.stats.map((s, i) => (
                  <div key={i} style={{ flex:1, textAlign:"center" }}>
                    <div style={{ fontSize:16, fontWeight:800, color:s.color }}>{s.val}</div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", marginTop:4,
                      fontWeight:600, letterSpacing:"0.5px" }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Udhar mockup */}
            {f.debtors && (
              <div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", fontWeight:600,
                  letterSpacing:"1px", marginBottom:10 }}>PENDING UDHAAR</div>
                {f.debtors.map((d, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", padding:"7px 0",
                    borderBottom: i < f.debtors.length-1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:26, height:26, borderRadius:"50%", background:"rgba(226,75,74,0.25)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:12, fontWeight:700, color:"#E24B4A" }}>
                        {d.name.charAt(0)}
                      </div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)" }}>{d.name}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#E24B4A" }}>{d.amt}</div>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)" }}>{d.days} ago</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stock mockup */}
            {f.stock && (
              <div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", fontWeight:600,
                  letterSpacing:"1px", marginBottom:10 }}>STOCK STATUS</div>
                {f.stock.map((s, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", padding:"7px 0",
                    borderBottom: i < f.stock.length-1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)" }}>{s.name}</div>
                    <div style={{ padding:"2px 10px", borderRadius:20, fontSize:10, fontWeight:700,
                      background:`${s.color}22`, color:s.color, border:`1px solid ${s.color}44` }}>
                      {s.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feature dots indicator */}
      <div style={{ display:"flex", gap:6, marginTop:32 }}>
        {FEATURES.map((_, i) => (
          <div key={i} onClick={() => { setVisible(false); setTimeout(() => { setIdx(i); setVisible(true) }, 300) }}
            style={{ width: i === idx ? 20 : 6, height:6, borderRadius:3, cursor:"pointer",
              background: i === idx ? "#e87722" : "rgba(255,255,255,0.2)",
              transition:"all 0.3s ease" }}/>
        ))}
      </div>

      {/* Trust badges */}
      <div style={{ display:"flex", gap:20, marginTop:24, flexWrap:"wrap" }}>
        {["🇮🇳 Made for Bharat", "🔒 Your data stays yours", "⚡ Free to start"].map((b, i) => (
          <div key={i} style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:500 }}>{b}</div>
        ))}
      </div>

      <style>{`
        @keyframes floatDot0 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes floatDot1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
        @keyframes floatDot2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>
    </div>
  )
}

// ── Auth form ─────────────────────────────────────────────────
function AuthForm({ onSuccess, onLocalMode }) {
  const { login, register, registerConfirm, loading, error, setError } = useAuth()
  const lang = currentLang()
  const t = k => tr(k, lang)
  const [tab,      setTab]      = useState("login")
  const [form,     setForm]     = useState({ identifier:"", password:"", store_name:"" })
  const [modules,  setModules]  = useState(["kirana"])
  const [fieldErr, setFieldErr] = useState({})
  const [otpStep,    setOtpStep]    = useState(false)
  const [otpCode,    setOtpCode]    = useState("")
  const [otpErr,     setOtpErr]     = useState("")
  const [pendingTok, setPendingTok] = useState("")

  function set(k, v) { setForm(f => ({ ...f, [k]:v })); setError(""); setFieldErr(e => ({ ...e, [k]:"" })) }
  function switchTab(t) { setTab(t); setForm({ identifier:"", password:"", store_name:"" }); setFieldErr({}); setError(""); setOtpStep(false) }
  function toggleModule(id) {
    setModules(m => m.includes(id) ? (m.length > 1 ? m.filter(x => x !== id) : m) : [...m, id])
  }

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!form.identifier) errs.identifier = t("Required")
    else if (tab === "login" && !isValidEmail(form.identifier) && !isValidPhone(form.identifier))
      errs.identifier = t("Valid email or 10-digit phone")
    else if (tab === "register" && !isValidEmail(form.identifier))
      errs.identifier = t("Valid email required")
    if (!form.password) errs.password = t("Required")
    else if (tab === "register" && form.password.length < 8) errs.password = t("Min 8 characters")
    if (tab === "register" && !form.store_name) errs.store_name = t("Required")
    if (Object.keys(errs).length) { setFieldErr(errs); return }
    try {
      if (tab === "login") {
        const d = await login(form.identifier, form.password)
        onSuccess(d.modules || ["kirana"])
      } else {
        const res = await register({ ...form, email: form.identifier, modules })
        if (res?.status === "otp_required") { setPendingTok(res.pending_token); setOtpStep(true) }
        else onSuccess(res.modules || modules)
      }
    } catch {}
  }

  async function confirmOtp(e) {
    e.preventDefault(); setOtpErr("")
    if (!otpCode || otpCode.length !== 6) { setOtpErr(t("Enter 6-digit OTP")); return }
    try { const d = await registerConfirm(pendingTok, otpCode); onSuccess(d.modules || modules) }
    catch(err) { setOtpErr(err.message) }
  }

  const inp = { width:"100%", border:"1.5px solid #e5e7eb", borderRadius:10, padding:"12px 14px",
    fontSize:16, outline:"none", boxSizing:"border-box", background:"#fafafa",
    transition:"border 0.15s, box-shadow 0.15s", fontFamily:"inherit" }
  const inpFocus = e => { e.target.style.border="1.5px solid #e87722"; e.target.style.boxShadow="0 0 0 3px rgba(232,119,34,0.12)" }
  const inpBlur  = e => { e.target.style.border="1.5px solid #e5e7eb"; e.target.style.boxShadow="none" }

  if (otpStep) return (
    <form onSubmit={confirmOtp} style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ textAlign:"center", marginBottom:4 }}>
        <div style={{ fontSize:36, marginBottom:10 }}>📧</div>
        <div style={{ fontWeight:700, fontSize:16, color:"#111" }}>{t("Check your email")}</div>
        <div style={{ fontSize:12, color:"#888", marginTop:6 }}>
          {t("OTP sent to")} <strong>{form.identifier}</strong>
        </div>
      </div>
      <div>
        <input style={{ ...inp, textAlign:"center", fontSize:22, fontWeight:700, letterSpacing:"8px" }}
          placeholder="• • • • • •" maxLength={6}
          value={otpCode} onChange={e => { setOtpCode(e.target.value); setOtpErr("") }}
          onFocus={inpFocus} onBlur={inpBlur} autoFocus />
        {otpErr && <p style={{ color:"#E24B4A", fontSize:11, marginTop:6, textAlign:"center" }}>{otpErr}</p>}
      </div>
      <button type="submit" disabled={loading} style={{ width:"100%", padding:"13px",
        borderRadius:11, border:"none", background:"linear-gradient(135deg,#e87722,#c25500)",
        color:"#fff", fontSize:14, fontWeight:700, cursor:loading?"default":"pointer", opacity:loading?0.7:1 }}>
        {loading ? t("Verifying…") : t("Confirm & Enter →")}
      </button>
      <button type="button" onClick={() => setOtpStep(false)}
        style={{ background:"none", border:"none", color:"#aaa", fontSize:12, cursor:"pointer" }}>
        {t("← Back")}
      </button>
    </form>
  )

  return (
    <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* Tab row */}
      <div style={{ display:"flex", background:"#f3f4f6", borderRadius:10, padding:3, gap:2, marginBottom:6 }}>
        {[["login","Sign In"],["register","Create Account"]].map(([tabKey, lbl]) => (
          <button key={tabKey} type="button" onClick={() => switchTab(tabKey)}
            style={{ flex:1, padding:"9px 8px", borderRadius:8, border:"none", fontSize:12,
              fontWeight:700, cursor:"pointer", transition:"all 0.15s",
              background: tab===tabKey ? "#fff" : "transparent",
              color: tab===tabKey ? "#111" : "#888",
              boxShadow: tab===tabKey ? "0 1px 4px rgba(0,0,0,0.10)" : "none" }}>
            {t(lbl)}
          </button>
        ))}
      </div>

      {tab === "register" && (
        <div>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#555", marginBottom:5 }}>{t("Store Name")}</label>
          <input style={inp} placeholder={t("Raju General Store")}
            value={form.store_name} onChange={e => set("store_name", e.target.value)}
            onFocus={inpFocus} onBlur={inpBlur} />
          {fieldErr.store_name && <p style={{ color:"#E24B4A", fontSize:11, marginTop:4 }}>{fieldErr.store_name}</p>}
        </div>
      )}

      <div>
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#555", marginBottom:5 }}>
          {tab === "login" ? t("Email or Phone") : t("Email")}
        </label>
        <input style={inp} placeholder={tab === "login" ? "email@example.com or 9876543210" : "email@example.com"}
          value={form.identifier} onChange={e => set("identifier", e.target.value)}
          onFocus={inpFocus} onBlur={inpBlur} autoComplete="username" />
        {fieldErr.identifier && <p style={{ color:"#E24B4A", fontSize:11, marginTop:4 }}>{fieldErr.identifier}</p>}
      </div>

      <div>
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#555", marginBottom:5 }}>{t("Password")}</label>
        <input style={inp} type="password" placeholder={tab==="register" ? t("Min 8 characters") : "••••••••"}
          value={form.password} onChange={e => set("password", e.target.value)}
          onFocus={inpFocus} onBlur={inpBlur} autoComplete={tab==="login"?"current-password":"new-password"} />
        {fieldErr.password && <p style={{ color:"#E24B4A", fontSize:11, marginTop:4 }}>{fieldErr.password}</p>}
      </div>

      {tab === "register" && (
        <div>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#555", marginBottom:8 }}>{t("Store Type")}</label>
          <div style={{ display:"flex", gap:8 }}>
            {MODULES.map(m => (
              <button key={m.id} type="button" onClick={() => toggleModule(m.id)}
                style={{ flex:1, padding:"12px 8px", borderRadius:11, cursor:"pointer",
                  border: modules.includes(m.id) ? "2px solid #e87722" : "2px solid #e5e7eb",
                  background: modules.includes(m.id) ? "rgba(232,119,34,0.07)" : "#fafafa",
                  transition:"all 0.15s" }}>
                <div style={{ fontSize:22, marginBottom:5 }}>{m.emoji}</div>
                <div style={{ fontSize:10, fontWeight:700, color:"#333", lineHeight:1.3 }}>
                  {m.id === "kirana" ? t("Kirana Store") : t("Bangle Store")}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ background:"#fff5f5", border:"1px solid rgba(226,75,74,0.3)",
          borderRadius:10, padding:"10px 12px", fontSize:12, color:"#E24B4A" }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading}
        style={{ width:"100%", padding:"14px", borderRadius:12, border:"none",
          background:"linear-gradient(135deg,#e87722,#c25500)", color:"#fff",
          fontSize:14, fontWeight:700, cursor:loading?"default":"pointer",
          opacity:loading?0.7:1, marginTop:4,
          boxShadow:"0 4px 16px rgba(232,119,34,0.35)", transition:"opacity 0.2s" }}>
        {loading ? t("Please wait…") : tab==="login" ? t("Sign In →") : t("Create Account →")}
      </button>

      <div style={{ textAlign:"center" }}>
        <button type="button" onClick={onLocalMode}
          style={{ background:"none", border:"none", color:"#aaa", fontSize:11,
            cursor:"pointer", textDecoration:"underline" }}>
          {t("Use without account (local only)")}
        </button>
      </div>
    </form>
  )
}

// ── Module picker ─────────────────────────────────────────────
function ModulePicker({ allowedModules, onPick }) {
  const available = MODULES.filter(m => allowedModules.includes(m.id))
  useEffect(() => { if (available.length === 1) onPick(available[0]) }, [])
  if (available.length === 1) return null

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ marginBottom:4 }}>
        <div style={{ fontSize:11, fontWeight:800, color:"#aaa", letterSpacing:"1.5px",
          textTransform:"uppercase", marginBottom:6 }}>Welcome back</div>
        <div style={{ fontSize:20, fontWeight:800, color:"#111", lineHeight:1.25 }}>
          Which store are you<br/>opening today?
        </div>
      </div>
      {available.map(m => (
        <button key={m.id} onClick={() => onPick(m)}
          style={{ background:m.bg, border:`2px solid ${m.border}`, borderRadius:16,
            padding:"18px 20px", display:"flex", alignItems:"center", gap:14,
            cursor:"pointer", transition:"all 0.15s", textAlign:"left",
            boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}
          onPointerDown={e => e.currentTarget.style.transform="scale(0.97)"}
          onPointerUp={e   => e.currentTarget.style.transform="scale(1)"}
          onPointerLeave={e=> e.currentTarget.style.transform="scale(1)"}>
          <div style={{ width:48, height:48, borderRadius:13, flexShrink:0, background:m.gradient,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
            {m.emoji}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:800, color:"#111", marginBottom:3 }}>{m.label}</div>
            <div style={{ fontSize:11, color:"#888" }}>{m.sub}</div>
          </div>
          <svg width="14" height="14" fill="none" stroke="#ccc" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      ))}
    </div>
  )
}

// ── Root page ─────────────────────────────────────────────────
export default function LoginHome() {
  const { vendor } = useAuth()
  const navigate = useNavigate()
  const [phase,       setPhase]       = useState("auth")
  const [allowedMods, setAllowedMods] = useState([])

  useEffect(() => {
    if (!vendor) return
    // If token is expired, clear the stale session and show login form
    if (!isTokenValid()) { clearAuth(); return }
    const saved   = localStorage.getItem("storeMode")
    const mods    = vendor.modules || ["kirana"]
    const hasBangle = mods.includes("bangle_fancy")
    const hasKirana = mods.includes("kirana")
    if (saved === "bangle_fancy" && hasBangle) { navigate("/bangle-dashboard", { replace:true }); return }
    if (saved === "kirana"       && hasKirana)  { navigate("/dashboard",        { replace:true }); return }
    setAllowedMods(mods); setPhase("pick")
  }, [vendor])

  function handleAuthSuccess(mods) { setAllowedMods(mods || ["kirana"]); setPhase("pick") }
  function handleLocalMode()       { setAllowedMods(["kirana","bangle_fancy"]); setPhase("pick") }
  function handlePick(m)           { localStorage.setItem("storeMode", m.id); navigate(m.route, { replace:true }) }

  return (
    <div style={{ display:"flex", minHeight:"100dvh" }}>

      {/* Left panel — hidden on mobile */}
      <div className="lh-left" style={{ flex:"0 0 75%", display:"flex", position:"relative" }}>
        <PromoVideo />
        {/* Glowing vertical divider */}
        <div style={{ position:"absolute", top:0, right:0, width:1, height:"100%",
          background:"linear-gradient(to bottom, transparent 0%, rgba(232,119,34,0.6) 30%, rgba(232,119,34,0.8) 50%, rgba(232,119,34,0.6) 70%, transparent 100%)",
          boxShadow:"0 0 18px 2px rgba(232,119,34,0.35)", zIndex:10 }}/>
      </div>

      {/* Right panel — light warm */}
      <div className="lh-right" style={{ flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"48px 32px", minHeight:"100dvh", overflowY:"auto",
        position:"relative", overflow:"hidden",
        background:"linear-gradient(160deg,#fffaf5 0%,#fff4e8 45%,#ffefd4 100%)" }}>

        {/* Scattered language scripts */}
        {[
          { text:"తెలుగు",   top:"6%",  left:"8%",   size:18, rot:-12, op:0.13 },
          { text:"हिन्दी",   top:"10%", left:"62%",  size:22, rot:8,   op:0.15 },
          { text:"தமிழ்",   top:"18%", left:"30%",  size:14, rot:-6,  op:0.11 },
          { text:"ಕನ್ನಡ",   top:"22%", left:"78%",  size:16, rot:14,  op:0.12 },
          { text:"മലയാളം", top:"32%", left:"5%",   size:13, rot:-10, op:0.10 },
          { text:"मराठी",   top:"38%", left:"70%",  size:20, rot:6,   op:0.13 },
          { text:"বাংলা",   top:"50%", left:"14%",  size:15, rot:-8,  op:0.11 },
          { text:"ગુજરાતી", top:"55%", left:"72%",  size:13, rot:10,  op:0.10 },
          { text:"ਪੰਜਾਬੀ",  top:"65%", left:"5%",   size:17, rot:-14, op:0.12 },
          { text:"English",  top:"70%", left:"60%",  size:14, rot:5,   op:0.09 },
          { text:"ଓଡ଼ିଆ",   top:"78%", left:"25%",  size:15, rot:-7,  op:0.10 },
          { text:"தமிழ்",   top:"82%", left:"80%",  size:12, rot:12,  op:0.08 },
          { text:"हिन्दी",  top:"88%", left:"42%",  size:13, rot:-5,  op:0.09 },
          { text:"తెలుగు",  top:"4%",  left:"48%",  size:12, rot:9,   op:0.08 },
          { text:"ಕನ್ನಡ",  top:"92%", left:"8%",   size:16, rot:-11, op:0.10 },
        ].map((l, i) => (
          <div key={i} className="lh-lang" style={{
            position:"absolute", top:l.top, left:l.left,
            fontSize:l.size, fontWeight:700,
            color:`rgba(180,80,10,${l.op})`,
            transform:`rotate(${l.rot}deg)`,
            pointerEvents:"none", userSelect:"none",
            fontFamily:"'Tiro Devanagari Hindi',serif",
            whiteSpace:"nowrap",
          }}>{l.text}</div>
        ))}

        {/* Soft glow orbs */}
        <div style={{ position:"absolute", top:-60, right:-60, width:340, height:340,
          borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(circle, rgba(232,119,34,0.10) 0%, transparent 70%)" }}/>
        <div style={{ position:"absolute", bottom:-60, left:-60, width:280, height:280,
          borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(circle, rgba(124,92,191,0.08) 0%, transparent 70%)" }}/>

        {/* Decorative rings */}
        <div style={{ position:"absolute", top:-80, right:-80, width:380, height:380,
          borderRadius:"50%", border:"1.5px solid rgba(232,119,34,0.12)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:-44, right:-44, width:250, height:250,
          borderRadius:"50%", border:"1.5px solid rgba(232,119,34,0.16)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:-70, left:-70, width:300, height:300,
          borderRadius:"50%", border:"1.5px solid rgba(124,92,191,0.10)", pointerEvents:"none" }}/>

        {/* Content */}
        <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:400,
          display:"flex", flexDirection:"column", alignItems:"center" }}>

          {/* Logo */}
          <div className="lh-logo-wrap" style={{ textAlign:"center", marginBottom:28 }}>
            <div className="lh-logo-icon" style={{ width:80, height:80, borderRadius:22, margin:"0 auto 16px",
              background:"linear-gradient(135deg,#e87722,#c25500)",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 10px 36px rgba(232,119,34,0.38)" }}>
              <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                <path d="M8 23 L24 11 L40 23 Z" fill="white"/>
                <rect x="9" y="23" width="30" height="17" rx="1" fill="white"/>
                <path d="M18.5 40 L18.5 33 C18.5 29.96 21 28 24 28 C27 28 29.5 29.96 29.5 33 L29.5 40 Z" fill="#e87722"/>
                <circle cx="38.5" cy="9.5" r="6" fill="#1D9E75"/>
                <line x1="38.5" y1="6.5" x2="38.5" y2="12.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="35.5" y1="9.5" x2="41.5" y2="9.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="lh-logo-text" style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:34,
              fontWeight:800, color:"#1a0800", letterSpacing:"-0.5px", lineHeight:1 }}>
              दुकान<span style={{ color:"#e87722" }}>•AI</span>
            </div>
            <div className="lh-logo-sub" style={{ fontSize:13, color:"#a07040", marginTop:8, fontWeight:500 }}>
              Smart store manager for Indian retailers
            </div>
          </div>

          {/* Module badges */}
          <div className="lh-badges" style={{ display:"flex", gap:12, marginBottom:32 }}>
            {[
              { emoji:"🏪", name:"Kirana Store", sub:"Grocery & FMCG",   nameColor:"#c25500", border:"rgba(232,119,34,0.35)", bg:"rgba(232,119,34,0.07)" },
              { emoji:"💍", name:"Bangle Store", sub:"Jewellery & Fancy", nameColor:"#5b3fa6", border:"rgba(124,92,191,0.35)", bg:"rgba(124,92,191,0.07)" },
            ].map(b => (
              <div key={b.name} style={{ display:"flex", alignItems:"center", gap:10,
                background:b.bg, border:`1.5px solid ${b.border}`,
                borderRadius:16, padding:"12px 18px",
                boxShadow:"0 4px 16px rgba(0,0,0,0.07)" }}>
                <span style={{ fontSize:22 }}>{b.emoji}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:b.nameColor, lineHeight:1 }}>{b.name}</div>
                  <div style={{ fontSize:10, color:"#a08060", marginTop:3 }}>{b.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Form card */}
          <div className="lh-form-card" style={{ width:"100%", background:"#fff", borderRadius:22,
            padding:"32px 28px",
            boxShadow:"0 12px 48px rgba(180,100,20,0.15), 0 2px 8px rgba(0,0,0,0.06)",
            border:"1px solid rgba(232,119,34,0.12)" }}>
            {phase === "auth" && <AuthForm onSuccess={handleAuthSuccess} onLocalMode={handleLocalMode} />}
            {phase === "pick" && <ModulePicker allowedModules={allowedMods} onPick={handlePick} />}
          </div>

          <div style={{ marginTop:24, fontSize:11, color:"#c0a070", textAlign:"center" }}>
            © 2026 DukhaanAI · Built for Bharat 🇮🇳
          </div>
        </div>
      </div>

      <style>{`
        /* ── Desktop: padding adjustment ── */
        @media (min-width: 1025px) {
          .lh-right {
            padding-bottom: max(48px, env(safe-area-inset-bottom)) !important;
          }
        }

        /* ── Mobile & tablet (≤1024px) ── */
        @media (max-width: 1024px) {
          /* Hide animation panel on mobile/tablet */
          .lh-left { display: none !important; }

          /* Hide language watermarks */
          .lh-lang { display: none !important; }

          /* Right panel: full screen, safe area aware */
          .lh-right {
            padding: 32px 20px !important;
            padding-top: max(32px, env(safe-area-inset-top)) !important;
            padding-bottom: max(24px, env(safe-area-inset-bottom)) !important;
            min-height: 100dvh !important;
            justify-content: flex-start !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
        }

        /* ── Very small screens (380px and below) ── */
        @media (max-width: 380px) {
          .lh-right {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
          .lh-badges { flex-direction: column !important; }
          .lh-logo-icon { width: 60px !important; height: 60px !important; border-radius: 16px !important; }
        }

        /* ── Mobile/tablet logo sizing ── */
        @media (max-width: 1024px) {
          .lh-logo-icon { width: 64px !important; height: 64px !important; border-radius: 18px !important; }
        }

        /* ── Prevent iOS input zoom (font-size already 16px in JS) ── */
        input, select, textarea {
          font-size: 16px !important;
          -webkit-text-size-adjust: 100%;
        }

        /* ── Landscape on phones/tablets (height < 600px) ── */
        @media (max-height: 600px) and (orientation: landscape) {
          .lh-left  { display: none !important; }
          .lh-lang  { display: none !important; }
          .lh-right {
            justify-content: flex-start !important;
            padding: 16px 24px !important;
            padding-left:  max(24px, env(safe-area-inset-left))  !important;
            padding-right: max(24px, env(safe-area-inset-right)) !important;
            padding-bottom: max(16px, env(safe-area-inset-bottom)) !important;
          }
          .lh-logo-icon   { display: none !important; }
          .lh-logo-text   { font-size: 20px !important; margin-bottom: 4px !important; }
          .lh-logo-sub    { display: none !important; }
          .lh-logo-wrap   { margin-bottom: 12px !important; }
          .lh-badges      { margin-bottom: 14px !important; gap: 8px !important; }
          .lh-badges > div { padding: 8px 12px !important; }
          .lh-form-card   { padding: 18px 20px !important; border-radius: 16px !important; }
        }

        /* ── System font scaling guard ── */
        @media (max-width: 1024px) {
          .lh-right * { -webkit-text-size-adjust: none; text-size-adjust: none; }
        }

        /* ── Capacitor / WebView scroll fix ── */
        html, body { height: 100%; overflow: hidden; }
        #root      { height: 100%; overflow: auto; }
      `}</style>
    </div>
  )
}
