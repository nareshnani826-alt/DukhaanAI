import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import * as XLSX from "xlsx"
import { getToken } from "../sync/db.js"
import { BANGLE_CATALOG as CATALOG, BANGLE_CATALOG_CATS } from "../data/bangleCatalog.js"
import BangleInvoiceScanTab from "./BangleInvoiceScanTab.jsx"

const API = import.meta.env.VITE_API_URL ?? ""
const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN")

const CATS    = BANGLE_CATALOG_CATS

const CAT_GROUPS = {
  "Jewellery":    ["Bangles","Earrings","Necklace","Maang Tikka","Anklet","Hair Clip","Bindi","Rings","Bracelet","Nose Ring"],
  "Beauty":       ["Nail Polish","Kajal","Lipstick","Mehendi","Perfume","Compact","Skin Care"],
  "Personal Care":["Shampoo","Hair Oil","Body Lotion","Soap","Talcum Powder","Hair Color"],
}
const CAT_GROUP_ICONS = { "Jewellery":"💍", "Beauty":"💄", "Personal Care":"🧴" }
const BEAUTY_CATS = new Set([
  "Nail Polish","Kajal","Lipstick","Mehendi","Perfume","Compact","Skin Care",
  "Shampoo","Hair Oil","Body Lotion","Soap","Talcum Powder","Hair Color",
])
const BEAUTY_SHADE_CATS = new Set(["Nail Polish","Lipstick"])
const BEAUTY_NO_COLOUR_CATS = new Set([
  "Kajal","Mehendi","Perfume","Compact","Skin Care",
  "Shampoo","Hair Oil","Body Lotion","Soap","Talcum Powder","Hair Color",
])
const BEAUTY_SHADES = {
  "Nail Polish": [
    "Red","Dark Red","Crimson","Pink","Baby Pink","Hot Pink","Coral","Peach",
    "Orange","Maroon","Burgundy","Wine","Purple","Lavender","Brown","Nude","Beige",
    "White","Black","Blue","Dark Green","Rose Gold","Gold","Silver",
    "Glitter","Shimmer","Holographic","French White","Multi",
  ],
  "Lipstick": [
    "Red","Dark Red","Crimson","Pink","Baby Pink","Hot Pink","Coral","Peach",
    "Mauve","Rosewood","Nude","Beige","Brown","Caramel","Berry","Plum",
    "Maroon","Burgundy","Wine","Orange","Magenta","Rose",
  ],
}

const CATEGORY_SIZES = {
  "Bangles":     ["2.2","2.4","2.6","2.8","2.10","2.12","2.14","Free Size"],
  "Earrings":    ["Studs","Drops","Hoops / Bali","Jhumka","Chandbali","Dangler","Ear Cuff","Tassel"],
  "Necklace":    ["Choker","Short (16\")","Princess (18\")","Medium (20\")","Long (24\")","Mala (30+\")","Layered"],
  "Maang Tikka": ["Small","Medium","Large","Jhoomar","Maathapatti"],
  "Anklet":      ["Small","Medium","Large","Adjustable","Free Size"],
  "Hair Clip":   ["Alligator","Claw","Bobby Pin","Banana","Butterfly","Scrunchie","U-Pin","Barrette","Hairband"],
  "Bindi":       ["Round","Oval","Tear Drop","Long","Star","Crescent","Diamond","Flower"],
  "Rings":       ["5","6","7","8","9","10","11","12","Adjustable"],
  "Bracelet":    ["XS","Small","Medium","Large","Free Size"],
  "Nose Ring":   ["Nath","Phool / Stud","Nose Ring","L-Shape Pin","Septum","Hoop","Screw"],
  "Other":       ["Small","Medium","Large","Free Size","Adjustable"],
}
const SIZE_LABEL = {
  "Bangles":     "BANGLE SIZE",
  "Earrings":    "EARRING TYPE",
  "Necklace":    "NECKLACE LENGTH",
  "Maang Tikka": "TIKKA SIZE",
  "Anklet":      "ANKLET SIZE",
  "Hair Clip":   "CLIP TYPE",
  "Bindi":       "BINDI SHAPE",
  "Rings":       "RING SIZE",
  "Bracelet":    "BRACELET SIZE",
  "Nose Ring":   "NOSE RING TYPE",
  "Other":       "SIZE / TYPE",
}

const COLOURS = [
  "Red","Pink","Maroon","Green","Blue","Navy",
  "Gold","Rose Gold","Silver","White","Black",
  "Orange","Yellow","Purple","Peach","Multi",
]
const CATEGORY_DESIGNS = {
  "Bangles":     ["Plain","Kundan","Meenakari","Stone Work","Mirror Work","Lac","Metal","Glass","Pearl","Crystal","Thread","Oxidized","Zari","Antique"],
  "Earrings":    ["Plain","Kundan","Stone Work","Pearl","Crystal","Thread","Oxidized","Antique","Meenakari","Zari","Beaded","Tassel"],
  "Necklace":    ["Plain","Kundan","Meenakari","Stone Work","Pearl","Crystal","Temple","Oxidized","Antique","Zari","Beaded","Pendant","Locket"],
  "Maang Tikka": ["Plain","Kundan","Stone Work","Pearl","Crystal","Meenakari","Oxidized","Antique","Bridal"],
  "Anklet":      ["Plain","Ghungroo","Stone Work","Beaded","Oxidized","Antique","Charm","Kundan","Silver"],
  "Hair Clip":   ["Plain","Floral","Stone Work","Pearl","Crystal","Bow","Metal","Fabric","Bridal"],
  "Bindi":       ["Velvet","Crystal","Stone","Glitter","Matte","Traditional","Zari","Fancy"],
  "Rings":       ["Plain","Kundan","Stone Work","Pearl","Crystal","Oxidized","Antique","Band","Adjustable"],
  "Bracelet":    ["Plain","Kundan","Stone Work","Pearl","Crystal","Charm","Beaded","Tennis","Oxidized","Antique","Evil Eye"],
  "Nose Ring":   ["Plain","Stone Work","Kundan","Pearl","Oxidized","Antique","Traditional","Bridal"],
  "Other":       ["Plain","Kundan","Stone Work","Metal","Crystal","Oxidized","Antique","Beaded"],
}
const GSTS    = [0, 3, 5, 12, 18]

