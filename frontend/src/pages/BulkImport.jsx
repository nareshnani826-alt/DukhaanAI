import { useState, useRef, useEffect } from "react"
import * as XLSX from "xlsx"
import { Products } from "../sync/db.js"
import { CATALOG, CATEGORIES, getCatalogByCategory } from "../data/productCatalog.js"
import { CommunityCatalog } from "../sync/db.js"
import { fuzzySearch } from "../data/productCatalog.js"
import InvoiceScanTab  from "./InvoiceScanTab.jsx"
import BarcodeScannerTab from "./BarcodeScannerTab.jsx"

const INR  = n => "₹" + (n||0).toLocaleString("en-IN")
const CATS = ["Staples","Dairy","Oils","Beverages","Snacks","Personal Care","Other"]

// Same rule as backend _classify_weight:
//   name weight > 5 kg  → loose/bulk → unit="kg", returns weightKg
//   name weight ≤ 5 kg  → consumer pack → unit="pack"
//   rice (any weight)   → always "pack"
//   no embedded weight  → null (use QTY column unit as-is)
function classifyWeight(name) {
  const m = name.match(/\b(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|kg|kgs|kgm|ml|litre|liter|ltr|lts)\b/i)
  if (!m) return { unit: null, weightKg: null }

  const val     = parseFloat(m[1])
  const rawUnit = m[2].toLowerCase()
  let   valKg
  if (["g","gm","gms","gram","grams"].includes(rawUnit)) valKg = val / 1000
  else if (rawUnit === "ml")                              valKg = val / 1000
  else if (["litre","liter","ltr","lts"].includes(rawUnit)) valKg = val
  else                                                    valKg = val   // kg/kgs/kgm

  if (/\brice\b/i.test(name)) return { unit: "pack", weightKg: null }
  if (valKg > 5)              return { unit: "kg",   weightKg: valKg }
  return                             { unit: "pack",  weightKg: null }
}

// Parse both DukhaanAI template and wholesale invoice CSV formats
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const rawHeader  = lines[0].split(",").map(h => h.trim().replace(/"/g, ""))
  const normHeader = rawHeader.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""))

  // ── Detect wholesale invoice format ──────────────────────────
  const isInvoice = normHeader.some(h => h === "items" || h === "item") &&
                    normHeader.some(h => h.startsWith("qty")) &&
                    normHeader.some(h => h === "rate" || h === "amount")

  if (isInvoice) {
    const ci = key => normHeader.findIndex(h => h === key || h.startsWith(key))
    const nameIdx   = ci("items") >= 0 ? ci("items") : ci("item")
    const qtyIdx    = normHeader.findIndex(h => h.startsWith("qty"))
    const rateIdx   = ci("rate")
    const taxIdx    = ci("tax")
    const amountIdx = ci("amount")

    const UMAP = {
      bor:"pack", bag:"pack", sack:"pack",
      pet:"pc",   jar:"pc",  tin:"pc",  can:"pc",
      pcs:"pc",   pc:"pc",   nos:"pc",  no:"pc",
      kgs:"kg",   kg:"kg",   kgm:"kg",
      gms:"g",    gm:"g",    g:"g",
      ltr:"litre",lts:"litre",ml:"ml",
      box:"box",  doz:"dozen",
    }
    const GSTS     = [0, 5, 12, 18, 28]
    const snapGST  = p => GSTS.reduce((b, r) => Math.abs(r - p) < Math.abs(b - p) ? r : b, 0)

    const results = []
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map(v => v.trim().replace(/"/g, ""))
      const name = (vals[nameIdx] || "").trim()
      if (!name || name === "-" || /^[\d.]+$/.test(name)) continue

      const qtyStr  = qtyIdx >= 0 ? (vals[qtyIdx] || "") : ""
      const qtyM    = qtyStr.match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]+)?/)
      const qtyNum  = qtyM ? parseFloat(qtyM[1]) : 1
      const rawUnit = (qtyM?.[2] || "pc").toLowerCase()
      const unit    = UMAP[rawUnit] || "pc"

      const rate   = rateIdx   >= 0 ? parseFloat(vals[rateIdx])   || 0 : 0
      const tax    = taxIdx    >= 0 ? parseFloat(vals[taxIdx])    || 0 : 0
      const amount = amountIdx >= 0 ? parseFloat(vals[amountIdx]) || 0 : 0

      const preTax = amount > tax ? amount - tax : rate * qtyNum
      const gst    = tax > 0 && preTax > 0 ? snapGST((tax / preTax) * 100) : 0

      const { unit: cUnit, weightKg } = classifyWeight(name)
      let finalUnit  = cUnit !== null ? cUnit : unit
      let finalStock = qtyNum
      let finalCost  = rate

      if (weightKg !== null) {
        finalStock = Math.round(qtyNum * weightKg * 100) / 100
        finalCost  = weightKg > 0 ? Math.round(rate / weightKg * 100) / 100 : rate
      }

      results.push({
        name,
        category: "Other",
        unit:  finalUnit,
        mrp:   finalCost,
        cost:  finalCost,
        stock: finalStock,
        gst,
        _isInvoice: true,
      })
    }
    return results
  }

  // ── Template format: name, category, unit, mrp, cost, stock, gst ──
  const results = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map(v => v.trim().replace(/"/g, ""))
    const row  = {}
    rawHeader.forEach((h, idx) => row[h.toLowerCase()] = vals[idx] || "")

    const name = row.name || row.product || row["product name"] || row.item || ""
    if (!name) continue

    results.push({
      name,
      category: row.category || row.type || "Other",
      unit:     row.unit || "pc",
      mrp:      parseFloat(row.mrp  || row.price || row["selling price"]  || 0) || 0,
      cost:     parseFloat(row.cost || row["cost price"] || row["purchase price"] || 0) || 0,
      stock:    parseFloat(row.stock || row.qty || row.quantity || 0) || 0,
      gst:      parseFloat(row.gst  || row["gst%"] || 0) || 0,
    })
  }
  return results
}

