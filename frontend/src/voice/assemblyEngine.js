// ── Fast Browser Voice Engine ──────────────────────────────
// Uses Web Speech API for realtime low-latency billing

import { translateToEnglish } from "./engine.js"

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition

const CONFIDENCE_THRESHOLD = 0.6 // try next alternative below this

export class AssemblyVoiceEngine {
  constructor() {
    this.supported    = !!SpeechRecognition
    this.isListening  = false
    this.currentLang  = "te-IN"
    this.recognition  = null
    this.onStart      = null
    this.onEnd        = null
    this.onResult     = null
    this.onError      = null

    if (this.supported) {
      this._setupRecognition()
    }
  }

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
      this.supported = false
    }
  }

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
    try {
      this.recognition.start()
    } catch (e) {
      console.error("AssemblyVoiceEngine.start error:", e)
      this.onError?.("Could not start voice: " + e.message)
    }
  }

  stop() {
    if (this.recognition && this.isListening) this.recognition.stop()
  }

  toggle() {
    if (this.isListening) this.stop(); else this.start()
  }
}

// Singleton export
export const voiceEngine = new AssemblyVoiceEngine()
export default voiceEngine
