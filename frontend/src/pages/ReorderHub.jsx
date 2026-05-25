import { useState, useEffect, useCallback } from "react"
import { getToken, tryRefresh, clearAuth } from "../sync/db"

const API = import.meta.env.VITE_API_URL

const URGENCY_META = {
  critical: { label: "Critical", icon: "🔴", bg: "#fff0f0", border: "#f87171", text: "#dc2626" },
  high:     { label: "High",     icon: "🟠", bg: "#fff7ed", border: "#fb923c", text: "#c2410c" },
  medium:   { label: "Medium",   icon: "🟡", bg: "#fefce8", border: "#facc15", text: "#a16207" },
}

function buildWhatsApp(supplierName, supplierPhone, items) {
  const lines = items.map(it => `• ${it.name} (${it.category}) — ${it.recommended_qty} pcs`)
  const msg =
    `Hello ${supplierName},\n\nWe need to restock:\n\n` +
    lines.join("\n") +
    `\n\nPlease confirm availability. Thank you!`
  const encoded = encodeURIComponent(msg)
  if (supplierPhone) {
    const phone = supplierPhone.replace(/\D/g, "")
    return `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encoded}`
  }
  return `https://wa.me/?text=${encoded}`
}

function Stat({ label, value, accent }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.7)", borderRadius: 8,
      padding: "5px 10px", textAlign: "center", flex: "1 1 0", minWidth: 56,
    }}>
      <div style={{ fontSize: 9, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: accent || "var(--ink)", marginTop: 1 }}>
        {value}
      </div>
    </div>
  )
}

function ProductCard({ item }) {
  const meta    = URGENCY_META[item.urgency]
  const estCost = item.cost_price > 0
    ? "₹" + (item.recommended_qty * item.cost_price).toFixed(0)
    : null

  return (
    <div style={{
      background: meta.bg,
      border: `1.5px solid ${meta.border}`,
      borderRadius: 12,
      padding: "12px 14px",
    }}>
      {/* Row 1: name + badge */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", lineHeight: 1.3 }}>
            {item.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 2 }}>
            {item.category}
            {item.supplier_name && (
              <span style={{ marginLeft: 6, color: "var(--ink-faint)" }}>· {item.supplier_name}</span>
            )}
          </div>
        </div>
        <div style={{
          background: meta.text, color: "white",
          fontSize: 10, fontWeight: 700, borderRadius: 20,
          padding: "2px 8px", flexShrink: 0, alignSelf: "flex-start",
        }}>{meta.label}</div>
      </div>

      {/* Row 2: stats */}
      <div style={{ display: "flex", gap: 6 }}>
        <Stat label="Stock"     value={item.current_stock + " pcs"} />
        <Stat label="Daily avg" value={item.daily_avg > 0 ? item.daily_avg + " pcs" : "—"} />
        <Stat
          label="Days left"
          value={item.days_left !== null ? item.days_left + "d" : "—"}
          accent={item.urgency === "critical" ? "#dc2626" : item.urgency === "high" ? "#c2410c" : undefined}
        />
        <Stat label="Order qty" value={item.recommended_qty + " pcs"} accent="#2563eb" />
        {estCost && <Stat label="Est. cost" value={estCost} />}
      </div>
    </div>
  )
}

function SupplierGroup({ supplierName, supplierPhone, items }) {
  const waLink = buildWhatsApp(supplierName, supplierPhone, items)

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Supplier header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, marginBottom: 10,
        paddingBottom: 10, borderBottom: "1.5px solid var(--rule)",
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>
            {supplierName}
          </div>
          {supplierPhone && (
            <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 1 }}>
              📞 {supplierPhone}
            </div>
          )}
        </div>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#25D366", color: "white",
            borderRadius: 8, padding: "7px 14px",
            fontSize: 12, fontWeight: 600,
            textDecoration: "none", flexShrink: 0,
            boxShadow: "0 2px 8px rgba(37,211,102,0.3)",
          }}
        >
          {/* WhatsApp icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.139.564 4.141 1.547 5.871L0 24l6.305-1.524A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.91 0-3.698-.491-5.256-1.349l-.375-.222-3.753.907.953-3.661-.245-.387A9.936 9.936 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          WhatsApp Order
        </a>
      </div>

      {/* Product cards grid — 1 col mobile, 2 col on wider screens */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 10,
      }}>
        {items.map(item => <ProductCard key={item.id} item={item} />)}
      </div>
    </div>
  )
}

