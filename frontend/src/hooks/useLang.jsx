import { useState, useEffect } from "react"
import { BANGLE } from "../i18n/bangleStrings"

// Unified language key — same as Layout.jsx / voice system
const LANG_KEY = "dk_voice_lang"

function storedLang() {
  try { return localStorage.getItem(LANG_KEY) || "en-IN" } catch { return "en-IN" }
}

export function useLang() {
  const [lang, setLangState] = useState(storedLang)

  useEffect(() => {
    const handler = () => {
      try { setLangState(localStorage.getItem(LANG_KEY) || "en-IN") } catch {}
    }
    // Layout.jsx fires both "storage" and "dk:voice-lang" on language change
    window.addEventListener("storage", handler)
    window.addEventListener("dk:voice-lang", handler)
    return () => {
      window.removeEventListener("storage", handler)
      window.removeEventListener("dk:voice-lang", handler)
    }
  }, [])

  /** Translate a key. Returns the key unchanged for English or missing translations. */
  function t(key) {
    if (!key || lang === "en-IN") return key
    return BANGLE[lang]?.[key] ?? key
  }

  /** setLang is kept for backward compat (LangToggle); prefer the layout language picker */
  function setLang(l) {
    try { localStorage.setItem(LANG_KEY, l) } catch {}
    setLangState(l)
    window.dispatchEvent(new Event("storage"))
  }

  return { lang, setLang, t, isTelugu: lang === "te-IN" }
}

/** Standalone language toggle — shows current language, cycles through available options */
export function LangToggle({ style }) {
  const { lang, setLang } = useLang()
  const CYCLE = ["en-IN", "te-IN", "hi-IN", "ta-IN", "kn-IN", "ml-IN", "mr-IN", "bn-IN"]
  const LABELS = { "en-IN":"EN","te-IN":"తె","hi-IN":"हि","ta-IN":"த","kn-IN":"ಕ","ml-IN":"മ","mr-IN":"म","bn-IN":"বাং" }
  function next() {
    const idx = CYCLE.indexOf(lang)
    setLang(CYCLE[(idx + 1) % CYCLE.length])
  }
  return (
    <button onClick={next} title="Change language"
      style={{
        padding: "4px 10px", borderRadius: 8, border: "1.5px solid",
        fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.12s",
        background: lang !== "en-IN" ? "rgba(212,98,31,0.12)" : "var(--bg2)",
        color:      lang !== "en-IN" ? "var(--saffron)"       : "var(--ink-dim)",
        borderColor:lang !== "en-IN" ? "rgba(212,98,31,0.35)" : "var(--rule)",
        ...style,
      }}>
      {LABELS[lang] || "EN"}
    </button>
  )
}
