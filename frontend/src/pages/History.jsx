import { useState, useEffect } from "react"
import { Sales, Invoices } from "../sync/db.js"

const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })

function fmt(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) +
    " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
}

function groupByDate(items, dateKey) {
  const groups = {}
  for (const item of items) {
    const day = new Date(item[dateKey]).toLocaleDateString("en-IN", { weekday:"short", day:"2-digit", month:"short", year:"numeric" })
    if (!groups[day]) groups[day] = []
    groups[day].push(item)
  }
  return groups
}

const DAYS_OPTIONS = [
  { label: "Today",   value: 1  },
  { label: "7 days",  value: 7  },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
]

// ── Sales History tab ─────────────────────────────────────
function SalesTab() {
  const [sales,   setSales]   = useState([])
  const [days,    setDays]    = useState(7)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Sales.list({ days, limit: 500 })
      .then(setSales)
      .finally(() => setLoading(false))
  }, [days])

  const total   = sales.reduce((s, x) => s + (x.total || 0), 0)
  const grouped = groupByDate(sales, "sold_at")

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", gap:6 }}>
          {DAYS_OPTIONS.map(opt => (
            <button key={opt.value}
              onClick={() => setDays(opt.value)}
              style={{
                padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:500,
                border: days === opt.value ? "none" : "1px solid #e5e7eb",
                background: days === opt.value ? "var(--jade)" : "#fff",
                color: days === opt.value ? "#fff" : "#374151",
                cursor:"pointer",
              }}>
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize:12, fontWeight:600, color:"var(--jade)" }}>
          {sales.length} sales · {INR(total)}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:"#9ca3af", fontSize:13 }}>Loading...</div>
      ) : sales.length === 0 ? (
        <div style={{ textAlign:"center", padding:40, color:"#9ca3af", fontSize:13 }}>No sales in this period</div>
      ) : (
        Object.entries(grouped).map(([day, items]) => (
          <div key={day} style={{ marginBottom:16 }}>
            <div style={{
              fontSize:10, fontWeight:600, color:"#6b7280", textTransform:"uppercase",
              letterSpacing:"0.05em", marginBottom:6, padding:"0 2px"
            }}>{day}</div>
            <div style={{ background:"#fff", borderRadius:10, overflow:"hidden", border:"1px solid #f3f4f6" }}>
              {items.map((s, i) => (
                <div key={s.id} style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"10px 14px",
                  borderBottom: i < items.length - 1 ? "1px solid #f9fafb" : "none",
                }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"#111827", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {s.product_name}
                    </div>
                    <div style={{ fontSize:10, color:"#9ca3af", marginTop:2 }}>
                      {s.qty} × {INR(s.unit_price)} · {s.payment_mode || "Cash"} · {fmt(s.sold_at)}
                    </div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--jade)", marginLeft:12, whiteSpace:"nowrap" }}>
                    {INR(s.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── Bill / Invoice History tab ────────────────────────────
function BillsTab() {
  const [invoices, setInvoices] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    setLoading(true)
    Invoices.list()
      .then(setInvoices)
      .finally(() => setLoading(false))
  }, [])

  const total   = invoices.reduce((s, x) => s + (x.total || 0), 0)
  const grouped = groupByDate(invoices, "created_at")

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:600, color:"var(--jade)" }}>
          {invoices.length} bills · {INR(total)}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:"#9ca3af", fontSize:13 }}>Loading...</div>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign:"center", padding:40, color:"#9ca3af", fontSize:13 }}>No bills generated yet</div>
      ) : (
        Object.entries(grouped).map(([day, items]) => (
          <div key={day} style={{ marginBottom:16 }}>
            <div style={{
              fontSize:10, fontWeight:600, color:"#6b7280", textTransform:"uppercase",
              letterSpacing:"0.05em", marginBottom:6, padding:"0 2px"
            }}>{day}</div>
            <div style={{ background:"#fff", borderRadius:10, overflow:"hidden", border:"1px solid #f3f4f6" }}>
              {items.map((inv, i) => (
                <div key={inv.id}>
                  <div
                    onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
                    style={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"10px 14px", cursor:"pointer",
                      borderBottom: (expanded !== inv.id && i < items.length - 1) ? "1px solid #f9fafb" : "none",
                      background: expanded === inv.id ? "#f9fafb" : "transparent",
                    }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:"#374151" }}>{inv.invoice_no}</span>
                        <span style={{
                          fontSize:9, padding:"2px 7px", borderRadius:20, fontWeight:600,
                          background: inv.payment_mode === "Cash" ? "#ecfdf5" : inv.payment_mode === "UPI" ? "#eff6ff" : "#fefce8",
                          color: inv.payment_mode === "Cash" ? "#059669" : inv.payment_mode === "UPI" ? "#2563eb" : "#92400e",
                        }}>{inv.payment_mode}</span>
                      </div>
                      <div style={{ fontSize:10, color:"#9ca3af", marginTop:2 }}>
                        {inv.customer_name || "Walk-in"} · {fmt(inv.created_at)}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"var(--jade)" }}>{INR(inv.total)}</div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                        style={{ transform: expanded === inv.id ? "rotate(180deg)" : "none", transition:"transform 0.2s" }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </div>

                  {/* Expanded line items */}
                  {expanded === inv.id && (
                    <div style={{ background:"#f9fafb", borderBottom: i < items.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <div style={{ padding:"8px 14px 4px", fontSize:10, color:"#6b7280", fontWeight:600 }}>ITEMS</div>
                      {(inv.items || []).map((item, j) => (
                        <div key={j} style={{
                          display:"flex", justifyContent:"space-between", padding:"5px 14px",
                          fontSize:11, borderBottom: j < inv.items.length - 1 ? "1px solid #f3f4f6" : "none",
                        }}>
                          <span style={{ color:"#374151" }}>{item.name}</span>
                          <span style={{ color:"#6b7280" }}>{item.qty} × {INR(item.unit_price)}</span>
                          <span style={{ fontWeight:600, color:"#111827" }}>{INR(item.total)}</span>
                        </div>
                      ))}
                      <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 14px", borderTop:"1px solid #e5e7eb" }}>
                        <span style={{ fontSize:10, color:"#6b7280" }}>Subtotal · GST ({INR(inv.cgst + inv.sgst)})</span>
                        <span style={{ fontSize:12, fontWeight:700, color:"var(--jade)" }}>{INR(inv.total)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────
export default function History() {
  const [tab, setTab] = useState("sales")

  return (
    <div style={{ maxWidth:600, margin:"0 auto", padding:"0 4px 80px" }}>
      {/* Header */}
      <div className="page-sticky-header mb-4">
        <h1 style={{ fontSize:14, fontWeight:700, margin:0 }}>History</h1>
      </div>

      {/* Tabs */}
      <div style={{
        display:"flex", background:"#f3f4f6", borderRadius:10, padding:3, marginBottom:16, gap:3,
      }}>
        {[["sales","Sales History"],["bills","Bill History"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex:1, padding:"7px 0", borderRadius:8, border:"none", cursor:"pointer",
            fontSize:12, fontWeight:600,
            background: tab === key ? "#fff" : "transparent",
            color: tab === key ? "var(--jade)" : "#6b7280",
            boxShadow: tab === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition:"all 0.15s",
          }}>{label}</button>
        ))}
      </div>

      {tab === "sales" ? <SalesTab /> : <BillsTab />}
    </div>
  )
}
