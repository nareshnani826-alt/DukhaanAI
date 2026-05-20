// ── AssemblyAI Real-Time Voice Engine ─────────────────────────────────────────
// Replaces the browser Web Speech API with AssemblyAI streaming transcription.
// The real API key stays on the backend; the frontend gets a short-lived token.

import { translateToEnglish } from "./engine.js"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"

// AssemblyAI real-time language codes (subset it supports well)
// Others fall back to auto-detect — product brand names work regardless
const LANG_MAP = {
  "en-IN": "en",
  "hi-IN": "hi",
  "ta-IN": "ta",
  "te-IN": "te",
  "kn-IN": "kn",
  "ml-IN": "ml",
  "mr-IN": "mr",
}

export class AssemblyVoiceEngine {
  constructor() {
    this.supported   = !!(navigator.mediaDevices?.getUserMedia)
    this.isListening = false
    this.currentLang = "hi-IN"

    this._ws        = null
    this._audioCtx  = null
    this._processor = null
    this._source    = null
    this._stream    = null
    this._stopTimer = null

    // Same callback surface as the old VoiceEngine — drop-in replacement
    this.onStart  = null
    this.onEnd    = null
    this.onResult = null  // (originalText, translatedText, confidence)
    this.onError  = null
  }

  setLanguage(code) { this.currentLang = code }

  // No-op: AssemblyAI uses neural models, grammar hints aren't applicable
  setGrammarHints() {}

  async start() {
    if (this.isListening) return

    // 1. Acquire microphone
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount:    1,
          sampleRate:      16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
        },
      })
    } catch {
      this.onError?.("Microphone blocked. Allow mic permission and try again.")
      return
    }

    // 2. Get a short-lived token from our backend (keeps the real key secret)
    let token
    try {
      const resp = await fetch(`${API_BASE}/aai/token`)
      if (!resp.ok) throw new Error("token_failed")
      ;({ token } = await resp.json())
    } catch (e) {
      this._releaseStream()
      if (e.message === "token_failed") {
        this.onError?.("Voice service not configured. Ask admin to add ASSEMBLYAI_API_KEY.")
      } else {
        this.onError?.("Could not reach voice service. Check internet.")
      }
      return
    }

    // 3. Open AssemblyAI real-time WebSocket
    const langCode = LANG_MAP[this.currentLang] || "en"
    const wsUrl    = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}&language_code=${langCode}`

    try {
      this._ws = new WebSocket(wsUrl)
    } catch {
      this._releaseStream()
      this.onError?.("Could not open voice connection.")
      return
    }

    this._ws.onopen = () => {
      this.isListening = true
      this.onStart?.()
      this._startPCMStreaming()
      // Safety auto-stop at 30 s (same as Web Speech API limit)
      this._stopTimer = setTimeout(() => { if (this.isListening) this.stop() }, 30000)
    }

    this._ws.onmessage = async (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.message_type === "FinalTranscript" && msg.text?.trim()) {
          const original = msg.text.trim()
          // Translate to English for the NLP pipeline (same as old engine did)
          let translated = original
          if (!this.currentLang.startsWith("en")) {
            translated = await translateToEnglish(original, this.currentLang)
          }
          this.stop()
          this.onResult?.(original, translated, msg.confidence ?? 0.9)
        }
      } catch {}
    }

    this._ws.onerror = () => {
      const wasListening = this.isListening
      this._cleanup()
      if (wasListening) this.onError?.("Voice connection error. Check internet and try again.")
    }

    this._ws.onclose = (e) => {
      const wasListening = this.isListening
      this._cleanup()
      this.onEnd?.()
      // Code 1000 = clean close we initiated; anything else is unexpected
      if (wasListening && e.code !== 1000) {
        this.onError?.("Voice stopped unexpectedly (code " + e.code + "). Try again.")
      }
    }
  }

  // Stream raw PCM16 audio from the mic to AssemblyAI via the WebSocket
  _startPCMStreaming() {
    try {
      // createScriptProcessor is deprecated but universally supported (incl. Capacitor WebView)
      this._audioCtx  = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
      this._source    = this._audioCtx.createMediaStreamSource(this._stream)
      this._processor = this._audioCtx.createScriptProcessor(4096, 1, 1)

      this._processor.onaudioprocess = (e) => {
        if (this._ws?.readyState !== WebSocket.OPEN) return
        const f32 = e.inputBuffer.getChannelData(0)
        const i16 = new Int16Array(f32.length)
        for (let i = 0; i < f32.length; i++) {
          // Clamp + scale Float32 → Int16
          i16[i] = Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32768)))
        }
        this._ws.send(i16.buffer)
      }

      // ScriptProcessor must be connected to the graph to fire onaudioprocess
      this._source.connect(this._processor)
      this._processor.connect(this._audioCtx.destination)
    } catch (e) {
      this._cleanup()
      this.onError?.("Audio processing error. Try reloading the page. (" + e.message + ")")
    }
  }

  stop() {
    clearTimeout(this._stopTimer)
    // Ask AssemblyAI to flush any buffered audio and return the final transcript
    if (this._ws?.readyState === WebSocket.OPEN) {
      try { this._ws.send(JSON.stringify({ terminate_session: true })) } catch {}
    }
    this._cleanup()
  }

  _releaseStream() {
    try { this._stream?.getTracks().forEach(t => t.stop()) } catch {}
    this._stream = null
  }

  _cleanup() {
    clearTimeout(this._stopTimer)
    this.isListening = false
    try { this._processor?.disconnect() } catch {}
    try { this._source?.disconnect()    } catch {}
    try { this._audioCtx?.close()       } catch {}
    this._releaseStream()
    try { this._ws?.close()             } catch {}
    this._processor = null
    this._source    = null
    this._audioCtx  = null
    this._ws        = null
  }

  toggle() { if (this.isListening) this.stop(); else this.start() }
}

// Singleton used by VoiceAgent.jsx (same name as old export)
export const voiceEngine = new AssemblyVoiceEngine()