// Parse Excel file via SheetJS → same shape as parseCSV
function parseXLSX(buffer) {
  const wb  = XLSX.read(buffer, { type: "array" })
  const ws  = wb.Sheets[wb.SheetNames[0]]
  const csv = XLSX.utils.sheet_to_csv(ws)
  return parseCSV(csv)
}

// Map CSV rows (cost, gst) to API shape (cost_price, gst_percent)
function toApiItems(rows) {
  return rows.map(item => ({
    name:        item.name,
    category:    item.category || "Other",
    unit:        item.unit     || "pc",
    mrp:         Number(item.mrp)       || 0,
    cost_price:  Number(item.cost)      || 0,
    stock:       Number(item.stock)     || 0,
    min_stock:   5,
    gst_percent: Number(item.gst)       || 0,
  }))
}

export default function BulkImport() {
  const [tab,        setTab]        = useState("catalog") // catalog | excel | scan | barcode | restock
  const [category,   setCategory]   = useState("All")
  const [search,     setSearch]     = useState("")
  const [selected,   setSelected]   = useState(new Set())
  const [csvData,    setCsvData]    = useState([])
  const [importing,  setImporting]  = useState(false)
  const [done,       setDone]       = useState(null)
  const [notif,      setNotif]      = useState("")
  const [step,       setStep]       = useState(1) // 1=select, 2=preview, 3=done
  const [communityProducts, setCommunityProducts] = useState([])
  const [communityLoading, setCommunityLoading] = useState(false)
  const [quantities, setQuantities] = useState({}) // productName → qty
  const fileRef = useRef()

  // ── Restock tab state ──────────────────────────────────────
  const [restockItems,    setRestockItems]    = useState([])
  const [restockLoading,  setRestockLoading]  = useState(false)
  const [restockChanges,  setRestockChanges]  = useState({}) // id → qty string
  const [restockMode,     setRestockMode]     = useState("add") // "add" | "set"
  const [restockSearch,   setRestockSearch]   = useState("")
  const [restockCategory, setRestockCategory] = useState("All")
  const [restockSaving,   setRestockSaving]   = useState(false)
  const [restockDone,     setRestockDone]     = useState(null)

  // Load products when Restock tab opens
  useEffect(() => {
    if (tab !== "restock") return
    setRestockLoading(true)
    Products.list().then(list => {
      setRestockItems(list || [])
      setRestockLoading(false)
    }).catch(() => setRestockLoading(false))
  }, [tab])

  const filteredRestock = restockItems.filter(p => {
    const matchCat = restockCategory === "All" || p.category === restockCategory
    const matchQ   = !restockSearch || p.name.toLowerCase().includes(restockSearch.toLowerCase())
    return matchCat && matchQ
  })

  const pendingRestockCount = Object.keys(restockChanges).filter(
    id => restockChanges[id] !== "" && Number(restockChanges[id]) !== 0
  ).length

  async function saveRestock() {
    const changes = Object.entries(restockChanges)
      .filter(([, qty]) => qty !== "" && Number(qty) !== 0)
      .map(([id, qty]) => {
        const product = restockItems.find(p => p.id === id)
        const newStock = restockMode === "add"
          ? (product?.stock || 0) + Number(qty)
          : Number(qty)
        return { id, stock: Math.max(0, newStock) }
      })

    if (changes.length === 0) return
    setRestockSaving(true)
    try {
      const result = await Products.bulkUpdateStock(changes)
      setRestockDone(result)
      setRestockChanges({})
      // Refresh list
      const updated = await Products.list()
      setRestockItems(updated || [])
      showNotif(`✓ ${result.updated} products restocked`)
    } catch (e) {
      showNotif("Error saving: " + e.message)
    }
    setRestockSaving(false)
  }

  // ── Helpers ───────────────────────────────────────────────
  function setQty(name, qty) {
    setQuantities(q => ({ ...q, [name]: Math.max(0, parseInt(qty)||0) }))
  }

  function showNotif(m) { setNotif(m); setTimeout(() => setNotif(""), 3500) }

  function updateRow(idx, field, value) {
    setCsvData(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  }
  function deleteRow(idx) {
    setCsvData(prev => prev.filter((_, i) => i !== idx))
  }
  function cancelImport() {
    setCsvData([])
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handleSearch(query) {
    if (!query || query.length < 2) {
      setCommunityProducts([])
      return
    }
    const fuzzyResults = fuzzySearch(query)
    let communityResults = []
    setCommunityLoading(true)
    try { communityResults = await CommunityCatalog.search(query) } catch {}
    setCommunityLoading(false)
    const builtInNames = fuzzyResults.map(p => p.name.toLowerCase())
    const newCommunity = communityResults.filter(p =>
      !builtInNames.includes(p.name.toLowerCase())
    )
    setCommunityProducts(newCommunity)
  }

  // ── Catalog tab ───────────────────────────────────────────
  const filtered = getCatalogByCategory(category).filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  function toggleSelect(name) {
    setSelected(s => {
      const n = new Set(s)
      n.has(name) ? n.delete(name) : n.add(name)
      return n
    })
  }
  function selectAll() {
    setSelected(s => { const n = new Set(s); filtered.forEach(p => n.add(p.name)); return n })
  }
  function clearAll() { setSelected(new Set()) }

  // ── File upload (CSV + XLSX) ───────────────────────────────
  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const isExcel = /\.(xlsx|xls|xlsm)$/i.test(file.name)
    const reader  = new FileReader()

    if (isExcel) {
      reader.onload = ev => {
        try {
          const parsed = parseXLSX(new Uint8Array(ev.target.result))
          if (parsed.length === 0) { showNotif("No valid products found in Excel file."); return }
          setCsvData(parsed)
          showNotif(`✓ Found ${parsed.length} products from Excel`)
        } catch {
          showNotif("Could not read Excel file. Try saving as CSV.")
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      reader.onload = ev => {
        const parsed = parseCSV(ev.target.result)
        if (parsed.length === 0) { showNotif("No valid products found. Check your CSV format."); return }
        setCsvData(parsed)
        showNotif(`✓ Found ${parsed.length} products`)
      }
      reader.readAsText(file)
    }
  }

  // ── Bulk import (replaces N-call loop) ────────────────────
  async function importProducts() {
    const catalogItems   = CATALOG.filter(p => selected.has(p.name))
    const communityItems = communityProducts.filter(p => selected.has(p.name))

    let rawItems
    if (tab === "catalog") {
      // Merge catalog + community, apply user-entered quantities
      rawItems = [...catalogItems, ...communityItems].map(p => ({
        ...p,
        cost:  p.cost || p.cost_price || 0,
        stock: quantities[p.name] !== undefined ? Number(quantities[p.name]) : (p.stock || 0),
      }))
    } else {
      rawItems = csvData
    }

    if (rawItems.length === 0) return showNotif("Please select at least one product first")

    setImporting(true)
    try {
      const result = await Products.bulkImport(toApiItems(rawItems))
      setDone(result)
      setStep(3)
    } catch (e) {
      showNotif("Import failed: " + e.message)
    }
    setImporting(false)
  }

  // ── Success screen ─────────────────────────────────────────
  if (step === 3 && done) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center" style={{ background:"var(--bg0)" }}>
        <div style={{ textAlign:"center", maxWidth:380 }}>
          <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
          <div style={{ fontSize:22, fontWeight:800, color:"var(--ink)", marginBottom:8 }}>
            Import Complete!
          </div>
          <div style={{ fontSize:14, color:"var(--ink-faint)", marginBottom:24 }}>
            {done.added} new · {done.updated} stock updated
            {done.failed > 0 && ` · ${done.failed} skipped`}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
            <div style={{ background:"#E1F5EE", borderRadius:16, padding:16, textAlign:"center" }}>
              <div style={{ fontSize:28, fontWeight:800, color:"var(--jade)" }}>{done.added}</div>
              <div style={{ fontSize:11, color:"var(--jade)", marginTop:2 }}>New Products</div>
            </div>
            <div style={{ background:"#EFF6FF", borderRadius:16, padding:16, textAlign:"center" }}>
              <div style={{ fontSize:28, fontWeight:800, color:"#378ADD" }}>{done.updated}</div>
              <div style={{ fontSize:11, color:"#378ADD", marginTop:2 }}>Stock Updated</div>
            </div>
            <div style={{ background:"var(--bg2)", borderRadius:16, padding:16, textAlign:"center" }}>
              <div style={{ fontSize:28, fontWeight:800, color:"var(--ink-faint)" }}>{done.failed}</div>
              <div style={{ fontSize:11, color:"var(--ink-faint)", marginTop:2 }}>Skipped</div>
            </div>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => { setStep(1); setSelected(new Set()); setCsvData([]); setDone(null) }}
              style={{ flex:1, padding:"12px", background:"var(--bg2)", color:"var(--ink-dim)",
                border:"none", borderRadius:12, fontSize:13, fontWeight:600, cursor:"pointer" }}>
              Import More
            </button>
            <button onClick={() => window.location.href="/inventory"}
              style={{ flex:1, padding:"12px",
                background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
                color:"var(--bg1)", border:"none", borderRadius:12, fontSize:13,
                fontWeight:600, cursor:"pointer" }}>
              View Inventory →
            </button>
          </div>
        </div>
      </div>
    )
  }

  const selectedItems = tab === "catalog"
    ? CATALOG.filter(p => selected.has(p.name))
    : csvData

  return (
    <div className="flex-1 overflow-hidden flex flex-col" style={{ background:"var(--bg0)" }}>
      {notif && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:100,
          background:"linear-gradient(135deg,#e87722,#ff8e35)", color:"var(--bg1)", padding:"10px 16px",
          borderRadius:12, fontSize:12, fontWeight:500,
          boxShadow:"0 4px 20px rgba(0,0,0,0.15)" }}>
          {notif}
        </div>
      )}

      {/* Header */}
      <div style={{ background:"var(--bg1)", padding:"0 24px", height:56,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        borderBottom:"1px solid var(--rule)", flexShrink:0 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:"var(--ink)" }}>
            📦 Bulk Stock Import
          </div>
          <div style={{ fontSize:11, color:"var(--ink-faint)" }}>
            Add 200+ products or restock existing inventory in seconds
          </div>
        </div>
        {(tab === "catalog" || tab === "excel") && selectedItems.length > 0 && (
          <button onClick={importProducts} disabled={importing}
            style={{ background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
              color:"var(--bg1)", border:"none", borderRadius:10, padding:"9px 20px",
              fontSize:12, fontWeight:600, cursor:"pointer",
              opacity: importing ? 0.7 : 1 }}>
            {importing ? `Adding ${selectedItems.length}...` : `✓ Add ${selectedItems.length} Products`}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ background:"var(--bg1)", borderBottom:"1px solid var(--rule)",
        display:"flex", padding:"0 12px", flexShrink:0, overflowX:"auto" }}>
        {[
          { id:"restock", label:"♻️ Restock Existing",    sub:"Update stock after delivery" },
          { id:"scan",    label:"📸 AI Invoice Scan",     sub:"Photo → auto stock update" },
          { id:"barcode", label:"📱 Barcode Scanner",      sub:"Scan product barcode" },
          { id:"catalog", label:"📋 Product Catalog",      sub:"200+ grocery products" },
          { id:"excel",   label:"📊 Excel / CSV Import",  sub:"Upload your price list (.csv, .xlsx)" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:"12px 16px 10px", border:"none", background:"none",
              cursor:"pointer", textAlign:"left", marginRight:2, flexShrink:0,
              borderBottom: tab===t.id ? "2px solid #1D9E75" : "2px solid transparent" }}>
            <div style={{ fontSize:11, fontWeight:600,
              color: tab===t.id ? "var(--jade)" : "var(--ink-dim)" }}>
              {t.label}
            </div>
            <div style={{ fontSize:9, color:"var(--ink-faint)", marginTop:1 }}>{t.sub}</div>
          </button>
        ))}
      </div>

      {/* ── Restock Tab ────────────────────────────────────── */}
      {tab === "restock" && (
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          {/* Controls */}
          <div style={{ background:"var(--bg1)", padding:"12px 24px",
            borderBottom:"1px solid var(--rule)", flexShrink:0 }}>
            <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:10 }}>
              <input value={restockSearch} onChange={e => setRestockSearch(e.target.value)}
                placeholder="🔍 Search products..."
                style={{ flex:1, border:"1.5px solid #e5e7eb", borderRadius:10,
                  padding:"8px 14px", fontSize:12, outline:"none" }}/>
              {/* Mode toggle */}
              <div style={{ display:"flex", background:"var(--bg2)", borderRadius:10, padding:3, flexShrink:0 }}>
                <button onClick={() => setRestockMode("add")}
                  style={{ padding:"6px 12px", borderRadius:8, border:"none", fontSize:11,
                    fontWeight:600, cursor:"pointer", whiteSpace:"nowrap",
                    background: restockMode==="add" ? "var(--jade)" : "transparent",
                    color: restockMode==="add" ? "var(--bg1)" : "var(--ink-dim)" }}>
                  + Add to stock
                </button>
                <button onClick={() => setRestockMode("set")}
                  style={{ padding:"6px 12px", borderRadius:8, border:"none", fontSize:11,
                    fontWeight:600, cursor:"pointer", whiteSpace:"nowrap",
                    background: restockMode==="set" ? "#e87722" : "transparent",
                    color: restockMode==="set" ? "var(--bg1)" : "var(--ink-dim)" }}>
                  = Set value
                </button>
              </div>
            </div>
            {/* Category pills */}
            <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:2 }}>
              {["All", ...CATS].map(cat => (
                <button key={cat} onClick={() => setRestockCategory(cat)}
                  style={{ padding:"5px 12px", borderRadius:20, border:"none",
                    fontSize:11, fontWeight:500, whiteSpace:"nowrap", cursor:"pointer", flexShrink:0,
                    background: restockCategory===cat ? "var(--jade)" : "var(--bg2)",
                    color: restockCategory===cat ? "var(--bg1)" : "var(--ink-dim)" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product list */}
          <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
            {restockLoading ? (
              <div style={{ textAlign:"center", padding:48, color:"var(--ink-faint)", fontSize:13 }}>
                Loading inventory...
              </div>
            ) : filteredRestock.length === 0 ? (
              <div style={{ textAlign:"center", padding:48, color:"var(--ink-faint)", fontSize:13 }}>
                {restockItems.length === 0
                  ? "No products yet. Use Catalog or CSV tab to add products first."
                  : "No products match this filter."}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {filteredRestock.map(p => {
                  const qty      = restockChanges[p.id] ?? ""
                  const hasChange = qty !== "" && Number(qty) !== 0
                  const newStock  = restockMode === "add"
                    ? (p.stock || 0) + (Number(qty) || 0)
                    : Number(qty) || 0
                  const isLow     = (p.stock || 0) < (p.min_stock || 0)
                  return (
                    <div key={p.id} style={{
                      background:"var(--bg1)", borderRadius:12, padding:"10px 14px",
                      border: hasChange ? "1.5px solid #1D9E75" : "1px solid var(--rule)",
                      display:"flex", alignItems:"center", gap:12,
                      boxShadow: hasChange ? "0 2px 12px rgba(29,158,117,0.1)" : "none",
                    }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)",
                          marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize:11, color:"var(--ink-faint)" }}>
                          {p.category} · {p.unit} · Stock:{" "}
                          <b style={{ color: isLow ? "#dc2626" : "var(--jade)" }}>{p.stock}</b>
                          {isLow && <span style={{ color:"#dc2626", marginLeft:4 }}>⚠ Low</span>}
                          {hasChange && (
                            <span style={{ color:"#1D9E75", marginLeft:4 }}>→ {newStock}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                        <span style={{ fontSize:10, color:"var(--ink-faint)", whiteSpace:"nowrap" }}>
                          {restockMode === "add" ? "Add qty" : "Set to"}
                        </span>
                        <input type="number" min="0"
                          value={qty}
                          onChange={e => setRestockChanges(prev => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder="0"
                          style={{ width:70, border:"1.5px solid var(--rule)", borderRadius:8,
                            padding:"5px 8px", fontSize:13, fontWeight:600, outline:"none",
                            textAlign:"center", background:"white",
                            borderColor: hasChange ? "#1D9E75" : "var(--rule)",
                            color: hasChange ? "var(--jade)" : "var(--ink)" }}/>
                        <span style={{ fontSize:10, color:"var(--ink-faint)", minWidth:24 }}>{p.unit}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          {pendingRestockCount > 0 && (
            <div style={{ background:"var(--bg1)", borderTop:"1px solid var(--rule)",
              padding:"14px 24px", display:"flex", alignItems:"center",
              justifyContent:"space-between", flexShrink:0,
              boxShadow:"0 -4px 20px rgba(0,0,0,0.06)" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)" }}>
                  {pendingRestockCount} products to update
                </div>
                <div style={{ fontSize:11, color:"var(--ink-faint)" }}>
                  Mode: {restockMode === "add" ? "Adding to current stock" : "Setting new stock value"}
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setRestockChanges({})}
                  style={{ background:"var(--bg2)", color:"var(--ink-dim)", border:"none",
                    borderRadius:9, padding:"8px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  Clear
                </button>
                <button onClick={saveRestock} disabled={restockSaving}
                  style={{ background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
                    color:"var(--bg1)", border:"none", borderRadius:12,
                    padding:"12px 28px", fontSize:13, fontWeight:700,
                    cursor:"pointer", opacity: restockSaving ? 0.7 : 1 }}>
                  {restockSaving ? "Saving..." : `Save Restock (${pendingRestockCount})`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AI Invoice Scan Tab ────────────────────────── */}
      {tab === "scan" && (
        <div style={{ flex:1, overflowY:"auto" }}>
          <InvoiceScanTab />
        </div>
      )}

      {/* ── Barcode Scanner Tab ────────────────────────── */}
      {tab === "barcode" && (
        <div style={{ flex:1, overflowY:"auto" }}>
          <BarcodeScannerTab />
        </div>
      )}

      {/* ── Catalog Tab ────────────────────────────────── */}
      {tab === "catalog" && (
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          {/* Filters */}
          <div style={{ background:"var(--bg1)", padding:"12px 24px",
            borderBottom:"1px solid var(--rule)", flexShrink:0 }}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Search products..."
                style={{ flex:1, border:"1.5px solid #e5e7eb", borderRadius:10,
                  padding:"8px 14px", fontSize:12, outline:"none" }}/>
              <button onClick={selectAll}
                style={{ background:"#E1F5EE", color:"var(--jade)", border:"none",
                  borderRadius:9, padding:"8px 14px", fontSize:11,
                  fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
                Select All
              </button>
              <button onClick={clearAll}
                style={{ background:"var(--bg2)", color:"var(--ink-dim)", border:"none",
                  borderRadius:9, padding:"8px 14px", fontSize:11,
                  fontWeight:600, cursor:"pointer" }}>
                Clear
              </button>
            </div>
            {/* Category pills */}
            <div style={{ display:"flex", gap:6, marginTop:10,
              overflowX:"auto", paddingBottom:2 }}>
              {["All", ...CATEGORIES].map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{ padding:"5px 12px", borderRadius:20, border:"none",
                    fontSize:11, fontWeight:500, whiteSpace:"nowrap", cursor:"pointer",
                    background: category===cat ? "var(--jade)" : "var(--bg2)",
                    color: category===cat ? "var(--bg1)" : "var(--ink-dim)",
                    flexShrink:0 }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div style={{ flex:1, overflowY:"auto", padding:20 }}>
            {communityProducts.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#7F77DD",
                  marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                  <span>👥 From Community (other vendors added these)</span>
                  <span style={{ background:"#EEEDFE", color:"#7F77DD",
                    fontSize:9, padding:"2px 7px", borderRadius:10 }}>
                    {communityProducts.length} found
                  </span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10, marginBottom:16 }}>
                  {communityProducts.map(p => {
                    const sel = selected.has(p.name)
                    return (
                      <div key={p.name} onClick={() => toggleSelect(p.name)}
                        style={{
                          background:"var(--bg1)", borderRadius:14, padding:14,
                          border: sel ? "2px solid #7F77DD" : "1.5px solid #EEEDFE",
                          cursor:"pointer", position:"relative",
                          boxShadow: sel ? "0 2px 16px rgba(127,119,221,0.15)" : "none",
                        }}>
                        <div style={{ position:"absolute", top:8, right:8,
                          background:"#EEEDFE", color:"#7F77DD",
                          fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:8 }}>
                          Community
                        </div>
                        <div style={{ width:18, height:18, borderRadius:5, position:"absolute", top:8, left:8,
                          background: sel ? "#7F77DD" : "var(--bg2)",
                          display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {sel && <svg width="10" height="10" fill="none" stroke="var(--bg1)" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        <div style={{ fontSize:12, fontWeight:600, color:"var(--ink)",
                          marginBottom:4, paddingLeft:26, paddingRight:36, lineHeight:1.4 }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize:10, color:"var(--ink-faint)", marginBottom:8 }}>
                          {p.category} · {p.unit}{p.gst > 0 ? ` · GST ${p.gst}%` : ""}
                          {p.usage_count > 1 && ` · Used by ${p.usage_count} vendors`}
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between" }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"var(--jade)" }}>{INR(p.mrp)}</div>
                          <div style={{ fontSize:10, color:"var(--ink-faint)" }}>Cost: {INR(p.cost)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <hr style={{ border:"none", borderTop:"1.5px dashed #EEEDFE", marginBottom:16 }}/>
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
              {filtered.map(p => {
                const sel = selected.has(p.name)
                return (
                  <div key={p.name} onClick={() => toggleSelect(p.name)}
                    style={{
                      background:"var(--bg1)", borderRadius:14, padding:14,
                      border: sel ? "2px solid #1D9E75" : "1.5px solid #eef2ee",
                      cursor:"pointer", transition:"all 0.15s", position:"relative",
                      boxShadow: sel ? "0 2px 16px rgba(29,158,117,0.15)" : "0 1px 4px rgba(0,0,0,0.04)",
                    }}>
                    <div style={{
                      position:"absolute", top:10, right:10,
                      width:20, height:20, borderRadius:6,
                      background: sel ? "var(--jade)" : "var(--bg2)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      {sel && <svg width="12" height="12" fill="none" stroke="var(--bg1)" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>

                    <div style={{ fontSize:12, fontWeight:600, color:"var(--ink)",
                      marginBottom:4, paddingRight:28, lineHeight:1.4 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize:10, color:"var(--ink-faint)", marginBottom:8 }}>
                      {p.category} · {p.unit}
                      {p.gst > 0 && ` · GST ${p.gst}%`}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"var(--jade)" }}>
                          {INR(p.mrp)}
                        </div>
                        <div style={{ fontSize:10, color:"var(--ink-faint)" }}>
                          Cost: {INR(p.cost)}
                        </div>
                      </div>
                      <div style={{ fontSize:10, fontWeight:600,
                        background:"#f0faf6", color:"var(--jade)",
                        padding:"3px 8px", borderRadius:8 }}>
                        {Math.round((p.mrp-p.cost)/p.mrp*100)}% margin
                      </div>
                    </div>
                    {sel && (
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}
                        onClick={e => e.stopPropagation()}>
                        <span style={{ fontSize:10, color:"var(--ink-dim)", whiteSpace:"nowrap" }}>Qty in stock:</span>
                        <input
                          type="number" min="0"
                          value={quantities[p.name] ?? ""}
                          onChange={e => setQty(p.name, e.target.value)}
                          placeholder="0"
                          style={{ width:"100%", border:"1.5px solid #1D9E75", borderRadius:7,
                            padding:"4px 8px", fontSize:12, outline:"none", fontWeight:600,
                            color:"var(--jade)", textAlign:"center" }}
                        />
                        <span style={{ fontSize:10, color:"var(--ink-faint)", whiteSpace:"nowrap" }}>{p.unit}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom bar */}
          {selected.size > 0 && (
            <div style={{ background:"var(--bg1)", borderTop:"1px solid var(--rule)",
              padding:"14px 24px", display:"flex", alignItems:"center",
              justifyContent:"space-between", flexShrink:0,
              boxShadow:"0 -4px 20px rgba(0,0,0,0.06)" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)" }}>
                  {selected.size} products selected
                </div>
                <div style={{ fontSize:11, color:"var(--ink-faint)" }}>
                  All prices editable after import
                </div>
              </div>
              <button onClick={importProducts} disabled={importing}
                style={{ background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
                  color:"var(--bg1)", border:"none", borderRadius:12,
                  padding:"12px 28px", fontSize:13, fontWeight:700,
                  cursor:"pointer", opacity: importing ? 0.7 : 1 }}>
                {importing ? "Adding products..." : `✓ Add ${selected.size} Products to Inventory`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Excel / CSV Tab ─────────────────────────────── */}
      {tab === "excel" && (
        <div style={{ flex:1, overflowY:"auto", padding:24 }}>
          {csvData.length === 0 ? (
            <div>
              {/* Upload area */}
              <div onClick={() => fileRef.current.click()}
                style={{
                  border:"2px dashed #d1fae5", borderRadius:20,
                  padding:"48px 24px", textAlign:"center", cursor:"pointer",
                  background:"#f0faf6", marginBottom:20, transition:"all 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor="var(--jade)"}
                onMouseLeave={e => e.currentTarget.style.borderColor="#d1fae5"}>
                <div style={{ fontSize:48, marginBottom:12 }}>📊</div>
                <div style={{ fontSize:16, fontWeight:700, color:"var(--jade)", marginBottom:6 }}>
                  Upload your price list
                </div>
                <div style={{ fontSize:12, color:"var(--ink-faint)", marginBottom:16 }}>
                  Supports CSV (.csv) and Excel (.xlsx, .xls) files
                </div>
                <div style={{ background:"linear-gradient(135deg,#e87722,#ff8e35)", color:"var(--bg1)", border:"none",
                  borderRadius:10, padding:"10px 24px", fontSize:12,
                  fontWeight:600, display:"inline-block" }}>
                  Choose File
                </div>
                <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls,.xlsm"
                  style={{ display:"none" }} onChange={handleFile}/>
              </div>

              {/* CSV format guide */}
              <div style={{ background:"var(--bg1)", borderRadius:16, padding:20,
                border:"1px solid var(--rule)", marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)", marginBottom:12 }}>
                  📋 Supported Formats
                </div>

                <div style={{ fontSize:11, fontWeight:600, color:"var(--ink-dim)", marginBottom:6 }}>
                  Format 1 — DukhaanAI Template (CSV or Excel)
                </div>
                <div style={{ background:"#1e293b", borderRadius:10, padding:14,
                  fontFamily:"monospace", fontSize:11, overflowX:"auto", marginBottom:10 }}>
                  <div style={{ color:"#7DD3FC" }}>name, category, unit, mrp, cost, stock, gst</div>
                  <div style={{ color:"#86EFAC" }}>Amul Milk 500ml, Dairy, pc, 28, 25, 50, 0</div>
                  <div style={{ color:"#86EFAC" }}>Tata Salt 1kg, Staples, kg, 24, 21, 100, 0</div>
                </div>

                <div style={{ fontSize:11, fontWeight:600, color:"var(--ink-dim)", marginBottom:6 }}>
                  Format 2 — Wholesale Invoice (auto-detected)
                </div>
                <div style={{ background:"#1e293b", borderRadius:10, padding:14,
                  fontFamily:"monospace", fontSize:11, overflowX:"auto", marginBottom:12 }}>
                  <div style={{ color:"#7DD3FC" }}>S.No., ITEMS, HSN, QTY., RATE, DISC., TAX, AMOUNT</div>
                  <div style={{ color:"#86EFAC" }}>1, CHANA 50 KG, -, 1.0 BOR, 2760.0, 0.0, 0.0, 2760.0</div>
                  <div style={{ color:"#86EFAC" }}>2, FORTUNE BESAN 500 GM, -, 10.0 PCS, 70.0, 0.0, 0.0, 700.0</div>
                </div>

                <div style={{ fontSize:11, color:"var(--ink-faint)" }}>
                  ✓ Both formats are auto-detected from the header row<br/>
                  ✓ Excel files (.xlsx) are supported — no conversion needed<br/>
                  ✓ For invoice format: RATE is imported as cost price — set MRP after import<br/>
                  ✓ Column names are flexible (any order, case-insensitive)
                </div>
              </div>

              {/* Download template */}
              <button onClick={() => {
                const csv = "name,category,unit,mrp,cost,stock,gst\nAmul Milk 500ml,Dairy,pc,28,25,50,0\nTata Salt 1kg,Staples,kg,24,21,100,0\n"
                const blob = new Blob([csv], { type:"text/csv" })
                const url  = URL.createObjectURL(blob)
                const a    = document.createElement("a")
                a.href = url; a.download = "dukaanai_template.csv"; a.click()
              }}
                style={{ background:"var(--bg1)", color:"var(--jade)",
                  border:"1.5px solid #1D9E75", borderRadius:10,
                  padding:"10px 20px", fontSize:12, fontWeight:600,
                  cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                ⬇ Download Template CSV
              </button>
            </div>
          ) : (
            <div>
              {csvData[0]?._isInvoice && (
                <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12,
                  padding:"10px 14px", marginBottom:12, fontSize:11, color:"#92400e" }}>
                  <b>Wholesale invoice format detected.</b> RATE imported as cost price — MRP will match cost price.
                  Set your selling prices in Inventory after import.
                </div>
              )}
              {/* Action bar */}
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)" }}>
                    {csvData.length} products ready to import
                  </div>
                  <div style={{ fontSize:11, color:"var(--ink-faint)", marginTop:2 }}>
                    Edit any cell · click ✕ to remove a row · then Import
                  </div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={cancelImport}
                    style={{ background:"var(--bg2)", color:"var(--ink-dim)", border:"none",
                      borderRadius:9, padding:"8px 16px", fontSize:12,
                      fontWeight:600, cursor:"pointer" }}>
                    Cancel
                  </button>
                  <button onClick={importProducts} disabled={importing || csvData.length === 0}
                    style={{ background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
                      color:"var(--bg1)", border:"none", borderRadius:10,
                      padding:"9px 20px", fontSize:12, fontWeight:600,
                      cursor: csvData.length === 0 ? "default" : "pointer",
                      opacity: importing || csvData.length === 0 ? 0.6 : 1 }}>
                    {importing ? "Importing..." : `Import ${csvData.length} Products`}
                  </button>
                </div>
              </div>

              {/* Editable preview table */}
              <div style={{ background:"var(--bg1)", borderRadius:16, overflow:"hidden",
                border:"1px solid var(--rule)" }}>
                {csvData.length === 0 ? (
                  <div style={{ padding:32, textAlign:"center", fontSize:12, color:"var(--ink-faint)" }}>
                    All rows removed — click Cancel to go back.
                  </div>
                ) : (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", minWidth:740 }}>
                      <thead>
                        <tr style={{ background:"var(--bg0)" }}>
                          {["Product Name","Category","Unit","MRP (₹)","Cost (₹)","Stock","GST%",""].map(h => (
                            <th key={h} style={{ padding:"8px 10px", textAlign:"left",
                              fontSize:10, fontWeight:700, color:"var(--ink-faint)",
                              textTransform:"uppercase", letterSpacing:"0.5px",
                              borderBottom:"1px solid var(--rule)", whiteSpace:"nowrap" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.map((p, i) => (
                          <tr key={i} style={{ borderBottom:"1px solid #f5f7f5" }}>
                            <td style={{ padding:"5px 8px", minWidth:180 }}>
                              <input value={p.name || ""}
                                onChange={e => updateRow(i, "name", e.target.value)}
                                style={{ width:"100%", border:"1px solid var(--rule)", borderRadius:6,
                                  padding:"4px 7px", fontSize:12, fontWeight:500,
                                  color:"var(--ink)", outline:"none", background:"white" }}/>
                            </td>
                            <td style={{ padding:"5px 8px" }}>
                              <select value={p.category || "Other"}
                                onChange={e => updateRow(i, "category", e.target.value)}
                                style={{ border:"1px solid var(--rule)", borderRadius:6,
                                  padding:"4px 5px", fontSize:11, outline:"none",
                                  background:"white", width:100 }}>
                                {CATS.map(c => <option key={c}>{c}</option>)}
                              </select>
                            </td>
                            <td style={{ padding:"5px 8px" }}>
                              <select value={p.unit || "pc"}
                                onChange={e => updateRow(i, "unit", e.target.value)}
                                style={{ border:"1px solid var(--rule)", borderRadius:6,
                                  padding:"4px 5px", fontSize:11, outline:"none",
                                  background:"white", width:72 }}>
                                {["pc","kg","g","litre","ml","pack","box","dozen","carton","strip"].map(u => (
                                  <option key={u}>{u}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding:"5px 8px" }}>
                              <input type="number" min="0" step="0.01"
                                value={p.mrp ?? ""}
                                onChange={e => updateRow(i, "mrp", parseFloat(e.target.value) || 0)}
                                style={{ width:80, border:"1px solid var(--rule)", borderRadius:6,
                                  padding:"4px 7px", fontSize:12, fontWeight:600,
                                  color:"var(--jade)", outline:"none", background:"white", textAlign:"right" }}/>
                            </td>
                            <td style={{ padding:"5px 8px" }}>
                              <input type="number" min="0" step="0.01"
                                value={p.cost ?? ""}
                                onChange={e => updateRow(i, "cost", parseFloat(e.target.value) || 0)}
                                style={{ width:80, border:"1px solid var(--rule)", borderRadius:6,
                                  padding:"4px 7px", fontSize:11, outline:"none",
                                  background:"white", textAlign:"right" }}/>
                            </td>
                            <td style={{ padding:"5px 8px" }}>
                              <input type="number" min="0" step="1"
                                value={p.stock ?? ""}
                                onChange={e => updateRow(i, "stock", parseFloat(e.target.value) || 0)}
                                style={{ width:62, border:"1px solid var(--rule)", borderRadius:6,
                                  padding:"4px 7px", fontSize:11, outline:"none",
                                  background:"white", textAlign:"right" }}/>
                            </td>
                            <td style={{ padding:"5px 8px" }}>
                              <select value={p.gst ?? 0}
                                onChange={e => updateRow(i, "gst", parseFloat(e.target.value))}
                                style={{ border:"1px solid var(--rule)", borderRadius:6,
                                  padding:"4px 5px", fontSize:11, outline:"none",
                                  background:"white", width:58 }}>
                                {[0,5,12,18,28].map(g => <option key={g} value={g}>{g}%</option>)}
                              </select>
                            </td>
                            <td style={{ padding:"5px 6px", textAlign:"center" }}>
                              <button onClick={() => deleteRow(i)} title="Remove this row"
                                style={{ background:"none", border:"none", cursor:"pointer",
                                  color:"#dc2626", fontSize:15, lineHeight:1,
                                  padding:"2px 6px", borderRadius:6 }}>
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
