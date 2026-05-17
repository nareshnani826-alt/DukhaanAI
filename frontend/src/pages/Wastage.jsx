import { useEffect, useState } from "react"
import { Wastage, Products } from "../sync/db.js"

const INR    = n => "₹" + Math.round(Math.abs(n||0)).toLocaleString("en-IN")
const fmtDt  = iso => new Date(iso).toLocaleString("en-IN",{ day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })

const REASONS = [
  { key:"expired",  label:"Expired",  icon:"⏰", color:"#E24B4A", bg:"#FCEBEB",
    desc:"Product passed expiry date" },
  { key:"damaged",  label:"Damaged",  icon:"💔", color:"#EF9F27", bg:"#FAEEDA",
    desc:"Broken, wet or damaged" },
  { key:"stolen",   label:"Stolen",   icon:"🚨", color:"#7F77DD", bg:"#EEEDFE",
    desc:"Theft or missing stock" },
  { key:"other",    label:"Other",    icon:"📝", color:"#888",    bg:"#f5f5f5",
    desc:"Any other reason" },
]

export default function Wastage() {
  const [products, setProducts] = useState([])
  const [records,  setRecords]  = useState([])
  const [summary,  setSummary]  = useState({ total_loss:0, total_items:0, this_month:0, by_reason:{} })
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState({ productId:"", qty:"1", reason:"expired", note:"" })
  const [saving,   setSaving]   = useState(false)
  const [notif,    setNotif]    = useState("")
  const [search,   setSearch]   = useState("")

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [p, r, s] = await Promise.all([Products.list(), Wastage.list(), Wastage.summary()])
      setProducts(p); setRecords(r); setSummary(s)
    } finally { setLoading(false) }
  }

  function showNotif(m) { setNotif(m); setTimeout(() => setNotif(""), 3000) }
  function set(k, v)    { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.productId) return showNotif("Select a product")
    if (!form.qty || +form.qty <= 0) return showNotif("Enter valid quantity")
    setSaving(true)
    try {
      await Wastage.record({
        productId: form.productId,
        qty:       +form.qty,
        reason:    form.reason,
        note:      form.note || null,
      })
      showNotif("Wastage recorded — stock updated!")
      setModal(false)
      setForm({ productId:"", qty:"1", reason:"expired", note:"" })
      await load()
    } catch(e) { showNotif("Error: " + e.message) }
    finally { setSaving(false) }
  }

  const selectedProduct = products.find(p => p.id === form.productId)
  const filteredRecords = records.filter(r =>
    r.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reason?.toLowerCase().includes(search.toLowerCase())
  )

  const reasonInfo = key => REASONS.find(r => r.key === key) || REASONS[3]

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      {notif && (
        <div className="fixed top-4 right-4 bg-primary text-white px-4 py-2 rounded-xl text-xs z-50 shadow-lg animate-fade-in">
          {notif}
        </div>
      )}

      {/* Record wastage modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center"
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="bg-white rounded-2xl p-5 w-96 shadow-xl animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold">Record Wastage</h3>
              <button onClick={() => setModal(false)} className="text-gray-300 hover:text-gray-500 text-xl">×</button>
            </div>

            <div className="space-y-3">
              {/* Product select */}
              <div>
                <label className="label">Product *</label>
                <select className="input" value={form.productId}
                  onChange={e => set("productId", e.target.value)}>
                  <option value="">Select product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.stock} {p.unit||"pc"} in stock
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <div className="text-[10px] text-gray-400 mt-1">
                    Cost price: ₹{selectedProduct.cost_price||0} ·
                    Current stock: {selectedProduct.stock} {selectedProduct.unit||"pc"}
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="label">Quantity wasted *</label>
                <input className="input" type="number" min="0.1" step="0.1"
                  value={form.qty} onChange={e => set("qty", e.target.value)}
                  placeholder="1" />
                {selectedProduct && form.qty && (
                  <div className="text-[10px] mt-1 font-medium"
                    style={{ color: +form.qty > selectedProduct.stock ? "#E24B4A" : "#1D9E75" }}>
                    {+form.qty > selectedProduct.stock
                      ? `⚠ More than current stock (${selectedProduct.stock})`
                      : `Loss value: ₹${Math.round(+form.qty * (selectedProduct.cost_price||0))}`}
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="label">Reason *</label>
                <div className="grid grid-cols-2 gap-2">
                  {REASONS.map(r => (
                    <button key={r.key}
                      onClick={() => set("reason", r.key)}
                      className="flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all text-xs"
                      style={{
                        background:  form.reason === r.key ? r.bg : "#fff",
                        borderColor: form.reason === r.key ? r.color : "#e5e7eb",
                        color:       form.reason === r.key ? r.color : "#666",
                        fontWeight:  form.reason === r.key ? 600 : 400,
                      }}>
                      <span>{r.icon}</span>
                      <div>
                        <div>{r.label}</div>
                        <div style={{ fontSize:9, opacity:0.7 }}>{r.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="label">Note (optional)</label>
                <input className="input" value={form.note}
                  onChange={e => set("note", e.target.value)}
                  placeholder="e.g. Milk packets torn in delivery" />
              </div>

              {/* Loss preview */}
              {selectedProduct && form.qty && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Product</span>
                    <span className="font-medium">{selectedProduct.name}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Qty wasted</span>
                    <span className="font-medium">{form.qty} {selectedProduct.unit||"pc"}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Stock after</span>
                    <span className="font-medium">
                      {Math.max(0, (selectedProduct.stock||0) - +form.qty)} {selectedProduct.unit||"pc"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-red-100 pt-1.5 mt-1.5">
                    <span className="text-red-600 font-semibold">Total loss</span>
                    <span className="text-red-600 font-bold">
                      {INR(+form.qty * (selectedProduct.cost_price||0))}
                    </span>
                  </div>
                </div>
              )}

              <button onClick={save} disabled={saving}
                className="btn w-full py-2.5 text-xs font-semibold mt-1"
                style={{ background:"#E24B4A", color:"#fff", border:"none" }}>
                {saving ? "Recording..." : "Record Wastage — Deduct Stock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-sticky-header flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-semibold">Wastage Recording 🗑️</h1>
          <p className="text-[10px] text-gray-400">Track expired, damaged or stolen items</p>
        </div>
        <button onClick={() => setModal(true)} className="btn btn-sm"
          style={{ background:"#E24B4A", color:"#fff", border:"none" }}>
          + Record Wastage
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {[
          { label:"This Month Loss", value: INR(summary.this_month), color:"#E24B4A", bg:"#FCEBEB", icon:"📅" },
          { label:"Total Loss",      value: INR(summary.total_loss),  color:"#EF9F27", bg:"#FAEEDA", icon:"💸" },
          { label:"Total Records",   value: summary.total_items,      color:"#7F77DD", bg:"#EEEDFE", icon:"📋" },
          { label:"Top Reason",
            value: Object.keys(summary.by_reason).sort((a,b) => summary.by_reason[b]-summary.by_reason[a])[0]
                   || "—",
            color:"#888", bg:"#f5f5f5", icon:"⚠" },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div className="stat-bar" style={{ background:s.color }} />
            <div className="stat-icon-box" style={{ background:s.bg }}>{s.icon}</div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1 mb-1">{s.label}</div>
            <div className="text-lg font-bold text-gray-800">{loading ? "—" : s.value}</div>
          </div>
        ))}
      </div>

      {/* Reason breakdown */}
      {Object.keys(summary.by_reason).length > 0 && (
        <div className="card mb-4">
          <div className="text-xs font-semibold text-gray-700 mb-3">Loss by reason</div>
          <div className="grid grid-cols-4 gap-2">
            {REASONS.map(r => {
              const val = summary.by_reason[r.key] || 0
              const max = Math.max(...Object.values(summary.by_reason))
              return (
                <div key={r.key} className="text-center">
                  <div className="text-2xl mb-1">{r.icon}</div>
                  <div className="h-12 flex items-end justify-center mb-1">
                    <div className="w-8 rounded-t-lg transition-all"
                      style={{
                        height: max > 0 ? Math.max(4, (val/max)*48) + "px" : "4px",
                        background: r.color
                      }} />
                  </div>
                  <div className="text-[10px] font-medium" style={{ color:r.color }}>{r.label}</div>
                  <div className="text-[10px] text-gray-400">{INR(val)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Records list */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-gray-700">Wastage History</div>
          <input className="input w-40 py-1" placeholder="Search..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">✅</div>
            <div className="text-xs text-gray-400">
              {search ? "No matching records" : "No wastage recorded yet — great!"}
            </div>
          </div>
        ) : filteredRecords.map(r => {
          const ri = reasonInfo(r.reason)
          return (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl mb-2"
              style={{ background: ri.bg }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: ri.color + "20" }}>
                {ri.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-800">{r.product_name}</div>
                <div className="text-[10px] text-gray-500">
                  {r.qty} {r.unit} · {ri.label}
                  {r.note && <span> · {r.note}</span>}
                </div>
                <div className="text-[10px] text-gray-400">{fmtDt(r.created_at)}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold" style={{ color:ri.color }}>
                  -{INR(r.loss_value)}
                </div>
                <div className="text-[10px] text-gray-400">
                  Stock: {r.stock_before} → {r.stock_after}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
