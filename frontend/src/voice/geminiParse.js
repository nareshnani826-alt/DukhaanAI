// geminiParse.js — Gemini Flash fallback for product description parsing
// Calls the backend (/bangle/parse-text); API key stays server-side, never in the APK

import { getToken } from "../sync/db.js"

const API = import.meta.env.VITE_API_URL ?? ""

export async function geminiParseProduct(text) {
  const t = getToken()
  const res = await fetch(`${API}/bangle/parse-text`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`AI parse error ${res.status}: ${typeof err.detail === "string" ? err.detail : "unknown"}`)
  }

  return res.json()
}
