// Chai shop / restaurant bill history: any dates, search by bill no, table, customer or item,
// filter by how it was paid, and open a bill to print, resend on WhatsApp or cancel it.
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { ChaiOrders, localDay, chaiBillText, sendOnWhatsApp } from "../sync/chaiDb.js"
import { printChaiBill } from "../utils/chaiPrint.js"
import { backdrop, sheet } from "../components/popupMotion.js"
import { getStoreName } from "../sync/db.js"
import { BillIcon } from "../components/billing/billMotion.jsx"
import { SkeletonRows } from "../components/Skeleton.jsx"
import { tr, uiLang, dateLocale } from "../i18n/kiranaStrings"

const L = k => tr(k, uiLang())
const INR = n => "₹" + (Math.round((+n || 0) * 100) / 100).toLocaleString("en-IN")
const PAGE = 50

const RANGES = [["today", "Today"], ["yesterday", "Yesterday"], ["7d", "7 days"], ["30d", "30 days"], ["custom", "Pick dates"]]
const FILTERS = [["all", "All"], ["cash", "Cash"], ["upi", "UPI"], ["credit", "Khata"], ["open", "Open"], ["cancelled", "Cancelled"]]

function rangeFor(id) {
  const d = new Date()
  const back = n => { const x = new Date(d); x.setDate(x.getDate() - n); return localDay(x) }
  if (id === "yesterday") return { from: back(1), to: back(1) }
  if (id === "7d") return { from: back(6), to: localDay(d) }
  if (id === "30d") return { from: back(29), to: localDay(d) }
  return { from: localDay(d), to: localDay(d) }
}

const statusText = o => o.status === "paid"
  ? (o.payment_mode === "credit" ? `${L("Khata")}${o.customer_name ? " · " + o.customer_name : ""}` : o.payment_mode === "cash" ? L("Cash") : "UPI")
  : L(o.status === "open" ? "Open" : "Cancelled")
const statusColor = o => o.status === "paid" ? "var(--jade)" : o.status === "open" ? "var(--saffron)" : "var(--ink-faint)"
// Badge colours: Cash green, UPI blue, Khata orange, Open amber, Cancelled red
const BADGE = { cash:["#e3f5ec","#1a7f4b"], upi:["#e6effd","#2a5bd7"], credit:["#fdeedd","#b45309"], open:["#fff4d6","#a16207"], cancelled:["#fde8e6","#c0392b"] }
const badgeOf = o => BADGE[o.status === "paid" ? o.payment_mode : o.status] || BADGE.cancelled
// A table opened and cancelled before anything was ordered: nothing happened, so not shown
const isEmptyCancelled = o => o.status === "cancelled" && !(o.items || []).length && !(+o.total)

const chip = on => ({ flexShrink:0, minHeight:40, padding:"0 14px", borderRadius:20, fontWeight:700, fontSize:14, cursor:"pointer",
  border: on ? "none" : "1px solid var(--rule)", background: on ? "var(--saffron)" : "var(--bg1)", color: on ? "#fff" : "var(--ink-dim)" })
const input = { width:"100%", minHeight:46, padding:"0 14px", borderRadius:12, border:"1.5px solid var(--rule)", background:"var(--bg1)",
  color:"var(--ink)", fontSize:16, outline:"none" }

