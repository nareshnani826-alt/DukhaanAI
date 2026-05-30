import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import InvoiceView from "../components/InvoiceView"

const API = import.meta.env.VITE_API_URL ?? ""
const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function fmt(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  })
}
function fmtDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  })
}
function groupByDate(sales) {
  const g = {}
  for (const s of sales) {
    const day = s.sale_date || s.created_at?.slice(0, 10) || "Unknown"
    if (!g[day]) g[day] = []
    g[day].push(s)
  }
  return g
}

const DATE_OPTS = [
  { label: "Today",   days: 0 },
  { label: "7 days",  days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "Custom",  days: -1 },
]
const SORT_OPTS = [
  { value: "newest",      label: "Newest first" },
  { value: "oldest",      label: "Oldest first" },
  { value: "amount_desc", label: "Highest amount" },
  { value: "amount_asc",  label: "Lowest amount" },
]
const PAY_OPTS = ["All", "cash", "upi", "credit", "cheque"]
const PAY_LABEL = { cash: "Cash", upi: "UPI", credit: "Credit", cheque: "Cheque" }

// ── Bill card ─────────────────────────────────────────────────
function BillCard({ sale, onView }) {
  const [open, setOpen] = useState(false)
  const items = sale.items || []
  const shortId = (sale.id || "").slice(-8).toUpperCase()

  return (
    <div style={{
      background: "var(--bg1)", border: "1px solid var(--rule)",
      borderRadius: 12, marginBottom: 8, overflow: "hidden",
    }}>
      {/* Header row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10,
          padding: "11px 14px", cursor: "pointer" }}
      >
        {/* Invoice badge */}
        <div style={{
          width: 38, height: 38, borderRadius: 9, flexShrink: 0,
          background: "linear-gradient(135deg,#e87722,#c25500)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 15,
        }}>🧾</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
              {sale.customer_name || "Walk-in"}
            </span>
            {sale.customer_phone && (
              <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                · {sale.customer_phone}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>
              #{shortId}
            </span>
            <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>
              {fmt(sale.created_at)}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
              background: "var(--bg2)", color: "var(--ink-dim)",
            }}>
              {PAY_LABEL[sale.payment_mode] || sale.payment_mode || "Cash"}
            </span>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--saffron)" }}>
            {INR(sale.total)}
          </div>
          <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}>
            {items.length} item{items.length !== 1 ? "s" : ""}
          </div>
        </div>

        <span style={{ color: "var(--ink-faint)", fontSize: 16, flexShrink: 0 }}>
          {open ? "▲" : "▼"}
        </span>
      </div>

      {/* Expanded items */}
      {open && (
        <div style={{ borderTop: "1px solid var(--rule)" }}>
          <div style={{ padding: "10px 14px" }}>
            {items.map((it, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                padding: "7px 0", borderBottom: i < items.length - 1 ? "1px solid var(--rule)" : "none",
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                    {it.product_name}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}>
                    {[it.colour, it.size, it.design].filter(Boolean).join(" · ")}
                    {" · "}{it.unit_qty} {it.unit} ({it.pieces} pcs)
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", flexShrink: 0, marginLeft: 12 }}>
                  {INR(it.amount)}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, padding: "8px 14px 12px", borderTop: "1px solid var(--rule)" }}>
            <button
              onClick={() => onView(sale)}
              style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg,#e87722,#c25500)",
                color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              View Invoice
            </button>
            <button
              onClick={() => {
                const text = [
                  `🧾 Invoice #${shortId}`,
                  `Customer: ${sale.customer_name || "Walk-in"}`,
                  `Date: ${fmt(sale.created_at)}`,
                  "",
                  ...items.map(i =>
                    `• ${i.product_name}${i.colour ? " " + i.colour : ""}${i.size ? " [" + i.size + "]" : ""} — ${i.unit_qty} ${i.unit} = ${INR(i.amount)}`
                  ),
                  "",
                  `Total: ${INR(sale.total)}`,
                  `Payment: ${PAY_LABEL[sale.payment_mode] || sale.payment_mode || "Cash"}`,
                ].join("\n")
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
              }}
              style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none",
                background: "#25D366", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              📲 WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function BangleHistory() {
  const { vendor }  = useAuth()
  const navigate    = useNavigate()

  const [sales,    setSales]    = useState([])
  const [total,    setTotal]    = useState(0)
  const [summary,  setSummary]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState("")

  // Filters
  const [search,    setSearch]    = useState("")
  const [dSearch,   setDSearch]   = useState("")   // debounced
  const [dateOpt,   setDateOpt]   = useState(1)    // index into DATE_OPTS
  const [dateFrom,  setDateFrom]  = useState("")
  const [dateTo,    setDateTo]    = useState("")
  const [payMode,   setPayMode]   = useState("All")
  const [sort,      setSort]      = useState("newest")
  const [offset,    setOffset]    = useState(0)

  // Invoice modal
  const [viewing,   setViewing]   = useState(null)

  const LIMIT = 50
  const debounceRef = useRef(null)

  // Debounce search
  function handleSearch(v) {
    setSearch(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDSearch(v); setOffset(0) }, 300)
  }

  // Compute date_from / date_to from the selected quick option
  function getDateRange() {
    const opt = DATE_OPTS[dateOpt]
    if (opt.days === -1) return { df: dateFrom, dt: dateTo }  // custom
    if (opt.days === 0) {
      const t = new Date().toISOString().slice(0, 10)
      return { df: t, dt: t }
    }
    const from = new Date()
    from.setDate(from.getDate() - opt.days + 1)
    return { df: from.toISOString().slice(0, 10), dt: new Date().toISOString().slice(0, 10) }
  }

  const fetchSales = useCallback(async () => {
    if (!vendor) return
    setLoading(true); setError("")
    try {
      const { df, dt } = getDateRange()
      const params = new URLSearchParams({
        sort, limit: LIMIT, offset,
        ...(dSearch    && { search: dSearch }),
        ...(df         && { date_from: df }),
        ...(dt         && { date_to: dt }),
        ...(payMode !== "All" && { payment_mode: payMode }),
      })
      const token = localStorage.getItem("dk_access") || sessionStorage.getItem("dk_access")
      const res = await fetch(`${API}/bangle/sales?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      // Handle both old (array) and new (object) response shapes
      if (Array.isArray(data)) {
        setSales(data); setTotal(data.length); setSummary(null)
      } else {
        setSales(data.sales || []); setTotal(data.total || 0)
        setSummary(data.summary || null)
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [vendor, dSearch, dateOpt, dateFrom, dateTo, payMode, sort, offset])

  useEffect(() => { setOffset(0) }, [dSearch, dateOpt, dateFrom, dateTo, payMode, sort])
  useEffect(() => { fetchSales() }, [fetchSales])

  const grouped   = groupByDate(sales)
  const sortedDays = Object.keys(grouped).sort((a, b) =>
    sort === "oldest" ? a.localeCompare(b) : b.localeCompare(a)
  )
  const customRange = DATE_OPTS[dateOpt].days === -1

  // Convert a bangle sale to the InvoiceView-compatible invoice object
  function saleToInvoice(sale) {
    return {
      invoice_no:     `#${(sale.id || "").slice(-8).toUpperCase()}`,
      created_at:     sale.created_at,
      status:         "paid",
      customer_name:  sale.customer_name || "Walk-in Customer",
      customer_phone: sale.customer_phone || null,
      payment_mode:   sale.payment_mode  || "cash",
      subtotal:       sale.subtotal      || sale.total,
      cgst:           (sale.gst_amount   || 0) / 2,
      sgst:           (sale.gst_amount   || 0) / 2,
      gst_amount:     sale.gst_amount    || 0,
      total:          sale.total,
      items: (sale.items || []).map(i => ({
        name:        [i.product_name, i.colour, i.size, i.design].filter(Boolean).join(" · "),
        qty:         `${i.unit_qty} ${i.unit || ""}`.trim(),
        unit_price:  i.mrp || 0,
        subtotal:    i.amount,
        tax:         0,
        gst_percent: 0,
        total:       i.amount,
      })),
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">

      {/* Header */}
      <div className="page-sticky-header flex items-center justify-between gap-2 flex-wrap mb-4">
        <div>
          <h1 className="text-sm font-semibold">Bill History · Bangle Store</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Search, filter and view all past bills</p>
        </div>
      </div>

      {/* ── Summary stat cards ────────────────────────────── */}
      {summary && (
        <>
          {/* Cost prices missing banner */}
          {(summary.partial_cost || !summary.cost_known) && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
              padding: "10px 14px", borderRadius: 12,
              background: "#fffbeb", border: "1px solid rgba(202,138,4,0.35)",
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>
                  {summary.partial_cost
                    ? `Cost prices missing for ${100 - summary.cost_coverage}% of your products`
                    : "No cost prices set for any product"}
                </div>
                <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>
                  Profit and Stock Value will be wrong until you set buying prices in Inventory.
                </div>
              </div>
              <button
                onClick={() => navigate("/bangle-inventory")}
                style={{ padding: "6px 14px", borderRadius: 8, border: "none",
                  background: "#e87722", color: "#fff", fontSize: 11,
                  fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                Fix now →
              </button>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>

            {/* Total Sales */}
            <div style={{ background: "var(--bg1)", border: "1px solid var(--rule)",
              borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)",
                textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                Total Sales
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--saffron)", lineHeight: 1 }}>
                {INR(summary.revenue)}
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 4 }}>
                {summary.total_bills} bill{summary.total_bills !== 1 ? "s" : ""}
                {" · "}{summary.total_pieces} pcs
              </div>
            </div>

            {/* Profit */}
            <div style={{
              background: "var(--bg1)", borderRadius: 14, padding: "14px 16px",
              border: summary.cost_known
                ? "1px solid var(--rule)"
                : "1px solid rgba(202,138,4,0.4)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)",
                textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                Profit
              </div>
              {summary.cost_known ? (
                <>
                  <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1,
                    color: (summary.profit || 0) >= 0 ? "var(--jade)" : "var(--ember)" }}>
                    {(summary.profit || 0) >= 0 ? "+" : ""}{INR(summary.profit)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 4 }}>
                    {summary.margin_pct}% margin
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#92400e", lineHeight: 1 }}>
                    {summary.partial_cost ? `~${INR(summary.revenue - (summary.revenue * 0))}` : "—"}
                  </div>
                  <div style={{ fontSize: 9, color: "#b45309", marginTop: 4 }}>
                    {summary.partial_cost
                      ? `Only ${summary.cost_coverage}% of costs known — not reliable`
                      : "Set cost prices to calculate profit"}
                  </div>
                </>
              )}
            </div>

            {/* Stock Value */}
            <div style={{
              background: "var(--bg1)", borderRadius: 14, padding: "14px 16px",
              border: summary.cost_known
                ? "1px solid var(--rule)"
                : "1px solid rgba(202,138,4,0.4)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)",
                textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
                Stock Value
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--ink)", lineHeight: 1 }}>
                {summary.stock_value > 0 ? INR(summary.stock_value) : "—"}
                {summary.stock_value > 0 && !summary.cost_known && (
                  <span style={{ fontSize: 12, color: "#b45309", marginLeft: 4 }}>+?</span>
                )}
              </div>
              <div style={{ fontSize: 10, marginTop: 4,
                color: summary.cost_known ? "var(--ink-faint)" : "#b45309" }}>
                {summary.cost_known
                  ? "Current inventory value"
                  : summary.stock_value > 0
                    ? `Partial — ${100 - summary.cost_coverage}% of stock has no cost price`
                    : "Set cost prices to see value"}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Search bar ────────────────────────────────────── */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          fontSize: 16, color: "var(--ink-faint)", pointerEvents: "none" }}>🔍</span>
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search by customer name, phone or invoice ID…"
          style={{ width: "100%", border: "1.5px solid var(--rule)", borderRadius: 12,
            padding: "10px 12px 10px 38px", fontSize: 13, outline: "none",
            background: "var(--bg2)", color: "var(--ink)", boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = "var(--saffron)"}
          onBlur={e => e.target.style.borderColor = "var(--rule)"}
        />
        {search && (
          <button onClick={() => handleSearch("")}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "var(--ink-faint)", fontSize: 18,
              cursor: "pointer", lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* ── Date range tabs ────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {DATE_OPTS.map((opt, idx) => (
          <button key={opt.label}
            onClick={() => { setDateOpt(idx); setOffset(0) }}
            style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: dateOpt === idx ? "none" : "1px solid var(--rule)",
              background: dateOpt === idx ? "var(--saffron)" : "var(--bg2)",
              color: dateOpt === idx ? "#fff" : "var(--ink-dim)",
              cursor: "pointer" }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {customRange && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setOffset(0) }}
            style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: "6px 10px",
              fontSize: 12, background: "var(--bg2)", color: "var(--ink)", outline: "none" }}/>
          <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>to</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setOffset(0) }}
            style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: "6px 10px",
              fontSize: 12, background: "var(--bg2)", color: "var(--ink)", outline: "none" }}/>
        </div>
      )}

      {/* ── Filter + Sort row ─────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {/* Payment mode filter */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {PAY_OPTS.map(p => (
            <button key={p}
              onClick={() => { setPayMode(p); setOffset(0) }}
              style={{ padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600,
                border: payMode === p ? "none" : "1px solid var(--rule)",
                background: payMode === p ? "var(--jade)" : "var(--bg2)",
                color: payMode === p ? "#fff" : "var(--ink-dim)",
                cursor: "pointer" }}>
              {p === "All" ? "All payments" : PAY_LABEL[p]}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Sort */}
        <select value={sort} onChange={e => { setSort(e.target.value); setOffset(0) }}
          style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: "5px 10px",
            fontSize: 11, background: "var(--bg2)", color: "var(--ink)", outline: "none",
            cursor: "pointer" }}>
          {SORT_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* ── Summary strip ─────────────────────────────────── */}
      {!loading && sales.length > 0 && (
        <div style={{ display: "flex", gap: 16, padding: "8px 14px", marginBottom: 12,
          background: "var(--bg2)", borderRadius: 10, border: "1px solid var(--rule)", fontSize: 12 }}>
          <span style={{ color: "var(--ink-faint)" }}>
            Showing <b style={{ color: "var(--ink)" }}>{sales.length}</b>
            {total > sales.length && ` of ${total}`} bills
          </span>
          <span style={{ color: "var(--saffron)", fontWeight: 700, marginLeft: "auto" }}>
            {INR(summary?.revenue ?? 0)} total
          </span>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-faint)", fontSize: 13 }}>
          Loading bills…
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#dc2626", fontSize: 13 }}>
          {error}
          <br/>
          <button onClick={fetchSales}
            style={{ marginTop: 10, padding: "6px 16px", borderRadius: 8, border: "none",
              background: "var(--saffron)", color: "#fff", fontSize: 12, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      ) : sales.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-faint)" }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>🧾</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>No bills found</div>
          <div style={{ fontSize: 12 }}>
            {dSearch ? `No results for "${dSearch}"` : "Try a different date range or filter"}
          </div>
        </div>
      ) : (
        <>
          {sortedDays.map(day => (
            <div key={day}>
              {/* Day header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 4px", marginBottom: 6, marginTop: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-faint)",
                  textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  {fmtDate(day)}
                </span>
                <span style={{ fontSize: 11, color: "var(--saffron)", fontWeight: 700 }}>
                  {INR(grouped[day].reduce((s, x) => s + (x.total || 0), 0))}
                  · {grouped[day].length} bill{grouped[day].length !== 1 ? "s" : ""}
                </span>
              </div>

              {grouped[day].map(sale => (
                <BillCard key={sale.id} sale={sale} onView={setViewing} />
              ))}
            </div>
          ))}

          {/* Pagination */}
          {total > LIMIT && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
              <button disabled={offset === 0}
                onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
                style={{ padding: "7px 18px", borderRadius: 8, border: "1px solid var(--rule)",
                  background: offset === 0 ? "var(--bg2)" : "var(--bg1)",
                  color: offset === 0 ? "var(--ink-faint)" : "var(--ink)",
                  fontSize: 12, fontWeight: 600, cursor: offset === 0 ? "default" : "pointer" }}>
                ← Previous
              </button>
              <span style={{ fontSize: 12, color: "var(--ink-faint)", alignSelf: "center" }}>
                {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
              </span>
              <button disabled={offset + LIMIT >= total}
                onClick={() => setOffset(o => o + LIMIT)}
                style={{ padding: "7px 18px", borderRadius: 8, border: "1px solid var(--rule)",
                  background: offset + LIMIT >= total ? "var(--bg2)" : "var(--bg1)",
                  color: offset + LIMIT >= total ? "var(--ink-faint)" : "var(--ink)",
                  fontSize: 12, fontWeight: 600, cursor: offset + LIMIT >= total ? "default" : "pointer" }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Invoice modal ──────────────────────────────────── */}
      {viewing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300,
          display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setViewing(null)}>
          <div style={{ width: "100%", maxWidth: 560, maxHeight: "92dvh",
            background: "#fff", borderRadius: "20px 20px 0 0", overflow: "hidden",
            display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,0.25)" }}>

            {/* Modal header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                Invoice #{(viewing.id || "").slice(-8).toUpperCase()}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => window.print()}
                  style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--rule)",
                    background: "transparent", fontSize: 11, cursor: "pointer" }}>🖨 Print</button>
                <button onClick={() => setViewing(null)}
                  style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid var(--rule)",
                    background: "transparent", fontSize: 18, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            </div>

            {/* Invoice content */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              <InvoiceView invoice={saleToInvoice(viewing)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
