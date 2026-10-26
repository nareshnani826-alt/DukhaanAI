import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { Products } from "../sync/db.js"
import BarcodeGenerator from "../components/BarcodeGenerator.jsx"
import BarcodeScanner from "../components/BarcodeScanner.jsx"
import BulkBarcodeManager from "../components/BulkBarcodeManager.jsx"
import { usePlan } from "../context/PlanContext.jsx"
import { useVoiceField, MicButton } from "../voice/useVoiceField.jsx"
import { detectUnit, guessCategory, parseSpokenQty, UNIT_TYPES } from "../voice/unitDetector.js"
import { LANGUAGES } from "../voice/languages.js"

// Language chosen in onboarding / header (falls back to Hindi only if nothing saved)
const savedVoiceLang = () => { try { return localStorage.getItem("dk_voice_lang") || "hi-IN" } catch { return "hi-IN" } }
// UI text in the shop's language (falls back to English)
const L = k => tr(k, uiLang())
import { lookupPrice, getVariants } from "../data/productPrices.js"
import { lookupBarcode as lookupBarcodeAPI } from "../data/barcodeLookup.js"
import { tr, uiLang } from "../i18n/kiranaStrings"

const CATS = ["Staples","Dairy","Oils","Beverages","Snacks","Personal Care","Other"]
const GSTS = [0,3,5,12,18,28]  // 3% is the GST slab for gold/silver/jewelry
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
function ProductModal({ editId, initialForm, lang: initialLang, onSave, onClose, onDelete }) {
  const [form,         setForm]         = useState(initialForm)
  // Name, price and stock are enough to start selling; the rest is optional
  const [showMore,     setShowMore]     = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [notif,        setNotif]        = useState("")
  const [lossConfirmed, setLossConfirmed] = useState(false)  // cost > MRP needs a second tap
  const catTouched = useRef(!!editId)  // don't auto-change category once the user picks one / when editing
  const [unitDetected, setUnitDetected] = useState(false)
  const [lang,         setLang]         = useState(initialLang || savedVoiceLang)
  const [priceLookup,  setPriceLookup]  = useState(null)  // auto-price suggestion
  const [variants,     setVariants]     = useState([])    // size variants

  function set(k, v) {
    if (k === "mrp" || k === "cost_price") setLossConfirmed(false)
    setForm(f => ({...f, [k]: v}))
  }

  // On open: if unit is still "piece", try to detect from existing name
  useEffect(() => {
    if (initialForm.name && (!initialForm.unit || initialForm.unit === "piece")) {
      const detected = detectUnit(initialForm.name)
      if (detected.found) {
        set("unit", detected.unit)
        setUnitDetected(true)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      if (!catTouched.current) {
        const cat = guessCategory(name)
        if (cat) set("category", cat)
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
    if (cost > mrp && mrp > 0 && !lossConfirmed) {
      setLossConfirmed(true)
      return setNotif(`Cost price (₹${cost}) is higher than MRP (₹${mrp}) — you will lose money on every sale. Check the prices, or tap the button again to keep them.`)
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

  const unitSym = UNIT_TYPES[form.unit]?.symbol || "pc"
  const big = { fontSize:17, padding:"12px 14px", borderRadius:12 }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center"
      style={{ zIndex:300 }}  // above the phone bottom menu (z 100) so Save is never hidden
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white shadow-xl w-full md:w-[460px] md:rounded-2xl max-h-[92dvh] overflow-y-auto"
        style={{ borderRadius:"20px 20px 0 0" }}>

        {/* Header */}
        <div className="flex justify-between items-center px-5 pt-4 pb-3 border-b border-gray-100">
          <h3 style={{ fontSize:18, fontWeight:800 }}>{L(editId ? "Edit product" : "Add product")}</h3>
          <button onClick={onClose} aria-label="Close"
            style={{ width:44, height:44, borderRadius:12, fontSize:22, color:"#9ca3af", background:"#f3f4f6" }}>×</button>
        </div>

        <div className="p-5 space-y-4" style={{ paddingBottom:"max(20px, env(safe-area-inset-bottom))" }}>
          {notif && (
            <div role="alert" style={{ fontSize:13, padding:"10px 12px", borderRadius:10 }} className={
              /^✓|^Prices updated/.test(notif)
                ? "bg-primary-light text-primary-dark"
                : "bg-red-50 text-red-700 border border-red-200"
            }>
              {notif}
            </div>
          )}

          {/* 1. Name */}
          <div>
            <label style={{ fontSize:14, fontWeight:700, display:"block", marginBottom:6 }}>{L("Product name")}</label>
            <div className="flex gap-2 items-center">
              <input className="input flex-1" style={big} value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Tata Salt 1kg"
                autoFocus={!editId} />
              <MicButton listening={nameListening} onClick={startNameVoice} size={20} />
            </div>
          </div>

          {/* Size choices from the price list */}
          {variants.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {variants.map(v => (
                <button key={v.size} onClick={() => handleVariantChange(v)}
                  style={{ fontSize:13, padding:"8px 12px", borderRadius:10, fontWeight:700, border:"1.5px solid",
                    background: form.mrp == v.mrp ? "var(--jade)" : "#fff",
                    color:      form.mrp == v.mrp ? "#fff" : "var(--jade)",
                    borderColor:"var(--jade)" }}>
                  {v.size} · ₹{v.mrp}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* 2. Selling price */}
            <div>
              <label style={{ fontSize:14, fontWeight:700, display:"block", marginBottom:6 }}>{L("Selling price ₹")}</label>
              <div className="flex gap-1 items-center">
                <input className="input flex-1" style={{ ...big, minWidth:0 }} type="number" inputMode="decimal"
                  value={form.mrp} onChange={e => set("mrp", e.target.value)} placeholder="0" />
                <MicButton listening={priceListening} onClick={startPriceVoice} />
              </div>
            </div>

            {/* 3. Stock */}
            <div>
              <label style={{ fontSize:14, fontWeight:700, display:"block", marginBottom:6 }}>{L("Stock in shop")} ({unitSym})</label>
              <div className="flex gap-1 items-center">
                <input className="input flex-1" style={{ ...big, minWidth:0 }} type="number" inputMode="decimal"
                  value={form.stock} onChange={e => set("stock", e.target.value)} placeholder="0" />
                <MicButton listening={stockListening} onClick={startStockVoice} />
              </div>
            </div>
          </div>

          {/* Optional details */}
          <button onClick={() => setShowMore(v => !v)}
            style={{ width:"100%", padding:"12px", borderRadius:12, border:"1.5px dashed #d1d5db",
              background:"#fafafa", fontSize:14, fontWeight:700, color:"#4b5563" }}>
            {showMore ? "▲ " + L("Hide extra details") : "▼ " + L("More details (buying price, category, GST…)")}
          </button>

          {showMore && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Buying price ₹</label>
                <input className="input" type="number" inputMode="decimal" value={form.cost_price}
                  onChange={e => set("cost_price", e.target.value)} placeholder="0" />
                {margin > 0 && (
                  <div className={`text-xs mt-1 font-semibold ${margin > 20 ? "text-primary" : margin > 10 ? "text-amber-600" : "text-red-500"}`}>
                    Profit {margin}% {margin > 20 ? "✓" : margin > 10 ? "· low" : "· very low"}
                  </div>
                )}
              </div>
              <div>
                <label className="label">Warn me below</label>
                <input className="input" type="number" inputMode="numeric" value={form.min_stock}
                  onChange={e => set("min_stock", e.target.value)} placeholder="10" />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category}
                  onChange={e => { catTouched.current = true; set("category", e.target.value) }}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Sold by {unitDetected && <span className="text-primary">· auto</span>}</label>
                <select className="input" value={form.unit}
                  onChange={e => { set("unit", e.target.value); setUnitDetected(false) }}>
                  {Object.entries(UNIT_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label} ({v.symbol})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">GST</label>
                <select className="input" value={form.gst_percent}
                  onChange={e => set("gst_percent", e.target.value)}>
                  {GSTS.map(g => <option key={g} value={g}>{g}%</option>)}
                </select>
              </div>
              <div>
                <label className="label">Barcode</label>
                <input className="input" value={form.sku} inputMode="numeric"
                  onChange={e => set("sku", e.target.value)} placeholder="Optional" />
              </div>
            </div>
          )}

          <button onClick={save} disabled={saving}
            style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", fontSize:17, fontWeight:800,
              color:"#fff", background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
              opacity: saving ? 0.7 : 1 }}>
            {L(saving ? "Saving…" : editId ? "Save changes" : "Save product")}
          </button>

          {editId && onDelete && (
            <button onClick={() => { onClose(); onDelete(editId) }}
              style={{ width:"100%", padding:"12px", borderRadius:12, border:"1px solid #fecaca",
                background:"#fff", color:"#dc2626", fontSize:14, fontWeight:700 }}>
              {L("Remove this product")}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Quick restock modal (shown after barcode scan finds an existing product) ──
function RestockModal({ product, onConfirm, onClose }) {
  const [qty, setQty] = useState("1")
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    const add = parseFloat(qty)
    if (!add || add <= 0) return
    setSaving(true)
    await onConfirm(product, add)
    setSaving(false)
  }

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
      zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16,
    }}>
      <div style={{ background:"#fff", borderRadius:16, padding:24, width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>{L("Add stock")}</div>
        <div style={{ fontSize:14, color:"#555", marginBottom:16 }}>{product.name}</div>

        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
          <span style={{ fontSize:11, color:"#888", flex:1 }}>Current stock</span>
          <span style={{ fontSize:13, fontWeight:600 }}>{product.stock} {product.unit || "pc"}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
          <span style={{ fontSize:11, color:"#888", flex:1 }}>Add qty</span>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <button onClick={() => setQty(q => String(Math.max(1, +q - 1)))}
              style={{ width:44, height:44, borderRadius:10, border:"1px solid #e5e7eb",
                       background:"#f9fafb", fontSize:20, cursor:"pointer" }}>−</button>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)}
              style={{ width:60, textAlign:"center", border:"1px solid #e5e7eb",
                       borderRadius:8, padding:"6px 4px", fontSize:14, fontWeight:600 }} />
            <button onClick={() => setQty(q => String(+q + 1))}
              style={{ width:44, height:44, borderRadius:10, border:"1px solid #e5e7eb",
                       background:"#f9fafb", fontSize:20, cursor:"pointer" }}>+</button>
          </div>
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"14px 0", borderRadius:12, border:"1px solid #e5e7eb",
                     background:"#fff", fontSize:15, cursor:"pointer" }}>
            {L("Cancel")}
          </button>
          <button onClick={handleConfirm} disabled={saving}
            style={{ flex:2, padding:"14px 0", borderRadius:12, border:"none",
                     background:"#1D9E75", color:"#fff", fontSize:15,
                     fontWeight:600, cursor:"pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : `Add ${qty || 0} → ${(product.stock||0) + (+qty||0)} ${product.unit||"pc"}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Inventory page ───────────────────────────────────
export default function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams()
  const deepLinkQuery  = searchParams.get("q") || ""
  const deepLinkHandled = useRef(false)

  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState(deepLinkQuery)
  const [cat,      setCat]      = useState("")
  const [modal,    setModal]    = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [initForm, setInitForm] = useState(EMPTY)
  const [notif,    setNotif]    = useState("")
  const [barcodeProduct, setBarcodeProduct] = useState(null)
  const [showScanner,  setShowScanner]  = useState(false)
  const [showBulkBarcodes, setShowBulkBarcodes] = useState(false)
  const [restockTarget, setRestockTarget] = useState(null)
  const [voiceLang,   setVoiceLang]   = useState(savedVoiceLang)
  const [dateFilter,  setDateFilter]  = useState("all")
  const [lowOnly,     setLowOnly]     = useState(false)
  const { hasFeature } = usePlan()

  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const debounceTimer = useRef(null)
  const [page,    setPage]    = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const PAGE_SIZE = 50

  function handleSearchChange(val) {
    setSearch(val)
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => setDebouncedSearch(val), 300)
  }

  async function load(pageNum = 0, append = false) {
    if (!append) setLoading(true)
    try {
      const list = await Products.list({
        search:   debouncedSearch,
        category: cat || undefined,
        limit:    PAGE_SIZE,
        offset:   pageNum * PAGE_SIZE,
      })
      setProducts(prev => append ? [...prev, ...list] : list)
      setHasMore(list.length === PAGE_SIZE)
      setPage(pageNum)
    } finally { if (!append) setLoading(false) }
  }

  useEffect(() => { load(0, false) }, [debouncedSearch, cat])

  // Deep-link from AI Suggestions (?q=<product name>) — auto-open the matched product's edit modal once.
  useEffect(() => {
    if (!deepLinkQuery || deepLinkHandled.current || loading || products.length === 0) return
    deepLinkHandled.current = true
    const match = products.find(p => p.name.toLowerCase() === deepLinkQuery.toLowerCase()) || products[0]
    openEdit(match)
    searchParams.delete("q")
    setSearchParams(searchParams, { replace: true })
  }, [products, loading, deepLinkQuery])

  function showNotif(msg) { setNotif(msg); setTimeout(() => setNotif(""), 2500) }

  // Resolve the correct unit for a product name:
  // - Name has embedded size ("500ml", "100g") → packaged good → "piece"
  // - Name matches bulk keyword ("tomato", "rice") → "kg"/"litre"/etc.
  function resolveUnit(name) {
    const detected = detectUnit(name)
    if (!detected.found) return "piece"
    if (detected.qty) return "piece"   // has size in name → sold by piece
    const base = detected.unit === "ml" ? "litre"
               : detected.unit === "g"  ? "kg"
               : detected.unit
    return base
  }

  // Silently correct units for any product still stored as 'piece' when it shouldn't be
  async function silentFixUnits(products) {
    for (const p of products) {
      const correct = resolveUnit(p.name)
      if (correct === "piece") continue          // packaged or unknown → keep as piece
      if (p.unit && p.unit !== "piece") continue // already correct
      await Products.update(p.id, { unit: correct })
    }
  }

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

  function handleBarcodeDetected(code) {
    setShowScanner(false)
    const clean = code.replace(/[-\s]/g, "")
    const existing = products.find(p =>
      p.sku === code || (p.sku && p.sku.replace(/[-\s]/g, "") === clean)
    )
    if (existing) {
      setRestockTarget(existing)
      return
    }
    // New product — try to enrich from public barcode databases before opening modal
    ;(async () => {
      const init = { ...EMPTY, sku: code }
      try {
        const res = await lookupBarcodeAPI(code, "kirana")
        if (res.found) {
          init.name = res.name || ""
          if (res.category && CATS.includes(res.category)) init.category = res.category
          if (res.mrp) init.mrp = res.mrp
        } else {
          showNotif(`Barcode ${code} not found in catalogs — fill manually`)
        }
      } catch (e) {
        console.warn("barcode lookup failed", e)
      }
      setInitForm(init)
      setEditId(null)
      setModal(true)
    })()
  }

  async function handleRestock(product, addQty) {
    await Products.update(product.id, { stock: (product.stock || 0) + addQty })
    setRestockTarget(null)
    load()
    showNotif(`+${addQty} added to ${product.name}`)
  }

  function fmtUpdated(ts) {
    if (!ts) return "—"
    const d = new Date(ts), now = new Date(), diff = now - d
    const mins = Math.floor(diff / 60000)
    if (mins < 2)  return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(diff / 3600000)
    if (hrs < 24)  return `${hrs}h ago`
    const days = Math.floor(diff / 86400000)
    if (days === 1) return "Yesterday"
    if (days < 7)  return d.toLocaleDateString("en-IN", { weekday: "short" })
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
  }

  const DATE_FILTERS = [
    { value: "all",   label: "All time" },
    { value: "today", label: "Today" },
    { value: "week",  label: "This week" },
    { value: "month", label: "This month" },
  ]

  const displayProducts = useMemo(() => {
    if (dateFilter === "all") return products
    const now = Date.now()
    const cutoff = dateFilter === "today"
      ? (() => { const s = new Date(); s.setHours(0,0,0,0); return s.getTime() })()
      : dateFilter === "week"  ? now - 7  * 86400000
      : dateFilter === "month" ? now - 30 * 86400000
      : 0
    return products.filter(p => p.updated_at && new Date(p.updated_at).getTime() >= cutoff)
  }, [products, dateFilter])
  const listProducts = lowOnly ? displayProducts.filter(p => p.stock < (p.min_stock || 0)) : displayProducts

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
    <div className="flex-1 overflow-y-auto p-3 md:p-4">
      <style>{`
        @keyframes mic-pulse-btn {
          0%,100%{box-shadow:0 0 0 0 rgba(29,158,117,0.4)}
          50%{box-shadow:0 0 0 5px rgba(29,158,117,0)}
        }
      `}</style>

      {notif && (
        <div className="fixed bg-primary text-white rounded-full z-50"
          style={{ bottom:96, left:"50%", transform:"translateX(-50%)", padding:"10px 18px", fontSize:14, fontWeight:700, maxWidth:"90vw" }}>
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
          onDelete={del}
        />
      )}

      {barcodeProduct && (
        <BarcodeGenerator
          product={barcodeProduct}
          onClose={() => setBarcodeProduct(null)}
          onSaveBarcode={saveBarcode}
        />
      )}

      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showBulkBarcodes && (
        <BulkBarcodeManager
          products={products}
          onClose={() => setShowBulkBarcodes(false)}
          onChanged={load}
        />
      )}

      {restockTarget && (
        <RestockModal
          product={restockTarget}
          onConfirm={handleRestock}
          onClose={() => setRestockTarget(null)}
        />
      )}

      {/* ── Phone: title, add, search, category chips ── */}
      <div className="md:hidden"><div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ flex:1, fontSize:20, fontWeight:800, color:"var(--ink)" }}>
            {L("Stock")} <span style={{ fontSize:14, color:"var(--ink-faint)", fontWeight:600 }}>{products.length} {L("items")}</span>
          </div>
          <button onClick={() => setShowScanner(true)} aria-label="Scan barcode"
            style={{ height:46, padding:"0 14px", borderRadius:12, border:"1px solid var(--rule)", background:"var(--bg2)",
              fontSize:15, fontWeight:700, color:"var(--ink)" }}>📷 {L("Scan")}</button>
          <button onClick={openAdd}
            style={{ height:46, padding:"0 16px", borderRadius:12, border:"none", fontSize:15, fontWeight:800, color:"#fff",
              background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))" }}>{L("+ Add")}</button>
        </div>
        <input className="input" style={{ fontSize:16, padding:"12px 14px", borderRadius:12 }} placeholder={"🔍 " + L("Search item…")}
          value={search} onChange={e => handleSearchChange(e.target.value)} />
        <div style={{ display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none" }}>
          {[["", L("All")], ["__low", "⚠ " + L("Low stock")], ...CATS.map(c => [c, L(c)])].map(([val, label]) => {
            const on = val === "__low" ? lowOnly : !lowOnly && cat === val
            return (
              <button key={val || "all"} onClick={() => { if (val === "__low") { setLowOnly(v => !v) } else { setLowOnly(false); setCat(val) } }}
                style={{ flexShrink:0, padding:"8px 14px", borderRadius:20, fontSize:13, fontWeight:700, border:"none",
                  background: on ? "var(--saffron)" : "var(--bg2)", color: on ? "#fff" : "var(--ink-dim)" }}>
                {label}
              </button>
            )
          })}
        </div>
      </div></div>

      {/* ── Phone: product cards ── */}
      <div className="md:hidden"><div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:32, color:"var(--ink-faint)" }}>Loading…</div>
        ) : listProducts.length === 0 ? (
          <div style={{ textAlign:"center", padding:"32px 16px", color:"var(--ink-faint)", fontSize:15 }}>
            {products.length === 0 ? "No products yet. Tap “+ Add” to add your first item." : L("Nothing matches.")}
          </div>
        ) : listProducts.map(p => {
          const unitSym = (UNIT_TYPES[(p.unit && p.unit !== "piece") ? p.unit : resolveUnit(p.name)] || UNIT_TYPES.piece).symbol
          const out = p.stock <= 0, low = !out && p.stock < (p.min_stock || 0)
          return (
            <div key={p.id} style={{ background:"var(--bg2)", border:`1px solid ${out ? "rgba(192,57,43,0.35)" : low ? "rgba(217,119,6,0.4)" : "var(--rule)"}`,
              borderRadius:14, padding:"12px 12px 12px 14px", display:"flex", alignItems:"center", gap:10 }}>
              <button onClick={() => openEdit(p)} style={{ flex:1, minWidth:0, textAlign:"left", background:"none", border:"none", padding:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:"var(--ink)", lineHeight:1.25,
                  overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{p.name}</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:10, marginTop:4 }}>
                  <span style={{ fontSize:16, fontWeight:800, color:"var(--brass-deep)" }}>₹{p.mrp}</span>
                  <span style={{ fontSize:14, fontWeight:800, color: out ? "var(--ember)" : low ? "#b45309" : "var(--jade)" }}>
                    {out ? L("Out of stock") : `${p.stock} ${unitSym}${low ? " · " + L("low") : ""}`}
                  </span>
                </div>
              </button>
              <button onClick={() => setRestockTarget(p)} aria-label={"Add stock for " + p.name}
                style={{ flexShrink:0, height:44, padding:"0 12px", borderRadius:11, border:"none", fontSize:14, fontWeight:800,
                  background:"var(--jade-bg, #e7f6ee)", color:"var(--jade)" }}>{L("+ Stock")}</button>
              <button onClick={() => openEdit(p)} aria-label={"Edit " + p.name}
                style={{ flexShrink:0, width:44, height:44, borderRadius:11, border:"1px solid var(--rule)", fontSize:16,
                  background:"var(--bg0)", color:"var(--ink-dim)" }}>✏️</button>
            </div>
          )
        })}
        {hasMore && (
          <button onClick={() => load(page + 1, true)} className="btn btn-secondary" style={{ marginTop:6 }}>{L("Show more")}</button>
        )}
      </div></div>

      {/* Header */}
      <div className="page-sticky-header mb-4 hidden md:block">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-sm font-semibold">Inventory</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={voiceLang} onChange={e => setVoiceLang(e.target.value)}
              className="text-[10px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 hidden md:block">
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.native} ({l.name})</option>
              ))}
            </select>
            <button onClick={() => setShowScanner(true)}
              className="btn btn-sm"
              style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span>📷</span> Scan
            </button>
            <button onClick={() => setShowBulkBarcodes(true)}
              className="btn btn-sm"
              style={{ display:"flex", alignItems:"center", gap:4 }}
              title="Auto-generate barcodes for all products and print labels">
              🏷️ Bulk Barcodes
            </button>
            <button onClick={openAdd} className="btn btn-primary btn-sm">+ Add Product</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="gap-2 mb-3 flex-wrap hidden md:flex">
        <input className="input flex-1" style={{ minWidth: 140 }} placeholder="Search products..."
          value={search} onChange={e => handleSearchChange(e.target.value)} />
        <select className="input" style={{ width: 140 }} value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">All categories</option>
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="input" style={{ width: 130 }} value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
          {DATE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        {dateFilter !== "all" && (
          <span style={{ fontSize: 11, color: "var(--jade)", alignSelf: "center", fontWeight: 600 }}>
            {displayProducts.length} of {products.length} products
          </span>
        )}
      </div>

      {/* Tip banner */}
      <div className="bg-primary-light border border-primary/20 rounded-lg px-3 py-2 mb-3 text-[10px] text-primary-dark items-center gap-2 hidden md:flex">
        <span>🎤</span>
        <span>
          <b>Voice input enabled</b> — Click + Add Product → tap the mic icon on Name, Stock, or Price → speak in {LANGUAGES.find(l=>l.code===voiceLang)?.name}.
          Unit (kg/litre/piece) is auto-detected from the product name.
        </span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden hidden md:block">
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
              <th className="th">Updated</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11" className="td text-center py-8 text-gray-400 text-xs">Loading...</td></tr>
            ) : displayProducts.length === 0 ? (
              <tr><td colSpan="11" className="td text-center py-8 text-gray-400 text-xs">
                {products.length === 0
                  ? "No products yet — click \"+Add Product\" and speak or type!"
                  : `No products updated ${DATE_FILTERS.find(f => f.value === dateFilter)?.label.toLowerCase()}`}
              </td></tr>
            ) : listProducts.map(p => {
              const [sc, sl] = status(p)
              const ready    = hasBarcode(p)
              const unitInfo = UNIT_TYPES[(p.unit && p.unit !== "piece") ? p.unit : resolveUnit(p.name)] || UNIT_TYPES.piece
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
                    <div style={{ fontSize: 11, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
                      {fmtUpdated(p.updated_at)}
                    </div>
                  </td>
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

        {/* Load more */}
        {hasMore && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => load(page + 1, true)}
            >
              Load more products
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
