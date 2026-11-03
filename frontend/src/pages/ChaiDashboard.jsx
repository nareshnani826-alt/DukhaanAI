// Chai shop home: the day's takings (cash / UPI / khata), cups sold, best sellers,
// raw material used and running low, and the bills list.
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { ChaiMenu, ChaiMaterials, ChaiOrders, buildReport, localDay, chaiBillText, sendOnWhatsApp, buyingList } from "../sync/chaiDb.js"
import { backdrop, sheet } from "../components/popupMotion.js"
import { getStoreName } from "../sync/db.js"
import { AnimatedAmount, BillIcon } from "../components/billing/billMotion.jsx"
import { SkeletonBar, SkeletonRows } from "../components/Skeleton.jsx"
import { tr, uiLang } from "../i18n/kiranaStrings"

const L = k => tr(k, uiLang())
const INR = n => "₹" + (Math.round((+n || 0) * 100) / 100).toLocaleString("en-IN")
const fmtQty = (q, unit) => `${Math.round(q * 1000) / 1000} ${unit}`

function rangeFor(id) {
  const d = new Date()
  const back = n => { const x = new Date(d); x.setDate(x.getDate() - n); return localDay(x) }
  if (id === "yesterday") return { from: back(1), to: back(1) }
  if (id === "7d") return { from: back(6), to: localDay(d) }
  if (id === "30d") return { from: back(29), to: localDay(d) }
  return { from: localDay(d), to: localDay(d) }
}

const card = { background:"var(--bg1)", border:"1px solid var(--rule)", borderRadius:18, padding:16 }
const CLOSE_KEY = day => `dk_chai_close_${day}`
const readClose = day => { try { return JSON.parse(localStorage.getItem(CLOSE_KEY(day))) } catch { return null } }

