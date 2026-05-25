import { useEffect, useRef, useState } from "react"
import { Products, Invoices, Customers } from "../sync/db.js"
import { useAuth } from "../context/AuthContext.jsx"
import { usePlan } from "../context/PlanContext.jsx"
import BarcodeScanner from "../components/BarcodeScanner.jsx"
import { lookupBarcode as lookupBarcodeAPI } from "../data/barcodeLookup.js"

const hasCamera = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

export default function Billing() {
  const { vendor }  = useAuth()
  const { hasFeature } = usePlan()
  const [products,  setProducts]  = useState([])
  const [rows,      setRows]      = useState([])
  const [cust,      setCust]      = useState("")
  const [phone,     setPhone]     = useState("")
  const [gstin,     setGstin]     = useState("")
  const [pay,       setPay]       = useState("Cash")
  const [invoice,   setInvoice]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [notif,     setNotif]     = useState("")
  const [scanner,   setScanner]   = useState(false)
  const [barcodeInput, setBarcodeInput] = useState("")
  const [barcodeResult, setBarcodeResult] = useState(null)
  const [quickAdd, setQuickAdd] = useState(null)  // { code, name, mrp, gst }
  const barcodeRef = useRef(null)

  useEffect(() => {
    Products.list().then(p => {
      setProducts(p)
      setRows([])  // start empty — vendor adds items manually or by search
    })
  }, [])

  function showNotif(m, dur = 2500) {
    setNotif(m); setTimeout(() => setNotif(""), dur)
  }

  const getProduct = id => products.find(p => p.id === id) || null
  const setRow = (i, k, v) => setRows(r => r.map((row, ri) => ri === i ? { ...row, [k]: v } : row))
  const addRow = ()  => setRows(r => [...r, { prodId: products[0]?.id || "", qty: 1, isNew: true }])
  const delRow = i   => setRows(r => r.filter((_, ri) => ri !== i))

  // ── Barcode lookup (manual + camera) ─────────────────────
  async function lookupBarcode(code) {
    const q = (code || barcodeInput).trim()
    if (!q) return
    const matched = products.find(p =>
      p.barcode === q ||
      p.sku === q ||
      p.sku?.replace(/[-\s]/g, "") === q.replace(/[-\s]/g, "") ||
      p.name.toLowerCase().includes(q.toLowerCase())
    )
    if (matched) {
      setBarcodeResult(matched)
      return
    }
    // Not in local inventory — try external catalogs so we can offer Quick Add
    setBarcodeResult({ notFound: true, code: q, looking: true })
    try {
      const ext = await lookupBarcodeAPI(q, "kirana")
      setBarcodeResult({ notFound: true, code: q, looking: false, ext })
    } catch (e) {
      setBarcodeResult({ notFound: true, code: q, looking: false, ext: { found:false, diag: e.message } })
    }
  }

  async function quickAddToInventoryAndBill(code, ext) {
    try {
      const newProd = await Products.create({
        name:        ext?.name || `Item ${code}`,
        sku:         code,
        category:    ext?.category || "Other",
        unit:        "piece",
        stock:       Number(ext?.stock) || 1,
        min_stock:   10,
        mrp:         ext?.mrp ? Number(ext.mrp) : 0,
        cost_price:  ext?.cost_price ? Number(ext.cost_price) : 0,
        gst_percent: ext?.gst_percent ?? 5,
      })
      const updated = await Products.list()
      setProducts(updated)
      const created = updated.find(p => p.id === newProd.id) || newProd
      addBarcodeProductToBill(created)
      setQuickAdd(null)
      showNotif(`✓ ${created.name} added to inventory & bill`)
    } catch (e) {
      showNotif("Quick add failed: " + e.message)
    }
  }

  function addBarcodeProductToBill(product) {
    setRows(rows => {
      const existing = rows.findIndex(r => r.prodId === product.id)
      if (existing >= 0) {
        const updated = [...rows]
        updated[existing] = { ...updated[existing], qty: updated[existing].qty + 1 }
        return updated
      }
      return [...rows, { prodId: product.id, qty: 1 }]
    })
    setBarcodeInput("")
    setBarcodeResult(null)
    showNotif(`✓ ${product.name} added to bill`)
    barcodeRef.current?.focus()
  }

  function handleCameraBarcode(code) {
    setScanner(false)
    setBarcodeInput(code)
    lookupBarcode(code)
  }

  // ── Totals ────────────────────────────────────────────────
  const totals = rows.reduce((acc, row) => {
    const p = getProduct(row.prodId); if (!p) return acc
    const sub = Math.round(p.mrp * row.qty * 100) / 100
    const tax = Math.round(sub * p.gst_percent / 100 * 100) / 100
    return { sub: acc.sub + sub, tax: acc.tax + tax }
  }, { sub: 0, tax: 0 })
  const grandTotal = Math.round((totals.sub + totals.tax) * 100) / 100

  // ── Generate invoice ──────────────────────────────────────
  async function generate() {
    if (!cust.trim()) return showNotif("Customer name is required")
    const items = rows.map(r => {
      const p = getProduct(r.prodId)
      if (!p) return null
      const qty = +r.qty
      if (!qty || qty <= 0) return null
      return { product_id: p.id, name: p.name, qty, unit_price: p.mrp, gst_percent: p.gst_percent }
    }).filter(Boolean)
    if (!items.length) return showNotif("Add at least one item with valid quantity")
    setSaving(true)
    try {
      const inv = await Invoices.generate({
        customer_name:  cust,
        customer_phone: phone || null,
        customer_gstin: gstin || null,
        payment_mode:   pay,
        items,
      })
      setInvoice({ ...inv, customer_phone: phone })
      if (cust.trim()) await Customers.upsert({ name: cust, phone: phone||null, gstin: gstin||null, amount: inv.total })
      showNotif(`Invoice ${inv.invoice_no} generated!`)
    } catch(e) { showNotif("Error: " + e.message) }
    finally { setSaving(false) }
  }

  // ── WhatsApp share ────────────────────────────────────────
  function shareWhatsApp() {
    if (!invoice) return
    const lines = invoice.items.map(i => `  • ${i.name} × ${i.qty} = ₹${i.total}`).join("\n")
    const msg =
`🧾 *Invoice ${invoice.invoice_no}*
Store: ${vendor?.store_name || "DukaanAI"}
GSTIN: ${vendor?.gstin || "—"}
Date: ${new Date(invoice.created_at).toLocaleDateString("en-IN")}

Customer: *${invoice.customer_name}*
Payment: ${invoice.payment_mode}

Items:
${lines}

Subtotal: ₹${invoice.subtotal}
CGST: ₹${invoice.cgst} | SGST: ₹${invoice.sgst}
*Total: ₹${invoice.total}*

Thank you for shopping! 🙏`
    const num = (phone || "").replace(/\D/g, "")
    window.open(`https://wa.me/${num ? "91" + num : ""}?text=${encodeURIComponent(msg)}`, "_blank")
  }

  function clearBill() {
    setRows([])
    setCust(""); setPhone(""); setGstin("")
    setInvoice(null); setBarcodeInput(""); setBarcodeResult(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {notif && (
        <div className="fixed top-4 right-4 bg-primary text-white px-4 py-2 rounded-lg text-xs z-50 max-w-xs shadow-lg">
          {notif}
        </div>
      )}

      {scanner && hasFeature("barcode_scanner") && (
        <BarcodeScanner onDetected={handleCameraBarcode} onClose={() => setScanner(false)} />
      )}

      <div className="page-sticky-header flex items-center justify-between mb-4">
        <h1 className="text-sm font-semibold">GST Billing</h1>
        <span className="badge badge-green">Auto CGST + SGST</span>
      </div>

      {/* ── Barcode search bar ─────────────────────────────── */}
      <div className="card mb-3">
        <div className="text-xs font-medium text-gray-600 mb-2">
          Barcode / Product search
        </div>
        <div className="flex gap-2">
          <input
            ref={barcodeRef}
            className="input flex-1"
            value={barcodeInput}
            onChange={e => { setBarcodeInput(e.target.value); setBarcodeResult(null) }}
            onKeyDown={e => e.key === "Enter" && lookupBarcode()}
            placeholder="Type barcode number or product name → press Enter"
          />
          <button onClick={() => lookupBarcode()} className="btn btn-primary btn-sm px-4">
            Search
          </button>
          {hasCamera() && hasFeature("barcode_scanner") && (
            <button onClick={() => setScanner(true)} className="btn btn-sm px-3" title="Use camera scanner">
              📷
            </button>
          )}
        </div>

        {/* Search result */}
        {barcodeResult && (
          <div className={`mt-2 p-3 rounded-lg text-xs ${barcodeResult.notFound ? "bg-red-50" : "bg-primary-light"}`}>
            {barcodeResult.notFound ? (
              <div>
                <div className="text-red-600">
                  No product found in your inventory for "{barcodeResult.code}".
                </div>
                {barcodeResult.looking && (
                  <div className="mt-1 text-gray-500">Looking up product catalogs…</div>
                )}
                {!barcodeResult.looking && barcodeResult.ext?.found && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-gray-700">{barcodeResult.ext.name}</div>
                      <div className="text-gray-500 mt-0.5">
                        {barcodeResult.ext.brand ? `${barcodeResult.ext.brand} · ` : ""}
                        {barcodeResult.ext.category}
                        {barcodeResult.ext.mrp ? ` · MRP ₹${barcodeResult.ext.mrp}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => quickAddToInventoryAndBill(barcodeResult.code, barcodeResult.ext)}
                      className="btn btn-primary btn-sm whitespace-nowrap">
                      + Add to inventory & bill
                    </button>
                  </div>
                )}
                {!barcodeResult.looking && !barcodeResult.ext?.found && !quickAdd && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="text-gray-600">
                      Not in public catalogs. Register it quickly here:
                    </div>
                    <button
                      onClick={() => setQuickAdd({ code: barcodeResult.code, name:"", mrp:"", stock:"1", gst_percent:5, category:"Other" })}
                      className="btn btn-primary btn-sm whitespace-nowrap">
                      + Quick Add
                    </button>
                  </div>
                )}
                {quickAdd && quickAdd.code === barcodeResult.code && (
                  <div className="mt-3 p-3 rounded-lg bg-white border border-gray-200 space-y-2">
                    <div className="text-[11px] text-gray-500">Barcode: <span className="font-mono">{quickAdd.code}</span></div>
                    <input
                      className="input w-full"
                      placeholder="Product name *"
                      value={quickAdd.name}
                      onChange={e => setQuickAdd(q => ({...q, name:e.target.value}))}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <input
                        className="input flex-1"
                        type="number"
                        placeholder="MRP ₹"
                        value={quickAdd.mrp}
                        onChange={e => setQuickAdd(q => ({...q, mrp:e.target.value}))}
                      />
                      <input
                        className="input w-20"
                        type="number"
                        placeholder="Qty"
                        value={quickAdd.stock}
                        onChange={e => setQuickAdd(q => ({...q, stock:e.target.value}))}
                      />
                      <select
                        className="input w-20"
                        value={quickAdd.gst_percent}
                        onChange={e => setQuickAdd(q => ({...q, gst_percent:Number(e.target.value)}))}
                      >
                        {[0,5,12,18,28].map(g => <option key={g} value={g}>{g}%</option>)}
                      </select>
                    </div>
                    <select
                      className="input w-full"
                      value={quickAdd.category}
                      onChange={e => setQuickAdd(q => ({...q, category:e.target.value}))}
                    >
                      {["Staples","Dairy","Oils","Beverages","Snacks","Personal Care","Other"].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setQuickAdd(null)} className="btn btn-sm text-gray-500">Cancel</button>
                      <button
                        disabled={!quickAdd.name.trim() || !quickAdd.mrp}
                        onClick={() => quickAddToInventoryAndBill(quickAdd.code, {
                          name:        quickAdd.name.trim(),
                          category:    quickAdd.category,
                          mrp:         quickAdd.mrp,
                          stock:       quickAdd.stock,
                          gst_percent: quickAdd.gst_percent,
                        })}
                        className="btn btn-primary btn-sm">
                        Save & Add to Bill
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-primary-dark">{barcodeResult.name}</div>
                  <div className="text-primary-dark/70 mt-0.5">
                    MRP: ₹{barcodeResult.mrp} · Stock: {barcodeResult.stock} units ·
                    GST: {barcodeResult.gst_percent}%
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addBarcodeProductToBill(barcodeResult)}
                    className="btn btn-primary btn-sm">
                    + Add to bill
                  </button>
                  <button
                    onClick={() => { setBarcodeInput(""); setBarcodeResult(null) }}
                    className="btn btn-sm text-gray-400">
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tip for desktop users */}
        {!hasCamera() && (
          <div className="mt-1.5 text-[10px] text-gray-400">
            💡 Desktop tip: plug in a USB barcode scanner — it types the code automatically. Press Enter to search.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left: bill form */}
        <div className="card">
          <div className="text-xs font-medium text-gray-600 mb-3">Customer details</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="col-span-2">
              <label className="label">Customer Name *</label>
              <input className="input" value={cust} onChange={e => setCust(e.target.value)} placeholder="Ravi Kirana Mart" />
            </div>
            <div>
              <label className="label">Phone (for WhatsApp)</label>
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" />
            </div>
            <div>
              <label className="label">GSTIN</label>
              <input className="input" value={gstin} onChange={e => setGstin(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="label">Payment</label>
              <select className="input" value={pay} onChange={e => setPay(e.target.value)}>
                {["Cash","UPI","Credit","Cheque"].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-600 mb-2">Items</div>
          <div className="overflow-x-auto -mx-1">
          <table className="w-full mb-2 min-w-[480px]">
            <thead><tr>
              <th className="th">Product</th>
              <th className="th w-16">Qty</th>
              <th className="th">Rate</th>
              <th className="th">GST</th>
              <th className="th">Total</th>
              <th className="th w-6"></th>
            </tr></thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan="6" className="td text-center py-4 text-gray-400 text-[11px]">
                    No items yet — search a product above or click "+ Add item"
                  </td>
                </tr>
              )}
              {rows.map((row, i) => {
                const p = getProduct(row.prodId)
                const total = p ? Math.round(p.mrp * row.qty * (1 + p.gst_percent/100) * 100)/100 : 0
                return (
                  <tr key={i}>
                    <td className="td">
                      <select className="input py-1 text-[11px]" value={row.prodId}
                        onChange={e => setRow(i, "prodId", e.target.value)}>
                        <option value="">— Select product —</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="td">
                      <input type="number" min="1" value={row.qty}
                        onChange={e => setRow(i, "qty", +e.target.value || 1)}
                        className="input py-1 w-14 text-center text-[11px]" />
                    </td>
                    <td className="td text-xs">{p ? "₹"+p.mrp : "—"}</td>
                    <td className="td text-xs">{p ? p.gst_percent+"%" : "—"}</td>
                    <td className="td text-xs font-medium text-primary">{p ? "₹"+total : "—"}</td>
                    <td className="td">
                      <button onClick={() => delRow(i)}
                        className="w-6 h-6 rounded-full bg-red-50 text-red-400 hover:bg-red-100 text-sm font-bold flex items-center justify-center">
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          </div>
          <button onClick={addRow} className="btn btn-sm mb-3">+ Add item</button>

          <div className="text-right text-xs text-gray-500 mb-3">
            Subtotal: ₹{Math.round(totals.sub*100)/100} &nbsp;|&nbsp;
            CGST: ₹{Math.round(totals.tax/2*100)/100} &nbsp;|&nbsp;
            SGST: ₹{Math.round(totals.tax/2*100)/100}<br/>
            <span className="text-base font-semibold text-primary">Total: ₹{grandTotal}</span>
          </div>

          <div className="flex gap-2">
            <button onClick={generate} disabled={saving} className="btn btn-primary flex-1">
              {saving ? "Generating..." : "Generate Invoice"}
            </button>
            <button onClick={clearBill} className="btn">Clear</button>
          </div>
        </div>

        {/* Right: invoice preview */}
        <div className="card">
          <div className="text-xs font-medium text-gray-600 mb-3">Invoice Preview</div>
          {!invoice ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
              <div className="text-4xl">🧾</div>
              <div className="text-xs text-gray-300">
                Generate an invoice to preview and share on WhatsApp
              </div>
            </div>
          ) : (
            <>
              <div className="border border-dashed border-gray-200 rounded-lg p-4 text-xs mb-3">
                <div className="text-center mb-3">
                  <div className="font-semibold text-sm">{vendor?.store_name || "DukaanAI"}</div>
                  <div className="text-[10px] text-gray-400">GSTIN: {vendor?.gstin || "—"}</div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mb-2 pb-2 border-b border-gray-100">
                  <span className="font-medium">{invoice.invoice_no}</span>
                  <span>{new Date(invoice.created_at).toLocaleDateString("en-IN")}</span>
                </div>
                <div className="text-[10px] mb-2">
                  Customer: <span className="font-medium">{invoice.customer_name}</span>
                  {phone && <span className="text-gray-400"> · {phone}</span>}
                </div>
                <table className="w-full text-[10px] mb-2">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-1">Item</th>
                      <th className="p-1 text-center">Qty</th>
                      <th className="p-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((it, i) => (
                      <tr key={i}>
                        <td className="p-1">{it.name}</td>
                        <td className="p-1 text-center">{it.qty}</td>
                        <td className="p-1 text-right">₹{it.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-right text-[10px] text-gray-500 border-t border-gray-100 pt-2">
                  CGST: ₹{invoice.cgst} &nbsp;|&nbsp; SGST: ₹{invoice.sgst}<br/>
                  <span className="text-sm font-semibold text-primary">Total: ₹{invoice.total}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={shareWhatsApp}
                  className="w-full py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ background:"#25D366", color:"var(--bg1)", border:"none" }}>
                  Send on WhatsApp
                </button>
                <button onClick={() => window.print()} className="btn w-full text-xs">
                  Print Invoice
                </button>
                <button onClick={clearBill} className="btn w-full text-xs text-gray-400">
                  New Bill
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
