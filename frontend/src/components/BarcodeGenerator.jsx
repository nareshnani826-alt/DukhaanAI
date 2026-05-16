import { useEffect, useRef, useState } from "react"

const JsBarcode_CDN = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"

function loadJsBarcode() {
  return new Promise((resolve, reject) => {
    if (window.JsBarcode) return resolve(window.JsBarcode)
    const s = document.createElement("script")
    s.src = JsBarcode_CDN
    s.onload  = () => resolve(window.JsBarcode)
    s.onerror = () => reject(new Error("Failed to load barcode library"))
    document.head.appendChild(s)
  })
}

// Generate a unique DukaanAI barcode from product id
function generateCode(product) {
  // Use existing SKU if it looks like a barcode (all digits, 8-13 chars)
  if (product.sku && /^\d{8,13}$/.test(product.sku)) return product.sku
  // Otherwise generate: 200 (custom range) + product id hash (9 digits) = 12 digits
  const hash = Math.abs(
    (product.id || "").split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0)
  ).toString().padStart(9, "0").slice(0, 9)
  return "200" + hash  // 12 digits — Code128 compatible
}

export default function BarcodeGenerator({ product, onClose, onSaveBarcode }) {
  const svgRef    = useRef(null)
  const printRef  = useRef(null)
  const [qty,     setQty]    = useState(1)
  const [code,    setCode]   = useState(generateCode(product))
  const [loaded,  setLoaded] = useState(false)
  const [error,   setError]  = useState("")

  useEffect(() => {
    loadJsBarcode()
      .then(() => setLoaded(true))
      .catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    if (!loaded || !svgRef.current || !code) return
    try {
      window.JsBarcode(svgRef.current, code, {
        format:      "CODE128",
        width:       2,
        height:      60,
        displayValue: true,
        fontSize:    12,
        margin:      10,
        background:  "#ffffff",
        lineColor:   "#000000",
        text:        product.name.length > 24
                       ? product.name.substring(0, 24) + "…"
                       : product.name,
        textMargin:  4,
      })
    } catch(e) {
      setError("Invalid barcode value: " + e.message)
    }
  }, [loaded, code, product.name])

  function handlePrint() {
    const svg = svgRef.current?.outerHTML || ""
    const labels = Array(qty).fill(`
      <div style="display:inline-block;margin:6px;padding:6px;border:1px dashed #ccc;border-radius:4px;text-align:center;page-break-inside:avoid">
        <div style="font-size:10px;font-weight:600;margin-bottom:2px;max-width:160px;word-wrap:break-word">${product.name}</div>
        ${svg}
        <div style="font-size:11px;margin-top:2px">MRP: ₹${product.mrp}</div>
      </div>
    `).join("")

    const win = window.open("", "_blank")
    win.document.write(`
      <!DOCTYPE html><html><head>
        <title>Barcode Labels — ${product.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 12px; }
          @media print {
            @page { margin: 8mm; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
          <b style="font-size:14px">${product.name} — ${qty} label${qty>1?"s":""}</b>
          <button onclick="window.print()" style="background:#1D9E75;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-size:13px;cursor:pointer">
            Print
          </button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">${labels}</div>
      </body></html>
    `)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  async function handleSave() {
    // Save this barcode as the product's SKU
    try {
      await onSaveBarcode(product.id, code)
      onClose()
    } catch(e) {
      setError("Save failed: " + e.message)
    }
  }

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
      zIndex:200, display:"flex", alignItems:"center", justifyContent:"center",
    }}
    onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"#fff", borderRadius:16, padding:24,
        width:420, maxWidth:"95vw",
        fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:500 }}>Barcode Generator</div>
            <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{product.name}</div>
          </div>
          <button onClick={onClose} style={{
            background:"none", border:"none", fontSize:20,
            cursor:"pointer", color:"#ccc", lineHeight:1,
          }}>×</button>
        </div>

        {error && (
          <div style={{ background:"#fef2f2", color:"#dc2626", borderRadius:8, padding:"8px 12px", fontSize:12, marginBottom:12 }}>
            {error}
          </div>
        )}

        {/* Barcode preview */}
        <div style={{
          background:"#fafafa", border:"1px dashed #e0e0e0",
          borderRadius:10, padding:16, textAlign:"center", marginBottom:14,
        }}>
          {!loaded && !error && (
            <div style={{ color:"#888", fontSize:12, padding:"20px 0" }}>Loading barcode...</div>
          )}
          <svg ref={svgRef} style={{ display: loaded ? "block" : "none", margin:"0 auto" }} />
          <div style={{ fontSize:10, color:"#aaa", marginTop:6 }}>
            MRP: ₹{product.mrp} &nbsp;·&nbsp; {product.category || ""}
          </div>
        </div>

        {/* Custom barcode number */}
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, color:"#666", fontWeight:500, display:"block", marginBottom:4 }}>
            Barcode number (auto-generated — you can change it)
          </label>
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter barcode digits"
            style={{
              width:"100%", padding:"7px 10px", fontSize:13,
              border:"1px solid #e0e0e0", borderRadius:8,
              fontFamily:"monospace", letterSpacing:2,
              boxSizing:"border-box",
            }}
          />
          <div style={{ fontSize:10, color:"#aaa", marginTop:3 }}>
            Numbers only. 8–13 digits recommended. Leave as-is for auto-generated code.
          </div>
        </div>

        {/* Label quantity */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, color:"#666", fontWeight:500, display:"block", marginBottom:4 }}>
            How many labels to print?
          </label>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={() => setQty(q => Math.max(1, q-1))} style={{
              width:32, height:32, borderRadius:8, border:"1px solid #e0e0e0",
              background:"#fff", fontSize:18, cursor:"pointer", lineHeight:1,
            }}>−</button>
            <span style={{ fontSize:16, fontWeight:500, minWidth:32, textAlign:"center" }}>{qty}</span>
            <button onClick={() => setQty(q => Math.min(50, q+1))} style={{
              width:32, height:32, borderRadius:8, border:"1px solid #e0e0e0",
              background:"#fff", fontSize:18, cursor:"pointer", lineHeight:1,
            }}>+</button>
            <span style={{ fontSize:11, color:"#aaa" }}>labels</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <button onClick={handlePrint} style={{
            background:"#1D9E75", color:"#fff", border:"none",
            borderRadius:10, padding:"11px", fontSize:13,
            fontWeight:600, cursor:"pointer", width:"100%",
          }}>
            Print {qty} label{qty > 1 ? "s" : ""}
          </button>
          <button onClick={handleSave} style={{
            background:"transparent", color:"#1D9E75",
            border:"1px solid #1D9E75", borderRadius:10,
            padding:"9px", fontSize:12, cursor:"pointer", width:"100%",
          }}>
            Save barcode to product (link for scanning)
          </button>
          <button onClick={onClose} style={{
            background:"transparent", color:"#aaa", border:"none",
            fontSize:11, cursor:"pointer", padding:"4px",
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
