import { useState, useEffect } from "react"
import { getToken } from "../sync/db"

const API = import.meta.env.VITE_API_URL ?? ""
function authHeaders() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// ── Festival data (2026-2027) ─────────────────────────────────
const FESTIVALS = [
  { name: "Teej",             date: "2026-08-26", emoji: "🌿",
    colors: ["Green", "Red", "Gold"],
    designs: ["Lac", "Kundan", "Meenakari"],
    sizes: ["2.4", "2.6"],
    tip: "Green bangles are auspicious for married women. Stock Lac and Kundan in green heavily.",
    multiplier: 2.5 },

  { name: "Raksha Bandhan",   date: "2026-08-28", emoji: "🎀",
    colors: ["Multi", "Pink", "Gold", "Silver"],
    designs: ["Stone Work", "Kundan", "Glass"],
    sizes: ["2.4", "2.6", "2.8"],
    tip: "Sisters gift bangles — colorful and fashionable designs sell best. Bundle sets of 6.",
    multiplier: 2.0 },

  { name: "Navratri",         date: "2026-10-21", emoji: "🪔",
    colors: ["Red", "Blue", "Yellow", "Green", "Grey", "Orange", "White", "Pink", "Purple"],
    designs: ["Kundan", "Stone Work", "Meenakari", "Mirror Work"],
    sizes: ["2.4", "2.6", "2.8"],
    tip: "9 colours for 9 days — the biggest bangle season of the year. Stock all colours.",
    multiplier: 4.0 },

  { name: "Dussehra",         date: "2026-10-31", emoji: "🏹",
    colors: ["Red", "Gold", "Orange"],
    designs: ["Kundan", "Stone Work"],
    sizes: ["2.4", "2.6"],
    tip: "Post-Navratri demand continues — restock Red and Gold immediately after Navratri.",
    multiplier: 1.8 },

  { name: "Karva Chauth",     date: "2026-11-08", emoji: "🌙",
    colors: ["Red", "Gold", "Pink", "Orange"],
    designs: ["Kundan", "Meenakari", "Stone Work"],
    sizes: ["2.4", "2.6"],
    tip: "Married women buy new bangles — premium Kundan and Stone Work sell at higher margins.",
    multiplier: 3.0 },

  { name: "Diwali",           date: "2026-11-09", emoji: "🎆",
    colors: ["Gold", "Red", "Pink", "Silver", "Multi"],
    designs: ["Kundan", "Stone Work", "Metal", "Glass"],
    sizes: ["2.4", "2.6", "2.8"],
    tip: "Gift sets are popular — bundle 6-12 pieces per set. Gold and stone premium sell best.",
    multiplier: 3.5 },

  { name: "Christmas",        date: "2026-12-25", emoji: "🎄",
    colors: ["Red", "Green", "Silver", "Gold", "White"],
    designs: ["Glass", "Stone Work", "Metal"],
    sizes: ["2.4", "2.6", "Free Size"],
    tip: "Urban customers — western fashion styles and sparkly designs.",
    multiplier: 1.5 },

  { name: "New Year",         date: "2027-01-01", emoji: "🎉",
    colors: ["Gold", "Silver", "Multi", "Black"],
    designs: ["Metal", "Glass", "Stone Work"],
    sizes: ["Free Size", "2.6"],
    tip: "Party jewelry — bold and sparkly. Free Size sells strongly for gifting.",
    multiplier: 1.5 },

  { name: "Lohri / Sankranti", date: "2027-01-14", emoji: "🪁",
    colors: ["Multi", "Green", "Yellow", "Orange"],
    designs: ["Glass", "Lac", "Plain"],
    sizes: ["2.4", "2.6"],
    tip: "North India focus — affordable colourful glass bangles are traditional.",
    multiplier: 1.5 },

  { name: "Valentine's Day",  date: "2027-02-14", emoji: "❤️",
    colors: ["Red", "Pink", "White"],
    designs: ["Stone Work", "Kundan", "Glass"],
    sizes: ["2.4", "2.6", "Free Size"],
    tip: "Gifting season — red and pink heart-motif styles. Free Size for gifting.",
    multiplier: 1.8 },

  { name: "Holi",             date: "2027-03-22", emoji: "🎨",
    colors: ["Multi", "Red", "Pink", "Green", "Orange", "Purple"],
    designs: ["Glass", "Plain", "Stone Work"],
    sizes: ["2.4", "2.6", "2.8"],
    tip: "Affordable colourful glass bangles in sets. Volume sales — price < ₹50 per set.",
    multiplier: 2.0 },
]

