// useProductVoice.js — Voice input hook for the Add Product form
// Continuous speech recognition with auto field-fill and multilingual support
import { useState, useRef, useEffect } from "react"
import { translateToEnglish, detectPlatform } from "./engine.js"

// ── Lookup maps ───────────────────────────────────────────────
const CATS_MAP = {
  "bangle": "Bangles",   "bangles": "Bangles",
  "earring": "Earrings", "earrings": "Earrings",
  "necklace": "Necklace","necklaces": "Necklace",
  "anklet": "Anklet",    "anklets": "Anklet",
  "hair clip": "Hair Clip", "hairclip": "Hair Clip",
  "bindi": "Bindi",
  "ring": "Rings",       "rings": "Rings",
  "other": "Other",
}

const COLOUR_VOICE = {
  "red": "Red",       "lal": "Red",    "laal": "Red",
  "pink": "Pink",     "gulabi": "Pink","rani": "Pink",
  "green": "Green",   "hara": "Green", "hari": "Green",
  "blue": "Blue",     "nila": "Blue",
  "gold": "Gold",     "golden": "Gold","sona": "Gold",
  "silver": "Silver", "chandi": "Silver",
  "white": "White",   "safed": "White",
  "black": "Black",   "kala": "Black",
  "orange": "Orange", "narangi": "Orange",
  "purple": "Purple",
  "multi": "Multi",   "multicolor": "Multi", "multicolour": "Multi",
}

const DESIGN_VOICE = {
  "plain": "Plain",
  "kundan": "Kundan",
  "meenakari": "Meenakari",   "minakari": "Meenakari",
  "stone work": "Stone Work", "stone": "Stone Work",
  "mirror work": "Mirror Work","mirror": "Mirror Work",
  "lac": "Lac", "lakh": "Lac", "lakk": "Lac",
  "metal": "Metal",
  "glass": "Glass",
}

// ── Language options shown in the voice panel ─────────────────
export const VOICE_LANGS = [
  { code: "en-IN", label: "EN",   name: "English"  },
  { code: "hi-IN", label: "हि",   name: "Hindi"    },
  { code: "te-IN", label: "తె",   name: "Telugu"   },
  { code: "ta-IN", label: "தமி", name: "Tamil"    },
  { code: "mr-IN", label: "मर",   name: "Marathi"  },
  { code: "kn-IN", label: "ಕನ",  name: "Kannada"  },
  { code: "gu-IN", label: "ગુ",   name: "Gujarati" },
  { code: "bn-IN", label: "বাং",  name: "Bengali"  },
]

// ── Helpers ───────────────────────────────────────────────────
function stripNum(s) {
  // "2,500" → "2500", strips currency symbols
  return String(parseInt(s.replace(/[₹,\s]/g, ""), 10))
}

