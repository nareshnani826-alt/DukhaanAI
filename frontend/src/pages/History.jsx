import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Invoices, isCloud } from "../sync/db"
import InvoiceView from "../components/InvoiceView"

const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function fmt(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  })
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  })
}
function groupByDate(invoices) {
  const g = {}
  for (const inv of invoices) {
    const day = (inv.created_at || "").slice(0, 10)
    if (!g[day]) g[day] = []
    g[day].push(inv)
  }
  return g
}

const DATE_OPTS = [
  { label: "Today",   days: 0  },
  { label: "7 days",  days: 7  },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "Custom",  days: -1 },
]
const SORT_OPTS = [
  { value: "newest",      label: "Newest first"    },
  { value: "oldest",      label: "Oldest first"    },
  { value: "amount_desc", label: "Highest amount"  },
  { value: "amount_asc",  label: "Lowest amount"   },
]
const PAY_OPTS = ["All", "Cash", "UPI", "Credit", "Cheque"]

const PAY_COLORS = {
  Cash:   { bg: "#ecfdf5", color: "#059669" },
  UPI:    { bg: "#eff6ff", color: "#2563eb" },
  Credit: { bg: "#fefce8", color: "#92400e" },
  Cheque: { bg: "#f3f4f6", color: "#374151" },
}