export default function ChaiHistory() {
  const navigate = useNavigate()
  const [range, setRange]   = useState("today")
  const [custom, setCustom] = useState(() => ({ from: localDay(), to: localDay() }))
  const [loaded, setLoaded] = useState({ key: "", orders: [], error: "" })   // bills for the dates in `key`
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [more, setMore]     = useState({ key: "", n: PAGE })                 // "Show more" count for one view
  const [open, setOpen]     = useState(null)     // bill shown in the detail sheet
  const [tick, setTick]     = useState(0)

  const { from, to } = range === "custom" ? custom : rangeFor(range)
  const loadKey = `${from}|${to}|${tick}`
  const orders  = loaded.key === loadKey ? loaded.orders : null              // null while loading
  const error   = loaded.key === loadKey ? loaded.error : ""
  const viewKey = `${from}|${to}|${search}|${filter}`
  const shown   = more.key === viewKey ? more.n : PAGE

  useEffect(() => {
    if (!from || !to || from > to) return
    let live = true
    ChaiOrders.list({ from, to })
      .then(o => { if (live) setLoaded({ key: loadKey, orders: o || [], error: "" }) })
      .catch(e => { if (live) setLoaded({ key: loadKey, orders: [], error: e.message || L("Could not load bills") }) })
    return () => { live = false }
  }, [from, to, loadKey])

  const list = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#/, "")
    return (orders || []).filter(o => {
      if (isEmptyCancelled(o)) return false
      if (filter === "open" || filter === "cancelled") { if (o.status !== filter) return false }
      else if (filter !== "all" && !(o.status === "paid" && o.payment_mode === filter)) return false
      if (!q) return true
      return String(o.order_no) === q
        || (o.label || "").toLowerCase().includes(q)
        || (o.customer_name || "").toLowerCase().includes(q)
        || (o.items || []).some(it => (it.name || "").toLowerCase().includes(q))
    })
  }, [orders, search, filter])

  const paidTotal = list.filter(o => o.status === "paid").reduce((s, o) => s + (+o.total || 0), 0)
  const cancelledList = list.filter(o => o.status === "cancelled")
  const cancelledTotal = cancelledList.reduce((s, o) => s + (+o.total || 0), 0)

  async function cancel(o) {
    if (!confirm(`${L("Cancel bill")} #${o.order_no} (${INR(o.total)})?`)) return
    try { await ChaiOrders.cancel(o.id); setOpen(null); setTick(t => t + 1) } catch (e) { alert(e.message) }
  }

  const when = o => new Date(o.paid_at || o.created_at)
  const fmtWhen = o => {
    const d = when(o)
    const time = d.toLocaleTimeString(dateLocale(), { hour:"2-digit", minute:"2-digit" })
    return from === to ? time : `${d.toLocaleDateString(dateLocale(), { day:"numeric", month:"short" })} · ${time}`
  }

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12, maxWidth:900, width:"100%", margin:"0 auto" }}>
      <div style={{ fontSize:22, fontWeight:900 }}>{L("Bill history")}</div>

      {/* Dates */}
      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:2, scrollbarWidth:"none" }}>
        {RANGES.map(([id, label]) => (
          <button key={id} onClick={() => setRange(id)} style={chip(range === id)}>{L(label)}</button>
        ))}
      </div>
      {range === "custom" && (
        <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:10 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"var(--ink-dim)" }}>{L("From")}
            <input type="date" value={custom.from} max={localDay()} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} style={{ ...input, marginTop:4 }} />
          </label>
          <label style={{ fontSize:12, fontWeight:700, color:"var(--ink-dim)" }}>{L("To")}
            <input type="date" value={custom.to} max={localDay()} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} style={{ ...input, marginTop:4 }} />
          </label>
          {custom.from > custom.to && <div style={{ gridColumn:"1 / -1", color:"#c0392b", fontSize:13, fontWeight:600 }}>{L("The From date must be before the To date.")}</div>}
        </div>
      )}

      {/* Search + how it was paid */}
      <div style={{ position:"relative" }}>
        <span style={{ position:"absolute", left:14, top:13, color:"var(--ink-faint)" }}><BillIcon name="search" size={20} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} type="search"
          placeholder={L("Search bill no, table, customer or item")} style={{ ...input, paddingLeft:44 }} />
      </div>
      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:2, scrollbarWidth:"none" }}>
        {FILTERS.map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={chip(filter === id)}>{L(label)}</button>
        ))}
      </div>

      {/* Count and money for what is shown */}
      {orders && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"4px 2px", fontWeight:700, color:"var(--ink-dim)" }}>
          <span>
            {list.length} {L(list.length === 1 ? "bill" : "bills")}
            {cancelledList.length > 0 && filter !== "cancelled" && (
              <span style={{ fontSize:12, fontWeight:600, color:"#c0392b", marginLeft:8 }}>
                · {cancelledList.length} {L("cancelled")} ({INR(cancelledTotal)})
              </span>
            )}
          </span>
          <span>{L("Paid")} <b style={{ color:"var(--ink)", fontSize:18 }}>{INR(paidTotal)}</b></span>
        </div>
      )}

      <div style={{ background:"var(--bg1)", border:"1px solid var(--rule)", borderRadius:18, padding:"4px 14px" }}>
        {!orders ? <div style={{ padding:"10px 0" }}><SkeletonRows rows={6} /></div>
          : error ? <div style={{ padding:"16px 0", color:"#c0392b", fontWeight:600 }}>{error}</div>
          : list.length === 0 ? <div style={{ padding:"16px 0", color:"var(--ink-faint)" }}>{L(search || filter !== "all" ? "No bills match" : "No bills on these dates")}</div>
          : list.slice(0, shown).map((o, i) => (
            <button key={o.id} onClick={() => setOpen(o)} aria-label={`Bill ${o.order_no}`}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"12px 0", border:"none", background:"transparent",
                borderTop: i ? "1px solid var(--rule)" : "none", cursor:"pointer", textAlign:"left", color:"var(--ink)" }}>
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", fontWeight:800 }}>
                  <span>#{o.order_no}{o.label ? ` · ${o.label}` : ""}</span>
                  <span style={{ fontSize:11, fontWeight:800, padding:"3px 9px", borderRadius:20, whiteSpace:"nowrap",
                    background: badgeOf(o)[0], color: badgeOf(o)[1] }}>{statusText(o)}</span>
                </span>
                <span style={{ display:"block", fontSize:12, color:"var(--ink-faint)", marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {fmtWhen(o)} · {(o.items || []).length ? o.items.map(it => `${it.name} ×${it.qty}`).join(", ") : L("No items")}
                </span>
              </span>
              <span style={{ fontWeight:800, color: o.status === "cancelled" ? "var(--ink-faint)" : "var(--ink)",
                textDecoration: o.status === "cancelled" ? "line-through" : "none" }}>{INR(o.total)}</span>
            </button>
          ))}
      </div>
      {orders && list.length > shown && (
        <button onClick={() => setMore({ key: viewKey, n: shown + PAGE })} className="btn"
          style={{ minHeight:48, borderRadius:14, border:"1px solid var(--rule)", background:"var(--bg1)", color:"var(--ink)", fontWeight:800, cursor:"pointer" }}>
          {L("Show more")} ({list.length - shown})
        </button>
      )}

      {/* One bill */}
      <AnimatePresence>
        {open && (
          <motion.div key="bill" {...backdrop} onClick={() => setOpen(null)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:60, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
            <motion.div {...sheet} onClick={e => e.stopPropagation()}
              style={{ width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto", background:"var(--bg0, var(--bg1))", borderRadius:"20px 20px 0 0",
                padding:"18px 16px calc(18px + env(safe-area-inset-bottom,0px))", display:"flex", flexDirection:"column", gap:12, color:"var(--ink)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:900 }}>{L("Bill")} #{open.order_no}{open.label ? ` · ${open.label}` : ""}</div>
                  <div style={{ fontSize:13, color:"var(--ink-faint)" }}>
                    {when(open).toLocaleDateString(dateLocale(), { weekday:"short", day:"numeric", month:"short" })} · {when(open).toLocaleTimeString(dateLocale(), { hour:"2-digit", minute:"2-digit" })}
                    {" · "}<b style={{ color:statusColor(open) }}>{statusText(open)}</b>
                  </div>
                </div>
                <button onClick={() => setOpen(null)} aria-label="Close"
                  style={{ width:40, height:40, borderRadius:12, border:"1px solid var(--rule)", background:"var(--bg1)", color:"var(--ink-dim)", cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center" }}><BillIcon name="x" size={18} /></button>
              </div>
              <div style={{ background:"var(--bg1)", border:"1px solid var(--rule)", borderRadius:14, padding:"4px 12px" }}>
                {(open.items || []).map((it, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", gap:10, padding:"8px 0", borderTop: i ? "1px dashed var(--rule)" : "none" }}>
                    <span>{it.name} <span style={{ color:"var(--ink-faint)" }}>× {it.qty}</span></span>
                    <span style={{ fontWeight:700 }}>{INR(it.price * it.qty)}</span>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0 6px", borderTop:"1px solid var(--rule)", fontSize:18, fontWeight:900 }}>
                  <span>{L("Total")}</span><span>{INR(open.total)}</span>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:8 }}>
                {open.status === "paid" && <>
                  <button onClick={() => printChaiBill(open, getStoreName())} className="btn btn-primary" style={{ minHeight:48 }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}><BillIcon name="printer" size={18} />{L("Print")}</span>
                  </button>
                  <button onClick={() => sendOnWhatsApp("", chaiBillText(open, getStoreName()))} className="btn"
                    style={{ minHeight:48, border:"1px solid var(--rule)", background:"var(--bg1)", color:"#1a9e4b", fontWeight:800 }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}><BillIcon name="whatsapp" size={18} />WhatsApp</span>
                  </button>
                </>}
                {open.status === "open" && (
                  <button onClick={() => navigate("/chai-billing", { state:{ mode:"table", orderId:open.id } })} className="btn btn-primary" style={{ minHeight:48 }}>
                    {L("Open this table")}
                  </button>
                )}
                {open.status !== "cancelled" && (
                  <button onClick={() => cancel(open)} className="btn"
                    style={{ minHeight:48, border:"1px solid var(--rule)", background:"var(--bg1)", color:"#c0392b", fontWeight:800 }}>
                    {L("Cancel bill")}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
