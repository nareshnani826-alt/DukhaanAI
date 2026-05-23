// productLearner.js — Learns product patterns from what the user saves
// Stores frequency data in localStorage, suggests defaults per category

const KEY = "dk_product_learner"

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") } catch { return {} }
}
function persist(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}

// Call this every time a product+variants is successfully saved
export function learnProduct({ category, colours = [], sizes = [], designs = [], mrp, cost_price }) {
  if (!category) return
  const store = load()
  if (!store[category]) store[category] = { colours:{}, sizes:{}, designs:{}, markups:[] }
  const c = store[category]

  colours.forEach(col => { c.colours[col] = (c.colours[col] || 0) + 1 })
  sizes.forEach(sz    => { c.sizes[sz]    = (c.sizes[sz]    || 0) + 1 })
  designs.forEach(des => { c.designs[des] = (c.designs[des] || 0) + 1 })

  if (mrp > 0 && cost_price > 0) {
    const ratio = +(mrp / cost_price).toFixed(2)
    c.markups.push(ratio)
    if (c.markups.length > 50) c.markups = c.markups.slice(-50)
  }

  persist(store)
}

// Returns top colours/sizes/designs previously used for this category
export function suggestDefaults(category) {
  const store = load()
  const c = store[category]
  if (!c) return { colours: [], sizes: [], designs: [] }

  const top = (obj, n = 3) =>
    Object.entries(obj || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k)

  return {
    colours: top(c.colours, 3),
    sizes:   top(c.sizes,   3),
    designs: top(c.designs, 2),
  }
}

// Suggests MRP based on typical markup ratio for this category
// Returns 0 if not enough data (caller should skip suggestion)
export function suggestMRP(cost, category) {
  if (!cost || cost <= 0) return 0
  const store = load()
  const c = store[category]
  if (!c?.markups?.length) return 0

  const avg = c.markups.reduce((s, v) => s + v, 0) / c.markups.length
  return Math.round(cost * avg)
}

// Returns all stored data (for debugging / admin)
export function getAllLearned() {
  return load()
}

// Clear a specific category's learning
export function clearCategory(category) {
  const store = load()
  delete store[category]
  persist(store)
}
