import { useEffect, useState } from "react"
import { Udhar } from "../sync/db.js"
import { useAuth } from "../context/AuthContext.jsx"

const INR = n => "₹" + Math.round(Math.abs(n||0)).toLocaleString("en-IN")
const fmt = iso => {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })
}
const fmtTime = iso => {
  if (!iso) return ""
  return new Date(iso).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })
}

function WA(phone, msg) {
  const num = (phone||"").replace(/\D/g,"")
  window.open(`https://wa.me/${num?"91"+num:""}?text=${encodeURIComponent(msg)}`, "_blank")
}

export default function UdharKhata() {
  const { vendor } = useAuth()
  const [customers, setCustomers] = useState([])
  const [summary,   setSummary]   = useState({ total_due:0, overdue_count:0, customer_count:0 })
  const [selected,  setSelected]  = useState(null)
  const [txns,      setTxns]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState("")
  const [notif,     setNotif]     = useState("")
  const [modal,     setModal]     = useState(null) // "add-customer" | "credit" | "payment"
  const [form,      setForm]      = useState({})
  const [saving,    setSaving]    = useState(false)

  useEffect(() => { load() }, [search])

  async function load() {
    setLoading(true)
    try {
      const [c, s] = await Promise.all([Udhar.listCustomers({ search }), Udhar.summary()])
      setCustomers(c); setSummary(s)
    } finally { setLoading(false) }
  }

  async function selectCustomer(c) {
    setSelected(c)
    const t = await Udhar.transactions(c.id)
    setTxns(t)
  }

  function showNotif(m) { setNotif(m); setTimeout(()=>setNotif(""), 3000) }
  function set(k,v)     { setForm(f=>({...f,[k]:v})) }

  async function openModal(type, customer) {
    setModal(type)
    setForm(type === "add-customer"
      ? { name:"", phone:"", address:"" }
      : { amount:"", note:"" }
    )
  }

  async function save() {
    if (!form.name?.trim() && modal==="add-customer") return showNotif("Name required")
    if (!form.amount && modal!=="add-customer") return showNotif("Amount required")
    setSaving(true)
    try {
      if (modal === "add-customer") {
        await Udhar.addCustomer({ name:form.name, phone:form.phone||null, address:form.address||null })
        showNotif("Customer added!")
      } else if (modal === "credit") {
        await Udhar.addCredit({ customerId:selected.id, amount:+form.amount, note:form.note||null })
        showNotif(`₹${form.amount} credit added`)
      } else if (modal === "payment") {
        await Udhar.addPayment({ customerId:selected.id, amount:+form.amount, note:form.note||null })
        showNotif(`₹${form.amount} payment recorded`)
      }
      setModal(null)
      await load()
      if (selected) {
        const updated = await Udhar.listCustomers({ search })
        const fresh   = updated.find(c => c.id === selected.id)
        if (fresh) {
          setSelected(fresh)
          setTxns(await Udhar.transactions(fresh.id))
        }
      }
    } catch(e) { showNotif("Error: " + e.message) }
    finally { setSaving(false) }
  }

  async function deleteCustomer(c, e) {
    e?.stopPropagation()
    if (!confirm(`Remove ${c.name} from Udhar Khata? All transactions will be deleted.`)) return
    await Udhar.deleteCustomer(c.id)
    if (selected?.id === c.id) setSelected(null)
    load(); showNotif("Customer removed")
  }

  function sendReminder(c) {
    if (!c.phone) return showNotif("No phone number saved for this customer")
    const msg =
`🙏 Namaste ${c.name} ji,

*${vendor?.store_name || "Humara Dukaan"}* se yaad dila rahe hain:

Aapka udhar baaki hai: *${INR(c.total_due)}*

Please jab bhi convenient ho, payment kar dein.

Dhanyawaad! 🙏`
    WA(c.phone, msg)
  }

  function sendStatement(c, transactions) {
    if (!c.phone) return showNotif("No phone number saved")
    const lines = transactions.slice(0,10).map(t =>
      `${t.type==="credit"?"📤 Udhar":"📥 Payment"}: ${INR(t.amount)} — ${fmt(t.created_at)}${t.note ? ` (${t.note})` : ""}`
    ).join("\n")
    const msg =
`📒 *Udhar Statement — ${c.name}*
Store: ${vendor?.store_name || "DukaanAI"}
Date: ${fmt(new Date().toISOString())}

Transactions:
${lines}

*Total due: ${INR(c.total_due)}*

${c.total_due > 0 ? "Kripya jaldi payment karein 🙏" : "✅ Account clear hai! Dhanyawaad."}`
    WA(c.phone, msg)
  }

  // Generate a proof receipt for a single transaction
  function sendProof(c, txn) {
    if (!c.phone) return showNotif("No phone number saved for this customer")
    const txnId   = txn.id.slice(-6).toUpperCase()
    const typeStr = txn.type === "credit" ? "Udhar (Credit)" : "Payment Received"
    const msg =
`🧾 *${typeStr} Receipt*
━━━━━━━━━━━━━━━━━━━━
Receipt No: *#UD-${txnId}*
Date: ${fmtTime(txn.created_at)}
━━━━━━━━━━━━━━━━━━━━
Store: *${vendor?.store_name || "DukaanAI"}*
Customer: *${c.name}*
${c.phone ? `Phone: ${c.phone}` : ""}
${c.address ? `Address: ${c.address}` : ""}
━━━━━━━━━━━━━━━━━━━━
Amount: *${INR(txn.amount)}*
Type: ${typeStr}
${txn.note ? `Note: ${txn.note}` : ""}
━━━━━━━━━━━━━━━━━━━━
Balance after: *${INR(c.total_due)}*

✅ This message is your proof of ${txn.type === "credit" ? "purchase on credit" : "payment"}.
Please save this message for your records.

_Powered by DukaanAI_`
    WA(c.phone, msg)
    showNotif("Proof sent on WhatsApp!")
  }

  // Print a proof receipt
  function printProof(c, txn) {
    const txnId = txn.id.slice(-6).toUpperCase()
    const win   = window.open("", "_blank")
    win.document.write(`
      <!DOCTYPE html><html><head>
        <title>Receipt #UD-${txnId}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 320px; margin: 20px auto; font-size: 13px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #ccc; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .big { font-size: 20px; font-weight: bold; color: ${txn.type==="credit"?"#EF9F27":"#1D9E75"}; }
          .proof-box { border: 2px solid #333; padding: 12px; margin-top: 12px; font-size: 11px; }
          .signature { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 10px; }
          @media print { button { display:none; } }
        </style>
      </head><body>
        <div class="center">
          <div class="bold" style="font-size:16px">${vendor?.store_name || "DukaanAI"}</div>
          <div style="font-size:11px;color:#666">${vendor?.gstin ? "GSTIN: "+vendor.gstin : ""}</div>
        </div>
        <div class="divider"></div>
        <div class="center bold">UDHAR ${txn.type==="credit"?"CREDIT":"PAYMENT"} RECEIPT</div>
        <div class="center" style="color:#666;font-size:11px">Receipt #UD-${txnId}</div>
        <div class="divider"></div>
        <div class="row"><span>Date:</span><span>${fmtTime(txn.created_at)}</span></div>
        <div class="row"><span>Customer:</span><span class="bold">${c.name}</span></div>
        ${c.phone ? `<div class="row"><span>Phone:</span><span>${c.phone}</span></div>` : ""}
        ${c.address ? `<div class="row"><span>Address:</span><span>${c.address}</span></div>` : ""}
        <div class="divider"></div>
        <div class="row"><span>${txn.type==="credit"?"Amount taken on credit:":"Payment received:"}</span></div>
        <div class="center big">${INR(txn.amount)}</div>
        ${txn.note ? `<div class="center" style="color:#666;font-size:11px">${txn.note}</div>` : ""}
        <div class="divider"></div>
        <div class="row"><span>Total balance due:</span><span class="bold">${INR(c.total_due)}</span></div>
        <div class="proof-box">
          <div class="bold">⚠ Proof of Transaction</div>
          <div style="margin-top:4px">This receipt confirms that on ${fmtTime(txn.created_at)},
          ${txn.type==="credit"
            ? `<b>${c.name}</b> has taken goods worth <b>${INR(txn.amount)}</b> on credit from <b>${vendor?.store_name||"this store"}</b>.`
            : `<b>${c.name}</b> has paid <b>${INR(txn.amount)}</b> to <b>${vendor?.store_name||"this store"}</b>.`
          }
          Total remaining balance: <b>${INR(c.total_due)}</b></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">
          <div>
            <div class="signature">Customer signature</div>
            <div style="font-size:10px;color:#666">${c.name}</div>
          </div>
          <div>
            <div class="signature">Store signature</div>
            <div style="font-size:10px;color:#666">${vendor?.store_name||"Store"}</div>
          </div>
        </div>
        <div class="center" style="margin-top:16px">
          <button onclick="window.print()" style="background:#1D9E75;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px">
            Print Receipt
          </button>
        </div>
        <div class="center" style="margin-top:8px;font-size:10px;color:#aaa">Powered by DukaanAI</div>
      </body></html>
    `)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  // Color coding by amount
  const dueColor = due => due > 5000 ? "#E24B4A" : due > 1000 ? "#EF9F27" : "#1D9E75"

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4">
      {notif && (
        <div className="fixed top-4 right-4 bg-primary text-white px-4 py-2 rounded-xl text-xs z-50 shadow-lg animate-fade-in">
          {notif}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center"
          onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-2xl p-5 w-96 shadow-xl animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold">
                {modal==="add-customer" ? "Add Customer" :
                 modal==="credit"       ? `Add Udhar — ${selected?.name}` :
                                          `Record Payment — ${selected?.name}`}
              </h3>
              <button onClick={()=>setModal(null)} className="text-gray-300 hover:text-gray-500 text-xl">×</button>
            </div>

            {modal === "add-customer" ? (
              <div className="space-y-2.5">
                <div><label className="label">Name *</label>
                  <input className="input" value={form.name||""} onChange={e=>set("name",e.target.value)}
                    placeholder="Ravi Kumar" autoFocus /></div>
                <div><label className="label">Phone (for WhatsApp reminders)</label>
                  <input className="input" value={form.phone||""} onChange={e=>set("phone",e.target.value)}
                    placeholder="9876543210" /></div>
                <div><label className="label">Address</label>
                  <input className="input" value={form.address||""} onChange={e=>set("address",e.target.value)}
                    placeholder="Shop or house address" /></div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selected && (
                  <div className={`px-3 py-2 rounded-xl text-xs font-medium ${
                    modal==="credit" ? "bg-amber-50 text-amber-700" : "bg-primary-light text-primary-dark"
                  }`}>
                    Current balance: <strong>{INR(selected.total_due)}</strong> due
                  </div>
                )}
                <div>
                  <label className="label">Amount (₹) *</label>
                  <input className="input text-lg font-semibold" type="number" step="0.01"
                    value={form.amount||""} onChange={e=>set("amount",e.target.value)}
                    placeholder="0.00" autoFocus />
                </div>
                <div>
                  <label className="label">Note (optional)</label>
                  <input className="input" value={form.note||""} onChange={e=>set("note",e.target.value)}
                    placeholder={modal==="credit" ? "e.g. Grocery items" : "e.g. Cash payment"} />
                </div>
                {selected && form.amount && (
                  <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500">
                    New balance: <span className="font-semibold" style={{
                      color: dueColor(Math.max(0,
                        (selected.total_due||0) + (modal==="credit" ? +form.amount : -(+form.amount))
                      ))
                    }}>
                      {INR(Math.max(0, (selected.total_due||0) + (modal==="credit" ? +form.amount : -(+form.amount))))}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button onClick={save} disabled={saving}
              className={`btn w-full py-2.5 text-xs font-semibold mt-4 ${
                modal==="credit" ? "" : "btn-primary"
              }`}
              style={modal==="credit" ? { background:"#EF9F27", color:"#fff", border:"none" } : {}}>
              {saving ? "Saving..." :
               modal==="add-customer" ? "Add Customer" :
               modal==="credit"       ? "Add Udhar" :
                                        "Record Payment"}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-sticky-header flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-semibold">Udhar Khata 📒</h1>
          <p className="text-[10px] text-gray-400">Digital credit book — track who owes what</p>
        </div>
        <button onClick={() => openModal("add-customer")} className="btn btn-primary btn-sm">
          + Add Customer
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="stat-card">
          <div className="stat-bar" style={{ background:"#E24B4A" }} />
          <div className="stat-icon-box" style={{ background:"#FCEBEB" }}>💸</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1 mb-1">Total Due</div>
          <div className="text-xl font-bold" style={{ color:"#E24B4A" }}>{INR(summary.total_due)}</div>
          <div className="text-[10px] text-gray-400">To collect</div>
        </div>
        <div className="stat-card">
          <div className="stat-bar" style={{ background:"#EF9F27" }} />
          <div className="stat-icon-box" style={{ background:"#FAEEDA" }}>👥</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1 mb-1">Pending</div>
          <div className="text-xl font-bold text-gray-800">{summary.overdue_count}</div>
          <div className="text-[10px] text-gray-400">Customers with balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-bar" style={{ background:"#1D9E75" }} />
          <div className="stat-icon-box" style={{ background:"#E1F5EE" }}>📒</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1 mb-1">Total</div>
          <div className="text-xl font-bold text-gray-800">{summary.customer_count}</div>
          <div className="text-[10px] text-gray-400">Customers in khata</div>
        </div>
      </div>

      <div className="flex gap-3 flex-1 overflow-hidden min-h-0">

        {/* Left — customer list */}
        <div className="w-72 flex flex-col flex-shrink-0">
          <input className="input mb-2" placeholder="Search customer or phone..."
            value={search} onChange={e => setSearch(e.target.value)} />

          <div className="card p-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : customers.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-4xl mb-3">📒</div>
                <div className="text-xs font-medium text-gray-500 mb-1">No customers yet</div>
                <div className="text-[10px] text-gray-400 mb-4">
                  {search ? "No match found" : "Add customers who buy on credit"}
                </div>
                {!search && (
                  <button onClick={()=>openModal("add-customer")} className="btn btn-primary btn-sm">
                    + Add first customer
                  </button>
                )}
              </div>
            ) : customers.map(c => (
              <div key={c.id}
                onClick={() => selectCustomer(c)}
                className={`flex items-center gap-3 px-3 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selected?.id === c.id ? "bg-primary-light" : ""
                }`}>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: c.total_due > 5000 ? "#FCEBEB" :
                                c.total_due > 1000 ? "#FAEEDA" : "#E1F5EE",
                    color: dueColor(c.total_due)
                  }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800 truncate">{c.name}</div>
                  <div className="text-[10px] text-gray-400">
                    {c.phone || "No phone"} · {fmt(c.last_txn_at)}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold" style={{ color: dueColor(c.total_due) }}>
                    {INR(c.total_due)}
                  </div>
                  <div className="text-[9px]" style={{ color: dueColor(c.total_due) }}>
                    {c.total_due > 0 ? "due" : "clear ✓"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — customer detail */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {!selected ? (
            <div className="card h-64 flex items-center justify-center flex-col gap-3 text-center">
              <div className="text-5xl">👈</div>
              <div className="text-sm font-medium text-gray-400">Select a customer</div>
              <div className="text-xs text-gray-300 max-w-xs">
                Click any customer to see their full udhar history and collect payment
              </div>
            </div>
          ) : (
            <div className="space-y-3">

              {/* Customer header card */}
              <div className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
                      style={{
                        background: dueColor(selected.total_due) + "20",
                        color: dueColor(selected.total_due)
                      }}>
                      {selected.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-base font-bold text-gray-800">{selected.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {selected.phone || "No phone"}
                        {selected.address && <span className="ml-2">· {selected.address}</span>}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        Last transaction: {fmtTime(selected.last_txn_at)}
                      </div>
                    </div>
                  </div>

                  {/* Balance display */}
                  <div className="text-right">
                    <div className="text-[10px] text-gray-400 mb-0.5">Balance due</div>
                    <div className="text-3xl font-bold" style={{ color: dueColor(selected.total_due) }}>
                      {INR(selected.total_due)}
                    </div>
                    {selected.total_due === 0 && (
                      <div className="text-[10px] text-primary font-medium">✓ Account clear</div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button onClick={() => openModal("credit", selected)}
                    className="py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ background:"#FAEEDA", color:"#633806", border:"1px solid #FAC775" }}>
                    + Add Udhar (Credit)
                  </button>
                  <button onClick={() => openModal("payment", selected)}
                    className="btn btn-primary py-2.5 text-xs font-semibold">
                    ✓ Record Payment
                  </button>
                </div>

                {/* WhatsApp actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => sendReminder(selected)}
                    className="py-2 rounded-xl text-[10px] font-medium transition-all"
                    style={{ background:"#25D366", color:"#fff", border:"none" }}>
                    Send Reminder on WhatsApp
                  </button>
                  <button onClick={() => sendStatement(selected, txns)}
                    className="py-2 rounded-xl text-[10px] font-medium transition-all"
                    style={{ background:"#128C7E", color:"#fff", border:"none" }}>
                    Send Full Statement
                  </button>
                </div>

                <div className="flex justify-end mt-2">
                  <button onClick={e => deleteCustomer(selected, e)}
                    className="text-[10px] text-red-400 hover:text-red-600 underline">
                    Remove from Khata
                  </button>
                </div>
              </div>

              {/* Transaction history */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-gray-700">Transaction History</div>
                  {txns.length > 0 && (
                    <span className="badge badge-blue">{txns.length} entries</span>
                  )}
                </div>

                {txns.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-2xl mb-2">📭</div>
                    <div className="text-xs text-gray-400">No transactions yet</div>
                    <div className="text-[10px] text-gray-300 mt-1">
                      Add udhar or record a payment to start tracking
                    </div>
                  </div>
                ) : txns.map((t, i) => (
                  <div key={t.id}
                    className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${
                      t.type === "credit" ? "bg-amber-50" : "bg-primary-light"
                    }`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{
                        background: t.type==="credit" ? "#FAEEDA" : "#E1F5EE",
                        color:      t.type==="credit" ? "#633806" : "#085041",
                      }}>
                      {t.type === "credit" ? "📤" : "📥"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold" style={{
                        color: t.type==="credit" ? "#633806" : "#085041"
                      }}>
                        {t.type === "credit" ? "Udhar diya" : "Payment mila"}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {fmtTime(t.created_at)}
                        {t.note && <span className="ml-1">· {t.note}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold" style={{
                        color: t.type==="credit" ? "#EF9F27" : "#1D9E75"
                      }}>
                        {t.type === "credit" ? "+" : "-"}{INR(t.amount)}
                      </div>
                      <div className="flex gap-1 mt-1 justify-end">
                        {selected.phone && (
                          <button onClick={()=>sendProof(selected, t)}
                            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background:"#25D366", color:"#fff", border:"none", cursor:"pointer" }}>
                            WA Proof
                          </button>
                        )}
                        <button onClick={()=>printProof(selected, t)}
                          className="text-[9px] px-1.5 py-0.5 rounded font-medium border border-gray-200 bg-white text-gray-500 cursor-pointer">
                          Print
                        </button>
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
