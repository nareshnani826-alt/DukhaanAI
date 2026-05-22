import { useState, useEffect, useCallback, useRef } from "react"
import { api } from "../sync/db"
import { getSavedLang, LANG_KEY } from "../voice/i18n"

// ── Shelf-life rules ───────────────────────────────────────────
const RULES = [
  [/\b(raw\s+milk|fresh\s+milk|toned\s+milk|full\s+cream\s+milk)\b/i, 1, 2],
  [/\b(milk|doodh)\b/i,        2, 3],
  [/\b(curd|dahi|yogurt)\b/i,  2, 4],
  [/\b(paneer|cottage\s+cheese)\b/i, 3, 5],
  [/\b(butter|makhan)\b/i,     15, 30],
  [/\b(ghee)\b/i,              180, 365],
  [/\b(cream)\b/i,             5, 7],
  [/\b(cheese)\b/i,            14, 30],
  [/\b(egg|anda)\b/i,          14, 21],
  [/\b(bread|pav|bun)\b/i,     3, 5],
  [/\b(rusk|toast)\b/i,        60, 90],
  [/\b(biscuit|cookie|cracker)\b/i, 60, 120],
  [/\b(namkeen|chips|wafer|bhujia|murukku)\b/i, 30, 90],
  [/\b(tomato|tamatar)\b/i,    4, 7],
  [/\b(onion|pyaaz|kanda)\b/i, 20, 30],
  [/\b(potato|aloo|batata)\b/i, 20, 30],
  [/\b(banana|kela)\b/i,       3, 6],
  [/\b(mango|aam)\b/i,         4, 7],
  [/\b(apple|seb)\b/i,         14, 21],
  [/\b(coriander|dhania|pudina|mint)\b/i, 3, 5],
  [/\b(spinach|palak|methi)\b/i, 2, 4],
  [/\b(coconut|nariyal)\b/i,   20, 30],
  [/\b(juice|nectar)\b/i,      90, 180],
  [/\b(cold\s+drink|soda|cola|pepsi|coke|sprite)\b/i, 180, 365],
  [/\b(water|packaged\s+water)\b/i, 365, 730],
  [/\b(lassi|chaas|buttermilk)\b/i, 1, 2],
  [/\b(tea|chai)\b/i,          365, 730],
  [/\b(coffee)\b/i,            365, 730],
  [/\b(oil)\b/i,               180, 365],
  [/\b(basmati)\b/i,           365, 730],
  [/\b(rice|chawal)\b/i,       365, 730],
  [/\b(wheat|gehun|atta|maida|sooji)\b/i, 180, 365],
  [/\b(dal|lentil|pulse|rajma|chhole)\b/i, 365, 730],
  [/\b(sugar|chini|jaggery|gud)\b/i, 365, 730],
  [/\b(salt|namak)\b/i,        1825, 3650],
  [/\b(honey|shahad)\b/i,      730, 1825],
  [/\b(ketchup|sauce|pickle|achar)\b/i, 180, 365],
  [/\b(maggi|noodle|pasta)\b/i, 180, 365],
  [/\b(cashew|kaju)\b/i,       90, 180],
  [/\b(almond|badam)\b/i,      180, 365],
  [/\b(peanut|moongphali)\b/i, 90, 180],
  [/\b(soap|shampoo)\b/i,      730, 1095],
  [/\b(detergent|washing\s+powder)\b/i, 1095, 1825],
]
const CAT_FALLBACK = {
  dairy:[3,7], vegetables:[5,10], fruits:[5,10], meat:[1,2], bakery:[3,7],
  beverages:[180,365], snacks:[60,120], staples:[180,365], oils:[180,365],
  spices:[365,730], "personal care":[730,1095],
}
function getShelfLife(name, category) {
  const n = (name||"").toLowerCase()
  for (const [re,mn,mx] of RULES) if (re.test(n)) return [mn,mx]
  const cat = (category||"").toLowerCase()
  for (const [k,v] of Object.entries(CAT_FALLBACK)) if (cat.includes(k)||k.includes(cat)) return v
  return [90,180]
}
function getRisk(d, mx) {
  if (mx<=0) return "safe"
  const p=d/mx
  if (d>mx) return "likely_expired"
  if (p>=0.85) return "high_risk"
  if (p>=0.60) return "attention"
  return "safe"
}
function daysSince(ts) {
  if (!ts) return 0
  return Math.max(0, Math.floor((Date.now()-new Date(ts).getTime())/86400000))
}
function enrichProduct(p) {
  const [mn,mx]=getShelfLife(p.name,p.category), old=daysSince(p.updated_at)
  return {...p, shelf_min_days:mn, shelf_max_days:mx, days_in_stock:old,
    days_remaining:Math.max(0,mx-old), risk_level:getRisk(old,mx)}
}

// ── Risk config ────────────────────────────────────────────────
const RISK = {
  likely_expired:{label:"Likely Expired",color:"#dc2626",bg:"#fef2f2",border:"#fca5a5",icon:"⛔"},
  high_risk:     {label:"High Risk",     color:"#ea580c",bg:"#fff7ed",border:"#fdba74",icon:"🔴"},
  attention:     {label:"Attention",     color:"#d97706",bg:"#fffbeb",border:"#fde68a",icon:"🟡"},
  safe:          {label:"Safe",          color:"#16a34a",bg:"#f0fdf4",border:"#86efac",icon:"🟢"},
}