export default function ChaiDashboard() {
  const navigate = useNavigate()
  const [range, setRange] = useState("today")
  const [data, setData]   = useState(null)
  const [error, setError] = useState(null)
  const [tick, setTick]   = useState(0)
  const [hist, setHist]   = useState(null)    // last 28 days, for tomorrow's buying list
  const [closing, setClosing] = useState(false)
  const [closed, setClosed]   = useState(() => readClose(localDay()))

  useEffect(() => {
    let live = true
    const { from, to } = rangeFor(range)
    Promise.all([ChaiOrders.list({ from, to }), ChaiMenu.list(), ChaiMaterials.list(), ChaiOrders.list({ status:"open" })])
      .then(([orders, menu, materials, open]) => {
        if (!live) return
        setData({ orders, menu, materials, open, report: buildReport(orders, menu, materials) })
        setError(null)
      })
      .catch(e => live && setError(e.message || "Could not load"))
    return () => { live = false }
  }, [range, tick])

  useEffect(() => {
    const from = new Date(); from.setDate(from.getDate() - 28)
    ChaiOrders.list({ from: localDay(from) }).then(setHist).catch(() => setHist([]))
  }, [tick])

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const plan = hist && data ? buyingList(hist, data.menu, data.materials, tomorrow) : null
  const toBuy = plan?.items.filter(x => x.buy > 0) || []
  const dayName = tomorrow.toLocaleDateString("en-IN", { weekday:"long" })

  function shareBuyList() {
    const lines = toBuy.map(x => `• ${x.name}: ${fmtQty(x.buy, x.unit)}`).join("\n")
    sendOnWhatsApp("", `🛒 *${getStoreName() || L("Chai Shop")}* — ${L("to buy for")} ${dayName}\n\n${lines}`)
  }

  async function cancel(o) {
    if (!confirm(`${L("Cancel bill")} #${o.order_no} (${INR(o.total)})?`)) return
    try { await ChaiOrders.cancel(o.id); setTick(t => t + 1) } catch (e) { alert(e.message) }
  }

  const r = data?.report
  const low = (data?.materials || []).filter(m => +m.min_stock > 0 && +m.stock <= +m.min_stock)

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:14, maxWidth:1100, width:"100%", margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900 }}>{L("Chai Shop")}</div>
          <div style={{ fontSize:13, color:"var(--ink-faint)" }}>{new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" })}</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <motion.button whileTap={{ scale:0.96 }} onClick={() => setClosing(true)}
            style={{ minHeight:52, padding:"0 16px", borderRadius:14, fontWeight:800, fontSize:15, cursor:"pointer",
              border:"1.5px solid var(--rule)", background:"var(--bg1)", color:"var(--ink)", display:"inline-flex", alignItems:"center", gap:8 }}>
            <BillIcon name={closed ? "check" : "lock"} size={18} />{closed ? L("Day closed") : L("Close the day")}
          </motion.button>
          <motion.button whileTap={{ scale:0.96 }} className="btn btn-primary" onClick={() => navigate("/chai-billing")}
            style={{ minHeight:52, padding:"0 20px", borderRadius:14, fontWeight:800, fontSize:16 }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}><BillIcon name="coffee" size={20} />{L("Start billing")}</span>
          </motion.button>
        </div>
      </div>

      <div className="chip-row" style={{ display:"flex", gap:8, overflowX:"auto" }}>
        {[["today", "Today"], ["yesterday", "Yesterday"], ["7d", "7 days"], ["30d", "30 days"]].map(([id, label]) => (
          <button key={id} className="tap-chip" onClick={() => setRange(id)}
            style={{ flexShrink:0, padding:"8px 16px", borderRadius:20, fontWeight:700, border:"1.5px solid",
              borderColor: range === id ? "var(--saffron)" : "var(--rule)",
              background: range === id ? "var(--saffron)" : "var(--bg1)", color: range === id ? "#fff" : "var(--ink-dim)" }}>
            {L(label)}
          </button>
        ))}
      </div>

      {error && <div style={{ ...card, color:"#c0392b", fontWeight:700 }}>{error}</div>}

      {/* Takings: big total, then how it was paid */}
      <div style={{ ...card, padding:20 }}>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--ink-dim)" }}>{L("Total sales")}</div>
            <div style={{ fontSize:40, fontWeight:900, lineHeight:1.1, color:"var(--ink)" }}>
              {r ? <AnimatedAmount value={r.total} from={0} /> : <SkeletonBar w={160} h={40} />}
            </div>
          </div>
          <div style={{ display:"flex", gap:18 }}>
            <Mini icon="coffee" label={L("Cups sold")} value={r?.cups} />
            <Mini icon="receipt" label={L("Bills")} value={r?.bills} />
            {r && r.cost > 0 && <Mini icon="trend" label={L("Approx. profit")} value={INR(r.total - r.cost)} />}
          </div>
        </div>
        <SplitBar r={r} />
      </div>

      {data && data.open.length > 0 && (
        <button onClick={() => navigate("/chai-billing")}
          style={{ ...card, textAlign:"left", cursor:"pointer", borderColor:"var(--saffron)", color:"var(--ink)" }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}><BillIcon name="utensils" size={18} />
            <b>{data.open.length} {L("tables still to pay")}</b> · {INR(data.open.reduce((s, o) => s + +o.total, 0))}</span>
        </button>
      )}

      {/* First day: nothing counted yet, so ask for today's stock instead of warning about all of it */}
      {data && data.materials.length > 0 && data.materials.every(m => !(+m.stock > 0)) ? (
        <button onClick={() => navigate("/chai-stock")}
          style={{ ...card, textAlign:"left", display:"flex", alignItems:"center", gap:14, color:"var(--ink)", borderColor:"var(--jade)", cursor:"pointer" }}>
          <span style={{ width:44, height:44, borderRadius:12, background:"rgba(29,158,117,0.12)", color:"var(--jade)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <BillIcon name="truck" size={22} />
          </span>
          <span>
            <span style={{ display:"block", fontWeight:800 }}>{L("Add today's stock")}</span>
            <span style={{ display:"block", fontSize:13, color:"var(--ink-dim)" }}>{L("Enter milk, sugar, tea powder and cups once. Every sale then reduces them.")}</span>
          </span>
        </button>
      ) : low.length > 0 && (
        <button onClick={() => navigate("/chai-stock")}
          style={{ ...card, textAlign:"left", cursor:"pointer", borderColor:"#e67e22", background:"rgba(230,126,34,0.08)", color:"var(--ink)" }}>
          <div style={{ fontWeight:800, marginBottom:4, display:"flex", alignItems:"center", gap:8, color:"#b35c00" }}><BillIcon name="alert" size={18} />{L("Running low")}</div>
          <div style={{ fontSize:14 }}>{low.map(m => `${m.name}: ${fmtQty(+m.stock, m.unit)}`).join(" · ")}</div>
        </button>
      )}

      {plan && plan.items.length > 0 && (
        <div style={{ ...card, borderColor:"var(--jade)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
            <CardTitle icon="sun">{L("For tomorrow")} · {dayName}</CardTitle>
            {toBuy.length > 0 && (
              <button onClick={shareBuyList}
                style={{ minHeight:40, padding:"0 12px", borderRadius:10, border:"none", background:"#25D366", color:"#fff", fontWeight:800, cursor:"pointer",
                  display:"inline-flex", alignItems:"center", gap:6, marginBottom:10 }}>
                <BillIcon name="whatsapp" size={16} />{L("Share list")}
              </button>
            )}
          </div>
          <div style={{ fontSize:12, color:"var(--ink-dim)", marginBottom:8 }}>
            {plan.sameWeekday ? `${L("Based on the last")} ${plan.basis} ${dayName}s` : `${L("Based on your daily average")} (${plan.basis} ${L("days")})`} · +10%
          </div>
          {plan.items.map((x, i) => (
            <motion.div key={x.id} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay: i * 0.04 }}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderTop: i ? "1px solid var(--rule)" : "none" }}>
              <span style={{ flex:1, fontWeight:700 }}>{x.name}</span>
              <span style={{ fontSize:12, color:"var(--ink-dim)" }}>{L("need")} {fmtQty(x.need, x.unit)} · {L("have")} {fmtQty(x.stock, x.unit)}</span>
              <span style={{ minWidth:84, textAlign:"right", fontWeight:900, color: x.buy > 0 ? "var(--saffron)" : "var(--jade)" }}>
                {x.buy > 0 ? `${L("Buy")} ${fmtQty(x.buy, x.unit)}` : "✓ " + L("Enough")}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:14 }}>
        <div style={card}>
          <CardTitle icon="trophy">{L("Best sellers")}</CardTitle>
          {!r ? <SkeletonRows rows={4} /> : r.items.length === 0 ? <Empty /> : r.items.slice(0, 8).map((it, i) => (
            <div key={it.name} style={{ padding:"7px 0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ flex:1, fontWeight:700 }}>{it.name}</span>
                <span style={{ color:"var(--ink-dim)", fontWeight:700 }}>× {it.qty}</span>
                <span style={{ width:80, textAlign:"right", fontWeight:800 }}>{INR(it.amount)}</span>
              </div>
              <div style={{ height:6, borderRadius:3, background:"var(--bg2)", marginTop:5, overflow:"hidden" }}>
                <motion.div initial={{ scaleX:0 }} animate={{ scaleX: it.qty / r.items[0].qty }}
                  transition={{ type:"spring", bounce:0, visualDuration:0.6, delay: i * 0.05 }}
                  style={{ height:"100%", background:"var(--saffron)", transformOrigin:"left", borderRadius:3 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={card}>
          <CardTitle icon="package">{L("Raw material used")}</CardTitle>
          {!r ? <SkeletonRows rows={4} /> : r.used.length === 0 ? <Empty /> : r.used.map((u, i) => (
            <div key={u.id} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderTop: i ? "1px solid var(--rule)" : "none" }}>
              <span style={{ fontWeight:700 }}>{u.name}</span>
              <span style={{ fontWeight:800 }}>{fmtQty(u.qty, u.unit)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <CardTitle icon="receipt">{L("Bills")}</CardTitle>
        {!data ? <SkeletonRows rows={5} /> : data.orders.length === 0 ? <Empty /> : data.orders.slice(0, 100).map((o, i) => (
          <div key={o.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderTop: i ? "1px solid var(--rule)" : "none",
            opacity: o.status === "cancelled" ? 0.5 : 1 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800 }}>
                #{o.order_no}{o.label ? ` · ${o.label}` : ""}{" "}
                <span style={{ fontSize:12, fontWeight:700, color: o.status === "paid" ? "var(--jade)" : o.status === "open" ? "var(--saffron)" : "var(--ink-faint)" }}>
                  {o.status === "paid" ? (o.payment_mode === "credit" ? `${L("Khata")} · ${o.customer_name || ""}` : o.payment_mode.toUpperCase()) : L(o.status === "open" ? "Open" : "Cancelled")}
                </span>
              </div>
              <div style={{ fontSize:12, color:"var(--ink-faint)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {new Date(o.created_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })} · {(o.items || []).map(it => `${it.name} ×${it.qty}`).join(", ")}
              </div>
            </div>
            <span style={{ fontWeight:800 }}>{INR(o.total)}</span>
            {o.status === "paid" && (
              <button onClick={() => sendOnWhatsApp("", chaiBillText(o, getStoreName()))} aria-label={`Send bill ${o.order_no} on WhatsApp`}
                style={{ width:44, height:44, borderRadius:12, border:"1px solid var(--rule)", background:"var(--bg1)", color:"#1a9e4b", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center" }}><BillIcon name="whatsapp" size={18} /></button>
            )}
            {o.status !== "cancelled" && (
              <button onClick={() => cancel(o)} aria-label={`Cancel bill ${o.order_no}`}
                style={{ width:44, height:44, borderRadius:12, border:"1px solid var(--rule)", background:"var(--bg1)", color:"var(--ink-dim)", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center" }}><BillIcon name="x" size={18} /></button>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {closing && <CloseDaySheet onClose={() => setClosing(false)} onSaved={c => { setClosed(c); setClosing(false) }}
          lowList={low} toBuy={toBuy} dayName={dayName} />}
      </AnimatePresence>
    </div>
  )
}

// End of day: count the cash drawer against what the app expects, then send the day's summary
function CloseDaySheet({ onClose, onSaved, lowList, toBuy, dayName }) {
  const today = localDay()
  const [rep, setRep] = useState(null)
  const [counted, setCounted] = useState(readClose(today)?.counted ?? "")
  useEffect(() => {
    Promise.all([ChaiOrders.list({ from: today, to: today }), ChaiMenu.list(), ChaiMaterials.list()])
      .then(([o, m, mats]) => setRep(buildReport(o, m, mats))).catch(e => alert(e.message))
  }, [today])
  const expected = rep?.byMode.cash || 0
  const diff = counted === "" ? null : Math.round((+counted - expected) * 100) / 100

  function save(send) {
    const c = { counted: +counted, expected, diff, at: new Date().toISOString() }
    try { localStorage.setItem(CLOSE_KEY(today), JSON.stringify(c)) } catch { /* private mode */ }
    if (send && rep) {
      const top = rep.items.slice(0, 3).map(it => `${it.name} ×${it.qty}`).join(", ")
      const milk = rep.used.find(u => /milk/i.test(u.name))
      const text = [
        `📊 *${getStoreName() || "Chai Shop"}* — ${new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"short" })}`,
        "",
        `${L("Total sales")}: *${INR(rep.total)}* (${rep.bills} ${L("bills")}, ${rep.cups} ${L("cups")})`,
        `${L("Cash")}: ${INR(rep.byMode.cash)} · UPI: ${INR(rep.byMode.upi)} · ${L("Khata")}: ${INR(rep.byMode.credit)}`,
        diff !== null ? `${L("Cash counted")}: ${INR(+counted)} (${diff === 0 ? L("matches") : diff > 0 ? L("extra") + " " + INR(diff) : L("short") + " " + INR(-diff)})` : "",
        top ? `${L("Best sellers")}: ${top}` : "",
        milk ? `${L("Milk used")}: ${fmtQty(milk.qty, milk.unit)}` : "",
        rep.cost > 0 ? `${L("Approx. profit")}: ${INR(rep.total - rep.cost)}` : "",
        lowList.length ? `⚠️ ${L("Running low")}: ${lowList.map(m => m.name).join(", ")}` : "",
        toBuy.length ? `🛒 ${L("Buy for")} ${dayName}: ${toBuy.map(x => `${x.name} ${fmtQty(x.buy, x.unit)}`).join(", ")}` : "",
      ].filter(Boolean).join("\n")
      sendOnWhatsApp("", text)
    }
    onSaved(c)
  }

  return (
    <motion.div {...backdrop} onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:70, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <motion.div {...sheet} onClick={e => e.stopPropagation()}
        style={{ width:"100%", maxWidth:480, maxHeight:"88vh", overflowY:"auto", background:"var(--bg1)", borderRadius:"22px 22px 0 0",
          padding:18, paddingBottom:"calc(18px + env(safe-area-inset-bottom))", display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ fontSize:18, fontWeight:900, display:"flex", alignItems:"center", gap:8 }}><BillIcon name="lock" size={20} />{L("Close the day")}</div>
        {!rep ? <SkeletonRows rows={3} /> : (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:8 }}>
              {[["Total sales", rep.total], ["Cash", rep.byMode.cash], ["UPI", rep.byMode.upi]].map(([k, v]) => (
                <div key={k} style={{ background:"var(--bg2)", borderRadius:12, padding:10 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--ink-dim)" }}>{L(k)}</div>
                  <div style={{ fontSize:17, fontWeight:900 }}>{INR(v)}</div>
                </div>
              ))}
            </div>
            <label style={{ display:"flex", flexDirection:"column", gap:6, fontWeight:800, fontSize:14 }}>
              {L("Cash in the drawer now")}
              <input autoFocus type="number" inputMode="decimal" value={counted} onChange={e => setCounted(e.target.value)} placeholder={String(expected)}
                style={{ minHeight:52, borderRadius:12, border:"1.5px solid var(--rule)", padding:"0 14px", fontSize:20, fontWeight:800, background:"var(--bg1)", color:"var(--ink)" }} />
            </label>
            <AnimatePresence mode="wait">
              {diff !== null && (
                <motion.div key={Math.sign(diff)} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                  style={{ padding:"10px 12px", borderRadius:12, fontWeight:800,
                    background: diff === 0 ? "rgba(29,158,117,0.12)" : diff < 0 ? "rgba(192,57,43,0.1)" : "rgba(232,119,34,0.12)",
                    color: diff === 0 ? "var(--jade)" : diff < 0 ? "#c0392b" : "#b35c00" }}>
                  {diff === 0 ? `✓ ${L("Cash matches")}` : diff < 0 ? `${L("Cash short by")} ${INR(-diff)}` : `${L("Extra cash")} ${INR(diff)}`}
                </motion.div>
              )}
            </AnimatePresence>
            <button onClick={() => save(true)}
              style={{ minHeight:52, borderRadius:14, border:"none", background:"#25D366", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <BillIcon name="whatsapp" size={20} />{L("Close and send summary")}
            </button>
            <button onClick={() => save(false)}
              style={{ minHeight:46, borderRadius:12, border:"1.5px solid var(--rule)", background:"var(--bg1)", color:"var(--ink)", fontWeight:800, cursor:"pointer" }}>
              {L("Close without sending")}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

function Mini({ icon, label, value }) {
  return (
    <div style={{ minWidth:64 }}>
      <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, color:"var(--ink-dim)" }}><BillIcon name={icon} size={14} />{label}</div>
      <div style={{ fontSize:20, fontWeight:900, color:"var(--ink)" }}>{value ?? <SkeletonBar w={40} h={20} />}</div>
    </div>
  )
}

function CardTitle({ icon, children }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, fontWeight:800, marginBottom:10, color:"var(--ink)" }}>
      <BillIcon name={icon} size={18} />{children}
    </div>
  )
}

// One bar split by how customers paid; each part grows in from the left
const MODES = [["cash", "cash", "Cash", "var(--jade)"], ["upi", "phone", "UPI", "#3b82f6"], ["credit", "book", "Khata", "var(--saffron)"]]
function SplitBar({ r }) {
  const total = r?.total || 0
  return (
    <div style={{ marginTop:16 }}>
      <div style={{ display:"flex", height:12, borderRadius:6, overflow:"hidden", background:"var(--bg2)" }}>
        {total > 0 && MODES.map(([id, , , color], i) => (
          <motion.div key={id} initial={{ scaleX:0 }} animate={{ scaleX:1 }}
            transition={{ type:"spring", bounce:0, visualDuration:0.5, delay: 0.1 + i * 0.08 }}
            style={{ width: `${(r.byMode[id] || 0) / total * 100}%`, background:color, transformOrigin:"left" }} />
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:8, marginTop:12 }}>
        {MODES.map(([id, icon, label, color]) => (
          <div key={id} style={{ minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:700, color:"var(--ink-dim)" }}>
              <span style={{ width:10, height:10, borderRadius:3, background:color, flexShrink:0 }} /><BillIcon name={icon} size={14} />{L(label)}
            </div>
            <div style={{ fontSize:18, fontWeight:900, color:"var(--ink)" }}>{r ? INR(r.byMode[id]) : <SkeletonBar w={50} h={18} />}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Empty() {
  return <div style={{ color:"var(--ink-faint)", fontSize:13, padding:"6px 0" }}>{L("Nothing yet")}</div>
}
