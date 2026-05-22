import { useState, useEffect } from "react"
import { getToken } from "../sync/db"

const API    = import.meta.env.VITE_API_URL ?? ""
const INR    = n => "₹" + Number(n || 0).toLocaleString("en-IN")
const CATS   = ["Bangles","Earrings","Necklace","Anklet","Hair Clip","Bindi","Rings","Other"]
const SIZES  = ["2.2","2.4","2.6","2.8","2.10","2.12","2.14","Free Size"]
const COLOURS= ["Red","Pink","Green","Blue","Gold","Silver","White","Black","Orange","Purple","Multi"]
const DESIGNS= ["Plain","Kundan","Meenakari","Stone Work","Mirror Work","Lac","Metal","Glass"]

function authHeaders() {
  const t = getToken()
  return t ? { "Content-Type":"application/json", Authorization:`Bearer ${t}` }
           : { "Content-Type":"application/json" }
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders(), ...opts })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "Request failed") }
  return res.json()
}

// ── Add Product Modal ──────────────────────────────────────
function AddProductModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name:"", category:"Bangles", mrp:"", cost_price:"", gst_percent:3 })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const set = (k,v) => setForm(f => ({...f,[k]:v}))

  async function save() {
    if (!form.name.trim()) { setErr("Name is required"); return }
    setLoading(true); setErr("")
    try {
      const p = await apiFetch("/bangle/products", {
        method:"POST",
        body: JSON.stringify({...form, mrp:+form.mrp||0, cost_price:+form.cost_price||0})
      })
      onSaved(p)
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-bold" style={{color:"var(--ink)"}}>Add New Product</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Product Name *</label>
            <input className="input" placeholder="e.g. Kundan Bangle" value={form.name}
              onChange={e=>set("name",e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={e=>set("category",e.target.value)}>
              {CATS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">MRP (₹)</label>
              <input className="input" type="number" min="0" placeholder="0" value={form.mrp}
                onChange={e=>set("mrp",e.target.value)} />
            </div>
            <div>
              <label className="label">Cost (₹)</label>
              <input className="input" type="number" min="0" placeholder="0" value={form.cost_price}
                onChange={e=>set("cost_price",e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">GST %</label>
            <select className="input" value={form.gst_percent} onChange={e=>set("gst_percent",+e.target.value)}>
              {[0,3,5,12,18].map(g=><option key={g} value={g}>{g}%</option>)}
            </select>
          </div>
          {err && <p className="text-red-500 text-xs">{err}</p>}
          <button onClick={save} disabled={loading}
            className="w-full py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{background:"linear-gradient(135deg,#0F6E56,#1D9E75)"}}>
            {loading ? "Saving..." : "Create Product"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Variants Modal ─────────────────────────────────────
function AddVariantsModal({ product, onClose, onSaved }) {
  const [mode, setMode]       = useState("matrix") // matrix | single
  const [selColours, setSelColours] = useState([])
  const [selSizes,   setSelSizes]   = useState([])
  const [selDesigns, setSelDesigns] = useState([])
  const [stockPer,   setStockPer]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")

  // Single variant
  const [single, setSingle] = useState({colour:"",size:"",design:"",stock:0})

  function toggleArr(arr, setArr, val) {
    setArr(a => a.includes(val) ? a.filter(x=>x!==val) : [...a, val])
  }

  const matrixCount = Math.max(1,selColours.length||1) * Math.max(1,selSizes.length||1) * Math.max(1,selDesigns.length||1)

  async function saveMatrix() {
    setLoading(true); setErr("")
    try {
      const res = await apiFetch(`/bangle/products/${product.id}/variants/bulk`, {
        method:"POST",
        body: JSON.stringify({
          colours: selColours.length ? selColours : [],
          sizes:   selSizes.length   ? selSizes   : [],
          designs: selDesigns.length ? selDesigns : [],
          stock_per_variant: +stockPer||0,
        })
      })
      onSaved(res)
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  async function saveSingle() {
    setLoading(true); setErr("")
    try {
      const res = await apiFetch(`/bangle/products/${product.id}/variants`, {
        method:"POST",
        body: JSON.stringify({...single, stock:+single.stock||0})
      })
      onSaved({created:1, variants:[res]})
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const Chip = ({label, active, onClick}) => (
    <button onClick={onClick}
      className="px-2 py-1 rounded-full text-[11px] font-medium border transition-all"
      style={{
        background: active ? "var(--jade,#1D9E75)" : "var(--bg2,#f5f5f5)",
        color: active ? "#fff" : "var(--ink-dim,#555)",
        borderColor: active ? "var(--jade,#1D9E75)" : "transparent"
      }}>
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="sticky top-0 bg-white p-5 pb-3 border-b">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-bold" style={{color:"var(--ink)"}}>Add Variants</div>
              <div className="text-[11px]" style={{color:"var(--ink-faint)"}}>{product.name}</div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <div className="flex gap-2 mt-3">
            {[["matrix","Matrix (bulk)"],["single","Single variant"]].map(([m,l])=>(
              <button key={m} onClick={()=>setMode(m)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                style={{
                  background: mode===m ? "var(--jade,#1D9E75)" : "transparent",
                  color: mode===m ? "#fff" : "var(--ink-dim)",
                  borderColor: mode===m ? "var(--jade,#1D9E75)" : "#e5e7eb"
                }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {mode === "matrix" ? (
            <>
              <div>
                <div className="text-xs font-bold mb-2" style={{color:"var(--ink-dim)"}}>COLOURS</div>
                <div className="flex flex-wrap gap-1.5">
                  {COLOURS.map(c=><Chip key={c} label={c} active={selColours.includes(c)} onClick={()=>toggleArr(selColours,setSelColours,c)}/>)}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold mb-2" style={{color:"var(--ink-dim)"}}>SIZES</div>
                <div className="flex flex-wrap gap-1.5">
                  {SIZES.map(s=><Chip key={s} label={s} active={selSizes.includes(s)} onClick={()=>toggleArr(selSizes,setSelSizes,s)}/>)}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold mb-2" style={{color:"var(--ink-dim)"}}>DESIGNS (optional)</div>
                <div className="flex flex-wrap gap-1.5">
                  {DESIGNS.map(d=><Chip key={d} label={d} active={selDesigns.includes(d)} onClick={()=>toggleArr(selDesigns,setSelDesigns,d)}/>)}
                </div>
              </div>
              <div>
                <label className="label">Opening stock per variant</label>
                <input className="input" type="number" min="0" value={stockPer}
                  onChange={e=>setStockPer(e.target.value)} placeholder="0" />
              </div>
              {(selColours.length>0||selSizes.length>0||selDesigns.length>0) && (
                <div className="text-xs text-center py-2 rounded-lg" style={{background:"#f0faf6",color:"var(--jade)"}}>
                  Will create <b>{matrixCount}</b> variants
                </div>
              )}
              {err && <p className="text-red-500 text-xs">{err}</p>}
              <button onClick={saveMatrix} disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{background:"linear-gradient(135deg,#0F6E56,#1D9E75)"}}>
                {loading ? "Creating..." : `Create ${matrixCount} Variants`}
              </button>
            </>
          ) : (
            <>
              {[["colour","Colour","e.g. Red"],["size","Size","e.g. 2.6"],["design","Design","e.g. Kundan"]].map(([k,l,p])=>(
                <div key={k}>
                  <label className="label">{l}</label>
                  <input className="input" placeholder={p} value={single[k]}
                    onChange={e=>setSingle(s=>({...s,[k]:e.target.value}))} />
                </div>
              ))}
              <div>
                <label className="label">Opening Stock</label>
                <input className="input" type="number" min="0" value={single.stock}
                  onChange={e=>setSingle(s=>({...s,stock:e.target.value}))} />
              </div>
              {err && <p className="text-red-500 text-xs">{err}</p>}
              <button onClick={saveSingle} disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{background:"linear-gradient(135deg,#0F6E56,#1D9E75)"}}>
                {loading ? "Saving..." : "Add Variant"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Variant Row ────────────────────────────────────────────
function VariantRow({ variant, productMrp, onStockChange }) {
  const [stock, setStock] = useState(variant.stock)
  const [saving, setSaving] = useState(false)
  const isLow = stock < variant.min_stock
  const isOut = stock === 0

  async function save(newStock) {
    setSaving(true)
    try {
      await apiFetch(`/bangle/variants/${variant.id}`, {
        method:"PATCH", body: JSON.stringify({stock: newStock})
      })
      onStockChange(variant.id, newStock)
    } catch {}
    finally { setSaving(false) }
  }

  return (
    <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs"
      style={{background: isOut?"#fef2f2": isLow?"#fffbeb":"#f8faf8"}}>
      <div className="flex-1 flex flex-wrap gap-1">
        {variant.colour && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{background:"#e8f4f0",color:"var(--jade)"}}>{variant.colour}</span>}
        {variant.size   && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{background:"#eef2fe",color:"#4f46e5"}}>{variant.size}</span>}
        {variant.design && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{background:"#fdf4ff",color:"#9333ea"}}>{variant.design}</span>}
      </div>
      <div className="text-[10px]" style={{color: isOut?"#dc2626":isLow?"#d97706":"var(--ink-faint)"}}>
        {isOut?"OUT":isLow?"LOW":""}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={()=>{const n=Math.max(0,stock-1);setStock(n);save(n)}}
          className="w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center"
          style={{background:"var(--bg2)",color:"var(--ink-dim)"}}>−</button>
        <input type="number" min="0" value={stock}
          onChange={e=>setStock(+e.target.value)}
          onBlur={e=>save(+e.target.value)}
          className="w-12 text-center text-xs font-bold rounded-md border"
          style={{borderColor:"var(--rule)",padding:"2px 4px"}}/>
        <button onClick={()=>{const n=stock+1;setStock(n);save(n)}}
          className="w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center"
          style={{background:"var(--bg2)",color:"var(--ink-dim)"}}>+</button>
      </div>
      <div className="text-[10px] font-semibold w-12 text-right" style={{color:"var(--jade)"}}>
        {INR(variant.mrp||productMrp)}
      </div>
    </div>
  )
}

// ── Product Card ───────────────────────────────────────────
function ProductCard({ product, onAddVariants, onStockChange }) {
  const [expanded, setExpanded] = useState(false)
  const isLow = product.low_stock_count > 0
  const isOut = product.total_stock === 0 && product.variant_count > 0

  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{background:"var(--bg1)",border:"1px solid var(--rule)"}}>
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={()=>setExpanded(!expanded)}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{background:"#fbeaef"}}>💍</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{color:"var(--ink)"}}>{product.name}</div>
          <div className="text-[11px] flex gap-2 mt-0.5" style={{color:"var(--ink-faint)"}}>
            <span>{product.category}</span>
            <span>·</span>
            <span>{product.variant_count} variants</span>
            <span>·</span>
            <span style={{color: isOut?"#dc2626":isLow?"#d97706":"var(--jade)"}}>
              {product.total_stock} pcs
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLow && !isOut && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:"#fffbeb",color:"#d97706"}}>
              {product.low_stock_count} low
            </span>
          )}
          {isOut && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:"#fef2f2",color:"#dc2626"}}>
              OUT
            </span>
          )}
          <div style={{color:"var(--ink-faint)",fontSize:18,transform:expanded?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}}>⌄</div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t" style={{borderColor:"var(--rule)"}}>
          <div className="pt-3 space-y-1.5">
            {product.variants.length === 0 ? (
              <div className="text-center py-4 text-xs" style={{color:"var(--ink-faint)"}}>
                No variants yet — add colour/size/design combinations
              </div>
            ) : product.variants.map(v => (
              <VariantRow key={v.id} variant={v} productMrp={product.mrp}
                onStockChange={(id, s) => onStockChange(product.id, id, s)} />
            ))}
          </div>
          <button
            onClick={()=>onAddVariants(product)}
            className="mt-3 w-full py-2 rounded-xl text-xs font-semibold border-2 border-dashed transition-colors"
            style={{borderColor:"var(--jade)",color:"var(--jade)",background:"transparent"}}>
            + Add Variants
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────
export default function BangleInventory() {
  const [products,   setProducts]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [category,   setCategory]   = useState("All")
  const [search,     setSearch]     = useState("")
  const [showAdd,    setShowAdd]    = useState(false)
  const [addVariFor, setAddVariFor] = useState(null)
  const [summary,    setSummary]    = useState(null)

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    try {
      const [prods, summ] = await Promise.all([
        apiFetch("/bangle/products"),
        apiFetch("/bangle/stock-summary"),
      ])
      setProducts(prods)
      setSummary(summ)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  function onProductSaved(p) {
    setProducts(prev => [{ ...p, variants:[], total_stock:0, variant_count:0, low_stock_count:0 }, ...prev])
    setShowAdd(false)
  }

  function onVariantsSaved(res) {
    setProducts(prev => prev.map(p => {
      if (p.id !== addVariFor.id) return p
      const newVars = [...p.variants, ...res.variants]
      return { ...p, variants:newVars, variant_count:newVars.length, total_stock:newVars.reduce((s,v)=>s+v.stock,0) }
    }))
    setAddVariFor(null)
  }

  function onStockChange(productId, variantId, newStock) {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p
      const variants = p.variants.map(v => v.id===variantId ? {...v,stock:newStock} : v)
      return {...p, variants, total_stock: variants.reduce((s,v)=>s+v.stock,0)}
    }))
  }

  const filtered = products.filter(p => {
    if (category !== "All" && p.category !== category) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{background:"var(--bg0)"}}>

      {showAdd    && <AddProductModal onClose={()=>setShowAdd(false)} onSaved={onProductSaved} />}
      {addVariFor && <AddVariantsModal product={addVariFor} onClose={()=>setAddVariFor(null)} onSaved={onVariantsSaved} />}

      {/* Header */}
      <div style={{background:"var(--bg1)",padding:"0 20px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid var(--rule)",flexShrink:0}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:"var(--ink)"}}>💍 Bangle Inventory</div>
          <div style={{fontSize:11,color:"var(--ink-faint)"}}>Variants by colour, size &amp; design</div>
        </div>
        <button onClick={()=>setShowAdd(true)}
          style={{background:"linear-gradient(135deg,#0F6E56,#1D9E75)",color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
          + Add Product
        </button>
      </div>

      {/* Summary strip */}
      {summary && (
        <div style={{display:"flex",gap:1,background:"var(--rule)",flexShrink:0}}>
          {[
            {label:"Products",  value:products.length,         color:"var(--jade)"},
            {label:"Variants",  value:summary.total_variants,  color:"#4f46e5"},
            {label:"Pieces",    value:summary.total_pieces,    color:"var(--ink)"},
            {label:"Low Stock", value:summary.low_stock,       color:"#d97706"},
            {label:"Out",       value:summary.out_of_stock,    color:"#dc2626"},
          ].map(s => (
            <div key={s.label} style={{flex:1,padding:"10px 8px",textAlign:"center",background:"var(--bg1)"}}>
              <div style={{fontSize:16,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:9,color:"var(--ink-faint)",marginTop:1}}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{background:"var(--bg1)",padding:"10px 16px",borderBottom:"1px solid var(--rule)",flexShrink:0}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search products..."
          style={{width:"100%",border:"1.5px solid var(--rule)",borderRadius:10,padding:"7px 12px",fontSize:12,outline:"none",marginBottom:8,boxSizing:"border-box"}}/>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
          {["All",...CATS].map(c=>(
            <button key={c} onClick={()=>setCategory(c)}
              style={{padding:"4px 12px",borderRadius:20,border:"none",fontSize:11,fontWeight:500,whiteSpace:"nowrap",cursor:"pointer",flexShrink:0,
                background:category===c?"var(--jade,#1D9E75)":"var(--bg2)",
                color:category===c?"#fff":"var(--ink-dim)"}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
        {loading ? (
          <div style={{textAlign:"center",padding:48,color:"var(--ink-faint)",fontSize:13}}>Loading inventory...</div>
        ) : filtered.length === 0 ? (
          <div style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:48,marginBottom:12}}>💍</div>
            <div style={{fontSize:15,fontWeight:700,color:"var(--ink)",marginBottom:6}}>
              {products.length===0 ? "No products yet" : "No matches"}
            </div>
            <div style={{fontSize:12,color:"var(--ink-faint)",marginBottom:20}}>
              {products.length===0 ? "Add your first bangle product to get started" : "Try a different search or category"}
            </div>
            {products.length===0 && (
              <button onClick={()=>setShowAdd(true)}
                style={{background:"linear-gradient(135deg,#0F6E56,#1D9E75)",color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                + Add First Product
              </button>
            )}
          </div>
        ) : filtered.map(p => (
          <ProductCard key={p.id} product={p} onAddVariants={setAddVariFor} onStockChange={onStockChange} />
        ))}
      </div>
    </div>
  )
}
