import { getLearnedMatches } from "./learningStore"

function learnedBoost(count) {
  return Math.min(0.6, count * 0.25)
}

// Canonical colour → list of synonyms / alternate spellings / transliterations
const COLOR_SYNONYMS = {
  red:    ["red","lal","laal","scarlet","crimson","ruby","rose","maroon","reddish",
           "errupu","errapu","erra","enkha"],                         // Telugu: ఎరుపు
  green:  ["green","hara","hari","hare","emerald","jade","lime","olive","pachha",
           "pacchi","pachi","pachchi","pachchhi","paccha","harita","pasupupacha"],
  blue:   ["blue","neela","neel","nila","azure","cobalt","navy","sky","sapphire",
           "indigo","cerulean","nilam","nilambu"],
  yellow: ["yellow","pila","peela","gold","golden","amber","saffron","sunheri",
           "sunahri","pasupu","pasupa"],
  pink:   ["pink","gulabi","gulaabi","rose","magenta","peach","blush","light red"],
  white:  ["white","safed","safaid","tella","thella","velupudu","cream","ivory"],
  black:  ["black","kala","kaala","nalupati","nalla","nallu"],
  purple: ["purple","violet","lavender","jamuni","baingani","lilac"],
  orange: ["orange","narangi","naranja","saffron"],
  silver: ["silver","chandi","chandee","sliver"],
  brown:  ["brown","bhura","coffee","chocolate"],
  grey:   ["grey","gray","ash","ashy"],
}

// Flat map: every alias → canonical colour name
const ALIAS_TO_CANON = {}
for (const [canon, aliases] of Object.entries(COLOR_SYNONYMS)) {
  for (const alias of aliases) ALIAS_TO_CANON[alias] = canon
}

// Extract canonical colour names from any text
export function extractColors(text) {
  if (!text) return []
  const lower = text.toLowerCase()
  const found = new Set()
  for (const alias of Object.keys(ALIAS_TO_CANON)) {
    const re = new RegExp(`\\b${alias.replace(/\s/g,"\\s+")}\\b`)
    if (re.test(lower)) found.add(ALIAS_TO_CANON[alias])
  }
  return [...found]
}

// +0.45 match, -0.55 mismatch — but ONLY penalise when a matching candidate exists
function colorScore(spokenColors, productName, hasMatchingCandidate) {
  if (spokenColors.length === 0) return 0
  const nameColors = extractColors(productName)
  if (nameColors.length === 0) return 0           // product has no colour word → neutral
  const match = spokenColors.some(c => nameColors.includes(c))
  if (match) return 0.45
  // Penalise wrong colour only when at least one candidate has the right colour
  if (hasMatchingCandidate) return -0.55
  return 0
}

export function rankMatches(spoken, fuzzyMatches, originalText = "") {
  const learned = getLearnedMatches(spoken)

  // Collect colours from BOTH translated text and original (catches Telugu words
  // that the translation model renders as idioms like "emerald"/"dime a dozen")
  const allText      = `${spoken || ""} ${originalText || ""}`.trim()
  const spokenColors = extractColors(allText)

  // Check whether ANY candidate already has the spoken colour (drives penalty logic)
  const hasMatchingCandidate = fuzzyMatches.some(m =>
    spokenColors.some(c => extractColors(m.product?.name || "").includes(c))
  )

  return fuzzyMatches
    .map(m => {
      const learnedEntry = learned.find(
        l => l.product.toLowerCase() === m.product?.name?.toLowerCase()
      )
      const boost  = learnedBoost(learnedEntry?.count || 0)
      const colour = colorScore(spokenColors, m.product?.name || "", hasMatchingCandidate)
      return {
        ...m,
        learnedCount: learnedEntry?.count || 0,
        finalScore: (m.score || 0) + boost + colour,
      }
    })
    .sort((a, b) => b.finalScore - a.finalScore)
}
