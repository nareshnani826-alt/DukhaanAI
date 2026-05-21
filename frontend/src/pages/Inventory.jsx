import { useEffect, useState, useCallback } from "react"
import { Products } from "../sync/db.js"
import BarcodeGenerator from "../components/BarcodeGenerator.jsx"
import { usePlan } from "../context/PlanContext.jsx"
import { useVoiceField, MicButton } from "../voice/useVoiceField.jsx"
import { detectUnit, parseSpokenQty, UNIT_TYPES } from "../voice/unitDetector.js"
import { LANGUAGES } from "../voice/languages.js"
import { lookupPrice, getVariants } from "../data/productPrices.js"

const CATS = ["Staples","Dairy","Oils","Beverages","Snacks","Personal Care","Other"]
const GSTS = [0,5,12,18,28]
const EMPTY = { name:"", sku:"", category:"Staples", unit:"piece",
                stock:"", min_stock:"10", mrp:"", cost_price:"", gst_percent:5 }

// ── Voice-enabled input field ─────────────────────────────
function VoiceInput({ label, value, onChange, placeholder, type="text",
                      lang, hint, step, className="input" }) {
  const onResult = useCallback((translated) => {
    if (type === "number") {
      const parsed = parseSpokenQty(translated)
      if (parsed?.qty) onChange(String(parsed.qty))
      else {
        const num = translated.match(/[\d.]+/)
        if (num) onChange(num[0])
      }
    } else {
      onChange(translated)
    }
  }, [onChange, type])

  const { listening, error, startVoice } = useVoiceField(lang, onResult)

  return (
    <div>
      <label style={{ fontSize:10, color:"var(--ink-dim)", fontWeight:500, display:"block", marginBottom:3 }}>
        {label}
      </label>
      <div style={{ display:"flex", gap:4, alignItems:"center" }}>
        <input
          className={className}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          step={step}
          style={{ flex:1, minWidth:0 }}
        />
        <MicButton listening={listening} onClick={startVoice} />
      </div>
      {hint && !error && (
        <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:2 }}>{hint}</div>
      )}
      {error && (
        <div style={{ fontSize:10, color:"#dc2626", marginTop:2 }}>{error}</div>
      )}
    </div>
  )
}

