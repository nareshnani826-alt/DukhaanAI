// geminiParse.js — Gemini Flash API fallback for product description parsing
// Free tier: 1 million tokens/day (gemini-1.5-flash)
// Set VITE_GEMINI_API_KEY in .env to enable

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"

const PROMPT_TEMPLATE = (text) => `You are a product catalog assistant for an Indian jewellery/accessories store.
Extract product details from the description below. Return ONLY valid JSON — no explanation, no markdown.

VALID VALUES:
- category: Bangles | Earrings | Necklace | Anklet | Hair Clip | Bindi | Rings | Other
- colours: Red, Pink, Maroon, Green, Blue, Navy, Gold, Rose Gold, Silver, White, Black, Orange, Yellow, Purple, Peach, Multi
- designs: Plain, Kundan, Meenakari, Stone Work, Mirror Work, Lac, Metal, Glass, Pearl, Crystal, Thread, Oxidized, Zari, Antique
- sizes for Bangles: 2.2 2.4 2.6 2.8 2.10 2.12 2.14 Free Size
- sizes for Rings: 6 7 8 9 10 11 12 Free Size
- sizes for others: Small Medium Large Free Size (and type-specific)
- mrp / cost_price: numbers only (Indian rupees)
- gst_percent: 0, 3, 5, 12, or 18 only

Description: "${text}"

JSON schema (use null for missing, empty arrays for none):
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

export async function geminiParseProduct(text) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY not set in .env")

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT_TEMPLATE(text) }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Gemini API error ${res.status}: ${err.error?.message || "unknown"}`)
  }

  const data = await res.json()
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

  // Extract JSON block from response (handles markdown code fences)
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Gemini returned no JSON")

  const parsed = JSON.parse(jsonMatch[0])

  return {
    name:        typeof parsed.name === "string" && parsed.name ? parsed.name : null,
    category:    typeof parsed.category === "string" && parsed.category ? parsed.category : null,
    mrp:         typeof parsed.mrp === "number" && parsed.mrp > 0 ? parsed.mrp : null,
    cost_price:  typeof parsed.cost_price === "number" && parsed.cost_price > 0 ? parsed.cost_price : null,
    gst_percent: typeof parsed.gst_percent === "number" ? parsed.gst_percent : null,
    colours:     Array.isArray(parsed.colours) ? parsed.colours.filter(Boolean) : [],
    sizes:       Array.isArray(parsed.sizes)   ? parsed.sizes.filter(Boolean)   : [],
    designs:     Array.isArray(parsed.designs) ? parsed.designs.filter(Boolean) : [],
    confidence:  0.9,
    source:      "gemini",
  }
}
