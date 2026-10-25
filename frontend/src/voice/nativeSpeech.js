// nativeSpeech.js — Web Speech API–compatible wrapper around native Android STT
//
// Android WebView (the Capacitor APK) has no working SpeechRecognition, so mic
// buttons that do `new (window.SpeechRecognition || window.webkitSpeechRecognition)()`
// fail with "not-allowed" inside the app. getSpeechRecognition() returns a class
// with the same surface (lang, onstart/onresult/onerror/onend, start/stop/abort,
// e.results[i][j].transcript, isFinal, resultIndex) backed by
// @capacitor-community/speech-recognition on native, and the browser API on web.

const isNative = () => !!(window.Capacitor?.isNativePlatform?.())

function toResultList(matches) {
  const alts = matches.map(t => ({ transcript: t, confidence: 0.9 }))
  const result = Object.assign(alts, { isFinal: true, item(i) { return this[i] } })
  return Object.assign([result], { item(i) { return this[i] } })
}

function toErrorCode(e) {
  const msg = (e?.message || "").toLowerCase()
  if (msg.includes("permission") || msg.includes("not_allowed")) return "not-allowed"
  if (msg.includes("no match") || msg.includes("nomatch") || msg.includes("no_match")) return "no-speech"
  if (msg.includes("timeout") || msg.includes("no speech")) return "no-speech"
  if (msg.includes("network")) return "network"
  if (msg.includes("aborted") || msg.includes("cancel")) return "aborted"
  return "audio-capture"
}

class NativeSpeechRecognition {
  constructor() {
    this.lang            = "en-IN"
    this.continuous      = false   // native popup always captures one utterance
    this.interimResults  = false
    this.maxAlternatives = 5
    this.grammars        = null
    this.onstart  = null
    this.onresult = null
    this.onerror  = null
    this.onend    = null
    this._plugin  = null
    this._active  = false
  }

  _end() {
    if (!this._active) return
    this._active = false
    this.onend?.()
  }

  async start() {
    if (this._active) return
    this._active = true
    try {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition")
      this._plugin = SpeechRecognition

      const perm = await SpeechRecognition.requestPermissions()
      const granted = perm?.speechRecognition === "granted" || perm?.microphone === "granted"
      if (!granted) {
        this.onerror?.({ error: "not-allowed" })
        this._end()
        return
      }

      this.onstart?.()
      // popup:true uses the system Google speech dialog — most reliable across OEMs
      const res = await SpeechRecognition.start({
        language:       this.lang,
        maxResults:     this.maxAlternatives || 5,
        prompt:         "बोलो / Speak now...",
        partialResults: false,
        popup:          true,
      })
      if (!this._active) return   // stopped by user meanwhile

      const matches = (res?.matches || []).map(m => m?.trim()).filter(Boolean)
      if (matches.length) {
        this.onresult?.({ results: toResultList(matches), resultIndex: 0 })
      } else {
        this.onerror?.({ error: "no-speech" })
      }
    } catch (e) {
      if (this._active) this.onerror?.({ error: toErrorCode(e) })
    } finally {
      this._end()
    }
  }

  stop() {
    try { this._plugin?.stop() } catch {}
    this._end()
  }

  abort() {
    this.stop()
  }
}

/** SpeechRecognition constructor for this platform, or undefined if unsupported. */
export function getSpeechRecognition() {
  if (isNative()) return NativeSpeechRecognition
  return window.SpeechRecognition || window.webkitSpeechRecognition
}
