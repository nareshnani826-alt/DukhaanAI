import { useEffect, useState } from "react"
import { Products } from "../sync/db"

const EMPTY = { name:"", sku:"", category:"Staples", stock:0, min_stock:10, mrp:"", cost_price:"", gst_percent:5 }
const CATS  = ["Staples","Dairy","Oils","Beverages","Snacks","Personal Care","Other"]
const GSTS  = [0,5,12,18,28]

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState("")
  const [cat,      setCat]      = useState("")
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState(EMPTY)
  const [editId,   setEditId]   = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [notif,    setNotif]    = useState("")

  async function load() {
    setLoading(true)
    try { setProducts(await Products.list({ search, category: cat||undefined })) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, cat])

  function openAdd()      { setForm(EMPTY); setEditId(null); setModal(true) }
  function openEdit(p)    { setForm({ name:p.name, sku:p.sku||"", category:p.category||"Staples", stock:p.stock, min_stock:p.min_stock, mrp:p.mrp, cost_price:p.cost_price, gst_percent:p.gst_percent }); setEditId(p.id); setModal(true) }
  function set(k,v)       { setForm(f => ({...f,[k]:v})) }
  function showNotif(msg) { setNotif(msg); setTimeout(() => setNotif(""), 2500) }

  async function save() {
    if (!form.name.trim()) return showNotif("Product name required")
    setSaving(true)
    try {
      const data = { ...form, stock:+form.stock, min_stock:+form.min_stock, mrp:+form.mrp, cost_price:+form.cost_price, gst_percent:+form.gst_percent }
      if (editId) await Products.update(editId, data)
      else await Products.create(data)
      setModal(false); load()
      showNotif(editId ? "Product updated!" : "Product added!")
    } catch(e) { showNotif(e.message) }
    finally { setSaving(false) }
  }

  async function del(id) {
    if (!confirm("Remove this product?")) return
    await Products.delete(id); load(); showNotif("Product removed")
  }

  const pct = p => Math.max(4, Math.min(100, Math.round(p.stock / Math.max(p.min_stock*2,1) * 100)))
  const barCls = p => p.stock < p.min_stock*0.3 ? "bg-red-500" : p.stock < p.min_stock ? "bg-amber-400" : "bg-primary"
  const status = p => p.stock<=0 ? ["badge-red","Out of stock"] : p.stock<p.min_stock*0.3 ? ["badge-red","Critical"] : p.stock<p.min_stock ? ["badge-amber","Low stock"] : ["badge-green","In stock"]

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {notif && <div className="fixed top-4 right-4 bg-primary text-white px-3 py-2 rounded-lg text-xs z-50">{notif}</div>}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="bg-white rounded-2xl p-5 w-96 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">{editId ? "Edit Product" : "Add Product"}</h3>
              <button onClick={() => setModal(false)} className="text-gray-300 hover:text-gray-500 text-xl">×</button>
            </div>
            <div className="space-y-2.5">
              <div><label className="label">Product Name *</label><input className="input" value={form.name} onChange={e => set("name",e.target.value)} placeholder="e.g. Tata Salt 1kg" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">SKU</label><input className="input" value={form.sku} onChange={e => set("sku",e.target.value)} placeholder="TS-001" /></div>
                <div><label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e => set("category",e.target.value)}>
                    {CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label">Stock</label><input className="input" type="number" value={form.stock} onChange={e => set("stock",e.target.value)} /></div>
                <div><label className="label">Min Stock</label><input className="input" type="number" value={form.min_stock} onChange={e => set("min_stock",e.target.value)} /></div>
                <div><label className="label">MRP (₹)</label><input className="input" type="number" step="0.01" value={form.mrp} onChange={e => set("mrp",e.target.value)} /></div>
                <div><label className="label">Cost Price (₹)</label><input className="input" type="number" step="0.01" value={form.cost_price} onChange={e => set("cost_price",e.target.value)} /></div>
                <div><label className="label">GST %</label>
                  <select className="input" value={form.gst_percent} onChange={e => set("gst_percent",e.target.value)}>
                    {GSTS.map(g => <option key={g} value={g}>{g}%</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="text-[10px] text-gray-400">
                    Margin: {form.mrp>0 ? Math.round((form.mrp-form.cost_price)/form.mrp*100) : 0}%
                  </div>
                </div>
              </div>
              <button onClick={save} disabled={saving} className="btn btn-primary w-full py-2 text-xs font-medium">
                {saving ? "Saving..." : editId ? "Update Product" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-sm font-semibold">Inventory</h1>
        <button onClick={openAdd} className="btn btn-primary btn-sm">+ Add Product</button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3">
        <input className="input flex-1" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-36" value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">All categories</option>
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <th className="th pl-4">Product</th><th className="th">Category</th><th className="th">Stock</th>
            <th className="th">MRP</th><th className="th">Cost</th><th className="th">GST</th><th className="th">Status</th><th className="th"></th>
          </tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan="8" className="td text-center py-8"><div className="text-xs text-gray-400">Loading...</div></td></tr>
              : products.length === 0
                ? <tr><td colSpan="8" className="td text-center py-8 text-gray-400 text-xs">No products yet — add your first product!</td></tr>
                : products.map(p => {
                  const [sc, sl] = status(p)
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="td pl-4">
                        <div className="font-medium text-xs">{p.name}</div>
                        <div className="text-[10px] text-gray-400">{p.sku || "—"}</div>
                      </td>
                      <td className="td">{p.category}</td>
                      <td className="td w-24">
                        <div className="font-medium text-xs">{p.stock}</div>
                        <div className="h-1 bg-gray-100 rounded-full mt-1 w-16 overflow-hidden">
                          <div className={`h-full rounded-full ${barCls(p)}`} style={{ width: pct(p) + "%" }} />
                        </div>
                      </td>
                      <td className="td">₹{p.mrp}</td>
                      <td className="td">₹{p.cost_price}</td>
                      <td className="td">{p.gst_percent}%</td>
                      <td className="td"><span className={`badge ${sc}`}>{sl}</span></td>
                      <td className="td">
                        <div className="flex gap-1.5">
                          <button onClick={() => openEdit(p)} className="btn btn-sm">Edit</button>
                          <button onClick={() => del(p.id)} className="btn btn-sm text-red-500 hover:bg-red-50">✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