function authHeaders() {
  const t = getToken()
  return t ? { "Content-Type":"application/json", Authorization:`Bearer ${t}` }
           : { "Content-Type":"application/json" }
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders(), ...opts })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    const d = e.detail
    const msg = typeof d === "string" ? d
              : Array.isArray(d)      ? d.map(x => x.msg || JSON.stringify(x)).join("; ")
              : d                     ? JSON.stringify(d)
              : "Request failed"
    throw new Error(msg)
  }
  return res.json()
}

// Parse CSV/Excel rows into bangle import format
function parseRows(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const raw  = lines[0].split(",").map(h => h.trim().replace(/"/g, "").toLowerCase())
  const col  = k => raw.findIndex(h => h.includes(k))
  const nameI = raw.findIndex(h => h === "name" || h === "product" || h.includes("product name"))
  const catI  = col("category")
  const mrpI  = col("mrp") >= 0 ? col("mrp") : col("price")
  const costI = col("cost")
  const gstI  = col("gst")
  const colI  = col("colour") >= 0 ? col("colour") : col("color")
  const sizeI = col("size")
  const desI  = col("design")
  const stkI  = col("stock") >= 0 ? col("stock") : col("qty")

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const v = lines[i].split(",").map(c => c.trim().replace(/"/g, ""))
    const name = nameI >= 0 ? v[nameI] : ""
    if (!name || /^[\d.]+$/.test(name) || name === "-") continue
    rows.push({
      name,
      category: catI >= 0  ? v[catI]  : "Bangles",
      mrp:      mrpI >= 0  ? parseFloat(v[mrpI])  || 0 : 0,
      cost:     costI >= 0 ? parseFloat(v[costI]) || 0 : 0,
      gst:      gstI >= 0  ? parseFloat(v[gstI])  || 0 : 3,
      colour:   colI >= 0  ? v[colI]  : "",
      size:     sizeI >= 0 ? v[sizeI] : "",
      design:   desI >= 0  ? v[desI]  : "",
      stock:    stkI >= 0  ? parseInt(v[stkI])    || 0 : 0,
    })
  }
  return rows
}

// Chip toggle button
function Chip({ label, active, onClick, colour }) {
  const colours = {
    Red:"#ff4444",Pink:"#ff69b4",Green:"#1D9E75",Blue:"#3b82f6",
    Gold:"#f59e0b",Silver:"#9ca3af",White:"#e5e7eb",Black:"#374151",
    Orange:"#f97316",Purple:"#9333ea",Multi:"linear-gradient(135deg,#ff4444,#3b82f6,#1D9E75)",
  }
  return (
    <button onClick={onClick}
      style={{
        padding:"5px 11px", borderRadius:20, border:"none", fontSize:11,
        fontWeight:600, cursor:"pointer", transition:"all 0.15s",
        background: active
          ? (colours[label] || "var(--saffron)")
          : "var(--bg2)",
        color: active ? (label==="Gold"||label==="White"?"#000":"#fff") : "var(--ink-dim)",
        boxShadow: active ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
      }}>
      {label}
    </button>
  )
}

export default function BangleBulkImport() {
  const navigate = useNavigate()
  const [tab, setTab] = useState("catalog") // catalog | csv | restock | scan

  // ── Catalog tab state ─────────────────────────────────────
  const [catFilter,  setCatFilter]  = useState("All")
  const [catSearch,  setCatSearch]  = useState("")
  const [openGroup,  setOpenGroup]  = useState(null)
  const catFilterRef = useRef(null)
  const [selected,   setSelected]   = useState({}) // name → {colours,sizes,designs,stock,mrp,cost,gst,category}
  const [importing,  setImporting]  = useState(false)
  const [done,       setDone]       = useState(null)

  // ── CSV tab state ─────────────────────────────────────────
  const [csvRows,    setCsvRows]    = useState([])
  const [csvImporting, setCsvImporting] = useState(false)
  const fileRef = useRef()

  // ── Restock tab state ─────────────────────────────────────
  const [products,   setProducts]   = useState([])
  const [restockLoading, setRestockLoading] = useState(false)
  const [restockChanges, setRestockChanges] = useState({}) // variantId → qty string
  const [restockMode, setRestockMode] = useState("add")
  const [restockSaving, setRestockSaving] = useState(false)
  const [restockSearch, setRestockSearch] = useState("")
  const [restockCat,   setRestockCat]   = useState("All")

  const [notif, setNotif] = useState("")

  function showNotif(m) { setNotif(m); setTimeout(() => setNotif(""), 3500) }

  useEffect(() => {
    if (!openGroup) return
    function handleClick(e) {
      if (catFilterRef.current && !catFilterRef.current.contains(e.target)) setOpenGroup(null)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [openGroup])

  // Load products when restock tab opens
  useEffect(() => {
    if (tab !== "restock") return
    setRestockLoading(true)
    apiFetch("/bangle/products")
      .then(list => { setProducts(list || []); setRestockLoading(false) })
      .catch(() => setRestockLoading(false))
  }, [tab])

  // ── Catalog helpers ───────────────────────────────────────
  const filteredCatalog = CATALOG.filter(p => {
    const matchCat = catFilter === "All" || p.category === catFilter
    const matchQ   = !catSearch || p.name.toLowerCase().includes(catSearch.toLowerCase())
    return matchCat && matchQ
  })

  function toggleProduct(p) {
    setSelected(prev => {
      if (prev[p.name]) {
        const n = { ...prev }; delete n[p.name]; return n
      }
      return { ...prev, [p.name]: {
        category: p.category,
        mrp: p.mrp, cost: p.cost, gst: p.gst,
        colours: [], sizes: [], designs: [], stock: 12,
      }}
    })
  }

  function updateSel(name, field, value) {
    setSelected(prev => ({ ...prev, [name]: { ...prev[name], [field]: value } }))
  }

  function toggleChip(name, field, val) {
    setSelected(prev => {
      const arr = prev[name][field]
      return { ...prev, [name]: {
        ...prev[name],
        [field]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
      }}
    })
  }

  // Build import rows from catalog selections
  function buildCatalogRows() {
    const rows = []
    for (const [name, cfg] of Object.entries(selected)) {
      const product = CATALOG.find(p => p.name === name)
      if (!product) continue
      const colours = cfg.colours.length ? cfg.colours : [null]
      const sizes   = cfg.sizes.length   ? cfg.sizes   : [null]
      const designs = cfg.designs.length ? cfg.designs : [null]
      for (const colour of colours)
        for (const size of sizes)
          for (const design of designs)
            rows.push({
              name,
              category:   cfg.category,
              mrp:        Number(cfg.mrp),
              cost_price: Number(cfg.cost),
              gst_percent: Number(cfg.gst),
              colour: colour || null,
              size:   size   || null,
              design: design || null,
              stock:  Number(cfg.stock) || 0,
            })
    }
    return rows
  }

  async function importCatalog() {
    const rows = buildCatalogRows()
    if (!rows.length) return showNotif("Select at least one product with variants")
    setImporting(true)
    try {
      const result = await apiFetch("/bangle/products/bulk", {
        method: "POST",
        body: JSON.stringify({ rows }),
      })
      setDone(result)
    } catch (e) {
      showNotif("Import failed: " + e.message)
    }
    setImporting(false)
  }

  // ── CSV helpers ───────────────────────────────────────────
  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const isExcel = /\.(xlsx|xls|xlsm)$/i.test(file.name)
    const reader  = new FileReader()
    if (isExcel) {
      reader.onload = ev => {
        try {
          const wb  = XLSX.read(new Uint8Array(ev.target.result), { type:"array" })
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]])
          const rows = parseRows(csv)
          if (!rows.length) { showNotif("No valid rows found in Excel file"); return }
          setCsvRows(rows)
          showNotif(`✓ Found ${rows.length} rows`)
        } catch { showNotif("Could not read Excel file. Try saving as CSV.") }
      }
      reader.readAsArrayBuffer(file)
    } else {
      reader.onload = ev => {
        const rows = parseRows(ev.target.result)
        if (!rows.length) { showNotif("No valid rows found. Check the format guide below."); return }
        setCsvRows(rows)
        showNotif(`✓ Found ${rows.length} rows`)
      }
      reader.readAsText(file)
    }
  }

  function updateCsvRow(i, field, value) {
    setCsvRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }
  function deleteCsvRow(i) { setCsvRows(prev => prev.filter((_, idx) => idx !== i)) }

  async function importCsv() {
    if (!csvRows.length) return
    setCsvImporting(true)
    try {
      const rows = csvRows.map(r => ({
        name:        r.name,
        category:    r.category || "Bangles",
        mrp:         Number(r.mrp)  || 0,
        cost_price:  Number(r.cost) || 0,
        gst_percent: Number(r.gst)  || 3,
        colour:      r.colour || null,
        size:        r.size   || null,
        design:      r.design || null,
        stock:       Number(r.stock) || 0,
      }))
      const result = await apiFetch("/bangle/products/bulk", {
        method: "POST", body: JSON.stringify({ rows }),
      })
      setDone(result)
    } catch (e) {
      showNotif("Import failed: " + e.message)
    }
    setCsvImporting(false)
  }

  // ── Restock helpers ───────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const matchCat = restockCat === "All" || p.category === restockCat
    const matchQ   = !restockSearch || p.name.toLowerCase().includes(restockSearch.toLowerCase())
    return matchCat && matchQ
  })

  const pendingCount = Object.values(restockChanges).filter(
    v => v !== "" && Number(v) !== 0
  ).length

  async function saveRestock() {
    const items = Object.entries(restockChanges)
      .filter(([, qty]) => qty !== "" && Number(qty) !== 0)
      .map(([variant_id, qty]) => ({ variant_id, qty: Number(qty) }))
    if (!items.length) return
    setRestockSaving(true)
    try {
      const result = await apiFetch("/bangle/variants/bulk-restock", {
        method: "POST", body: JSON.stringify({ items, mode: restockMode }),
      })
      setRestockChanges({})
      showNotif(`✓ ${result.updated} variants restocked`)
      // Refresh
      const updated = await apiFetch("/bangle/products")
      setProducts(updated || [])
    } catch (e) {
      showNotif("Error: " + e.message)
    }
    setRestockSaving(false)
  }

  // ── Done screen ───────────────────────────────────────────
  if (done) {
    return (
      <div className="flex-1 flex items-center justify-center p-6" style={{background:"var(--bg0)"}}>
        <div style={{textAlign:"center", maxWidth:380}}>
          <div style={{fontSize:64, marginBottom:16}}>🎉</div>
          <div style={{fontSize:22, fontWeight:800, color:"var(--ink)", marginBottom:8}}>
            Import Complete!
          </div>
          <div style={{fontSize:13, color:"var(--ink-faint)", marginBottom:24}}>
            {done.products_added} new products · {done.variants_added} variants added
            {done.failed > 0 && ` · ${done.failed} skipped`}
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24}}>
            {[
              {label:"Products",  value:done.products_added, bg:"#E1F5EE", color:"var(--jade)"},
              {label:"Variants",  value:done.variants_added, bg:"#EFF6FF", color:"#3b82f6"},
              {label:"Skipped",   value:done.failed,         bg:"var(--bg2)", color:"var(--ink-faint)"},
            ].map(s => (
              <div key={s.label} style={{background:s.bg, borderRadius:16, padding:16, textAlign:"center"}}>
                <div style={{fontSize:28, fontWeight:800, color:s.color}}>{s.value}</div>
                <div style={{fontSize:11, color:s.color, marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex", gap:10}}>
            <button onClick={() => { setDone(null); setSelected({}); setCsvRows([]) }}
              style={{flex:1, padding:12, background:"var(--bg2)", color:"var(--ink-dim)",
                border:"none", borderRadius:12, fontSize:13, fontWeight:600, cursor:"pointer"}}>
              Import More
            </button>
            <button onClick={() => navigate("/bangle-inventory")}
              style={{flex:1, padding:12,
                background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
                color:"#fff", border:"none", borderRadius:12, fontSize:13,
                fontWeight:600, cursor:"pointer"}}>
              View Inventory →
            </button>
          </div>
        </div>
      </div>
    )
  }

  const selectedCount = Object.keys(selected).length

  return (
    <div className="flex-1 overflow-hidden flex flex-col" style={{background:"var(--bg0)"}}>
      {notif && (
        <div style={{position:"fixed", top:16, right:16, zIndex:100,
          background:"linear-gradient(135deg,#e87722,#ff8e35)", color:"#fff",
          padding:"10px 16px", borderRadius:12, fontSize:12, fontWeight:500,
          boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}}>
          {notif}
        </div>
      )}

      {/* Header */}
      <div style={{background:"var(--bg1)", padding:"0 20px", height:56,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        borderBottom:"1px solid var(--rule)", flexShrink:0}}>
        <div>
          <div style={{fontSize:15, fontWeight:700, color:"var(--ink)"}}>
            💍 Bangle Bulk Import
          </div>
          <div style={{fontSize:11, color:"var(--ink-faint)"}}>
            Add products with variants or restock existing inventory
          </div>
        </div>
        {tab === "catalog" && selectedCount > 0 && (
          <button onClick={importCatalog} disabled={importing}
            style={{background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
              color:"#fff", border:"none", borderRadius:10, padding:"9px 20px",
              fontSize:12, fontWeight:600, cursor:"pointer",
              opacity: importing ? 0.7 : 1}}>
            {importing ? "Importing..." : `✓ Import ${selectedCount} Products`}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{background:"var(--bg1)", borderBottom:"1px solid var(--rule)",
        display:"flex", padding:"0 12px", flexShrink:0, overflowX:"auto"}}>
        {[
          {id:"restock", label:"♻️ Restock Variants",   sub:"Update stock after delivery"},
          {id:"scan",    label:"📸 AI Invoice Scan",    sub:"Photo / PDF → auto stock update"},
          {id:"catalog", label:"💍 Product Catalog",    sub:`${CATALOG.length}+ market products`},
          {id:"csv",     label:"📊 CSV / Excel Import", sub:"Upload your stock file"},
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{padding:"12px 16px 10px", border:"none", background:"none",
              cursor:"pointer", textAlign:"left", marginRight:2, flexShrink:0,
              borderBottom: tab===t.id ? "2px solid var(--saffron)" : "2px solid transparent"}}>
            <div style={{fontSize:11, fontWeight:600,
              color: tab===t.id ? "var(--saffron)" : "var(--ink-dim)"}}>
              {t.label}
            </div>
            <div style={{fontSize:9, color:"var(--ink-faint)", marginTop:1}}>{t.sub}</div>
          </button>
        ))}
      </div>

      {/* ── AI INVOICE SCAN TAB ─────────────────────────────── */}
      {tab === "scan" && (
        <div style={{flex:1, overflowY:"auto"}}>
          <BangleInvoiceScanTab />
        </div>
      )}

      {/* ── RESTOCK TAB ──────────────────────────────────────── */}
      {tab === "restock" && (
        <div style={{flex:1, overflow:"hidden", display:"flex", flexDirection:"column"}}>
          <div style={{background:"var(--bg1)", padding:"12px 20px",
            borderBottom:"1px solid var(--rule)", flexShrink:0}}>
            <div style={{display:"flex", gap:10, alignItems:"center", marginBottom:10}}>
              <input value={restockSearch} onChange={e => setRestockSearch(e.target.value)}
                placeholder="🔍 Search products..."
                style={{flex:1, border:"1.5px solid #e5e7eb", borderRadius:10,
                  padding:"8px 12px", fontSize:12, outline:"none"}}/>
              <div style={{display:"flex", background:"var(--bg2)", borderRadius:10, padding:3, flexShrink:0}}>
                <button onClick={() => setRestockMode("add")}
                  style={{padding:"6px 12px", borderRadius:8, border:"none", fontSize:11,
                    fontWeight:600, cursor:"pointer", whiteSpace:"nowrap",
                    background: restockMode==="add" ? "var(--jade)" : "transparent",
                    color: restockMode==="add" ? "#fff" : "var(--ink-dim)"}}>
                  + Add to stock
                </button>
                <button onClick={() => setRestockMode("set")}
                  style={{padding:"6px 12px", borderRadius:8, border:"none", fontSize:11,
                    fontWeight:600, cursor:"pointer", whiteSpace:"nowrap",
                    background: restockMode==="set" ? "#e87722" : "transparent",
                    color: restockMode==="set" ? "#fff" : "var(--ink-dim)"}}>
                  = Set value
                </button>
              </div>
            </div>
            <div style={{display:"flex", gap:6, overflowX:"auto", paddingBottom:2}}>
              {["All",...CATS].map(c => (
                <button key={c} onClick={() => setRestockCat(c)}
                  style={{padding:"4px 12px", borderRadius:20, border:"none", fontSize:11,
                    fontWeight:500, whiteSpace:"nowrap", cursor:"pointer", flexShrink:0,
                    background: restockCat===c ? "var(--saffron)" : "var(--bg2)",
                    color: restockCat===c ? "#fff" : "var(--ink-dim)"}}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div style={{flex:1, overflowY:"auto", padding:"12px 16px"}}>
            {restockLoading ? (
              <div style={{textAlign:"center", padding:48, color:"var(--ink-faint)", fontSize:13}}>
                Loading inventory...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{textAlign:"center", padding:48, color:"var(--ink-faint)", fontSize:13}}>
                {products.length === 0
                  ? "No products yet. Use Catalog or CSV Import to add products first."
                  : "No products match this filter."}
              </div>
            ) : filteredProducts.map(product => (
              <div key={product.id} style={{background:"var(--bg1)", borderRadius:14,
                marginBottom:10, overflow:"hidden", border:"1px solid var(--rule)"}}>
                {/* Product header */}
                <div style={{padding:"10px 14px", borderBottom:"1px solid var(--rule)",
                  display:"flex", alignItems:"center", gap:10}}>
                  <div style={{width:32, height:32, borderRadius:8, background:"#fbeaef",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:16}}>
                    💍
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13, fontWeight:700, color:"var(--ink)"}}>{product.name}</div>
                    <div style={{fontSize:11, color:"var(--ink-faint)"}}>
                      {product.category} · {product.variant_count} variants · {product.total_stock} pcs
                    </div>
                  </div>
                  <div style={{fontSize:12, fontWeight:700, color:"var(--saffron)"}}>
                    {INR(product.mrp)}
                  </div>
                </div>
                {/* Variant rows */}
                <div style={{padding:"8px 14px", display:"flex", flexDirection:"column", gap:6}}>
                  {(product.variants || []).length === 0 ? (
                    <div style={{fontSize:11, color:"var(--ink-faint)", textAlign:"center", padding:8}}>
                      No variants — add from Inventory
                    </div>
                  ) : (product.variants || []).map(v => {
                    const qty     = restockChanges[v.id] ?? ""
                    const hasQty  = qty !== "" && Number(qty) !== 0
                    const isLow   = v.stock < v.min_stock
                    const newStock = restockMode === "add"
                      ? v.stock + (Number(qty) || 0)
                      : Number(qty) || 0
                    return (
                      <div key={v.id} style={{
                        display:"flex", alignItems:"center", gap:8, padding:"6px 10px",
                        borderRadius:10, fontSize:12,
                        border: hasQty ? "1.5px solid var(--jade)" : "1px solid var(--rule)",
                        background: hasQty ? "#f0faf6" : v.stock===0?"#fef2f2":isLow?"#fffbeb":"#f8faf8",
                      }}>
                        <div style={{flex:1, display:"flex", flexWrap:"wrap", gap:4}}>
                          {v.colour && <span style={{background:"#e8f4f0", color:"var(--jade)",
                            padding:"1px 7px", borderRadius:10, fontSize:10, fontWeight:600}}>
                            {v.colour}</span>}
                          {v.size && <span style={{background:"#eef2fe", color:"#4f46e5",
                            padding:"1px 7px", borderRadius:10, fontSize:10, fontWeight:600}}>
                            {v.size}</span>}
                          {v.design && <span style={{background:"#fdf4ff", color:"#9333ea",
                            padding:"1px 7px", borderRadius:10, fontSize:10, fontWeight:600}}>
                            {v.design}</span>}
                          {!v.colour && !v.size && !v.design &&
                            <span style={{color:"var(--ink-faint)", fontSize:11}}>Default</span>}
                        </div>
                        <div style={{fontSize:11, fontWeight:700,
                          color: v.stock===0?"#dc2626":isLow?"#d97706":"var(--jade)",
                          minWidth:40, textAlign:"right"}}>
                          {v.stock}
                          {hasQty && <span style={{color:"var(--jade)"}}>→{newStock}</span>}
                        </div>
                        <input type="number" min="0"
                          value={qty}
                          onChange={e => setRestockChanges(prev => ({...prev, [v.id]: e.target.value}))}
                          placeholder="0"
                          style={{width:64, border:"1.5px solid var(--rule)", borderRadius:8,
                            padding:"4px 6px", fontSize:12, fontWeight:600,
                            outline:"none", textAlign:"center", background:"white",
                            borderColor: hasQty ? "var(--jade)" : "var(--rule)",
                            color: hasQty ? "var(--jade)" : "var(--ink)"}}/>
                        <span style={{fontSize:10, color:"var(--ink-faint)", width:18}}>pcs</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {pendingCount > 0 && (
            <div style={{background:"var(--bg1)", borderTop:"1px solid var(--rule)",
              padding:"14px 20px", display:"flex", alignItems:"center",
              justifyContent:"space-between", flexShrink:0,
              boxShadow:"0 -4px 20px rgba(0,0,0,0.06)"}}>
              <div>
                <div style={{fontSize:13, fontWeight:600, color:"var(--ink)"}}>
                  {pendingCount} variants to update
                </div>
                <div style={{fontSize:11, color:"var(--ink-faint)"}}>
                  Mode: {restockMode === "add" ? "Adding to current stock" : "Setting new value"}
                </div>
              </div>
              <div style={{display:"flex", gap:8}}>
                <button onClick={() => setRestockChanges({})}
                  style={{background:"var(--bg2)", color:"var(--ink-dim)", border:"none",
                    borderRadius:9, padding:"8px 16px", fontSize:12, fontWeight:600, cursor:"pointer"}}>
                  Clear
                </button>
                <button onClick={saveRestock} disabled={restockSaving}
                  style={{background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
                    color:"#fff", border:"none", borderRadius:12,
                    padding:"12px 28px", fontSize:13, fontWeight:700,
                    cursor:"pointer", opacity: restockSaving ? 0.7 : 1}}>
                  {restockSaving ? "Saving..." : `Save Restock (${pendingCount})`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CATALOG TAB ──────────────────────────────────────── */}
      {tab === "catalog" && (
        <div style={{flex:1, overflow:"hidden", display:"flex", flexDirection:"column"}}>
          <div style={{background:"var(--bg1)", padding:"10px 20px",
            borderBottom:"1px solid var(--rule)", flexShrink:0}}>
            <div style={{display:"flex", gap:10, alignItems:"center", marginBottom:8}}>
              <input value={catSearch} onChange={e => setCatSearch(e.target.value)}
                placeholder="🔍 Search products..."
                style={{flex:1, border:"1.5px solid #e5e7eb", borderRadius:10,
                  padding:"7px 12px", fontSize:12, outline:"none"}}/>
            </div>
            {/* Grouped category filter */}
            <div ref={catFilterRef} style={{display:"flex", gap:6, alignItems:"center", flexWrap:"wrap"}}>
              <button onClick={()=>{setCatFilter("All");setOpenGroup(null)}}
                style={{padding:"5px 14px",borderRadius:20,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",
                  background:catFilter==="All"?"var(--saffron)":"var(--bg2)",
                  color:catFilter==="All"?"#fff":"var(--ink-dim)"}}>
                All
              </button>
              {Object.entries(CAT_GROUPS).map(([group, cats]) => {
                const activeInGroup = cats.includes(catFilter)
                const isOpen = openGroup === group
                return (
                  <div key={group} style={{position:"relative"}}>
                    <button
                      onClick={() => setOpenGroup(isOpen ? null : group)}
                      style={{
                        display:"flex",alignItems:"center",gap:4,
                        padding:"5px 12px",borderRadius:20,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",
                        background: activeInGroup ? "var(--saffron)" : isOpen ? "var(--bg3,#e5e7eb)" : "var(--bg2)",
                        color: activeInGroup ? "#fff" : "var(--ink-dim)",
                        boxShadow: isOpen ? "0 0 0 2px var(--saffron)" : "none",
                      }}>
                      <span>{CAT_GROUP_ICONS[group]}</span>
                      <span>{activeInGroup ? catFilter : group}</span>
                      <span style={{fontSize:9,opacity:0.7,marginLeft:1}}>▾</span>
                    </button>
                    {isOpen && (
                      <div style={{
                        position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:200,
                        background:"#fff",borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,0.15)",
                        border:"1px solid var(--rule)",padding:"6px",minWidth:160,
                      }}>
                        {cats.map(c => (
                          <button key={c} onClick={()=>{setCatFilter(c);setOpenGroup(null)}}
                            style={{
                              display:"block",width:"100%",textAlign:"left",
                              padding:"7px 12px",borderRadius:8,border:"none",
                              fontSize:12,fontWeight:catFilter===c?700:400,cursor:"pointer",
                              background:catFilter===c?"#fff8f0":"transparent",
                              color:catFilter===c?"var(--saffron)":"var(--ink)",
                            }}>
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              <button onClick={()=>{setCatFilter("Other");setOpenGroup(null)}}
                style={{padding:"5px 14px",borderRadius:20,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",
                  background:catFilter==="Other"?"var(--saffron)":"var(--bg2)",
                  color:catFilter==="Other"?"#fff":"var(--ink-dim)"}}>
                Other
              </button>
            </div>
          </div>

          <div style={{flex:1, overflowY:"auto", padding:"12px 16px"}}>
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:10}}>
              {filteredCatalog.map(p => {
                const sel = selected[p.name]
                return (
                  <div key={p.name} style={{
                    background:"var(--bg1)", borderRadius:14, padding:14,
                    border: sel ? "2px solid var(--saffron)" : "1.5px solid var(--rule)",
                    boxShadow: sel ? "0 2px 16px rgba(232,119,34,0.12)" : "0 1px 4px rgba(0,0,0,0.04)",
                  }}>
                    {/* Product header row */}
                    <div style={{display:"flex", alignItems:"center", gap:10, cursor:"pointer",
                      marginBottom: sel ? 12 : 0}}
                      onClick={() => toggleProduct(p)}>
                      <div style={{
                        width:20, height:20, borderRadius:6, flexShrink:0,
                        background: sel ? "var(--saffron)" : "var(--bg2)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}>
                        {sel && <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13, fontWeight:600, color:"var(--ink)"}}>{p.name}</div>
                        <div style={{fontSize:10, color:"var(--ink-faint)"}}>
                          {p.category} · GST {p.gst}%
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:13, fontWeight:700, color:"var(--saffron)"}}>{INR(p.mrp)}</div>
                        <div style={{fontSize:10, color:"var(--ink-faint)"}}>Cost: {INR(p.cost)}</div>
                      </div>
                    </div>

                    {/* Variant config — shown when selected */}
                    {sel && (
                      <div style={{borderTop:"1px solid var(--rule)", paddingTop:12,
                        display:"flex", flexDirection:"column", gap:10}}
                        onClick={e => e.stopPropagation()}>

                        {BEAUTY_CATS.has(p.category) ? (
                          /* Beauty — shade variants for nail polish/lipstick; size variants for personal care; stock for rest */
                          <>
                            {BEAUTY_SHADE_CATS.has(p.category) && (
                              <div>
                                <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)",
                                  marginBottom:6, letterSpacing:"0.5px"}}>SHADES</div>
                                <div style={{display:"flex", flexWrap:"wrap", gap:5}}>
                                  {BEAUTY_SHADES[p.category].map(c => (
                                    <Chip key={c} label={c}
                                      active={sel.colours.includes(c)}
                                      onClick={() => toggleChip(p.name, "colours", c)}/>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div>
                              <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)",
                                marginBottom:6, letterSpacing:"0.5px"}}>
                                {SIZE_LABEL[p.category] || "SIZE / TYPE"}
                              </div>
                              <div style={{display:"flex", flexWrap:"wrap", gap:5}}>
                                {(CATEGORY_SIZES[p.category] || []).map(s => (
                                  <Chip key={s} label={s}
                                    active={sel.sizes.includes(s)}
                                    onClick={() => toggleChip(p.name, "sizes", s)}/>
                                ))}
                              </div>
                            </div>
                            <div style={{display:"flex", gap:10, alignItems:"center"}}>
                              <div style={{flex:1}}>
                                <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)",
                                  marginBottom:4, letterSpacing:"0.5px"}}>STOCK PER VARIANT</div>
                                <input type="number" min="0" value={sel.stock}
                                  onChange={e => updateSel(p.name, "stock", e.target.value)}
                                  style={{width:"100%", border:"1.5px solid var(--saffron)", borderRadius:9,
                                    padding:"6px 10px", fontSize:13, fontWeight:700, outline:"none",
                                    color:"var(--saffron)", textAlign:"center"}}/>
                              </div>
                              <div style={{fontSize:11, color:"var(--ink-faint)", marginTop:16}}>
                                ×{Math.max(1,sel.colours.length||1) * Math.max(1,sel.sizes.length||1)}{" "}
                                = {sel.stock * Math.max(1,sel.colours.length||1) * Math.max(1,sel.sizes.length||1)} pcs
                              </div>
                            </div>
                          </>
                        ) : (
                          /* Jewellery — colours + sizes + designs */
                          <>
                            <div>
                              <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)",
                                marginBottom:6, letterSpacing:"0.5px"}}>COLOURS</div>
                              <div style={{display:"flex", flexWrap:"wrap", gap:5}}>
                                {COLOURS.map(c => (
                                  <Chip key={c} label={c}
                                    active={sel.colours.includes(c)}
                                    onClick={() => toggleChip(p.name, "colours", c)}/>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)",
                                marginBottom:6, letterSpacing:"0.5px"}}>
                                {SIZE_LABEL[p.category] || "SIZE"}
                              </div>
                              <div style={{display:"flex", flexWrap:"wrap", gap:5}}>
                                {(CATEGORY_SIZES[p.category] || CATEGORY_SIZES["Other"]).map(s => (
                                  <Chip key={s} label={s}
                                    active={sel.sizes.includes(s)}
                                    onClick={() => toggleChip(p.name, "sizes", s)}/>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)",
                                marginBottom:6, letterSpacing:"0.5px"}}>DESIGN (optional)</div>
                              <div style={{display:"flex", flexWrap:"wrap", gap:5}}>
                                {(CATEGORY_DESIGNS[p.category] || CATEGORY_DESIGNS["Other"]).map(d => (
                                  <Chip key={d} label={d}
                                    active={sel.designs.includes(d)}
                                    onClick={() => toggleChip(p.name, "designs", d)}/>
                                ))}
                              </div>
                            </div>

                            <div style={{display:"flex", gap:10, alignItems:"center"}}>
                              <div style={{flex:1}}>
                                <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)",
                                  marginBottom:4, letterSpacing:"0.5px"}}>STOCK PER VARIANT</div>
                                <input type="number" min="0" value={sel.stock}
                                  onChange={e => updateSel(p.name, "stock", e.target.value)}
                                  style={{width:"100%", border:"1.5px solid var(--saffron)", borderRadius:9,
                                    padding:"6px 10px", fontSize:13, fontWeight:700, outline:"none",
                                    color:"var(--saffron)", textAlign:"center"}}/>
                              </div>
                              <div style={{fontSize:11, color:"var(--ink-faint)", marginTop:16}}>
                                ×{Math.max(1,sel.colours.length||1) * Math.max(1,sel.sizes.length||1) * Math.max(1,sel.designs.length||1)}{" "}
                                = {sel.stock * Math.max(1,sel.colours.length||1) * Math.max(1,sel.sizes.length||1) * Math.max(1,sel.designs.length||1)} pcs
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {selectedCount > 0 && (
            <div style={{background:"var(--bg1)", borderTop:"1px solid var(--rule)",
              padding:"14px 20px", display:"flex", alignItems:"center",
              justifyContent:"space-between", flexShrink:0,
              boxShadow:"0 -4px 20px rgba(0,0,0,0.06)"}}>
              <div>
                <div style={{fontSize:13, fontWeight:600, color:"var(--ink)"}}>
                  {selectedCount} products · {buildCatalogRows().length} variants to create
                </div>
                <div style={{fontSize:11, color:"var(--ink-faint)"}}>Prices editable in Inventory after import</div>
              </div>
              <button onClick={importCatalog} disabled={importing}
                style={{background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
                  color:"#fff", border:"none", borderRadius:12,
                  padding:"12px 28px", fontSize:13, fontWeight:700,
                  cursor:"pointer", opacity: importing ? 0.7 : 1}}>
                {importing ? "Creating..." : `✓ Import ${selectedCount} Products`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CSV / EXCEL TAB ───────────────────────────────────── */}
      {tab === "csv" && (
        <div style={{flex:1, overflowY:"auto", padding:20}}>
          {csvRows.length === 0 ? (
            <div>
              {/* Upload area */}
              <div onClick={() => fileRef.current.click()}
                style={{border:"2px dashed #fde68a", borderRadius:20,
                  padding:"48px 24px", textAlign:"center", cursor:"pointer",
                  background:"#fffbeb", marginBottom:20}}
                onMouseEnter={e => e.currentTarget.style.borderColor="var(--saffron)"}
                onMouseLeave={e => e.currentTarget.style.borderColor="#fde68a"}>
                <div style={{fontSize:48, marginBottom:12}}>📊</div>
                <div style={{fontSize:16, fontWeight:700, color:"var(--saffron)", marginBottom:6}}>
                  Upload your stock file
                </div>
                <div style={{fontSize:12, color:"var(--ink-faint)", marginBottom:16}}>
                  CSV (.csv) or Excel (.xlsx, .xls) — one row per product-variant
                </div>
                <div style={{background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
                  color:"#fff", borderRadius:10, padding:"10px 24px",
                  fontSize:12, fontWeight:600, display:"inline-block"}}>
                  Choose File
                </div>
                <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls,.xlsm"
                  style={{display:"none"}} onChange={handleFile}/>
              </div>

              {/* Format guide */}
              <div style={{background:"var(--bg1)", borderRadius:16, padding:20,
                border:"1px solid var(--rule)", marginBottom:16}}>
                <div style={{fontSize:13, fontWeight:700, color:"var(--ink)", marginBottom:12}}>
                  📋 CSV Format (one row = one variant)
                </div>
                <div style={{background:"#1e293b", borderRadius:10, padding:14,
                  fontFamily:"monospace", fontSize:11, overflowX:"auto", marginBottom:12}}>
                  <div style={{color:"#7DD3FC"}}>name,category,mrp,cost,gst,colour,size,design,stock</div>
                  <div style={{color:"#86EFAC"}}>Kundan Bangle Set,Bangles,150,90,3,Red,2.4,Kundan,24</div>
                  <div style={{color:"#86EFAC"}}>Kundan Bangle Set,Bangles,150,90,3,Blue,2.6,Kundan,12</div>
                  <div style={{color:"#86EFAC"}}>Glass Bangles,Bangles,60,35,3,Pink,2.8,,36</div>
                  <div style={{color:"#86EFAC"}}>Bindi Pack,Bindi,20,12,0,,,, 100</div>
                </div>
                <div style={{fontSize:11, color:"var(--ink-faint)"}}>
                  ✓ Rows with the same <b>name</b> share one product — each row becomes one variant<br/>
                  ✓ colour, size, design are optional — leave blank for products without variants<br/>
                  ✓ Excel (.xlsx) files supported — no conversion needed
                </div>
              </div>

              {/* Download template */}
              <button onClick={() => {
                const csv = "name,category,mrp,cost,gst,colour,size,design,stock\n" +
                  "Kundan Bangle Set,Bangles,150,90,3,Red,2.4,Kundan,24\n" +
                  "Kundan Bangle Set,Bangles,150,90,3,Blue,2.6,Kundan,12\n" +
                  "Glass Bangles,Bangles,60,35,3,Pink,2.8,,36\n" +
                  "Bindi Pack,Bindi,20,12,0,,,,100\n"
                const a = document.createElement("a")
                a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"}))
                a.download = "bangle_import_template.csv"; a.click()
              }}
                style={{background:"var(--bg1)", color:"var(--saffron)",
                  border:"1.5px solid var(--saffron)", borderRadius:10,
                  padding:"10px 20px", fontSize:12, fontWeight:600,
                  cursor:"pointer", display:"flex", alignItems:"center", gap:8}}>
                ⬇ Download Template CSV
              </button>
            </div>
          ) : (
            <div>
              <div style={{display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:14}}>
                <div>
                  <div style={{fontSize:14, fontWeight:700, color:"var(--ink)"}}>
                    {csvRows.length} rows ready to import
                  </div>
                  <div style={{fontSize:11, color:"var(--ink-faint)", marginTop:2}}>
                    Edit any cell · ✕ to remove · then Import
                  </div>
                </div>
                <div style={{display:"flex", gap:8}}>
                  <button onClick={() => { setCsvRows([]); if(fileRef.current) fileRef.current.value="" }}
                    style={{background:"var(--bg2)", color:"var(--ink-dim)", border:"none",
                      borderRadius:9, padding:"8px 16px", fontSize:12, fontWeight:600, cursor:"pointer"}}>
                    Cancel
                  </button>
                  <button onClick={importCsv} disabled={csvImporting}
                    style={{background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
                      color:"#fff", border:"none", borderRadius:10,
                      padding:"9px 20px", fontSize:12, fontWeight:600,
                      cursor:"pointer", opacity: csvImporting ? 0.6 : 1}}>
                    {csvImporting ? "Importing..." : `Import ${csvRows.length} Rows`}
                  </button>
                </div>
              </div>

              <div style={{background:"var(--bg1)", borderRadius:16, overflow:"hidden",
                border:"1px solid var(--rule)"}}>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%", borderCollapse:"collapse", minWidth:820}}>
                    <thead>
                      <tr style={{background:"var(--bg0)"}}>
                        {["Product Name","Category","MRP","Cost","GST%","Colour","Size","Design","Stock",""].map(h => (
                          <th key={h} style={{padding:"8px 10px", textAlign:"left",
                            fontSize:10, fontWeight:700, color:"var(--ink-faint)",
                            textTransform:"uppercase", letterSpacing:"0.5px",
                            borderBottom:"1px solid var(--rule)", whiteSpace:"nowrap"}}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.map((r, i) => (
                        <tr key={i} style={{borderBottom:"1px solid #f5f7f5"}}>
                          <td style={{padding:"4px 8px", minWidth:160}}>
                            <input value={r.name||""} onChange={e=>updateCsvRow(i,"name",e.target.value)}
                              style={{width:"100%",border:"1px solid var(--rule)",borderRadius:6,
                                padding:"3px 6px",fontSize:11,outline:"none",background:"white"}}/>
                          </td>
                          <td style={{padding:"4px 8px"}}>
                            <select value={r.category||"Bangles"} onChange={e=>updateCsvRow(i,"category",e.target.value)}
                              style={{border:"1px solid var(--rule)",borderRadius:6,
                                padding:"3px 5px",fontSize:11,outline:"none",background:"white",width:90}}>
                              {CATS.map(c=><option key={c}>{c}</option>)}
                            </select>
                          </td>
                          <td style={{padding:"4px 8px"}}>
                            <input type="number" min="0" value={r.mrp??""} onChange={e=>updateCsvRow(i,"mrp",e.target.value)}
                              style={{width:60,border:"1px solid var(--rule)",borderRadius:6,
                                padding:"3px 6px",fontSize:11,outline:"none",background:"white",textAlign:"right"}}/>
                          </td>
                          <td style={{padding:"4px 8px"}}>
                            <input type="number" min="0" value={r.cost??""} onChange={e=>updateCsvRow(i,"cost",e.target.value)}
                              style={{width:60,border:"1px solid var(--rule)",borderRadius:6,
                                padding:"3px 6px",fontSize:11,outline:"none",background:"white",textAlign:"right"}}/>
                          </td>
                          <td style={{padding:"4px 8px"}}>
                            <select value={r.gst??3} onChange={e=>updateCsvRow(i,"gst",e.target.value)}
                              style={{border:"1px solid var(--rule)",borderRadius:6,
                                padding:"3px 5px",fontSize:11,outline:"none",background:"white",width:50}}>
                              {GSTS.map(g=><option key={g} value={g}>{g}%</option>)}
                            </select>
                          </td>
                          <td style={{padding:"4px 8px"}}>
                            <input value={r.colour||""} onChange={e=>updateCsvRow(i,"colour",e.target.value)}
                              style={{width:70,border:"1px solid var(--rule)",borderRadius:6,
                                padding:"3px 6px",fontSize:11,outline:"none",background:"white"}}/>
                          </td>
                          <td style={{padding:"4px 8px"}}>
                            <input value={r.size||""} onChange={e=>updateCsvRow(i,"size",e.target.value)}
                              style={{width:52,border:"1px solid var(--rule)",borderRadius:6,
                                padding:"3px 6px",fontSize:11,outline:"none",background:"white"}}/>
                          </td>
                          <td style={{padding:"4px 8px"}}>
                            <input value={r.design||""} onChange={e=>updateCsvRow(i,"design",e.target.value)}
                              style={{width:80,border:"1px solid var(--rule)",borderRadius:6,
                                padding:"3px 6px",fontSize:11,outline:"none",background:"white"}}/>
                          </td>
                          <td style={{padding:"4px 8px"}}>
                            <input type="number" min="0" value={r.stock??""} onChange={e=>updateCsvRow(i,"stock",e.target.value)}
                              style={{width:56,border:"1px solid var(--rule)",borderRadius:6,
                                padding:"3px 6px",fontSize:11,outline:"none",background:"white",textAlign:"right"}}/>
                          </td>
                          <td style={{padding:"4px 6px",textAlign:"center"}}>
                            <button onClick={() => deleteCsvRow(i)}
                              style={{background:"none",border:"none",cursor:"pointer",
                                color:"#dc2626",fontSize:14,padding:"2px 6px",borderRadius:6}}>
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