// ── Product form modal ────────────────────────────────────
function ProductModal({ editId, initialForm, lang: initialLang, onSave, onClose }) {
  const [form,         setForm]         = useState(initialForm)
  const [saving,       setSaving]       = useState(false)
  const [notif,        setNotif]        = useState("")
  const [unitDetected, setUnitDetected] = useState(false)
  const [lang,         setLang]         = useState(initialLang || "hi-IN")
  const [priceLookup,  setPriceLookup]  = useState(null)  // auto-price suggestion
  const [variants,     setVariants]     = useState([])    // size variants

  function set(k, v) { setForm(f => ({...f, [k]: v})) }

  // Auto-detect unit + qty + price when product name changes
  function handleNameChange(name) {
    set("name", name)
    if (name.length > 2) {
      // Unit detection
      const detected = detectUnit(name)
      if (detected.found) {
        set("unit", detected.unit)
        setUnitDetected(true)
      }

      // Price lookup from database
      const priceInfo = lookupPrice(name)
      if (priceInfo) {
        setPriceLookup(priceInfo)
        setVariants(priceInfo.allVariants || [])
        // Auto-fill prices if fields are empty
        setForm(f => ({
          ...f,
          name,
          unit:       detected.found ? detected.unit : (priceInfo.unit || f.unit),
          mrp:        f.mrp         ? f.mrp         : String(priceInfo.mrp),
          cost_price: f.cost_price  ? f.cost_price  : String(priceInfo.wholesale),
          gst_percent:f.gst_percent ? f.gst_percent : 5,
        }))
        setNotif(`✓ Prices auto-filled from database — verify before saving`)
        setTimeout(() => setNotif(""), 3500)
      } else {
        setPriceLookup(null)
        setVariants([])
      }
    } else {
      setPriceLookup(null)
      setVariants([])
    }
  }

  // When vendor selects a different size variant
  function handleVariantChange(variant) {
    setForm(f => ({
      ...f,
      mrp:        String(variant.mrp),
      cost_price: String(variant.wholesale),
      unit:       variant.unit,
    }))
    setNotif(`Prices updated for ${variant.size}`)
    setTimeout(() => setNotif(""), 2000)
  }

  // Voice: full product name field — smart parse
  const onNameVoice = useCallback((translated, original) => {
    handleNameChange(translated)
  }, [])

  // Voice: price field
  const onPriceVoice = useCallback((translated) => {
    const num = translated.match(/[\d.]+/)
    if (num) set("mrp", num[0])
  }, [])

  // Voice: stock field
  const onStockVoice = useCallback((translated) => {
    const parsed = parseSpokenQty(translated)
    if (parsed?.qty) set("stock", String(parsed.qty))
    else {
      const num = translated.match(/[\d.]+/)
      if (num) set("stock", num[0])
    }
  }, [])

  const { listening: nameListening, startVoice: startNameVoice } = useVoiceField(lang, onNameVoice)
  const { listening: priceListening, startVoice: startPriceVoice } = useVoiceField(lang, onPriceVoice)
  const { listening: stockListening, startVoice: startStockVoice } = useVoiceField(lang, onStockVoice)

  async function save() {
    const name = form.name.trim()
    if (!name) return setNotif("Product name is required")
    if (name.length > 150) return setNotif("Product name too long (max 150 characters)")
    const mrp = +form.mrp
    const cost = +form.cost_price
    const stock = +form.stock
    if (mrp < 0) return setNotif("MRP cannot be negative")
    if (cost < 0) return setNotif("Cost price cannot be negative")
    if (stock < 0) return setNotif("Stock cannot be negative")
    if (cost > mrp && mrp > 0) {
      setNotif("Warning: cost price is higher than MRP — low margin product")
    }
    setSaving(true)
    try {
      const data = {
        ...form,
        name,
        stock:       stock,
        min_stock:   +form.min_stock || 10,
        mrp,
        cost_price:  cost,
        gst_percent: +form.gst_percent || 0,
      }
      await onSave(editId, data)
      onClose()
    } catch(e) { setNotif(e.message) }
    finally { setSaving(false) }
  }

  const margin = form.mrp > 0
    ? Math.round((form.mrp - form.cost_price) / form.mrp * 100)
    : 0

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-[460px] max-w-[95vw] max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-medium">{editId ? "Edit Product" : "Add Product"}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Tap 🎤 on any field to speak — works in Telugu, Hindi, Tamil
            </p>
          </div>

          {/* Language selector for voice */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">Voice lang:</span>
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="text-[10px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white cursor-pointer hover:border-primary focus:outline-none focus:border-primary">
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.native} ({l.name})</option>)}
            </select>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl ml-1">×</button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {notif && (
            <div className="bg-primary-light text-primary-dark text-[10px] px-3 py-2 rounded-lg">
              {notif}
            </div>
          )}

          {/* Price lookup suggestion banner */}
          {priceLookup && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🏷️</span>
                <div className="text-[10px] font-semibold text-blue-700">
                  Market price found for {priceLookup.productName}
                </div>
              </div>
              <div className="flex gap-3 text-[10px] text-blue-600 mb-2">
                <span>MRP: <strong>₹{priceLookup.mrp}</strong></span>
                <span>Wholesale: <strong>₹{priceLookup.wholesale}</strong></span>
                <span>Margin: <strong>{priceLookup.margin}%</strong></span>
              </div>
              {variants.length > 1 && (
                <div>
                  <div className="text-[10px] text-blue-500 mb-1">Select size:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {variants.map(v => (
                      <button key={v.size}
                        onClick={() => handleVariantChange(v)}
                        className="text-[10px] px-2.5 py-1 rounded-lg border transition-all font-medium"
                        style={{
                          background: form.mrp == v.mrp ? "var(--jade)" : "var(--bg1)",
                          color:      form.mrp == v.mrp ? "var(--bg1)"     : "#378ADD",
                          borderColor:form.mrp == v.mrp ? "var(--jade)"  : "#bfdbfe",
                        }}>
                        {v.size} — ₹{v.mrp}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Product name — most important, full width */}
          <div>
            <label className="label">Product Name *</label>
            <div className="flex gap-2 items-center">
              <input className="input flex-1" value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder='e.g. "Tata Salt 1kg" or "Amul Milk 500ml"'
                autoFocus />
              <MicButton listening={nameListening} onClick={startNameVoice} size={18} />
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              Unit auto-detected from name · Say product name in your language
            </div>
          </div>

          {/* Unit detection result banner */}
          {unitDetected && form.unit && (
            <div className="flex items-center gap-2 bg-primary-light rounded-lg px-3 py-2">
              <span className="text-[10px] text-primary-dark font-medium">
                Auto-detected unit:
              </span>
              <span className="badge badge-green">{form.unit}</span>
              <span className="text-[10px] text-primary-dark/60">
                — change below if needed
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* SKU */}
            <div>
              <label className="label">SKU / Barcode</label>
              <input className="input" value={form.sku}
                onChange={e => set("sku", e.target.value)}
                placeholder="Auto or scan" />
            </div>

            {/* Category */}
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category}
                onChange={e => set("category", e.target.value)}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Unit — auto-filled, but editable */}
            <div>
              <label className="label">
                Unit of measure
                {unitDetected && <span className="text-primary text-[9px] ml-1">auto ✓</span>}
              </label>
              <select className="input" value={form.unit}
                onChange={e => { set("unit", e.target.value); setUnitDetected(false) }}>
                {Object.entries(UNIT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} ({v.symbol}) — {v.type}</option>
                ))}
              </select>
            </div>

            {/* GST */}
            <div>
              <label className="label">GST %</label>
              <select className="input" value={form.gst_percent}
                onChange={e => set("gst_percent", e.target.value)}>
                {GSTS.map(g => <option key={g} value={g}>{g}%</option>)}
              </select>
            </div>

            {/* Stock — with voice */}
            <div>
              <label className="label">Current Stock</label>
              <div className="flex gap-2 items-center">
                <input className="input flex-1" type="number" value={form.stock}
                  onChange={e => set("stock", e.target.value)}
                  placeholder="0" />
                <MicButton listening={stockListening} onClick={startStockVoice} />
              </div>
              {form.unit && (
                <div className="text-[10px] text-gray-400 mt-1">
                  In {UNIT_TYPES[form.unit]?.label || "units"}
                </div>
              )}
            </div>

            {/* Min stock */}
            <div>
              <label className="label">Min Stock (reorder at)</label>
              <input className="input" type="number" value={form.min_stock}
                onChange={e => set("min_stock", e.target.value)}
                placeholder="10" />
            </div>

            {/* MRP — with voice */}
            <div>
              <label className="label">MRP (₹)</label>
              <div className="flex gap-2 items-center">
                <input className="input flex-1" type="number" step="0.01"
                  value={form.mrp}
                  onChange={e => set("mrp", e.target.value)}
                  placeholder="0.00" />
                <MicButton listening={priceListening} onClick={startPriceVoice} />
              </div>
            </div>

            {/* Cost price */}
            <div>
              <label className="label">Cost Price (₹)</label>
              <input className="input" type="number" step="0.01"
                value={form.cost_price}
                onChange={e => set("cost_price", e.target.value)}
                placeholder="0.00" />
              {margin > 0 && (
                <div className={`text-[10px] mt-1 font-medium ${
                  margin > 20 ? "text-primary" : margin > 10 ? "text-amber-600" : "text-red-500"
                }`}>
                  Margin: {margin}% {margin > 20 ? "✓ Good" : margin > 10 ? "⚠ Low" : "✗ Very low"}
                </div>
              )}
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="btn btn-primary w-full py-2.5 text-xs font-medium mt-1">
            {saving ? "Saving..." : editId ? "Update Product" : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Inventory page ───────────────────────────────────
export default function Inventory() {
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState("")
  const [cat,      setCat]      = useState("")
  const [modal,    setModal]    = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [initForm, setInitForm] = useState(EMPTY)
  const [notif,    setNotif]    = useState("")
  const [barcodeProduct, setBarcodeProduct] = useState(null)
  const [voiceLang, setVoiceLang] = useState("hi-IN")
  const { hasFeature } = usePlan()

  async function load() {
    setLoading(true)
    try { setProducts(await Products.list({ search, category: cat||undefined })) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, cat])

  function showNotif(msg) { setNotif(msg); setTimeout(() => setNotif(""), 2500) }

  function openAdd() {
    setInitForm(EMPTY); setEditId(null); setModal(true)
  }

  function openEdit(p) {
    setModal(false) // close first to force fresh mount
    const form = {
      name: p.name, sku: p.sku||"", category: p.category||"Staples",
      unit: p.unit||"piece", stock: String(p.stock||0), min_stock: String(p.min_stock||5),
      mrp: String(p.mrp||0), cost_price: String(p.cost_price||0), gst_percent: String(p.gst_percent||0),
    }
    setInitForm(form)
    setEditId(p.id)
    setTimeout(() => setModal(true), 50) // small delay ensures fresh mount
  }

  async function handleSave(id, data) {
    try {
      if (id) {
        await Products.update(id, {
          name:        data.name,
          category:    data.category,
          unit:        data.unit,
          stock:       +data.stock || 0,
          min_stock:   +data.min_stock || 5,
          mrp:         +data.mrp || 0,
          cost_price:  +data.cost_price || 0,
          gst_percent: +data.gst_percent || 0,
          sku:         data.sku || null,
        })
      } else {
        await Products.create(data)
      }
      showNotif(id ? "Product updated!" : "Product added!")
      load()
    } catch(e) {
      showNotif("Error: " + e.message)
    }
  }

  async function del(id) {
    if (!confirm("Remove this product?")) return
    await Products.delete(id); load(); showNotif("Product removed")
  }

  async function saveBarcode(productId, code) {
    await Products.update(productId, { sku: code })
    load(); showNotif("Barcode saved!")
  }

  const pct    = p => Math.max(4, Math.min(100, Math.round(p.stock / Math.max(p.min_stock*2,1) * 100)))
  const barCls = p => p.stock < p.min_stock*0.3 ? "bg-red-500" : p.stock < p.min_stock ? "bg-amber-400" : "bg-primary"
  const status = p => {
    if (p.stock<=0)              return ["badge-red",   "Out of stock"]
    if (p.stock<p.min_stock*0.3) return ["badge-red",   "Critical"]
    if (p.stock<p.min_stock)     return ["badge-amber",  "Low stock"]
    return ["badge-green","In stock"]
  }
  const hasBarcode = p => p.sku && /^\d{8,13}$/.test(p.sku)

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <style>{`
        @keyframes mic-pulse-btn {
          0%,100%{box-shadow:0 0 0 0 rgba(29,158,117,0.4)}
          50%{box-shadow:0 0 0 5px rgba(29,158,117,0)}
        }
      `}</style>

      {notif && (
        <div className="fixed top-4 right-4 bg-primary text-white px-3 py-2 rounded-lg text-xs z-50">
          {notif}
        </div>
      )}

      {modal && (
        <ProductModal
          editId={editId}
          initialForm={initForm}
          lang={voiceLang}
          onSave={handleSave}
          onClose={() => setModal(false)}
        />
      )}

      {barcodeProduct && (
        <BarcodeGenerator
          product={barcodeProduct}
          onClose={() => setBarcodeProduct(null)}
          onSaveBarcode={saveBarcode}
        />
      )}

      {/* Header */}
      <div className="page-sticky-header mb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-sm font-semibold">Inventory</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={voiceLang} onChange={e => setVoiceLang(e.target.value)}
              className="text-[10px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 hidden md:block">
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.native} ({l.name})</option>
              ))}
            </select>
            <button onClick={openAdd} className="btn btn-primary btn-sm">+ Add Product</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <input className="input flex-1" style={{ minWidth: 140 }} placeholder="Search products..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input" style={{ width: 140 }} value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">All categories</option>
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Tip banner */}
      <div className="bg-primary-light border border-primary/20 rounded-lg px-3 py-2 mb-3 text-[10px] text-primary-dark flex items-center gap-2">
        <span>🎤</span>
        <span>
          <b>Voice input enabled</b> — Click + Add Product → tap the mic icon on Name, Stock, or Price → speak in {LANGUAGES.find(l=>l.code===voiceLang)?.name}.
          Unit (kg/litre/piece) is auto-detected from the product name.
        </span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: 680 }}>
          <thead>
            <tr>
              <th className="th pl-4">Product</th>
              <th className="th">Category</th>
              <th className="th">Unit</th>
              <th className="th">Stock</th>
              <th className="th">MRP</th>
              <th className="th">Cost</th>
              <th className="th">GST</th>
              <th className="th">Barcode</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" className="td text-center py-8 text-gray-400 text-xs">Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan="10" className="td text-center py-8 text-gray-400 text-xs">
                No products yet — click "+ Add Product" and speak or type!
              </td></tr>
            ) : products.map(p => {
              const [sc, sl] = status(p)
              const ready    = hasBarcode(p)
              const unitInfo = UNIT_TYPES[p.unit] || UNIT_TYPES.piece
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="td pl-4">
                    <div className="font-medium text-xs">{p.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {p.sku || <span className="italic text-gray-300">no barcode</span>}
                    </div>
                  </td>
                  <td className="td text-xs">{p.category}</td>
                  <td className="td">
                    <span className="badge badge-blue text-[9px]">
                      {unitInfo.symbol}
                    </span>
                  </td>
                  <td className="td w-24">
                    <div className="font-medium text-xs">{p.stock} {unitInfo.symbol}</div>
                    <div className="h-1 bg-gray-100 rounded-full mt-1 w-16 overflow-hidden">
                      <div className={`h-full rounded-full ${barCls(p)}`} style={{ width: pct(p)+"%" }} />
                    </div>
                  </td>
                  <td className="td text-xs">₹{p.mrp}</td>
                  <td className="td text-xs">₹{p.cost_price}</td>
                  <td className="td text-xs">{p.gst_percent}%</td>
                  <td className="td">
                    <button onClick={() => setBarcodeProduct(p)}
                      className={`text-[10px] px-2 py-1 rounded-md border font-medium transition-colors ${
                        ready
                          ? "bg-primary-light text-primary-dark border-primary/30 hover:bg-primary hover:text-white"
                          : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-amber-50 hover:text-amber-700"
                      }`}>
                      {ready ? "✓ Barcode" : "Generate"}
                    </button>
                  </td>
                  <td className="td"><span className={`badge ${sc}`}>{sl}</span></td>
                  <td className="td">
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(p)} className="btn btn-sm">Edit</button>
                      <button onClick={() => del(p.id)} className="btn btn-sm text-red-400 hover:bg-red-50">✕</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