function SummaryBadge({ icon, count, label, color }) {
  if (!count) return null
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: "var(--bg1)", border: "1px solid var(--rule)",
      borderRadius: 20, padding: "5px 12px",
    }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{count}</span>
      <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{label}</span>
    </div>
  )
}

export default function ReorderHub() {
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [days, setDays]           = useState(30)
  const [threshold, setThreshold] = useState(7)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const doFetch = () => fetch(
        `${API}/bangle/reorder-analysis?days=${days}&threshold_days=${threshold}`,
        { headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {} }
      )
      let res = await doFetch()
      if (res.status === 401) {
        const ok = await tryRefresh()
        if (ok) res = await doFetch()
        else { clearAuth(); window.location.href = "/"; return }
      }
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
    } catch (e) {
      setError(e.message || "Failed to load reorder data")
    } finally {
      setLoading(false)
    }
  }, [days, threshold])

  useEffect(() => { load() }, [load])

  // Group items by supplier
  const grouped = {}
  if (data?.items) {
    for (const item of data.items) {
      const key = item.supplier_id || "__none__"
      if (!grouped[key]) {
        grouped[key] = {
          supplierName:  item.supplier_name  || "No supplier assigned",
          supplierPhone: item.supplier_phone || null,
          items: [],
        }
      }
      grouped[key].items.push(item)
    }
  }

  const hasItems = data && data.total_flagged > 0

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg0)" }}>
      {/* Sticky header */}
      <div className="page-sticky-header" style={{
        background: "var(--bg0)",
        borderBottom: "1px solid var(--rule)",
        padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10, flexShrink: 0,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)", letterSpacing: -0.3 }}>
            🤖 Smart Reorder Agent
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 2 }}>
            Velocity-based restocking · AI-powered WhatsApp drafts
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: "7px 16px", borderRadius: 8, border: "none",
            background: "var(--saffron)", color: "white",
            fontSize: 12, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1, flexShrink: 0,
          }}
        >
          {loading ? "Analysing…" : "↻ Refresh"}
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px 80px" }}>

        {/* Controls */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16,
          background: "var(--bg1)", borderRadius: 12, padding: "10px 14px",
          border: "1px solid var(--rule)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--ink-dim)", fontWeight: 600, whiteSpace: "nowrap" }}>
              Analyse last
            </span>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              style={{ fontSize: 12, padding: "5px 8px", borderRadius: 8,
                border: "1px solid var(--rule)", background: "var(--bg0)", color: "var(--ink)" }}
            >
              {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--ink-dim)", fontWeight: 600, whiteSpace: "nowrap" }}>
              Warn if &lt;
            </span>
            <select
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              style={{ fontSize: 12, padding: "5px 8px", borderRadius: 8,
                border: "1px solid var(--rule)", background: "var(--bg0)", color: "var(--ink)" }}
            >
              {[3, 5, 7, 10, 14].map(d => <option key={d} value={d}>{d} days left</option>)}
            </select>
          </div>
          {data && !loading && (
            <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-faint)", alignSelf: "center" }}>
              Last {data.period_days}d · {data.total_flagged} items flagged
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#fff0f0", border: "1px solid #f87171", borderRadius: 10,
            padding: "12px 16px", color: "#dc2626", fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 80, borderRadius: 12, background: "var(--bg1)",
                animation: "reorderPulse 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {/* Summary badges */}
        {data && !loading && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            <SummaryBadge icon="🔴" count={data.critical_count} label="Critical" color="#dc2626" />
            <SummaryBadge icon="🟠" count={data.high_count}     label="High"     color="#c2410c" />
            <SummaryBadge icon="🟡" count={data.medium_count}   label="Medium"   color="#a16207" />
          </div>
        )}

        {/* All clear */}
        {data && !loading && !hasItems && (
          <div style={{
            background: "#f0fdf4", border: "1px solid #86efac",
            borderRadius: 14, padding: "32px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#166534" }}>
              All products well stocked!
            </div>
            <div style={{ fontSize: 13, color: "#15803d", marginTop: 6 }}>
              No reorders needed in the next {threshold} days based on last {days} days of sales.
            </div>
          </div>
        )}

        {/* Grouped supplier sections */}
        {hasItems && !loading && Object.entries(grouped).map(([key, group]) => (
          <SupplierGroup
            key={key}
            supplierName={group.supplierName}
            supplierPhone={group.supplierPhone}
            items={group.items}
          />
        ))}
      </div>

      <style>{`
        @keyframes reorderPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  )
}
