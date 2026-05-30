// ── WhisperEngine ─────────────────────────────────────────
// Runs OpenAI Whisper entirely in the browser via @xenova/transformers.
// Zero API cost, works offline after first model download (~80 MB).
// Same callback interface as VoiceEngine so VoiceAgent can swap engines.

import { pipeline, env } from "@xenova/transformers"
import { translateToEnglish } from "./engine.js"

// Use browser cache (IndexedDB) so model is only downloaded once
env.allowLocalModels  = false
env.useBrowserCache   = true

// whisper-tiny multilingual — best balance of size (80 MB) vs accuracy
const MODEL = "Xenova/whisper-tiny"

// ── Language code mapping ─────────────────────────────────
// Whisper uses ISO 639-1 language names, not BCP-47 codes
const WHISPER_LANG = {
  "te-IN": "telugu",
  "hi-IN": "hindi",
  "ta-IN": "tamil",
  "kn-IN": "kannada",
  "ml-IN": "malayalam",
  "mr-IN": "marathi",
  "bn-IN": "bengali",
  "gu-IN": "gujarati",
  "pa-IN": "punjabi",
  "en-IN": "english",
}

export class WhisperEngine {
  constructor() {
    this.pipe        = null
    this.loading     = false
    this.loadPct     = 0
    this.recorder    = null
    this.audioCtx    = null
    this.analyser    = null
    this.chunks      = []
    this.isListening = false
    this.currentLang = "te-IN"
    this.supported   = !!(navigator.mediaDevices?.getUserMedia)
    this._maxTimer   = null

    // Callbacks — identical interface to VoiceEngine
    this.onStart    = null
    this.onEnd      = null
    this.onError    = null
    this.onResult   = null
    // Extra callbacks
    this.onProgress = null   // (pct: 0-100) called during model download
    this.onReady    = null   // called once model is fully loaded
  }

  // ── Preload model (call early so first use is instant) ────
  async preload() {
    if (this.pipe || this.loading) return
    this.loading = true
    try {
      this.pipe = await pipeline(
        "automatic-speech-recognition",
        MODEL,
        {
          quantized: true,
          progress_callback: (p) => {
            if (p.total) {
              const pct = Math.round((p.loaded / p.total) * 100)
              this.loadPct = pct
              this.onProgress?.(pct)
            }
          },
        }
      )
      this.loading = false
      this.loadPct = 100
      this.onProgress?.(100)
      this.onReady?.()
    } catch (e) {
      this.loading = false
      this.onError?.("Model load failed: " + e.message)
    }
  }

  setLanguage(code) { this.currentLang = code }
  setGrammarHints() { /* no-op */ }

  async start() {
    if (this.isListening) return

    // Load model on first use
    if (!this.pipe && !this.loading) await this.preload()
    if (!this.pipe) return   // still loading — will retry once ready

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount:      1,
          sampleRate:        16000,
          echoCancellation:  true,
          noiseSuppression:  true,
          autoGainControl:   true,
        },
      })

      // Web Audio analyser for silence detection
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      })
      this.analyser = this.audioCtx.createAnalyser()
      this.analyser.fftSize = 2048
      this.audioCtx.createMediaStreamSource(stream).connect(this.analyser)

      // MediaRecorder — collect audio chunks
      this.chunks  = []
      this.recorder = new MediaRecorder(stream)
      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data)
      }
      this.recorder.onstop = () => this._processAudio(stream)
      this.recorder.start(100)

      this.isListening = true
      this.onStart?.()

      // Auto-stop after 15 s max
      this._maxTimer = setTimeout(() => this.stop(), 15000)

      // Silence detection — stop 1.5 s after speech ends
      this._detectSilence()

    } catch (e) {
      const msg = e.name === "NotAllowedError"
        ? "Microphone blocked. Allow mic permission."
        : "Could not start recording: " + e.message
      this.onError?.(msg)
    }
  }

  _detectSilence() {
    const buf = new Uint8Array(this.analyser.frequencyBinCount)
    let speechSeen  = false
    let silenceFrom = null

    const tick = () => {
      if (!this.isListening) return

      this.analyser.getByteTimeDomainData(buf)
      // RMS energy of the audio frame
      const rms = Math.sqrt(
        buf.reduce((s, v) => s + (v - 128) ** 2, 0) / buf.length
      )

      if (rms > 6) {
        speechSeen  = true
        silenceFrom = null
      } else if (speechSeen) {
        if (!silenceFrom) silenceFrom = Date.now()
        else if (Date.now() - silenceFrom > 1500) {
          this.stop()
          return
        }
      }

      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }

  stop() {
    if (!this.isListening) return
    this.isListening = false
    clearTimeout(this._maxTimer)
    try {
      if (this.recorder?.state !== "inactive") this.recorder.stop()
    } catch {}
    this.onEnd?.()
  }

  toggle() {
    if (this.isListening) this.stop()
    else this.start()
  }

  async _processAudio(stream) {
    // Release mic track
    stream?.getTracks().forEach(t => t.stop())
    this.audioCtx?.close().catch(() => {})

    if (this.chunks.length === 0) return

    try {
      const blob   = new Blob(this.chunks, { type: "audio/webm" })
      const arrBuf = await blob.arrayBuffer()

      // Decode to PCM Float32 at 16 kHz (Whisper requirement)
      const decCtx   = new AudioContext({ sampleRate: 16000 })
      const decoded  = await decCtx.decodeAudioData(arrBuf)
      const float32  = decoded.getChannelData(0)   // mono channel
      await decCtx.close()

      const whisperLang = WHISPER_LANG[this.currentLang] || "english"

      const result = await this.pipe(float32, {
        language:          whisperLang,
        task:              "transcribe",
        chunk_length_s:    30,
        return_timestamps: false,
      })

      const original = (result.text || "").trim()
        .replace(/^\[.*?\]\s*/g, "")   // strip [BLANK_AUDIO] artefacts
        .trim()

      if (!original || original.length < 2) return

      // Translate non-English to English for the NLP matching layer
      let translated = original
      if (!this.currentLang.startsWith("en")) {
        translated = await translateToEnglish(original, this.currentLang)
      }

      this.onResult?.(original, translated)

    } catch (e) {
      this.onError?.("Transcription error: " + e.message)
    }
  }
}

export const whisperEngine = new WhisperEngine()
