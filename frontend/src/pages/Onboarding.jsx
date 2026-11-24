/**
 * First-run onboarding — shown once when a new user opens the app.
 * 2 steps: language → shop type (kirana / chai), then the sign-in / sign-up
 * page for that shop (/kirana or /chai), with the store type already chosen.
 * The store name is asked only once, on the sign-up form.
 * Sets dk_voice_lang (unified language key), dk_home_shop and dk_onboarding_done.
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { shopEnabled } from "../utils/features"

const DONE_KEY = "dk_onboarding_done"
const LANG_KEY = "dk_voice_lang"   // same key used by voice agent

const SHOPS = [
  { id: "kirana", emoji: "🏪", name: "Kirana Store", sub: "Grocery & general store" },
  { id: "chai",   emoji: "☕", name: "Chai / Tea Shop", sub: "Tea stall, café & snacks" },
  { id: "bangle", emoji: "💍", name: "Bangle Store", sub: "Bangles, jewellery & fancy" },
].filter(s => shopEnabled(s.id))

const LANGUAGES = [
  { code: "te-IN", label: "తెలుగు",   name: "Telugu",    flag: "🏳️" },
  { code: "hi-IN", label: "हिंदी",     name: "Hindi",     flag: "🏳️" },
  { code: "ta-IN", label: "தமிழ்",    name: "Tamil",     flag: "🏳️" },
  { code: "kn-IN", label: "ಕನ್ನಡ",    name: "Kannada",   flag: "🏳️" },
  { code: "ml-IN", label: "മലയാളം",  name: "Malayalam", flag: "🏳️" },
  { code: "mr-IN", label: "मराठी",    name: "Marathi",   flag: "🏳️" },
  { code: "bn-IN", label: "বাংলা",    name: "Bengali",   flag: "🏳️" },
  { code: "gu-IN", label: "ગુજરાતી", name: "Gujarati",  flag: "🏳️" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ",  name: "Punjabi",   flag: "🏳️" },
  { code: "en-IN", label: "English",  name: "English",   flag: "🏳️" },
]

// Best-effort match from the device/browser locale to one of our
// supported onboarding languages, so the picker doesn't always land
// on an arbitrary default regardless of the user's actual phone language.
function detectDefaultLang() {
  try {
    const raw = (navigator.language || navigator.languages?.[0] || "").toLowerCase()
    const prefix = raw.split("-")[0]
    const match = LANGUAGES.find(l => l.code.toLowerCase().startsWith(prefix))
    return match ? match.code : "hi-IN"
  } catch { return "hi-IN" }
}

// Greeting text per language for the welcome line
const GREET = {
  "te-IN": "నమస్కారం! మీ దుకాణానికి స్వాగతం",
  "hi-IN": "नमस्ते! आपकी दुकान में आपका स्वागत है",
  "ta-IN": "வணக்கம்! உங்கள் கடைக்கு வரவேற்கிறோம்",
  "kn-IN": "ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಅಂಗಡಿಗೆ ಸ್ವಾಗತ",
  "ml-IN": "നമസ്കാരം! നിങ്ങളുടെ കടയിലേക്ക് സ്വാഗതം",
  "mr-IN": "नमस्कार! आपल्या दुकानात स्वागत आहे",
  "bn-IN": "নমস্কার! আপনার দোকানে স্বাগতম",
  "gu-IN": "નમસ્તે! તમારી દુકાનમાં તમારું સ્વાગત છે",
  "pa-IN": "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਤੁਹਾਡੀ ਦੁਕਾਨ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ",
  "en-IN": "Welcome to your store!",
}

const STEP_LABELS = {
  next:    { "te-IN": "తదుపరి", "hi-IN": "अगला", "ta-IN": "அடுத்து", "kn-IN": "ಮುಂದೆ", "ml-IN": "അടുത്തത്", "mr-IN": "पुढे", "bn-IN": "পরবর্তী", "gu-IN": "આગળ", "pa-IN": "ਅੱਗੇ", "en-IN": "Next" },
  enter:   { "te-IN": "దుకాణం తెరవండి →", "hi-IN": "दुकान खोलें →", "ta-IN": "கடை திறக்கவும் →", "kn-IN": "ಅಂಗಡಿ ತೆರೆಯಿರಿ →", "ml-IN": "കട തുറക്കുക →", "mr-IN": "दुकान उघडा →", "bn-IN": "দোকান খুলুন →", "gu-IN": "દુકાન ખોલો →", "pa-IN": "ਦੁਕਾਨ ਖੋਲ੍ਹੋ →", "en-IN": "Enter your store →" },
  skip:    { "te-IN": "దాటవేయి", "hi-IN": "छोड़ें", "ta-IN": "தவிர்", "kn-IN": "ಬಿಟ್ಟುಬಿಡಿ", "ml-IN": "ഒഴിവാക്കുക", "mr-IN": "वगळा", "bn-IN": "এড়িয়ে যান", "gu-IN": "છોડો", "pa-IN": "ਛੱਡੋ", "en-IN": "Skip" },
  shopQ:   { "te-IN": "మీది ఏ దుకాణం?", "hi-IN": "आपकी कौन सी दुकान है?", "ta-IN": "உங்களுடையது எந்த கடை?", "kn-IN": "ನಿಮ್ಮದು ಯಾವ ಅಂಗಡಿ?", "ml-IN": "നിങ്ങളുടേത് ഏത് കടയാണ്?", "mr-IN": "तुमचे कोणते दुकान आहे?", "bn-IN": "আপনার কোন দোকান?", "gu-IN": "તમારી કઈ દુકાન છે?", "pa-IN": "ਤੁਹਾਡੀ ਕਿਹੜੀ ਦੁਕਾਨ ਹੈ?", "en-IN": "What shop do you run?" },
  kirana:  { "te-IN": "కిరాణా స్టోర్", "hi-IN": "किराना स्टोर", "ta-IN": "மளிகைக் கடை", "kn-IN": "ಕಿರಾಣಿ ಅಂಗಡಿ", "ml-IN": "പലചരക്ക് കട", "mr-IN": "किराणा दुकान", "bn-IN": "মুদির দোকান", "gu-IN": "કરિયાણાની દુકાન", "pa-IN": "ਕਰਿਆਨਾ ਸਟੋਰ", "en-IN": "Kirana Store" },
  chai:    { "te-IN": "టీ కొట్టు / చాయ్ షాప్", "hi-IN": "चाय की दुकान", "ta-IN": "டீ கடை", "kn-IN": "ಟೀ ಅಂಗಡಿ", "ml-IN": "ചായക്കട", "mr-IN": "चहाची टपरी", "bn-IN": "চায়ের দোকান", "gu-IN": "ચાની દુકાન", "pa-IN": "ਚਾਹ ਦੀ ਦੁਕਾਨ", "en-IN": "Chai / Tea Shop" },
  bangle:  { "en-IN": "Bangle Store" },
  storePh: { "te-IN": "ఉదా: రాజు కిరాణా స్టోర్", "hi-IN": "जैसे: राजू किराना स्टोर", "ta-IN": "எ.கா: ராஜு கிரானா ஸ்டோர்", "kn-IN": "ಉದಾ: ರಾಜು ಕಿರಾಣ ಸ್ಟೋರ್", "ml-IN": "ഉദാ: രാജു കിരാണ സ്റ്റോർ", "mr-IN": "उदा: राजू किराणा स्टोर", "bn-IN": "যেমন: রাজু কিরানা স্টোর", "gu-IN": "દા.ત.: રાજુ કરિયાણા સ્ટોર", "pa-IN": "ਜਿਵੇਂ: ਰਾਜੂ ਕਿਰਾਣਾ ਸਟੋਰ", "en-IN": "e.g. Raju Kirana Store" },
}

function lbl(key, lang) {
  return (STEP_LABELS[key]?.[lang]) ?? (STEP_LABELS[key]?.["en-IN"]) ?? ""
}

export default function Onboarding() {
  const navigate    = useNavigate()
  const [step,      setStep]      = useState(1)
  const [lang,      setLang]      = useState(detectDefaultLang)
  // Onboarding runs before login/signup (see FirstRunGuard in App.jsx).
  // /kirana or /chai opens LoginHome with that shop type picked for sign-up
  // (or goes straight to the dashboard for anyone already signed in).
  function finish(shop) {
    try {
      localStorage.setItem(LANG_KEY, lang)
      localStorage.setItem(DONE_KEY, "1")
      localStorage.setItem("dk_home_shop", shop)
    } catch {}
    navigate("/" + shop, { replace: true })
  }

  function skip() {
    try { localStorage.setItem(DONE_KEY, "1") } catch {}
    navigate("/")
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
            aria-label={`${l.name} (${l.label})`}
            aria-pressed={lang === l.code}
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

  // ── Step 2: Which shop? → straight to sign in / sign up for that shop ──
  return (
    <div style={{ minHeight: "100dvh", background: "#0f0f0f",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "32px 24px" }}>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff",
        textAlign: "center", marginBottom: 8, lineHeight: 1.3 }}>
        {lbl("shopQ", lang)}
      </h1>
      <p style={{ fontSize: 13, color: "#888", textAlign: "center", marginBottom: 28 }}>
        What shop do you run?
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 380, marginBottom: 24 }}>
        {SHOPS.map(s => (
          <button key={s.id} onClick={() => finish(s.id)}
            aria-label={s.name}
            style={{ display: "flex", alignItems: "center", gap: 16, textAlign: "left",
              padding: "18px 18px", borderRadius: 16, cursor: "pointer",
              border: "2px solid #2a2a2a", background: "#1a1a1a" }}>
            <span style={{ fontSize: 40, lineHeight: 1 }}>{s.emoji}</span>
            <span>
              <span style={{ display: "block", fontSize: 18, fontWeight: 800, color: "#fff" }}>
                {lbl(s.id, lang)}
              </span>
              <span style={{ display: "block", fontSize: 12, color: "#888", marginTop: 3 }}>{s.sub}</span>
            </span>
            <span style={{ marginLeft: "auto", color: "#e87722", fontSize: 22, fontWeight: 800 }}>→</span>
          </button>
        ))}
      </div>

      <button onClick={() => setStep(1)}
        style={{ background: "none", border: "none", color: "#555", fontSize: 12, cursor: "pointer" }}>
        ← Back
      </button>
    </div>
  )
}
