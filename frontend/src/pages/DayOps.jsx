import { useEffect, useState, useCallback } from "react"
import { api, isCloud } from "../sync/db.js"
import { useAuth } from "../context/AuthContext.jsx"
import { Products, Sales } from "../sync/db.js"

const INR = n => "₹" + Math.round(n || 0).toLocaleString("en-IN")
const PCT = n => (n > 0 ? "+" : "") + Math.round(n || 0) + "%"

function fmt(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

function fmtDate(iso) {
  return new Date(iso || Date.now()).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  })
}

// WhatsApp reorder message
function buildReorderWA(lowStock, storeName) {
  const lines = lowStock.map(p =>
    `  • ${p.name} — only ${p.stock} ${p.unit || "units"} left (min: ${p.min_stock})`
  ).join("\n")
  return `🚨 *Low Stock Alert — ${storeName || "DukaanAI"}*\n` +
    `Date: ${fmtDate()}\n\n` +
    `Please reorder these items:\n${lines}\n\n` +
    `_Sent from DukaanAI_`
}

// ── Local fallback (free plan) ────────────────────────────
async function localOpenDay(products) {
  const snapshot = products.map(p => ({
    id: p.id, name: p.name, sku: p.sku, category: p.category,
    unit: p.unit, stock: p.stock, min_stock: p.min_stock,
    mrp: p.mrp, cost_price: p.cost_price,
  }))
  const session = {
    id: "local-day-" + Date.now(),
    date: new Date().toISOString().slice(0, 10),
    opened_at: new Date().toISOString(),
    opening_stock: snapshot,
    status: "open",
    total_stock_value: snapshot.reduce((s, p) => s + p.stock * (p.cost_price || 0), 0),
    product_count: snapshot.length,
  }
  localStorage.setItem("dk_day_session", JSON.stringify(session))
  return session
}

async function localCloseDay(todaySales, products) {
  const raw = localStorage.getItem("dk_day_session")
  const session = raw ? JSON.parse(raw) : null
  const openStock = session?.opening_stock || []
  const costMap = Object.fromEntries(openStock.map(p => [p.id, p.cost_price || 0]))

  const revenue = todaySales.total
  const cogs    = (todaySales.sales || []).reduce((s, sale) =>
    s + sale.qty * (costMap[sale.product_id] || 0), 0)
  const profit  = Math.round((revenue - cogs) * 100) / 100

  const closingSnapshot = products.map(p => ({
    id: p.id, name: p.name, unit: p.unit, stock: p.stock, min_stock: p.min_stock,
    mrp: p.mrp, cost_price: p.cost_price,
  }))
  const lowStock = closingSnapshot.filter(p => p.stock < p.min_stock)

  const closed = {
    ...(session || {}),
    closed_at: new Date().toISOString(),
    closing_stock: closingSnapshot,
    total_sales:   revenue,
    total_invoices: todaySales.count,
    gross_profit:  profit,
    low_stock_items: lowStock,
    status: "closed",
  }
  localStorage.setItem("dk_day_session", JSON.stringify(closed))
  return closed
}

function localGetSession() {
  const raw = localStorage.getItem("dk_day_session")
  if (!raw) return null
  const s = JSON.parse(raw)
  if (s.date !== new Date().toISOString().slice(0, 10)) return null
  return s
}