// ── Language config ────────────────────────────────────────────
const LANGS = {
  "te-IN":{label:"Telugu",  native:"తెలుగు"},
  "hi-IN":{label:"Hindi",   native:"हिंदी"},
  "ta-IN":{label:"Tamil",   native:"தமிழ்"},
  "kn-IN":{label:"Kannada", native:"ಕನ್ನಡ"},
  "ml-IN":{label:"Malayalam",native:"മലയാളം"},
  "mr-IN":{label:"Marathi", native:"मराठी"},
  "bn-IN":{label:"Bengali", native:"বাংলা"},
  "en-IN":{label:"English", native:"English"},
}

// ── Alert text in native scripts ───────────────────────────────
const SCRIPTS = {
  "te-IN": (n,r,d) => r==="likely_expired" ? `హెచ్చరిక! ${n} గడువు ముగిసి ఉండవచ్చు. వెంటనే తనిఖీ చేయండి.`
    : r==="high_risk" ? `అలెర్ట్! ${n} గడువు దగ్గర పడింది. కేవలం ${d} రోజులు మిగిలాయి.`
    : r==="attention" ? `శ్రద్ధ! ${n} పర్యవేక్షించాలి. ${d} రోజులు మిగిలి ఉన్నాయి.`
    : `${n} మంచి స్థితిలో ఉంది. ${d} రోజులు మిగిలి ఉన్నాయి.`,
  "hi-IN": (n,r,d) => r==="likely_expired" ? `चेतावनी! ${n} की एक्सपायरी हो सकती है। तुरंत जांचें।`
    : r==="high_risk" ? `अलर्ट! ${n} की एक्सपायरी नजदीक है। केवल ${d} दिन बचे हैं।`
    : r==="attention" ? `ध्यान दें! ${n} की निगरानी जरूरी है। ${d} दिन बाकी हैं।`
    : `${n} सुरक्षित है। ${d} दिन शेष हैं।`,
  "ta-IN": (n,r,d) => r==="likely_expired" ? `எச்சரிக்கை! ${n} காலாவதியாகியிருக்கலாம். உடனடியாக சரிபார்க்கவும்.`
    : r==="high_risk" ? `அலர்ட்! ${n} காலாவதி நெருங்குகிறது. ${d} நாட்கள் மட்டுமே உள்ளன.`
    : r==="attention" ? `கவனம்! ${n} கண்காணிப்பு தேவை. ${d} நாட்கள் உள்ளன.`
    : `${n} நல்ல நிலையில் உள்ளது. ${d} நாட்கள் உள்ளன.`,
  "kn-IN": (n,r,d) => r==="likely_expired" ? `ಎಚ್ಚರಿಕೆ! ${n} ಅವಧಿ ಮೀರಿರಬಹುದು. ತಕ್ಷಣ ಪರಿಶೀಲಿಸಿ.`
    : r==="high_risk" ? `ಅಲರ್ಟ್! ${n} ಅವಧಿ ಮೀರುತ್ತಿದೆ. ಕೇವಲ ${d} ದಿನಗಳು ಉಳಿದಿವೆ.`
    : r==="attention" ? `ಗಮನ! ${n} ಮೇಲ್ವಿಚಾರಣೆ ಬೇಕು. ${d} ದಿನಗಳು ಉಳಿದಿವೆ.`
    : `${n} ಸುರಕ್ಷಿತ. ${d} ದಿನಗಳು ಉಳಿದಿವೆ.`,
  "ml-IN": (n,r,d) => r==="likely_expired" ? `മുന്നറിയിപ്പ്! ${n} കാലഹരണപ്പെട്ടിരിക്കാം. ഉടൻ പരിശോധിക്കുക.`
    : r==="high_risk" ? `അലർട്ട്! ${n} കാലഹരണം അടുക്കുന്നു. ${d} ദിവസം മാത്രം ബാക്കി.`
    : r==="attention" ? `ശ്രദ്ധ! ${n} നിരീക്ഷണം ആവശ്യം. ${d} ദിവസം ബാക്കി.`
    : `${n} സുരക്ഷിതം. ${d} ദിവസം ബാക്കി.`,
  "mr-IN": (n,r,d) => r==="likely_expired" ? `इशारा! ${n} ची मुदत संपली असू शकते. त्वरित तपासा.`
    : r==="high_risk" ? `अलर्ट! ${n} ची मुदत जवळ आहे. फक्त ${d} दिवस शिल्लक.`
    : r==="attention" ? `लक्ष द्या! ${n} वर लक्ष ठेवणे आवश्यक. ${d} दिवस शिल्लक.`
    : `${n} सुरक्षित. ${d} दिवस शिल्लक.`,
  "bn-IN": (n,r,d) => r==="likely_expired" ? `সতর্কতা! ${n} মেয়াদ শেষ হয়ে থাকতে পারে। এখনই পরীক্ষা করুন।`
    : r==="high_risk" ? `সতর্ক! ${n} মেয়াদ শেষের কাছে। মাত্র ${d} দিন বাকি।`
    : r==="attention" ? `মনোযোগ! ${n} পর্যবেক্ষণ দরকার। ${d} দিন বাকি।`
    : `${n} নিরাপদ। ${d} দিন বাকি।`,
  "en-IN": (n,r,d) => r==="likely_expired" ? `Warning! ${n} may have expired. Check immediately.`
    : r==="high_risk" ? `Alert! ${n} is near expiry. Only ${d} days remaining.`
    : r==="attention" ? `Attention! ${n} needs monitoring. ${d} days until expiry.`
    : `${n} is safe. ${d} days remaining.`,
}

