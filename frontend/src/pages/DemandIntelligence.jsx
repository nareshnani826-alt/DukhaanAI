import { useEffect, useState } from "react"
import { getUpcomingFestivals, getCurrentSeason, getUrgentAlerts, SEASONS } from "../data/indianCalendar.js"
import { Products, api } from "../sync/db.js"
import { useAuth } from "../context/AuthContext.jsx"

const INR = n => "₹" + Math.round(n || 0).toLocaleString("en-IN")

const INR = n => "₹" + Math.round(n||0).toLocaleString("en-IN")

// ── News-based demand signals using Google News RSS ──────
// Free — no API key needed
async function fetchNewsDemandSignals() {
  const KEYWORDS = [
    { query:"heatwave India",        products:["ORS","Cold drinks","Lemon","Salt"],          signal:"🌡️ Heatwave alert",    color:"#E24B4A" },
    { query:"heavy rain flood India", products:["Candles","Dry foods","Tea","Biscuits"],      signal:"🌊 Flood/rain alert",  color:"#378ADD" },
    { query:"onion price India",      products:["Onion"],                                     signal:"📈 Onion price rise",  color:"#EF9F27" },
    { query:"tomato price India",     products:["Tomato"],                                    signal:"📈 Tomato price rise", color:"#EF9F27" },
    { query:"petrol diesel price",    products:["All transported goods"],                     signal:"⛽ Transport cost up", color:"#888780" },
    { query:"sugar shortage India",   products:["Sugar","Jaggery"],                           signal:"⚠ Sugar shortage",    color:"#E24B4A" },
    { query:"wheat flour shortage",   products:["Atta","Maida","Bread"],                      signal:"⚠ Flour shortage",    color:"#E24B4A" },
    { query:"cooking oil price India",products:["Sunflower oil","Palm oil","Groundnut oil"],  signal:"📈 Oil price spike",   color:"#EF9F27" },
  ]

  // Use Google News RSS to check if keywords appear in recent news
  // This is completely free — just fetching public RSS
  const signals = []
  for (const kw of KEYWORDS) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(kw.query)}&hl=en-IN&gl=IN&ceid=IN:en`
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`)
      if (!res.ok) continue
      const data = await res.json()
      const xml  = data.contents || ""
      // Count recent news items (last 3 days)
      const items = xml.match(/<pubDate>(.*?)<\/pubDate>/g) || []
      const recent = items.filter(d => {
        const date = new Date(d.replace(/<\/?pubDate>/g,""))
        return (Date.now() - date.getTime()) < 3 * 86400000
      })
      if (recent.length >= 2) { // at least 2 news items in last 3 days
        signals.push({ ...kw, count: recent.length })
      }
    } catch {}
  }
  return signals
}

// ── Vendor's own sales patterns ───────────────────────────
function getSalesPatterns(products) {
  // Simple velocity check — products selling fast should be restocked
  return products
    .filter(p => p.stock < p.min_stock * 1.5)
    .map(p => ({
      name:    p.name,
      stock:   p.stock,
      min:     p.min_stock,
      urgency: p.stock < p.min_stock * 0.3 ? "critical" : "low",
    }))
    .sort((a,b) => a.stock - b.stock)
    .slice(0, 5)
}

