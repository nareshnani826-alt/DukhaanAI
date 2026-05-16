import { useEffect, useState } from "react"
import { Products, Invoices } from "../sync/db"
import { useAuth } from "../context/AuthContext"

export default function Billing() {
  const { vendor } = useAuth()
  const [products, setProducts] = useState([])
  const [rows,     setRows]     = useState([{ prodId:"", qty:1 }])
  const [cust,     setCust]     = useState("")
  const [gstin,    setGstin]    = useState("")
  const [pay,      setPay]      = useState("Cash")
  const [date,     setDate]     = useState(new Date().toISOString().slice(0,10))
  const [invoice,  setInvoice]  = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [notif,    setNotif]    = useState("")

  useEffect(() => { Products.list().then(p => { setProducts(p); if (p.length) setRows([{ prodId:p[0].id, qty:1 }]) }) }, [])

  function showNotif(m) { setNotif(m); setTimeout(() => setNotif(""),2500) }
  const getProduct = id => products.find(p => p.id === id) || products[0]
  const setRow = (i, k, v) => setRows(r => r.map((row, ri) => ri===i ? {...row,[k]:v} : row))
  const addRow = () => setRows(r => [...r, { prodId: products[0]?.id||"", qty:1 }])
  const delRow = i => setRows(r => r.filter((_,ri) => ri!==i))

  const totals = rows.reduce((acc, row) => {
    const p = getProduct(row.prodId); if (!p) return acc
    const sub = Math.round(p.mrp * row.qty * 100)/100
    const tax = Math.round(sub * p.gst_percent/100 * 100)/100
    return { sub: acc.sub+sub, tax: acc.tax+tax }
  }, { sub:0, tax:0 })
  const grandTotal = Math.round((totals.sub + totals.tax)*100)/100

  async function generate() {
    if (!cust.trim()) return showNotif("Customer name required")
    const items = rows.map(r => { const p=getProduct(r.prodId); return p ? { name:p.name, qty:+r.qty, unit_price:p.mrp, gst_percent:p.gst_percent } : null }).filter(Boolean)
    if (!items.length) return showNotif("Add at least one item")
    setSaving(true)
    try {
      const inv = await Invoices.generate({ customer_name:cust, customer_gstin:gstin||null, payment_mode:pay, items })
      setInvoice(inv); showNotif("Invoice " + inv.invoice_no + " generated!")
    } catch(e) { showNotif(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {notif && <div className="fixed top-4 right-4 bg-primary text-white px-3 py-2 rounded-lg text-xs z-50">{notif}</div>}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-sm font-semibold">GST Billing</h1>
        <span className="badge badge-green">Auto CGST + SGST</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Form */}
        <div className="card">
          <div className="text-xs font-medium text-gray-600 mb-3">Invoice Details</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="col-span-2"><label className="label">Customer Name *</label><input className="input" value={cust} onChange={e=>setCust(e.target.value)} placeholder="Ravi Kirana Mart" /></div>
            <div><label className="label">Customer GSTIN</label><input className="input" value={gstin} onChange={e=>setGstin(e.target.value)} placeholder="Optional" /></div>
            <div><label className="label">Payment Mode</label>
              <select className="input" value={pay} onChange={e=>setPay(e.target.value)}>
                {["Cash","UPI","Credit","Cheque"].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div><label className="label">Date</label><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} /></div>
          </div>

          <div className="text-xs font-medium text-gray-600 mb-2">Items</div>
          <table className="w-full mb-2">
            <thead><tr><th className="th">Product</th><th className="th w-14">Qty</th><th className="th">Rate</th><th className="th">GST</th><th className="th">Total</th><th className="th w-6"></th></tr></thead>
            <tbody>
              {rows.map((row, i) => {
                const p = getProduct(row.prodId)
                const sub = p ? Math.round(p.mrp*row.qty*(1+p.gst_percent/100)*100)/100 : 0
                return (
                  <tr key={i}>
                    <td className="td">
                      <select className="input py-1" value={row.prodId} onChange={e=>setRow(i,"prodId",e.target.value)}>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="td"><input className="input py-1 w-14 text-center" type="number" min="1" value={row.qty} onChange={e=>setRow(i,"qty",+e.target.value||1)} /></td>
                    <td className="td text-xs">₹{p?.mrp||0}</td>
                    <td className="td text-xs">{p?.gst_percent||0}%</td>
                    <td className="td text-xs font-medium">₹{sub}</td>
                    <td className="td"><button onClick={()=>delRow(i)} className="text-red-400 hover:text-red-600 text-sm">×</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button onClick={addRow} className="btn btn-sm mb-3">+ Add item</button>

          <div className="text-right text-xs text-gray-500 mb-3">
            Subtotal: ₹{Math.round(totals.sub*100)/100} &nbsp;|&nbsp; CGST: ₹{Math.round(totals.tax/2*100)/100} &nbsp;|&nbsp; SGST: ₹{Math.round(totals.tax/2*100)/100}<br/>
            <span className="text-base font-semibold text-primary">Total: ₹{grandTotal}</span>
          </div>

          <div className="flex gap-2">
            <button onClick={generate} disabled={saving} className="btn btn-primary flex-1">{saving ? "Generating..." : "Generate Invoice"}</button>
            <button onClick={() => { setRows([{ prodId:products[0]?.id||"", qty:1 }]); setCust(""); setGstin(""); setInvoice(null) }} className="btn">Clear</button>
          </div>
        </div>

        {/* Preview */}
        <div className="card">
          <div className="text-xs font-medium text-gray-600 mb-3">Invoice Preview</div>
          {!invoice
            ? <div className="flex items-center justify-center h-48 text-xs text-gray-300">Generate an invoice to preview it here</div>
            : (
              <div className="border border-dashed border-gray-200 rounded-lg p-4 text-xs">
                <div className="text-center mb-3">
                  <div className="font-semibold text-sm">{vendor?.store_name || "DukaanAI"}</div>
                  <div className="text-[10px] text-gray-400">GSTIN: {vendor?.gstin || "—"}</div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mb-2 pb-2 border-b border-gray-100">
                  <span><b>{invoice.invoice_no}</b></span>
                  <span>{new Date(invoice.created_at).toLocaleDateString("en-IN")}</span>
                </div>
                <div className="text-[10px] mb-2">Customer: <b>{invoice.customer_name}</b>{invoice.customer_gstin && <span> | {invoice.customer_gstin}</span>}</div>
                <table className="w-full text-[10px] mb-2">
                  <thead><tr className="bg-gray-50"><th className="text-left p-1">Item</th><th className="p-1 text-center">Qty</th><th className="p-1 text-right">Total</th></tr></thead>
                  <tbody>{invoice.items.map((it,i) => <tr key={i}><td className="p-1">{it.name}</td><td className="p-1 text-center">{it.qty}</td><td className="p-1 text-right">₹{it.total}</td></tr>)}</tbody>
                </table>
                <div className="text-right text-[10px] text-gray-500 border-t border-gray-100 pt-2">
                  CGST: ₹{invoice.cgst} | SGST: ₹{invoice.sgst}<br/>
                  <span className="text-sm font-semibold text-primary">Grand Total: ₹{invoice.total}</span>
                </div>
                <button onClick={() => window.print()} className="btn btn-sm w-full mt-3">🖨 Print Invoice</button>
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}
