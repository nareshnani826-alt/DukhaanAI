import {
  getLearnedMatches,
} from "./learningStore"

export function rankMatches(
  spoken,
  fuzzyMatches
) {
  const learned =
    getLearnedMatches(spoken)

  return fuzzyMatches.map((m) => {
    const learnedBoost =
      learned.find(
        (l) =>
          l.product.toLowerCase() ===
          m.product.name.toLowerCase()
      )?.count || 0

    return {
      ...m,
      finalScore:
        m.score + learnedBoost * 0.1,
    }
  })
  .sort((a, b) =>
    b.finalScore - a.finalScore
  )
}