export default function DemandIntelligence() {
  const { vendor }  = useAuth()
  const [festivals,    setFestivals]    = useState([])
  const [season,       setSeason]       = useState(null)
  const [newsAlerts,   setNewsAlerts]   = useState([])
  const [urgentAlerts, setUrgentAlerts] = useState([])
  const [inventory,    setInventory]    = useState([])
  const [patterns,     setPatterns]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [newsLoading,  setNewsLoading]  = useState(true)
  const [tab,          setTab]          = useState("alerts")

  // velocity tab state
  const [velocity,    setVelocity]    = useState([])
  const [reorder,     setReorder]     = useState(null)
  const [velLoading,  setVelLoading]  = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const prods = await Products.list()
        setInventory(prods)
        setFestivals(getUpcomingFestivals(45))
        setSeason(getCurrentSeason())
        setUrgentAlerts(getUrgentAlerts(prods))
        setPatterns(getSalesPatterns(prods))
      } finally { setLoading(false) }

      setNewsLoading(true)
      try {
        const signals = await fetchNewsDemandSignals()
        setNewsAlerts(signals)
      } catch {}
      finally { setNewsLoading(false) }
    }
    load()
  }, [])

  // Load velocity data when tab is selected (cloud only)
  useEffect(() => {
    if (tab !== "velocity" || !vendor) return
    setVelLoading(true)
    Promise.all([
      api.get("/insights/velocity"),
      api.get("/insights/reorder?days_cover=7"),
    ]).then(([v, r]) => {
      setVelocity(v.items || [])
      setReorder(r)
    }).catch(() => {}).finally(() => setVelLoading(false))
  }, [tab, vendor?.id])

  const urgencyColor = days =>
    days === 0 ? "#E24B4A" : days <= 3 ? "#E24B4A" : days <= 7 ? "#EF9F27" : "var(--jade)"

  const urgencyLabel = days =>
    days === 0 ? "TODAY" : days === 1 ? "TOMORROW" : `${days} days`

  const allAlerts = [
    ...urgentAlerts.map(f => ({
      type:    "festival_low_stock",
      title:   `⚠ ${f.name} in ${f.daysAway} days — low stock on key items`,
      body:    `Stock up: ${f.lowItems.join(", ")}`,
      tip:     f.tip,
      color:   urgencyColor(f.daysAway),
      urgent:  f.daysAway <= 7,
      daysAway:f.daysAway,
    })),
    ...newsAlerts.map(n => ({
      type:  "news",
      title: n.signal,
      body:  `Stock up: ${n.products.join(", ")}`,
      tip:   `${n.count} news articles in last 3 days — demand likely to spike`,
      color: n.color,
      urgent:true,
    })),
    ...patterns.filter(p => p.urgency === "critical").map(p => ({
      type:  "low_stock",
      title: `🔴 ${p.name} critically low`,
      body:  `Only ${p.stock} left (min: ${p.min})`,
      tip:   "Reorder immediately before you run out",
      color: "#E24B4A",
      urgent:true,
    })),
  ].sort((a,b) => (a.daysAway||0) - (b.daysAway||0))

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      {/* Header */}
      <div className="page-sticky-header flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-semibold">Demand Intelligence 🧠</h1>
          <p className="text-[10px] text-gray-400">
            Festival alerts · News signals · Stock recommendations
          </p>
        </div>
        <span className="badge badge-green">Free · No API cost</span>
      </div>

      {/* Season banner */}
      {season && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-3"
          style={{ background: season.color + "15", border: `1px solid ${season.color}30` }}>
          <span className="text-2xl">{season.icon}</span>
          <div className="flex-1">
            <div className="text-xs font-semibold" style={{ color: season.color }}>
              {season.name} Season
            </div>
            <div className="text-[10px] text-gray-600 mt-0.5">{season.tip}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {season.products.map(p => (
                <span key={p} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: season.color + "20", color: season.color }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 border border-gray-100 flex-wrap">
        {[
          { id:"alerts",   label:`🚨 Alerts (${allAlerts.length})` },
          { id:"festivals",label:`🎉 Festivals` },
          { id:"news",     label:"📰 News" },
          { id:"patterns", label:"📊 Patterns" },
          { id:"velocity", label:"⚡ Velocity" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
              tab === t.id ? "bg-primary text-white" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ALERTS TAB ─────────────────────────────────── */}
      {tab === "alerts" && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : allAlerts.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-sm font-medium text-gray-600 mb-1">No urgent alerts right now</div>
              <div className="text-xs text-gray-400">
                No festivals in the next 7 days and no news signals detected.
                Check the Festivals tab to plan ahead for upcoming events.
              </div>
            </div>
          ) : allAlerts.map((alert, i) => (
            <div key={i} className="card animate-fade-in"
              style={{ borderLeft: `3px solid ${alert.color}`, animationDelay: `${i*0.05}s` }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: alert.color + "20", color: alert.color }}>
                  {alert.type === "festival_low_stock" ? "🎉" :
                   alert.type === "news"               ? "📰" : "⚠"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800 mb-0.5">{alert.title}</div>
                  <div className="text-[10px] text-gray-500 mb-1">{alert.body}</div>
                  <div className="text-[10px] rounded-lg px-2 py-1 inline-block"
                    style={{ background: alert.color + "15", color: alert.color }}>
                    💡 {alert.tip}
                  </div>
                </div>
                {alert.urgent && (
                  <span className="text-[9px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                    style={{ background: alert.color, color: "var(--bg1)" }}>
                    URGENT
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FESTIVALS TAB ──────────────────────────────── */}
      {tab === "festivals" && (
        <div className="space-y-3">
          {festivals.length === 0 ? (
            <div className="card text-center py-8 text-gray-400 text-xs">
              No festivals in the next 45 days
            </div>
          ) : festivals.map((fest, i) => (
            <div key={i} className="card animate-fade-in" style={{ animationDelay:`${i*0.05}s` }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold text-gray-800">{fest.name}</div>
                  <div className="text-[10px] text-gray-400">{fest.region}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: urgencyColor(fest.daysAway) }}>
                    {urgencyLabel(fest.daysAway)}
                  </div>
                  <div className="text-[9px] text-gray-400">
                    {fest.date?.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                  </div>
                </div>
              </div>

              {/* Demand boost bar */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-gray-400 w-20">Demand spike</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: fest.boost + "%",
                      background: fest.boost >= 80 ? "#E24B4A" : fest.boost >= 50 ? "#EF9F27" : "var(--jade)"
                    }} />
                </div>
                <span className="text-[10px] font-semibold w-8"
                  style={{ color: fest.boost >= 80 ? "#E24B4A" : fest.boost >= 50 ? "#EF9F27" : "var(--jade)" }}>
                  +{fest.boost}%
                </span>
              </div>

              {/* Products to stock */}
              <div className="flex flex-wrap gap-1 mb-2">
                {fest.products.map(p => {
                  const inInv = inventory.find(inv =>
                    inv.name.toLowerCase().includes(p.toLowerCase().split(" ")[0]) ||
                    p.toLowerCase().includes(inv.name.toLowerCase().split(" ")[0])
                  )
                  const isLow = inInv && inInv.stock < inInv.min_stock
                  return (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: isLow ? "#FCEBEB" : inInv ? "#E1F5EE" : "var(--bg2)",
                        color:      isLow ? "#A32D2D" : inInv ? "#085041" : "var(--ink-faint)",
                      }}>
                      {isLow ? "⚠ " : inInv ? "✓ " : ""}{p}
                    </span>
                  )
                })}
              </div>

              {/* Tip */}
              <div className="text-[10px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                💡 {fest.tip}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── NEWS TAB ───────────────────────────────────── */}
      {tab === "news" && (
        <div>
          {newsLoading ? (
            <div className="space-y-3">
              <div className="text-xs text-gray-400 text-center py-2">
                Checking latest news from India...
              </div>
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : newsAlerts.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-4xl mb-3">📰</div>
              <div className="text-sm font-medium text-gray-600 mb-1">No urgent news signals</div>
              <div className="text-xs text-gray-400 max-w-xs mx-auto">
                No major commodity price changes or weather alerts detected in the last 3 days.
                Check back daily for updates.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {newsAlerts.map((alert, i) => (
                <div key={i} className="card" style={{ borderLeft:`3px solid ${alert.color}` }}>
                  <div className="flex items-start gap-3">
                    <div className="text-xl">📰</div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-800 mb-1">{alert.signal}</div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {alert.products.map(p => (
                          <span key={p} className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: alert.color+"20", color: alert.color }}>
                            {p}
                          </span>
                        ))}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {alert.count} news articles in last 3 days · Source: Google News India
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card mt-3 bg-gray-50 border-gray-100">
            <div className="text-[10px] font-medium text-gray-500 mb-2">How news signals work</div>
            <div className="text-[10px] text-gray-400 space-y-1">
              <div>• Checks Google News India every time you open this page</div>
              <div>• Looks for heatwave, flood, price rise, shortage news</div>
              <div>• If 2+ articles in 3 days → demand spike predicted</div>
              <div>• Completely free — no API key, no subscription</div>
            </div>
          </div>
        </div>
      )}

      {/* ── PATTERNS TAB ───────────────────────────────── */}
      {tab === "patterns" && (
        <div className="space-y-3">
          <div className="card">
            <div className="text-xs font-medium text-gray-700 mb-3">
              Products running low — reorder soon
            </div>
            {loading ? (
              <div className="text-xs text-gray-400">Loading...</div>
            ) : patterns.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-2xl mb-2">✅</div>
                <div className="text-xs text-gray-400">All products have healthy stock levels</div>
              </div>
            ) : patterns.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl mb-2"
                style={{ background: p.urgency==="critical" ? "#FCEBEB" : "#FAEEDA" }}>
                <div className="text-lg">{p.urgency==="critical" ? "🔴" : "🟡"}</div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-800">{p.name}</div>
                  <div className="text-[10px] text-gray-500">
                    {p.stock} left · min stock: {p.min}
                  </div>
                </div>
                <div className="text-xs font-bold"
                  style={{ color: p.urgency==="critical" ? "#E24B4A" : "#EF9F27" }}>
                  {p.urgency==="critical" ? "Order now!" : "Order soon"}
                </div>
              </div>
            ))}
          </div>

          <div className="card mb-3">
            <div className="text-xs font-medium text-gray-700 mb-3">
              💡 Pro tip — build seasonal stock habits
            </div>
            {SEASONS.map((s, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span>{s.icon}</span>
                  <span className="text-xs font-medium" style={{ color: s.color }}>{s.name}</span>
                </div>
                <div className="text-[10px] text-gray-500 mb-1">{s.tip}</div>
                <div className="flex flex-wrap gap-1">
                  {s.products.map(p => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: s.color+"15", color: s.color }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VELOCITY TAB ───────────────────────────────── */}
      {tab === "velocity" && (
        <div className="space-y-3">
          {!vendor ? (
            <div className="card text-center py-10">
              <div className="text-4xl mb-3">🔒</div>
              <div className="text-sm font-medium text-gray-600 mb-1">Login required</div>
              <div className="text-xs text-gray-400">Sales velocity uses your live sales history. Please log in to see this.</div>
            </div>
          ) : velLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse"/>)}
            </div>
          ) : (
            <>
              {/* Smart Reorder summary */}
              {reorder && reorder.count > 0 && (
                <div className="card animate-fade-in"
                  style={{ background:"rgba(232,119,34,0.06)", border:"1.5px solid rgba(232,119,34,0.3)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-gray-800">🛒 Smart Reorder List</div>
                    <span className="text-[9px] font-bold px-2 py-1 rounded-full"
                      style={{ background:"var(--saffron)", color:"#fff" }}>
                      {reorder.count} items
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 mb-3">
                    Order these to cover 7 days of demand · Est. cost: {INR(reorder.estimated_total_cost)}
                  </div>
                  <div className="space-y-2">
                    {reorder.items.slice(0, 8).map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl"
                        style={{ background: item.urgency === "critical" ? "#FCEBEB" : "#FFF8F0" }}>
                        <span className="text-base flex-shrink-0">
                          {item.urgency === "critical" ? "🔴" : "🟠"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-800 truncate">{item.name}</div>
                          <div className="text-[10px] text-gray-500">
                            {item.days_of_stock_left != null ? `${item.days_of_stock_left}d left · ` : "Out of stock · "}
                            Selling {item.daily_rate} {item.unit}/day
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-bold"
                            style={{ color: item.urgency === "critical" ? "#c0392b" : "#d97706" }}>
                            Order {item.suggested_order_qty} {item.unit}
                          </div>
                          {item.estimated_cost > 0 && (
                            <div className="text-[10px] text-gray-400">{INR(item.estimated_cost)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Velocity list */}
              <div className="card">
                <div className="text-xs font-medium text-gray-700 mb-3">⚡ Sales Velocity — last 30 days</div>
                {velocity.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="text-xs text-gray-400">No sales in last 30 days to compute velocity.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {velocity.slice(0, 20).map((item, i) => {
                      const pct      = item.days_until_stockout != null ? Math.min(100, Math.round((item.days_until_stockout / 30) * 100)) : 100
                      const barColor = item.is_critical ? "#c0392b"
                        : item.days_until_stockout != null && item.days_until_stockout < 7 ? "#d97706"
                        : "var(--jade)"
                      return (
                        <div key={i} className="flex items-center gap-3 py-2"
                          style={{ borderBottom: i < velocity.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                          <div className="w-6 text-center flex-shrink-0">
                            {item.is_critical ? "🔴" : item.days_until_stockout != null && item.days_until_stockout < 7 ? "🟠" : "🟢"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-800 truncate">{item.name}</span>
                              <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                                {item.days_until_stockout != null ? `${item.days_until_stockout}d left` : "∞"}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: pct + "%", background: barColor }}/>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">
                              {item.daily_rate} {item.unit}/day · {item.total_qty_30d} sold in 30d · {item.stock} in stock
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {reorder?.count === 0 && (
                <div className="card text-center py-8">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-xs font-medium text-gray-600">No reorders needed</div>
                  <div className="text-[10px] text-gray-400 mt-1">All fast-moving products have 7+ days of stock</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  )
}
