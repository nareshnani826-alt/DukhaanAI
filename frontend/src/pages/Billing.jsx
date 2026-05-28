import { useEffect, useRef, useState } from "react"
import { Products, Invoices, Customers } from "../sync/db.js"
import { useAuth } from "../context/AuthContext.jsx"
import { usePlan } from "../context/PlanContext.jsx"
import BarcodeScanner from "../components/BarcodeScanner.jsx"
import InvoiceView from "../components/InvoiceView.jsx"
import { lookupBarcode as lookupBarcodeAPI } from "../data/barcodeLookup.js"

const hasCamera = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

// ── Pre-invoice review modal ──────────────────────────────
function ReviewModal({ rows, products, onConfirm, onClose }) {
  const [items, setItems] = useState(() =>
    rows.map(r => {
      const p = products.find(x => x.id === r.prodId)
      if (!p) return null
      return {
        prodId:      p.id,
        name:        p.name,
        qty:         +r.qty || 1,
        unit_price:  p.mrp,
        gst_percent: p.gst_percent || 0,
        cost_price:  p.cost_price  || 0,
      }
    }).filter(Boolean)
  )
  const [discountVal,  setDiscountVal]  = useState("")
  const [discountType, setDiscountType] = useState("flat") // "flat" | "percent"

  function setItem(i, k, v) {
    setItems(it => it.map((row, ri) => ri === i ? { ...row, [k]: v } : row))
  }

  const subtotal    = items.reduce((s, i) => s + Math.round(i.unit_price * i.qty * 100) / 100, 0)
  const discountAmt = discountType === "percent"
    ? Math.round(subtotal * (+discountVal || 0) / 100 * 100) / 100
    : Math.min(+discountVal || 0, subtotal)
  const afterDiscount = Math.round((subtotal - discountAmt) * 100) / 100

  // Distribute discount proportionally across items for GST calc
  const gstTotal = items.reduce((s, i) => {
    const itemSub    = Math.round(i.unit_price * i.qty * 100) / 100
    const proportion = subtotal > 0 ? itemSub / subtotal : 0
    const taxable    = Math.round(afterDiscount * proportion * 100) / 100
    return s + Math.round(taxable * i.gst_percent / 100 * 100) / 100
  }, 0)
  const grandTotal = Math.round((afterDiscount + gstTotal) * 100) / 100

  const totalCost = items.reduce((s, i) => s + Math.round(i.cost_price * i.qty * 100) / 100, 0)
  const profit    = Math.round((afterDiscount - totalCost) * 100) / 100
  const profitPct = totalCost > 0 ? Math.round(profit / totalCost * 100) : null

  function handleConfirm() {
    // Build final items — discount distributed proportionally into unit_price
    const finalItems = items.map(i => {
      const itemSub    = Math.round(i.unit_price * i.qty * 100) / 100
      const proportion = subtotal > 0 ? itemSub / subtotal : 0
      const itemDisc   = Math.round(discountAmt * proportion * 100) / 100
      const taxable    = Math.round((itemSub - itemDisc) * 100) / 100
      const effPrice   = i.qty > 0 ? Math.round(taxable / i.qty * 100) / 100 : i.unit_price
      return { product_id: i.prodId, name: i.name, qty: i.qty, unit_price: effPrice, gst_percent: i.gst_percent }
    })
    onConfirm(finalItems, discountAmt)
  }

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
      zIndex:100, display:"flex", alignItems:"flex-start", justifyContent:"center",
      padding:"16px", overflowY:"auto",
    }}>
      <div style={{
        background:"#fff", borderRadius:16, width:"100%", maxWidth:520,
        marginTop:16, marginBottom:16, overflow:"hidden",
        boxShadow:"0 20px 60px rgba(0,0,0,0.2)",
      }}>
        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #f0f0f0",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>Review Invoice</div>
            <div style={{ fontSize:11, color:"#888", marginTop:2 }}>Edit prices, apply discount, confirm GST</div>
          </div>
          <button onClick={onClose} style={{
            background:"#f5f5f5", border:"none", borderRadius:8,
            padding:"6px 12px", fontSize:12, cursor:"pointer", color:"#666",
          }}>✕ Back</button>
        </div>

        <div style={{ padding:"16px 20px" }}>
          {/* Items table */}
          <div style={{ fontSize:11, fontWeight:600, color:"#555", marginBottom:8 }}>Items</div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#f9fafb" }}>
                  <th style={{ textAlign:"left", padding:"6px 8px", fontWeight:600, color:"#555" }}>Product</th>
                  <th style={{ padding:"6px 8px", fontWeight:600, color:"#555", width:50 }}>Qty</th>
                  <th style={{ padding:"6px 8px", fontWeight:600, color:"#555", width:80 }}>Rate ₹</th>
                  <th style={{ padding:"6px 8px", fontWeight:600, color:"#555", width:60 }}>GST %</th>
                  <th style={{ textAlign:"right", padding:"6px 8px", fontWeight:600, color:"#555" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const total = Math.round(item.unit_price * item.qty * (1 + item.gst_percent / 100) * 100) / 100
                  const itemProfit = Math.round((item.unit_price - item.cost_price) * item.qty * 100) / 100
                  return (
                    <tr key={i} style={{ borderTop:"1px solid #f0f0f0" }}>
                      <td style={{ padding:"8px 8px" }}>
                        <div style={{ fontWeight:500 }}>{item.name}</div>
                        {item.cost_price > 0 && (
                          <div style={{ fontSize:10, color: itemProfit >= 0 ? "#16a34a" : "#dc2626", marginTop:2 }}>
                            {itemProfit >= 0 ? "+" : ""}₹{itemProfit} profit
                          </div>
                        )}
                      </td>
                      <td style={{ padding:"8px 4px" }}>
                        <input type="number" min="0.01" step="0.01" value={item.qty}
                          onChange={e => setItem(i, "qty", +e.target.value || 1)}
                          style={{ width:46, textAlign:"center", border:"1px solid #e5e7eb",
                            borderRadius:6, padding:"4px 2px", fontSize:12 }} />
                      </td>
                      <td style={{ padding:"8px 4px" }}>
                        <input type="number" min="0" step="0.01" value={item.unit_price}
                          onChange={e => setItem(i, "unit_price", +e.target.value || 0)}
                          style={{ width:72, border:"1px solid #e5e7eb", borderRadius:6,
                            padding:"4px 6px", fontSize:12 }} />
                      </td>
                      <td style={{ padding:"8px 4px" }}>
                        <select value={item.gst_percent}
                          onChange={e => setItem(i, "gst_percent", +e.target.value)}
                          style={{ width:56, border:"1px solid #e5e7eb", borderRadius:6,
                            padding:"4px 2px", fontSize:11 }}>
                          {[0,3,5,12,18,28].map(g => <option key={g} value={g}>{g}%</option>)}
                        </select>
                      </td>
                      <td style={{ padding:"8px 8px", textAlign:"right", fontWeight:600, color:"#1D9E75" }}>
                        ₹{total}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Discount */}
          <div style={{ marginTop:16, padding:"12px", background:"#f9fafb", borderRadius:10 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#555", marginBottom:8 }}>Discount</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <select value={discountType} onChange={e => setDiscountType(e.target.value)}
                style={{ border:"1px solid #e5e7eb", borderRadius:8, padding:"7px 8px",
                  fontSize:12, background:"#fff" }}>
                <option value="flat">₹ Flat</option>
                <option value="percent">% Percent</option>
              </select>
              <input type="number" min="0" placeholder="0"
                value={discountVal} onChange={e => setDiscountVal(e.target.value)}
                style={{ flex:1, border:"1px solid #e5e7eb", borderRadius:8, padding:"7px 10px", fontSize:13 }} />
              {discountAmt > 0 && (
                <span style={{ fontSize:12, color:"#dc2626", fontWeight:600, whiteSpace:"nowrap" }}>
                  − ₹{discountAmt}
                </span>
              )}
            </div>
          </div>

          {/* Totals */}
          <div style={{ marginTop:14, padding:"12px", border:"1px solid #e5e7eb", borderRadius:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
              <span style={{ color:"#888" }}>Subtotal</span>
              <span>₹{Math.round(subtotal * 100) / 100}</span>
            </div>
            {discountAmt > 0 && (
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                <span style={{ color:"#dc2626" }}>Discount</span>
                <span style={{ color:"#dc2626" }}>− ₹{discountAmt}</span>
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
              <span style={{ color:"#888" }}>CGST</span>
              <span>₹{Math.round(gstTotal / 2 * 100) / 100}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:10,
              paddingBottom:10, borderBottom:"1px solid #f0f0f0" }}>
              <span style={{ color:"#888" }}>SGST</span>
              <span>₹{Math.round((gstTotal - gstTotal / 2) * 100) / 100}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:15, fontWeight:700 }}>
              <span>Grand Total</span>
              <span style={{ color:"#1D9E75" }}>₹{grandTotal}</span>
            </div>
          </div>

          {/* Profit */}
          {totalCost > 0 && (
            <div style={{
              marginTop:10, padding:"10px 12px", borderRadius:10,
              background: profit >= 0 ? "#f0fdf4" : "#fff1f2",
              border: `1px solid ${profit >= 0 ? "#bbf7d0" : "#fecdd3"}`,
              display:"flex", justifyContent:"space-between", alignItems:"center",
            }}>
              <span style={{ fontSize:12, color:"#555" }}>Estimated Profit</span>
              <span style={{ fontSize:13, fontWeight:700, color: profit >= 0 ? "#16a34a" : "#dc2626" }}>
                {profit >= 0 ? "+" : ""}₹{profit}
                {profitPct !== null && (
                  <span style={{ fontSize:11, fontWeight:400, marginLeft:6 }}>({profitPct}%)</span>
                )}
              </span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <button onClick={onClose}
              style={{ flex:1, padding:"11px", borderRadius:10, border:"1px solid #e5e7eb",
                background:"#fff", fontSize:13, cursor:"pointer", color:"#666" }}>
              ← Edit Bill
            </button>
            <button onClick={handleConfirm}
              style={{ flex:2, padding:"11px", borderRadius:10, border:"none",
                background:"#1D9E75", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              Confirm & Generate Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  const [showReview, setShowReview] = useState(false)
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
  function openReview() {
    if (!cust.trim()) return showNotif("Customer name is required")
    const valid = rows.filter(r => getProduct(r.prodId) && +r.qty > 0)
    if (!valid.length) return showNotif("Add at least one item with valid quantity")
    setShowReview(true)
  }

  async function handleReviewConfirm(finalItems) {
    setShowReview(false)
    setSaving(true)
    try {
      const inv = await Invoices.generate({
        customer_name:  cust,
        customer_phone: phone || null,
        customer_gstin: gstin || null,
        payment_mode:   pay,
        items:          finalItems,
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

      {showReview && (
        <ReviewModal
          rows={rows}
          products={products}
          onConfirm={handleReviewConfirm}
          onClose={() => setShowReview(false)}
        />
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
            <button onClick={openReview} disabled={saving} className="btn btn-primary flex-1">
              {saving ? "Generating..." : "Review & Generate Invoice"}
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
              <div className="mb-3 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                <InvoiceView invoice={invoice} customerPhone={phone} />
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
