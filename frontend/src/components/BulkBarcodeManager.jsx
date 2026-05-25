import { useEffect, useRef, useState } from "react"
import { Products } from "../sync/db.js"

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

// EAN-13 with valid checksum, prefix 200 (in-store range), padded with timestamp/id hash
function ean13Checksum(twelve) {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(twelve[i], 10) * (i % 2 === 0 ? 1 : 3)
  }
  return ((10 - (sum % 10)) % 10).toString()
}

function generateBarcodeFor(product, usedSet) {
  // Hash the product id for stability
  const hash = Math.abs(
    String(product.id || Math.random())
      .split("")
      .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0)
  ).toString().padStart(9, "0").slice(0, 9)
  let twelve = "200" + hash
  let suffix = 0
  while (usedSet.has(twelve + ean13Checksum(twelve))) {
    suffix++
    const variant = (parseInt(hash, 10) + suffix).toString().padStart(9, "0").slice(0, 9)
    twelve = "200" + variant
    if (suffix > 999) break
  }
  return twelve + ean13Checksum(twelve)
}

function hasUsableBarcode(p) {
  return p.sku && /^\d{8,13}$/.test(p.sku)
}

export default function BulkBarcodeManager({ products, onClose, onChanged }) {
  const [selected, setSelected] = useState(() => new Set())
  const [assigning, setAssigning] = useState(false)
  const [progress, setProgress] = useState("")
  const [localProducts, setLocalProducts] = useState(products)
  const [filter, setFilter] = useState("missing") // missing | all
  const [search, setSearch] = useState("")

  const missing = localProducts.filter(p => !hasUsableBarcode(p))
  const visible = (filter === "missing" ? missing : localProducts)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  function toggle(id) {
    setSelected(s => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  function selectAll() { setSelected(new Set(visible.map(p => p.id))) }
  function clearSel()  { setSelected(new Set()) }

  async function assignBarcodes(target) {
    setAssigning(true)
    try {
      const used = new Set(localProducts.map(p => p.sku).filter(Boolean))
      const updated = [...localProducts]
      let i = 0
      for (const p of target) {
        i++
        setProgress(`Generating ${i}/${target.length}…`)
        const code = generateBarcodeFor(p, used)
        used.add(code)
        await Products.update(p.id, { sku: code })
        const idx = updated.findIndex(x => x.id === p.id)
        if (idx >= 0) updated[idx] = { ...updated[idx], sku: code }
      }
      setLocalProducts(updated)
      setProgress(`✓ Generated ${target.length} barcode${target.length>1?"s":""}`)
      onChanged && onChanged()
      setTimeout(() => setProgress(""), 2500)
    } catch (e) {
      setProgress("Error: " + e.message)
    } finally {
      setAssigning(false)
    }
  }

  function generateForMissing() {
    if (!missing.length) return
    assignBarcodes(missing)
  }
  function generateForSelected() {
    const target = localProducts.filter(p => selected.has(p.id) && !hasUsableBarcode(p))
    if (!target.length) return
    assignBarcodes(target)
  }

  async function printLabels(target, copiesPerProduct = 1) {
    try {
      await loadJsBarcode()
    } catch (e) {
      alert("Could not load barcode library: " + e.message)
      return
    }
    const win = window.open("", "_blank")
    if (!win) { alert("Pop-up blocked. Allow pop-ups to print labels."); return }

    const items = target
      .filter(p => hasUsableBarcode(p))
      .flatMap(p => Array(copiesPerProduct).fill(p))

    if (!items.length) {
      win.document.write("<p>No products with barcodes selected.</p>")
      win.document.close()
      return
    }

    const labelsHtml = items.map((p, i) => `
      <div class="lbl">
        <div class="name">${escapeHtml(p.name).slice(0, 28)}</div>
        <svg id="bc-${i}"></svg>
        <div class="mrp">MRP ₹${p.mrp ?? 0}</div>
      </div>
    `).join("")

    win.document.write(`<!DOCTYPE html><html><head>
      <title>Barcode Labels (${items.length})</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 8mm; }
        .toolbar { margin-bottom: 10px; display:flex; gap:8px; align-items:center; }
        .grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:6px; }
        .lbl  { border:1px dashed #bbb; border-radius:4px; padding:6px; text-align:center; page-break-inside:avoid; }
        .name { font-size:10px; font-weight:600; margin-bottom:2px; min-height:24px; }
        .mrp  { font-size:11px; margin-top:2px; font-weight:600; }
        svg { width:100%; height:auto; max-height:50px; }
        @media print { .toolbar { display:none; } @page { margin: 6mm; } }
      </style>
      <script src="${JsBarcode_CDN}"></script>
    </head>
    <body>
      <div class="toolbar">
        <b>Barcode labels — ${items.length} sticker${items.length>1?"s":""}</b>
        <button onclick="window.print()" style="background:#1D9E75;color:#fff;border:none;padding:6px 16px;border-radius:6px;font-size:12px;cursor:pointer;margin-left:auto">Print</button>
      </div>
      <div class="grid">${labelsHtml}</div>
      <script>
        window.addEventListener('load', () => {
          const data = ${JSON.stringify(items.map(p => p.sku))};
          data.forEach((code, i) => {
            try { JsBarcode('#bc-' + i, code, { format:'EAN13', width:1.6, height:40, fontSize:10, margin:2 }) }
            catch(e) { try { JsBarcode('#bc-' + i, code, { format:'CODE128', width:1.6, height:40, fontSize:10, margin:2 }) } catch(_){} }
          });
        });
      <\/script>
    </body></html>`)
    win.document.close()
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]))
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b flex items-center justify-between">
          <div>
            <div className="text-sm font-bold">Bulk Barcode Manager</div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {missing.length} of {localProducts.length} products need a barcode
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 text-lg">✕</button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 border-b flex flex-wrap gap-2 items-center">
          <input
            className="input flex-1 min-w-[140px]"
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="input"
            style={{ width: 130 }}
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="missing">Without barcode</option>
            <option value="all">All products</option>
          </select>
        </div>

        {/* Bulk actions */}
        <div className="px-5 py-3 border-b bg-gray-50 flex flex-wrap gap-2">
          <button
            onClick={generateForMissing}
            disabled={!missing.length || assigning}
            className="btn btn-primary btn-sm"
            title="Generate unique in-store barcodes for every product that doesn't have one"
          >
            ⚡ Generate for {missing.length} missing
          </button>
          <button
            onClick={generateForSelected}
            disabled={!selected.size || assigning}
            className="btn btn-sm"
          >
            Generate for selected ({selected.size})
          </button>
          <button
            onClick={() => printLabels(localProducts.filter(p => selected.has(p.id)))}
            disabled={!selected.size}
            className="btn btn-sm"
          >
            🖨 Print selected ({selected.size})
          </button>
          <button
            onClick={() => printLabels(localProducts.filter(hasUsableBarcode))}
            className="btn btn-sm"
          >
            🖨 Print all
          </button>
        </div>

        {progress && (
          <div className="px-5 py-2 text-xs bg-amber-50 text-amber-700 border-b">{progress}</div>
        )}

        {/* Product list */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {visible.length === 0 && (
            <div className="text-center text-gray-400 text-xs py-10">
              {filter === "missing" ? "All products already have barcodes 🎉" : "No products."}
            </div>
          )}
          {visible.length > 0 && (
            <div className="text-[11px] text-gray-500 mb-2 flex gap-3">
              <button onClick={selectAll} className="underline">Select visible</button>
              <button onClick={clearSel} className="underline">Clear</button>
            </div>
          )}
          {visible.map(p => (
            <label
              key={p.id}
              className="flex items-center gap-3 py-2 border-b last:border-0 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{p.name}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {p.category} · MRP ₹{p.mrp ?? 0}
                  {hasUsableBarcode(p)
                    ? <span className="ml-2 font-mono text-emerald-600">{p.sku}</span>
                    : <span className="ml-2 text-amber-600">no barcode</span>}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t text-[11px] text-gray-500">
          Tip: Generate once → click <b>Print all</b> → stick labels on items. Future scans
          will auto-match — no need to register each time.
        </div>
      </div>
    </div>
  )
}