// ── Bill card ─────────────────────────────────────────────────
function BillCard({ inv, onView, onVoid }) {
  const [open, setOpen] = useState(false)
  const isCancelled = inv.status === "cancelled"
  const items = inv.items || []
  const pc = PAY_COLORS[inv.payment_mode] || PAY_COLORS.Cash

  return (
    <div style={{
      background: "var(--bg1)", border: "1px solid var(--rule)",
      borderRadius: 12, marginBottom: 8, overflow: "hidden",
      opacity: isCancelled ? 0.6 : 1,
    }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 9, flexShrink: 0,
          background: isCancelled ? "#f3f4f6" : "linear-gradient(135deg,#1D9E75,#0a7a58)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: isCancelled ? "#9ca3af" : "#fff", fontSize: 15,
        }}>🧾</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)",
              textDecoration: isCancelled ? "line-through" : "none" }}>
              {inv.invoice_no}
            </span>
            {isCancelled
              ? <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 10, fontWeight: 700,
                  background: "#fee2e2", color: "#dc2626" }}>VOIDED</span>
              : <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 10, fontWeight: 600,
                  background: pc.bg, color: pc.color }}>{inv.payment_mode}</span>
            }
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--ink-dim)", fontWeight: 600 }}>
              {inv.customer_name || "Walk-in"}
            </span>
            {inv.customer_phone && (
              <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>· {inv.customer_phone}</span>
            )}
            <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>{fmt(inv.created_at)}</span>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800,
            color: isCancelled ? "var(--ink-faint)" : "var(--jade)",
            textDecoration: isCancelled ? "line-through" : "none" }}>
            {INR(inv.total)}
          </div>
          <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}>
            {items.length} item{items.length !== 1 ? "s" : ""}
          </div>
        </div>
        <span style={{ color: "var(--ink-faint)", fontSize: 16, flexShrink: 0 }}>
          {open ? "▲" : "▼"}
        </span>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid var(--rule)" }}>
          <div style={{ padding: "10px 14px" }}>
            {items.map((it, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 0", borderBottom: i < items.length - 1 ? "1px solid var(--rule)" : "none",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{it.name}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 1 }}>
                    {it.qty} × {INR(it.unit_price)} · GST {it.gst_percent || 0}%
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", flexShrink: 0, marginLeft: 12 }}>
                  {INR(it.total)}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between",
              borderTop: "1px solid var(--rule)", paddingTop: 8, marginTop: 4 }}>
              <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                Subtotal {INR(inv.subtotal)} · GST {INR((inv.cgst || 0) + (inv.sgst || 0))}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--jade)" }}>
                {INR(inv.total)}
              </div>
            </div>
          </div>

          {!isCancelled && (
            <div style={{ display: "flex", gap: 8, padding: "8px 14px 12px",
              borderTop: "1px solid var(--rule)" }}>
              <button onClick={() => onView(inv)}
                style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg,#1D9E75,#0a7a58)",
                  color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                View Invoice
              </button>
              <button onClick={() => {
                const text = [
                  `🧾 ${inv.invoice_no} — ${inv.customer_name || "Walk-in"}`,
                  `Date: ${fmt(inv.created_at)}`,
                  "",
                  ...(items.map(i => `• ${i.name} — ${i.qty} × ${INR(i.unit_price)} = ${INR(i.total)}`)),
                  "",
                  `Total: ${INR(inv.total)} · ${inv.payment_mode}`,
                ].join("\n")
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
              }}
                style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none",
                  background: "#25D366", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                📲 WhatsApp
              </button>
              <button onClick={() => onVoid(inv)}
                style={{ padding: "8px 12px", borderRadius: 8,
                  border: "1px solid #fca5a5", background: "#fff1f2",
                  color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                🚫 Void
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function History() {
  const { vendor } = useAuth()
  const navigate   = useNavigate()
  const cloud      = isCloud()

  const [invoices, setInvoices] = useState([])
  const [total,    setTotal]    = useState(0)
  const [summary,  setSummary]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState("")

  // Filters
  const [search,   setSearch]   = useState("")
  const [dSearch,  setDSearch]  = useState("")
  const [dateOpt,  setDateOpt]  = useState(1)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo,   setDateTo]   = useState("")
  const [payMode,  setPayMode]  = useState("All")
  const [sort,     setSort]     = useState("newest")
  const [offset,   setOffset]   = useState(0)
  const [showVoid, setShowVoid] = useState(null)
  const [voiding,  setVoiding]  = useState(false)
  const [viewing,  setViewing]  = useState(null)

  const LIMIT = 50
  const debounceRef = useRef(null)

  function handleSearch(v) {
    setSearch(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDSearch(v); setOffset(0) }, 300)
  }

  function getDateRange() {
    const opt = DATE_OPTS[dateOpt]
    if (opt.days === -1) return { df: dateFrom, dt: dateTo }
    if (opt.days === 0) {
      const t = new Date().toISOString().slice(0, 10)
      return { df: t, dt: t }
    }
    const from = new Date()
    from.setDate(from.getDate() - opt.days + 1)
    return { df: from.toISOString().slice(0, 10), dt: new Date().toISOString().slice(0, 10) }
  }

  const fetchInvoices = useCallback(async () => {
    setLoading(true); setError("")
    try {
      if (cloud) {
        const { df, dt } = getDateRange()
        const params = new URLSearchParams({
          sort, limit: LIMIT, offset,
          ...(dSearch              && { search: dSearch }),
          ...(df                   && { date_from: df }),
          ...(dt                   && { date_to: dt }),
          ...(payMode !== "All"    && { payment_mode: payMode }),
        })
        const token = localStorage.getItem("dk_access") || sessionStorage.getItem("dk_access")
        const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/invoices?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error("Failed to load invoices")
        const data = await res.json()
        if (Array.isArray(data)) {
          setInvoices(data); setTotal(data.length); setSummary(null)
        } else {
          setInvoices(data.invoices || []); setTotal(data.total || 0)
          setSummary(data.summary || null)
        }
      } else {
        // Local mode — no server, load from localStorage
        const data = await Invoices.list()
        let rows = Array.isArray(data) ? data : (data.invoices || [])
        // Client-side filter for local mode
        if (dSearch) {
          const s = dSearch.toLowerCase()
          rows = rows.filter(r =>
            (r.customer_name  || "").toLowerCase().includes(s) ||
            (r.customer_phone || "").toLowerCase().includes(s) ||
            (r.invoice_no     || "").toLowerCase().includes(s)
          )
        }
        if (payMode !== "All") rows = rows.filter(r => r.payment_mode === payMode)
        setInvoices(rows); setTotal(rows.length)
        // Basic local summary
        const paid = rows.filter(r => r.status !== "cancelled")
        setSummary({
          revenue:      paid.reduce((s, r) => s + (r.total || 0), 0),
          total_bills:  paid.length,
          profit:       null,
          cost_known:   false,
          partial_cost: false,
          stock_value:  0,
        })
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [cloud, dSearch, dateOpt, dateFrom, dateTo, payMode, sort, offset])

  useEffect(() => { setOffset(0) }, [dSearch, dateOpt, dateFrom, dateTo, payMode, sort])
  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  async function handleVoid(inv) {
    setVoiding(true)
    try {
      await Invoices.updateStatus(inv.id, "cancelled")
      setInvoices(prev => prev.map(x => x.id === inv.id ? { ...x, status: "cancelled" } : x))
      setShowVoid(null)
      // Refresh summary
      fetchInvoices()
    } catch (e) { alert("Could not void: " + e.message) }
    finally { setVoiding(false) }
  }

  const grouped    = groupByDate(invoices)
  const sortedDays = Object.keys(grouped).sort((a, b) =>
    sort === "oldest" ? a.localeCompare(b) : b.localeCompare(a)
  )
  const customRange = DATE_OPTS[dateOpt].days === -1

  return (
    <div className="flex-1 overflow-y-auto p-4">

      {/* Header */}
      <div className="page-sticky-header flex items-center justify-between gap-2 flex-wrap mb-4">
        <div>
          <h1 className="text-sm font-semibold">Bill History · Kirana Store</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Search, filter and view all past invoices</p>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────── */}
      {summary && (
        <>
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
                    ? `Cost prices missing for ${100 - summary.cost_coverage}% of products`
                    : "No cost prices set — profit cannot be calculated"}
                </div>
                <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>
                  Go to Inventory → edit each product → set Cost Price to track real profit.
                </div>
              </div>
              <button onClick={() => navigate("/inventory")}
                style={{ padding: "6px 14px", borderRadius: 8, border: "none",
                  background: "#1D9E75", color: "#fff", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", flexShrink: 0 }}>
                Fix now →
              </button>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
            {/* Total Sales */}
            <div style={{ background: "var(--bg1)", border: "1px solid var(--rule)",
              borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)",
                textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Total Sales</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--jade)", lineHeight: 1 }}>
                {INR(summary.revenue)}
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 4 }}>
                {summary.total_bills} bill{summary.total_bills !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Profit */}
            <div style={{ background: "var(--bg1)", borderRadius: 14, padding: "14px 16px",
              border: summary.cost_known ? "1px solid var(--rule)" : "1px solid rgba(202,138,4,0.4)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)",
                textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Profit</div>
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
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#92400e", lineHeight: 1 }}>—</div>
                  <div style={{ fontSize: 9, color: "#b45309", marginTop: 4 }}>
                    {summary.partial_cost
                      ? `Only ${summary.cost_coverage}% of costs known`
                      : "Set cost prices in Inventory"}
                  </div>
                </>
              )}
            </div>

            {/* Stock Value */}
            <div style={{ background: "var(--bg1)", borderRadius: 14, padding: "14px 16px",
              border: "1px solid var(--rule)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)",
                textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Stock Value</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--ink)", lineHeight: 1 }}>
                {summary.stock_value > 0 ? INR(summary.stock_value) : "—"}
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 4 }}>
                Current inventory
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Search ────────────────────────────────────────── */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          fontSize: 16, color: "var(--ink-faint)", pointerEvents: "none" }}>🔍</span>
        <input value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Search by customer, phone or invoice number…"
          style={{ width: "100%", border: "1.5px solid var(--rule)", borderRadius: 12,
            padding: "10px 12px 10px 38px", fontSize: 13, outline: "none",
            background: "var(--bg2)", color: "var(--ink)", boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = "var(--jade)"}
          onBlur={e  => e.target.style.borderColor = "var(--rule)"}
        />
        {search && (
          <button onClick={() => handleSearch("")}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "var(--ink-faint)", fontSize: 18,
              cursor: "pointer", lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* ── Date tabs ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {DATE_OPTS.map((opt, idx) => (
          <button key={opt.label} onClick={() => { setDateOpt(idx); setOffset(0) }}
            style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: dateOpt === idx ? "none" : "1px solid var(--rule)",
              background: dateOpt === idx ? "var(--jade)" : "var(--bg2)",
              color: dateOpt === idx ? "#fff" : "var(--ink-dim)", cursor: "pointer" }}>
            {opt.label}
          </button>
        ))}
      </div>
      {customRange && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <input type="date" value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setOffset(0) }}
            style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: "6px 10px",
              fontSize: 12, background: "var(--bg2)", color: "var(--ink)", outline: "none" }}/>
          <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>to</span>
          <input type="date" value={dateTo}
            onChange={e => { setDateTo(e.target.value); setOffset(0) }}
            style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: "6px 10px",
              fontSize: 12, background: "var(--bg2)", color: "var(--ink)", outline: "none" }}/>
        </div>
      )}

      {/* ── Filter + Sort ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {PAY_OPTS.map(p => (
            <button key={p} onClick={() => { setPayMode(p); setOffset(0) }}
              style={{ padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600,
                border: payMode === p ? "none" : "1px solid var(--rule)",
                background: payMode === p ? "var(--jade)" : "var(--bg2)",
                color: payMode === p ? "#fff" : "var(--ink-dim)", cursor: "pointer" }}>
              {p === "All" ? "All payments" : p}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <select value={sort} onChange={e => { setSort(e.target.value); setOffset(0) }}
          style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: "5px 10px",
            fontSize: 11, background: "var(--bg2)", color: "var(--ink)", outline: "none", cursor: "pointer" }}>
          {SORT_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* ── Summary strip ─────────────────────────────────── */}
      {!loading && invoices.length > 0 && (
        <div style={{ display: "flex", gap: 16, padding: "8px 14px", marginBottom: 12,
          background: "var(--bg2)", borderRadius: 10, border: "1px solid var(--rule)", fontSize: 12 }}>
          <span style={{ color: "var(--ink-faint)" }}>
            Showing <b style={{ color: "var(--ink)" }}>{invoices.length}</b>
            {total > invoices.length && ` of ${total}`} invoices
          </span>
          <span style={{ color: "var(--jade)", fontWeight: 700, marginLeft: "auto" }}>
            {INR(summary?.revenue ?? 0)} total
          </span>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-faint)", fontSize: 13 }}>
          Loading invoices…
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#dc2626", fontSize: 13 }}>
          {error}
          <br/>
          <button onClick={fetchInvoices}
            style={{ marginTop: 10, padding: "6px 16px", borderRadius: 8, border: "none",
              background: "var(--jade)", color: "#fff", fontSize: 12, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-faint)" }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>🧾</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>No invoices found</div>
          <div style={{ fontSize: 12 }}>
            {dSearch ? `No results for "${dSearch}"` : "Try a different date range or filter"}
          </div>
        </div>
      ) : (
        <>
          {sortedDays.map(day => (
            <div key={day}>
              <div style={{ display: "flex", justifyContent: "space-between",
                padding: "6px 4px", marginBottom: 6, marginTop: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-faint)",
                  textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  {fmtDate(day + "T00:00:00")}
                </span>
                <span style={{ fontSize: 11, color: "var(--jade)", fontWeight: 700 }}>
                  {INR(grouped[day].filter(x => x.status !== "cancelled").reduce((s, x) => s + (x.total || 0), 0))}
                  · {grouped[day].filter(x => x.status !== "cancelled").length} bill{grouped[day].length !== 1 ? "s" : ""}
                </span>
              </div>

              {grouped[day].map(inv => (
                <BillCard key={inv.id} inv={inv}
                  onView={setViewing}
                  onVoid={inv => setShowVoid(inv)} />
              ))}
            </div>
          ))}

          {/* Pagination */}
          {total > LIMIT && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
              <button disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
                style={{ padding: "7px 18px", borderRadius: 8, border: "1px solid var(--rule)",
                  background: "var(--bg1)", fontSize: 12, fontWeight: 600,
                  color: offset === 0 ? "var(--ink-faint)" : "var(--ink)",
                  cursor: offset === 0 ? "default" : "pointer" }}>
                ← Previous
              </button>
              <span style={{ fontSize: 12, color: "var(--ink-faint)", alignSelf: "center" }}>
                {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
              </span>
              <button disabled={offset + LIMIT >= total} onClick={() => setOffset(o => o + LIMIT)}
                style={{ padding: "7px 18px", borderRadius: 8, border: "1px solid var(--rule)",
                  background: "var(--bg1)", fontSize: 12, fontWeight: 600,
                  color: offset + LIMIT >= total ? "var(--ink-faint)" : "var(--ink)",
                  cursor: offset + LIMIT >= total ? "default" : "pointer" }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Void confirmation ─────────────────────────────── */}
      {showVoid && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--bg1)", borderRadius: 16, padding: 24,
            maxWidth: 320, width: "100%", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 28, textAlign: "center", marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 14, fontWeight: 700, textAlign: "center", marginBottom: 6 }}>
              Void {showVoid.invoice_no}?
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", textAlign: "center",
              marginBottom: 20, lineHeight: 1.5 }}>
              This marks the invoice as cancelled. Revenue totals will update. This cannot be undone.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setShowVoid(null)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid var(--rule)",
                  background: "var(--bg2)", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", color: "var(--ink-dim)" }}>
                Keep it
              </button>
              <button onClick={() => handleVoid(showVoid)} disabled={voiding}
                style={{ padding: 10, borderRadius: 10, border: "none",
                  background: "#dc2626", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", color: "#fff", opacity: voiding ? 0.6 : 1 }}>
                {voiding ? "Voiding…" : "Yes, void"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice modal ─────────────────────────────────── */}
      {viewing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300,
          display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setViewing(null)}>
          <div style={{ width: "100%", maxWidth: 560, maxHeight: "92dvh",
            background: "#fff", borderRadius: "20px 20px 0 0", overflow: "hidden",
            display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{viewing.invoice_no}</span>
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
            <div style={{ flex: 1, overflowY: "auto" }}>
              <InvoiceView invoice={viewing} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
