import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Products, Invoices, Customers, api, isCloud } from "../sync/db.js"
import { useAuth } from "../context/AuthContext.jsx"
import { usePlan } from "../context/PlanContext.jsx"
import BarcodeScanner from "../components/BarcodeScanner.jsx"
import InvoiceView from "../components/InvoiceView.jsx"
import { lookupBarcode as lookupBarcodeAPI } from "../data/barcodeLookup.js"
import { MIN_FONT_SIZE } from "../styles/textScale"
import { getDefaultApplyGst } from "../utils/gstSettings.js"

const hasCamera = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

// ── Pre-invoice review modal ──────────────────────────────
function ReviewModal({ rows, products, applyGst, onConfirm, onClose }) {
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

  // Distribute discount proportionally across items for GST calc.
  // Skipped entirely when the vendor has GST turned off for this bill.
  const gstTotal = !applyGst ? 0 : items.reduce((s, i) => {
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
            <div style={{ fontSize:MIN_FONT_SIZE, color:"#888", marginTop:2 }}>Edit prices, apply discount, confirm GST</div>
          </div>
          <button onClick={onClose} style={{
            background:"#f5f5f5", border:"none", borderRadius:8,
            padding:"6px 12px", fontSize:12, cursor:"pointer", color:"#666",
          }}>✕ Back</button>
        </div>

        <div style={{ padding:"16px 20px" }}>
          {/* Items table */}
          <div style={{ fontSize:MIN_FONT_SIZE, fontWeight:600, color:"#555", marginBottom:8 }}>Items</div>
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
                  const effGst = applyGst ? item.gst_percent : 0
                  const total = Math.round(item.unit_price * item.qty * (1 + effGst / 100) * 100) / 100
                  const itemProfit = Math.round((item.unit_price - item.cost_price) * item.qty * 100) / 100
                  return (
                    <tr key={i} style={{ borderTop:"1px solid #f0f0f0" }}>
                      <td style={{ padding:"8px 8px" }}>
                        <div style={{ fontWeight:500 }}>{item.name}</div>
                        {item.cost_price > 0 && (
                          <div style={{ fontSize:MIN_FONT_SIZE, color: itemProfit >= 0 ? "#16a34a" : "#dc2626", marginTop:2 }}>
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
                            padding:"4px 2px", fontSize:MIN_FONT_SIZE }}>
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
            <div style={{ fontSize:MIN_FONT_SIZE, fontWeight:600, color:"#555", marginBottom:8 }}>Discount</div>
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
            {applyGst ? (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                  <span style={{ color:"#888" }}>CGST</span>
                  <span>₹{Math.round(gstTotal / 2 * 100) / 100}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:10,
                  paddingBottom:10, borderBottom:"1px solid #f0f0f0" }}>
                  <span style={{ color:"#888" }}>SGST</span>
                  <span>₹{Math.round((gstTotal - gstTotal / 2) * 100) / 100}</span>
                </div>
              </>
            ) : (
              <div style={{ fontSize:12, color:"#888", marginBottom:10, paddingBottom:10,
                borderBottom:"1px solid #f0f0f0" }}>
                GST not applied to this bill
              </div>
            )}
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
                  <span style={{ fontSize:MIN_FONT_SIZE, fontWeight:400, marginLeft:6 }}>({profitPct}%)</span>
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

// Category → emoji mapping for cart item icons
const CAT_EMOJI = {
  Dairy:'🥛', Staples:'🌾', Oils:'🛢', Beverages:'🥤', Snacks:'🍪',
  'Personal Care':'🧴', Bakery:'🍞', Eggs:'🥚', Tea:'🫖', Spices:'🧂',
  Fruits:'🍎', Vegetables:'🥦', Other:'📦',
}

export default function Billing() {
  const { vendor }  = useAuth()
  const { hasFeature } = usePlan()
  const navigate    = useNavigate()
  const [dayStatus, setDayStatus] = useState(undefined)

  // Gate: check day session on mount
  useEffect(() => {
    if (!vendor) return
    if (isCloud()) {
      api.get("/day-sessions/today?store_type=kirana")
        .then(s => setDayStatus(s?.status || null))
        .catch(() => setDayStatus(null))
    } else {
      setDayStatus("open")
    }
  }, [vendor?.id])

  // ── core state ────────────────────────────────────────────
  const [products,  setProducts]  = useState([])
  const [rows,      setRows]      = useState([])
  const [cust,      setCust]      = useState("")
  const [phone,     setPhone]     = useState("")
  const [gstin,     setGstin]     = useState("")
  const [pay,       setPay]       = useState("Cash")
  // Most local vendors don't issue GST bills — off by default, vendor opts
  // in per-bill, or sets a store-wide default in Settings.
  const [applyGst,  setApplyGst]  = useState(getDefaultApplyGst)
  const [invoice,   setInvoice]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [notif,     setNotif]     = useState("")
  const [scanner,   setScanner]   = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [quickAdd,  setQuickAdd]  = useState(null)

  // ── billing-first new state ───────────────────────────────
  const [searchQ,      setSearchQ]      = useState("")
  const [barcodeResult,setBarcodeResult]= useState(null)
  const [custExpanded, setCustExpanded] = useState(false)
  const [heldBills,    setHeldBills]    = useState(() => {
    try { return JSON.parse(localStorage.getItem("dk_held_bills") || "[]") } catch { return [] }
  })
  const [showHeld, setShowHeld] = useState(false)

  const searchRef = useRef(null)
  const barcodeRef = useRef(null)   // kept for compat with lookupBarcode

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
    const tax = applyGst ? Math.round(sub * p.gst_percent / 100 * 100) / 100 : 0
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
    const custName = cust.trim() || "Walk-in"
    try {
      const inv = await Invoices.generate({
        customer_name:  custName,
        customer_phone: phone || null,
        customer_gstin: gstin || null,
        payment_mode:   pay,
        apply_gst:      applyGst,
        items:          finalItems,
      })
      setInvoice({ ...inv, customer_phone: phone })
      if (custName !== "Walk-in") await Customers.upsert({ name: custName, phone: phone||null, gstin: gstin||null, amount: inv.total })
      showNotif(`Invoice ${inv.invoice_no} generated!`)
    } catch(e) { showNotif("Error: " + e.message) }
    finally { setSaving(false) }
  }

  // ── WhatsApp share ────────────────────────────────────────
  // Opens WhatsApp (Web or app) with the bill pre-typed — requires the
  // vendor's own WhatsApp to be open/logged in, and a manual tap to send.
  // Used as a fallback when the server-side send (below) isn't available.
  function openWhatsAppLink() {
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

  // Sends the bill directly via the WhatsApp Business API — no app opens,
  // no manual tap. This is opt-in infra: until a WhatsApp Business template
  // is configured (not something we're investing in right now), the backend
  // returns 503 "not configured" — treat that as the normal/expected case
  // and fall back to the free wa.me link with no error shown. Any other
  // failure (a real send attempt that broke) still surfaces to the vendor.
  async function sendWhatsApp() {
    if (!invoice) return
    const num = (phone || "").replace(/\D/g, "")
    if (num.length !== 10) {
      showNotif("Enter the customer's 10-digit phone number first")
      return
    }
    try {
      await api.post(`/invoices/${invoice.id}/send-whatsapp`, { phone: num })
      showNotif("✓ Bill sent via WhatsApp!")
    } catch (e) {
      if (e.status !== 503) showNotif("Couldn't auto-send (" + e.message + ") — opening WhatsApp instead")
      openWhatsAppLink()
    }
  }

  function clearBill() {
    setRows([])
    setCust(""); setPhone(""); setGstin("")
    setInvoice(null); setSearchQ(""); setBarcodeResult(null)
  }

  // ── billing-first helpers ────────────────────────────────

  const [catFilter,    setCatFilter]    = useState("Frequent")
  const [voiceActive,  setVoiceActive]  = useState(false)

  // Instant product search results as user types
  const searchResults = searchQ.trim().length >= 1
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQ.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQ.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQ))
      ).slice(0, 7)
    : []

  function startVoiceSearch() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { showNotif("Voice not supported — use Chrome or Edge"); return }
    setVoiceActive(true)
    const rec = new SR()
    rec.lang          = localStorage.getItem("dk_voice_lang") || "en-IN"
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript.trim()
      setVoiceActive(false)
      setBarcodeResult(null)
      // check if it matches exactly one product
      const matches = products.filter(p =>
        p.name.toLowerCase().includes(text.toLowerCase()) ||
        text.toLowerCase().includes(p.name.toLowerCase().split(" ")[0])
      )
      if (matches.length === 1) {
        addToCart(matches[0])          // auto-add directly
        showNotif(`🎤 "${text}" → ${matches[0].name}`)
      } else {
        setSearchQ(text)               // show results in dropdown
        setTimeout(() => searchRef.current?.focus(), 50)
      }
    }
    rec.onerror = () => { setVoiceActive(false); showNotif("Mic error — check permissions") }
    rec.onend   = () => setVoiceActive(false)
    rec.start()
  }

  function addToCart(product) {
    setRows(prev => {
      const idx = prev.findIndex(r => r.prodId === product.id)
      if (idx >= 0) return prev.map((r, i) => i === idx ? { ...r, qty: r.qty + 1 } : r)
      return [...prev, { prodId: product.id, qty: 1 }]
    })
    setSearchQ("")
    setBarcodeResult(null)
    showNotif(`✓ ${product.name}`)
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  function holdBill() {
    if (!rows.length) { showNotif("Nothing to hold"); return }
    const held = [
      { id: Date.now(), rows, cust: cust || "Walk-in", phone, pay, heldAt: Date.now() },
      ...heldBills,
    ].slice(0, 10)
    setHeldBills(held)
    localStorage.setItem("dk_held_bills", JSON.stringify(held))
    clearBill()
    showNotif("Bill held — tap Held to resume")
  }

  function resumeBill(held) {
    setRows(held.rows)
    setCust(held.cust === "Walk-in" ? "" : held.cust)
    setPhone(held.phone || "")
    setPay(held.pay || "Cash")
    const remaining = heldBills.filter(b => b.id !== held.id)
    setHeldBills(remaining)
    localStorage.setItem("dk_held_bills", JSON.stringify(remaining))
    setShowHeld(false)
  }

  // Listen for held-bills trigger from the nav tab
  useEffect(() => {
    const h = () => setShowHeld(true)
    window.addEventListener("dk:show-held", h)
    return () => window.removeEventListener("dk:show-held", h)
  }, [])

  function openPay() {
    const valid = rows.filter(r => getProduct(r.prodId) && +r.qty > 0)
    if (!valid.length) return showNotif("Add at least one item")
    if (!cust.trim()) setCust("Walk-in")
    setShowReview(true)
  }

  // ── JSX ───────────────────────────────────────────────────
  const INR = n => "₹" + Math.round(n || 0).toLocaleString("en-IN")

  // ── Day session gate ─────────────────────────────────────
  if (dayStatus === undefined) return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:13, color:"var(--ink-faint)" }}>Checking day status…</div>
  )
  if (dayStatus !== "open") return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:32, textAlign:"center", gap:16, background:"var(--bg0)" }}>
      <div style={{ fontSize:48 }}>🔒</div>
      <div style={{ fontSize:18, fontWeight:800, color:"var(--ink)" }}>Day Not Opened</div>
      <div style={{ fontSize:13, color:"var(--ink-faint)", maxWidth:280, lineHeight:1.6 }}>
        {dayStatus === "closed"
          ? "Today's day has been closed. Reopen it from the dashboard to resume billing."
          : "Open today's day from the dashboard before you can start billing."}
      </div>
      <button onClick={() => navigate("/dashboard")}
        style={{ padding:"12px 28px", borderRadius:14, border:"none",
          background:"linear-gradient(135deg,#e87722,#d45f00)", color:"#fff",
          fontSize:14, fontWeight:700, cursor:"pointer",
          boxShadow:"0 4px 16px rgba(232,119,34,0.35)", marginTop:8 }}>
        ← Go to Dashboard
      </button>
    </div>
  )

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"var(--bg0)", position:"relative" }}>

      {/* ── Toast notification ───────────────────── */}
      {notif && (
        <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)",
          zIndex:300, background:"var(--jade)", color:"#fff",
          padding:"8px 18px", borderRadius:999, fontSize:12, fontWeight:700,
          whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.2)", pointerEvents:"none" }}>
          {notif}
        </div>
      )}

      {scanner && (
        <BarcodeScanner onDetected={handleCameraBarcode} onClose={() => setScanner(false)} />
      )}

      {showReview && (
        <ReviewModal rows={rows} products={products} applyGst={applyGst}
          onConfirm={handleReviewConfirm} onClose={() => setShowReview(false)} />
      )}

      {/* ── Held-bills bottom sheet ───────────────── */}
      {showHeld && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end" }}
          onClick={() => setShowHeld(false)}>
          <div style={{ width:"100%", background:"var(--bg1)", borderRadius:"20px 20px 0 0",
            padding:"20px 16px 32px", maxHeight:"70vh", overflowY:"auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:800, color:"var(--ink)" }}>
                Held Bills {heldBills.length > 0 && `(${heldBills.length})`}
              </div>
              <button onClick={() => setShowHeld(false)}
                style={{ background:"none", border:"none", color:"var(--ink-faint)", fontSize:20, cursor:"pointer" }}>✕</button>
            </div>
            {heldBills.length === 0 ? (
              <div style={{ textAlign:"center", padding:"28px 0", color:"var(--ink-faint)", fontSize:13 }}>
                No held bills
              </div>
            ) : heldBills.map(b => {
              const t = b.rows.reduce((s, r) => {
                const p = products.find(x => x.id === r.prodId)
                return s + (p ? p.mrp * r.qty : 0)
              }, 0)
              return (
                <button key={b.id} onClick={() => resumeBill(b)}
                  style={{ width:"100%", background:"var(--bg2)", border:"1px solid var(--rule)",
                    borderRadius:14, padding:"14px", marginBottom:10, textAlign:"left",
                    display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:"var(--saffron-bg)",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🛒</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>
                      {b.cust || "Walk-in"} · {b.rows.reduce((s,r)=>s+r.qty,0)} items
                    </div>
                    <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", marginTop:2 }}>
                      {INR(t)} · {new Date(b.heldAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:"var(--saffron)", fontWeight:700 }}>Resume →</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Invoice bottom-sheet (after generation) ── */}
      {invoice && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.55)",
          display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          {/* Bottom sheet — fixed height, 3-section flex column */}
          <div style={{
            width:"100%", maxWidth:520,
            height:"92dvh",           /* fixed height — no overflow surprises */
            background:"var(--bg1)",
            borderRadius:"20px 20px 0 0",
            display:"flex", flexDirection:"column",
            boxShadow:"0 -8px 40px rgba(0,0,0,0.25)",
          }}>

            {/* ① Header — fixed, never scrolls */}
            <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--rule)",
              display:"flex", justifyContent:"space-between", alignItems:"center",
              flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:18 }}>✅</span>
                <div style={{ fontSize:15, fontWeight:800, color:"var(--jade)" }}>Invoice Generated</div>
              </div>
              <button onClick={clearBill}
                style={{ width:32, height:32, borderRadius:8, background:"var(--bg2)",
                  border:"1px solid var(--rule)", color:"var(--ink-faint)",
                  fontSize:16, cursor:"pointer", display:"flex",
                  alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>

            {/* ② Invoice content — scrollable, flex:1 */}
            <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 8px",
              WebkitOverflowScrolling:"touch" }}>
              <InvoiceView invoice={invoice} customerPhone={phone} />
            </div>

            {/* ③ Action buttons — fixed at bottom, never hidden */}
            <div style={{ flexShrink:0, padding:"12px 16px",
              borderTop:"1px solid var(--rule)", background:"var(--bg1)",
              paddingBottom:"max(16px, env(safe-area-inset-bottom))",
              display:"flex", flexDirection:"column", gap:10 }}>

              {/* UPI QR already shown inside <InvoiceView> above — don't duplicate it here */}

              <div>
                <label style={{ display:"block", fontSize:MIN_FONT_SIZE, fontWeight:700,
                  color:"var(--ink-faint)", marginBottom:4 }}>
                  Customer WhatsApp Number
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="10-digit mobile number" inputMode="numeric" maxLength={10}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10,
                    border:"1.5px solid var(--rule)", fontSize:14, background:"var(--bg2)",
                    color:"var(--ink)", outline:"none", boxSizing:"border-box" }} />
              </div>

              <button onClick={sendWhatsApp}
                style={{ width:"100%", padding:"14px", borderRadius:13, border:"none",
                  background:"#25D366", color:"#fff", fontSize:15, fontWeight:800,
                  cursor:"pointer", display:"flex", alignItems:"center",
                  justifyContent:"center", gap:8 }}>
                📱 Send on WhatsApp
              </button>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <button onClick={() => window.print()}
                  style={{ padding:"12px", borderRadius:12,
                    border:"1px solid var(--rule)", background:"transparent",
                    color:"var(--ink)", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  🖨 Print
                </button>
                <button onClick={clearBill}
                  style={{ padding:"12px", borderRadius:12,
                    border:"1px solid var(--rule)", background:"var(--bg2)",
                    color:"var(--ink-dim)", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  + New Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPACT TOPBAR ───────────────────────── */}
      <div style={{ padding:"10px 14px", background:"var(--bg0)",
        borderBottom:"1px solid var(--rule)", display:"flex", alignItems:"center",
        gap:10, flexShrink:0 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", letterSpacing:"1px", fontWeight:700 }}>GST BILLING</div>
          <div style={{ fontSize:14, color:"var(--ink)", fontWeight:800 }}>New Sale</div>
        </div>
        <button onClick={holdBill}
          style={{ background:"var(--bg2)", border:"1px solid var(--rule)", color:"var(--ink)",
            borderRadius:9, padding:"6px 14px", fontSize:MIN_FONT_SIZE, fontWeight:700, cursor:"pointer" }}>
          Hold
        </button>
        {rows.length > 0 && (
          <button onClick={clearBill}
            style={{ background:"var(--ember-bg)", border:"1px solid rgba(192,57,43,0.25)",
              color:"var(--ember)", borderRadius:9, padding:"6px 14px",
              fontSize:MIN_FONT_SIZE, fontWeight:700, cursor:"pointer" }}>
            Clear
          </button>
        )}
      </div>

      {/* ── SEARCH + SCAN ────────────────────────── */}
      <style>{`@keyframes micPulse{0%,100%{box-shadow:0 0 0 4px rgba(220,38,38,.25)}50%{box-shadow:0 0 0 8px rgba(220,38,38,.08)}}`}</style>
      <div style={{ padding:"10px 14px 8px", background:"var(--bg0)", flexShrink:0, position:"relative", zIndex:50 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {/* Search input */}
          <div style={{
            flex:1, minWidth:0, background:"var(--bg2)",
            border:`2px solid ${searchQ ? "var(--saffron)" : "var(--rule)"}`,
            boxShadow: searchQ ? "0 4px 14px rgba(232,119,34,0.18)" : "none",
            borderRadius:14, padding:"12px 14px", display:"flex", alignItems:"center", gap:10,
            transition:"all 0.15s",
          }}>
            <span style={{ fontSize:18, color: searchQ ? "var(--saffron)" : "var(--ink-faint)", flexShrink:0 }}>🔍</span>
            <input
              ref={searchRef}
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); setBarcodeResult(null) }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  if (searchResults.length === 1) { addToCart(searchResults[0]); return }
                  if (searchResults.length === 0 && searchQ.trim()) {
                    lookupBarcode(searchQ.trim())
                    setSearchQ("")
                  }
                }
                if (e.key === "Escape") setSearchQ("")
              }}
              placeholder="Product name or barcode…"
              style={{ background:"transparent", border:"none", color:"var(--ink)", fontSize:14,
                outline:"none", flex:1, fontWeight:600, minWidth:0 }}
              autoFocus
            />
            {searchQ && (
              <button onClick={() => { setSearchQ(""); setBarcodeResult(null) }}
                style={{ background:"none", border:"none", color:"var(--ink-faint)", fontSize:16, cursor:"pointer", padding:0, flexShrink:0 }}>
                ✕
              </button>
            )}
          </div>

          {/* 🎤 Voice */}
          <button onClick={voiceActive ? undefined : startVoiceSearch}
            title={voiceActive ? "Listening…" : "Voice search"}
            style={{
              width:46, height:46, borderRadius:13, flexShrink:0, cursor: voiceActive ? "default" : "pointer",
              background: voiceActive ? "linear-gradient(135deg,#dc2626,#b91c1c)" : "var(--bg2)",
              border: voiceActive ? "2px solid #dc2626" : "1.5px solid var(--rule)",
              color: voiceActive ? "#fff" : "var(--ink-faint)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:19,
              boxShadow: voiceActive ? "0 0 0 4px rgba(220,38,38,.25)" : "none",
              animation: voiceActive ? "micPulse 1s infinite" : "none",
              transition:"all 0.2s",
            }}>
            🎤
          </button>

          {/* 📷 Barcode scan */}
          <button onClick={() => setScanner(true)} title="Scan barcode"
            style={{ width:46, height:46, borderRadius:13, border:"none", cursor:"pointer", flexShrink:0,
              background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
              color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:20, boxShadow:"0 4px 14px rgba(232,119,34,0.35)" }}>
            📷
          </button>
        </div>

        {/* ── Search suggestions dropdown ─────────── */}
        {searchResults.length > 0 && (
          <div style={{ position:"absolute", left:14, right:14, top:"calc(100% - 4px)",
            background:"var(--bg1)", border:"1px solid var(--rule)",
            borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.18)", overflow:"hidden" }}>
            {searchResults.map((p, i) => (
              <button key={p.id} onClick={() => addToCart(p)}
                style={{ width:"100%", background:"none", border:"none",
                  borderBottom: i < searchResults.length-1 ? "1px solid var(--rule-soft,rgba(0,0,0,0.05))" : "none",
                  padding:"11px 16px", display:"flex", alignItems:"center", gap:12,
                  cursor:"pointer", textAlign:"left" }}
                onMouseEnter={e => e.currentTarget.style.background="var(--bg2)"}
                onMouseLeave={e => e.currentTarget.style.background="none"}>
                <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, fontSize:16,
                  background:"var(--bg2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {CAT_EMOJI[p.category] || "📦"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                  <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", marginTop:1 }}>
                    ₹{p.mrp} · {p.stock} {p.unit||"pcs"} in stock
                    {p.gst_percent > 0 && ` · GST ${p.gst_percent}%`}
                  </div>
                </div>
                <div style={{ fontSize:13, color:"var(--saffron)", fontWeight:800, flexShrink:0 }}>+ Add</div>
              </button>
            ))}
          </div>
        )}

        {/* ── Barcode result banner ─────────────────── */}
        {barcodeResult && (
          <div style={{ marginTop:8, padding:"12px 14px", borderRadius:12,
            background: barcodeResult.notFound ? "var(--ember-bg)" : "var(--jade-bg)",
            border: `1px solid ${barcodeResult.notFound ? "rgba(192,57,43,0.25)" : "rgba(26,122,74,0.25)"}` }}>
            {barcodeResult.notFound ? (
              <div>
                <div style={{ fontSize:12, color:"var(--ember)", fontWeight:700, marginBottom:6 }}>
                  Not found: "{barcodeResult.code}"
                </div>
                {barcodeResult.looking && <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)" }}>Looking up catalogs…</div>}
                {!barcodeResult.looking && barcodeResult.ext?.found && (
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ flex:1, fontSize:12, color:"var(--ink)" }}>
                      <strong>{barcodeResult.ext.name}</strong>
                      {barcodeResult.ext.mrp && ` · ₹${barcodeResult.ext.mrp}`}
                    </div>
                    <button onClick={() => quickAddToInventoryAndBill(barcodeResult.code, barcodeResult.ext)}
                      style={{ padding:"7px 14px", borderRadius:9, border:"none", background:"var(--jade)",
                        color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                      + Add to inventory
                    </button>
                  </div>
                )}
                {!barcodeResult.looking && !barcodeResult.ext?.found && !quickAdd && (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                    <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)" }}>Not in public catalogs.</div>
                    <button onClick={() => setQuickAdd({ code:barcodeResult.code, name:"", mrp:"", stock:"1", gst_percent:5, category:"Other" })}
                      style={{ padding:"7px 14px", borderRadius:9, border:"none", background:"var(--saffron)",
                        color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      + Quick Register
                    </button>
                  </div>
                )}
                {quickAdd && quickAdd.code === barcodeResult.code && (
                  <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:8 }}>
                    <input className="input" placeholder="Product name *" value={quickAdd.name} autoFocus
                      onChange={e => setQuickAdd(q => ({...q, name:e.target.value}))} />
                    <div style={{ display:"flex", gap:8 }}>
                      <input className="input" type="number" placeholder="MRP ₹" value={quickAdd.mrp}
                        onChange={e => setQuickAdd(q => ({...q, mrp:e.target.value}))} style={{ flex:1 }} />
                      <select className="input" value={quickAdd.gst_percent}
                        onChange={e => setQuickAdd(q => ({...q, gst_percent:Number(e.target.value)}))}>
                        {[0,5,12,18,28].map(g => <option key={g} value={g}>{g}% GST</option>)}
                      </select>
                    </div>
                    <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                      <button onClick={() => setQuickAdd(null)} className="btn btn-sm text-gray-500">Cancel</button>
                      <button disabled={!quickAdd.name.trim() || !quickAdd.mrp}
                        onClick={() => quickAddToInventoryAndBill(quickAdd.code, { name:quickAdd.name.trim(), category:quickAdd.category, mrp:quickAdd.mrp, stock:quickAdd.stock, gst_percent:quickAdd.gst_percent })}
                        className="btn btn-primary btn-sm">Save & Add to Bill</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--jade)" }}>{barcodeResult.name}</div>
                  <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", marginTop:2 }}>
                    ₹{barcodeResult.mrp} · Stock: {barcodeResult.stock} · GST {barcodeResult.gst_percent}%
                  </div>
                </div>
                <button onClick={() => addBarcodeProductToBill(barcodeResult)}
                  style={{ padding:"8px 16px", borderRadius:10, border:"none", background:"var(--jade)",
                    color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  + Add to bill
                </button>
                <button onClick={() => setBarcodeResult(null)}
                  style={{ background:"none", border:"none", color:"var(--ink-faint)", cursor:"pointer", fontSize:18 }}>✕</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CUSTOMER PILL ────────────────────────── */}
      <div style={{ padding:"0 14px 8px", background:"var(--bg0)", flexShrink:0 }}>
        {custExpanded ? (
          <div style={{ background:"var(--bg2)", border:"1px solid var(--rule)", borderRadius:12, padding:"12px 14px" }}>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <input value={cust} onChange={e => setCust(e.target.value)} placeholder="Customer name"
                style={{ flex:1, background:"var(--bg0)", border:"1px solid var(--rule)", borderRadius:9,
                  padding:"9px 12px", fontSize:13, color:"var(--ink)", outline:"none" }} />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone"
                style={{ width:130, background:"var(--bg0)", border:"1px solid var(--rule)", borderRadius:9,
                  padding:"9px 12px", fontSize:13, color:"var(--ink)", outline:"none" }} />
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={gstin} onChange={e => setGstin(e.target.value)} placeholder="GSTIN (optional)"
                style={{ flex:1, background:"var(--bg0)", border:"1px solid var(--rule)", borderRadius:9,
                  padding:"8px 12px", fontSize:12, color:"var(--ink)", outline:"none" }} />
              <select value={pay} onChange={e => setPay(e.target.value)}
                style={{ background:"var(--bg0)", border:"1px solid var(--rule)", borderRadius:9,
                  padding:"8px 10px", fontSize:12, color:"var(--ink)", outline:"none" }}>
                {["Cash","UPI","Credit","Cheque"].map(m => <option key={m}>{m}</option>)}
              </select>
              <button onClick={() => setCustExpanded(false)}
                style={{ background:"none", border:"none", color:"var(--saffron)", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                Done ✓
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background:"var(--bg2)", border:"1px solid var(--rule)", borderRadius:10,
            padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
              background:"linear-gradient(135deg,var(--brass),var(--saffron))",
              color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:800, fontSize:13 }}>
              {cust ? cust.charAt(0).toUpperCase() : "W"}
            </div>
            <div style={{ flex:1, fontSize:13, color: cust ? "var(--ink)" : "var(--ink-faint)", fontWeight:600 }}>
              {cust || "Walk-in customer"}
              {phone && <span style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", marginLeft:8 }}>{phone}</span>}
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", background:"var(--bg0)",
                padding:"3px 8px", borderRadius:6, border:"1px solid var(--rule)", fontWeight:600 }}>{pay}</span>
              <button onClick={() => setCustExpanded(true)}
                style={{ background:"transparent", color:"var(--saffron)", border:"none",
                  fontSize:13, fontWeight:800, cursor:"pointer" }}>
                {cust ? "Edit" : "+ Add"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CART + PRODUCT BROWSER ───────────────── */}
      <div style={{ flex:1, overflowY:"auto", background:"var(--bg1)" }}>

        {/* Cart items — shown when cart not empty */}
        {rows.length > 0 && (
          <div style={{ padding:"4px 14px 0" }}>
            <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", letterSpacing:"1.5px",
              fontWeight:800, padding:"10px 4px 8px", textTransform:"uppercase" }}>
              🛒 {rows.length} {rows.length === 1 ? "ITEM" : "ITEMS"} IN CART
            </div>

            {rows.map((row, i) => {
              const p = getProduct(row.prodId)
              if (!p) return null
              const rowTotal = Math.round(p.mrp * row.qty * (1 + p.gst_percent / 100) * 100) / 100
              const inCartCount = rows.find(r => r.prodId === p.id)?.qty || 0
              return (
                <div key={i} style={{ background:"var(--bg2)", borderRadius:14, padding:"12px 14px",
                  marginBottom:8, border:"1px solid var(--rule)",
                  display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
                    background:"var(--bg0)", border:"1px solid var(--rule)",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                    {CAT_EMOJI[p.category] || "📦"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:"var(--ink)", lineHeight:1.2,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                    <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", marginTop:2, fontWeight:600 }}>
                      ₹{p.mrp}/unit
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:4,
                    background:"var(--bg0)", border:"1px solid var(--rule)", borderRadius:10, padding:3 }}>
                    <button onClick={() => row.qty <= 1 ? delRow(i) : setRow(i, "qty", row.qty - 1)}
                      style={{ width:30, height:30, borderRadius:8, background:"var(--bg2)",
                        color: row.qty <= 1 ? "var(--ember)" : "var(--brass-deep)",
                        border:"none", fontSize:row.qty <= 1 ? 13 : 18, fontWeight:800, cursor:"pointer" }}>
                      {row.qty <= 1 ? "🗑" : "−"}
                    </button>
                    <span style={{ minWidth:22, textAlign:"center", fontSize:15, fontWeight:800, color:"var(--ink)" }}>
                      {row.qty}
                    </span>
                    <button onClick={() => setRow(i, "qty", row.qty + 1)}
                      style={{ width:30, height:30, borderRadius:8, background:"var(--saffron)",
                        color:"#fff", border:"none", fontSize:18, fontWeight:800, cursor:"pointer" }}>
                      +
                    </button>
                  </div>
                  <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:15,
                    color:"var(--brass-deep)", fontWeight:800, minWidth:54, textAlign:"right" }}>
                    {INR(rowTotal)}
                  </div>
                </div>
              )
            })}

            {/* discount / note row */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              <button style={{ background:"var(--bg2)", border:"1.5px dashed rgba(184,134,11,0.3)",
                color:"var(--brass-deep)", borderRadius:12, padding:"10px",
                fontSize:MIN_FONT_SIZE, fontWeight:800, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                💰 Discount
              </button>
              <button style={{ background:"var(--bg2)", border:"1.5px dashed rgba(184,134,11,0.3)",
                color:"var(--brass-deep)", borderRadius:12, padding:"10px",
                fontSize:MIN_FONT_SIZE, fontWeight:800, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                📝 Note
              </button>
            </div>

            {/* divider */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ flex:1, height:1, background:"var(--rule)" }}/>
              <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", fontWeight:700, letterSpacing:"1px", whiteSpace:"nowrap" }}>
                ADD MORE ITEMS
              </div>
              <div style={{ flex:1, height:1, background:"var(--rule)" }}/>
            </div>
          </div>
        )}

        {/* ── PRODUCT BROWSER ─────────────────────── */}
        {(() => {
          const cats = ["Frequent", ...Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort()]
          const shown = catFilter === "Frequent"
            ? products.slice(0, 12)
            : products.filter(p => p.category === catFilter).slice(0, 24)

          return (
            <div style={{ padding: rows.length > 0 ? "0 14px 80px" : "4px 14px 80px" }}>

              {/* Category filter pills */}
              <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8,
                scrollbarWidth:"none", marginBottom:2 }}>
                {cats.map(c => (
                  <button key={c} onClick={() => setCatFilter(c)}
                    style={{ padding:"6px 14px", borderRadius:20, border:"none", cursor:"pointer",
                      flexShrink:0, fontSize:MIN_FONT_SIZE, fontWeight:700, transition:"all 0.12s",
                      background: catFilter === c ? "var(--saffron)" : "var(--bg2)",
                      color:      catFilter === c ? "#fff"          : "var(--ink-dim)",
                      boxShadow:  catFilter === c ? "0 3px 10px rgba(232,119,34,0.3)" : "none" }}>
                    {c === "Frequent" ? "⭐ Frequent" : c}
                  </button>
                ))}
              </div>

              {/* Product grid */}
              {shown.length === 0 ? (
                <div style={{ textAlign:"center", padding:"32px 0", color:"var(--ink-faint)", fontSize:12 }}>
                  No products in this category
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10, paddingTop:4 }}>
                  {shown.map(p => {
                    const inCart = rows.find(r => r.prodId === p.id)
                    const emoji = CAT_EMOJI[p.category] || "📦"
                    const outOfStock = p.stock <= 0
                    return (
                      <button key={p.id}
                        onClick={() => !outOfStock && addToCart(p)}
                        style={{
                          background:"var(--bg2)", borderRadius:14, padding:"14px 12px",
                          border: inCart ? "2px solid var(--saffron)" : "1px solid var(--rule)",
                          boxShadow: inCart ? "0 2px 14px rgba(232,119,34,0.18)" : "0 2px 6px rgba(0,0,0,0.04)",
                          cursor: outOfStock ? "default" : "pointer",
                          opacity: outOfStock ? 0.45 : 1,
                          display:"flex", flexDirection:"column", alignItems:"flex-start",
                          gap:8, textAlign:"left", position:"relative", transition:"all 0.12s",
                        }}
                        onMouseEnter={e => { if (!outOfStock) e.currentTarget.style.transform="translateY(-2px)" }}
                        onMouseLeave={e => e.currentTarget.style.transform="none"}>

                        {/* in-cart badge */}
                        {inCart && (
                          <div style={{ position:"absolute", top:8, right:8,
                            minWidth:20, height:20, padding:"0 6px", borderRadius:10,
                            background:"var(--saffron)", color:"#fff",
                            fontSize:MIN_FONT_SIZE, fontWeight:800,
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                            {inCart.qty}
                          </div>
                        )}

                        {/* emoji icon */}
                        <div style={{ width:40, height:40, borderRadius:10,
                          background:"var(--bg0)", border:"1px solid var(--rule)",
                          display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
                          {emoji}
                        </div>

                        {/* name + price */}
                        <div style={{ width:"100%", paddingRight: inCart ? 20 : 0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)", lineHeight:1.3,
                            overflow:"hidden", textOverflow:"ellipsis",
                            display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                            {p.name}
                          </div>
                          <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif",
                            fontSize:15, color:"var(--brass-deep)", fontWeight:800, marginTop:4 }}>
                            ₹{p.mrp}
                          </div>
                          {outOfStock && (
                            <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ember)", fontWeight:800,
                              letterSpacing:"0.5px", marginTop:2 }}>OUT OF STOCK</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* ── STICKY PAYMENT FOOTER ────────────────── */}
      {rows.length > 0 && !invoice && (
        <div style={{ background:"linear-gradient(180deg,var(--bg2),var(--bg3))",
          borderTop:"2px solid rgba(184,134,11,0.3)",
          boxShadow:"0 -8px 24px rgba(26,12,4,0.1)",
          padding:"12px 14px 14px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <input type="checkbox" id="kirana-gst-toggle" checked={applyGst}
              onChange={e => setApplyGst(e.target.checked)}
              style={{ width:15, height:15, cursor:"pointer", accentColor:"var(--saffron)" }} />
            <label htmlFor="kirana-gst-toggle"
              style={{ fontSize:12, color:"var(--ink-dim)", cursor:"pointer" }}>
              Apply GST
            </label>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
            <div>
              <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--brass-deep)", letterSpacing:"1.5px",
                fontWeight:800, textTransform:"uppercase" }}>
                TOTAL · {rows.length} item{rows.length !== 1 ? "s" : ""}
              </div>
              <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", marginTop:2 }}>
                {applyGst
                  ? `incl. ₹${Math.round(totals.tax * 100) / 100} GST (CGST + SGST)`
                  : "GST not applied"}
              </div>
            </div>
            <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:38,
              color:"var(--saffron)", fontWeight:800, lineHeight:1 }}>
              ₹{grandTotal}
            </div>
          </div>

          <button onClick={openPay} disabled={saving}
            style={{ width:"100%", background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
              color:"#fff", border:"none", borderRadius:14, padding:"17px",
              fontSize:17, fontWeight:900, letterSpacing:"0.3px",
              boxShadow:"0 12px 28px rgba(232,119,34,0.45)", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              opacity: saving ? 0.7 : 1 }}>
            {saving ? "Generating…" : `💳 Pay ₹${grandTotal} →`}
          </button>
        </div>
      )}
    </div>
  )
}