export default function DayOps() {
  const { vendor } = useAuth()
  const [session,   setSession]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [acting,    setActing]    = useState(false)
  const [products,  setProducts]  = useState([])
  const [todaySales,setTodaySales]= useState(null)
  const [notif,     setNotif]     = useState("")
  const [sound,     setSound]     = useState(true)
  const [view,      setView]      = useState("main") // main | history | stock

  function showNotif(m) { setNotif(m); setTimeout(() => setNotif(""), 4000) }

  function playAlert(type = "open") {
    if (!sound) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const play = (freq, start, dur) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
        gain.gain.setValueAtTime(0.25, ctx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + dur)
      }
      if (type === "open") {
        // Upbeat open chime — rising tones
        play(523, 0,    0.15)
        play(659, 0.15, 0.15)
        play(784, 0.30, 0.3)
      } else if (type === "close") {
        // Closing bell — descending, peaceful
        play(784, 0,    0.2)
        play(659, 0.2,  0.2)
        play(523, 0.4,  0.4)
      } else if (type === "alert") {
        // Urgent alert — for low stock
        play(880, 0,    0.1)
        play(880, 0.15, 0.1)
        play(880, 0.30, 0.15)
      }
    } catch {}
  }

  async function load() {
    setLoading(true)
    try {
      const [prods, today] = await Promise.all([
        Products.list(),
        Sales.today(),
      ])
      setProducts(prods)
      setTodaySales(today)

      const sess = isCloud()
        ? await api.get("/day-sessions/today").catch(() => null)
        : localGetSession()
      setSession(sess)
    } finally {
      setLoading(false)
    }
  }

  // Auto-prompt: show open day nudge if not opened yet
  useEffect(() => {
    load().then(() => {
      const sess = isCloud()
        ? null  // checked inside load()
        : localGetSession()
      // Nudge after 3 seconds if day not opened
      setTimeout(() => {
        if (!sess) {
          showNotif("👋 Don't forget to open today's day to track stock & profit!")
        }
      }, 3000)
    })
  }, [])

  async function openDay() {
    setActing(true)
    try {
      const sess = isCloud()
        ? await api.post("/day-sessions/open", {})
        : await localOpenDay(products)
      setSession(sess)
      playAlert("open")
      showNotif("✓ Day opened! Stock snapshot taken.")
    } catch(e) { showNotif("Error: " + e.message) }
    finally { setActing(false) }
  }

  async function closeDay() {
    if (!confirm("Close today's day? This will record your final stock and profits.")) return
    setActing(true)
    try {
      const sess = isCloud()
        ? await api.post("/day-sessions/close", {})
        : await localCloseDay(todaySales, products)
      setSession(sess)
      playAlert("close")
      showNotif("✓ Day closed! Summary ready.")

      // Low stock alert notification
      const low = sess.low_stock_items || []
      if (low.length > 0) {
        setTimeout(() => { playAlert("alert"); showNotif(`⚠ ${low.length} items need reorder — see below!`) }, 1500)
      }
    } catch(e) { showNotif("Error: " + e.message) }
    finally { setActing(false) }
  }

  function sendLowStockWhatsApp() {
    const low = session?.low_stock_items || []
    if (!low.length) return
    const msg = buildReorderWA(low, vendor?.store_name)
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
  }

  function sendCloseWhatsApp() {
    if (!session) return
    const low = session.low_stock_items || []
    const msg =
`📊 *Day Close Report — ${vendor?.store_name || "DukaanAI"}*
Date: ${fmtDate(session.date)}

💰 Today's Sales: ${INR(session.total_sales)}
🧾 Invoices: ${session.total_invoices}
📈 Gross Profit: ${INR(session.gross_profit)}

${low.length > 0 ? `⚠ Low Stock (${low.length} items):\n${low.map(p => `  • ${p.name} — ${p.stock} ${p.unit||"units"} left`).join("\n")}` : "✅ All stock levels healthy"}

_Sent from DukaanAI_`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
  }

  // ── Opening stock value ───────────────────────────────────
  const openingValue = session?.opening_stock
    ? session.opening_stock.reduce((s, p) => s + (p.stock || 0) * (p.cost_price || 0), 0)
    : products.reduce((s, p) => s + p.stock * (p.cost_price || 0), 0)

  const closingValue = session?.closing_stock
    ? session.closing_stock.reduce((s, p) => s + (p.stock || 0) * (p.cost_price || 0), 0)
    : null

  const isOpen   = session?.status === "open"
  const isClosed = session?.status === "closed"
  const notOpened = !session

  const profitPct = session?.total_sales > 0
    ? Math.round((session.gross_profit / session.total_sales) * 100)
    : 0

  const lowStock  = products.filter(p => p.stock < p.min_stock)
  const lowAtClose = session?.low_stock_items || []

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {notif && (
        <div className="fixed top-4 right-4 bg-primary text-white px-4 py-2.5 rounded-lg text-xs z-50 shadow-lg max-w-xs">
          {notif}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-semibold">Day Operations</h1>
          <p className="text-[10px] text-gray-400">{fmtDate()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSound(s => !s)}
            className={`text-[10px] px-2 py-1 rounded border ${sound ? "border-primary text-primary bg-primary-light" : "border-gray-200 text-gray-400"}`}>
            {sound ? "🔔 Sound ON" : "🔕 Sound OFF"}
          </button>
          <button onClick={load} className="btn btn-sm text-gray-500">↺ Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-xs text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-3">

          {/* ── DAY STATUS CARD ──────────────────────────── */}
          <div className={`rounded-2xl p-5 ${
            isClosed  ? "bg-gray-50 border border-gray-200" :
            isOpen    ? "bg-primary-light border border-primary/20" :
                        "bg-amber-50 border border-amber-200"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className={`text-base font-semibold ${
                  isClosed ? "text-gray-700" : isOpen ? "text-primary-dark" : "text-amber-700"
                }`}>
                  {isClosed ? "Day Closed" : isOpen ? "Day is Open" : "Day Not Started"}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {isClosed  ? `Opened ${fmt(session.opened_at)} · Closed ${fmt(session.closed_at)}` :
                   isOpen    ? `Opened at ${fmt(session.opened_at)}` :
                               "Tap 'Open Day' to start tracking"}
                </div>
              </div>

              <div className="flex gap-2">
                {notOpened && (
                  <button onClick={openDay} disabled={acting}
                    className="btn btn-primary px-5 py-2 text-xs font-semibold">
                    {acting ? "Opening..." : "Open Day"}
                  </button>
                )}
                {isOpen && (
                  <>
                    <button onClick={load} className="btn btn-sm">Refresh</button>
                    <button onClick={closeDay} disabled={acting}
                      className="btn px-5 py-2 text-xs font-semibold"
                      style={{ background:"#185FA5", color:"var(--bg1)", border:"none" }}>
                      {acting ? "Closing..." : "Close Day"}
                    </button>
                  </>
                )}
                {isClosed && (
                  <div className="flex gap-2">
                    <button onClick={sendCloseWhatsApp}
                      className="btn btn-sm py-1.5 text-[10px] font-medium"
                      style={{ background:"#25D366", color:"var(--bg1)", border:"none" }}>
                      Share Report
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats grid */}
            {(isOpen || isClosed) && (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label:"Opening Stock Value", value: INR(openingValue),        sub: `${session?.opening_stock?.length || products.length} products` },
                  { label:"Today's Sales",        value: INR(session?.total_sales || todaySales?.total), sub: `${session?.total_invoices || todaySales?.count || 0} invoices`, green: true },
                  { label:"Gross Profit",         value: INR(session?.gross_profit || 0), sub: `${profitPct}% margin`, green: (session?.gross_profit || 0) > 0 },
                  { label:isClosed ? "Closing Stock Value" : "Current Stock Value",
                    value: INR(closingValue ?? openingValue),
                    sub: isClosed ? "end of day" : "live" },
                ].map(s => (
                  <div key={s.label} className="bg-white/70 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-gray-400 mb-1">{s.label}</div>
                    <div className={`text-sm font-semibold ${s.green ? "text-primary" : "text-gray-800"}`}>
                      {s.value}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── LOW STOCK ALERT BOX ───────────────────────── */}
          {(lowStock.length > 0 || lowAtClose.length > 0) && (
            <div className="card border-red-200 bg-red-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚠</span>
                  <span className="text-xs font-semibold text-red-700">
                    {isClosed
                      ? `${lowAtClose.length} items need reorder — order before tomorrow!`
                      : `${lowStock.length} items currently low on stock`}
                  </span>
                </div>
                <button onClick={sendLowStockWhatsApp}
                  className="btn btn-sm text-[10px] font-medium"
                  style={{ background:"#25D366", color:"var(--bg1)", border:"none" }}>
                  Send Reorder List on WhatsApp
                </button>
              </div>
              <div className="space-y-1.5">
                {(isClosed ? lowAtClose : lowStock).map(p => (
                  <div key={p.id||p.name}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                      p.stock <= 0 ? "bg-red-100" :
                      p.stock < p.min_stock * 0.3 ? "bg-red-100" : "bg-amber-50"
                    }`}>
                    <div className="flex items-center gap-2">
                      <span>{p.stock <= 0 ? "🔴" : p.stock < p.min_stock * 0.3 ? "🔴" : "🟡"}</span>
                      <span className="font-medium text-gray-700">{p.name}</span>
                      <span className="text-gray-400">{p.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-red-600">{p.stock} {p.unit||"units"}</span>
                      <span className="text-gray-400 ml-1">/ min {p.min_stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── OPENING STOCK TABLE ───────────────────────── */}
          {isOpen && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-gray-600">
                  Opening Stock Snapshot
                  <span className="badge badge-green ml-2">
                    {session.opening_stock?.length} products
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">Taken at {fmt(session.opened_at)}</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Product</th>
                    <th className="th">Category</th>
                    <th className="th text-right">Opening Stock</th>
                    <th className="th text-right">Current Stock</th>
                    <th className="th text-right">Sold Today</th>
                    <th className="th text-right">Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(session.opening_stock || []).map(p => {
                    const current = products.find(x => x.id === p.id)
                    const soldToday = (p.stock || 0) - (current?.stock || 0)
                    const value = (current?.stock || 0) * (p.cost_price || 0)
                    return (
                      <tr key={p.id} className={`hover:bg-gray-50 ${
                        current?.stock < current?.min_stock ? "bg-red-50" : ""
                      }`}>
                        <td className="td font-medium text-xs">{p.name}</td>
                        <td className="td text-xs text-gray-500">{p.category}</td>
                        <td className="td text-right text-xs">{p.stock} {p.unit||""}</td>
                        <td className={`td text-right text-xs font-medium ${
                          current?.stock < p.min_stock ? "text-red-600" : "text-primary"
                        }`}>{current?.stock ?? "—"} {p.unit||""}</td>
                        <td className={`td text-right text-xs ${soldToday > 0 ? "text-primary" : "text-gray-400"}`}>
                          {soldToday > 0 ? soldToday : "—"}
                        </td>
                        <td className="td text-right text-xs text-gray-600">{INR(value)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── CLOSING SUMMARY ───────────────────────────── */}
          {isClosed && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-gray-600">
                  Day Close Summary
                  <span className="badge badge-blue ml-2">Final</span>
                </div>
                <span className="text-[10px] text-gray-400">Closed at {fmt(session.closed_at)}</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Product</th>
                    <th className="th text-right">Opening</th>
                    <th className="th text-right">Closing</th>
                    <th className="th text-right">Sold</th>
                    <th className="th text-right">Revenue</th>
                    <th className="th text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(session.closing_stock || []).map((p, i) => {
                    const opening = (session.opening_stock || []).find(x => x.id === p.id)
                    const sold    = (opening?.stock || 0) - (p.stock || 0)
                    const revenue = sold * (p.mrp || 0)
                    const isLow   = p.stock < p.min_stock
                    return (
                      <tr key={p.id||i} className={isLow ? "bg-red-50" : "hover:bg-gray-50"}>
                        <td className="td font-medium text-xs">{p.name}</td>
                        <td className="td text-right text-xs text-gray-500">{opening?.stock ?? "—"}</td>
                        <td className={`td text-right text-xs font-medium ${isLow ? "text-red-600" : "text-gray-700"}`}>
                          {p.stock} {p.unit||""}
                        </td>
                        <td className={`td text-right text-xs ${sold > 0 ? "text-primary" : "text-gray-400"}`}>
                          {sold > 0 ? sold : "—"}
                        </td>
                        <td className="td text-right text-xs text-gray-600">
                          {revenue > 0 ? INR(revenue) : "—"}
                        </td>
                        <td className="td text-right">
                          {isLow
                            ? <span className="badge badge-red text-[9px]">Reorder</span>
                            : <span className="badge badge-green text-[9px]">OK</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── NOT OPENED YET ────────────────────────────── */}
          {notOpened && !loading && (
            <div className="card text-center py-10">
              <div className="text-5xl mb-3">🏪</div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Ready to open your store?</div>
              <div className="text-xs text-gray-400 mb-6 max-w-xs mx-auto">
                Opening the day takes a snapshot of all your stock levels and costs — so you can track exactly what was sold and the profit at end of day.
              </div>
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-6">
                {[
                  { icon:"📦", label:"Products", value: products.length },
                  { icon:"💰", label:"Stock Value", value: INR(openingValue) },
                  { icon:"⚠", label:"Low Stock", value: lowStock.length },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-lg">{s.icon}</div>
                    <div className="text-xs font-semibold text-gray-700 mt-1">{s.value}</div>
                    <div className="text-[10px] text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={openDay} disabled={acting}
                className="btn btn-primary px-8 py-2.5 text-xs font-semibold">
                {acting ? "Opening..." : "Open Day Now"}
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
