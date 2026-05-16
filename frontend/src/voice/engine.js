// ── VoiceEngine ───────────────────────────────────────────
// Wraps Web Speech API (free, built into Chrome/Edge)
// + Google Translate free endpoint for translation
// + Web Speech Synthesis for voice confirmations

const TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"

// ── Translation (Google Translate free endpoint) ──────────
export async function translateToEnglish(text, sourceLang = "auto") {
  try {
    const lang = sourceLang.split("-")[0] // "hi-IN" → "hi"
    const url = `${TRANSLATE_URL}?client=gtx&sl=${lang}&tl=en&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    const data = await res.json()
    // Google returns nested array: [[["translated","original",...],...],...]
    const translated = data[0]?.map(part => part[0]).join("") || text
    return translated
  } catch {
    // If translation fails, return original (might still work for English)
    return text
  }
}

// ── Text-to-Speech (Web Speech Synthesis — completely free) ──
export function speak(text, lang = "hi-IN") {
  if (!window.speechSynthesis) return
  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.9   // slightly slower — easier to understand
  utterance.pitch = 1.0
  utterance.volume = 1.0

  // Try to find a voice for the language
  const voices = window.speechSynthesis.getVoices()
  const match = voices.find(v => v.lang === lang)
    || voices.find(v => v.lang.startsWith(lang.split("-")[0]))
    || voices.find(v => v.lang.includes("IN"))

  if (match) utterance.voice = match
  window.speechSynthesis.speak(utterance)
}

// ── Main VoiceEngine class ────────────────────────────────
export class VoiceEngine {
  constructor() {
    this.recognition  = null
    this.isListening  = false
    this.currentLang  = "hi-IN"
    this.onResult     = null   // callback(originalText, translatedText)
    this.onError      = null   // callback(errorMessage)
    this.onStart      = null   // callback()
    this.onEnd        = null   // callback()
    this.supported    = this._checkSupport()
  }

  _checkSupport() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  }

  setLanguage(langCode) {
    this.currentLang = langCode
    if (this.recognition) {
      this.recognition.lang = langCode
    }
  }

  _initRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()

    recognition.lang           = this.currentLang
    recognition.continuous     = false   // single utterance per press
    recognition.interimResults = false
    recognition.maxAlternatives = 3

    recognition.onstart = () => {
      this.isListening = true
      this.onStart?.()
    }

    recognition.onresult = async (event) => {
      const original = event.results[0][0].transcript
      const confidence = event.results[0][0].confidence

      // Translate if not English
      let translated = original
      if (!this.currentLang.startsWith("en")) {
        translated = await translateToEnglish(original, this.currentLang)
      }

      this.onResult?.(original, translated, confidence)
    }

    recognition.onerror = (event) => {
      let msg = "Voice error"
      if (event.error === "no-speech")      msg = "No speech detected. Try again."
      if (event.error === "not-allowed")    msg = "Microphone permission denied. Allow mic in browser settings."
      if (event.error === "network")        msg = "Network error. Check internet connection."
      if (event.error === "audio-capture")  msg = "No microphone found."
      this.onError?.(msg)
    }

    recognition.onend = () => {
      this.isListening = false
      this.onEnd?.()
    }

    return recognition
  }

  start() {
    if (!this.supported) {
      this.onError?.("Voice not supported in this browser. Use Chrome or Edge.")
      return
    }
    if (this.isListening) return

    this.recognition = this._initRecognition()
    try {
      this.recognition.start()
    } catch (e) {
      this.onError?.("Could not start voice: " + e.message)
    }
  }

  stop() {
    this.recognition?.stop()
    this.isListening = false
  }

  toggle() {
    if (this.isListening) this.stop()
    else this.start()
  }
}

// ── Singleton instance ────────────────────────────────────
export const voiceEngine = new VoiceEngine()
