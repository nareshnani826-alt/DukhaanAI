import { useState, useEffect, useRef } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { getToken, Products } from "../sync/db"

const API = import.meta.env.VITE_API_URL
const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN")

export default function BarcodeScannerTab() {
  const [scanning,  setScanning]  = useState(false)
  const [result,    setResult]    = useState(null)   // {source, product}
  const [qty,       setQty]       = useState(1)
  const [mrp,       setMrp]       = useState("")
  const [cost,      setCost]      = useState("")
  const [category,  setCategory]  = useState("Other")
  const [done,      setDone]      = useState(null)   // {action, name}
  const [error,     setError]     = useState("")
  const [loading,   setLoading]   = useState(false)
  const [manualCode, setManualCode] = useState("")

  const scannerRef = useRef(null)
  const READER_ID  = "barcode-reader"

  // Start/stop camera scanner
  useEffect(() => {
    if (!scanning) return

    const scanner = new Html5Qrcode(READER_ID)
    scannerRef.current = scanner

    scanner.start(
      { facingMode: "environment" },
      {
        fps: 15,
        qrbox: { width: 300, height: 150 },
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      },
      (code) => handleBarcode(code),
      () => {},
    ).catch(e => {
      setError("Camera not available. Enter barcode manually below.")
      setScanning(false)
    })

    return () => {
      scanner.isRunning() && scanner.stop().catch(() => {})
    }
  }, [scanning])

  async function handleBarcode(code) {
    if (loading) return
    // Stop scanner
    if (scannerRef.current?.isRunning()) {
      await scannerRef.current.stop().catch(() => {})
    }
    setScanning(false)
    setLoading(true)
    setError("")

    const token = getToken()
    try {
      const res = await fetch(`${API}/invoice-scan/barcode/${encodeURIComponent(code)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error("Lookup failed")
      const data = await res.json()
      setResult(data)
      if (data.source === "inventory") {
        setQty(1)
      } else if (data.product) {
        setMrp("")
        setCost("")
        setQty(1)
      }
    } catch (e) {
      setError("Could not look up barcode. Check your connection.")
    } finally {
      setLoading(false)
    }
  }

  async function addStock() {
    if (!result?.product?.id) return
    setLoading(true)
    try {
      const cur = parseFloat(result.product.stock || 0)
      await Products.update(result.product.id, { stock: cur + parseFloat(qty) })
      setDone({ action: "stock_updated", name: result.product.name, qty, stock: cur + parseFloat(qty) })
      setResult(null)
    } catch {
      setError("Failed to update stock. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function createProduct() {
    if (!result?.product?.name) return
    setLoading(true)
    try {
      await Products.create({
        name:        result.product.name,
        category:    category || result.product.category || "Other",
        unit:        result.product.unit || "pc",
        mrp:         parseFloat(mrp) || 0,
        cost_price:  parseFloat(cost) || 0,
        stock:       parseFloat(qty) || 0,
        min_stock:   5,
        gst_percent: 0,
        barcode:     result.product.barcode,
      })
      setDone({ action: "product_created", name: result.product.name })
      setResult(null)
    } catch {
      setError("Failed to create product. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function scanAnother() {
    setResult(null); setDone(null); setError("")
    setQty(1); setMrp(""); setCost(""); setManualCode("")
  }

  // ── Done card ────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ padding: 32, textAlign: "center", maxWidth: 380, margin: "0 auto" }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>
          {done.action === "stock_updated" ? "📦" : "✅"}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", marginBottom: 6 }}>
          {done.action === "stock_updated" ? "Stock Updated!" : "Product Created!"}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 8 }}>
          {done.name}
        </div>
        {done.action === "stock_updated" && (
          <div style={{ fontSize: 13, color: "var(--jade)", fontWeight: 600, marginBottom: 24 }}>
            New stock: {done.stock} units
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={scanAnother}
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

  // ── Product found in own inventory ───────────────────────────
  if (result?.source === "inventory" && result.product) {
    const p = result.product
    return (
      <div style={{ padding: 20, maxWidth: 420, margin: "0 auto" }}>
        <div style={{ background: "#ecfdf5", borderRadius: 14, padding: 16, marginBottom: 16,
          border: "1.5px solid #6ee7b7" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#059669", marginBottom: 6,
            letterSpacing: "0.05em" }}>✓ FOUND IN YOUR INVENTORY</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{p.name}</div>
          <div style={{ display: "flex", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>Current Stock</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--jade)" }}>
                {p.stock} {p.unit || "pc"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>MRP</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{INR(p.mrp)}</div>
            </div>
          </div>
        </div>

        <div style={{ background: "var(--bg1)", borderRadius: 14, padding: 16,
          border: "1px solid var(--rule)", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 12 }}>
            Add to Stock
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <button onClick={() => setQty(q => Math.max(1, parseFloat(q) - 1))}
              style={{ width: 36, height: 36, borderRadius: 10, border: "1.5px solid var(--rule)",
                background: "var(--bg2)", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>−</button>
            <input type="number" min="1" step="0.5" value={qty}
              onChange={e => setQty(e.target.value)}
              style={{ flex: 1, textAlign: "center", border: "1.5px solid var(--jade)",
                borderRadius: 10, padding: "8px", fontSize: 18, fontWeight: 700,
                color: "var(--jade)", outline: "none" }}/>
            <button onClick={() => setQty(q => parseFloat(q) + 1)}
              style={{ width: 36, height: 36, borderRadius: 10, border: "1.5px solid var(--rule)",
                background: "var(--bg2)", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>+</button>
            <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>{p.unit || "pc"}</span>
          </div>
          {error && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <button onClick={addStock} disabled={loading}
            style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#0F6E56,#1D9E75)",
              color: "#fff", border: "none", borderRadius: 12, fontSize: 14,
              fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Updating…" : `Add ${qty} ${p.unit || "pc"} to Stock`}
          </button>
        </div>
        <button onClick={scanAnother}
          style={{ width: "100%", padding: "10px", background: "var(--bg2)", color: "var(--ink-dim)",
            border: "none", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Scan Another Product
        </button>
      </div>
    )
  }

  // ── Product found in Open Food Facts (new product) ────────────
  if ((result?.source === "openfoodfacts" || result?.source === "not_found") && result !== null) {
    const p   = result.product || {}
    const isFF = result.source === "openfoodfacts"
    return (
      <div style={{ padding: 20, maxWidth: 420, margin: "0 auto" }}>
        <div style={{ background: isFF ? "#eff6ff" : "#f9fafb", borderRadius: 14,
          padding: 16, marginBottom: 16, border: `1.5px solid ${isFF ? "#93c5fd" : "var(--rule)"}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6,
            color: isFF ? "#2563eb" : "var(--ink-faint)", letterSpacing: "0.05em" }}>
            {isFF ? "📦 FOUND IN GLOBAL DATABASE" : "❓ PRODUCT NOT FOUND"}
          </div>
          {isFF ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
                {p.name || "Unknown Product"}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                {p.category}{p.qty_hint ? ` · ${p.qty_hint}` : ""}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>
              This barcode isn't in your inventory or our global database.
              You can still add it as a new product below.
            </div>
          )}
        </div>

        <div style={{ background: "var(--bg1)", borderRadius: 14, padding: 16,
          border: "1px solid var(--rule)", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 14 }}>
            Add to Inventory
          </div>
          {[
            { label: "Product Name", value: p.name || "", onChange: v => setResult(r => ({...r, product: {...r.product, name: v}})), required: true },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-faint)",
                marginBottom: 4, textTransform: "uppercase" }}>{f.label}</div>
              <input value={f.value} onChange={e => f.onChange(e.target.value)}
                style={{ width: "100%", border: "1.5px solid var(--rule)", borderRadius: 9,
                  padding: "8px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }}/>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-faint)", marginBottom: 4 }}>MRP (₹)</div>
              <input type="number" min="0" step="0.5" value={mrp}
                onChange={e => setMrp(e.target.value)} placeholder="0"
                style={{ width: "100%", border: "1.5px solid var(--rule)", borderRadius: 9,
                  padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }}/>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-faint)", marginBottom: 4 }}>Cost (₹)</div>
              <input type="number" min="0" step="0.5" value={cost}
                onChange={e => setCost(e.target.value)} placeholder="0"
                style={{ width: "100%", border: "1.5px solid var(--rule)", borderRadius: 9,
                  padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }}/>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-faint)", marginBottom: 4 }}>Opening Stock</div>
              <input type="number" min="0" value={qty}
                onChange={e => setQty(e.target.value)} placeholder="0"
                style={{ width: "100%", border: "1.5px solid var(--rule)", borderRadius: 9,
                  padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }}/>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-faint)", marginBottom: 4 }}>Category</div>
              <input value={category} onChange={e => setCategory(e.target.value)}
                style={{ width: "100%", border: "1.5px solid var(--rule)", borderRadius: 9,
                  padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }}/>
            </div>
          </div>
          {error && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <button onClick={createProduct} disabled={loading || !p.name}
            style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700,
              border: "none", borderRadius: 12, cursor: "pointer",
              background: p.name ? "linear-gradient(135deg,#0F6E56,#1D9E75)" : "var(--bg2)",
              color: p.name ? "#fff" : "var(--ink-faint)",
              opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating…" : "Add to Inventory"}
          </button>
        </div>
        <button onClick={scanAnother}
          style={{ width: "100%", padding: "10px", background: "var(--bg2)", color: "var(--ink-dim)",
            border: "none", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Scan Another Product
        </button>
      </div>
    )
  }

  // ── Scanner screen ───────────────────────────────────────────
  return (
    <div style={{ padding: 20, maxWidth: 480, margin: "0 auto" }}>
      {error && (
        <div style={{ marginBottom: 14, padding: "10px 14px", background: "#fef2f2",
          color: "#dc2626", borderRadius: 10, fontSize: 12 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 14, color: "var(--ink-faint)" }}>Looking up barcode…</div>
        </div>
      )}

      {/* Camera viewfinder */}
      {scanning && (
        <div style={{ marginBottom: 16 }}>
          <div id={READER_ID} style={{ borderRadius: 16, overflow: "hidden",
            border: "2px solid var(--jade)" }}/>
          <button onClick={() => setScanning(false)}
            style={{ width: "100%", marginTop: 10, padding: "10px", background: "var(--bg2)",
              color: "var(--ink-dim)", border: "none", borderRadius: 10,
              fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      )}

      {!scanning && !loading && (
        <>
          {/* Start camera button */}
          <button onClick={() => { setError(""); setScanning(true) }}
            style={{ width: "100%", padding: "20px", background: "linear-gradient(135deg,#0F6E56,#1D9E75)",
              color: "#fff", border: "none", borderRadius: 16, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              marginBottom: 20 }}>
            <span style={{ fontSize: 36 }}>📱</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Scan Barcode</span>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Point camera at product barcode</span>
          </button>

          {/* Manual entry fallback */}
          <div style={{ background: "var(--bg1)", borderRadius: 14, padding: 16,
            border: "1px solid var(--rule)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-faint)",
              marginBottom: 10 }}>Or enter barcode manually</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && manualCode && handleBarcode(manualCode)}
                placeholder="e.g. 8901063152021"
                type="tel"
                style={{ flex: 1, border: "1.5px solid var(--rule)", borderRadius: 9,
                  padding: "9px 12px", fontSize: 13, outline: "none" }}/>
              <button
                onClick={() => manualCode && handleBarcode(manualCode)}
                disabled={!manualCode}
                style={{ padding: "9px 16px", background: manualCode ? "var(--jade)" : "var(--bg2)",
                  color: manualCode ? "#fff" : "var(--ink-faint)", border: "none",
                  borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Search
              </button>
            </div>
          </div>

          {/* Tips */}
          <div style={{ marginTop: 20, fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--ink-dim)" }}>Tips:</div>
            <div>• Hold camera steady 10–15 cm from barcode</div>
            <div>• Make sure barcode is well-lit</div>
            <div>• Supports EAN-13, EAN-8, QR codes</div>
            <div>• Works with packaged goods (biscuits, chips, FMCG)</div>
          </div>
        </>
      )}
    </div>
  )
}
