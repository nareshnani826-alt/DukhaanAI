const STORAGE_KEY = "dk_learning_store"

function loadStore() {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "{}"
    )
  } catch {
    return {}
  }
}

function saveStore(store) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(store)
  )
}

export function learnCorrection(
  spoken,
  selected
) {
  const store = loadStore()

  const key = spoken.toLowerCase()

  if (!store[key]) {
    store[key] = {}
  }

  store[key][selected] =
    (store[key][selected] || 0) + 1

  saveStore(store)
}

export function getLearnedMatches(spoken) {
  const store = loadStore()

  const key = spoken.toLowerCase()

  if (!store[key]) return []

  return Object.entries(store[key])
    .sort((a, b) => b[1] - a[1])
    .map(([product, count]) => ({
      product,
      count,
    }))
}