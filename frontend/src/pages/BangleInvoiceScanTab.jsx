import { useState, useRef, useEffect } from "react"
import { getToken, tryRefresh, clearAuth } from "../sync/db"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const BANGLE_CATS = [
  "Bangles","Earrings","Necklace","Maang Tikka","Anklet","Hair Clip","Bindi","Rings","Bracelet","Nose Ring",
  "Nail Polish","Kajal","Lipstick","Mehendi","Perfume","Compact","Skin Care",
  "Shampoo","Hair Oil","Body Lotion","Soap","Talcum Powder","Hair Color","Other",
]

const MATCH_BADGE = {
  exact: { label: "✓ Matched",     bg: "#ecfdf5", color: "#059669" },
  fuzzy: { label: "~ Similar",     bg: "#fefce8", color: "#b45309" },
  new:   { label: "+ New Product", bg: "#fff7ed", color: "#c2410c" },
}

const TIER_INFO = {
  image: { label: "Image OCR",   bg: "#ecfdf5", color: "#059669", icon: "📷" },
  pdf:   { label: "PDF Extract", bg: "#eff6ff", color: "#2563eb", icon: "📄" },
  excel: { label: "Excel",       bg: "#f0fdf4", color: "#16a34a", icon: "📊" },
  csv:   { label: "CSV",         bg: "#fefce8", color: "#b45309", icon: "📝" },
  local: { label: "Local Parse", bg: "#faf5ff", color: "#7c3aed", icon: "⚙️" },
}

