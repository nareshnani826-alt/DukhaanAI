// geminiVision.js — Gemini 1.5 Flash Vision: photo → product fields
// Works with price tags, product photos, handwritten labels, supplier catalogues

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

const VISION_PROMPT = `You are reading a price tag, product label, or product photo from an Indian jewellery and accessories shop.
Extract all visible product details and return ONLY valid JSON — no explanation, no markdown fences.

What to look for:
- Product name: written on tag, or describe the product you see (e.g. "Kundan Bangle", "Pearl Earrings")
- Category: must be exactly one of — Bangles | Earrings | Necklace | Anklet | Hair Clip | Bindi | Rings | Other
- MRP or price: look for ₹ symbol, "MRP", "Rate", "Price", "Rs.", "Daam", "Bhav"
- Colours: visible in product photo or mentioned on tag
- Sizes: bangle sizes like 2.2/2.4/2.6/2.8/2.10/2.12/2.14, ring sizes 6-12, or Small/Medium/Large/Free Size
- Design: visible craftsmanship or mentioned on tag

VALID colours (use only these): Red, Pink, Maroon, Green, Blue, Navy, Gold, Rose Gold, Silver, White, Black, Orange, Yellow, Purple, Peach, Multi
VALID designs (use only these): Plain, Kundan, Meenakari, Stone Work, Mirror Work, Lac, Metal, Glass, Pearl, Crystal, Thread, Oxidized, Zari, Antique
VALID gst_percent values: 0, 3, 5, 12, 18

Return JSON only (null for anything not visible, empty array if none):
{
  "name": null,
  "category": null,
  "mrp": null,
  "cost_price": null,
  "gst_percent": null,
  "colours": [],
  "sizes": [],
  "designs": []
}`

export async function scanImageForProduct(imageBase64, mimeType = "image/jpeg") {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY not set in frontend/.env")

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: VISION_PROMPT },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Gemini Vision ${res.status}: ${err.error?.message || "check API key"}`)
  }

  const data   = await res.json()
  const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  const jsonM  = raw.match(/\{[\s\S]*\}/)
  if (!jsonM) throw new Error("Gemini Vision returned no JSON")

  const p = JSON.parse(jsonM[0])

  return {
    name:        typeof p.name        === "string"  && p.name        ? p.name        : null,
    category:    typeof p.category    === "string"  && p.category    ? p.category    : null,
    mrp:         typeof p.mrp         === "number"  && p.mrp   > 0   ? p.mrp         : null,
    cost_price:  typeof p.cost_price  === "number"  && p.cost_price > 0 ? p.cost_price : null,
    gst_percent: typeof p.gst_percent === "number"                    ? p.gst_percent : null,
    colours:     Array.isArray(p.colours) ? p.colours.filter(Boolean) : [],
    sizes:       Array.isArray(p.sizes)   ? p.sizes.filter(Boolean)   : [],
    designs:     Array.isArray(p.designs) ? p.designs.filter(Boolean) : [],
    confidence:  0.85,
    source:      "gemini-vision",
  }
}

// File → { base64, mimeType } — strips data URI prefix
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve({
      base64:   reader.result.split(",")[1],
      mimeType: file.type || "image/jpeg",
      preview:  reader.result,           // full data URL for <img> preview
    })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
