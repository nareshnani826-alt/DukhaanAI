import { useEffect, useState } from "react"
import { Products, Sales } from "../sync/db"
import { useAuth } from "../context/AuthContext"

export default function Dashboard() {
  const { cloud } = useAuth()
  const [today,   setToday]   = useState({ total:0, count:0, sales:[] })
  const [summary, setSummary] = useState({ total_revenue:0, top_products:[] })
  const [low,     setLow]     = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([Sales.today(), Sales.summary({ days:30 }), Products.lowStock(), Products.list()])
      .then(([t, s, l, p]) => { setToday(t); setSummary(s); setLow(l); setTotal(p.length) })
      .finally(() => setLoading(false))
  }, [cloud])

  const maxU = summary.top_products[0]?.units || 1

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-semibold">Dashboard</h1>
          <p className="text-[10px] text-gray-400">Welcome back — here's today's overview</p>
        </div>
        <span className={`badge ${cloud ? "badge-green" : "badge-blue"}`}>{cloud ? "Cloud sync" : "Local mode"}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {[
          { label:"Today's Sales",   value: loading ? "—" : "₹" + today.total.toLocaleString("en-IN"),           sub: today.count + " transactions" },
          { label:"Total Products",  value: loading ? "—" : total,                                                sub: "In inventory" },
          { label:"Low Stock",       value: loading ? "—" : low.length,                                           sub: "Need reorder", red: low.length > 0 },
          { label:"Monthly Revenue", value: loading ? "—" : "₹" + (summary.total_revenue||0).toLocaleString("en-IN"), sub: "Last 30 days" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="text-[10px] text-gray-400 mb-1">{s.label}</div>
            <div className={`text-xl font-semibold ${s.red ? "text-red-600" : "text-gray-900"}`}>{s.value}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Alerts */}
        <div className="card">
          <div className="text-xs font-medium text-gray-600 mb-2.5">⚠ Reorder Alerts</div>
          {loading ? <Skeleton /> : low.length === 0
            ? <div className="text-xs text-gray-400 py-2">✓ All stock levels healthy!</div>
            : low.slice(0,4).map(p => (
              <div key={p.id} className={`flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg mb-1.5 ${p.stock < p.min_stock*0.3 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                <span>{p.stock < p.min_stock*0.3 ? "🔴" : "🟡"}</span>
                <span className="flex-1 truncate">{p.name}</span>
                <span className="font-medium">{p.stock} left</span>
              </div>
            ))
          }
        </div>

        {/* Top sellers */}
        <div className="card">
          <div className="text-xs font-medium text-gray-600 mb-2.5">↑ Top Sellers (30 days)</div>
          {loading ? <Skeleton /> : summary.top_products.length === 0
            ? <div className="text-xs text-gray-400 py-2">No sales recorded yet</div>
            : summary.top_products.slice(0,5).map(p => (
              <div key={p.name} className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] text-gray-500 w-28 truncate">{p.name}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: Math.round(p.units/maxU*100) + "%" }} />
                </div>
                <span className="text-[10px] text-gray-400 w-8 text-right">{p.units}u</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Recent sales */}
      <div className="card">
        <div className="text-xs font-medium text-gray-600 mb-2.5">Recent Sales</div>
        {loading ? <Skeleton /> : (
          <table className="w-full">
            <thead><tr><th className="th">Product</th><th className="th">Customer</th><th className="th">Qty</th><th className="th">Amount</th><th className="th">Time</th></tr></thead>
            <tbody>
              {today.sales.length === 0
                ? <tr><td colSpan="5" className="td text-center text-gray-400 py-4">No sales today yet</td></tr>
                : today.sales.slice(0,8).map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="td font-medium">{s.product_name}</td>
                    <td className="td text-gray-500">{s.customer}</td>
                    <td className="td">{s.qty}</td>
                    <td className="td text-primary font-medium">₹{s.total.toLocaleString("en-IN")}</td>
                    <td className="td text-gray-400">{new Date(s.sold_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Skeleton() {
  return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-7 bg-gray-100 rounded animate-pulse" />)}</div>
}
