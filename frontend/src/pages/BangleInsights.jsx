import { useState, useEffect } from "react"
import { getToken } from "../sync/db"

const API = import.meta.env.VITE_API_URL ?? ""
const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN")

function authHeaders() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders() })
  if (!res.ok) throw new Error("Request failed")
  return res.json()
}

// ── Bar chart row ──────────────────────────────────────────────
function Bar({ label, value, max, colour }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: "var(--ink-dim)", fontWeight: 600 }}>{value} pcs</span>
      </div>
      <div style={{ height: 7, background: "var(--bg2)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: pct + "%",
          background: colour || "var(--saffron)",
          borderRadius: 4, transition: "width 0.5s ease"
        }} />
      </div>
    </div>
  )
}

// ── Briefing card ──────────────────────────────────────────────
function BriefingCard({ data, loading }) {
  if (loading) return (
    <div style={{ background: "var(--bg0)", border: "1px solid var(--rule)", borderRadius: 14,
      padding: "18px 16px", marginBottom: 16, textAlign: "center",
      fontSize: 13, color: "var(--ink-faint)" }}>Loading briefing…</div>
  )
  if (!data) return null

  const { today, low_stock_count, out_of_stock, dead_stock_count, next_festival } = data
  const festDays = next_festival
    ? Math.round((new Date(next_festival.date) - new Date()) / 86400000)
    : null

  return (
    <div style={{
      background: "linear-gradient(135deg, var(--saffron) 0%, #d45f00 100%)",
      borderRadius: 16, padding: "18px 16px", marginBottom: 16,
      boxShadow: "0 4px 20px rgba(232,119,34,0.25)"
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)",
        letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 10 }}>
        Today's Briefing
      </div>

      {/* Revenue row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Revenue",  value: INR(today.revenue) },
          { label: "Bills",    value: today.bills },
          { label: "Pieces",   value: today.pieces },
        ].map(({ label, value }) => (
          <div key={label} style={{ flex: 1, background: "rgba(255,255,255,0.18)",
            borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{value}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Alerts row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {today.top_colour && (
          <span style={{ fontSize: 11, background: "rgba(255,255,255,0.2)",
            color: "#fff", borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>
            🏆 Top: {today.top_colour}
          </span>
        )}
        {low_stock_count > 0 && (
          <span style={{ fontSize: 11, background: "rgba(255,255,255,0.2)",
            color: "#fff", borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>
            ⚠️ {low_stock_count} low stock
          </span>
        )}
        {out_of_stock > 0 && (
          <span style={{ fontSize: 11, background: "rgba(0,0,0,0.2)",
            color: "#fff", borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>
            ❌ {out_of_stock} out of stock
          </span>
        )}
        {dead_stock_count > 0 && (
          <span style={{ fontSize: 11, background: "rgba(255,255,255,0.15)",
            color: "#fff", borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>
            💤 {dead_stock_count} dead stock
          </span>
        )}
        {next_festival && festDays !== null && (
          <span style={{ fontSize: 11, background: "rgba(255,255,255,0.2)",
            color: "#fff", borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>
            🎉 {next_festival.name} in {festDays}d
          </span>
        )}
      </div>
    </div>
  )
}

// ── Velocity tab ───────────────────────────────────────────────
function VelocityTab() {
  const [data, setData]     = useState(null)
  const [days, setDays]     = useState(30)
  const [loading, setLoading] = useState(true)
  const [err, setErr]       = useState("")

  useEffect(() => {
    setLoading(true); setErr("")
    apiFetch(`/bangle/insights/velocity?days=${days}`)
      .then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false))
  }, [days])

  const maxColour = data?.top_colours?.[0]?.pieces || 1
  const maxSize   = data?.top_sizes?.[0]?.pieces   || 1
  const maxDesign = data?.top_designs?.[0]?.pieces  || 1

  return (
    <div>
      {/* Period picker */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[7, 30, 60].map(d => (
          <button key={d} onClick={() => setDays(d)}
            style={{ padding: "5px 14px", borderRadius: 20, border: "1px solid",
              fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
              background: days === d ? "var(--saffron)" : "var(--bg2)",
              color:       days === d ? "#fff"          : "var(--ink-dim)",
              borderColor: days === d ? "var(--saffron)": "var(--rule)" }}>
            {d}d
          </button>
        ))}
        {data && (
          <span style={{ fontSize: 11, color: "var(--ink-faint)", alignSelf: "center", marginLeft: 4 }}>
            {data.total_pieces} total pieces
          </span>
        )}
      </div>

      {loading && <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>Loading…</div>}
      {err     && <div style={{ color: "#e55", fontSize: 13 }}>{err}</div>}

      {data && !loading && (
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {/* Top Colours */}
          <div style={{ background: "var(--bg0)", border: "1px solid var(--rule)",
            borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
              🎨 Top Colours
            </div>
            {data.top_colours.length === 0
              ? <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No sales data yet</div>
              : data.top_colours.map(r => (
                  <Bar key={r.label} label={r.label} value={r.pieces}
                    max={maxColour} colour="var(--saffron)" />
                ))
            }
          </div>

          {/* Top Sizes */}
          <div style={{ background: "var(--bg0)", border: "1px solid var(--rule)",
            borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
              📐 Top Sizes
            </div>
            {data.top_sizes.length === 0
              ? <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No sales data yet</div>
              : data.top_sizes.map(r => (
                  <Bar key={r.label} label={r.label} value={r.pieces}
                    max={maxSize} colour="#7c5cbf" />
                ))
            }
          </div>

          {/* Top Designs */}
          <div style={{ background: "var(--bg0)", border: "1px solid var(--rule)",
            borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
              ✨ Top Designs
            </div>
            {data.top_designs.length === 0
              ? <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No sales data yet</div>
              : data.top_designs.map(r => (
                  <Bar key={r.label} label={r.label} value={r.pieces}
                    max={maxDesign} colour="#2b9e6e" />
                ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ── Dead Stock tab ─────────────────────────────────────────────
function DeadStockTab() {
  const [data, setData]       = useState(null)
  const [days, setDays]       = useState(30)
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState("")

  useEffect(() => {
    setLoading(true); setErr("")
    apiFetch(`/bangle/insights/dead-stock?days=${days}`)
      .then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false))
  }, [days])

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[7, 30, 60].map(d => (
          <button key={d} onClick={() => setDays(d)}
            style={{ padding: "5px 14px", borderRadius: 20, border: "1px solid",
              fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
              background: days === d ? "var(--saffron)" : "var(--bg2)",
              color:       days === d ? "#fff"          : "var(--ink-dim)",
              borderColor: days === d ? "var(--saffron)": "var(--rule)" }}>
            {d}d
          </button>
        ))}
      </div>

      {loading && <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>Loading…</div>}
      {err     && <div style={{ color: "#e55", fontSize: 13 }}>{err}</div>}

      {data && !loading && (
        <>
          {/* Summary strip */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Dead Variants", value: data.dead_count, warn: data.dead_count > 0 },
              { label: "Capital Blocked", value: INR(data.total_blocked), warn: data.total_blocked > 0 },
            ].map(({ label, value, warn }) => (
              <div key={label} style={{ flex: 1, background: warn ? "rgba(229,85,85,0.08)" : "var(--bg0)",
                border: `1px solid ${warn ? "rgba(229,85,85,0.25)" : "var(--rule)"}`,
                borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 18, fontWeight: 800,
                  color: warn ? "#c0392b" : "var(--ink)" }}>{value}</div>
                <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {data.items.length === 0 ? (
            <div style={{ background: "var(--bg0)", border: "1px solid var(--rule)",
              borderRadius: 14, padding: 20, textAlign: "center",
              fontSize: 13, color: "var(--ink-faint)" }}>
              ✅ No dead stock — everything has been selling!
            </div>
          ) : (
            <div style={{ background: "var(--bg0)", border: "1px solid var(--rule)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto auto",
                background: "var(--bg2)", padding: "8px 14px",
                fontSize: 10, fontWeight: 700, color: "var(--ink-faint)",
                letterSpacing: "0.8px", textTransform: "uppercase", gap: 8 }}>
                <span>Product</span><span>Variant</span><span>Design</span>
                <span style={{ textAlign: "right" }}>Stock</span>
                <span style={{ textAlign: "right" }}>Blocked ₹</span>
              </div>
              {data.items.map((item, i) => (
                <div key={item.variant_id} style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto auto",
                  padding: "9px 14px", gap: 8, fontSize: 12,
                  borderTop: i > 0 ? "1px solid var(--rule)" : "none",
                  background: i % 2 === 0 ? "transparent" : "var(--bg2,#f7f4f2)" }}>
                  <span style={{ color: "var(--ink)", fontWeight: 500,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.product_name || "—"}
                  </span>
                  <span style={{ color: "var(--ink-dim)" }}>
                    {[item.colour, item.size].filter(Boolean).join(" / ") || "—"}
                  </span>
                  <span style={{ color: "var(--ink-dim)" }}>{item.design || "—"}</span>
                  <span style={{ color: "var(--ink)", fontWeight: 600, textAlign: "right" }}>{item.stock}</span>
                  <span style={{ color: item.blocked_value > 0 ? "#c0392b" : "var(--ink-faint)",
                    fontWeight: 700, textAlign: "right" }}>
                    {INR(item.blocked_value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Profit tab ─────────────────────────────────────────────────
function ProfitTab() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState("")

  useEffect(() => {
    apiFetch("/bangle/insights/profit")
      .then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false))
  }, [])

  function ProfitCard({ title, d }) {
    return (
      <div style={{ background: "var(--bg0)", border: "1px solid var(--rule)",
        borderRadius: 14, padding: "16px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-dim)",
          marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.8px" }}>{title}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {[
            { label: "Revenue", value: INR(d.revenue), colour: "var(--ink)" },
            { label: "Cost",    value: INR(d.cost),    colour: "#c0392b" },
          ].map(({ label, value, colour }) => (
            <div key={label} style={{ background: "var(--bg2)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: colour }}>{value}</div>
              <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        {/* Profit highlight */}
        <div style={{
          background: d.profit >= 0 ? "rgba(43,158,110,0.1)" : "rgba(229,85,85,0.1)",
          border: `1px solid ${d.profit >= 0 ? "rgba(43,158,110,0.3)" : "rgba(229,85,85,0.3)"}`,
          borderRadius: 10, padding: "12px 14px",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 2 }}>Net Profit</div>
            <div style={{ fontSize: 20, fontWeight: 800,
              color: d.profit >= 0 ? "#2b9e6e" : "#c0392b" }}>{INR(d.profit)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 2 }}>Margin</div>
            <div style={{ fontSize: 22, fontWeight: 800,
              color: d.margin_pct >= 30 ? "#2b9e6e" : d.margin_pct >= 15 ? "var(--saffron)" : "#c0392b" }}>
              {d.margin_pct}%
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {loading && <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>Loading…</div>}
      {err     && <div style={{ color: "#e55", fontSize: 13 }}>{err}</div>}
      {data && !loading && (
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <ProfitCard title="Today" d={data.today} />
          <ProfitCard title={`This Month (${new Date().toLocaleString("en-IN", { month: "long" })})`} d={data.month} />
        </div>
      )}
      {data && !loading && (
        <div style={{ marginTop: 14, background: "var(--bg0)", border: "1px solid var(--rule)",
          borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-dim)",
            marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}>Margin Guide</div>
          {[
            { range: "≥ 30%", label: "Excellent",  colour: "#2b9e6e" },
            { range: "15–29%", label: "Good",       colour: "var(--saffron)" },
            { range: "< 15%", label: "Needs review", colour: "#c0392b" },
          ].map(({ range, label, colour }) => (
            <div key={range} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: colour, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600, width: 60 }}>{range}</span>
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
const TABS = ["Velocity", "Dead Stock", "Profit"]

export default function BangleInsights() {
  const [briefing, setBriefing]     = useState(null)
  const [briefLoading, setBriefLoad] = useState(true)
  const [tab, setTab]               = useState(0)

  useEffect(() => {
    apiFetch("/bangle/insights/briefing")
      .then(setBriefing).catch(() => setBriefing(null))
      .finally(() => setBriefLoad(false))
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="page-sticky-header" style={{ display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
          💍 Bangle Insights
        </h1>
      </div>

      <BriefingCard data={briefing} loading={briefLoading} />

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ padding: "7px 16px", borderRadius: 20, border: "1px solid",
              fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
              background: tab === i ? "var(--saffron)" : "var(--bg2)",
              color:       tab === i ? "#fff"          : "var(--ink-dim)",
              borderColor: tab === i ? "var(--saffron)": "var(--rule)" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <VelocityTab />}
      {tab === 1 && <DeadStockTab />}
      {tab === 2 && <ProfitTab />}
    </div>
  )
}
