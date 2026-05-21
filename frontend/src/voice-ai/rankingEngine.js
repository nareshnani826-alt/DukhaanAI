import { getLearnedMatches } from "./learningStore"

// Boost formula: each confirmation adds 0.25, capped at 0.6
// After 3 confirmations boost = 0.6 — enough to dominate any fuse/phonetic score
function learnedBoost(count) {
  return Math.min(0.6, count * 0.25)
}

export function rankMatches(spoken, fuzzyMatches) {
  const learned = getLearnedMatches(spoken)

  return fuzzyMatches
    .map(m => {
      const learnedEntry = learned.find(
        l => l.product.toLowerCase() === m.product?.name?.toLowerCase()
      )
      const boost = learnedBoost(learnedEntry?.count || 0)
      return {
        ...m,
        learnedCount: learnedEntry?.count || 0,
        finalScore: (m.score || 0) + boost,
      }
    })
    .sort((a, b) => b.finalScore - a.finalScore)
}
