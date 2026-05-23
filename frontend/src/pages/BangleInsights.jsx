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

// ── Wikipedia thumbnail helper (free, CORS-safe) ──────────────
const DESIGN_WIKI = {
  "Kundan":      "Kundan_(jewellery)",
  "Meenakari":   "Meenakari",
  "Glass":       "Bangle",
  "Lac":         "Bangle",
  "Metal":       "Indian_jewellery",
  "Stone Work":  "Indian_jewellery",
  "Mirror Work": "Indian_jewellery",
  "Pearl":       "Pearl_jewellery",
  "Plain":       "Bangle",
  "Antique":     "Indian_jewellery",
  "Thread":      "Indian_jewellery",
  "Crystal":     "Bangle",
  "Silk":        "Indian_jewellery",
  "Zari":        "Zari",
}

const COLOUR_HEX = {
  Red:"#ef4444", Pink:"#ec4899", Green:"#16a34a", Blue:"#3b82f6",
  Gold:"#f59e0b", Silver:"#94a3b8", White:"#d1d5db", Black:"#1e293b",
  Orange:"#f97316", Purple:"#a855f7", Yellow:"#eab308", Maroon:"#9f1239",
  Multi:"#ec4899", "Sky Blue":"#38bdf8", "Dark Green":"#15803d",
}

const INDIA_MARKET_BASE = [
  { label: "Kundan",      article: "Kundan_(jewellery)" },
  { label: "Meenakari",   article: "Meenakari" },
  { label: "Glass",       article: "Bangle" },
  { label: "Lac",         article: "Bangle" },
  { label: "Metal",       article: "Indian_jewellery" },
  { label: "Mirror Work", article: "Indian_jewellery" },
]

