import { useEffect, useState } from "react"
import { Sales, Invoices, Products } from "../sync/db"
import { getCurrentSeason } from "../data/indianCalendar.js"
import { tr, uiLang } from "../i18n/kiranaStrings"

const L = k => tr(k, uiLang())

export default function Insights() {
  const [gst,     setGst]     = useState(null)
  const [summary, setSummary] = useState(null)
  const [margins, setMargins] = useState([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  // What sells more this time of year (was a fixed "Summer" list shown all year)
  const season = getCurrentSeason()

  useEffect(() => {
    Promise.all([
      Invoices.gstSummary(now.getMonth()+1, now.getFullYear()),
      Sales.summary({ days:30 }),
      Products.list(),
    ]).then(([g, s, p]) => {
      setGst(g); setSummary(s)
      setMargins(p.map(x => ({ name:x.name, margin: x.mrp>0 ? Math.round((x.mrp-x.cost_price)/x.mrp*100) : 0 })).sort((a,b)=>b.margin-a.margin).slice(0,8))
    }).finally(() => setLoading(false))
  }, [])

  const maxRev = summary?.top_products[0]?.revenue || 1

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="page-sticky-header flex items-center justify-between mb-4">
        <h1 className="text-sm font-semibold">{L("Insights")}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {/* Demand Forecast */}
        <div className="card">
          <div className="text-xs font-medium text-gray-600 mb-3">{L("Expected demand — next 30 days")}</div>
          <div className="text-xs mb-2" style={{ color: season.color }}>{season.icon} {L(season.tip)}</div>
          <div className="flex flex-wrap gap-1.5">
            {season.products.map(p => (
              <span key={p} className="text-[11px] px-2 py-1 rounded-full font-medium"
                style={{ background: season.color + "18", color: season.color }}>↑ {L(p)}</span>
            ))}
          </div>
          <div className="text-[10px] text-gray-400 mt-2">{L(season.name + " Season")} {now.getFullYear()} — {L("based on seasonal patterns")}</div>
        </div>

        {/* GST Summary */}
        <div className="card">
          <div className="text-xs font-medium text-gray-600 mb-3">{L("GST Summary")} — {now.toLocaleString(uiLang(),{month:"long"})} {now.getFullYear()}</div>
          {loading || !gst
            ? <div className="text-xs text-gray-400">{L("Loading...")}</div>
            : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label:"Taxable Sales",  value: "₹" + (gst.taxable_sales||0).toLocaleString("en-IN") },
                    { label:"Total GST",      value: "₹" + (gst.total_gst||0).toLocaleString("en-IN"), green:true },
                    { label:"CGST",           value: "₹" + (gst.cgst_collected||0).toLocaleString("en-IN") },
                    { label:"SGST",           value: "₹" + (gst.sgst_collected||0).toLocaleString("en-IN") },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-2">
                      <div className="text-[10px] text-gray-400">{L(s.label)}</div>
                      <div className={`text-sm font-semibold ${s.green ? "text-primary" : "text-gray-800"}`}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-primary-light rounded-lg p-3">
                  <div className="text-[10px] text-primary-dark">{L("Gross Revenue")}</div>
                  <div className="text-lg font-semibold text-primary-dark">₹{(gst.gross_revenue||0).toLocaleString("en-IN")}</div>
                  <div className="text-[10px] text-primary-dark/60">{gst.invoice_count} invoices</div>
                </div>
              </div>
            )
          }
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Revenue by product */}
        <div className="card">
          <div className="text-xs font-medium text-gray-600 mb-3">{L("Top Products by Revenue (30 days)")}</div>
          {loading || !summary
            ? <div className="text-xs text-gray-400">{L("Loading...")}</div>
            : summary.top_products.length === 0
              ? <div className="text-xs text-gray-400">{L("No sales data yet")}</div>
              : summary.top_products.map(p => (
                <div key={p.name} className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-gray-500 w-28 truncate flex-shrink-0">{p.name}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: Math.round(p.revenue/maxRev*100) + "%" }} />
                  </div>
                  <span className="text-[10px] text-gray-400 w-12 text-right">₹{Math.round(p.revenue/1000)}k</span>
                </div>
              ))
          }
        </div>

        {/* Margin by product */}
        <div className="card">
          <div className="text-xs font-medium text-gray-600 mb-3">{L("Profit Margin by Product")}</div>
          {loading
            ? <div className="text-xs text-gray-400">{L("Loading...")}</div>
            : margins.length === 0
              ? <div className="text-xs text-gray-400">{L("Add products to see margins")}</div>
              : margins.map(p => (
                <div key={p.name} className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-gray-500 w-28 truncate flex-shrink-0">{p.name}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${p.margin > 20 ? "bg-primary" : p.margin > 10 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: Math.min(p.margin*2, 100) + "%" }} />
                  </div>
                  <span className="text-[10px] text-gray-400 w-8 text-right">{p.margin}%</span>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}
