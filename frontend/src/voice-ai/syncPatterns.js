/**
 * syncPatterns.js — Cloud sync for vendor-learned patterns
 *
 * localStorage is the fast/primary store. This module:
 *   1. Debounces writes: scheduleSync() waits 5s then uploads all 5 pattern types at once
 *   2. Loads on login: loadFromServer() fetches server state and merges into localStorage
 *      Merge rule — take max counts so the highest-confidence data wins regardless of device
 *
 * localStorage keys synced:
 *   dk_pl_patterns    → "patterns"
 *   dk_pl_abbr        → "abbr"
 *   dk_pl_rules       → "rules"
 *   dk_learning_store → "corrections"
 *   dk_ctx_patterns   → "context"
 */

import { Learning } from "../sync/db"

const LS_KEYS = {
  patterns:    "dk_pl_patterns",
  abbr:        "dk_pl_abbr",
  rules:       "dk_pl_rules",
  corrections: "dk_learning_store",
  context:     "dk_ctx_patterns",
}

function lsRead(key) {
  try { return JSON.parse(localStorage.getItem(key) || "{}") } catch { return {} }
}
function lsWrite(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

// ── Merge strategies ─────────────────────────────────────────

function mergeCountMap(local, server) {
  const result = { ...local }
  for (const [k, v] of Object.entries(server || {})) {
    if (typeof v === "number") {
      result[k] = Math.max(result[k] || 0, v)
    } else if (v && typeof v === "object") {
      result[k] = mergeCountMap(result[k] || {}, v)
    }
  }
  return result
}

function mergeRules(local, server) {
  const result = { ...local }
  for (const [name, srv] of Object.entries(server || {})) {
    const loc = result[name] || { hits: 0, misses: 0 }
    result[name] = {
      hits:   Math.max(loc.hits   || 0, srv.hits   || 0),
      misses: Math.max(loc.misses || 0, srv.misses || 0),
    }
  }
  return result
}

function mergePatternLearner(local, server) {
  const result = { ...local }
  for (const [spoken, products] of Object.entries(server || {})) {
    if (!result[spoken]) { result[spoken] = products; continue }
    for (const [prod, meta] of Object.entries(products || {})) {
      const lm = result[spoken][prod]
      if (!lm) {
        result[spoken][prod] = meta
      } else {
        result[spoken][prod] = {
          count:      Math.max(lm.count || 0, meta.count || 0),
          lastSeen:   Math.max(lm.lastSeen || 0, meta.lastSeen || 0),
          ruleChains: [...new Set([...(lm.ruleChains || []), ...(meta.ruleChains || [])])],
        }
      }
    }
  }
  return result
}

function mergeContext(local, server) {
  const result = { ...local }
  for (const [prod, data] of Object.entries(server || {})) {
    if (!result[prod]) { result[prod] = data; continue }
    const localFollows  = result[prod].followedBy || {}
    const serverFollows = data.followedBy || {}
    result[prod] = {
      followedBy: mergeCountMap(localFollows, serverFollows),
    }
  }
  return result
}

// ── Load from server and merge into localStorage ──────────────

export async function loadFromServer() {
  const server = await Learning.load()
  if (!server) return

  if (server.patterns) {
    const merged = mergePatternLearner(lsRead(LS_KEYS.patterns), server.patterns)
    lsWrite(LS_KEYS.patterns, merged)
  }
  if (server.abbr) {
    const merged = mergeCountMap(lsRead(LS_KEYS.abbr), server.abbr)
    lsWrite(LS_KEYS.abbr, merged)
  }
  if (server.rules) {
    const merged = mergeRules(lsRead(LS_KEYS.rules), server.rules)
    lsWrite(LS_KEYS.rules, merged)
  }
  if (server.corrections) {
    const merged = mergeCountMap(lsRead(LS_KEYS.corrections), server.corrections)
    lsWrite(LS_KEYS.corrections, merged)
  }
  if (server.context) {
    const merged = mergeContext(lsRead(LS_KEYS.context), server.context)
    lsWrite(LS_KEYS.context, merged)
  }
}

// ── Debounced upload ──────────────────────────────────────────

let _timer = null

export function scheduleSync() {
  if (_timer) clearTimeout(_timer)
  _timer = setTimeout(async () => {
    _timer = null
    await Learning.save({
      patterns:    lsRead(LS_KEYS.patterns),
      abbr:        lsRead(LS_KEYS.abbr),
      rules:       lsRead(LS_KEYS.rules),
      corrections: lsRead(LS_KEYS.corrections),
      context:     lsRead(LS_KEYS.context),
    })
  }, 5000)
}
