// parseProductDescription.js
// Parses a freeform description → all product fields at once
// e.g. "Kundan bangle, red and pink, size 2.4, MRP 2500, cost 1800"

const CATS_MAP = {
  "bangle":"Bangles", "bangles":"Bangles",
  "earring":"Earrings","earrings":"Earrings",
  "necklace":"Necklace","necklaces":"Necklace",
  "anklet":"Anklet","anklets":"Anklet",
  "hair clip":"Hair Clip","hairclip":"Hair Clip",
  "bindi":"Bindi",
  "ring":"Rings","rings":"Rings",
  "other":"Other",
}

const COLOUR_KEYS = {
  "red":"Red","lal":"Red","laal":"Red",
  "pink":"Pink","gulabi":"Pink","rani":"Pink",
  "maroon":"Maroon",
  "green":"Green","hara":"Green","hari":"Green",
  "blue":"Blue","nila":"Blue",
  "navy":"Navy",
  "gold":"Gold","golden":"Gold","sona":"Gold",
  "rose gold":"Rose Gold",
  "silver":"Silver","chandi":"Silver",
  "white":"White","safed":"White",
  "black":"Black","kala":"Black",
  "orange":"Orange","narangi":"Orange",
  "yellow":"Yellow","peela":"Yellow",
  "purple":"Purple",
  "peach":"Peach",
  "multi":"Multi","multicolor":"Multi","multicolour":"Multi",
}

const DESIGN_KEYS = {
  "plain":"Plain",
  "kundan":"Kundan",
  "meenakari":"Meenakari","minakari":"Meenakari",
  "stone work":"Stone Work","stone":"Stone Work",
  "mirror work":"Mirror Work","mirror":"Mirror Work",
  "lac":"Lac","lakh":"Lac","lakk":"Lac",
  "metal":"Metal",
  "glass":"Glass",
  "pearl":"Pearl",
  "crystal":"Crystal",
  "thread":"Thread",
  "oxidized":"Oxidized","oxidised":"Oxidized",
  "zari":"Zari",
  "antique":"Antique",
}

function toTitleCase(str) {
  return str.trim().split(/\s+/).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ")
}

function stripNum(s) {
  return parseInt(String(s).replace(/[₹,\s]/g, ""), 10)
}

