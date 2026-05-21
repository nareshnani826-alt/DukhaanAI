import { useState, useRef } from "react"
import { getToken } from "../sync/db"

const API = import.meta.env.VITE_API_URL

const MATCH_BADGE = {
  exact: { label: "✓ Matched",     bg: "#ecfdf5", color: "#059669" },
  fuzzy: { label: "~ Similar",     bg: "#fefce8", color: "#b45309" },
  new:   { label: "+ New Product", bg: "#eff6ff", color: "#2563eb" },
}

const TIER_INFO = {
  tesseract: { label: "Local OCR",    bg: "#ecfdf5", color: "#059669", icon: "📱" },
  gemini:    { label: "Gemini AI",    bg: "#eff6ff", color: "#2563eb", icon: "✨" },
  groq:      { label: "Groq AI",      bg: "#faf5ff", color: "#7c3aed", icon: "🤖" },
  regex:     { label: "Text Parser",  bg: "#fefce8", color: "#b45309", icon: "📝" },
}

export default function InvoiceScanTab() {
  const [step,        setStep]        = useState("upload")
  const [items,       setItems]       = useState([])
  const [stats,       setStats]       = useState({})
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState("")
  const [preview,     setPreview]     = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStage,    setOcrStage]    = useState("")  // "reading" | "thinking"
  const [tier,        setTier]        = useState(null)
  const fileRef = useRef()

  function setItemField(i, field, val) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  async function handleFile(file) {
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setStep("scanning")
    setOcrProgress(0)
    setOcrStage("reading")
    setError("")
    setTier(null)

    // ── Tier 1: Tesseract.js — browser OCR (images only, free) ──
    let tesseractText = ""
    let confidence    = 0
    const isImage = file.type.startsWith("image/")

    if (isImage) {
      try {
        const tesseractPromise = (async () => {
          const { createWorker } = await import("tesseract.js")
          const worker = await createWorker("eng", 1, {
            logger: m => {
              if (m.status === "recognizing text") {
                setOcrProgress(Math.round(m.progress * 65))
              }
            },
          })
          const { data } = await worker.recognize(file)
          await worker.terminate()
          return data
        })()
        // Give Tesseract max 20s — skip it if it hangs (CDN down, WASM issue, etc.)
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Tesseract timeout")), 20000)
        )
        const data    = await Promise.race([tesseractPromise, timeout])
        tesseractText = data.text       || ""
        confidence    = data.confidence || 0
      } catch (e) {
        console.warn("Tesseract skipped:", e.message)
      }
    }

    setOcrStage("thinking")
    setOcrProgress(70)

    // ── Send to backend — cascade continues there ─────────────
    const token = getToken()
    const form  = new FormData()
    form.append("file",           file)
    form.append("tesseract_text", tesseractText)
    form.append("confidence",     String(confidence))

    try {
      const res = await fetch(`${API}/invoice-scan/scan`, {
        method:  "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body:    form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error (${res.status})`)
      }
      const data = await res.json()
      setOcrProgress(100)
      setTier(data.tier || null)

      const withDefaults = data.items.map(it => ({
        ...it,
        name:   it.match_type === "exact" || it.match_type === "fuzzy"
                  ? (it.match_product?.name || it.extracted_name)
                  : it.extracted_name,
        action: it.match_type === "new" ? "create" : "add_stock",
      }))
      setItems(withDefaults)
      setStats({ total: data.total, exact: data.exact, fuzzy: data.fuzzy, new: data.new })
      setStep("review")
    } catch (e) {
      const msg = e.message || ""
      const friendly = msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network")
        ? "Cannot reach server — please wait a moment and try again. (Server may be restarting)"
        : msg || "Could not scan. Try a clearer photo with good lighting."
      setError(friendly)
      setStep("upload")
    }
  }

  async function applyToInventory() {
    setStep("applying")
    const token   = getToken()
    const payload = {
      items: items
        .filter(it => it.action !== "skip")
        .map(it => ({
          action:      it.action,
          product_id:  it.match_product?.id || null,
          name:        it.name || it.extracted_name,
          qty:         parseFloat(it.qty) || 0,
          unit:        it.unit || "pc",
          unit_price:  parseFloat(it.unit_price) || null,
          mrp:         parseFloat(it.mrp || it.unit_price) || null,
          gst_percent: parseFloat(it.gst_percent) || null,
          barcode:     it.barcode || null,
          category:    "Other",
        })),
    }
    try {
      const res = await fetch(`${API}/invoice-scan/apply`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Apply failed")
      const data = await res.json()
      setResult(data)
      setStep("done")
    } catch (e) {
      setError(e.message || "Failed to update inventory. Please try again.")
      setStep("review")
    }
  }

  function reset() {
    setStep("upload"); setItems([]); setStats({}); setResult(null)
    setError(""); setPreview(null); setOcrProgress(0); setTier(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  // ── Done screen ──────────────────────────────────────────────
  if (step === "done" && result) {
    return (
      <div style={{ padding: 24, textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", marginBottom: 6 }}>
          Inventory Updated!
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 24 }}>
          Invoice successfully processed
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "New Products",  value: result.added,              bg: "#ecfdf5", color: "#059669" },
            { label: "Stock Updated", value: result.updated,            bg: "#eff6ff", color: "#2563eb" },
            { label: "Errors",        value: result.errors?.length || 0, bg: "var(--bg2)", color: "var(--ink-faint)" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: s.color, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={reset}
            style={{ flex: 1, padding: 12, background: "var(--bg2)", color: "var(--ink-dim)",
              border: "none", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Scan Another
          </button>
          <button onClick={() => window.location.href = "/inventory"}
            style={{ flex: 1, padding: 12, background: "linear-gradient(135deg,#0F6E56,#1D9E75)",
              color: "#fff", border: "none", borderRadius: 12, fontSize: 13,
              fontWeight: 600, cursor: "pointer" }}>
            View Inventory →
          </button>
        </div>
      </div>
    )
  }

  // ── Scanning / applying loader ────────────────────────────────
  if (step === "scanning" || step === "applying") {
    const isScanning = step === "scanning"
    const stageMsg   = isScanning
      ? (ocrStage === "reading" ? "Reading invoice text…" : "AI is matching your products…")
      : "Updating inventory…"
    const stageSub   = isScanning
      ? (ocrStage === "reading"
          ? "Tesseract is extracting text from your image (free, private)"
          : "Using AI to parse products, prices and quantities")
      : "Adding stock and creating new products"

    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        {preview && (
          <img src={preview} alt="Invoice"
            style={{ maxWidth: 200, maxHeight: 200, borderRadius: 12,
              objectFit: "cover", marginBottom: 24, border: "2px solid var(--rule)" }}/>
        )}

        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>{stageMsg}</div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 20 }}>{stageSub}</div>

        {isScanning ? (
          <>
            {/* Progress bar */}
            <div style={{ background: "var(--rule)", borderRadius: 99, height: 8,
              overflow: "hidden", maxWidth: 280, margin: "0 auto 12px" }}>
              <div style={{
                height: "100%",
                background: "linear-gradient(90deg,#0F6E56,#1D9E75)",
                width: `${ocrProgress}%`,
                transition: "width 0.4s ease",
                borderRadius: 99,
              }}/>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
              {ocrProgress < 65 ? "📱 Local OCR (no API cost)…"
               : ocrProgress < 90 ? "☁️ Sending to AI…"
               : "Almost done…"}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: "50%",
                background: "var(--jade)", opacity: 0.5,
                animation: "bounce 1.2s infinite",
                animationDelay: `${i * 0.2}s`,
              }}/>
            ))}
          </div>
        )}
        <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}`}</style>
      </div>
    )
  }

  // ── Review table ──────────────────────────────────────────────
  if (step === "review") {
    const toApply = items.filter(it => it.action !== "skip").length
    const tierInfo = tier ? TIER_INFO[tier] : null

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Summary bar */}
        <div style={{ padding: "10px 20px", background: "var(--bg1)",
          borderBottom: "1px solid var(--rule)", display: "flex",
          alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: `${stats.exact} exact`,   color: "#059669", bg: "#ecfdf5" },
              { label: `${stats.fuzzy} similar`, color: "#b45309", bg: "#fefce8" },
              { label: `${stats.new} new`,        color: "#2563eb", bg: "#eff6ff" },
            ].map(s => (
              <span key={s.label} style={{ fontSize: 11, fontWeight: 600,
                padding: "3px 10px", borderRadius: 20,
                background: s.bg, color: s.color }}>{s.label}</span>
            ))}
            {tierInfo && (
              <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20,
                background: tierInfo.bg, color: tierInfo.color, fontWeight: 600 }}>
                {tierInfo.icon} {tierInfo.label}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reset}
              style={{ padding: "7px 14px", background: "var(--bg2)", color: "var(--ink-dim)",
                border: "none", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              Rescan
            </button>
            <button onClick={applyToInventory} disabled={toApply === 0}
              style={{ padding: "7px 16px",
                background: toApply > 0 ? "linear-gradient(135deg,#0F6E56,#1D9E75)" : "var(--bg2)",
                color: toApply > 0 ? "#fff" : "var(--ink-faint)",
                border: "none", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Apply {toApply} Items →
            </button>
          </div>
        </div>

        {error && (
          <div style={{ margin: "10px 20px", padding: "10px 14px", background: "#fef2f2",
            color: "#dc2626", borderRadius: 10, fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* Item rows */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
          {items.map((it, i) => {
            const badge  = MATCH_BADGE[it.match_type]
            const isSkip = it.action === "skip"
            return (
              <div key={i} style={{
                background: "var(--bg1)", borderRadius: 12, padding: 14, marginTop: 10,
                border: `1.5px solid ${isSkip ? "var(--rule)" : badge.bg}`,
                opacity: isSkip ? 0.5 : 1,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px",
                    borderRadius: 20, background: badge.bg, color: badge.color,
                    whiteSpace: "nowrap", flexShrink: 0 }}>
                    {badge.label}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 2 }}>
                      Invoice: <span style={{ fontWeight: 600 }}>{it.extracted_name}</span>
                    </div>
                    {it.match_type !== "new" && it.match_product && (
                      <div style={{ fontSize: 10, color: "var(--jade)" }}>
                        → {it.match_product.name}
                        {it.confidence < 0.90 && (
                          <span style={{ color: "#b45309" }}> ({Math.round(it.confidence * 100)}% match)</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setItemField(i, "action", isSkip ? (it.match_type === "new" ? "create" : "add_stock") : "skip")}
                    style={{ background: "none", border: "none", fontSize: 16,
                      cursor: "pointer", flexShrink: 0, padding: 0 }}>
                    {isSkip ? "↩" : "✕"}
                  </button>
                </div>

                {!isSkip && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ flex: "0 0 70px" }}>
                      <div style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 3 }}>QTY</div>
                      <input type="number" min="0" step="0.1"
                        value={it.qty}
                        onChange={e => setItemField(i, "qty", e.target.value)}
                        style={{ width: "100%", border: "1.5px solid var(--rule)", borderRadius: 7,
                          padding: "5px 7px", fontSize: 12, fontWeight: 600, outline: "none" }}/>
                    </div>
                    <div style={{ flex: "0 0 70px" }}>
                      <div style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 3 }}>UNIT</div>
                      <select value={it.unit || "pc"}
                        onChange={e => setItemField(i, "unit", e.target.value)}
                        style={{ width: "100%", border: "1.5px solid var(--rule)", borderRadius: 7,
                          padding: "5px 4px", fontSize: 11, outline: "none", background: "var(--bg1)" }}>
                        {["pc","kg","g","litre","ml","pack","box","dozen","carton","strip"].map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: "0 0 80px" }}>
                      <div style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 3 }}>PRICE/UNIT</div>
                      <input type="number" min="0" step="0.01"
                        value={it.unit_price || ""}
                        onChange={e => setItemField(i, "unit_price", e.target.value)}
                        placeholder="0.00"
                        style={{ width: "100%", border: "1.5px solid var(--rule)", borderRadius: 7,
                          padding: "5px 7px", fontSize: 12, outline: "none" }}/>
                    </div>
                    {it.gst_percent != null && (
                      <div style={{ flex: "0 0 60px" }}>
                        <div style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 3 }}>GST%</div>
                        <input type="number" min="0"
                          value={it.gst_percent || ""}
                          onChange={e => setItemField(i, "gst_percent", e.target.value)}
                          style={{ width: "100%", border: "1.5px solid var(--rule)", borderRadius: 7,
                            padding: "5px 7px", fontSize: 12, outline: "none" }}/>
                      </div>
                    )}
                    {it.match_type !== "exact" && (
                      <div style={{ flex: "1 1 120px" }}>
                        <div style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 3 }}>ACTION</div>
                        <select value={it.action}
                          onChange={e => setItemField(i, "action", e.target.value)}
                          style={{ width: "100%", border: "1.5px solid var(--rule)", borderRadius: 7,
                            padding: "5px 4px", fontSize: 11, outline: "none", background: "var(--bg1)" }}>
                          {it.match_type === "fuzzy" && <option value="add_stock">Add stock to match</option>}
                          <option value="create">Create new product</option>
                          <option value="skip">Skip this item</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {!isSkip && (it.expiry || it.batch) && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {it.expiry && <span style={{ fontSize: 10, background: "#fef9c3", color: "#854d0e",
                      padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
                      Exp: {it.expiry}
                    </span>}
                    {it.batch && <span style={{ fontSize: 10, background: "#f3f4f6", color: "#6b7280",
                      padding: "2px 8px", borderRadius: 20 }}>
                      Batch: {it.batch}
                    </span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Upload screen (default) ───────────────────────────────────
  return (
    <div style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
      {error && (
        <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fef2f2",
          color: "#dc2626", borderRadius: 10, fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      <div
        onClick={() => fileRef.current.click()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
        onDragOver={e => e.preventDefault()}
        style={{
          border: "2px dashed #d1fae5", borderRadius: 20, padding: "48px 24px",
          textAlign: "center", cursor: "pointer", background: "#f0fdf9",
          marginBottom: 20, transition: "all 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--jade)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "#d1fae5"}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>📄</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--jade)", marginBottom: 6 }}>
          Upload Vendor Invoice
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 16 }}>
          JPG · PNG · WEBP · HEIC · PDF &nbsp;·&nbsp; Max 10 MB
        </div>
        <div style={{ display: "inline-flex", gap: 10 }}>
          <div style={{ background: "linear-gradient(135deg,#0F6E56,#1D9E75)", color: "#fff",
            borderRadius: 10, padding: "10px 22px", fontSize: 13, fontWeight: 600 }}>
            Choose File
          </div>
        </div>
        <input ref={fileRef} type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          style={{ display: "none" }}
          onChange={e => handleFile(e.target.files[0])} capture="environment"/>
      </div>

      <button
        onClick={() => { fileRef.current.setAttribute("capture","environment"); fileRef.current.click() }}
        style={{ width: "100%", padding: "13px", background: "var(--bg1)",
          border: "1.5px solid var(--rule)", borderRadius: 14, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 24 }}>
        <span style={{ fontSize: 20 }}>📷</span>
        Take Photo of Invoice
      </button>

      {/* How it works */}
      <div style={{ background: "var(--bg1)", borderRadius: 16, padding: 20,
        border: "1px solid var(--rule)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 14 }}>
          How it works
        </div>
        {[
          ["📄", "Upload invoice photo or PDF from your vendor"],
          ["📱", "Tesseract reads text locally — free, private, no internet needed"],
          ["✨", "Gemini AI (1,500 free/day) gives full accuracy when needed"],
          ["🤖", "Groq AI kicks in automatically if Gemini is busy"],
          ["💾", "Review matches and apply — stock updates in one tap"],
        ].map(([icon, text]) => (
          <div key={text} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.5 }}>{text}</span>
          </div>
        ))}
        {/* Cost indicator */}
        <div style={{ marginTop: 14, padding: "10px 14px", background: "#ecfdf5",
          borderRadius: 10, fontSize: 11, color: "#059669", fontWeight: 600 }}>
          Zero cost · Tesseract → Gemini (free) → Groq (free) → Regex fallback
        </div>
      </div>
    </div>
  )
}
