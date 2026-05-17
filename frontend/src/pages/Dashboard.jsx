import { useEffect, useState } from "react"
import { Products, Sales } from "../sync/db"
import { useAuth } from "../context/AuthContext"

const INR = n => "₹" + (n||0).toLocaleString("en-IN")

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

export default function Dashboard() {
  const { vendor, cloud } = useAuth()
  const [today,   setToday]   = useState({ total:0, count:0, sales:[] })
  const [summary, setSummary] = useState({ total_revenue:0, top_products:[], transaction_count:0 })
  const [low,     setLow]     = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([Sales.today(), Sales.summary({days:30}), Products.lowStock(), Products.list()])
      .then(([t,s,l,p]) => { setToday(t); setSummary(s); setLow(l); setTotal(p.length) })
      .finally(() => setLoading(false))
  }, [cloud])

  const avgInvoice = today.count > 0 ? Math.round(today.total / today.count) : 0
  const maxRev     = summary.top_products[0]?.revenue || 1

  const stats = [
    { label:"Today's Sales",   value: INR(today.total),               sub: `${today.count} invoices`,        color:"#1D9E75", bg:"#E1F5EE",  icon:"💰" },
    { label:"Total Products",  value: total,                          sub: low.length > 0 ? `${low.length} low stock` : "All stocked", color:"#378ADD", bg:"#E6F1FB",  icon:"📦" },
    { label:"Avg Invoice",     value: INR(avgInvoice),                sub: "Per transaction",                color:"#EF9F27", bg:"#FAEEDA",  icon:"🧾" },
    { label:"Monthly Revenue", value: INR(summary.total_revenue||0),  sub: "Last 30 days",                   color:"#7F77DD", bg:"#EEEDFE",  icon:"📈" },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-gray-900">
            {greeting()}{vendor?.store_name ? `, ${vendor.store_name.split(" ")[0]}` : ""}! 👋
          </h1>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          </p>
        </div>
        <div className="flex gap-2">
          {low.length > 0 && (
            <span className="badge badge-red animate-fade-in">
              ⚠ {low.length} low stock
            </span>
          )}
          <span className={`badge ${cloud ? "badge-green" : "badge-blue"}`}>
            {cloud ? "● Cloud sync" : "● Local"}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {stats.map((s,i) => (
          <div key={s.label} className="stat-card animate-fade-in" style={{ animationDelay:`${i*0.05}s` }}>
            <div className="stat-bar" style={{ background:s.color }} />
            <div className="stat-icon-box" style={{ background:s.bg }}>{s.icon}</div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1 mb-1">{s.label}</div>
            <div className="text-xl font-bold text-gray-900">{loading ? "—" : s.value}</div>
            <div className="text-[10px] text-gray-400 mt-0.5" style={{ color: s.label==="Total Products" && low.length > 0 ? "#dc2626" : undefined }}>
              {loading ? "..." : s.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Low stock alerts */}
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-700">Reorder Alerts</div>
            {low.length > 0 && <span className="badge badge-red">{low.length} urgent</span>}
          </div>
          {loading ? <Skeleton rows={3} /> : low.length === 0 ? (
            <div className="flex items-center gap-2 py-3 text-xs text-primary">
              <span className="text-lg">✓</span> All stock levels healthy!
            </div>
          ) : low.slice(0,5).map(p => (
            <div key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-1.5 text-xs ${
              p.stock < p.min_stock*0.3 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
            }`}>
              <span>{p.stock <= 0 ? "🔴" : "🟡"}</span>
              <span className="flex-1 font-medium truncate">{p.name}</span>
              <span className="font-semibold">{p.stock} left</span>
            </div>
          ))}
        </div>

        {/* Top sellers */}
        <div className="card animate-slide-up" style={{ animationDelay:"0.05s" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-gray-700">Top Sellers</div>
            <span className="badge badge-blue">30 days</span>
          </div>
          {loading ? <Skeleton rows={4} /> : summary.top_products.length === 0 ? (
            <div className="text-xs text-gray-400 py-3">No sales recorded yet</div>
          ) : summary.top_products.slice(0,5).map(p => (
            <div key={p.name} className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-gray-500 w-24 truncate flex-shrink-0">{p.name}</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width:Math.round(p.revenue/maxRev*100)+"%", background:"#1D9E75" }} />
              </div>
              <span className="text-[10px] text-gray-400 w-14 text-right flex-shrink-0">
                {INR(p.revenue)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent sales */}
      <div className="card animate-slide-up" style={{ animationDelay:"0.1s" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-gray-700">Recent Sales</div>
          <span className="badge badge-green">● Live</span>
        </div>
        {loading ? <Skeleton rows={5} /> : (
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="th">Product</th>
                <th className="th">Customer</th>
                <th className="th">Qty</th>
                <th className="th text-right">Amount</th>
                <th className="th text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {today.sales.length === 0 ? (
                <tr><td colSpan="5" className="td text-center py-6 text-gray-400">
                  No sales today yet — start billing!
                </td></tr>
              ) : today.sales.slice(0,8).map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="td font-medium">{s.product_name}</td>
                  <td className="td text-gray-500">{s.customer}</td>
                  <td className="td">{s.qty}</td>
                  <td className="td text-right font-semibold" style={{ color:"#1D9E75" }}>
                    {INR(s.total)}
                  </td>
                  <td className="td text-right text-gray-400">
                    {new Date(s.sold_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-2">
      {Array(rows).fill(0).map((_,i) => (
        <div key={i} className="h-8 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}
