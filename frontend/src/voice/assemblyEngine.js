// ── Fast Browser Voice Engine ──────────────────────────────
// Uses Web Speech API in browser, native Android STT in Capacitor APK

import { translateToEnglish } from "./engine.js"

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition

const CONFIDENCE_THRESHOLD = 0.6

const isCapacitor = !!(window.Capacitor?.isNativePlatform?.())

// ── Capacitor native speech recognition ──────────────────────
let NativeSpeech = null
if (isCapacitor) {
  // Dynamic import so web build doesn't break if plugin is absent
  import("@capacitor-community/speech-recognition")
    .then(m => { NativeSpeech = m.SpeechRecognition })
    .catch(() => { NativeSpeech = null })
}

export class AssemblyVoiceEngine {
  constructor() {
    this.supported    = isCapacitor ? true : !!SpeechRecognition
    this.isListening  = false
    this.currentLang  = "te-IN"
    this.recognition  = null
    this.onStart      = null
    this.onEnd        = null
    this.onResult     = null
    this.onError      = null
    this._nativeListener = null

    if (!isCapacitor && this.supported) {
      this._setupWebRecognition()
    }
  }

  // ── Web Speech API (browser) ────────────────────────────
  _setupWebRecognition() {
    try {
      this.recognition = new SpeechRecognition()
      this.recognition.continuous      = false
      this.recognition.interimResults  = false
      this.recognition.maxAlternatives = 5
      this.recognition.lang            = this.currentLang

      this.recognition.onstart = () => {
        this.isListening = true
        this.onStart?.()
      }
      this.recognition.onend = () => {
        this.isListening = false
        this.onEnd?.()
      }
      this.recognition.onerror = (event) => {
        this.isListening = false
        if (event.error === "aborted") return
        let msg = "Voice error — try again"
        if (event.error === "no-speech")     msg = "No speech heard. Tap mic and speak clearly."
        if (event.error === "not-allowed")   msg = "Microphone blocked. Allow mic permission."
        if (event.error === "network")       msg = "Network error. Check internet."
        if (event.error === "audio-capture") msg = "No microphone found."
        this.onError?.(msg)
      }
      this.recognition.onresult = async (event) => {
        try {
          let best = event.results[0][0]
          for (let i = 1; i < event.results[0].length; i++) {
            const alt = event.results[0][i]
            if (alt.confidence > best.confidence) best = alt
          }
          const original = best.transcript?.trim()
          if (!original) { this.onError?.("No speech detected"); return }
          let translated = original
          if (!this.currentLang.startsWith("en")) {
            translated = await translateToEnglish(original, this.currentLang)
          }
          this.onResult?.(original, translated, best.confidence)
        } catch (e) {
          this.onError?.("Voice processing failed")
        }
      }
    } catch (e) {
      console.error("Could not initialise SpeechRecognition:", e)
      this.supported = false
    }
  }

  // ── Capacitor native Android STT ─────────────────────────
  async _startNative() {
    try {
      if (!NativeSpeech) {
        // Plugin still loading — wait briefly then retry
        await new Promise(r => setTimeout(r, 800))
        if (!NativeSpeech) {
          this.onError?.("Speech plugin not ready. Please restart the app.")
          return
        }
      }

      // Request mic permission
      const perm = await NativeSpeech.requestPermissions()
      if (perm?.speechRecognition === "denied" || perm?.microphone === "denied") {
        this.onError?.("Microphone permission denied. Allow it in Settings → Apps → DukaanAI → Permissions.")
        return
      }

      this.isListening = true
      this.onStart?.()

      // Remove any previous listener
      if (this._nativeListener) {
        this._nativeListener.remove()
        this._nativeListener = null
      }

      // Listen for results
      this._nativeListener = await NativeSpeech.addListener("partialResults", async (data) => {
        const matches = data?.matches || []
        if (!matches.length) return
        const original = matches[0]?.trim()
        if (!original) return

        // Stop after first good result
        await this._stopNative()

        let translated = original
        if (!this.currentLang.startsWith("en")) {
          translated = await translateToEnglish(original, this.currentLang)
        }
        this.onResult?.(original, translated, 0.9)
      })

      await NativeSpeech.start({
        language:       this.currentLang,
        maxResults:     5,
        prompt:         "Speak now...",
        partialResults: true,
        popup:          false,
      })
    } catch (e) {
      this.isListening = false
      this.onEnd?.()
      // "no-speech" type errors from native
      if (e?.message?.includes("permission")) {
        this.onError?.("Microphone permission denied.")
      } else {
        this.onError?.("Voice error: " + (e?.message || "try again"))
      }
    }
  }

  async _stopNative() {
    try {
      if (this._nativeListener) {
        this._nativeListener.remove()
        this._nativeListener = null
      }
      if (NativeSpeech) await NativeSpeech.stop()
    } catch {}
    this.isListening = false
    this.onEnd?.()
  }

  // ── Public API ────────────────────────────────────────────
  setLanguage(code) {
    this.currentLang = code
    if (this.recognition) this.recognition.lang = code
  }

  setGrammarHints(productNames = []) {
    this._grammarHints = productNames.slice(0, 200)
  }

  start() {
    if (!this.supported) {
      this.onError?.("Speech recognition not supported. Use Chrome browser.")
      return
    }
    if (this.isListening) return

    if (isCapacitor) {
      this._startNative()
    } else {
      try {
        this.recognition.start()
      } catch (e) {
        this.onError?.("Could not start voice: " + e.message)
      }
    }
  }

  stop() {
    if (isCapacitor) {
      this._stopNative()
    } else {
      if (this.recognition && this.isListening) this.recognition.stop()
    }
  }

  toggle() {
    if (this.isListening) this.stop(); else this.start()
  }
}

export const voiceEngine = new AssemblyVoiceEngine()
export default voiceEngine
