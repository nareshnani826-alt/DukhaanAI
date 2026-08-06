import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Agent } from "../sync/db"

// No supplier phone stored against kirana products (unlike bangle suppliers),
// so we open a blank WhatsApp compose — vendor picks the contact themselves.
function buildWhatsAppDraft(payload) {
  const qtyPart = payload.suggested_qty ? ` — ${payload.suggested_qty} ${payload.unit || ""}`.trim() : ""
  const msg = `Hello, we need to restock:\n\n• ${payload.product_name}${qtyPart}\n\nPlease confirm availability. Thank you!`
  return `https://wa.me/?text=${encodeURIComponent(msg)}`
}

const URGENCY_META = {
  critical: { label: "Critical", dot: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  high:     { label: "High",     dot: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
  medium:   { label: "Medium",   dot: "#a16207", bg: "#fefce8", border: "#fde68a" },
}

const KIND_LABEL = {
  reorder:       "🛒 Reorder",
  festival_prep: "🎉 Festival Prep",
  margin:        "💰 Margin",
  dead_stock:    "📦 Dead Stock",
}

function SuggestionCard({ s, onApprove, onDismiss, busyId }) {
  const [expanded, setExpanded] = useState(false)
  const meta = URGENCY_META[s.urgency] || URGENCY_META.medium
  const busy = busyId === s.id
  const resolved = s.status !== "pending"

  return (
    <div className="card" style={{ borderLeft: `4px solid ${meta.dot}`, background: meta.bg, opacity: resolved ? 0.6 : 1 }}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-[10px] font-semibold text-gray-500">{KIND_LABEL[s.kind] || s.kind}</div>
        <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: meta.dot }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.dot, display: "inline-block" }} />
          {meta.label}
        </div>
      </div>

      <div className="text-sm font-semibold text-gray-800 mb-1">{s.title}</div>
      <div className="text-xs text-gray-600 mb-2">{s.summary}</div>

      {s.reasoning && (
        <button
          className="text-[10px] text-gray-400 underline mb-2"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? "Hide reasoning" : "Why is this suggested?"}
        </button>
      )}
      {expanded && (
        <div className="text-[11px] text-gray-500 bg-white/60 rounded-md p-2 mb-2 border border-gray-200">
          {s.reasoning}
        </div>
      )}

      {resolved ? (
        <div className="text-[10px] font-semibold text-gray-500">
          {s.status === "approved" ? "✓ Approved" : "✕ Dismissed"}
        </div>
      ) : (
        <div className="flex gap-2 mt-2">
          <button
            disabled={busy}
            onClick={() => onApprove(s)}
            className="flex-1 text-xs font-semibold rounded-lg py-2"
            style={{ background: "#1a7a4a", color: "white", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "…" : "Approve"}
          </button>
          <button
            disabled={busy}
            onClick={() => onDismiss(s.id)}
            className="flex-1 text-xs font-semibold rounded-lg py-2 border border-gray-300 text-gray-500"
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "…" : "Dismiss"}
          </button>
        </div>
      )}
    </div>
  )
}

export default function AgentSuggestions() {
  const navigate = useNavigate()
  const [status, setStatus]     = useState("pending")
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [running, setRunning]   = useState(false)
  const [busyId, setBusyId]     = useState(null)
  const [error, setError]       = useState("")
  const [lastRun, setLastRun]   = useState(null)

  const load = useCallback(async (s = status) => {
    setLoading(true)
    setError("")
    try {
      setItems(await Agent.list(s))
    } catch (e) {
      setError(e.message || "Failed to load suggestions")
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { load(status) }, [status, load])

  async function handleRun() {
    setRunning(true)
    setError("")
    try {
      const result = await Agent.run()
      setLastRun(result)
      if (status === "pending") await load("pending")
    } catch (e) {
      setError(e.message || "Agent run failed")
    } finally {
      setRunning(false)
    }
  }

  // Approve records the vendor's decision AND, when the suggestion is grounded to a real
  // product, kicks off the follow-through action so the vendor doesn't have to re-find it.
  // window.open() MUST happen synchronously, before any `await` — once the click handler
  // yields to the event loop, browsers no longer treat window.open as user-triggered and
  // silently block it as a popup.
  async function handleApprove(s) {
    const payload = s.payload || {}
    if ((s.kind === "reorder" || s.kind === "festival_prep") && payload.product_name) {
      window.open(buildWhatsAppDraft(payload), "_blank", "noopener,noreferrer")
    }

    setBusyId(s.id)
    try {
      await Agent.approve(s.id)
      if ((s.kind === "margin" || s.kind === "dead_stock") && payload.product_name) {
        navigate(`/inventory?q=${encodeURIComponent(payload.product_name)}`)
      }
      setItems(prev => prev.filter(x => x.id !== s.id))
    } catch (e) {
      setError(e.message || "Could not approve")
    } finally {
      setBusyId(null)
    }
  }

  async function handleDismiss(id) {
    setBusyId(id)
    try {
      await Agent.dismiss(id)
      setItems(prev => prev.filter(x => x.id !== id))
    } catch (e) {
      setError(e.message || "Could not dismiss")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="page-sticky-header flex items-center justify-between mb-1">
        <div>
          <h1 className="text-sm font-semibold">🤖 AI Suggestions</h1>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Correlates reorder, festival demand, margin & dead-stock signals into a prioritized action list. Nothing changes until you approve.
          </div>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="text-xs font-semibold rounded-lg px-3 py-2 flex-shrink-0"
          style={{ background: "var(--saffron,#e87722)", color: "white", opacity: running ? 0.7 : 1 }}
        >
          {running ? "Thinking…" : "Run Agent"}
        </button>
      </div>

      {lastRun && (
        <div className="text-[11px] text-gray-400 mb-3">
          Last run: reviewed {lastRun.signals_reviewed?.reorder_items || 0} reorder items,
          {" "}{lastRun.signals_reviewed?.margin_alerts || 0} margin alerts,
          {" "}{lastRun.signals_reviewed?.dead_stock_items || 0} dead-stock items
          — {lastRun.created_count} new suggestion{lastRun.created_count === 1 ? "" : "s"}.
        </div>
      )}

      <div className="flex gap-2 mb-3">
        {["pending", "approved", "dismissed", "all"].map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className="text-[11px] font-semibold rounded-full px-3 py-1"
            style={{
              background: status === s ? "var(--saffron,#e87722)" : "var(--bg2,#f3f4f6)",
              color: status === s ? "white" : "var(--ink-dim,#6b7280)",
            }}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card text-center py-8">
          <div className="text-2xl mb-2">✅</div>
          <div className="text-sm text-gray-500">
            {status === "pending" ? "No pending suggestions. Tap Run Agent to check for new ones." : `No ${status} suggestions.`}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map(s => (
            <SuggestionCard key={s.id} s={s} onApprove={handleApprove} onDismiss={handleDismiss} busyId={busyId} />
          ))}
        </div>
      )}
    </div>
  )
}
