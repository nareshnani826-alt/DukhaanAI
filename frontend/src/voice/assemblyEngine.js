// ── Fast Browser Voice Engine ──────────────────────────────
// Uses Web Speech API in browser, native Android STT in Capacitor APK

import { translateToEnglish } from "./engine.js"

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition

const CONFIDENCE_THRESHOLD = 0.6

// Evaluated lazily at call time — Capacitor bridge may not exist at module load
const isNative = () => !!(window.Capacitor?.isNativePlatform?.())

export class AssemblyVoiceEngine {
  constructor() {
    this.supported    = !!SpeechRecognition || isNative()
    this.isListening  = false
    this.currentLang  = "te-IN"
    this.recognition  = null
    this.onStart      = null
    this.onEnd        = null
    this.onResult     = null
    this.onError      = null
    this._nativeListener = null
    this._nativePlugin   = null
  }

  // ── Web Speech API (browser only) ────────────────────────
  _setupRecognition() {
    try {
      this.recognition = new SpeechRecognition()
      this.recognition.continuous      = false
      this.recognition.interimResults  = false
      this.recognition.maxAlternatives = 5   // try up to 5 transcripts
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
        // Specific messages match engine.js for consistent UX
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
          // Pick best alternative: highest confidence above threshold,
          // otherwise fall back to the top result
          let best = event.results[0][0]
          for (let i = 1; i < event.results[0].length; i++) {
            const alt = event.results[0][i]
            if (alt.confidence > best.confidence) best = alt
          }

          const original = best.transcript?.trim()
          if (!original) { this.onError?.("No speech detected"); return }

          // Translate non-English to English so NLP can match product names
          let translated = original
          if (!this.currentLang.startsWith("en")) {
            translated = await translateToEnglish(original, this.currentLang)
          }

          this.onResult?.(original, translated, best.confidence)
        } catch (e) {
          console.error("AssemblyVoiceEngine result error:", e)
          this.onError?.("Voice processing failed")
        }
      }
    } catch (e) {
      console.error("Could not initialise SpeechRecognition:", e)
    }
  }

  // ── Capacitor native Android STT ─────────────────────────
  // Dynamic import lives here so web browsers never touch this code path.
  // Vite will never pre-bundle @capacitor-community/speech-recognition
  // for the web build (also excluded in vite.config.js).
  async _startNative() {
    let NativeSpeech
    try {
      const mod = await import("@capacitor-community/speech-recognition")
      NativeSpeech = mod.SpeechRecognition
    } catch (e) {
      this.onError?.("Speech plugin not available. Rebuild the APK.")
      return
    }

    try {
      // Request mic permission
      const perm = await NativeSpeech.requestPermissions()
      const granted = perm?.speechRecognition === "granted" || perm?.microphone === "granted"
      if (!granted) {
        this.onError?.("Microphone permission denied. Allow it in Settings → Apps → DukaanAI → Permissions.")
        return
      }

      this._nativePlugin = NativeSpeech
      this.isListening = true
      this.onStart?.()

      // start() blocks until Android recognizer ends, then resolves with { matches: string[] }.
      // popup:true uses the system Google speech dialog — far more reliable than background STT
      // across Android OEMs (Xiaomi MIUI, Samsung OneUI, Realme ColorOS all restrict bg services).
      const result = await NativeSpeech.start({
        language:       this.currentLang,
        maxResults:     5,
        prompt:         "बोलो / Speak now...",
        partialResults: false,
        popup:          true,
      })

      // If user tapped stop mid-session, _stopNative already cleaned up — bail silently
      if (!this.isListening) return

      this._nativePlugin = null
      this.isListening = false
      this.onEnd?.()

      const matches = result?.matches || []
      const original = matches[0]?.trim()
      if (!original) {
        this.onError?.("No speech heard. Tap mic and speak clearly.")
        return
      }

      let translated = original
      if (!this.currentLang.startsWith("en")) {
        translated = await translateToEnglish(original, this.currentLang)
      }
      this.onResult?.(original, translated, 0.9)

    } catch (e) {
      if (!this.isListening) return   // already stopped by user — suppress
      this.isListening = false
      this._nativePlugin = null
      this.onEnd?.()
      const msg = (e?.message || "").toLowerCase()
      if (msg.includes("permission") || msg.includes("not_allowed")) {
        this.onError?.("Microphone permission denied. Allow mic in Settings → Apps → DukaanAI → Permissions.")
      } else if (msg.includes("no match") || msg.includes("nomatch") || msg.includes("no_match")) {
        this.onError?.("Couldn't understand. Please speak clearly and try again.")
      } else if (msg.includes("speech timeout") || msg.includes("timeout") || msg.includes("no speech")) {
        this.onError?.("No speech heard. Tap mic and speak clearly.")
      } else if (msg.includes("busy") || msg.includes("recognizer busy")) {
        this.onError?.("Voice busy — wait a moment then try again.")
      } else if (msg.includes("network")) {
        this.onError?.("Network error. Check internet connection.")
      } else if (!msg.includes("aborted") && !msg.includes("cancelled")) {
        this.onError?.("Voice error — please try again.")
      }
    }
  }

  async _stopNative() {
    try {
      if (this._nativeListener) {
        await this._nativeListener.remove()
        this._nativeListener = null
      }
      if (this._nativePlugin) {
        await this._nativePlugin.stop()
        this._nativePlugin = null
      }
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
    // Future: pass to SpeechGrammarList — no-op for now (see engine.js _buildGrammar)
    this._grammarHints = productNames.slice(0, 200)
  }

  start() {
    if (!this.supported) {
      this.onError?.("Speech recognition not supported in this browser. Use Chrome.")
      return
    }
    if (this.isListening) return

    if (isNative()) {
      this._startNative()
    } else {
      // Recreate instance every time — Web Speech API objects cannot be reused
      // after onend fires (Android Chrome throws InvalidStateError on second start)
      this._setupRecognition()
      try {
        this.recognition.start()
      } catch (e) {
        console.error("AssemblyVoiceEngine.start error:", e)
        this.onError?.("Could not start voice: " + e.message)
      }
    }
  }

  stop() {
    if (isNative()) {
      this._stopNative()
    } else if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
  }

  toggle() {
    if (this.isListening) this.stop(); else this.start()
  }
}

export const voiceEngine = new AssemblyVoiceEngine()
export default voiceEngine
