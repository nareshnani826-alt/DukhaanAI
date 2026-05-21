import { useState, useEffect, useCallback } from "react"
import { Products } from "../sync/db"
import { createAdaptiveMatcher } from "../voice-ai/adaptiveMatcher"
import { rankMatches } from "../voice-ai/rankingEngine"
import {
  learnCorrection,
  getLearnedMatches,
  getAutoConfirmMatch,
  getAllLearned,
  deleteLearnedKey,
  AUTO_CONFIRM_THRESHOLD,
} from "../voice-ai/learningStore"
import { phoneticMatch } from "../voice/phonetic"

export default function AITest() {
  const [products,      setProducts]      = useState([])
  const [matcher,       setMatcher]       = useState(null)
  const [query,         setQuery]         = useState("")
  const [results,       setResults]       = useState([])
  const [autoConfirmed, setAutoConfirmed] = useState(null)
  const [confirmed,     setConfirmed]     = useState(null)
  const [wrongMode,     setWrongMode]     = useState(false)
  const [history,       setHistory]       = useState({})

  useEffect(() => {
    Products.list().then(res => {
      const list = Array.isArray(res) ? res : (res?.data || [])
      setProducts(list)
      setMatcher(createAdaptiveMatcher(list))
    })
    setHistory(getAllLearned())
  }, [])

  const runSearch = useCallback((text, currentMatcher, currentProducts) => {
    setConfirmed(null)
    setWrongMode(false)
    setAutoConfirmed(null)

    if (!text.trim() || !currentMatcher) { setResults([]); return }

    // Auto-confirm: system already learned this word strongly enough
    const autoMatch = getAutoConfirmMatch(text)
    if (autoMatch) { setAutoConfirmed(autoMatch); setResults([]); return }

    // Fuse.js fuzzy matches
    const fuseMatches = currentMatcher.findMatches(text)

    // Phonetic match (Soundex + Metaphone + Levenshtein + brand dictionary)
    const names = currentProducts.map(p => p.name)
    const phonetic = phoneticMatch(text, names)

    // Merge: inject phonetic result if not already in fuse results
    let combined = [...fuseMatches]
    if (phonetic) {
      const existing = combined.find(m => m.product?.name === phonetic.product)
      if (!existing) {
        const prod = currentProducts.find(p => p.name === phonetic.product)
        if (prod) combined.push({ product: { id: prod.id, name: prod.name, category: prod.category }, score: phonetic.confidence, method: phonetic.method })
      } else {
        existing.score    = Math.max(existing.score, phonetic.confidence)
        existing.method   = "phonetic+fuse"
      }
    }

    // Apply learned ranking boost
    setResults(rankMatches(text, combined).slice(0, 6))
  }, [])

  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    runSearch(val, matcher, products)
  }

  function handleConfirm(productName) {
    learnCorrection(query, productName)
    setConfirmed(productName)
    setWrongMode(false)
    setResults([])
    setHistory(getAllLearned())
  }

  function handleDelete(spoken) {
    deleteLearnedKey(spoken)
    setHistory(getAllLearned())
  }

  const topResult    = results[0]
  const learnedCount = query ? (getLearnedMatches(query)[0]?.count || 0) : 0
  const toAutoConfirm = Math.max(0, AUTO_CONFIRM_THRESHOLD - learnedCount)

  const methodLabel = m => ({
    "brand-phonetic": "🔊 brand dict",
    "phonetic":       "🔊 phonetic",
    "phonetic+fuse":  "🔊+🔍 both",
    "phonetic+":      "🔊+🔍 both",
  })[m] || "🔍 fuse"

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      {/* Header */}
      <div className="page-sticky-header mb-4">
        <h1 className="text-sm font-semibold">AI Matcher Lab 🧠</h1>
        <p className="text-[10px] text-gray-400">
          Type what you'd say — confirm matches to train your shop's vocabulary
        </p>
      </div>

      {/* Search input */}
      <input
        value={query}
        onChange={handleInput}
        placeholder="Try: magi, ammool, kok, parley jee, aata..."
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white shadow-sm mb-4 outline-none focus:border-primary"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {/* Auto-confirmed banner */}
      {autoConfirmed && (
        <div className="rounded-2xl p-4 mb-4 animate-fade-in"
          style={{ background:"#E1F5EE", border:"1.5px solid #A8DFC9" }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="text-sm font-bold text-green-800">{autoConfirmed}</div>
              <div className="text-[10px] text-green-600 mt-0.5">
                Auto-confirmed — your shop taught the system this word
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed feedback */}
      {confirmed && !autoConfirmed && (
        <div className="rounded-2xl p-4 mb-4"
          style={{ background:"#EEF3FF", border:"1.5px solid #C0CFFF" }}>
          <div className="text-xs font-semibold text-indigo-800">
            ✓ Learned: &ldquo;{query}&rdquo; → {confirmed}
          </div>
          <div className="text-[10px] text-indigo-500 mt-1">
            {toAutoConfirm > 0
              ? `Confirm ${toAutoConfirm} more time${toAutoConfirm > 1 ? "s" : ""} → system auto-confirms forever`
              : "✅ Will now auto-confirm — no confirmation needed"}
          </div>
        </div>
      )}

      {/* Top result card */}
      {!confirmed && !autoConfirmed && topResult && !wrongMode && (
        <div className="card mb-3 animate-fade-in">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Best match
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-800">{topResult.product?.name}</div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {methodLabel(topResult.method)} · {Math.round((topResult.finalScore || topResult.score) * 100)}%
                </span>
                {topResult.learnedCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">
                    🧠 learned ×{topResult.learnedCount}
                  </span>
                )}
              </div>
              {toAutoConfirm > 0 && learnedCount > 0 && (
                <div className="text-[10px] text-amber-500 mt-1.5">
                  {toAutoConfirm} more confirmation{toAutoConfirm > 1 ? "s" : ""} → auto-confirm
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button onClick={() => handleConfirm(topResult.product?.name)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background:"var(--jade)" }}>
                ✓ Yes
              </button>
              <button onClick={() => setWrongMode(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600">
                ✗ Wrong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wrong mode — pick correct product */}
      {wrongMode && (
        <div className="card mb-3">
          <div className="text-xs font-semibold text-gray-600 mb-3">
            Pick the correct product for &ldquo;{query}&rdquo;:
          </div>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div>
                  <div className="text-xs font-medium text-gray-800">{r.product?.name}</div>
                  <span className="text-[10px] text-gray-400">
                    {methodLabel(r.method)} · {Math.round((r.finalScore || r.score) * 100)}%
                  </span>
                </div>
                <button onClick={() => handleConfirm(r.product?.name)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700">
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other candidates (non-top, not wrong mode) */}
      {!confirmed && !autoConfirmed && !wrongMode && results.length > 1 && (
        <div className="space-y-2 mb-4">
          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide px-1">
            Other candidates
          </div>
          {results.slice(1).map((r, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100">
              <div>
                <div className="text-xs font-medium text-gray-700">{r.product?.name}</div>
                <span className="text-[10px] text-gray-400">
                  {methodLabel(r.method)} · {Math.round((r.finalScore || r.score) * 100)}%
                  {r.learnedCount > 0 ? ` · 🧠 ×${r.learnedCount}` : ""}
                </span>
              </div>
              <button onClick={() => handleConfirm(r.product?.name)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-gray-50 border border-gray-100 text-gray-600">
                Select
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Learning history */}
      {Object.keys(history).length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
            🧠 What this shop has taught the system
          </div>
          <div className="space-y-2">
            {Object.entries(history)
              .sort((a, b) => {
                const countA = Math.max(...Object.values(a[1]))
                const countB = Math.max(...Object.values(b[1]))
                return countB - countA
              })
              .map(([spoken, votes]) => {
                const top   = Object.entries(votes).sort((a, b) => b[1] - a[1])[0]
                const count = top[1]
                const isAuto = count >= AUTO_CONFIRM_THRESHOLD
                return (
                  <div key={spoken}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base flex-shrink-0">{isAuto ? "✅" : "🔄"}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-mono text-gray-600">&ldquo;{spoken}&rdquo;</span>
                        <span className="text-gray-300 mx-1">→</span>
                        <span className="text-xs font-semibold text-gray-800 truncate">{top[0]}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isAuto
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-600"
                      }`}>
                        {isAuto ? "auto ✓" : `${count}/${AUTO_CONFIRM_THRESHOLD}`}
                      </span>
                      <button onClick={() => handleDelete(spoken)}
                        className="text-[10px] text-gray-300 hover:text-red-400 px-1">
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {Object.keys(history).length === 0 && !query && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🧠</div>
          <div className="text-sm font-medium text-gray-500 mb-1">No learning data yet</div>
          <div className="text-xs text-gray-400 max-w-xs mx-auto">
            Type what you'd say — confirm matches and the system learns your shop's language
          </div>
        </div>
      )}
    </div>
  )
}
