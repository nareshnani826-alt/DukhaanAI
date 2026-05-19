import { useEffect, useState } from "react"
import { Customers } from "../sync/db.js"
import { useAuth } from "../context/AuthContext.jsx"

function formatDate(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })
}

function fmtInvoiceWA(invoice, storeName, storeGstin) {
  const lines = (invoice.items||[]).map(i => `  • ${i.name} × ${i.qty} = ₹${i.total}`).join("\n")
  return `🧾 *Invoice ${invoice.invoice_no}*
Store: ${storeName||"DukaanAI"}
GSTIN: ${storeGstin||"—"}
Date: ${formatDate(invoice.created_at)}

Customer: *${invoice.customer_name}*
Payment: ${invoice.payment_mode}

Items:
${lines}

Subtotal: ₹${invoice.subtotal}
CGST: ₹${invoice.cgst} | SGST: ₹${invoice.sgst}
*Total: ₹${invoice.total}*

Thank you for shopping with us! 🙏`
}

const EMPTY_FORM = { name:"", phone:"", gstin:"", address:"", notes:"" }

export default function CustomersPage() {
  const { vendor } = useAuth()
  const [customers,  setCustomers]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState("")
  const [selected,   setSelected]   = useState(null)
  const [invoices,   setInvoices]   = useState([])
  const [invLoading, setInvLoading] = useState(false)
  const [notif,      setNotif]      = useState("")
  const [modal,      setModal]      = useState(false)   // add/edit customer modal
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [editId,     setEditId]     = useState(null)
  const [saving,     setSaving]     = useState(false)

  useEffect(() => { load() }, [search])

  async function load() {
    setLoading(true)
    try { setCustomers(await Customers.list({ search })) }
    finally { setLoading(false) }
  }

  async function selectCustomer(c) {
    setSelected(c)
    setInvLoading(true)
    try { setInvoices(await Customers.invoices(c.id)) }
    finally { setInvLoading(false) }
  }

  function showNotif(m) { setNotif(m); setTimeout(() => setNotif(""), 2500) }
  function set(k, v)    { setForm(f => ({...f, [k]: v})) }

  function openAdd() {
    setForm(EMPTY_FORM); setEditId(null); setModal(true)
  }

  function openEdit(c, e) {
    e.stopPropagation()
    setForm({ name:c.name||"", phone:c.phone||"", gstin:c.gstin||"", address:c.address||"", notes:c.notes||"" })
    setEditId(c.id)
    setModal(true)
  }

  async function saveCustomer() {
    if (!form.name.trim()) return showNotif("Name is required")
    setSaving(true)
    try {
      if (editId) {
        // Update via upsert — pass 0 amount so total_spent doesn't change
        await Customers.update(editId, {
          name:    form.name,
          phone:   form.phone || null,
          gstin:   form.gstin || null,
          address: form.address || null,
          notes:   form.notes || null,
        })
        showNotif("Customer updated!")
        // Refresh selected if it's the one being edited
        if (selected?.id === editId) {
          setSelected(prev => ({ ...prev, ...form }))
        }
      } else {
        await Customers.upsert({
          name:    form.name,
          phone:   form.phone || null,
          gstin:   form.gstin || null,
          address: form.address || null,
          notes:   form.notes || null,
          amount:  0,
        })
        showNotif("Customer added!")
      }
      setModal(false)
      load()
    } catch(e) { showNotif("Error: " + e.message) }
    finally { setSaving(false) }
  }

  async function deleteCustomer(id, e) {
    e?.stopPropagation()
    if (!confirm("Remove this customer from history?")) return
    await Customers.delete(id)
    if (selected?.id === id) setSelected(null)
    load()
    showNotif("Customer removed")
  }

  function sendInvoiceWA(invoice, phone) {
    const msg = fmtInvoiceWA(invoice, vendor?.store_name, vendor?.gstin)
    const num  = (phone||"").replace(/\D/g,"")
    window.open(`https://wa.me/${num?"91"+num:""}?text=${encodeURIComponent(msg)}`, "_blank")
  }

  function openWA(phone) {
    const num = (phone||"").replace(/\D/g,"")
    if (num) window.open(`https://wa.me/91${num}`, "_blank")
  }

  // Summary stats
  const totalRevenue = customers.reduce((s,c) => s+(c.total_spent||0), 0)
  const topCustomer  = customers[0]

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4">
      {notif && (
        <div className="fixed top-4 right-4 bg-primary text-white px-4 py-2 rounded-lg text-xs z-50 shadow-lg">
          {notif}
        </div>
      )}

      {/* ── Add / Edit customer modal ──────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center"
          onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="bg-white rounded-2xl p-5 w-96 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">
                {editId ? "Edit Customer" : "Add Customer"}
              </h3>
              <button onClick={() => setModal(false)} className="text-gray-300 hover:text-gray-500 text-xl">×</button>
            </div>
            <div className="space-y-2.5">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={e => set("name",e.target.value)}
                  placeholder="e.g. Ravi Kirana Mart" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Phone (WhatsApp)</label>
                  <input className="input" value={form.phone} onChange={e => set("phone",e.target.value)}
                    placeholder="9876543210" />
                </div>
                <div>
                  <label className="label">GSTIN</label>
                  <input className="input" value={form.gstin} onChange={e => set("gstin",e.target.value)}
                    placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input" value={form.address} onChange={e => set("address",e.target.value)}
                  placeholder="Shop address (optional)" />
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" value={form.notes} onChange={e => set("notes",e.target.value)}
                  placeholder="e.g. Pays on credit, weekly settlement" />
              </div>
              <button onClick={saveCustomer} disabled={saving}
                className="btn btn-primary w-full py-2 text-xs font-medium">
                {saving ? "Saving..." : editId ? "Update Customer" : "Add Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-sticky-header flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-semibold">Customers</h1>
          <p className="text-[10px] text-gray-400">Auto-saved from invoices · Add manually · Resend on WhatsApp</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary btn-sm">+ Add Customer</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="stat-card">
          <div className="text-[10px] text-gray-400 mb-1">Total Customers</div>
          <div className="text-xl font-semibold">{customers.length}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Unique buyers</div>
        </div>
        <div className="stat-card">
          <div className="text-[10px] text-gray-400 mb-1">Total Revenue</div>
          <div className="text-xl font-semibold text-primary">
            ₹{Math.round(totalRevenue).toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">From all customers</div>
        </div>
        <div className="stat-card">
          <div className="text-[10px] text-gray-400 mb-1">Top Customer</div>
          <div className="text-sm font-semibold truncate">{topCustomer?.name||"—"}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {topCustomer ? `₹${Math.round(topCustomer.total_spent).toLocaleString("en-IN")} spent` : "No customers yet"}
          </div>
        </div>
      </div>

      <div className="customer-split flex gap-3 flex-1 overflow-hidden min-h-0">

        {/* Left — customer list */}
        <div className="customer-list w-72 flex flex-col flex-shrink-0">
          <input className="input mb-2" placeholder="Search name or phone..."
            value={search} onChange={e => setSearch(e.target.value)} />

          <div className="card flex-1 overflow-y-auto p-0">
            {loading ? (
              <div className="p-4 text-xs text-gray-400 text-center">Loading...</div>
            ) : customers.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-3xl mb-2">👤</div>
                <div className="text-xs text-gray-400 mb-3">
                  {search
                    ? "No customers match your search"
                    : "Customers appear here automatically when you generate invoices, or add them manually"
                  }
                </div>
                {!search && (
                  <button onClick={openAdd} className="btn btn-primary btn-sm">
                    + Add first customer
                  </button>
                )}
              </div>
            ) : customers.map(c => (
              <div key={c.id}
                onClick={() => selectCustomer(c)}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selected?.id === c.id ? "bg-primary-light" : ""
                }`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                  selected?.id === c.id ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 truncate">{c.name}</div>
                  <div className="text-[10px] text-gray-400">
                    {c.phone || "No phone"} · {c.visit_count||0} visit{c.visit_count!==1?"s":""}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-semibold text-primary">
                    ₹{Math.round(c.total_spent||0).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-gray-400">{formatDate(c.last_visited)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — detail panel */}
        <div className="customer-detail flex-1 overflow-y-auto min-w-0">
          {!selected ? (
            <div className="card h-64 flex items-center justify-center flex-col gap-3 text-center">
              <div className="text-5xl">👈</div>
              <div className="text-sm font-medium text-gray-400">Select a customer</div>
              <div className="text-xs text-gray-300 max-w-xs">
                See full purchase history and resend invoices on WhatsApp
              </div>
            </div>
          ) : (
            <div className="space-y-3">

              {/* Customer card */}
              <div className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white text-lg font-semibold flex-shrink-0">
                      {selected.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{selected.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {selected.phone||"No phone"}
                        {selected.gstin && <span className="ml-2">GSTIN: {selected.gstin}</span>}
                      </div>
                      {selected.address && (
                        <div className="text-[10px] text-gray-400 mt-0.5">{selected.address}</div>
                      )}
                      {selected.notes && (
                        <div className="text-[10px] text-amber-600 mt-0.5 bg-amber-50 px-2 py-0.5 rounded">
                          📝 {selected.notes}
                        </div>
                      )}
                      <div className="text-[10px] text-gray-400 mt-1">
                        Customer since {formatDate(selected.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    {selected.phone && (
                      <button
                        onClick={() => openWA(selected.phone)}
                        className="btn btn-sm py-1.5 text-[10px] font-medium"
                        style={{ background:"#25D366", color:"var(--bg1)", border:"none" }}>
                        WhatsApp
                      </button>
                    )}
                    <button onClick={e => openEdit(selected, e)}
                      className="btn btn-sm text-[10px]">
                      Edit
                    </button>
                    <button onClick={e => deleteCustomer(selected.id, e)}
                      className="btn btn-sm text-red-400 hover:bg-red-50 text-[10px]">
                      Remove
                    </button>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label:"Total spent",  value:`₹${Math.round(selected.total_spent||0).toLocaleString("en-IN")}`, green:true },
                    { label:"Total visits", value: selected.visit_count||0 },
                    { label:"Last visited", value: formatDate(selected.last_visited) },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-gray-400">{s.label}</div>
                      <div className={`text-sm font-semibold mt-0.5 ${s.green?"text-primary":"text-gray-700"}`}>
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invoice history */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-medium text-gray-600">
                    Purchase History
                    {invoices.length > 0 && (
                      <span className="badge badge-blue ml-2">{invoices.length} invoices</span>
                    )}
                  </div>
                </div>

                {invLoading ? (
                  <div className="text-xs text-gray-400 py-4 text-center">Loading invoices...</div>
                ) : invoices.length === 0 ? (
                  <div className="py-6 text-center">
                    <div className="text-2xl mb-2">🧾</div>
                    <div className="text-xs text-gray-400">
                      No invoices yet for this customer.<br/>
                      Generate an invoice with their name to see it here.
                    </div>
                  </div>
                ) : invoices.map(inv => (
                  <div key={inv.id}
                    className="border border-gray-100 rounded-xl p-3 mb-2 hover:border-gray-200 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">{inv.invoice_no}</span>
                        <span className="text-[10px] text-gray-400">{formatDate(inv.created_at)}</span>
                        <span className={`badge ${inv.status==="paid"?"badge-green":"badge-amber"}`}>
                          {inv.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">₹{inv.total}</span>
                        <button
                          onClick={() => sendInvoiceWA(inv, selected.phone)}
                          className="btn btn-sm text-[10px] py-1"
                          style={selected.phone
                            ? { background:"#25D366", color:"var(--bg1)", border:"none" }
                            : {}
                          }>
                          {selected.phone ? "Resend WhatsApp" : "No phone saved"}
                        </button>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="bg-gray-50 rounded-lg p-2">
                      {(inv.items||[]).slice(0,3).map((item,i) => (
                        <div key={i} className="flex justify-between text-[10px] text-gray-500 py-0.5">
                          <span>{item.name} × {item.qty}</span>
                          <span>₹{item.total}</span>
                        </div>
                      ))}
                      {(inv.items||[]).length > 3 && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          +{inv.items.length-3} more items
                        </div>
                      )}
                      <div className="flex justify-between text-[10px] font-medium text-gray-600 border-t border-gray-200 mt-1 pt-1">
                        <span>{inv.payment_mode}</span>
                        <span>CGST ₹{inv.cgst} · SGST ₹{inv.sgst}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