function toTitleCase(str) {
  return str.trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

function cleanName(s) {
  // Strip trailing Hindi/English fillers: "Gold Bangle hai" → "Gold Bangle"
  return s.replace(/\s+(?:hai|he|hi|hain|tha|ha|is|are|be|ho)$/i, "").trim()
}

// ── NLP parser: sentence → { field, value, label } ───────────
// Tries to identify which product field the user is describing.
export function parseProductCommand(text) {
  if (!text) return null
  const raw = text.trim()

  // Product Name ─────────────────────────────────────────────
  for (const re of [
    /(?:product\s+)?name\s+(?:is|are|ko|=|:)?\s*(.+)/i,
    /(?:naam|name)\s+(?:hai|is|ko|=|:)?\s*(.+)/i,
    /(?:iska\s+naam|product\s+naam|product\s+ka\s+naam)\s+(?:hai|is)?\s*(.+)/i,
    /(?:call\s+it|name\s+it|set\s+name\s+(?:to|as))\s+(.+)/i,
    /(?:item\s+name|product\s+title)\s+(?:is|=|:)?\s*(.+)/i,
    /(?:peru|peyar|hesaru)\s+(?:is|enti|=)?\s*(.+)/i,   // Telugu/Kannada
  ]) {
    const m = raw.match(re)
    if (m) {
      const val = cleanName(m[1])
      if (val.length >= 2 && val.length <= 80)
        return { field: "name", value: toTitleCase(val), label: "Product Name" }
    }
  }

  // MRP ──────────────────────────────────────────────────────
  for (const re of [
    /(?:mrp|m\.r\.p\.?|maximum\s+retail\s+price)\s*(?:is|=|:)?\s*(?:rupees?|rs\.?|₹)?\s*(\d[\d,]*)/i,
    /(?:retail\s+price|selling\s+price|sale\s+price|market\s+price)\s*(?:is|=|:)?\s*(?:rupees?|rs\.?|₹)?\s*(\d[\d,]*)/i,
    /(?:rate|price|bhav|daam|kimat|keemat|dhara)\s*(?:is|=|:)?\s*(?:rupees?|rs\.?|₹)?\s*(\d[\d,]*)/i,
  ]) {
    const m = raw.match(re)
    if (m) {
      const val = stripNum(m[1])
      if (+val > 0) return { field: "mrp", value: val, label: "MRP" }
    }
  }

  // Cost Price ───────────────────────────────────────────────
  for (const re of [
    /(?:cost\s+price|purchase\s+price|buying\s+price|buy\s+price|wholesale\s+price)\s*(?:is|=|:)?\s*(?:rupees?|rs\.?|₹)?\s*(\d[\d,]*)/i,
    /(?:cost|lagat|kharid(?:ari)?|mool\s+kimat|kharidi\s+dhara)\s*(?:is|=|:)?\s*(?:rupees?|rs\.?|₹)?\s*(\d[\d,]*)/i,
  ]) {
    const m = raw.match(re)
    if (m) {
      const val = stripNum(m[1])
      if (+val > 0) return { field: "cost_price", value: val, label: "Cost Price" }
    }
  }

  // Category ─────────────────────────────────────────────────
  for (const re of [
    /(?:category|type|item\s+type|product\s+type)\s*(?:is|=|:)?\s*(.+)/i,
    /(?:it(?:'?s?)\s+(?:a|an)|this\s+is\s+(?:a|an))\s+(.+)/i,
  ]) {
    const m = raw.match(re)
    if (m) {
      const catRaw = m[1].toLowerCase().trim()
      for (const [key, val] of Object.entries(CATS_MAP)) {
        if (catRaw.includes(key)) return { field: "category", value: val, label: "Category" }
      }
    }
  }

  // GST ──────────────────────────────────────────────────────
  for (const re of [
    /(?:gst|tax|vat)\s*(?:percent|%|percentage)?\s*(?:is|=|:)?\s*(\d+)/i,
    /(\d+)\s*%?\s*(?:gst|tax)/i,
  ]) {
    const m = raw.match(re)
    if (m) {
      const pct = parseInt(m[1], 10)
      if ([0, 3, 5, 12, 18].includes(pct)) return { field: "gst_percent", value: pct, label: "GST %" }
    }
  }

  // Colour ───────────────────────────────────────────────────
  for (const re of [
    /(?:colou?r|rang)\s*(?:is|=|:)?\s*(.+)/i,
    /(?:add|set)\s+colou?r\s+(?:to\s+)?(.+)/i,
  ]) {
    const m = raw.match(re)
    if (m) {
      const word = m[1].toLowerCase().trim().split(/\s+and\s+|\s*,\s*/)[0]
      for (const [key, val] of Object.entries(COLOUR_VOICE)) {
        if (word.includes(key)) return { field: "colour_toggle", value: val, label: `Colour: ${val}` }
      }
    }
  }

  // Size ─────────────────────────────────────────────────────
  // Covers bangle diameters (2.4), ring sizes (8), and t-shirt-style sizes
  for (const re of [
    /(?:size|saiz|naap|ring\s+size|bangle\s+size)\s*(?:is|=|:)?\s*([\d]+\.[\d]+)/i,
    /(?:size|saiz|ring\s+size)\s*(?:is|=|:)?\s*(\d+)(?!\.\d)/i,
    /(?:size|saiz)\s*(?:is|=|:)?\s*(free\s*size|small|medium|large|studs?|drops?|hoops?|jhumka|choker|short|long|mala)/i,
  ]) {
    const m = raw.match(re)
    if (m) {
      const raw2 = m[1].trim()
      const val  = raw2.toLowerCase() === "free size" || raw2.toLowerCase() === "free"
        ? "Free Size"
        : raw2.charAt(0).toUpperCase() + raw2.slice(1).toLowerCase()
      return { field: "size_toggle", value: val, label: `Size: ${val}` }
    }
  }

  // Design / Model ───────────────────────────────────────────
  for (const re of [
    /(?:design|model|naksha|style)\s*(?:is|=|:)?\s*(.+)/i,
  ]) {
    const m = raw.match(re)
    if (m) {
      const word = m[1].toLowerCase().trim()
      for (const [key, val] of Object.entries(DESIGN_VOICE)) {
        if (word.includes(key)) return { field: "design_toggle", value: val, label: `Design: ${val}` }
      }
    }
  }

  // Stock per variant ────────────────────────────────────────
  for (const re of [
    /(?:opening\s+)?stock\s*(?:is|=|:)?\s*(\d+)/i,
    /(?:quantity|qty|mal)\s*(?:is|=|:)?\s*(\d+)/i,
    /(\d+)\s*(?:pieces?|pcs|nag)\s*(?:per\s+variant)?$/i,
  ]) {
    const m = raw.match(re)
    if (m) {
      const val = parseInt(m[1], 10)
      if (val >= 0) return { field: "stock_per", value: val, label: `Stock: ${val}` }
    }
  }

  return null
}

// ── Hook ──────────────────────────────────────────────────────
// onField(fieldName, value) — called when a field is successfully parsed
// lang — BCP-47 language code, e.g. "hi-IN"
export function useProductVoice({ onField, lang = "hi-IN" }) {
  const [listening,  setListening]  = useState(false)
  const [transcript, setTranscript] = useState("")
  const [lastHit,    setLastHit]    = useState(null)   // { field, label, value }
  const [error,      setError]      = useState("")
  const [supported,  setSupported]  = useState(true)

  const recRef  = useRef(null)
  const langRef = useRef(lang)

  useEffect(() => { langRef.current = lang }, [lang])

  useEffect(() => {
    const { hasSpeechAPI } = detectPlatform()
    setSupported(hasSpeechAPI)
    return () => { try { recRef.current?.stop() } catch {} }
  }, [])

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSupported(false); return }

    setError(""); setTranscript(""); setLastHit(null)

    const rec = new SR()
    rec.lang            = langRef.current
    rec.continuous      = true    // keep listening until user stops
    rec.interimResults  = true    // show live transcript while speaking
    rec.maxAlternatives = 5       // pick highest-confidence alternative

    const autoStop = setTimeout(() => { try { rec.stop() } catch {} }, 30000)

    rec.onstart = () => setListening(true)

    rec.onend = () => {
      clearTimeout(autoStop)
      setListening(false)
    }

    rec.onerror = (e) => {
      clearTimeout(autoStop)
      setListening(false)
      if (e.error === "aborted") return
      const msgs = {
        "no-speech":     "No speech heard. Tap mic and speak clearly.",
        "not-allowed":   "Microphone blocked. Allow mic in browser settings.",
        "network":       "Network error — check internet connection.",
        "audio-capture": "No microphone found.",
      }
      setError(msgs[e.error] ?? "Voice error — try again.")
    }

    rec.onresult = async (e) => {
      const idx    = e.resultIndex
      const result = e.results[idx]

      // Show live interim transcript while the user is still speaking
      if (!result.isFinal) {
        setTranscript(result[0].transcript)
        return
      }

      // Sentence complete — pick highest-confidence alternative
      let best = result[0]
      for (let i = 1; i < result.length; i++) {
        if (result[i].confidence > best.confidence) best = result[i]
      }
      const raw = best.transcript.trim()
      setTranscript(raw)

      // 1. Try parsing the original text (works for English and transliterated Hindi)
      let hit = parseProductCommand(raw)

      // 2. If unclear, translate to English and retry (for Devanagari / regional scripts)
      if (!hit && langRef.current !== "en-IN") {
        try {
          const eng = await translateToEnglish(raw, langRef.current.split("-")[0])
          if (eng && eng !== raw) hit = parseProductCommand(eng)
        } catch {}
      }

      if (hit) {
        setLastHit(hit)
        setError("")
        onField(hit.field, hit.value)
      } else {
        setError(`Didn't catch that. Try: "Product name is Kundan Bangle"`)
      }
    }

    recRef.current = rec
    try {
      rec.start()
    } catch {
      setError("Could not start microphone. Check browser permissions.")
      setListening(false)
    }
  }

  function stopListening() {
    try { recRef.current?.stop() } catch {}
    setListening(false)
  }

  return { listening, transcript, lastHit, error, supported, startListening, stopListening }
}
