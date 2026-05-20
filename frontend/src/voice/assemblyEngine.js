// ── Fast Browser Voice Engine ──────────────────────────────
// Uses Web Speech API for realtime low-latency billing

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition

export class AssemblyVoiceEngine {
  constructor() {
    this.supported = !!SpeechRecognition
    this.isListening = false
    this.currentLang = "te-IN"

    this.recognition = null

    this.onStart = null
    this.onEnd = null
    this.onResult = null
    this.onError = null

    if (this.supported) {
      this._setupRecognition()
    }
  }

  _setupRecognition() {
    this.recognition = new SpeechRecognition()

    this.recognition.continuous = false
    this.recognition.interimResults = false
    this.recognition.maxAlternatives = 3

    this.recognition.lang = this.currentLang

    this.recognition.onstart = () => {
      this.isListening = true
      this.onStart?.()
    }

    this.recognition.onend = () => {
      this.isListening = false
      this.onEnd?.()
    }

    this.recognition.onerror = (event) => {
      console.error("Speech Error:", event)

      this.isListening = false

      this.onError?.(
        "Voice recognition failed"
      )
    }

    this.recognition.onresult = (event) => {
      try {
        const result =
          event.results[0][0]

        const transcript =
          result.transcript?.trim()

        const confidence =
          result.confidence || 0.9

        console.log(
          "Speech Transcript:",
          transcript
        )

        if (!transcript) {
          this.onError?.(
            "No speech detected"
          )
          return
        }

        // SAME callback structure
        this.onResult?.(
          transcript,
          transcript,
          confidence
        )

      } catch (e) {
        console.error(e)

        this.onError?.(
          "Voice processing failed"
        )
      }
    }
  }

  setLanguage(code) {
    this.currentLang = code

    if (this.recognition) {
      this.recognition.lang = code
    }
  }

  // Compatibility method
  setGrammarHints() {}

  start() {
    if (!this.supported) {
      this.onError?.(
        "Speech recognition not supported"
      )
      return
    }

    if (this.isListening) return

    try {
      this.recognition.start()
    } catch (e) {
      console.error(e)
    }
  }

  stop() {
    if (
      this.recognition &&
      this.isListening
    ) {
      this.recognition.stop()
    }
  }

  toggle() {
    if (this.isListening) {
      this.stop()
    } else {
      this.start()
    }
  }
}

// Singleton export
export const voiceEngine =
  new AssemblyVoiceEngine()

export default voiceEngine