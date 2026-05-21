import Fuse from "fuse.js"

export function createAdaptiveMatcher(products = []) {
  const searchableProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category || "",
    // Include aliases so Fuse.js can match on regional/Hindi names directly
    searchText: `${p.name} ${p.category || ""} ${(p.aliases || []).join(" ")}`.toLowerCase(),
  }))

  const fuse = new Fuse(searchableProducts, {
    keys: ["searchText"],
    includeScore: true,
    threshold: 0.4,
  })

  function findMatches(text) {
    if (!text?.trim()) return []

    const results = fuse.search(text.toLowerCase())

    return results.slice(0, 5).map((r) => ({
      product: r.item,
      score: 1 - (r.score || 0),
    }))
  }

  return {
    findMatches,
  }
}