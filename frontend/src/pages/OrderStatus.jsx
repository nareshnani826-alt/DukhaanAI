// Public order status — the customer's phone checks every few seconds: New → Accepted → Ready.
import { useEffect, useState } from "react"
import { useParams, useSearchParams, Link } from "react-router-dom"
import { API_BASE } from "../sync/db"
import { Shell } from "./ShopOrder"

const INR = n => "₹" + (Math.round((+n || 0) * 100) / 100).toLocaleString("en-IN")
const STEPS = [
  { key:"new",      label:"Order sent",  sub:"Waiting for the shop to accept" },
  { key:"accepted", label:"Accepted",    sub:"The shop is preparing your order" },
  { key:"ready",    label:"Ready",       sub:"" },
]

export default function OrderStatus() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const token = params.get("t") || ""
  const shopCode = params.get("s") || ""
  const [o, setO] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let stop = false, timer
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/public/orders/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`)
        const d = await r.json()
        if (!r.ok) throw new Error(d.detail || "Order not found")
        if (!stop) { setO(d); setError("") }
        if (["done", "rejected", "cancelled"].includes(d.status)) return   // final — stop checking
      } catch (e) { if (!stop) setError(e.message) }
      if (!stop) timer = setTimeout(load, 5000)
    }
    load()
    return () => { stop = true; clearTimeout(timer) }
  }, [id, token])

  if (error && !o) return <Shell><div style={{ padding:"80px 24px", textAlign:"center", fontWeight:700 }}>{error}</div></Shell>
  if (!o) return <Shell><div style={{ padding:80, textAlign:"center", color:"#7a6555" }}>Loading…</div></Shell>

  const idx = o.status === "done" ? 3 : STEPS.findIndex(s => s.key === o.status)
  const readyText = o.mode === "table" ? `Coming to Table ${o.table_label}` : "Please collect it at the counter"
  const rejected = o.status === "rejected" || o.status === "cancelled"

  return (
    <Shell>
      <div style={{ padding:"28px 18px 10px", textAlign:"center" }}>
        <div style={{ fontSize:14, color:"#7a6555", fontWeight:700 }}>{o.store_name}</div>
        <div style={{ fontSize:26, fontWeight:900, marginTop:4 }}>Order #{o.order_no}</div>
        {o.mode === "table" && <div style={{ fontSize:14, fontWeight:700, color:"#c25500", marginTop:4 }}>Table {o.table_label}</div>}
      </div>

      {rejected ? (
        <div style={{ margin:"10px 16px", padding:18, borderRadius:16, background:"#fdecea", border:"1px solid #f5c6c0", textAlign:"center" }}>
          <div style={{ fontSize:34 }}>😔</div>
          <div style={{ fontSize:17, fontWeight:800, color:"#a93226", marginTop:6 }}>The shop couldn't take this order</div>
          {o.reject_reason && <div style={{ fontSize:14, color:"#7a6555", marginTop:6 }}>{o.reject_reason}</div>}
        </div>
      ) : o.status === "done" ? (
        <div style={{ margin:"10px 16px", padding:18, borderRadius:16, background:"#e8f7f1", border:"1px solid #bfe9d8", textAlign:"center" }}>
          <div style={{ fontSize:34 }}>✅</div>
          <div style={{ fontSize:17, fontWeight:800, color:"#137a5a", marginTop:6 }}>Completed — thank you!</div>
        </div>
      ) : (
        <div style={{ margin:"10px 16px", background:"#fff", borderRadius:16, border:"1px solid #f0e2d3", padding:"6px 16px" }}>
          {STEPS.map((s, i) => {
            const on = i <= idx, now = i === idx
            return (
              <div key={s.key} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"12px 0", borderBottom: i < 2 ? "1px dashed #f0e2d3" : "none" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                  background: on ? "#1D9E75" : "#eee", color:"#fff", fontWeight:900, fontSize:14,
                  boxShadow: now ? "0 0 0 5px rgba(29,158,117,.18)" : "none" }}>{on ? "✓" : i + 1}</div>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color: on ? "#1f1208" : "#aaa" }}>{s.label}</div>
                  {now && <div style={{ fontSize:13, color:"#7a6555", marginTop:2 }}>{s.key === "ready" ? readyText : s.sub}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ margin:"12px 16px", background:"#fff", borderRadius:16, border:"1px solid #f0e2d3", padding:"8px 16px" }}>
        {(o.items || []).map((l, i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", fontSize:14 }}>
            <span>{l.name} × {l.qty}</span><span style={{ fontWeight:700 }}>{INR(l.amount ?? l.price * l.qty)}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0 6px", borderTop:"1px solid #f0e2d3", fontSize:16, fontWeight:900 }}>
          <span>Total</span><span>{INR(o.total)}</span>
        </div>
        <div style={{ fontSize:12, color:"#7a6555", paddingBottom:6 }}>Pay at the counter — cash or UPI</div>
      </div>

      {!["new", "accepted", "ready"].includes(o.status) || rejected ? null : (
        <div style={{ textAlign:"center", fontSize:12, color:"#7a6555", margin:"6px 0" }}>This page updates by itself — keep it open.</div>
      )}
      {shopCode && (
        <div style={{ textAlign:"center", margin:"14px 0" }}>
          <Link to={`/s/${shopCode}${o.mode === "table" && o.table_label ? `?t=${encodeURIComponent(o.table_label)}` : ""}`}
            style={{ color:"#c25500", fontWeight:800, fontSize:14, textDecoration:"none" }}>+ Order something else</Link>
        </div>
      )}
    </Shell>
  )
}
