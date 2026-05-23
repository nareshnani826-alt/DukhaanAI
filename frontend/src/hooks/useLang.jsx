import { useState, useEffect } from "react"
import { TE } from "../i18n/teluguStrings"

const LANG_KEY    = "dk_bangle_lang"
const LANG_EVENT  = "dk:lang"

// Returns the stored language, defaulting to "en"
function storedLang() {
  try { return localStorage.getItem(LANG_KEY) || "en" } catch { return "en" }
}

export function useLang() {
  const [lang, setLangState] = useState(storedLang)

  // Stay in sync across all bangle components on the same page
  useEffect(() => {
    const handler = (e) => setLangState(e.detail)
    window.addEventListener(LANG_EVENT, handler)
    return () => window.removeEventListener(LANG_EVENT, handler)
  }, [])

  function setLang(l) {
    try { localStorage.setItem(LANG_KEY, l) } catch {}
    window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: l }))
  }

  // t("English text") → Telugu if active, else returns the English text unchanged
  function t(english) {
    if (lang !== "te") return english
    return TE[english] ?? english
  }

  return { lang, setLang, t, isTelugu: lang === "te" }
}

// Standalone toggle component — drop into any bangle page header
export function LangToggle({ style }) {
  const { lang, setLang } = useLang()
  return (
    <button
      onClick={() => setLang(lang === "te" ? "en" : "te")}
      title={lang === "te" ? "Switch to English" : "తెలుగులో చూడండి"}
      style={{
        padding: "4px 10px", borderRadius: 8, border: "1.5px solid",
        fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.12s",
        background:  lang === "te" ? "rgba(212,98,31,0.12)" : "var(--bg2)",
        color:       lang === "te" ? "var(--saffron)"       : "var(--ink-dim)",
        borderColor: lang === "te" ? "rgba(212,98,31,0.35)" : "var(--rule)",
        ...style,
      }}>
      {lang === "te" ? "EN" : "తె"}
    </button>
  )
}
