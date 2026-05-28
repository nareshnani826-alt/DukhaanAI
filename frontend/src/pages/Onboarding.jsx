/**
 * First-run onboarding — shown once when a new user opens the app.
 * 3 steps: language → store name → ready.
 * Sets dk_voice_lang (unified language key) and dk_onboarding_done.
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"

const DONE_KEY = "dk_onboarding_done"
const LANG_KEY = "dk_voice_lang"   // same key used by voice agent

const LANGUAGES = [
  { code: "te-IN", label: "తెలుగు",  name: "Telugu",    flag: "🏳️" },
  { code: "hi-IN", label: "हिंदी",    name: "Hindi",     flag: "🏳️" },
  { code: "ta-IN", label: "தமிழ்",   name: "Tamil",     flag: "🏳️" },
  { code: "kn-IN", label: "ಕನ್ನಡ",   name: "Kannada",   flag: "🏳️" },
  { code: "ml-IN", label: "മലയാളം", name: "Malayalam", flag: "🏳️" },
  { code: "mr-IN", label: "मराठी",   name: "Marathi",   flag: "🏳️" },
  { code: "bn-IN", label: "বাংলা",   name: "Bengali",   flag: "🏳️" },
  { code: "en-IN", label: "English", name: "English",   flag: "🏳️" },
]

// Greeting text per language for the welcome line
const GREET = {
  "te-IN": "నమస్కారం! మీ దుకాణానికి స్వాగతం",
  "hi-IN": "नमस्ते! आपकी दुकान में आपका स्वागत है",
  "ta-IN": "வணக்கம்! உங்கள் கடைக்கு வரவேற்கிறோம்",
  "kn-IN": "ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಅಂಗಡಿಗೆ ಸ್ವಾಗತ",
  "ml-IN": "നമസ്കാരം! നിങ്ങളുടെ കടയിലേക്ക് സ്വാഗതം",
  "mr-IN": "नमस्कार! आपल्या दुकानात स्वागत आहे",
  "bn-IN": "নমস্কার! আপনার দোকানে স্বাগতম",
  "en-IN": "Welcome to your store!",
}

const STEP_LABELS = {
  next:    { "te-IN": "తదుపరి", "hi-IN": "अगला", "ta-IN": "அடுத்து", "kn-IN": "ಮುಂದೆ", "ml-IN": "അടുത്തത്", "mr-IN": "पुढे", "bn-IN": "পরবর্তী", "en-IN": "Next" },
  enter:   { "te-IN": "దుకాణం తెరవండి →", "hi-IN": "दुकान खोलें →", "ta-IN": "கடை திறக்கவும் →", "kn-IN": "ಅಂಗಡಿ ತೆರೆಯಿರಿ →", "ml-IN": "കട തുറക്കുക →", "mr-IN": "दुकान उघडा →", "bn-IN": "দোকান খুলুন →", "en-IN": "Enter your store →" },
  skip:    { "te-IN": "దాటవేయి", "hi-IN": "छोड़ें", "ta-IN": "தவிர்", "kn-IN": "ಬಿಟ್ಟುಬಿಡಿ", "ml-IN": "ഒഴിവാക്കുക", "mr-IN": "वगळा", "bn-IN": "এড়িয়ে যান", "en-IN": "Skip" },
  storePh: { "te-IN": "ఉదా: రాజు కిరాణా స్టోర్", "hi-IN": "जैसे: राजू किराना स्टोर", "ta-IN": "எ.கா: ராஜு கிரானா ஸ்டோர்", "kn-IN": "ಉದಾ: ರಾಜು ಕಿರಾಣ ಸ್ಟೋರ್", "ml-IN": "ഉദാ: രാജു കിരാണ സ്റ്റോർ", "mr-IN": "उदा: राजू किराणा स्टोर", "bn-IN": "যেমন: রাজু কিরানা স্টোর", "en-IN": "e.g. Raju Kirana Store" },
}

function lbl(key, lang) {
  return (STEP_LABELS[key]?.[lang]) ?? (STEP_LABELS[key]?.["en-IN"]) ?? ""
}

export default function Onboarding() {
  const navigate    = useNavigate()
  const [step,      setStep]      = useState(1)
  const [lang,      setLang]      = useState("te-IN")
  const [storeName, setStoreName] = useState("")

  function finish() {
    try {
      localStorage.setItem(LANG_KEY, lang)
      localStorage.setItem(DONE_KEY, "1")
      if (storeName.trim()) localStorage.setItem("dk_store_name_hint", storeName.trim())
    } catch {}
    navigate("/dashboard")
  }

  function skip() {
    try { localStorage.setItem(DONE_KEY, "1") } catch {}
    navigate("/dashboard")
  }

  // ── Step 1: Language selection ───────────────────────────
  if (step === 1) return (
    <div style={{ minHeight: "100dvh", background: "#0f0f0f",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "32px 24px" }}>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: "linear-gradient(135deg,#e87722,#d45f00)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Tiro Devanagari Hindi',serif", fontWeight: 700, fontSize: 22, color: "#fff" }}>
          द
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>
            दुकान<span style={{ color: "#e87722" }}>•</span>AI
          </div>
          <div style={{ fontSize: 10, color: "#888", letterSpacing: "2px" }}>BILL BAN GAYA</div>
        </div>
      </div>

      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", textAlign: "center",
        marginBottom: 8, lineHeight: 1.2 }}>
        अपनी भाषा चुनिए
      </h1>
      <p style={{ fontSize: 13, color: "#888", textAlign: "center", marginBottom: 32 }}>
        Choose your language · మీ భాష ఎంచుకోండి
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
        width: "100%", maxWidth: 380, marginBottom: 32 }}>
        {LANGUAGES.map(l => (
          <button key={l.code}
            onClick={() => setLang(l.code)}
            style={{
              padding: "14px 12px", borderRadius: 14, cursor: "pointer",
              border: lang === l.code ? "2px solid #e87722" : "2px solid #2a2a2a",
              background: lang === l.code ? "rgba(232,119,34,0.12)" : "#1a1a1a",
              transition: "all 0.15s",
            }}>
            <div style={{ fontSize: 18, fontWeight: 800,
              color: lang === l.code ? "#e87722" : "#fff", marginBottom: 2 }}>
              {l.label}
            </div>
            <div style={{ fontSize: 11, color: "#888" }}>{l.name}</div>
          </button>
        ))}
      </div>

      <button onClick={() => setStep(2)}
        style={{ width: "100%", maxWidth: 380, padding: "15px", borderRadius: 14, border: "none",
          background: "linear-gradient(135deg,#e87722,#d45f00)",
          color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
        {lbl("next", lang)} →
      </button>

      <button onClick={skip}
        style={{ marginTop: 16, background: "none", border: "none",
          color: "#555", fontSize: 12, cursor: "pointer" }}>
        {lbl("skip", lang)}
      </button>
    </div>
  )

  // ── Step 2: Store name ───────────────────────────────────
  if (step === 2) return (
    <div style={{ minHeight: "100dvh", background: "#0f0f0f",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "32px 24px" }}>

      <div style={{ fontSize: 56, marginBottom: 20 }}>🏪</div>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff",
        textAlign: "center", marginBottom: 8 }}>
        {GREET[lang]}
      </h1>
      <p style={{ fontSize: 13, color: "#888", textAlign: "center", marginBottom: 32 }}>
        What's your store name?
      </p>

      <input
        value={storeName}
        onChange={e => setStoreName(e.target.value)}
        placeholder={lbl("storePh", lang)}
        autoFocus
        style={{ width: "100%", maxWidth: 380, padding: "16px", borderRadius: 14,
          border: "2px solid #333", background: "#1a1a1a", color: "#fff",
          fontSize: 15, fontWeight: 600, outline: "none", marginBottom: 20,
          boxSizing: "border-box" }}
        onKeyDown={e => e.key === "Enter" && setStep(3)}
      />

      <button onClick={() => setStep(3)}
        style={{ width: "100%", maxWidth: 380, padding: "15px", borderRadius: 14, border: "none",
          background: "linear-gradient(135deg,#e87722,#d45f00)",
          color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer",
          marginBottom: 12 }}>
        {lbl("next", lang)} →
      </button>
      <button onClick={() => setStep(1)}
        style={{ background: "none", border: "none", color: "#555", fontSize: 12, cursor: "pointer" }}>
        ← Back
      </button>
    </div>
  )

  // ── Step 3: You're all set ───────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", background: "#0f0f0f",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "32px 24px", textAlign: "center" }}>

      <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
        {storeName ? `${storeName} is ready!` : "Your store is ready!"}
      </h1>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 40, lineHeight: 1.6 }}>
        Start by adding products, then speak to bill customers instantly.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12,
        width: "100%", maxWidth: 380 }}>
        {[
          { icon: "📦", text: "Add your first product", sub: "Set MRP, stock, category" },
          { icon: "🎤", text: "Speak to generate a bill", sub: "\"Do litre doodh, ek bread\"" },
          { icon: "📊", text: "See today's profit", sub: "Open & close day to track earnings" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14,
            padding: "14px 16px", borderRadius: 14, background: "#1a1a1a",
            border: "1px solid #2a2a2a", textAlign: "left" }}>
            <div style={{ fontSize: 26, width: 40, textAlign: "center", flexShrink: 0 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{item.text}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={finish}
        style={{ marginTop: 32, width: "100%", maxWidth: 380, padding: "16px",
          borderRadius: 14, border: "none",
          background: "linear-gradient(135deg,#e87722,#d45f00)",
          color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
        {lbl("enter", lang)}
      </button>
    </div>
  )
}