export default function BangleInvoiceScanTab() {
  const [step,        setStep]        = useState("upload")
  const [items,       setItems]       = useState([])
  const [stats,       setStats]       = useState({})
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState("")
  const [preview,     setPreview]     = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [tier,        setTier]        = useState(null)
  const [backendOk,   setBackendOk]   = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    fetch(`${API}/health`)
      .then(r => setBackendOk(r.ok))
      .catch(() => setBackendOk(false))
  }, [])

  function setItemField(i, field, val) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  async function handleFile(file) {
    if (!file) return
    const isImage = file.type.startsWith("image/")
    setPreview(isImage ? URL.createObjectURL(file) : null)
    setStep("scanning")
    setOcrProgress(20)
    setError("")
    setTier(null)

    const ticker = setInterval(() => {
      setOcrProgress(p => p < 85 ? p + 5 : p)
    }, 600)

    const form = new FormData()
    form.append("file", file)
    form.append("store", "bangle")  // ← key difference: match against bangle_products

    try {
      const doScan = () => fetch(`${API}/invoice-scan/scan`, {
        method:  "POST",
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        body:    form,
      })
      let res = await doScan()
      if (res.status === 401) {
        const ok = await tryRefresh()
        if (ok) res = await doScan()
        else { clearAuth(); window.location.href = "/"; return }
      }
      clearInterval(ticker)

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error (${res.status})`)
      }
      const data = await res.json()
      setOcrProgress(100)
      setTier(data.tier || null)

      const withDefaults = data.items.map(it => ({
        ...it,
        name:     it.match_type === "exact" || it.match_type === "fuzzy"
                    ? (it.match_product?.name || it.extracted_name)
                    : it.extracted_name,
        category: it.match_product?.category || "Other",
        action:   it.match_type === "new" ? "create" : "add_stock",
      }))
      setItems(withDefaults)
      setStats({ total: data.total, exact: data.exact, fuzzy: data.fuzzy, new: data.new })
      setStep("review")
    } catch (e) {
      clearInterval(ticker)
      const msg = e.message || ""
      setError(msg || "Could not scan. Try a clearer photo with good lighting.")
      setStep("upload")
    }
  }

  async function applyToInventory() {
    setStep("applying")
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
          category:    it.category || "Other",
        })),
    }
    try {
      const doApply = () => fetch(`${API}/invoice-scan/apply-bangle`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      let res = await doApply()
      if (res.status === 401) {
        const ok = await tryRefresh()
        if (ok) res = await doApply()
        else { clearAuth(); window.location.href = "/"; return }
      }
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

  // ── Done ──────────────────────────────────────────────────────
  if (step === "done" && result) {
    return (
      <div style={{ padding: 24, textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", marginBottom: 6 }}>
          Inventory Updated!
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 24 }}>
          Invoice processed · New products get a default variant with opening stock
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "New Products",  value: result.added,               bg: "#fff7ed", color: "#c2410c" },
            { label: "Stock Updated", value: result.updated,             bg: "#eff6ff", color: "#2563eb" },
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
          <button onClick={() => window.location.href = "/bangle-inventory"}
            style={{ flex: 1, padding: 12, background: "linear-gradient(135deg,var(--saffron),#d45f00)",
              color: "#fff", border: "none", borderRadius: 12, fontSize: 13,
              fontWeight: 600, cursor: "pointer" }}>
            View Inventory →
          </button>
        </div>
      </div>
    )
  }

  // ── Scanning / Applying loader ────────────────────────────────
  if (step === "scanning" || step === "applying") {
    const isScanning = step === "scanning"
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        {preview && (
          <img src={preview} alt="Invoice"
            style={{ maxWidth: 200, maxHeight: 200, borderRadius: 12,
              objectFit: "cover", marginBottom: 24, border: "2px solid var(--rule)" }}/>
        )}
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
          {isScanning ? "Reading invoice…" : "Updating inventory…"}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 20 }}>
          {isScanning ? "EasyOCR is extracting text on the server" : "Adding stock and creating new products"}
        </div>
        {isScanning ? (
          <>
            <div style={{ background: "var(--rule)", borderRadius: 99, height: 8,
              overflow: "hidden", maxWidth: 280, margin: "0 auto 12px" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg,var(--saffron),#d45f00)",
                width: `${ocrProgress}%`, transition: "width 0.4s ease", borderRadius: 99 }}/>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
              {ocrProgress < 50 ? "📂 Uploading…" : ocrProgress < 85 ? "🔍 Reading text…" : "⚙️ Matching products…"}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: "50%",
                background: "var(--saffron)", opacity: 0.5,
                animation: "biBounce 1.2s infinite", animationDelay: `${i * 0.2}s` }}/>
            ))}
          </div>
        )}
        <style>{`@keyframes biBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}`}</style>
      </div>
    )
  }

  // ── Review table ──────────────────────────────────────────────
  if (step === "review") {
    const toApply  = items.filter(it => it.action !== "skip").length
    const tierInfo = tier ? TIER_INFO[tier] : null
    const totalAmt = items.reduce((s, it) =>
      it.action !== "skip" ? s + (parseFloat(it.unit_price || 0) * parseFloat(it.qty || 0)) : s, 0)

    const ROW_BG = { exact: "#f0fdf4", fuzzy: "#fffbeb", new: "#fff7ed", skip: "#f9fafb" }
    const th = { fontSize: 10, fontWeight: 700, color: "var(--ink-faint)", padding: "8px 6px",
      textAlign: "left", borderBottom: "2px solid var(--rule)", whiteSpace: "nowrap" }
    const td = { padding: "7px 6px", verticalAlign: "middle", borderBottom: "1px solid var(--rule)" }

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <div style={{ padding: "10px 16px", background: "var(--bg1)",
          borderBottom: "1px solid var(--rule)", display: "flex",
          alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>
              Review Extracted Items
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              {[
                { label: `${stats.exact} matched`, color: "#059669", bg: "#ecfdf5" },
                { label: `${stats.fuzzy} similar`, color: "#b45309", bg: "#fefce8" },
                { label: `${stats.new} new`,        color: "#c2410c", bg: "#fff7ed" },
              ].map(s => (
                <span key={s.label} style={{ fontSize: 10, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color }}>
                  {s.label}
                </span>
              ))}
              {tierInfo && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20,
                  background: tierInfo.bg, color: tierInfo.color, fontWeight: 600 }}>
                  {tierInfo.icon} {tierInfo.label}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => items.forEach((_, i) => setItemField(i, "action", "skip"))}
              style={{ padding: "6px 12px", background: "none", color: "var(--ink-faint)",
                border: "1px solid var(--rule)", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>
              Skip All
            </button>
            <button onClick={() => items.forEach((it, i) =>
              setItemField(i, "action", it.match_type === "new" ? "create" : "add_stock"))}
              style={{ padding: "6px 12px", background: "none", color: "var(--saffron)",
                border: "1px solid rgba(232,119,34,0.35)", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>
              Select All
            </button>
            <button onClick={reset}
              style={{ padding: "6px 12px", background: "var(--bg2)", color: "var(--ink-dim)",
                border: "none", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              Rescan
            </button>
            <button onClick={applyToInventory} disabled={toApply === 0}
              style={{ padding: "8px 18px",
                background: toApply > 0 ? "linear-gradient(135deg,var(--saffron),#d45f00)" : "var(--bg2)",
                color: toApply > 0 ? "#fff" : "var(--ink-faint)",
                border: "none", borderRadius: 9, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
              Apply {toApply} →
            </button>
          </div>
        </div>

        {error && (
          <div style={{ margin: "8px 16px", padding: "10px 14px", background: "#fef2f2",
            color: "#dc2626", borderRadius: 10, fontSize: 12 }}>{error}</div>
        )}

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--bg1)", zIndex: 1 }}>
              <tr>
                <th style={{ ...th, width: 28 }}>#</th>
                <th style={th}>Invoice Item</th>
                <th style={th}>Inventory Match</th>
                <th style={{ ...th, width: 60 }}>Qty</th>
                <th style={{ ...th, width: 80 }}>Category</th>
                <th style={{ ...th, width: 80 }}>Price/Unit</th>
                <th style={{ ...th, width: 56 }}>GST%</th>
                <th style={{ ...th, width: 110 }}>Action</th>
                <th style={{ ...th, width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const badge  = MATCH_BADGE[it.match_type]
                const isSkip = it.action === "skip"
                const rowBg  = isSkip ? ROW_BG.skip : ROW_BG[it.match_type]
                return (
                  <tr key={i} style={{ background: rowBg, opacity: isSkip ? 0.5 : 1 }}>
                    <td style={{ ...td, color: "var(--ink-faint)", textAlign: "center",
                      fontSize: 11, fontWeight: 600 }}>{i + 1}</td>

                    {/* Invoice item */}
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 12, marginBottom: 2 }}>
                        {it.extracted_name}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px",
                        borderRadius: 10, background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Inventory match */}
                    <td style={td}>
                      {it.match_type !== "new" && it.match_product ? (
                        <div>
                          <div style={{ fontSize: 12, color: "var(--saffron)", fontWeight: 600 }}>
                            {it.match_product.name}
                          </div>
                          {it.confidence < 0.90 && (
                            <div style={{ fontSize: 10, color: "#b45309" }}>
                              {Math.round(it.confidence * 100)}% match
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: "#c2410c" }}>Will create new</span>
                      )}
                    </td>

                    {/* Qty */}
                    <td style={td}>
                      <input type="number" min="0" step="1"
                        value={it.qty}
                        onChange={e => setItemField(i, "qty", e.target.value)}
                        style={{ width: 54, border: "1.5px solid var(--rule)", borderRadius: 6,
                          padding: "4px 5px", fontSize: 12, fontWeight: 700, outline: "none",
                          background: "white", textAlign: "right" }}/>
                    </td>

                    {/* Category (for new products) */}
                    <td style={td}>
                      {it.match_type === "new" ? (
                        <select value={it.category || "Other"}
                          onChange={e => setItemField(i, "category", e.target.value)}
                          style={{ width: 74, border: "1.5px solid var(--rule)", borderRadius: 6,
                            padding: "4px 2px", fontSize: 10, outline: "none", background: "white" }}>
                          {BANGLE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                          {it.match_product?.category || "—"}
                        </span>
                      )}
                    </td>

                    {/* Price */}
                    <td style={td}>
                      <input type="number" min="0" step="0.01"
                        value={it.unit_price || ""}
                        onChange={e => setItemField(i, "unit_price", e.target.value)}
                        placeholder="—"
                        style={{ width: 74, border: "1.5px solid var(--rule)", borderRadius: 6,
                          padding: "4px 5px", fontSize: 12, outline: "none",
                          background: "white", textAlign: "right" }}/>
                    </td>

                    {/* GST% */}
                    <td style={td}>
                      <select value={it.gst_percent ?? 3}
                        onChange={e => setItemField(i, "gst_percent", e.target.value)}
                        style={{ width: 50, border: "1.5px solid var(--rule)", borderRadius: 6,
                          padding: "4px 2px", fontSize: 11, outline: "none", background: "white" }}>
                        {[0, 3, 5, 12, 18].map(g => <option key={g} value={g}>{g}%</option>)}
                      </select>
                    </td>

                    {/* Action */}
                    <td style={td}>
                      {it.match_type === "exact" ? (
                        <span style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>+ Add stock</span>
                      ) : (
                        <select value={it.action}
                          onChange={e => setItemField(i, "action", e.target.value)}
                          style={{ width: "100%", border: "1.5px solid var(--rule)", borderRadius: 6,
                            padding: "4px 3px", fontSize: 11, outline: "none", background: "white" }}>
                          {it.match_type === "fuzzy" && <option value="add_stock">Add to match</option>}
                          <option value="create">Create new</option>
                          <option value="skip">Skip</option>
                        </select>
                      )}
                    </td>

                    {/* Skip toggle */}
                    <td style={{ ...td, textAlign: "center" }}>
                      <button
                        onClick={() => setItemField(i, "action",
                          isSkip ? (it.match_type === "new" ? "create" : "add_stock") : "skip")}
                        style={{ background: "none", border: "none", cursor: "pointer",
                          fontSize: 14, padding: 0, color: isSkip ? "var(--saffron)" : "#dc2626" }}>
                        {isSkip ? "↩" : "✕"}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ borderTop: "2px solid var(--rule)", padding: "12px 16px",
          background: "var(--bg1)", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
            <span style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14 }}>{toApply}</span>
            {" "}of {items.length} items selected
            {totalAmt > 0 && (
              <span style={{ marginLeft: 12 }}>
                · Total: <strong style={{ color: "var(--ink)" }}>
                  ₹{totalAmt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </strong>
              </span>
            )}
          </div>
          <button onClick={applyToInventory} disabled={toApply === 0}
            style={{ padding: "10px 28px",
              background: toApply > 0 ? "linear-gradient(135deg,var(--saffron),#d45f00)" : "var(--bg2)",
              color: toApply > 0 ? "#fff" : "var(--ink-faint)",
              border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800,
              cursor: toApply > 0 ? "pointer" : "default" }}>
            Apply {toApply} Items to Inventory →
          </button>
        </div>
      </div>
    )
  }

  // ── Upload screen ────────────────────────────────────────────
  return (
    <div style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
      {backendOk === false && (
        <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fef2f2",
          color: "#dc2626", borderRadius: 10, fontSize: 12 }}>
          <strong>⚠ Backend unreachable:</strong> {API}
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fef2f2",
          color: "#dc2626", borderRadius: 10, fontSize: 13 }}>⚠ {error}</div>
      )}

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current.click()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
        onDragOver={e => e.preventDefault()}
        style={{ border: "2px dashed rgba(232,119,34,0.4)", borderRadius: 20,
          padding: "48px 24px", textAlign: "center", cursor: "pointer",
          background: "rgba(232,119,34,0.04)", marginBottom: 20, transition: "all 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--saffron)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(232,119,34,0.4)"}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>📄</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--saffron)", marginBottom: 6 }}>
          Upload Supplier Invoice
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 16 }}>
          JPG · PNG · WEBP · PDF · Excel · CSV &nbsp;·&nbsp; Max 10 MB
        </div>
        <div style={{ background: "linear-gradient(135deg,var(--saffron),#d45f00)", color: "#fff",
          borderRadius: 10, padding: "10px 22px", fontSize: 13, fontWeight: 600,
          display: "inline-block" }}>
          Choose File
        </div>
        <input ref={fileRef} type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,.xlsx,.xls,.csv,text/csv"
          style={{ display: "none" }}
          onChange={e => handleFile(e.target.files[0])}/>
      </div>

      {/* Camera button — mobile */}
      <button
        onClick={() => {
          fileRef.current.setAttribute("capture", "environment")
          fileRef.current.click()
        }}
        style={{ width: "100%", padding: "13px", background: "var(--bg1)",
          border: "1.5px solid var(--rule)", borderRadius: 14, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 24 }}>
        <span style={{ fontSize: 20 }}>📷</span>
        Take Photo of Invoice
      </button>

      {/* How it works */}
      <div style={{ background: "var(--bg1)", borderRadius: 16, padding: 20, border: "1px solid var(--rule)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 14 }}>
          How it works
        </div>
        {[
          ["📷", "Photo / Image — EasyOCR reads text on the server (no API, local model)"],
          ["📄", "PDF Invoice — extracts tables & text from digital PDFs"],
          ["📊", "Excel (.xlsx/.xls) — reads rows directly"],
          ["📝", "CSV — export from any billing software and upload directly"],
          ["💍", "Matches against your bangle store inventory — new products get a default variant"],
        ].map(([icon, text]) => (
          <div key={text} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.5 }}>{text}</span>
          </div>
        ))}
        <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(232,119,34,0.07)",
          borderRadius: 10, fontSize: 11, color: "var(--saffron)", fontWeight: 600 }}>
          100% free · No API key · EasyOCR runs on server · PDF / Excel / CSV / Image
        </div>
      </div>
    </div>
  )
}
