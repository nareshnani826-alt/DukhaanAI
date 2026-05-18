import { useState, useRef } from "react"
import { Products } from "../sync/db.js"
import { CATALOG, CATEGORIES, getCatalogByCategory } from "../data/productCatalog.js"

const INR = n => "₹" + (n||0).toLocaleString("en-IN")

// Parse CSV/Excel-like text
function parseCSV(text) {
  const lines  = text.trim().split("\n").filter(l => l.trim())
  const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g,""))
  const results = []

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map(v => v.trim().replace(/"/g,""))
    const row  = {}
    header.forEach((h, idx) => row[h] = vals[idx] || "")

    const name = row.name || row.product || row["product name"] || row["item"] || ""
    if (!name) continue

    results.push({
      name,
      category: row.category || row.type || "Other",
      unit:     row.unit || "pc",
      mrp:      parseFloat(row.mrp || row.price || row["selling price"] || 0) || 0,
      cost:     parseFloat(row.cost || row["cost price"] || row["purchase price"] || 0) || 0,
      stock:    parseFloat(row.stock || row.qty || row.quantity || 0) || 0,
      gst:      parseFloat(row.gst || row["gst%"] || 0) || 0,
    })
  }
  return results
}

export default function BulkImport() {
  const [tab,        setTab]        = useState("catalog") // catalog | excel
  const [category,   setCategory]   = useState("All")
  const [search,     setSearch]     = useState("")
  const [selected,   setSelected]   = useState(new Set())
  const [csvData,    setCsvData]    = useState([])
  const [importing,  setImporting]  = useState(false)
  const [done,       setDone]       = useState(null)
  const [notif,      setNotif]      = useState("")
  const [step,       setStep]       = useState(1) // 1=select, 2=preview, 3=done
  const fileRef = useRef()

  function showNotif(m) { setNotif(m); setTimeout(() => setNotif(""), 3000) }

  // ── Catalog tab ───────────────────────────────────────
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
    setSelected(s => {
      const n = new Set(s)
      filtered.forEach(p => n.add(p.name))
      return n
    })
  }

  function clearAll() { setSelected(new Set()) }

  // ── Excel tab ─────────────────────────────────────────
  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target.result
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        showNotif("No valid products found. Check your CSV format.")
        return
      }
      setCsvData(parsed)
      showNotif(`✓ Found ${parsed.length} products`)
    }
    reader.readAsText(file)
  }

  // ── Import ─────────────────────────────────────────────
  async function importProducts() {
    const items = tab === "catalog"
      ? CATALOG.filter(p => selected.has(p.name))
      : csvData

    if (items.length === 0) return showNotif("Select at least one product")

    setImporting(true)
    let added = 0, updated = 0, failed = 0

    // Fetch existing products once to check duplicates
    const existing = await Products.list()

    for (const item of items) {
      try {
        // Check if product with same name already exists (case-insensitive)
        const duplicate = existing.find(p =>
          p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
        )

        if (duplicate) {
          // Product exists — update stock quantity instead of creating duplicate
          const newStock = (duplicate.stock || 0) + (item.stock || 0)
          await Products.update(duplicate.id, {
            stock:       newStock,
            // Also update price if new price provided
            mrp:         item.mrp      || duplicate.mrp,
            cost_price:  item.cost     || duplicate.cost_price,
          })
          updated++
        } else {
          // New product — add it
          await Products.add({
            name:        item.name,
            category:    item.category || "Other",
            unit:        item.unit     || "pc",
            mrp:         item.mrp      || 0,
            cost_price:  item.cost     || 0,
            stock:       item.stock    || 0,
            min_stock:   5,
            gst_percent: item.gst      || 0,
          })
          added++
        }
      } catch { failed++ }
    }

    setDone({ added, updated, failed, total: items.length })
    setStep(3)
    setImporting(false)
  }

  if (step === 3 && done) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center" style={{ background:"#f8faf8" }}>
        <div style={{ textAlign:"center", maxWidth:380 }}>
          <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
          <div style={{ fontSize:22, fontWeight:800, color:"#1a1a1a", marginBottom:8 }}>
            Import Complete!
          </div>
          <div style={{ fontSize:14, color:"#94a3b8", marginBottom:24 }}>
            {done.added} new · {done.updated} stock updated
            {done.failed > 0 && ` · ${done.failed} skipped`}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
            <div style={{ background:"#E1F5EE", borderRadius:16, padding:16, textAlign:"center" }}>
              <div style={{ fontSize:28, fontWeight:800, color:"#0F6E56" }}>{done.added}</div>
              <div style={{ fontSize:11, color:"#1D9E75", marginTop:2 }}>New Products</div>
            </div>
            <div style={{ background:"#EFF6FF", borderRadius:16, padding:16, textAlign:"center" }}>
              <div style={{ fontSize:28, fontWeight:800, color:"#378ADD" }}>{done.updated}</div>
              <div style={{ fontSize:11, color:"#378ADD", marginTop:2 }}>Stock Updated</div>
            </div>
            <div style={{ background:"#f5f5f5", borderRadius:16, padding:16, textAlign:"center" }}>
              <div style={{ fontSize:28, fontWeight:800, color:"#94a3b8" }}>{done.failed}</div>
              <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>Skipped</div>
            </div>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => { setStep(1); setSelected(new Set()); setCsvData([]); setDone(null) }}
              style={{ flex:1, padding:"12px", background:"#f5f5f5", color:"#555",
                border:"none", borderRadius:12, fontSize:13, fontWeight:600, cursor:"pointer" }}>
              Import More
            </button>
            <button onClick={() => window.location.href="/inventory"}
              style={{ flex:1, padding:"12px",
                background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
                color:"#fff", border:"none", borderRadius:12, fontSize:13,
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
    <div className="flex-1 overflow-hidden flex flex-col" style={{ background:"#f8faf8" }}>
      {notif && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:100,
          background:"#1D9E75", color:"#fff", padding:"10px 16px",
          borderRadius:12, fontSize:12, fontWeight:500,
          boxShadow:"0 4px 20px rgba(0,0,0,0.15)" }}>
          {notif}
        </div>
      )}

      {/* Header */}
      <div style={{ background:"#fff", padding:"0 24px", height:56,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        borderBottom:"1px solid #eef2ee", flexShrink:0 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a1a1a" }}>
            📦 Bulk Import Products
          </div>
          <div style={{ fontSize:11, color:"#94a3b8" }}>
            Add 200+ products in seconds — no manual typing needed
          </div>
        </div>
        {selectedItems.length > 0 && (
          <button onClick={importProducts} disabled={importing}
            style={{ background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
              color:"#fff", border:"none", borderRadius:10, padding:"9px 20px",
              fontSize:12, fontWeight:600, cursor:"pointer",
              opacity: importing ? 0.7 : 1 }}>
            {importing ? `Adding ${selectedItems.length}...` : `✓ Add ${selectedItems.length} Products`}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ background:"#fff", borderBottom:"1px solid #eef2ee",
        display:"flex", padding:"0 24px", flexShrink:0 }}>
        {[
          { id:"catalog", label:"📋 Product Catalog", sub:"200+ Indian grocery products" },
          { id:"excel",   label:"📊 Import from Excel/CSV", sub:"Upload your existing price list" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:"12px 20px 10px", border:"none", background:"none",
              cursor:"pointer", textAlign:"left", marginRight:4,
              borderBottom: tab===t.id ? "2px solid #1D9E75" : "2px solid transparent" }}>
            <div style={{ fontSize:12, fontWeight:600,
              color: tab===t.id ? "#0F6E56" : "#555" }}>
              {t.label}
            </div>
            <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{t.sub}</div>
          </button>
        ))}
      </div>

      {/* ── Catalog Tab ────────────────────────────────── */}
      {tab === "catalog" && (
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          {/* Filters */}
          <div style={{ background:"#fff", padding:"12px 24px",
            borderBottom:"1px solid #eef2ee", flexShrink:0 }}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Search products..."
                style={{ flex:1, border:"1.5px solid #e5e7eb", borderRadius:10,
                  padding:"8px 14px", fontSize:12, outline:"none" }}/>
              <button onClick={selectAll}
                style={{ background:"#E1F5EE", color:"#0F6E56", border:"none",
                  borderRadius:9, padding:"8px 14px", fontSize:11,
                  fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
                Select All
              </button>
              <button onClick={clearAll}
                style={{ background:"#f5f5f5", color:"#666", border:"none",
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
                    background: category===cat ? "#1D9E75" : "#f5f5f5",
                    color: category===cat ? "#fff" : "#555",
                    flexShrink:0 }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div style={{ flex:1, overflowY:"auto", padding:20 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
              {filtered.map(p => {
                const sel = selected.has(p.name)
                return (
                  <div key={p.name} onClick={() => toggleSelect(p.name)}
                    style={{
                      background:"#fff", borderRadius:14, padding:14,
                      border: sel ? "2px solid #1D9E75" : "1.5px solid #eef2ee",
                      cursor:"pointer", transition:"all 0.15s", position:"relative",
                      boxShadow: sel ? "0 2px 16px rgba(29,158,117,0.15)" : "0 1px 4px rgba(0,0,0,0.04)",
                    }}>
                    {/* Checkbox */}
                    <div style={{
                      position:"absolute", top:10, right:10,
                      width:20, height:20, borderRadius:6,
                      background: sel ? "#1D9E75" : "#f0f0f0",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      {sel && <svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>

                    <div style={{ fontSize:12, fontWeight:600, color:"#1a1a1a",
                      marginBottom:4, paddingRight:28, lineHeight:1.4 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize:10, color:"#94a3b8", marginBottom:8 }}>
                      {p.category} · {p.unit}
                      {p.gst > 0 && ` · GST ${p.gst}%`}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#0F6E56" }}>
                          {INR(p.mrp)}
                        </div>
                        <div style={{ fontSize:10, color:"#94a3b8" }}>
                          Cost: {INR(p.cost)}
                        </div>
                      </div>
                      <div style={{ fontSize:10, fontWeight:600,
                        background:"#f0faf6", color:"#1D9E75",
                        padding:"3px 8px", borderRadius:8 }}>
                        {Math.round((p.mrp-p.cost)/p.mrp*100)}% margin
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom bar */}
          {selected.size > 0 && (
            <div style={{ background:"#fff", borderTop:"1px solid #eef2ee",
              padding:"14px 24px", display:"flex", alignItems:"center",
              justifyContent:"space-between", flexShrink:0,
              boxShadow:"0 -4px 20px rgba(0,0,0,0.06)" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#333" }}>
                  {selected.size} products selected
                </div>
                <div style={{ fontSize:11, color:"#94a3b8" }}>
                  All prices editable after import
                </div>
              </div>
              <button onClick={importProducts} disabled={importing}
                style={{ background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
                  color:"#fff", border:"none", borderRadius:12,
                  padding:"12px 28px", fontSize:13, fontWeight:700,
                  cursor:"pointer", opacity: importing ? 0.7 : 1 }}>
                {importing ? "Adding products..." : `✓ Add ${selected.size} Products to Inventory`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Excel Tab ──────────────────────────────────── */}
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
                onMouseEnter={e => e.currentTarget.style.borderColor="#1D9E75"}
                onMouseLeave={e => e.currentTarget.style.borderColor="#d1fae5"}>
                <div style={{ fontSize:48, marginBottom:12 }}>📊</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#0F6E56", marginBottom:6 }}>
                  Upload your price list
                </div>
                <div style={{ fontSize:12, color:"#94a3b8", marginBottom:16 }}>
                  Supports CSV files (.csv) · Excel files (.xlsx coming soon)
                </div>
                <div style={{ background:"#1D9E75", color:"#fff", border:"none",
                  borderRadius:10, padding:"10px 24px", fontSize:12,
                  fontWeight:600, display:"inline-block" }}>
                  Choose File
                </div>
                <input ref={fileRef} type="file" accept=".csv,.txt"
                  style={{ display:"none" }} onChange={handleFile}/>
              </div>

              {/* CSV format guide */}
              <div style={{ background:"#fff", borderRadius:16, padding:20,
                border:"1px solid #eef2ee", marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#333", marginBottom:12 }}>
                  📋 CSV Format Guide
                </div>
                <div style={{ fontSize:11, color:"#94a3b8", marginBottom:10 }}>
                  Your CSV file should have these columns (column names are flexible):
                </div>
                <div style={{ background:"#1e293b", borderRadius:10, padding:14,
                  fontFamily:"monospace", fontSize:11, color:"#94a3b8",
                  overflowX:"auto", marginBottom:12 }}>
                  <div style={{ color:"#7DD3FC" }}>name, category, unit, mrp, cost, stock, gst</div>
                  <div style={{ color:"#86EFAC" }}>Amul Milk 500ml, Dairy, pc, 28, 25, 50, 0</div>
                  <div style={{ color:"#86EFAC" }}>Tata Salt 1kg, Staples, kg, 24, 21, 100, 0</div>
                  <div style={{ color:"#86EFAC" }}>Fortune Oil 1L, Oils, pc, 135, 122, 30, 5</div>
                </div>
                <div style={{ fontSize:11, color:"#94a3b8" }}>
                  ✓ Only <b>name</b> is required — all other columns are optional<br/>
                  ✓ Column names can be in any order<br/>
                  ✓ You can also use: "product name", "price", "selling price", "purchase price"
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
                style={{ background:"#fff", color:"#0F6E56",
                  border:"1.5px solid #1D9E75", borderRadius:10,
                  padding:"10px 20px", fontSize:12, fontWeight:600,
                  cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                ⬇ Download Template CSV
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#1a1a1a" }}>
                    ✓ {csvData.length} products ready to import
                  </div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>
                    Review below then click Import
                  </div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => { setCsvData([]); fileRef.current.value="" }}
                    style={{ background:"#f5f5f5", color:"#666", border:"none",
                      borderRadius:9, padding:"8px 14px", fontSize:11,
                      fontWeight:600, cursor:"pointer" }}>
                    Upload Different File
                  </button>
                  <button onClick={importProducts} disabled={importing}
                    style={{ background:"linear-gradient(135deg,#0F6E56,#1D9E75)",
                      color:"#fff", border:"none", borderRadius:10,
                      padding:"9px 20px", fontSize:12, fontWeight:600,
                      cursor:"pointer", opacity: importing ? 0.7 : 1 }}>
                    {importing ? "Importing..." : `Import ${csvData.length} Products`}
                  </button>
                </div>
              </div>

              {/* Preview table */}
              <div style={{ background:"#fff", borderRadius:16, overflow:"hidden",
                border:"1px solid #eef2ee" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:"#f8faf8" }}>
                      {["Product Name","Category","Unit","MRP","Cost","Stock","GST%"].map(h => (
                        <th key={h} style={{ padding:"10px 14px", textAlign:"left",
                          fontSize:10, fontWeight:700, color:"#94a3b8",
                          textTransform:"uppercase", letterSpacing:"0.5px",
                          borderBottom:"1px solid #eef2ee" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0,50).map((p,i) => (
                      <tr key={i} style={{ borderBottom:"1px solid #f5f7f5" }}>
                        <td style={{ padding:"10px 14px", fontSize:12, fontWeight:500, color:"#333" }}>{p.name}</td>
                        <td style={{ padding:"10px 14px", fontSize:11, color:"#94a3b8" }}>{p.category||"—"}</td>
                        <td style={{ padding:"10px 14px", fontSize:11, color:"#94a3b8" }}>{p.unit||"pc"}</td>
                        <td style={{ padding:"10px 14px", fontSize:12, fontWeight:600, color:"#0F6E56" }}>{INR(p.mrp)}</td>
                        <td style={{ padding:"10px 14px", fontSize:11, color:"#94a3b8" }}>{INR(p.cost)}</td>
                        <td style={{ padding:"10px 14px", fontSize:11, color:"#94a3b8" }}>{p.stock||0}</td>
                        <td style={{ padding:"10px 14px", fontSize:11, color:"#94a3b8" }}>{p.gst||0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvData.length > 50 && (
                  <div style={{ padding:"12px 16px", fontSize:11, color:"#94a3b8",
                    textAlign:"center", borderTop:"1px solid #eef2ee" }}>
                    Showing 50 of {csvData.length} products
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
