// ── VoiceEngine ───────────────────────────────────────────
// Uses Web Speech API (Chrome/Android)
// Falls back to guidance for unsupported browsers

import { t } from "./i18n.js"

const TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"

// ── Translation ───────────────────────────────────────────
// ── Improvement 1: Pre-translate blocklist ───────────────
// ONLY skip translation for very specific multi-word regional phrases
// Avoid blocking common English words like "do", "ek", "tel"
const SKIP_TRANSLATE_PATTERNS = [
  // Only skip for clearly regional multi-word grocery phrases
  /kandi\s+pappu/i,
  /pesara\s+pappu/i,
  /minapa\s+pappu/i,
  /togari\s+bele/i,
  /hesaru\s+bele/i,
  /tuvaram\s+paruppu/i,
]

export async function translateToEnglish(text, sourceLang = "auto") {
  // Skip translation ONLY for known regional phrases that Google mangles
  if (SKIP_TRANSLATE_PATTERNS.some(p => p.test(text))) {
    return text
  }
  try {
    const lang = sourceLang.split("-")[0]
    const url  = `${TRANSLATE_URL}?client=gtx&sl=${lang}&tl=en&dt=t&q=${encodeURIComponent(text)}`
    const res  = await fetch(url)
    const data = await res.json()
    return data[0]?.map(p => p[0]).join("") || text
  } catch { return text }
}

// ── Text-to-Speech ────────────────────────────────────────
// Voices load asynchronously — cache them once available so speak() always
// finds the right voice even on the first call.
let _voiceCache = []

function _cacheVoices() {
  const v = window.speechSynthesis?.getVoices() || []
  if (v.length) _voiceCache = v
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = _cacheVoices
  _cacheVoices() // sync load if already available (Chromium)
}

function _pickVoice(lang) {
  const voices  = _voiceCache.length ? _voiceCache : (window.speechSynthesis?.getVoices() || [])
  const base    = lang.split("-")[0]           // "te", "hi", "ta", ...
  const region  = lang.split("-")[1] || ""     // "IN", "US", ...

  // 1. Exact match: "te-IN"
  let v = voices.find(v => v.lang === lang)
  // 2. Same base language + IN region
  if (!v) v = voices.find(v => v.lang.startsWith(base) && v.lang.includes("IN"))
  // 3. Any voice for this base language
  if (!v) v = voices.find(v => v.lang.toLowerCase().startsWith(base.toLowerCase()))
  // 4. Google / network voices are better quality — prefer them
  if (!v) v = voices.find(v => v.name.toLowerCase().includes("google") && v.lang.startsWith(base))
  return v || null
}

export function speak(text, lang = "en-IN") {
  if (!window.speechSynthesis || !text) return
  window.speechSynthesis.cancel()
  const utterance  = new SpeechSynthesisUtterance(text)
  utterance.lang   = lang
  utterance.rate   = 0.85
  utterance.volume = 1.0
  utterance.pitch  = 1.0
  const voice = _pickVoice(lang)
  if (voice) utterance.voice = voice
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

  // Improvement 5: Set product name grammar hints
  setGrammarHints(productNames = []) {
    this._grammarHints = productNames.slice(0, 200) // top 200 products
  }

  _buildGrammar(productNames) {
    try {
      const SRG = window.SpeechGrammarList || window.webkitSpeechGrammarList
      if (!SRG || !productNames?.length) return null
      const list = new SRG()
      // JSGF grammar biases recognition toward known product names
      const phrases = productNames.map(n => n.toLowerCase()).join(" | ")
      const grammar = `#JSGF V1.0; grammar products; public <product> = ${phrases} ;`
      list.addFromString(grammar, 1) // weight = 1 (max influence)
      return list
    } catch { return null }
  }

  _initRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return null
    const rec = new SR()
    rec.lang            = this.currentLang
    rec.continuous      = false
    rec.interimResults  = false
    rec.maxAlternatives = 5 // increased for better alternatives

    // Apply grammar hints if available
    if (this._grammarHints?.length) {
      const grammar = this._buildGrammar(this._grammarHints)
      if (grammar) rec.grammars = grammar
    }

    let autoStopTimer = null

    rec.onstart = () => {
      this.isListening = true
      this.onStart?.()
      autoStopTimer = setTimeout(() => {
        if (this.isListening) {
          try { rec.stop() } catch {}
        }
      }, 30000)
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
      // "no-speech" is normal background silence — treat it as a quiet end so
      // continuous mode can restart cleanly without flashing an error message
      if (e.error === "no-speech") { this.onEnd?.(); return }
      const lang = this.currentLang
      let msg = t("err_generic",     lang)
      if (e.error === "not-allowed")   msg = t("err_mic_blocked", lang)
      if (e.error === "network")       msg = t("err_network",     lang)
      if (e.error === "audio-capture") msg = t("err_mic_blocked", lang)
      this.onError?.(msg)
    }

    rec.onresult = async (e) => {
      clearTimeout(autoStopTimer)
      // Pick the alternative with the highest confidence score
      let best = e.results[0][0]
      for (let i = 1; i < e.results[0].length; i++) {
        if (e.results[0][i].confidence > best.confidence) best = e.results[0][i]
      }
      const original = best.transcript?.trim() || e.results[0][0].transcript
      let translated = original
      if (!this.currentLang.startsWith("en")) {
        translated = await translateToEnglish(original, this.currentLang)
      }
      this.onResult?.(original, translated, best.confidence)
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
