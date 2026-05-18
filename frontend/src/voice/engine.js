// ── VoiceEngine ───────────────────────────────────────────
// Uses Web Speech API (Chrome/Android)
// Falls back to guidance for unsupported browsers

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
  const isChrome    = /chrome/i.test(ua) && !/edge/i.test(ua)
  const hasSpeechAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  return { isIOS, isAndroid, isCapacitor, isChrome, hasSpeechAPI }
}

// ── Request mic permission ────────────────────────────────
export async function requestMicPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(t => t.stop())
    return true
  } catch { return false }
}

// ── Main VoiceEngine ──────────────────────────────────────
export class VoiceEngine {
  constructor() {
    const { isIOS, isCapacitor, hasSpeechAPI } = detectPlatform()
    this.isIOS       = isIOS
    this.isCapacitor = isCapacitor
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

    let autoStopTimer = null

    rec.onstart = () => {
      this.isListening = true
      this.onStart?.()
      autoStopTimer = setTimeout(() => {
        if (this.isListening) {
          try { rec.stop() } catch {}
        }
      }, 8000)
    }

    rec.onend = () => {
      clearTimeout(autoStopTimer)
      this.isListening = false
      this.onEnd?.()
    }

    rec.onerror = (e) => {
      clearTimeout(autoStopTimer)
      this.isListening = false
      if (e.error === "aborted") return
      let msg = "Voice error — try again"
      if (e.error === "no-speech")     msg = "No speech heard. Tap mic and speak clearly."
      if (e.error === "not-allowed")   msg = "Microphone blocked. Allow mic permission."
      if (e.error === "network")       msg = "Network error. Check internet."
      if (e.error === "audio-capture") msg = "No microphone found."
      this.onError?.(msg)
    }

    rec.onresult = async (e) => {
      clearTimeout(autoStopTimer)
      const original = e.results[0][0].transcript
      let translated = original
      if (!this.currentLang.startsWith("en")) {
        translated = await translateToEnglish(original, this.currentLang)
      }
      this.onResult?.(original, translated, e.results[0][0].confidence)
    }
    return rec
  }

  async start() {
    if (this.isListening) return

    // For Capacitor APK — request permission first
    if (this.isCapacitor) {
      const hasPerm = await requestMicPermission()
      if (!hasPerm) {
        this.onError?.("Mic blocked. Go to phone Settings → Apps → DukaanAI → Permissions → Microphone → Allow")
        return
      }
    }

    if (!this.supported) {
      this.onError?.("Voice not supported in this browser. Please use Chrome.")
      return
    }

    this.recognition = this._initRecognition()
    if (!this.recognition) {
      this.onError?.("Could not start voice.")
      return
    }
    try { this.recognition.start() }
    catch(e) {
      // If recognition fails in APK WebView, show helpful message
      if (this.isCapacitor) {
        this.onError?.("Voice works best in Chrome browser. Open dukhaan-ai.vercel.app in Chrome for voice features.")
      } else {
        this.onError?.("Could not start voice: " + e.message)
      }
    }
  }

  stop()   { this.recognition?.stop(); this.isListening = false }
  toggle() { if (this.isListening) this.stop(); else this.start() }
}

export const voiceEngine = new VoiceEngine()