function getSummaryIntro(lang, total) {
  const safe = {
    "te-IN":"అన్ని వస్తువులు సురక్షితంగా ఉన్నాయి. ఈరోజు హెచ్చరికలు లేవు.",
    "hi-IN":"सभी उत्पाद सुरक्षित हैं। आज कोई अलर्ट नहीं।",
    "ta-IN":"அனைத்தும் பாதுகாப்பாக உள்ளன. இன்று எச்சரிக்கைகள் இல்லை.",
    "kn-IN":"ಎಲ್ಲ ಉತ್ಪನ್ನಗಳು ಸುರಕ್ಷಿತ. ಇಂದು ಎಚ್ಚರಿಕೆಗಳಿಲ್ಲ.",
    "ml-IN":"എല്ലാ ഉൽപ്പന്നങ്ങളും സുരക്ഷിതം.",
    "mr-IN":"सर्व उत्पादने सुरक्षित आहेत.",
    "bn-IN":"সব পণ্য নিরাপদ।",
    "en-IN":"All products are safe. No expiry alerts today.",
  }
  if (total===0) return safe[lang]||safe["en-IN"]
  const alert = {
    "te-IN":`శ్రద్ధ! ${total} వస్తువులకు తక్షణ శ్రద్ధ అవసరం.`,
    "hi-IN":`ध्यान दें! ${total} उत्पादों पर तुरंत ध्यान चाहिए।`,
    "ta-IN":`கவனம்! ${total} பொருட்களுக்கு கவனம் தேவை.`,
    "kn-IN":`ಗಮನ! ${total} ಉತ್ಪನ್ನಗಳಿಗೆ ಗಮನ ಬೇಕು.`,
    "ml-IN":`ശ്രദ്ധ! ${total} ഉൽപ്പന്നങ്ങൾക്ക് ശ്രദ്ധ ആവശ്യം.`,
    "mr-IN":`लक्ष द्या! ${total} उत्पादांकडे लक्ष आवश्यक.`,
    "bn-IN":`মনোযোগ! ${total}টি পণ্যে মনোযোগ দরকার।`,
    "en-IN":`Attention! ${total} product${total>1?"s":""} need immediate attention.`,
  }
  return alert[lang]||alert["en-IN"]
}

// ── Three-engine TTS system ────────────────────────────────────
// Engine 1: Native device voices (works offline — Android has Telugu built-in)
// Engine 2: Google Translate TTS via Audio (works on all devices with internet)
// Engine 3: Text display (always works — pure fallback)

let _cloudAudio = null

