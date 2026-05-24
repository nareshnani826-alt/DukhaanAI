// geminiVision.js — camera scan: sends image to backend, which calls Gemini Vision
// API key stays server-side; no VITE_GEMINI_API_KEY needed in the frontend

import { getToken } from "../sync/db.js"

const API = import.meta.env.VITE_API_URL ?? ""

function authHeaders() {
  const t = getToken()
  return t
    ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` }
    : { "Content-Type": "application/json" }
}

export async function scanImageForProduct(imageBase64, mimeType = "image/jpeg") {
  const res = await fetch(`${API}/bangle/scan-image`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({ image_base64: imageBase64, mime_type: mimeType }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const d = err.detail
    const msg = typeof d === "string" ? d
              : Array.isArray(d)      ? d.map(x => x.msg || JSON.stringify(x)).join("; ")
              : d                     ? JSON.stringify(d)
              : `Scan failed (${res.status})`
    throw new Error(msg)
  }

  return res.json()
}

// File → { base64, mimeType } — strips data URI prefix
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve({
      base64:   reader.result.split(",")[1],
      mimeType: file.type || "image/jpeg",
      preview:  reader.result,           // full data URL for <img> preview
    })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