const URGENT_DAYS  = 30
const PREPARE_DAYS = 60

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const fest  = new Date(dateStr)
  return Math.round((fest - today) / 86400000)
}

function urgencyColor(days) {
  if (days <= 14)  return "#dc2626"
  if (days <= 30)  return "#d97706"
  if (days <= 60)  return "var(--saffron)"
  return "var(--ink-faint)"
}

function demandBadge(multiplier) {
  if (multiplier >= 3.5) return { label: "🔥 Peak",   bg: "#fef2f2", color: "#dc2626" }
  if (multiplier >= 2.5) return { label: "📈 High",   bg: "#fffbeb", color: "#d97706" }
  if (multiplier >= 1.8) return { label: "↗ Medium",  bg: "#f0fdf4", color: "#15803d" }
  return                          { label: "→ Normal", bg: "var(--bg2)", color: "var(--ink-faint)" }
}

// ── Festival Card ─────────────────────────────────────────────
function FestivalCard({ fest, days, stockedColors }) {
  const [open, setOpen] = useState(days <= PREPARE_DAYS)
  const badge = demandBadge(fest.multiplier)
  const urgency = urgencyColor(days)
  const missingColors = fest.colors.filter(c => !stockedColors.has(c))
  const readyColors   = fest.colors.filter(c =>  stockedColors.has(c))
  const stockScore    = fest.colors.length > 0
    ? Math.round((readyColors.length / fest.colors.length) * 100)
    : 100

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 12,
      border: `1.5px solid ${days <= URGENT_DAYS ? "rgba(220,38,38,0.3)" : "var(--rule)"}`,
      background: "var(--bg1)" }}>

      {/* Card header */}
      <div onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
          cursor: "pointer" }}>
        <div style={{ fontSize: 28, flexShrink: 0 }}>{fest.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{fest.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
              background: badge.bg, color: badge.color }}>{badge.label}</span>
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--ink-faint)" }}>
            <span>{new Date(fest.date).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</span>
            <span style={{ color: urgency, fontWeight: 700 }}>
              {days <= 0 ? "Today!" : `${days} days away`}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800,
            color: stockScore >= 70 ? "var(--jade)" : stockScore >= 40 ? "#d97706" : "#dc2626" }}>
            {stockScore}%
          </div>
          <div style={{ fontSize: 9, color: "var(--ink-faint)" }}>stocked</div>
        </div>
        <svg width="12" height="12" fill="none" stroke="var(--ink-faint)" strokeWidth="2" viewBox="0 0 24 24"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "0.2s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Expanded details */}
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--rule)" }}>

          {/* Stock readiness bar */}
          <div style={{ margin: "12px 0 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10,
              color: "var(--ink-faint)", marginBottom: 4 }}>
              <span>Stock readiness</span>
              <span>{readyColors.length}/{fest.colors.length} colours</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "var(--bg2)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, transition: "width 0.4s",
                width: `${stockScore}%`,
                background: stockScore >= 70 ? "var(--jade)" : stockScore >= 40 ? "#d97706" : "#dc2626" }} />
            </div>
          </div>

          {/* Color chips */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)", marginBottom: 6,
              textTransform: "uppercase", letterSpacing: "0.8px" }}>Colours to stock</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {fest.colors.map(c => {
                const has = stockedColors.has(c)
                return (
                  <span key={c} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11,
                    fontWeight: 600, border: "1.5px solid",
                    background: has ? "rgba(31,122,94,0.08)" : "rgba(220,38,38,0.06)",
                    color:       has ? "var(--jade)"          : "#dc2626",
                    borderColor: has ? "rgba(31,122,94,0.25)" : "rgba(220,38,38,0.25)" }}>
                    {has ? "✓" : "!"} {c}
                  </span>
                )
              })}
            </div>
            {missingColors.length > 0 && (
              <div style={{ fontSize: 11, color: "#dc2626", marginTop: 6, fontWeight: 600 }}>
                Missing: {missingColors.join(", ")} — add variants in Inventory
              </div>
            )}
          </div>

          {/* Designs + Sizes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)", marginBottom: 5,
                textTransform: "uppercase", letterSpacing: "0.8px" }}>Top designs</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {fest.designs.map(d => (
                  <span key={d} style={{ padding: "3px 8px", borderRadius: 20, fontSize: 10,
                    background: "var(--saffron-bg)", color: "var(--saffron)",
                    border: "1px solid rgba(212,98,31,0.2)", fontWeight: 600 }}>{d}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)", marginBottom: 5,
                textTransform: "uppercase", letterSpacing: "0.8px" }}>Key sizes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {fest.sizes.map(s => (
                  <span key={s} style={{ padding: "3px 8px", borderRadius: 20, fontSize: 10,
                    background: "var(--bg2)", color: "var(--ink-dim)",
                    border: "1px solid var(--rule)", fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Tip */}
          <div style={{ background: "var(--saffron-bg)", borderRadius: 10, padding: "10px 12px",
            fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5,
            borderLeft: "3px solid var(--saffron)" }}>
            💡 {fest.tip}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function BangleFestivals() {
  const [products,  setProducts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState("upcoming") // upcoming / all

  useEffect(() => {
    fetch(`${API}/bangle/products`, { headers: authHeaders() })
      .then(r => r.json())
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Build set of colours currently in stock (any variant with stock > 0)
  const stockedColors = new Set(
    products.flatMap(p =>
      p.variants
        .filter(v => v.stock > 0 && v.colour)
        .map(v => v.colour)
    )
  )

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const festivals = FESTIVALS
    .map(f => ({ ...f, days: daysUntil(f.date) }))
    .filter(f => filter === "all" ? true : f.days >= 0)
    .sort((a, b) => a.days - b.days)

  const urgent   = festivals.filter(f => f.days >= 0 && f.days <= URGENT_DAYS)
  const upcoming = festivals.filter(f => f.days >= 0 && f.days <= PREPARE_DAYS)

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
      background: "var(--bg0)" }}>

      {/* Header */}
      <div style={{ background: "var(--bg1)", padding: "0 20px", height: 56, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--rule)" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>🗓️ Festival Calendar</div>
          <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>Stock up before demand spikes</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ id: "upcoming", label: "Upcoming" }, { id: "all", label: "All" }].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ padding: "5px 12px", borderRadius: 8, border: "1.5px solid", fontSize: 11,
                fontWeight: 700, cursor: "pointer",
                background:  filter === f.id ? "var(--saffron)" : "var(--bg2)",
                color:       filter === f.id ? "#fff"           : "var(--ink-dim)",
                borderColor: filter === f.id ? "var(--saffron)" : "var(--rule)" }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>

        {/* Alert strip */}
        {urgent.length > 0 && (
          <div style={{ background: "rgba(220,38,38,0.07)", border: "1.5px solid rgba(220,38,38,0.2)",
            borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex",
            alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>
                {urgent.length} festival{urgent.length > 1 ? "s" : ""} within 30 days
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 2 }}>
                {urgent.map(f => f.name).join(", ")} — check stock readiness below
              </div>
            </div>
          </div>
        )}

        {/* Summary chips */}
        {!loading && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ padding: "6px 12px", borderRadius: 20, background: "var(--bg1)",
              border: "1px solid var(--rule)", fontSize: 11 }}>
              <span style={{ fontWeight: 700, color: "var(--ink)" }}>{stockedColors.size}</span>
              <span style={{ color: "var(--ink-faint)" }}> colours in stock</span>
            </div>
            <div style={{ padding: "6px 12px", borderRadius: 20, background: "var(--bg1)",
              border: "1px solid var(--rule)", fontSize: 11 }}>
              <span style={{ fontWeight: 700, color: "var(--saffron)" }}>{upcoming.length}</span>
              <span style={{ color: "var(--ink-faint)" }}> festivals in 60 days</span>
            </div>
          </div>
        )}

        {/* Festival cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--ink-faint)", fontSize: 13 }}>
            Loading inventory…
          </div>
        ) : festivals.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗓️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>No upcoming festivals</div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 6 }}>
              Switch to "All" to see the full calendar
            </div>
          </div>
        ) : (
          festivals.map(f => (
            <FestivalCard key={f.name} fest={f} days={f.days} stockedColors={stockedColors} />
          ))
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