function findNativeVoice(langCode) {
  if (!window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  const prefix = langCode.split("-")[0]
  return voices.find(v => v.lang === langCode)
      || voices.find(v => v.lang.toLowerCase().startsWith(prefix))
      || null
}

// Checks if native voice exists for this lang code
function hasNativeVoice(langCode) {
  return !!findNativeVoice(langCode)
}

// Split text into ≤180-char chunks at sentence boundaries for cloud TTS
function chunkText(text, maxLen=180) {
  if (text.length<=maxLen) return [text]
  const parts = text.split(/(?<=[।.!?])\s+/)
  const chunks=[], chunks2=[]
  let cur=""
  for (const p of parts) {
    if ((cur+(cur?" ":"")+p).length<=maxLen) cur+=(cur?" ":"")+p
    else { if (cur) chunks.push(cur); cur=p }
  }
  if (cur) chunks.push(cur)
  return chunks.length ? chunks : [text.slice(0,maxLen)]
}

// Engine 1: native device TTS (synchronous)
function speakNative(text, langCode) {
  const voice = findNativeVoice(langCode)
  if (!voice) return false
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang  = langCode
  utt.voice = voice
  utt.rate  = 0.88
  utt.pitch = 1
  window.speechSynthesis.speak(utt)
  return true
}

// Engine 2: Google Translate TTS via Audio element (requires internet)
// Works for ALL Indian languages without any installation.
// Uses the Google Translate web TTS endpoint (same one used by translate.google.com).
async function speakCloud(text, langCode) {
  const lang  = langCode.split("-")[0]   // te | hi | ta | kn | ml | mr | bn
  const chunk = chunkText(text)[0]       // first sentence fits in one request
  try {
    if (_cloudAudio) { _cloudAudio.pause(); _cloudAudio = null }
    // Audio element does not require CORS headers — no cross-origin restrictions
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob&ttsspeed=0.85`
    _cloudAudio = new Audio(url)
    _cloudAudio.volume = 1
    await _cloudAudio.play()
    return true
  } catch(e) {
    return false
  }
}

// Master speak function: native → cloud → false (triggers text fallback)
async function smartSpeak(text, langCode) {
  if (speakNative(text, langCode)) return { ok:true, engine:"native" }
  const ok = await speakCloud(text, langCode)
  if (ok) return { ok:true, engine:"cloud" }
  return { ok:false, engine:null }
}

// ── TextAlertCard (shown only when completely offline + no native voice) ──
function TextAlertCard({ product, lang, onClose, onReadEnglish }) {
  const r    = RISK[product.risk_level] || RISK.safe
  const text = (SCRIPTS[lang]||SCRIPTS["en-IN"])(product.name, product.risk_level, product.days_remaining)
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:900,
      background:"rgba(0,0,0,0.6)", backdropFilter:"blur(3px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
    }} onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div style={{
        background:r.bg, border:`2px solid ${r.border}`,
        borderRadius:20, width:"100%", maxWidth:480,
        boxShadow:`0 24px 60px ${r.color}33`,
      }}>
        {/* Header */}
        <div style={{background:r.color, borderRadius:"18px 18px 0 0",
          padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div style={{display:"flex", gap:10, alignItems:"center"}}>
            <span style={{fontSize:28}}>{r.icon}</span>
            <div>
              <div style={{color:"white", fontWeight:800, fontSize:16}}>{r.label}</div>
              <div style={{color:"rgba(255,255,255,0.8)", fontSize:11}}>{product.name}</div>
            </div>
          </div>
          <button onClick={onClose}
            style={{background:"rgba(255,255,255,0.25)", border:"none", borderRadius:"50%",
              width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", color:"white", fontSize:16}}>✕</button>
        </div>
        {/* Body */}
        <div style={{padding:"22px 24px"}}>
          <div style={{fontSize:12, color:r.color, fontWeight:700,
            textTransform:"uppercase", letterSpacing:"1px", marginBottom:10}}>
            📢 {LANGS[lang]?.native || lang} Alert
          </div>
          {/* Alert text in native script — large and readable */}
          <div style={{
            fontSize:17, lineHeight:1.8, color:"var(--ink, #1a1a1a)",
            fontWeight:500, marginBottom:16, padding:"16px",
            background:"white", borderRadius:12, border:`1.5px solid ${r.border}`,
            fontFamily:"'Noto Sans Telugu','Noto Sans Tamil','Noto Sans Kannada',system-ui,sans-serif",
          }}>{text}</div>
          {/* Offline note */}
          <div style={{
            background:"#fffbeb", border:"1px solid #fde68a", borderRadius:9,
            padding:"10px 14px", fontSize:12, color:"#92400e", marginBottom:16,
            display:"flex", gap:8,
          }}>
            <span>📵</span>
            <span>
              Voice needs internet for {LANGS[lang]?.label} on this device.
              Connect to internet and try again, or read the text above.
            </span>
          </div>
          <div style={{display:"flex", gap:8}}>
            <button onClick={onReadEnglish}
              style={{flex:1, padding:"10px", borderRadius:9, border:"none",
                background:"linear-gradient(135deg,#e87722,#d45f00)", color:"white",
                fontWeight:700, fontSize:13, cursor:"pointer"}}>
              🔊 Read in English
            </button>
            <button onClick={onClose}
              style={{padding:"10px 16px", borderRadius:9,
                border:"1px solid var(--rule,#eee)", background:"white",
                color:"var(--ink-dim)", fontWeight:600, fontSize:13, cursor:"pointer"}}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Voice engine status indicator ──────────────────────────────
// voiceStatus per lang: "native" | "cloud" | "checking"
function EngineLabel({ langCode, nativeVoices }) {
  const hasNative = nativeVoices[langCode]
  if (hasNative === undefined) return (
    <span style={{fontSize:10, color:"#9ca3af"}}>checking…</span>
  )
  if (hasNative) return (
    <span style={{fontSize:10, color:"#16a34a", fontWeight:700}}>✅ Device</span>
  )
  return (
    <span style={{fontSize:10, color:"#2563eb", fontWeight:700}}>☁️ Online</span>
  )
}

// ── Sub-components ─────────────────────────────────────────────
function ExpiryBar({ daysOld, shelfMax, risk }) {
  const pct = shelfMax>0 ? Math.min(100, Math.round((daysOld/shelfMax)*100)) : 0
  const clr = RISK[risk]?.color || "#16a34a"
  return (
    <div style={{marginTop:8}}>
      <div style={{display:"flex", justifyContent:"space-between", fontSize:11,
        color:"var(--ink-faint,#888)", marginBottom:4}}>
        <span>Day {daysOld}</span>
        <span style={{fontWeight:600, color:clr}}>{pct}% used</span>
        <span>Day {shelfMax}</span>
      </div>
      <div style={{height:8, borderRadius:6, background:"#e5e7eb", overflow:"hidden"}}>
        <div style={{width:`${pct}%`, height:"100%", borderRadius:6, transition:"width 0.6s",
          background: pct>85 ? "linear-gradient(90deg,#f87171,#dc2626)"
                    : pct>60 ? "linear-gradient(90deg,#fb923c,#ea580c)"
                    : "linear-gradient(90deg,#4ade80,#16a34a)"}} />
      </div>
    </div>
  )
}

function ProductCard({ p, lang, nativeVoices, onSpeak }) {
  const r = RISK[p.risk_level] || RISK.safe
  const hasNative = nativeVoices[lang]
  const valRisk = p.risk_level!=="safe"
    ? Math.round(parseFloat(p.cost_price||0)*parseFloat(p.stock||0)) : null
  return (
    <div style={{
      background:r.bg, border:`1.5px solid ${r.border}`, borderRadius:14,
      padding:"14px 16px", display:"flex", flexDirection:"column", gap:6,
      boxShadow:p.risk_level==="likely_expired"?`0 0 0 2px ${r.color}33`:"0 1px 4px rgba(0,0,0,0.06)",
    }}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8}}>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontWeight:700, fontSize:14, overflow:"hidden",
            textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={p.name}>{p.name}</div>
          <div style={{fontSize:12, color:"var(--ink-dim,#555)", marginTop:3}}>
            {[p.category, `${p.stock} ${p.unit||"pc"}`, p.cost_price>0&&`₹${p.cost_price}`]
              .filter(Boolean).join(" · ")}
          </div>
        </div>
        <div style={{display:"flex", gap:6, alignItems:"center", flexShrink:0}}>
          <span style={{fontSize:11, fontWeight:700, color:r.color,
            background:"rgba(255,255,255,0.85)", border:`1.5px solid ${r.border}`,
            borderRadius:20, padding:"3px 10px", whiteSpace:"nowrap"}}>
            {r.icon} {r.label}
          </span>
          <button onClick={()=>onSpeak(p)}
            title={hasNative ? "Voice alert (device)" : "Voice alert (internet cloud)"}
            style={{
              background:"rgba(255,255,255,0.85)", border:`1.5px solid ${r.border}`,
              borderRadius:"50%", width:32, height:32, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:15,
            }}>
            {hasNative ? "🔊" : "☁️"}
          </button>
        </div>
      </div>
      <ExpiryBar daysOld={p.days_in_stock} shelfMax={p.shelf_max_days} risk={p.risk_level} />
      <div style={{display:"flex", flexWrap:"wrap", gap:10, fontSize:12}}>
        <span style={{color:"var(--ink-dim)"}}>In stock: <b>{p.days_in_stock}d</b></span>
        <span style={{color:"var(--ink-dim)"}}>Shelf: <b>{p.shelf_min_days}–{p.shelf_max_days}d</b></span>
        {p.risk_level!=="likely_expired"
          ? <span style={{color:r.color, fontWeight:700}}>{p.days_remaining}d left</span>
          : <span style={{color:r.color, fontWeight:700}}>⚠ Check shelf!</span>}
        {valRisk>0 && (
          <span style={{marginLeft:"auto", color:r.color, fontSize:11, fontWeight:600}}>
            ₹{valRisk.toLocaleString("en-IN")} at risk
          </span>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color, sub, icon }) {
  return (
    <div style={{background:"var(--bg1,#fff)", border:"1px solid var(--rule,#eee)",
      borderRadius:14, padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
      display:"flex", alignItems:"center", gap:14}}>
      {icon && <div style={{fontSize:24, flexShrink:0, width:44, height:44,
        display:"flex", alignItems:"center", justifyContent:"center",
        background:`${color||"#888"}18`, borderRadius:12}}>{icon}</div>}
      <div>
        <div style={{fontSize:26, fontWeight:800, color:color||"var(--ink)", lineHeight:1.1}}>{value}</div>
        <div style={{fontSize:12, color:"var(--ink-dim)", marginTop:3, fontWeight:500}}>{label}</div>
        {sub && <div style={{fontSize:11, color:"var(--ink-faint)", marginTop:1}}>{sub}</div>}
      </div>
    </div>
  )
}

function SectionHeader({ risk, count }) {
  const r = RISK[risk]
  if (!count) return null
  return (
    <div style={{display:"flex", alignItems:"center", gap:10, margin:"24px 0 10px"}}>
      <span style={{fontSize:18}}>{r.icon}</span>
      <span style={{fontWeight:800, fontSize:16, color:r.color}}>{r.label}</span>
      <span style={{fontWeight:700, fontSize:12, color:"white", background:r.color,
        borderRadius:20, padding:"2px 10px"}}>{count}</span>
      <div style={{flex:1, height:1, background:`${r.color}30`, marginLeft:4}} />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function ExpiryIntelligence() {
  const [lang, setLang]           = useState(getSavedLang)
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [search, setSearch]       = useState("")
  const [tab, setTab]             = useState("all")
  const [speaking, setSpeaking]   = useState(false)
  // nativeVoices: { "te-IN": true/false, ... } — which langs have offline device voices
  const [nativeVoices, setNativeVoices] = useState({})
  const [textFallback, setTextFallback] = useState(null) // product to show as text
  const speakTimerRef = useRef(null)

  // ── Detect native (offline) voice availability ─────────────────
  // Note: on Android, Google TTS is built-in so Telugu shows as "native".
  // On Windows PC it's false → falls back to cloud (Google Translate TTS).
  useEffect(() => {
    function buildMap() {
      const map = {}
      Object.keys(LANGS).forEach(code => { map[code] = hasNativeVoice(code) })
      setNativeVoices(map)
    }
    buildMap()
    window.speechSynthesis?.addEventListener("voiceschanged", buildMap)
    // Some browsers are slow to populate voices
    const t = setTimeout(buildMap, 600)
    return () => {
      window.speechSynthesis?.removeEventListener("voiceschanged", buildMap)
      clearTimeout(t)
    }
  }, [])

  // ── Sync language with global app setting ─────────────────────
  useEffect(() => {
    const onStorage = e => { if (e.key===LANG_KEY && e.newValue) setLang(e.newValue) }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  function changeLang(code) {
    setLang(code)
    try { localStorage.setItem(LANG_KEY, code) } catch {}
  }

  // ── Fetch expiry data ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      // api.get() automatically attaches the auth token and handles token refresh
      setData(await api.get("/expiry/dashboard"))
    } catch {
      try {
        const prods = (await api.get("/products?is_active=true"))
          .filter(p => parseFloat(p.stock||0)>0)
        const enriched = prods.map(enrichProduct)
        const groups  = {likely_expired:[],high_risk:[],attention:[],safe:[]}
        for (const p of enriched) groups[p.risk_level].push(p)
        const atRisk  = enriched.filter(p=>["likely_expired","high_risk"].includes(p.risk_level))
        const val     = atRisk.reduce((s,p)=>s+parseFloat(p.cost_price||0)*parseFloat(p.stock||0),0)
        setData({summary:{total_products:enriched.length,
          likely_expired:groups.likely_expired.length, high_risk:groups.high_risk.length,
          attention:groups.attention.length, safe:groups.safe.length,
          value_at_risk:Math.round(val*100)/100}, groups})
      } catch { setError("Could not load expiry data. Check your connection.") }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Speak a single product ─────────────────────────────────────
  async function handleSpeak(p) {
    const text   = (SCRIPTS[lang]||SCRIPTS["en-IN"])(p.name, p.risk_level, p.days_remaining)
    const result = await smartSpeak(text, lang)
    if (!result.ok) {
      // Both native AND cloud failed → show text (likely offline with no device voice)
      setTextFallback(p)
      return
    }
    setSpeaking(true)
    clearTimeout(speakTimerRef.current)
    speakTimerRef.current = setTimeout(()=>setSpeaking(false), 5000)
  }

  // ── Speak all alerts ───────────────────────────────────────────
  async function speakAllAlerts() {
    if (!data) return
    const urgent = [...data.groups.likely_expired, ...data.groups.high_risk, ...data.groups.attention]
    const intro  = getSummaryIntro(lang, urgent.length)
    const items  = urgent.slice(0,5).map(p =>
      (SCRIPTS[lang]||SCRIPTS["en-IN"])(p.name, p.risk_level, p.days_remaining))
    const fullText = [intro, ...items].join(" ")
    const result   = await smartSpeak(fullText, lang)
    if (!result.ok && urgent.length>0) {
      setTextFallback(urgent[0])
      return
    }
    setSpeaking(true)
    clearTimeout(speakTimerRef.current)
    speakTimerRef.current = setTimeout(()=>setSpeaking(false), (items.length+1)*4000)
  }

  async function readInEnglish(p) {
    setTextFallback(null)
    const target = p || (data && data.groups.likely_expired[0])
    if (!target) return
    const text = SCRIPTS["en-IN"](target.name, target.risk_level, target.days_remaining)
    await smartSpeak(text, "en-IN")
    setSpeaking(true)
    clearTimeout(speakTimerRef.current)
    speakTimerRef.current = setTimeout(()=>setSpeaking(false), 4000)
  }

  // ── Display lists ──────────────────────────────────────────────
  const allProducts = data
    ? [...data.groups.likely_expired, ...data.groups.high_risk,
       ...data.groups.attention, ...data.groups.safe]
    : []
  const tabProducts =
    tab==="expired"   ? (data?.groups.likely_expired||[]) :
    tab==="high_risk" ? (data?.groups.high_risk||[]) :
    tab==="attention" ? (data?.groups.attention||[]) :
    tab==="safe"      ? (data?.groups.safe||[]) : allProducts
  const filtered = search
    ? tabProducts.filter(p=>
        p.name?.toLowerCase().includes(search.toLowerCase())||
        p.category?.toLowerCase().includes(search.toLowerCase()))
    : tabProducts

  const s           = data?.summary
  const urgentCount = s ? s.likely_expired+s.high_risk : 0
  const currentHasNative = nativeVoices[lang]

  return (
    <div style={{flex:1, overflowY:"auto", overflowX:"hidden",
      background:"var(--bg0)", display:"flex", flexDirection:"column"}}>

      {/* Text fallback modal */}
      {textFallback && (
        <TextAlertCard
          product={textFallback}
          lang={lang}
          onClose={()=>setTextFallback(null)}
          onReadEnglish={()=>readInEnglish(textFallback)}
        />
      )}

      {/* ── Sticky header ──────────────────────────────────── */}
      <div style={{
        position:"sticky", top:0, zIndex:20,
        background:"var(--bg1,#fff)", borderBottom:"1px solid var(--rule,#eee)",
        padding:"14px 24px", display:"flex", alignItems:"center",
        justifyContent:"space-between", gap:12, flexWrap:"wrap",
        boxShadow:"0 2px 12px rgba(0,0,0,0.06)",
      }}>
        <div>
          <h1 style={{margin:0, fontSize:20, fontWeight:800, color:"var(--ink)"}}>
            🕐 Expiry Intelligence
          </h1>
          <p style={{margin:"3px 0 0", fontSize:12, color:"var(--ink-faint)"}}>
            AI shelf-life tracking · {allProducts.length} products
            {urgentCount>0 && <span style={{marginLeft:8, color:"#dc2626", fontWeight:700}}>· {urgentCount} urgent</span>}
          </p>
        </div>

        <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
          {/* Language selector */}
          <div style={{position:"relative"}}>
            <select value={lang} onChange={e=>changeLang(e.target.value)}
              style={{fontSize:13, padding:"7px 34px 7px 12px", borderRadius:9,
                border:"1.5px solid var(--rule,#eee)", background:"var(--bg0,#f9fafb)",
                color:"var(--ink)", cursor:"pointer", fontWeight:600, outline:"none",
                appearance:"none", WebkitAppearance:"none"}}>
              {Object.entries(LANGS).map(([code,info]) => (
                <option key={code} value={code}>{info.native}</option>
              ))}
            </select>
            {/* Engine indicator dot */}
            <span style={{
              position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
              width:8, height:8, borderRadius:"50%", pointerEvents:"none",
              background: nativeVoices[lang]===true  ? "#16a34a"  // green = offline
                        : nativeVoices[lang]===false ? "#2563eb"  // blue = cloud
                        : "#9ca3af",                               // grey = checking
            }} title={nativeVoices[lang]===true?"Device voice (offline)":nativeVoices[lang]===false?"Cloud voice (internet)":"Checking…"} />
          </div>

          {/* Engine label chip */}
          <span style={{
            fontSize:11, padding:"4px 10px", borderRadius:20, fontWeight:700,
            background: nativeVoices[lang]===true  ? "#f0fdf4"
                      : nativeVoices[lang]===false ? "#eff6ff"
                      : "var(--bg2)",
            color: nativeVoices[lang]===true  ? "#16a34a"
                 : nativeVoices[lang]===false ? "#2563eb"
                 : "#9ca3af",
            border: `1.5px solid ${nativeVoices[lang]===true?"#86efac":nativeVoices[lang]===false?"#93c5fd":"#e5e7eb"}`,
          }}>
            {nativeVoices[lang]===true  ? "✅ Device voice" :
             nativeVoices[lang]===false ? "☁️ Cloud voice"  : "Checking…"}
          </span>

          {/* Voice Alert button */}
          <button onClick={speakAllAlerts} disabled={!data||loading}
            style={{
              display:"flex", alignItems:"center", gap:7, padding:"8px 16px",
              borderRadius:9, border:"none", fontSize:13, fontWeight:700,
              cursor:!data||loading?"not-allowed":"pointer",
              background: speaking ? "linear-gradient(135deg,#16a34a,#15803d)"
                : "linear-gradient(135deg,#e87722,#d45f00)",
              color:"white", opacity:!data||loading?0.5:1, transition:"all 0.2s",
            }}>
            <span style={{fontSize:16}}>{speaking?"🔊":"🔔"}</span>
            {speaking ? "Speaking…" : `Voice Alert`}
          </button>

          <button onClick={fetchData} disabled={loading}
            style={{padding:"8px 14px", borderRadius:9, fontSize:13, fontWeight:600,
              border:"1px solid var(--rule,#eee)", background:"var(--bg1,white)",
              color:"var(--ink)", cursor:loading?"not-allowed":"pointer", opacity:loading?0.5:1,
              display:"flex", alignItems:"center", gap:6}}>
            <span style={{display:"inline-block",
              animation:loading?"expirySpin 0.8s linear infinite":"none"}}>↻</span>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Voice engine info bar ─────────────────────────────── */}
      {Object.keys(nativeVoices).length>0 && (
        <div style={{
          margin:"12px 24px 0", padding:"10px 16px",
          background:"var(--bg2,#f9fafb)", border:"1px solid var(--rule,#eee)",
          borderRadius:10, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap",
        }}>
          <span style={{fontSize:12, fontWeight:700, color:"var(--ink-faint)", flexShrink:0}}>
            🔊 Voice engine per language:
          </span>
          {Object.entries(LANGS).map(([code,info]) => (
            <span key={code} style={{
              display:"inline-flex", alignItems:"center", gap:4,
              fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:600,
              background: code===lang ? (nativeVoices[code]?"#f0fdf4":"#eff6ff") : "var(--bg1,white)",
              color: nativeVoices[code]===true?"#16a34a":nativeVoices[code]===false?"#2563eb":"#9ca3af",
              border:`1.5px solid ${code===lang?(nativeVoices[code]?"#86efac":"#93c5fd"):"var(--rule,#eee)"}`,
            }}>
              {nativeVoices[code]===true?"✅":nativeVoices[code]===false?"☁️":"⏳"}
              {info.native}
            </span>
          ))}
          <span style={{fontSize:11, color:"var(--ink-faint)", marginLeft:"auto"}}>
            ✅ Device · ☁️ Cloud (internet) · ⏳ Checking
          </span>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div style={{margin:"12px 24px 0", padding:"12px 18px",
          background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:10,
          color:"#dc2626", fontSize:13, display:"flex", gap:10, alignItems:"center"}}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── Urgent banner ─────────────────────────────────────── */}
      {s && urgentCount>0 && (
        <div style={{margin:"12px 24px 0", padding:"14px 20px",
          background:"linear-gradient(135deg,#fff7ed,#fef2f2)",
          border:"1.5px solid #fca5a5", borderRadius:14,
          display:"flex", alignItems:"center", gap:14, flexWrap:"wrap"}}>
          <span style={{fontSize:32, flexShrink:0}}>⚠️</span>
          <div style={{flex:1, minWidth:200}}>
            <div style={{fontWeight:800, color:"#dc2626", fontSize:15}}>
              {urgentCount} product{urgentCount!==1?"s":""} need urgent attention
            </div>
            <div style={{fontSize:12, color:"#92400e", marginTop:4}}>
              Consider selling at discount or returning to supplier to minimise waste.
            </div>
          </div>
          <button onClick={speakAllAlerts}
            style={{background:"#dc2626", color:"white", border:"none",
              borderRadius:9, padding:"8px 16px", cursor:"pointer",
              fontSize:13, fontWeight:700, flexShrink:0,
              display:"flex", alignItems:"center", gap:6}}>
            🔊 Alert Me
          </button>
        </div>
      )}

      {/* ── Summary stats ─────────────────────────────────────── */}
      {s && (
        <div style={{padding:"16px 24px",
          display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(155px, 1fr))", gap:12}}>
          <StatCard icon="📦" label="Total Products" value={s.total_products} />
          <StatCard icon="⛔" label="Likely Expired"  value={s.likely_expired} color="#dc2626"
            sub={s.likely_expired>0?"Check immediately":"None"} />
          <StatCard icon="🔴" label="High Risk"  value={s.high_risk}  color="#ea580c"
            sub={s.high_risk>0?"Act soon":"All clear"} />
          <StatCard icon="🟡" label="Needs Attention" value={s.attention} color="#d97706" />
          <StatCard icon="🟢" label="Safe" value={s.safe} color="#16a34a" />
          {s.value_at_risk>0 && (
            <StatCard icon="💸" label="Value at Risk"
              value={`₹${Number(s.value_at_risk).toLocaleString("en-IN")}`}
              color="#dc2626" sub="Expired + High Risk" />
          )}
        </div>
      )}

      {loading && !data && (
        <div style={{padding:"0 24px 16px",
          display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(155px, 1fr))", gap:12}}>
          {[1,2,3,4,5].map(i=>(
            <div key={i} style={{height:90, borderRadius:14,
              background:"var(--bg2,#f3f4f6)", animation:"expiryPulse 1.5s ease infinite"}} />
          ))}
        </div>
      )}

      {/* ── Tabs + Search ─────────────────────────────────────── */}
      {data && (
        <div style={{padding:"0 24px 14px",
          display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
          {[
            {key:"all",       label:"All",       count:allProducts.length},
            {key:"expired",   label:"Expired",   count:s?.likely_expired||0, color:"#dc2626"},
            {key:"high_risk", label:"High Risk", count:s?.high_risk||0,      color:"#ea580c"},
            {key:"attention", label:"Attention", count:s?.attention||0,      color:"#d97706"},
            {key:"safe",      label:"Safe",      count:s?.safe||0,           color:"#16a34a"},
          ].map(t => (
            <button key={t.key} onClick={()=>setTab(t.key)}
              style={{padding:"7px 16px", borderRadius:20, fontSize:13, fontWeight:600,
                cursor:"pointer", transition:"all 0.15s",
                border:tab===t.key?"none":"1.5px solid var(--rule,#eee)",
                background:tab===t.key?(t.color||"#e87722"):"var(--bg1,white)",
                color:tab===t.key?"white":(t.color||"var(--ink-dim)"),
                boxShadow:tab===t.key?`0 2px 8px ${(t.color||"#e87722")}44`:"none"}}>
              {t.label}
              <span style={{marginLeft:6, fontSize:11,
                background:tab===t.key?"rgba(255,255,255,0.3)":"var(--bg2,#f3f4f6)",
                padding:"1px 7px", borderRadius:10}}>{t.count}</span>
            </button>
          ))}
          <div style={{flex:1, minWidth:180, maxWidth:320, position:"relative", marginLeft:"auto"}}>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search products…"
              style={{width:"100%", padding:"8px 32px 8px 14px", borderRadius:9, boxSizing:"border-box",
                border:"1.5px solid var(--rule,#eee)", background:"var(--bg1,white)",
                color:"var(--ink)", fontSize:13, outline:"none"}}
              onFocus={e=>{e.target.style.borderColor="#e87722"}}
              onBlur={e=>{e.target.style.borderColor="var(--rule,#eee)"}} />
            {search
              ? <button onClick={()=>setSearch("")}
                  style={{position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", color:"#9ca3af",
                    fontSize:16, lineHeight:1, padding:0}}>✕</button>
              : <span style={{position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                  color:"var(--ink-faint,#aaa)", pointerEvents:"none"}}>🔍</span>}
          </div>
        </div>
      )}

      {/* ── Product grid ─────────────────────────────────────── */}
      <div style={{padding:"0 24px 32px", flex:1}}>
        {data && tab==="all" && !search && (
          ["likely_expired","high_risk","attention","safe"].map(risk=>{
            const prods = data.groups[risk]
            if (!prods?.length) return null
            return (
              <div key={risk}>
                <SectionHeader risk={risk} count={prods.length} />
                <div style={{display:"grid",
                  gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))", gap:12}}>
                  {prods.map(p=>(
                    <ProductCard key={p.id} p={p} lang={lang}
                      nativeVoices={nativeVoices} onSpeak={handleSpeak} />
                  ))}
                </div>
              </div>
            )
          })
        )}
        {data && (tab!=="all"||search) && (
          filtered.length===0
            ? <div style={{textAlign:"center", padding:"60px 20px"}}>
                <div style={{fontSize:48, marginBottom:12}}>🔍</div>
                <div style={{fontSize:16, fontWeight:700}}>No products found</div>
                <div style={{fontSize:13, color:"var(--ink-faint)", marginTop:6}}>
                  {search?`Nothing matching "${search}"`:"This filter is empty."}
                </div>
              </div>
            : <div style={{display:"grid",
                gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))", gap:12, marginTop:4}}>
                {filtered.map(p=>(
                  <ProductCard key={p.id} p={p} lang={lang}
                    nativeVoices={nativeVoices} onSpeak={handleSpeak} />
                ))}
              </div>
        )}
        {data && allProducts.length===0 && (
          <div style={{textAlign:"center", padding:"80px 20px"}}>
            <div style={{fontSize:56, marginBottom:16}}>📦</div>
            <div style={{fontSize:18, fontWeight:800}}>No products in stock</div>
            <div style={{fontSize:13, color:"var(--ink-faint)", marginTop:8}}>
              Add products to your inventory to start tracking expiry.
            </div>
          </div>
        )}
      </div>

      {/* ── How voice works ───────────────────────────────────── */}
      {data && (
        <div style={{margin:"0 24px 32px", padding:"20px 24px",
          borderRadius:16, background:"var(--bg2,#f9fafb)", border:"1px solid var(--rule,#eee)"}}>
          <div style={{fontWeight:700, fontSize:14, marginBottom:14, display:"flex", gap:8}}>
            💡 How voice works in DukaanAI
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:16}}>
            {[
              {icon:"📱", title:"Android Phones (Recommended)",
                desc:"Google TTS is built-in on Android. Telugu, Tamil, Kannada — all work automatically without any setup."},
              {icon:"☁️", title:"Windows/Desktop",
                desc:"Uses Google cloud TTS as fallback. Speaks Telugu/Tamil perfectly via internet — no installation needed."},
              {icon:"✅", title:"English & Hindi",
                desc:"Always available offline on any device — these work even without internet."},
              {icon:"📵", title:"When Offline",
                desc:"Alert text is shown in native script (Telugu/Tamil/etc.) so you can read it even without voice."},
            ].map(item=>(
              <div key={item.title} style={{display:"flex", gap:12, alignItems:"flex-start"}}>
                <span style={{fontSize:22, flexShrink:0, width:42, height:42,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:"var(--bg1,white)", borderRadius:10,
                  boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>{item.icon}</span>
                <div>
                  <div style={{fontWeight:700, fontSize:13}}>{item.title}</div>
                  <div style={{fontSize:12, color:"var(--ink-dim)", marginTop:3, lineHeight:1.5}}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes expiryPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes expirySpin  { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