// ── Main parser ───────────────────────────────────────────────
export function parseProductDescription(text) {
  if (!text?.trim()) return null
  const raw = text.trim()
  const tl  = raw.toLowerCase()

  const result = {
    name: null, category: null, mrp: null, cost_price: null,
    gst_percent: null, colours: [], sizes: [], designs: [],
    confidence: 0, source: "local",
  }

  // ── Category ──────────────────────────────────────────────
  // Check multi-word keys first (e.g. "hair clip" before "hair")
  const catKeys = Object.keys(CATS_MAP).sort((a,b) => b.length - a.length)
  for (const key of catKeys) {
    if (tl.includes(key)) { result.category = CATS_MAP[key]; break }
  }

  // ── MRP ───────────────────────────────────────────────────
  const mrpPatterns = [
    /(?:mrp|m\.r\.p\.?|maximum\s+retail\s+price)\s*(?:is|=|:)?\s*(?:rs\.?|₹|rupees?)?\s*(\d[\d,]*)/i,
    /(?:retail\s+price|selling\s+price|sale\s+price|market\s+price)\s*(?:is|=|:)?\s*(?:rs\.?|₹|rupees?)?\s*(\d[\d,]*)/i,
    /(?:rate|price|bhav|daam|kimat|keemat|dhara)\s*(?:is|=|:)?\s*(?:rs\.?|₹|rupees?)?\s*(\d[\d,]*)/i,
  ]
  for (const re of mrpPatterns) {
    const m = raw.match(re)
    if (m) { const v = stripNum(m[1]); if (v > 0) { result.mrp = v; break } }
  }

  // ── Cost Price ────────────────────────────────────────────
  const costPatterns = [
    /(?:cost\s+price|purchase\s+price|buying\s+price|wholesale\s+price)\s*(?:is|=|:)?\s*(?:rs\.?|₹|rupees?)?\s*(\d[\d,]*)/i,
    /(?:cost|lagat|kharid(?:ari)?|mool\s+kimat)\s*(?:is|=|:)?\s*(?:rs\.?|₹|rupees?)?\s*(\d[\d,]*)/i,
  ]
  for (const re of costPatterns) {
    const m = raw.match(re)
    if (m) { const v = stripNum(m[1]); if (v > 0) { result.cost_price = v; break } }
  }

  // ── GST ───────────────────────────────────────────────────
  const gstM = raw.match(/(\d+)\s*%?\s*(?:gst|tax)/i)
  if (gstM) {
    const pct = parseInt(gstM[1])
    if ([0,3,5,12,18].includes(pct)) result.gst_percent = pct
  }

  // ── Colours ───────────────────────────────────────────────
  // Check multi-word colour keys first (e.g. "rose gold")
  const colKeys = Object.keys(COLOUR_KEYS).sort((a,b) => b.length - a.length)
  for (const key of colKeys) {
    const re = new RegExp(`\\b${key.replace(/\s+/g,"\\s+")}\\b`, "gi")
    if (re.test(tl)) {
      const val = COLOUR_KEYS[key]
      if (!result.colours.includes(val)) result.colours.push(val)
    }
  }

  // ── Sizes ─────────────────────────────────────────────────
  // Bangle diameters: 2.2 / 2.4 / 2.10 etc.
  for (const m of tl.matchAll(/\b(2\.[0-9]{1,2})\b/g)) {
    const v = m[1]
    if (!result.sizes.includes(v)) result.sizes.push(v)
  }
  // Ring / numeric sizes that don't look like bangle diameters
  for (const m of tl.matchAll(/\bsize\s+(\d+)(?!\.\d)\b/gi)) {
    const v = m[1]
    if (!result.sizes.includes(v)) result.sizes.push(v)
  }
  // Text sizes
  const textSizeRe = /\bsize\s*(free\s*size|small|medium|large|studs?|drops?|hoops?|jhumka|choker|short|long|mala)\b/gi
  for (const m of raw.matchAll(textSizeRe)) {
    const raw2 = m[1].trim()
    const val  = raw2.toLowerCase() === "free size" ? "Free Size" : toTitleCase(raw2)
    if (!result.sizes.includes(val)) result.sizes.push(val)
  }

  // ── Designs ───────────────────────────────────────────────
  const desKeys = Object.keys(DESIGN_KEYS).sort((a,b) => b.length - a.length)
  for (const key of desKeys) {
    const re = new RegExp(`\\b${key.replace(/\s+/g,"\\s+")}\\b`, "gi")
    if (re.test(tl)) {
      const val = DESIGN_KEYS[key]
      if (!result.designs.includes(val)) result.designs.push(val)
    }
  }

  // ── Name — take the first comma-segment, strip known field tokens ──
  const firstSeg = raw.split(/\s*[,;|]\s*/)[0]?.trim() || ""
  // Only use as name if it doesn't look like a price/size
  if (firstSeg && !/^\d/.test(firstSeg) && !/(rs\.|₹|\d+%|gst|cost|mrp)/i.test(firstSeg)) {
    let nameCandidate = firstSeg
      .replace(/\b(hai|he|hi|hain|tha|ha|is|are|be|ho)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
    if (nameCandidate.length >= 2 && nameCandidate.length <= 80) {
      result.name = toTitleCase(nameCandidate)
    }
  }

  // ── Confidence ────────────────────────────────────────────
  let hits = 0
  if (result.name)       hits++
  if (result.category)   hits++
  if (result.mrp)        hits++
  if (result.cost_price) hits++
  result.confidence = hits / 4

  return result
}