async function fetchWikiThumb(article) {
  try {
    const r = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(article)}`,
      { headers: { "Api-User-Agent": "DukhaanAI/1.0 (bangle-store)" } }
    )
    if (!r.ok) return null
    const d = await r.json()
    return d.thumbnail?.source ?? null
  } catch { return null }
}

// ── Trends tab ─────────────────────────────────────────────────
function TrendsTab() {
  const [days,       setDays]      = useState(7)
  const [community,  setCommunity] = useState(null)
  const [myVel,      setMyVel]     = useState(null)
  const [loading,    setLoading]   = useState(true)
  const [err,        setErr]       = useState("")
  const [designImgs, setDesignImgs] = useState({})
  const [imgLoading, setImgLoading] = useState(false)

  useEffect(() => {
    setLoading(true); setErr("")
    Promise.all([
      apiFetch(`/bangle/trends/community?days=${days}`),
      apiFetch(`/bangle/insights/velocity?days=${days}`),
    ]).then(([c, v]) => { setCommunity(c); setMyVel(v) })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [days])

  // Fetch Wikipedia thumbnails whenever community data arrives (or on mount for static list)
  useEffect(() => {
    const items = community?.top_designs?.length > 0
      ? community.top_designs.slice(0, 8).map(d => ({
          label: d.label,
          article: DESIGN_WIKI[d.label] ?? "Indian_jewellery",
        }))
      : INDIA_MARKET_BASE
    setImgLoading(true)
    Promise.all(
      items.map(async ({ label, article }) => [label, await fetchWikiThumb(article)])
    ).then(pairs => {
      const map = {}
      pairs.forEach(([label, url]) => { if (url) map[label] = url })
      setDesignImgs(map)
    }).finally(() => setImgLoading(false))
  }, [community])

  const comparison = (() => {
    if (!community || !myVel) return []
    const myMap = {}
    for (const c of (myVel.top_colours || []))
      myMap[c.label] = c.pieces
    const sc = community.store_count || 1
    return (community.top_colours || []).map(c => {
      const areaAvgPerStore = Math.round(c.pieces / sc)
      const mine            = myMap[c.label] || 0
      const ratio = areaAvgPerStore > 0 ? mine / areaAvgPerStore : null
      const signal = ratio === null   ? "unknown"
        : ratio >= 1.5                ? "strong"
        : ratio >= 0.5                ? "average"
        :                               "opportunity"
      return { label: c.label, areaPcs: c.pieces, areaAvg: areaAvgPerStore, mine, ratio, signal }
    })
  })()

  const opportunities = comparison.filter(c => c.signal === "opportunity" && c.areaAvg >= 5)
  const maxArea = comparison[0]?.areaPcs || 1

  // Items to show in the design image strip (live or static fallback)
  const trendItems = community?.top_designs?.length > 0
    ? community.top_designs.slice(0, 8)
    : INDIA_MARKET_BASE.map(i => ({ label: i.label, pieces: null }))

  const MEDAL = ["#f59e0b", "#94a3b8", "#b45309"]

  return (
    <div>
      {/* Period picker */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center" }}>
        {[7, 14, 30].map(d => (
          <button key={d} onClick={() => setDays(d)}
            style={{ padding: "5px 14px", borderRadius: 20, border: "1px solid",
              fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
              background: days === d ? "var(--saffron)" : "var(--bg2)",
              color:       days === d ? "#fff"          : "var(--ink-dim)",
              borderColor: days === d ? "var(--saffron)": "var(--rule)" }}>
            {d}d
          </button>
        ))}
        {community && (
          <span style={{ fontSize: 11, color: "var(--ink-faint)", marginLeft: 4 }}>
            {community.store_count} store{community.store_count !== 1 ? "s" : ""} · {community.total_pieces.toLocaleString("en-IN")} pcs
          </span>
        )}
      </div>

      {loading && <div style={{ color: "var(--ink-faint)", fontSize: 13, marginBottom: 12 }}>Loading community data…</div>}
      {err     && <div style={{ color: "#e55", fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {/* ── 🇮🇳 Trending in India — Design image strip (always shown) ── */}
      <div style={{ background: "var(--bg0)", border: "1px solid var(--rule)",
        borderRadius: 16, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
            🇮🇳 Trending Designs in India
          </span>
          <span style={{ fontSize: 10, background: "var(--bg2)", color: "var(--ink-faint)",
            borderRadius: 20, padding: "2px 9px", fontWeight: 500 }}>
            {community?.store_count > 1
              ? `Live · ${community.store_count} stores`
              : "India market data"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
          {trendItems.map((d, i) => (
            <div key={d.label} style={{
              flexShrink: 0, width: 108, borderRadius: 14, overflow: "hidden",
              border: i < 3 ? "2px solid var(--saffron)" : "1.5px solid var(--rule)",
              background: "var(--bg1)", position: "relative",
              boxShadow: i === 0
                ? "0 4px 20px rgba(232,119,34,0.2)"
                : "0 1px 6px rgba(0,0,0,0.05)",
            }}>
              {/* Product thumbnail */}
              {designImgs[d.label] ? (
                <img src={designImgs[d.label]} alt={d.label}
                  style={{ width: "100%", height: 86, objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{
                  width: "100%", height: 86,
                  background: imgLoading ? "var(--bg2)" : "linear-gradient(135deg,#fdf2f8,#fce7f3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: imgLoading ? 14 : 30, color: "var(--ink-faint)",
                }}>
                  {imgLoading ? "…" : "💍"}
                </div>
              )}

              {/* Rank badge */}
              {i < 3 && (
                <div style={{
                  position: "absolute", top: 6, left: 6, zIndex: 2,
                  background: MEDAL[i], color: "#fff", borderRadius: 20,
                  fontSize: 9, fontWeight: 800, padding: "2px 7px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                }}>#{i + 1}</div>
              )}

              <div style={{ padding: "7px 10px 9px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {d.label}
                </div>
                <div style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 2 }}>
                  {d.pieces != null
                    ? `${d.pieces.toLocaleString("en-IN")} pcs sold`
                    : "India bestseller"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 🎨 Top Colours — CSS bangle rings ── */}
      {community?.top_colours?.length > 0 && (
        <div style={{ background: "var(--bg0)", border: "1px solid var(--rule)",
          borderRadius: 14, padding: "12px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
            🎨 Top Colours in Your Area
          </div>
          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
            {community.top_colours.slice(0, 10).map((c, i) => {
              const hex = COLOUR_HEX[c.label] ?? "#e87722"
              return (
                <div key={c.label} style={{ flexShrink: 0, textAlign: "center", minWidth: 52 }}>
                  <div style={{ position: "relative", width: 52, height: 52, margin: "0 auto 5px" }}>
                    {/* CSS bangle ring */}
                    <div style={{
                      width: 52, height: 52, borderRadius: "50%",
                      border: `10px solid ${hex}`,
                      boxShadow: i === 0
                        ? `0 0 0 2px #fff, 0 0 0 3px ${hex}, 0 4px 12px ${hex}66`
                        : "0 1px 6px rgba(0,0,0,0.12)",
                    }} />
                    {i < 3 && (
                      <div style={{
                        position: "absolute", top: -4, right: -4, zIndex: 2,
                        background: MEDAL[i], color: "#fff", borderRadius: "50%",
                        width: 17, height: 17, fontSize: 8, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                      }}>
                        {i + 1}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink)" }}>{c.label}</div>
                  <div style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 1 }}>
                    {c.pieces.toLocaleString("en-IN")} pcs
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {community && myVel && !loading && (
        <>
          {/* Rising opportunities strip */}
          {opportunities.length > 0 && (
            <div style={{ background: "rgba(43,158,110,0.07)", border: "1.5px solid rgba(43,158,110,0.25)",
              borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#2b9e6e", marginBottom: 10 }}>
                📈 Rising in your area — consider stocking these
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {opportunities.map(c => {
                  const hex = COLOUR_HEX[c.label] ?? "#e87722"
                  return (
                    <div key={c.label} style={{ background: "rgba(43,158,110,0.12)",
                      border: "1.5px solid rgba(43,158,110,0.3)", borderRadius: 10,
                      padding: "8px 12px", minWidth: 90 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 14, height: 14, borderRadius: "50%",
                          border: `3px solid ${hex}`, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>{c.label}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#2b9e6e", fontWeight: 600 }}>
                        ~{c.areaAvg} pcs/store
                      </div>
                      <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 1 }}>
                        Your store: {c.mine}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {opportunities.length === 0 && (
            <div style={{ background: "rgba(43,158,110,0.07)", border: "1px solid rgba(43,158,110,0.2)",
              borderRadius: 12, padding: "12px 14px", marginBottom: 14,
              fontSize: 12, color: "#2b9e6e", fontWeight: 600 }}>
              ✅ Your stock mix is well-aligned with area demand
            </div>
          )}

          {/* Colour comparison chart */}
          <div style={{ background: "var(--bg0)", border: "1px solid var(--rule)",
            borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
              🎨 Colour Demand — Area vs Your Store
            </div>
            <div style={{ fontSize: 10, color: "var(--ink-faint)", marginBottom: 12 }}>
              Area bar = total across {community.store_count} stores · avg ~{Math.round(community.total_pieces / community.store_count)} pcs/store
            </div>
            {comparison.map(c => {
              const areaPct  = Math.round((c.areaPcs / maxArea) * 100)
              const myPct    = maxArea > 0 ? Math.round((c.mine / maxArea) * 100) : 0
              const sigColor = c.signal === "strong" ? "#2b9e6e"
                : c.signal === "opportunity" ? "#c47f00" : "var(--ink-faint)"
              const sigIcon  = c.signal === "strong" ? "↑" : c.signal === "opportunity" ? "→" : "~"
              const hex      = COLOUR_HEX[c.label] ?? "#e87722"
              return (
                <div key={c.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%",
                        border: `3px solid ${hex}`, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600 }}>{c.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: sigColor }}>{sigIcon}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                      {c.mine} / ~{c.areaAvg}
                      <span style={{ fontSize: 9, marginLeft: 4 }}>(me / area avg)</span>
                    </div>
                  </div>
                  <div style={{ height: 5, background: "var(--bg2)", borderRadius: 3,
                    overflow: "hidden", marginBottom: 3 }}>
                    <div style={{ height: "100%", width: areaPct + "%",
                      background: "rgba(124,92,191,0.5)", borderRadius: 3, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ height: 5, background: "var(--bg2)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: myPct + "%",
                      background: c.signal === "strong" ? "#2b9e6e"
                        : c.signal === "opportunity" ? "var(--saffron)" : "rgba(124,92,191,0.35)",
                      borderRadius: 3, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 2, fontSize: 9, color: "var(--ink-faint)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ width: 8, height: 3, background: "rgba(124,92,191,0.5)",
                        borderRadius: 2, display: "inline-block" }} />Area total
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ width: 8, height: 3,
                        background: c.signal === "strong" ? "#2b9e6e" : "var(--saffron)",
                        borderRadius: 2, display: "inline-block" }} />Your store
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Top Designs bar chart */}
          {community.top_designs.length > 0 && (
            <div style={{ background: "var(--bg0)", border: "1px solid var(--rule)",
              borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
                ✨ Top Designs in Area
              </div>
              {community.top_designs.map(d => (
                <Bar key={d.label} label={d.label} value={d.pieces}
                  max={community.top_designs[0].pieces} colour="#7c5cbf" />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
const TABS = ["Velocity", "Dead Stock", "Profit", "Trends"]

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
      {tab === 3 && <TrendsTab />}
    </div>
  )
}
