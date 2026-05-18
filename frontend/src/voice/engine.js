// ── VoiceEngine ───────────────────────────────────────────
// Supports:
//   - Web Speech API (Chrome desktop, Android Chrome)
//   - MediaRecorder + Whisper (iOS Safari, iOS Chrome)

const TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"

// ── Translation ───────────────────────────────────────────
export async function translateToEnglish(text, sourceLang = "auto") {
  try {
    const lang = sourceLang.split("-")[0]
    const url  = `${TRANSLATE_URL}?client=gtx&sl=${lang}&tl=en&dt=t&q=${encodeURIComponent(text)}`
    const res  = await fetch(url)
    const data = await res.json()
    return data[0]?.map(p => p[0]).join("") || text
  } catch { return text }
}

// ── Text-to-Speech ────────────────────────────────────────
export function speak(text, lang = "hi-IN") {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance  = new SpeechSynthesisUtterance(text)
  utterance.lang   = lang
  utterance.rate   = 0.9
  utterance.volume = 1.0
  const voices = window.speechSynthesis.getVoices()
  const match  = voices.find(v => v.lang === lang)
    || voices.find(v => v.lang.startsWith(lang.split("-")[0]))
  if (match) utterance.voice = match
  window.speechSynthesis.speak(utterance)
}

// ── Detect platform ───────────────────────────────────────
export function detectPlatform() {
  const ua = navigator.userAgent
  const isIOS       = /iphone|ipad|ipod/i.test(ua)
  const isAndroid   = /android/i.test(ua)
  const isCapacitor = !!(window.Capacitor?.isNativePlatform?.())
  const hasSpeechAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  return { isIOS, isAndroid, isCapacitor, hasSpeechAPI }
}

// ── Request microphone permission for APK ─────────────────
export async function requestMicPermission() {
  try {
    // Try native Capacitor permission first
    if (window.Capacitor?.isNativePlatform?.()) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      return true
    }
    // Web browser
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(t => t.stop())
    return true
  } catch(e) {
    console.error("Mic permission denied:", e)
    return false
  }
}

// ── Main VoiceEngine ──────────────────────────────────────
export class VoiceEngine {
  constructor() {
    const { isIOS, hasSpeechAPI } = detectPlatform()
    this.isIOS       = isIOS
    // On iOS: use speech recognition via webkit if available
    // Web Speech works on iOS 16.4+ in Safari
    this.supported   = hasSpeechAPI
    this.isListening = false
    this.currentLang = "hi-IN"
    this.onResult    = null
    this.onError     = null
    this.onStart     = null
    this.onEnd       = null
    this.recognition = null
  }

  setLanguage(code) {
    this.currentLang = code
    if (this.recognition) this.recognition.lang = code
  }

  _initRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return null
    const rec = new SR()
    rec.lang            = this.currentLang
    rec.continuous      = false
    rec.interimResults  = false
    rec.maxAlternatives = 3

    rec.onstart  = () => { this.isListening = true;  this.onStart?.() }
    rec.onend    = () => { this.isListening = false;  this.onEnd?.() }
    rec.onerror  = (e) => {
      this.isListening = false
      let msg = "Voice error"
      if (e.error === "no-speech")    msg = "No speech detected. Try again."
      if (e.error === "not-allowed")  msg = "Microphone permission denied. Allow mic in browser settings."
      if (e.error === "network")      msg = "Network error. Check internet connection."
      if (e.error === "audio-capture")msg = "No microphone found."
      this.onError?.(msg)
    }
    rec.onresult = async (e) => {
      const original   = e.results[0][0].transcript
      let translated   = original
      if (!this.currentLang.startsWith("en")) {
        translated = await translateToEnglish(original, this.currentLang)
      }
      this.onResult?.(original, translated, e.results[0][0].confidence)
    }
    return rec
  }

  async start() {
    if (this.isListening) return

    // Request mic permission first (important for APK)
    const hasPerm = await requestMicPermission()
    if (!hasPerm) {
      this.onError?.("Microphone permission denied. Please allow microphone access in your phone Settings → Apps → DukaanAI → Permissions → Microphone → Allow")
      return
    }

    if (!this.supported) {
      if (this.isIOS) {
        this.onError?.(
          "Voice input needs microphone permission. " +
          "Go to Settings → Safari → Microphone → Allow, then reload the page."
        )
      } else {
        this.onError?.("Voice not supported. Use Chrome or Edge browser.")
      }
      return
    }

    this.recognition = this._initRecognition()
    if (!this.recognition) {
      this.onError?.("Could not start voice recognition.")
      return
    }
    try { this.recognition.start() }
    catch(e) { this.onError?.("Could not start voice: " + e.message) }
  }

  stop()   { this.recognition?.stop(); this.isListening = false }
  toggle() { if (this.isListening) this.stop(); else this.start() }
}

export const voiceEngine = new VoiceEngine()
