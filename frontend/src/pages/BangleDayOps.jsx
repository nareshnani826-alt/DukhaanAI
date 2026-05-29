import { useEffect, useState } from "react"
import { api, isCloud } from "../sync/db.js"
import { useAuth } from "../context/AuthContext.jsx"
import { BangleProducts, BangleSales } from "../sync/bangleDb.js"

const INR = n => "₹" + Math.round(n || 0).toLocaleString("en-IN")
const LOCAL_KEY = "dk_bangle_day_session"

function fmt(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

function fmtDate(iso) {
  return new Date(iso || Date.now()).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
}

// ── Local session helpers (free-plan) ─────────────────────────
function localGetSession() {
  try {
    const s = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null")
    if (!s) return null
    return s.date === new Date().toISOString().slice(0, 10) ? s : null
  } catch { return null }
}

function flattenVariants(products) {
  const out = []
  for (const p of products) {
    for (const v of (p.variants || [])) {
      out.push({
        product_id:   p.id,
        product_name: p.name,
        color:        p.color || "",
        variant_id:   v.id,
        size:         v.size || "",
        stock:        v.stock || 0,
        cost_price:   v.cost_price ?? p.cost_price ?? 0,
        mrp:          v.mrp ?? p.mrp ?? 0,
        min_stock:    v.min_stock ?? p.min_stock ?? 0,
      })
    }
  }
  return out
}

async function localOpenDay(products) {
  const snapshot = flattenVariants(products)
  const session = {
    id:                "local-bangle-day-" + Date.now(),
    date:              new Date().toISOString().slice(0, 10),
    opened_at:         new Date().toISOString(),
    opening_stock:     snapshot,
    status:            "open",
    total_stock_value: snapshot.reduce((s, v) => s + (v.stock || 0) * ((v.cost_price || 0) / 12), 0),
    variant_count:     snapshot.length,
  }
  localStorage.setItem(LOCAL_KEY, JSON.stringify(session))
  return session
}

async function localCloseDay(todaySummary, products) {
  const raw       = localStorage.getItem(LOCAL_KEY)
  const session   = raw ? JSON.parse(raw) : null
  const openStock = session?.opening_stock || []
  const closing   = flattenVariants(products)

  const lowStock = closing.filter(v => v.stock < (v.min_stock || 0))
  const costMap  = Object.fromEntries(openStock.map(v => [v.variant_id, v.cost_price || 0]))
  const revenue  = todaySummary?.total_revenue || 0
  const cogs     = openStock.reduce((s, os) => {
    const cs   = closing.find(c => c.variant_id === os.variant_id)
    const sold = Math.max(0, (os.stock || 0) - (cs?.stock || 0))
    return s + sold * ((costMap[os.variant_id] || 0) / 12)
  }, 0)

  const closed = {
    ...(session || {}),
    closed_at:       new Date().toISOString(),
    closing_stock:   closing,
    total_sales:     revenue,
    total_bills:     todaySummary?.total_bills  || 0,
    total_pieces:    todaySummary?.total_pieces || 0,
    gross_profit:    Math.round((revenue - cogs) * 100) / 100,
    low_stock_items: lowStock,
    status:          "closed",
  }
  localStorage.setItem(LOCAL_KEY, JSON.stringify(closed))
  return closed
}

// ── WhatsApp message builders ─────────────────────────────────
function buildReorderWA(lowStock, storeName) {
  const lines = lowStock.map(v =>
    `  • ${v.product_name}${v.color ? ` (${v.color})` : ""}${v.size ? ` [${v.size}]` : ""} — ${v.stock} pcs (min ${v.min_stock})`
  ).join("\n")
  return `🚨 *Low Stock Alert — ${storeName || "DukaanAI"}*\nDate: ${fmtDate()}\n\nPlease reorder:\n${lines}\n\n_Sent from DukaanAI_`
}

function buildCloseWA(session, storeName) {
  const low = session.low_stock_items || []
  return `📊 *Day Close Report — ${storeName || "DukaanAI"}*
Date: ${fmtDate(session.date)}

💰 Today's Sales: ${INR(session.total_sales)}
🧾 Bills: ${session.total_bills}
💍 Pieces Sold: ${session.total_pieces || "—"}
📈 Gross Profit: ${INR(session.gross_profit)}

${low.length > 0
  ? `⚠ Low Stock (${low.length} variants):\n${low.map(v => `  • ${v.product_name} ${v.color} [${v.size}] — ${v.stock} pcs`).join("\n")}`
  : "✅ All stock levels healthy"}

_Sent from DukaanAI_`
}

// ── Main component ────────────────────────────────────────────
export default function BangleDayOps() {
  const { vendor } = useAuth()
  const [session,      setSession]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [acting,       setActing]       = useState(false)
  const [products,     setProducts]     = useState([])
  const [todaySummary, setTodaySummary] = useState(null)
  const [notif,        setNotif]        = useState("")
  const [sound,        setSound]        = useState(true)

  function showNotif(m) { setNotif(m); setTimeout(() => setNotif(""), 4000) }

  function playAlert(type = "open") {
    if (!sound) return
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)()
      const play = (freq, t, dur) => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.frequency.setValueAtTime(freq, ctx.currentTime + t)
        g.gain.setValueAtTime(0.25, ctx.currentTime + t)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur)
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + dur)
      }
      if (type === "open")  { play(523, 0, 0.15); play(659, 0.15, 0.15); play(784, 0.3, 0.3) }
      if (type === "close") { play(784, 0, 0.2);  play(659, 0.2,  0.2);  play(523, 0.4, 0.4) }
      if (type === "alert") { play(880, 0, 0.1);  play(880, 0.15, 0.1);  play(880, 0.3, 0.15) }
    } catch {}
  }

  async function load() {
    setLoading(true)
    try {
      const [prods, summary] = await Promise.all([
        BangleProducts.list(),
        BangleSales.todaySummary(),
      ])
      setProducts(prods)
      setTodaySummary(summary)
      const sess = isCloud()
        ? await api.get("/day-sessions/today").catch(() => null)
        : localGetSession()
      setSession(sess)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function openDay() {
    setActing(true)
    try {
      const sess = isCloud()
        ? await api.post("/day-sessions/open", {})
        : await localOpenDay(products)
      setSession(sess)
      playAlert("open")
      showNotif("✓ Day opened! Stock snapshot taken.")
    } catch (e) { showNotif("Error: " + e.message) }
    finally { setActing(false) }
  }

  async function closeDay() {
    if (!confirm("Close today's day? This will record your final stock and profits.")) return
    setActing(true)
    try {
      const sess = isCloud()
        ? await api.post("/day-sessions/close", {})
        : await localCloseDay(todaySummary, products)
      setSession(sess)
      playAlert("close")
      showNotif("✓ Day closed! Summary ready.")
      const low = sess.low_stock_items || []
      if (low.length > 0)
        setTimeout(() => { playAlert("alert"); showNotif(`⚠ ${low.length} variants need reorder!`) }, 1500)
    } catch (e) { showNotif("Error: " + e.message) }
    finally { setActing(false) }
  }

  // ── Derived state ─────────────────────────────────────────────
  const isOpen    = session?.status === "open"
  const isClosed  = session?.status === "closed"
  const notOpened = !session

  const allVariants  = products.flatMap(p =>
    (p.variants || []).map(v => ({ ...v, product_name: p.name, color: p.color || "" }))
  )
  const lowVariants  = allVariants.filter(v => v.stock < (v.min_stock || 0))
  const lowAtClose   = session?.low_stock_items || []

  const openingValue = session?.opening_stock
    ? session.opening_stock.reduce((s, v) => s + (v.stock || 0) * ((v.cost_price || 0) / 12), 0)
    : allVariants.reduce((s, v) => s + (v.stock || 0) * ((v.cost_price || 0) / 12), 0)
  const closingValue = session?.closing_stock
    ? session.closing_stock.reduce((s, v) => s + (v.stock || 0) * ((v.cost_price || 0) / 12), 0)
    : null
  const profitPct    = session?.total_sales > 0
    ? Math.round(((session.gross_profit || 0) / session.total_sales) * 100)
    : 0

  const todayRevenue = session?.total_sales  ?? todaySummary?.total_revenue ?? 0
  const todayBills   = session?.total_bills  ?? todaySummary?.total_bills   ?? 0
  const todayPieces  = session?.total_pieces ?? todaySummary?.total_pieces  ?? 0

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {notif && (
        <div style={{
          position: "fixed", top: 16, right: 16, zIndex: 50,
          background: "linear-gradient(135deg,var(--saffron,#e87722),#d45f00)",
          color: "#fff", padding: "10px 16px", borderRadius: 12,
          fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", maxWidth: 280,
        }}>{notif}</div>
      )}

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="page-sticky-header flex items-center justify-between gap-2 flex-wrap mb-4">
        <div>
          <h1 className="text-sm font-semibold">Day Operations · Bangle Store</h1>
          <p className="text-[10px] text-gray-400">{fmtDate()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSound(s => !s)}
            className={`text-[10px] px-2 py-1 rounded border hidden md:block ${
              sound ? "border-primary text-primary bg-primary-light" : "border-gray-200 text-gray-400"
            }`}>
            {sound ? "🔔 Sound ON" : "🔕 Sound OFF"}
          </button>
          <button onClick={load} className="btn btn-sm text-gray-500">↺</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-xs text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-3">

          {/* ── DAY STATUS CARD ─────────────────────────────── */}
          <div style={{
            borderRadius: 16, padding: 20,
            background: isClosed ? "var(--bg2)" : isOpen ? "var(--jade-bg,#e8f8f2)" : "#fffbeb",
            border: `1px solid ${isClosed ? "var(--rule)" : isOpen ? "rgba(26,122,74,0.2)" : "rgba(202,138,4,0.35)"}`,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700,
                  color: isClosed ? "var(--ink-dim)" : isOpen ? "var(--jade)" : "#d97706" }}>
                  {isClosed ? "Day Closed" : isOpen ? "Day is Open" : "Day Not Started"}
                </div>
                <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 3 }}>
                  {isClosed  ? `Opened ${fmt(session.opened_at)} · Closed ${fmt(session.closed_at)}` :
                   isOpen    ? `Opened at ${fmt(session.opened_at)}` :
                               "Tap 'Open Day' to start tracking"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {notOpened && (
                  <button onClick={openDay} disabled={acting} style={{
                    padding: "9px 20px", borderRadius: 12, border: "none",
                    background: "linear-gradient(135deg,var(--saffron,#e87722),#d45f00)",
                    color: "#fff", fontSize: 12, fontWeight: 700,
                    cursor: acting ? "default" : "pointer", opacity: acting ? 0.7 : 1,
                  }}>
                    {acting ? "Opening…" : "Open Day"}
                  </button>
                )}
                {isOpen && (
                  <>
                    <button onClick={load} className="btn btn-sm">↺</button>
                    <button onClick={closeDay} disabled={acting} style={{
                      padding: "9px 20px", borderRadius: 12, border: "none",
                      background: "linear-gradient(135deg,#185FA5,#2563eb)",
                      color: "#fff", fontSize: 12, fontWeight: 700,
                      cursor: acting ? "default" : "pointer", opacity: acting ? 0.7 : 1,
                    }}>
                      {acting ? "Closing…" : "Close Day"}
                    </button>
                  </>
                )}
                {isClosed && (
                  <button onClick={() => {
                    window.open(`https://wa.me/?text=${encodeURIComponent(buildCloseWA(session, vendor?.store_name))}`, "_blank")
                  }} style={{
                    padding: "9px 16px", borderRadius: 12, border: "none",
                    background: "#25D366", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}>
                    Share Report
                  </button>
                )}
              </div>
            </div>

            {(isOpen || isClosed) && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
                {[
                  { label: "Opening Stock Value", value: INR(openingValue),
                    sub: `${session?.opening_stock?.length || allVariants.length} variants` },
                  { label: "Today's Revenue",     value: INR(todayRevenue),
                    sub: `${todayBills} bills · ${todayPieces} pcs`, green: true },
                  { label: "Gross Profit",         value: INR(session?.gross_profit || 0),
                    sub: `${profitPct}% margin`, green: (session?.gross_profit || 0) > 0 },
                  { label: isClosed ? "Closing Stock Value" : "Current Stock Value",
                    value: INR(closingValue ?? openingValue),
                    sub: isClosed ? "end of day" : "live" },
                ].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 12,
                    padding: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 4,
                      fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>{s.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700,
                      color: s.green ? "var(--jade)" : "var(--ink)" }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 3 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── LOW STOCK ALERT ─────────────────────────────── */}
          {(lowVariants.length > 0 || lowAtClose.length > 0) && (
            <div className="card" style={{ borderColor: "rgba(220,38,38,0.25)", background: "#fff5f5" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>⚠</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#dc2626" }}>
                    {isClosed
                      ? `${lowAtClose.length} variants need reorder before tomorrow`
                      : `${lowVariants.length} variants currently low on stock`}
                  </span>
                </div>
                <button onClick={() => {
                  const low = isClosed ? lowAtClose : lowVariants.map(v => ({
                    product_name: v.product_name, color: v.color, size: v.size,
                    stock: v.stock, min_stock: v.min_stock,
                  }))
                  window.open(`https://wa.me/?text=${encodeURIComponent(buildReorderWA(low, vendor?.store_name))}`, "_blank")
                }} style={{
                  padding: "7px 14px", borderRadius: 10, border: "none",
                  background: "#25D366", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}>
                  Send Reorder on WhatsApp
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(isClosed ? lowAtClose : lowVariants.map(v => ({
                  product_name: v.product_name, color: v.color, size: v.size,
                  stock: v.stock, min_stock: v.min_stock,
                }))).map((v, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 12px", borderRadius: 8, fontSize: 12,
                    background: v.stock <= 0 ? "#fee2e2" : "#fef3c7",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{v.stock <= 0 ? "🔴" : "🟡"}</span>
                      <span style={{ fontWeight: 600, color: "#374151" }}>
                        {v.product_name}{v.color ? ` · ${v.color}` : ""}{v.size ? ` [${v.size}]` : ""}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: "#dc2626" }}>{v.stock} pcs / min {v.min_stock}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── OPENING SNAPSHOT TABLE ──────────────────────── */}
          {isOpen && session?.opening_stock?.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-dim)" }}>
                  Opening Stock Snapshot
                  <span className="badge badge-green" style={{ marginLeft: 8 }}>
                    {session.opening_stock.length} variants
                  </span>
                </div>
                <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>Taken at {fmt(session.opened_at)}</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="w-full" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th className="th">Product</th>
                      <th className="th">Color</th>
                      <th className="th">Size</th>
                      <th className="th text-right">Opening</th>
                      <th className="th text-right">Current</th>
                      <th className="th text-right">Sold</th>
                      <th className="th text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.opening_stock.map((v, i) => {
                      const cur      = allVariants.find(x => x.id === v.variant_id)
                      const soldToday = Math.max(0, (v.stock || 0) - (cur?.stock || 0))
                      const value    = (cur?.stock || 0) * ((v.cost_price || 0) / 12)
                      const isLow    = cur && cur.stock < (cur.min_stock || 0)
                      return (
                        <tr key={v.variant_id || i} style={{ background: isLow ? "#fff5f5" : undefined }}>
                          <td className="td font-medium text-xs">{v.product_name}</td>
                          <td className="td text-xs text-gray-500">{v.color || "—"}</td>
                          <td className="td text-xs text-gray-500">{v.size || "—"}</td>
                          <td className="td text-right text-xs">{v.stock}</td>
                          <td className={`td text-right text-xs font-medium ${isLow ? "text-red-600" : "text-primary"}`}>
                            {cur?.stock ?? "—"}
                          </td>
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
            </div>
          )}

          {/* ── CLOSING SUMMARY ─────────────────────────────── */}
          {isClosed && session?.closing_stock?.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-dim)" }}>
                  Day Close Summary
                  <span className="badge badge-blue" style={{ marginLeft: 8 }}>Final</span>
                </div>
                <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>Closed at {fmt(session.closed_at)}</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="w-full" style={{ minWidth: 500 }}>
                  <thead>
                    <tr>
                      <th className="th">Product</th>
                      <th className="th">Color</th>
                      <th className="th">Size</th>
                      <th className="th text-right">Opening</th>
                      <th className="th text-right">Closing</th>
                      <th className="th text-right">Sold</th>
                      <th className="th text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.closing_stock.map((v, i) => {
                      const opening = (session.opening_stock || []).find(o => o.variant_id === v.variant_id)
                      const sold    = Math.max(0, (opening?.stock || 0) - (v.stock || 0))
                      const isLow   = v.stock < (v.min_stock || 0)
                      return (
                        <tr key={v.variant_id || i} style={{ background: isLow ? "#fff5f5" : undefined }}>
                          <td className="td font-medium text-xs">{v.product_name}</td>
                          <td className="td text-xs text-gray-500">{v.color || "—"}</td>
                          <td className="td text-xs text-gray-500">{v.size || "—"}</td>
                          <td className="td text-right text-xs text-gray-500">{opening?.stock ?? "—"}</td>
                          <td className={`td text-right text-xs font-medium ${isLow ? "text-red-600" : "text-gray-700"}`}>
                            {v.stock}
                          </td>
                          <td className={`td text-right text-xs ${sold > 0 ? "text-primary" : "text-gray-400"}`}>
                            {sold > 0 ? sold : "—"}
                          </td>
                          <td className="td text-right">
                            {isLow
                              ? <span className="badge badge-red" style={{ fontSize: 9 }}>Reorder</span>
                              : <span className="badge badge-green" style={{ fontSize: 9 }}>OK</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── NOT OPENED YET ──────────────────────────────── */}
          {notOpened && !loading && (
            <div className="card text-center" style={{ paddingTop: 40, paddingBottom: 40 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>💍</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
                Ready to open your bangle store?
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)", maxWidth: 280,
                margin: "0 auto 20px" }}>
                Opens a stock snapshot across all variants — so you can track exactly what was sold and profit at day's end.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10,
                maxWidth: 320, margin: "0 auto 20px" }}>
                {[
                  { icon: "💍", label: "Variants",    value: allVariants.length },
                  { icon: "💰", label: "Stock Value", value: INR(openingValue) },
                  { icon: "⚠",  label: "Low Stock",   value: lowVariants.length },
                ].map(s => (
                  <div key={s.label} style={{ background: "var(--bg2)", borderRadius: 12,
                    padding: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={openDay} disabled={acting} style={{
                padding: "12px 32px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg,var(--saffron,#e87722),#d45f00)",
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: acting ? "default" : "pointer", opacity: acting ? 0.7 : 1,
              }}>
                {acting ? "Opening…" : "Open Day Now"}
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
