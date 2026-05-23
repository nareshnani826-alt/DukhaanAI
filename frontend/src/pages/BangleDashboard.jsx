import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getToken } from "../sync/db"
import { useLang, LangToggle } from "../hooks/useLang"

const API = import.meta.env.VITE_API_URL ?? ""
const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN")

function greetingKey() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function authHeaders() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders() })
  if (!res.ok) throw new Error("Request failed")
  return res.json()
}

// ── Bangle Briefing Card ───────────────────────────────────────
function BriefingCard({ data, navigate }) {
  const [open, setOpen] = useState(true)
  if (!data) return null

  const { low_stock_count, out_of_stock, dead_stock_count, next_festival } = data
  const festDays = next_festival
    ? Math.round((new Date(next_festival.date) - new Date()) / 86400000)
    : null

  const items = []

  if (out_of_stock > 0)
    items.push({
      icon: "❌", color: "var(--ember)", bg: "var(--ember-bg)",
      text: `${out_of_stock} variant${out_of_stock > 1 ? "s" : ""} OUT of stock`,
      sub: "Restock immediately", to: "/bangle-inventory",
    })

  if (low_stock_count > out_of_stock) {
    const extra = low_stock_count - out_of_stock
    items.push({
      icon: "⚠️", color: "var(--brass)", bg: "var(--brass-bg)",
      text: `${extra} variant${extra > 1 ? "s" : ""} running low`,
      sub: "Check stock levels", to: "/bangle-inventory",
    })
  }

  if (dead_stock_count > 0)
    items.push({
      icon: "💤", color: "#7c5cbf", bg: "rgba(124,92,191,0.1)",
      text: `${dead_stock_count} variant${dead_stock_count > 1 ? "s" : ""} with no sales in 30 days`,
      sub: "Consider discounting", to: "/bangle-insights",
    })

  if (next_festival && festDays !== null && festDays <= 30)
    items.push({
      icon: "🎉", color: "var(--saffron)", bg: "var(--saffron-bg)",
      text: `${next_festival.name} in ${festDays} day${festDays !== 1 ? "s" : ""}`,
      sub: `Stock up on festival colours & designs`, to: "/bangle-festivals",
    })

  if (items.length === 0)
    return (
      <div style={{ background: "var(--bg2)", border: "1px solid var(--rule)", borderRadius: 18,
        padding: "18px 20px", marginBottom: 16, boxShadow: "0 2px 12px var(--shadow)",
        display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 28 }}>✅</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>All clear today!</div>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
            Stock healthy · No alerts · Ready to sell
          </div>
        </div>
      </div>
    )

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--rule)", borderRadius: 18,
      marginBottom: 16, boxShadow: "0 2px 12px var(--shadow)", overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "13px 18px", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
        <span style={{ fontSize: 18 }}>🌅</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>Today's Briefing</div>
          <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 1 }}>
            {items.length} action item{items.length !== 1 ? "s" : ""} need attention
          </div>
        </div>
        <svg width="14" height="14" fill="none" stroke="var(--ink-faint)" strokeWidth="2" viewBox="0 0 24 24"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "0.2s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--rule)" }}>
          {items.map((item, i) => (
            <button key={i} onClick={() => navigate(item.to)}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer",
                padding: "11px 18px", display: "flex", alignItems: "flex-start", gap: 12,
                borderBottom: i < items.length - 1 ? "1px solid var(--rule-soft,rgba(0,0,0,0.05))" : "none",
                transition: "background 0.1s", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg2)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, marginTop: 1,
                background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
                {item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: item.color, lineHeight: 1.3 }}>{item.text}</div>
                <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 3 }}>{item.sub}</div>
              </div>
              <svg width="12" height="12" fill="none" stroke="var(--ink-faint)" strokeWidth="2"
                viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 4 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function BangleDashboard() {
  const { vendor, cloud } = useAuth()
  const navigate = useNavigate()
  const { t } = useLang()

  const [briefing, setBriefing] = useState(null)
  const [profit,   setProfit]   = useState(null)
  const [sales,    setSales]    = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    Promise.all([
      apiFetch("/bangle/insights/briefing"),
      apiFetch("/bangle/insights/profit"),
      apiFetch(`/bangle/sales?sale_date=${today}`),
    ]).then(([b, p, s]) => {
      setBriefing(b)
      setProfit(p)
      setSales(s)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [vendor?.id])

  const tod      = briefing?.today || {}
  const todProfit = profit?.today  || {}
  const avgBill  = tod.bills > 0 ? Math.round(tod.revenue / tod.bills) : 0

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--bg0)" }}>

      {/* Top bar */}
      <div style={{ background: "var(--bg0)", backdropFilter: "blur(6px)",
        borderBottom: "1px solid var(--rule)",
        padding: "12px 16px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10,
        boxShadow: "0 1px 6px var(--shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg,#e87722,#d45f00)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Tiro Devanagari Hindi',serif", fontWeight: 700, fontSize: 17, color: "#fff",
            boxShadow: "0 2px 8px rgba(232,119,34,0.3)" }}>
            {vendor?.store_name?.charAt(0) || "द"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t(greetingKey())}, {vendor?.store_name?.split(" ")[0] || "ji"} 👋
            </div>
            <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 1,
              display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              </span>
              <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 20, flexShrink: 0,
                background: cloud ? "var(--jade-bg)" : "var(--bg2)",
                color:      cloud ? "var(--jade)"   : "var(--ink-faint)",
                border: `1px solid ${cloud ? "rgba(26,122,74,0.3)" : "var(--rule)"}` }}>
                {cloud ? "● Cloud" : "● Local"}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, marginLeft: 8 }}>
          <LangToggle />
          <button onClick={() => navigate("/bangle-billing")} className="btn btn-primary btn-sm">
            {t("+ New Bill")}
          </button>
        </div>
      </div>

      <div className="page-content" style={{ padding: "16px" }}>

        {/* Hero card */}
        <div style={{ background: "linear-gradient(135deg,var(--bg2),var(--bg3))",
          borderRadius: 18, padding: "18px 16px",
          border: "1px solid rgba(166,124,46,0.25)", marginBottom: 14,
          boxShadow: "0 12px 24px var(--shadow)", position: "relative", overflow: "hidden" }}>
          {/* Decorative bangle rings */}
          <svg viewBox="0 0 200 200" style={{ position: "absolute", top: -40, right: -40,
            width: 180, height: 180, opacity: 0.12, pointerEvents: "none" }} aria-hidden="true">
            {[...Array(12)].map((_, i) => (
              <circle key={i} cx="100" cy="100" r={22 + i * 9}
                fill="none" stroke="var(--saffron)" strokeWidth="0.8"/>
            ))}
          </svg>
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--brass-deep)",
              letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>
              {t("Today's Takings — Bangle Store")}
            </div>
            <div className="hero-revenue" style={{ fontFamily: "'Tiro Devanagari Hindi',serif",
              fontSize: 48, fontWeight: 800, color: "var(--ink)", lineHeight: 1, letterSpacing: "-1px" }}>
              {loading ? "—" : INR(tod.revenue)}
            </div>

            {/* Profit clarity */}
            {profit && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8,
                padding: "7px 12px", borderRadius: 10, width: "fit-content",
                background: todProfit.profit >= 0 ? "var(--jade-bg)" : "var(--ember-bg)",
                border: `1px solid ${todProfit.profit >= 0 ? "rgba(26,122,74,0.2)" : "rgba(192,57,43,0.2)"}` }}>
                <span style={{ fontSize: 14 }}>{todProfit.profit >= 0 ? "📈" : "📉"}</span>
                <span style={{ fontSize: 13, fontWeight: 700,
                  color: todProfit.profit >= 0 ? "var(--jade)" : "var(--ember)" }}>
                  {todProfit.profit >= 0 ? "+" : ""}{INR(todProfit.profit)} profit
                </span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)", marginLeft: 4 }}>
                  ({todProfit.margin_pct}% margin)
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 12, flexWrap: "wrap" }}>
              <span style={{ color: "var(--jade)", fontWeight: 600 }}>
                {tod.bills > 0 ? `${tod.bills} bill${tod.bills > 1 ? "s" : ""} today` : "No bills yet"}
              </span>
              {tod.pieces > 0 && (
                <span style={{ color: "var(--ink-faint)" }}>{tod.pieces} pieces sold</span>
              )}
              {tod.top_colour && (
                <span style={{ color: "var(--saffron)", fontWeight: 600 }}>
                  🏆 {tod.top_colour}
                </span>
              )}
              {profit?.month && (
                <span style={{ color: "var(--ink-faint)" }}>
                  Monthly: {INR(profit.month.revenue)} · {profit.month.margin_pct}% margin
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Briefing */}
        <BriefingCard data={briefing} navigate={navigate} />

        {/* Stats row */}
        <div className="dash-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          {[
            {
              label: t("Bills Today"),
              value: loading ? "—" : tod.bills || 0,
              sub:   loading ? "" : tod.pieces > 0 ? `${tod.pieces} ${t("pieces sold")}` : t("Start selling"),
              color: "var(--saffron)", bar: "var(--saffron)",
            },
            {
              label: t("Avg Bill"),
              value: loading ? "—" : INR(avgBill),
              sub:   t("Today"),
              color: "var(--brass)", bar: "var(--brass-deep)",
            },
            {
              label: t("Low Stock"),
              value: loading ? "—" : briefing?.low_stock_count ?? 0,
              sub:   briefing?.out_of_stock > 0 ? `${briefing.out_of_stock} ${t("Out of stock")}` : t("variants"),
              color: briefing?.low_stock_count > 0 ? "var(--ember)" : "var(--jade)",
              bar:   briefing?.low_stock_count > 0 ? "var(--ember)" : "var(--jade)",
            },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-bar" style={{ background: s.bar }}/>
              <div style={{ fontSize: 9, fontWeight: 700, color: "var(--ink-faint)",
                textTransform: "uppercase", letterSpacing: "1.2px", marginTop: 4 }}>{s.label}</div>
              <div style={{ fontFamily: "'Tiro Devanagari Hindi',serif",
                fontSize: 22, fontWeight: 800, color: "var(--ink)", marginTop: 6, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.color, marginTop: 4, fontWeight: 600 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--brass-deep)",
            letterSpacing: "2px", textTransform: "uppercase" }}>{t("QUICK ACTIONS")}</div>
        </div>
        <div className="dash-quick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
          {[
            { label: t("New Bill"),  emoji: "🧾", tone: "var(--saffron)", border: "rgba(212,98,31,0.35)",  to: "/bangle-billing" },
            { label: t("Add Stock"), emoji: "💍", tone: "var(--brass)",   border: "rgba(166,124,46,0.35)", to: "/bangle-inventory" },
            { label: t("Festivals"), emoji: "🎉", tone: "var(--jade)",    border: "rgba(46,156,122,0.35)", to: "/bangle-festivals" },
            { label: t("Insights"),  emoji: "📊", tone: "#7c5cbf",        border: "rgba(124,92,191,0.35)", to: "/bangle-insights" },
          ].map((qa, i) => (
            <button key={i} onClick={() => navigate(qa.to)}
              style={{ background: "var(--bg2)", border: "1px solid var(--rule)",
                borderRadius: 12, padding: "12px 6px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                transition: "all 0.15s", boxShadow: "0 1px 4px var(--shadow)" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = qa.border }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "var(--rule)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 9,
                background: `color-mix(in srgb, ${qa.tone} 18%, transparent)`,
                border: `1px solid ${qa.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{qa.emoji}</div>
              <span style={{ fontSize: 10, color: "var(--ink)", fontWeight: 600 }}>{qa.label}</span>
            </button>
          ))}
        </div>

        {/* Bottom grid */}
        <div className="dash-bottom-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* Recent bills */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--brass-deep)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                {t("Recent Bills")}
              </div>
              <button onClick={() => navigate("/bangle-billing")}
                style={{ fontSize: 11, color: "var(--saffron)", fontWeight: 600,
                  background: "none", border: "none", cursor: "pointer" }}>{t("View all →")}</button>
            </div>
            <div style={{ background: "var(--bg2)", borderRadius: 14,
              border: "1px solid var(--rule)", overflow: "hidden",
              boxShadow: "0 4px 10px var(--shadow)" }}>
              {loading ? [1,2,3].map(i => (
                <div key={i} style={{ height: 54, borderBottom: "1px solid var(--rule-soft)",
                  background: "var(--bg2)", margin: "2px 0" }}/>
              )) : sales.length === 0 ? (
                <div style={{ padding: "28px 16px", textAlign: "center",
                  color: "var(--ink-faint)", fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💍</div>
                  {t("No bills yet today")}
                </div>
              ) : sales.slice(0, 5).map((s, i) => {
                const pieces = (s.items || []).reduce((t, it) => t + (it.pieces || 0), 0)
                const time   = new Date(s.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 14px", borderBottom: i < 4 ? "1px solid var(--rule-soft)" : "none" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 13 }}>
                      {(s.customer_name || "W").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.customer_name || "Walk-in"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                        {pieces} pc · {time}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--saffron)" }}>
                      {INR(s.total)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stock health */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--brass-deep)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                {t("Stock Health")}
              </div>
              <button onClick={() => navigate("/bangle-inventory")}
                style={{ fontSize: 11, color: "var(--saffron)", fontWeight: 600,
                  background: "none", border: "none", cursor: "pointer" }}>{t("View all →")}</button>
            </div>
            <div style={{ background: "var(--bg2)", borderRadius: 14,
              border: "1px solid var(--rule)", overflow: "hidden",
              boxShadow: "0 4px 10px var(--shadow)" }}>
              {loading ? [1,2,3].map(i => (
                <div key={i} style={{ height: 54, borderBottom: "1px solid var(--rule-soft)",
                  background: "var(--bg2)", margin: "2px 0" }}/>
              )) : (
                <>
                  {/* Summary rows */}
                  {[
                    { label: t("Out of stock"),     value: briefing?.out_of_stock ?? 0,    icon: "🔴", danger: true },
                    { label: t("Low Stock"),        value: briefing ? Math.max(0, (briefing.low_stock_count || 0) - (briefing.out_of_stock || 0)) : 0, icon: "🟡", warn: true },
                    { label: t("Dead stock (30d)"), value: briefing?.dead_stock_count ?? 0, icon: "💤", muted: true },
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
                      padding: "13px 14px", borderBottom: i < 2 ? "1px solid var(--rule-soft)" : "none" }}>
                      <span style={{ fontSize: 18 }}>{row.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{row.label}</div>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 800,
                        color: row.danger && row.value > 0 ? "var(--ember)"
                             : row.warn   && row.value > 0 ? "var(--brass)"
                             : "var(--ink-faint)" }}>
                        {row.value}
                      </span>
                    </div>
                  ))}

                  {/* Next festival teaser */}
                  {briefing?.next_festival && (
                    <button onClick={() => navigate("/bangle-festivals")}
                      style={{ width: "100%", background: "var(--saffron-bg)", border: "none",
                        borderTop: "1px solid var(--rule)", padding: "11px 14px",
                        display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                        textAlign: "left" }}>
                      <span style={{ fontSize: 18 }}>🎉</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--saffron)" }}>
                          {briefing.next_festival.name}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                          {Math.round((new Date(briefing.next_festival.date) - new Date()) / 86400000)}d away · Check stock readiness
                        </div>
                      </div>
                      <svg width="12" height="12" fill="none" stroke="var(--saffron)" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ height: 24 }}/>
      </div>
    </div>
  )
}
