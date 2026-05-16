// ── useVoiceField hook ────────────────────────────────────
// Adds voice input to any form field
// Usage: const { listening, startVoice, micBtn } = useVoiceField(lang, onResult)

import { useState, useCallback } from "react"
import { translateToEnglish } from "./engine.js"

export function useVoiceField(lang = "hi-IN", onResult) {
  const [listening, setListening] = useState(false)
  const [error,     setError]     = useState("")

  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError("Voice not supported — use Chrome/Edge"); return }

    const rec = new SR()
    rec.lang = lang
    rec.continuous = false
    rec.interimResults = false

    rec.onstart  = () => { setListening(true); setError("") }
    rec.onend    = () => setListening(false)
    rec.onerror  = (e) => {
      setListening(false)
      if (e.error === "no-speech")   setError("No speech detected")
      else if (e.error === "not-allowed") setError("Allow microphone")
      else setError("Voice error: " + e.error)
    }

    rec.onresult = async (e) => {
      const original = e.results[0][0].transcript
      let result = original
      // Translate if not English
      if (!lang.startsWith("en")) {
        try { result = await translateToEnglish(original, lang) }
        catch { result = original }
      }
      onResult(result, original)
    }

    try { rec.start() }
    catch(e) { setError("Could not start mic: " + e.message) }
  }, [lang, onResult])

  return { listening, error, startVoice }
}

// ── Mic button component (inline SVG, no deps) ────────────
export function MicButton({ listening, onClick, size = 16, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={listening ? "Listening..." : "Click to speak"}
      style={{
        padding: "4px 6px",
        borderRadius: 6,
        border: "1px solid",
        borderColor: listening ? "#1D9E75" : "#e0e0e0",
        background:  listening ? "#E1F5EE" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 10,
        color: listening ? "#0F6E56" : "#888",
        flexShrink: 0,
        animation: listening ? "mic-pulse-btn 1s ease-in-out infinite" : "none",
      }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke={listening ? "#1D9E75" : "#aaa"} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
        <path d="M19 10v2a7 7 0 01-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
      {listening && <span>Listening...</span>}
    </button>
  )
}
