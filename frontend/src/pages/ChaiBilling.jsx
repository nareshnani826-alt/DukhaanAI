// Chai shop billing: tap a tile to add a cup. Counter sales are paid straight away;
// table / token orders stay open until the customer pays.
import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChaiMenu, ChaiOrders, CATEGORIES, orderTotal, chaiBillText, sendOnWhatsApp, regularsUsual, localDay } from "../sync/chaiDb.js"
import { parseChaiOrder } from "../voice/chaiVoice.js"
import { getSpeechRecognition } from "../voice/nativeSpeech.js"
import { printChaiBill } from "../utils/chaiPrint.js"
import { Udhar, getStoreName } from "../sync/db.js"
import UPIQRCode from "../components/UPIQRCode.jsx"
import { backdrop, sheet, pop, celebrate } from "../components/popupMotion.js"
import { AnimatedAmount, BillIcon } from "../components/billing/billMotion.jsx"
import { useWideBilling, useFlyToBill } from "../components/billing/billHooks.jsx"
import { SkeletonTiles } from "../components/Skeleton.jsx"
import { tr, uiLang } from "../i18n/kiranaStrings"

const L = k => tr(k, uiLang())
const INR = n => "₹" + (Math.round((+n || 0) * 100) / 100).toLocaleString("en-IN")
const TABLE_CHOICES = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"]

export default function ChaiBilling() {
  const wide = useWideBilling()
  const [menu, setMenu]       = useState(null)
  const [cat, setCat]         = useState("All")
  const [mode, setMode]       = useState("counter")      // counter | table
  const [openOrders, setOpen] = useState([])
  const [activeId, setActive] = useState(null)           // open table order being edited
  const [lines, setLines]     = useState([])
  const [showBill, setShowBill] = useState(false)        // phone: bill sheet
  const [showPay, setShowPay]   = useState(false)
  const [newTable, setNewTable] = useState(false)
  const [toast, setToast]       = useState(null)
  const [busy, setBusy]         = useState(false)
  const [done, setDone]         = useState(null)        // paid-bill celebration
  const { fly, layer }          = useFlyToBill()
  const doneTimer               = useRef(null)
  const [listening, setListening] = useState(false)
  const [regulars, setRegulars] = useState([])          // [{ customer, items, count }]
  const [regular, setRegular]   = useState(null)        // regular whose usual is on the bill

  const flash = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2200) }
  const loadOpen = () => ChaiOrders.list({ status: "open" }).then(setOpen).catch(() => {})

  useEffect(() => {
    ChaiMenu.list().then(setMenu).catch(e => { setMenu([]); flash(e.message || L("Could not load menu"), false) })
    loadOpen()
    // Regulars and what they usually take, from the last 30 days of khata bills
    const from = new Date(); from.setDate(from.getDate() - 30)
    ChaiOrders.list({ from: localDay(from) }).then(o => setRegulars(regularsUsual(o))).catch(() => {})
  }, [])

  // Speak the order: "rendu tea oka samosa" / "do chai ek samosa" / "రెండు టీ ఒక సమోసా"
  function listen() {
    const SR = getSpeechRecognition()
    if (!SR) return flash(L("Voice not supported on this browser"), false)
    const rec = new SR()
    rec.lang = uiLang()
    rec.interimResults = false
    rec.maxAlternatives = 3
    setListening(true)
    rec.onresult = e => {
      const heard = [...e.results[0]].map(a => a.transcript)
      // Use the first alternative that names something on the menu
      const parsed = heard.map(t => ({ t, ...parseChaiOrder(t, menu) })).find(r => r.lines.length) || { t: heard[0], lines: [] }
      if (!parsed.lines.length) return flash(`"${parsed.t}" — ${L("not on the menu, try again")}`, false)
      parsed.lines.forEach(({ item, qty }) => add(item, qty))
      flash(parsed.lines.map(({ item, qty }) => `${qty} ${item.name}`).join(", ") + " ✓")
    }
    rec.onerror = e => flash(e?.error === "no-speech" ? L("Didn't hear anything, tap Speak and say the order") : L("Mic error, check permission"), false)
    rec.onend = () => setListening(false)
    try { rec.start() } catch { setListening(false) }
  }

  function applyUsual(r) {
    const byId = Object.fromEntries((menu || []).map(m => [m.id, m]))
    setLines(r.items.filter(it => byId[it.menu_id]).map(it => ({ ...it, price: +byId[it.menu_id].price, name: byId[it.menu_id].name })))
    setRegular(r.customer)
  }

  const tiles = useMemo(() => (menu || []).filter(m => cat === "All" || m.category === cat), [menu, cat])
  const qtyOf = id => lines.find(l => l.menu_id === id)?.qty || 0
  const total = orderTotal(lines)
  const count = lines.reduce((n, l) => n + l.qty, 0)
  const active = openOrders.find(o => o.id === activeId)

  function add(m, d = 1) {
    setLines(ls => {
      const i = ls.findIndex(l => l.menu_id === m.id)
      if (i < 0) return d > 0 ? [...ls, { menu_id: m.id, name: m.name, price: +m.price, qty: d }] : ls
      const q = ls[i].qty + d
      return q <= 0 ? ls.filter((_, j) => j !== i) : ls.map((l, j) => j === i ? { ...l, qty: q } : l)
    })
  }

  function switchMode(m) {
    setMode(m); setActive(null); setLines([]); setRegular(null)
  }
  function pickOrder(o) {
    setActive(o.id); setLines(o.items || [])
  }
  async function startTable(label) {
    setNewTable(false)
    try {
      const o = await ChaiOrders.saveOpen({ label, items: lines })
      await loadOpen(); setActive(o.id); setLines(o.items || [])
    } catch (e) { flash(e.message, false) }
  }
  async function saveTable() {
    if (!activeId) return setNewTable(true)
    setBusy(true)
    try {
      await ChaiOrders.saveOpen({ id: activeId, items: lines })
      await loadOpen(); flash(`${active?.label || L("Table")} ${L("saved")} ✓`)
      setActive(null); setLines([]); setShowBill(false)
    } catch (e) { flash(e.message, false) }
    setBusy(false)
  }

  async function pay(payment_mode, customer) {
    setBusy(true)
    try {
      const o = await ChaiOrders.pay({ id: activeId, items: lines, payment_mode, customer, label: active?.label })
      setDone({ order: o, mode: payment_mode, who: customer?.name, phone: customer?.phone || "" })
      try { navigator.vibrate?.(15) } catch { /* not supported */ }
      // Clears itself for the next customer unless the shopkeeper starts sending the bill
      clearTimeout(doneTimer.current)
      doneTimer.current = setTimeout(() => setDone(null), 3500)
      setShowPay(false); setShowBill(false); setLines([]); setActive(null); setRegular(null)
      if (mode === "table") loadOpen()
    } catch (e) { flash(e.message, false) }
    setBusy(false)
  }

  const billLines = (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {lines.length === 0 && (
        <div style={{ textAlign:"center", padding:"24px 8px", color:"var(--ink-faint)", fontSize:13 }}>
          {L("Tap an item to add it")}
        </div>
      )}
      <AnimatePresence initial={false}>
        {lines.map(l => (
          <motion.div key={l.menu_id} layout initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:12 }}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:12, background:"var(--bg2)" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.name}</div>
              <div style={{ fontSize:12, color:"var(--ink-faint)" }}>{INR(l.price)} × {l.qty}</div>
            </div>
            <QtyBtn onClick={() => add({ id:l.menu_id }, -1)} label="−" />
            <motion.span key={l.qty} initial={{ scale:1.4 }} animate={{ scale:1 }} style={{ minWidth:22, textAlign:"center", fontWeight:800 }}>{l.qty}</motion.span>
            <QtyBtn onClick={() => add({ id:l.menu_id, name:l.name, price:l.price }, 1)} label="+" />
            <div style={{ width:64, textAlign:"right", fontWeight:800, fontSize:14 }}>{INR(l.price * l.qty)}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  const actions = (
    <div style={{ display:"flex", gap:8 }}>
      {mode === "table" && (
        <button className="btn" disabled={busy || lines.length === 0} onClick={saveTable}
          style={{ flex:1, minHeight:52, borderRadius:14, fontWeight:800, fontSize:15, background:"var(--bg2)", color:"var(--ink)", border:"1.5px solid var(--rule)" }}>
          {activeId ? L("Save") : L("Open table")}
        </button>
      )}
      <motion.button whileTap={{ scale:0.97 }} className="btn btn-primary" disabled={busy || lines.length === 0}
        onClick={() => setShowPay(true)}
        style={{ flex:2, minHeight:52, borderRadius:14, fontWeight:800, fontSize:16 }}>
        {busy ? L("Saving…") : `${L("Pay")} ${INR(total)}`}
      </motion.button>
    </div>
  )

  return (
    <div style={{ display:"flex", flex:1, minHeight:0, gap:16 }}>
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", padding: wide ? "16px 0 16px 16px" : "12px 12px 0" }}>
        {/* Counter / tables switch, and Speak */}
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        <div style={{ flex:1, display:"flex", gap:6, padding:4, borderRadius:14, background:"var(--bg2)" }}>
          {[["counter", "coffee", L("Counter")], ["table", "utensils", `${L("Tables")}${openOrders.length ? ` (${openOrders.length})` : ""}`]].map(([id, icon, label]) => (
            <button key={id} onClick={() => switchMode(id)}
              style={{ position:"relative", flex:1, minHeight:44, border:"none", borderRadius:11, background:"transparent",
                fontWeight:800, fontSize:14, cursor:"pointer", color: mode === id ? "#fff" : "var(--ink-dim)" }}>
              {mode === id && <motion.span layoutId="chai-mode" style={{ position:"absolute", inset:0, borderRadius:11, background:"var(--saffron)" }} />}
              <span style={{ position:"relative", display:"inline-flex", alignItems:"center", gap:8 }}><BillIcon name={icon} size={18} />{label}</span>
            </button>
          ))}
        </div>
          <motion.button whileTap={{ scale:0.92 }} onClick={listen} disabled={!menu || listening} aria-label={L("Speak the order")}
            style={{ position:"relative", width:56, minHeight:52, borderRadius:14, border:"none", cursor:"pointer", flexShrink:0,
              background: listening ? "#c0392b" : "var(--jade)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {listening && [0, 1].map(i => (
              <motion.span key={i} initial={{ scale:1, opacity:0.5 }} animate={{ scale:1.7, opacity:0 }}
                transition={{ duration:1.2, repeat:Infinity, delay:i * 0.6, ease:"easeOut" }}
                style={{ position:"absolute", inset:0, borderRadius:14, border:"2px solid #c0392b" }} />
            ))}
            <BillIcon name="mic" size={24} />
          </motion.button>
        </div>
        <AnimatePresence>
          {listening && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
              style={{ fontSize:14, fontWeight:700, color:"#c0392b", marginBottom:8, overflow:"hidden" }}>
              {L("Listening… say like “2 tea, 1 samosa”")}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Regulars: one tap puts their usual on the bill */}
        {mode === "counter" && regulars.length > 0 && (
          <div className="chip-row" style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:8, marginBottom:2 }}>
            {regulars.slice(0, 8).map(r => (
              <motion.button key={r.customer.id} whileTap={{ scale:0.95 }} className="tap-chip" onClick={() => applyUsual(r)}
                style={{ flexShrink:0, padding:"6px 12px", borderRadius:14, cursor:"pointer", textAlign:"left", border:"1.5px solid",
                  borderColor: regular?.id === r.customer.id ? "var(--jade)" : "var(--rule)",
                  background: regular?.id === r.customer.id ? "rgba(29,158,117,0.1)" : "var(--bg1)", color:"var(--ink)" }}>
                <span style={{ display:"block", fontWeight:800, fontSize:13 }}>{r.customer.name}</span>
                <span style={{ display:"block", fontSize:12, color:"var(--ink-dim)" }}>{r.items.map(it => `${it.qty} ${it.name}`).join(", ")}</span>
              </motion.button>
            ))}
          </div>
        )}

        {/* Open tables / tokens */}
        {mode === "table" && (
          <div className="chip-row" style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:8, marginBottom:4 }}>
            <button className="tap-chip" onClick={() => { setActive(null); setLines([]); setNewTable(true) }}
              style={{ flexShrink:0, padding:"8px 14px", borderRadius:20, border:"1.5px dashed var(--saffron)", background:"transparent", color:"var(--saffron)", fontWeight:800 }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><BillIcon name="plus" size={16} />{L("New table / token")}</span>
            </button>
            {openOrders.map(o => (
              <button key={o.id} className="tap-chip" onClick={() => pickOrder(o)}
                style={{ flexShrink:0, padding:"8px 14px", borderRadius:20, fontWeight:800, border:"1.5px solid",
                  borderColor: activeId === o.id ? "var(--jade)" : "var(--rule)",
                  background: activeId === o.id ? "var(--jade)" : "var(--bg1)", color: activeId === o.id ? "#fff" : "var(--ink)" }}>
                {o.label || `#${o.order_no}`} · {INR(o.total)}
              </button>
            ))}
          </div>
        )}
        {mode === "table" && (
          <div style={{ fontSize:13, color:"var(--ink-dim)", marginBottom:8, fontWeight:600 }}>
            {active ? `${L("Adding to")} ${active.label || "#" + active.order_no}` : L("Pick a table or open a new one")}
          </div>
        )}

        {/* Category pills */}
        <div className="chip-row" style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:10 }}>
          {["All", ...CATEGORIES].map(c => (
            <button key={c} className="tap-chip" onClick={() => setCat(c)}
              style={{ position:"relative", flexShrink:0, padding:"8px 16px", borderRadius:20, border:"1.5px solid var(--rule)",
                background:"var(--bg1)", fontWeight:700, cursor:"pointer", color: cat === c ? "#fff" : "var(--ink-dim)" }}>
              {cat === c && <motion.span layoutId="chai-cat" style={{ position:"absolute", inset:-1.5, borderRadius:20, background:"var(--ink)" }} />}
              <span style={{ position:"relative" }}>{L(c)}</span>
            </button>
          ))}
        </div>

        {/* Menu tiles */}
        <div style={{ flex:1, overflowY:"auto", paddingBottom: wide ? 8 : 96 }}>
          {menu === null ? <SkeletonTiles count={9} min={100} height={92} /> : (
            <motion.div key={cat} initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ display:"grid", gridTemplateColumns:`repeat(auto-fill, minmax(${wide ? 130 : 100}px, 1fr))`, gap: wide ? 10 : 8 }}>
              {tiles.map(m => {
                const q = qtyOf(m.id)
                return (
                  <motion.button key={m.id} whileTap={{ scale:0.94 }} whileHover={{ y:-2 }} onClick={e => { add(m); fly(e.currentTarget, m.name) }}
                    style={{ position:"relative", minHeight: wide ? 110 : 92, borderRadius:16, cursor:"pointer", padding: wide ? "12px 8px" : "8px 4px",
                      border: q ? "2px solid var(--saffron)" : "1.5px solid var(--rule)", background:"var(--bg1)",
                      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4 }}>
                    <span style={{ fontSize: wide ? 34 : 28, lineHeight:1 }}>{m.emoji || "☕"}</span>
                    <span style={{ fontSize: wide ? 14 : 13, fontWeight:800, color:"var(--ink)", textAlign:"center", lineHeight:1.2 }}>{m.name}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:"var(--jade)" }}>{INR(m.price)}</span>
                    <AnimatePresence>
                      {q > 0 && (
                        <motion.span key={q} initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
                          style={{ position:"absolute", top:6, right:6, minWidth:26, height:26, borderRadius:13, padding:"0 6px",
                            background:"var(--saffron)", color:"#fff", fontWeight:800, fontSize:13,
                            display:"flex", alignItems:"center", justifyContent:"center" }}>{q}</motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                )
              })}
            </motion.div>
          )}
          {menu && menu.length === 0 && (
            <div style={{ textAlign:"center", padding:30, color:"var(--ink-faint)" }}>{L("No menu items yet. Add them in Menu & Stock.")}</div>
          )}
        </div>
      </div>

      {/* Desktop: bill panel */}
      {wide && (
        <aside aria-label="Bill" style={{ width:360, flexShrink:0, display:"flex", flexDirection:"column", gap:12,
          padding:16, borderLeft:"1px solid var(--rule)", background:"var(--bg1)" }}>
          <div style={{ fontSize:16, fontWeight:800 }}>{active ? (active.label || "#" + active.order_no) : L("Bill")}</div>
          <div style={{ flex:1, overflowY:"auto" }}>{billLines}</div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
            <span style={{ color:"var(--ink-dim)", fontWeight:700 }}>{count} {L("items")}</span>
            <span data-bill-target><AnimatedAmount value={total} style={{ fontSize:26, fontWeight:900 }} /></span>
          </div>
          {actions}
        </aside>
      )}

      {/* Phone: total bar */}
      <AnimatePresence>
        {!wide && lines.length > 0 && (
          <motion.div initial={{ y:120 }} animate={{ y:0 }} exit={{ y:120 }} transition={{ type:"spring", bounce:0, visualDuration:0.3 }}
            style={{ position:"fixed", left:12, right:12, bottom:"calc(76px + env(safe-area-inset-bottom))", zIndex:40,
              background:"var(--bg1)", borderRadius:18, padding:10, boxShadow:"0 8px 30px rgba(0,0,0,0.18)", border:"1px solid var(--rule)" }}>
            <button onClick={() => setShowBill(true)}
              style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:"none", border:"none",
                padding:"2px 4px 10px", cursor:"pointer", color:"var(--ink)" }}>
              <span style={{ fontWeight:700, fontSize:14 }}>{count} {L("items")} · {L("View bill")} ▴</span>
              <span data-bill-target><AnimatedAmount value={total} style={{ fontSize:20, fontWeight:900 }} /></span>
            </button>
            {actions}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phone: bill sheet */}
      <AnimatePresence>
        {showBill && !wide && (
          <motion.div {...backdrop} onClick={() => setShowBill(false)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:60, display:"flex", alignItems:"flex-end" }}>
            <motion.div {...sheet} onClick={e => e.stopPropagation()}
              style={{ width:"100%", maxHeight:"80vh", overflowY:"auto", background:"var(--bg1)", borderRadius:"22px 22px 0 0", padding:16,
                paddingBottom:"calc(16px + env(safe-area-inset-bottom))", display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ fontSize:17, fontWeight:800 }}>{active ? (active.label || "#" + active.order_no) : L("Bill")}</div>
              {billLines}
              <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:20 }}>
                <span>{L("Total")}</span><span>{INR(total)}</span>
              </div>
              {actions}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {newTable && <NewTableSheet taken={openOrders.map(o => o.label)} onPick={startTable} onClose={() => setNewTable(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showPay && <PaySheet total={total} busy={busy} regular={regular} onPay={pay} onClose={() => setShowPay(false)} />}
      </AnimatePresence>

      {layer}

      {/* Paid: tick pops, amount rises, then it clears for the next customer */}
      <AnimatePresence>
        {done && (
          <motion.div {...backdrop} onClick={() => { clearTimeout(doneTimer.current); setDone(null) }} role="status"
            style={{ position:"fixed", inset:0, zIndex:90, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <motion.div variants={celebrate.list} initial="hidden" animate="show"
              onClick={e => e.stopPropagation()} onPointerDown={() => clearTimeout(doneTimer.current)}
              style={{ background:"var(--bg1)", borderRadius:24, padding:"28px 24px", textAlign:"center", width:"min(340px, calc(100vw - 32px))", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
              <div style={{ position:"relative", width:72, height:72, margin:"0 auto 12px" }}>
                <motion.span variants={celebrate.ring} style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid var(--jade)" }} />
                <motion.span variants={celebrate.tick}
                  style={{ position:"absolute", inset:0, borderRadius:"50%", background:"var(--jade)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <BillIcon name="check" size={36} stroke={3} />
                </motion.span>
              </div>
              <motion.div variants={celebrate.item} style={{ fontSize:30, fontWeight:900, color:"var(--ink)" }}>{INR(done.order.total)}</motion.div>
              <motion.div variants={celebrate.item} style={{ fontSize:14, fontWeight:700, color:"var(--ink-dim)", marginTop:4 }}>
                {done.mode === "credit" ? `${L("On khata")} · ${done.who}` : done.mode === "upi" ? `UPI · ${L("Paid")}` : `${L("Cash")} · ${L("Paid")}`}
              </motion.div>
              <motion.div variants={celebrate.item} style={{ display:"flex", flexDirection:"column", gap:8, marginTop:16 }}>
                <input value={done.phone} onChange={e => setDone(d => ({ ...d, phone: e.target.value }))} inputMode="tel"
                  placeholder={L("Customer WhatsApp number (optional)")} aria-label={L("Customer WhatsApp number (optional)")}
                  style={{ minHeight:46, borderRadius:12, border:"1.5px solid var(--rule)", padding:"0 12px", fontSize:15, background:"var(--bg1)", color:"var(--ink)" }} />
                <motion.button whileTap={{ scale:0.97 }}
                  onClick={() => { sendOnWhatsApp(done.phone, chaiBillText(done.order, getStoreName())); setDone(null) }}
                  style={{ minHeight:50, borderRadius:12, border:"none", background:"#25D366", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <BillIcon name="whatsapp" size={20} />{L("Send bill on WhatsApp")}
                </motion.button>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => printChaiBill(done.order, getStoreName())}
                    style={{ flex:1, minHeight:46, borderRadius:12, border:"1.5px solid var(--rule)", background:"var(--bg1)", color:"var(--ink)", fontWeight:800, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    <BillIcon name="printer" size={18} />{L("Print")}
                  </button>
                  <button onClick={() => setDone(null)}
                    style={{ flex:1.4, minHeight:46, borderRadius:12, border:"1.5px solid var(--rule)", background:"var(--bg1)", color:"var(--ink)", fontWeight:800, cursor:"pointer" }}>
                    {L("Next customer")}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0, y:-20, x:"-50%" }} animate={{ opacity:1, y:0, x:"-50%" }} exit={{ opacity:0, y:-20, x:"-50%" }}
            role="status"
            style={{ position:"fixed", top:16, left:"50%", zIndex:100, padding:"12px 20px", borderRadius:14, fontWeight:800,
              color:"#fff", background: toast.ok ? "var(--jade)" : "#c0392b", boxShadow:"0 6px 24px rgba(0,0,0,0.2)" }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function QtyBtn({ onClick, label }) {
  return (
    <motion.button whileTap={{ scale:0.85 }} onClick={onClick} aria-label={label === "+" ? "Add one" : "Remove one"}
      style={{ width:36, height:36, borderRadius:10, border:"1.5px solid var(--rule)", background:"var(--bg1)",
        fontSize:18, fontWeight:800, cursor:"pointer", color:"var(--ink)" }}>{label}</motion.button>
  )
}

function NewTableSheet({ taken, onPick, onClose }) {
  const [custom, setCustom] = useState("")
  const tokenNos = taken.map(t => +(/^Token (\d+)$/.exec(t || "")?.[1] || 0))
  const nextToken = `Token ${Math.max(0, ...tokenNos) + 1}`
  return (
    <motion.div {...backdrop} onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:70, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <motion.div {...pop} onClick={e => e.stopPropagation()}
        style={{ width:"100%", maxWidth:380, background:"var(--bg1)", borderRadius:20, padding:18, display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ fontSize:17, fontWeight:800 }}>{L("Which table?")}</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8 }}>
          {TABLE_CHOICES.map(t => (
            <button key={t} disabled={taken.includes(t)} onClick={() => onPick(t)}
              style={{ minHeight:48, borderRadius:12, border:"1.5px solid var(--rule)", fontWeight:800, fontSize:15,
                background: taken.includes(t) ? "var(--bg2)" : "var(--bg1)", color: taken.includes(t) ? "var(--ink-faint)" : "var(--ink)", cursor:"pointer" }}>{t}</button>
          ))}
        </div>
        <button onClick={() => onPick(nextToken)}
          style={{ minHeight:48, borderRadius:12, border:"1.5px solid var(--saffron)", background:"transparent", color:"var(--saffron)", fontWeight:800, cursor:"pointer" }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}><BillIcon name="ticket" size={18} />{L("Give token")} ({nextToken})</span>
        </button>
        <div style={{ display:"flex", gap:8 }}>
          <input value={custom} onChange={e => setCustom(e.target.value)} placeholder={L("Or type a name")}
            style={{ flex:1, minWidth:0, minHeight:46, borderRadius:12, border:"1.5px solid var(--rule)", padding:"0 12px", fontSize:15, background:"var(--bg1)", color:"var(--ink)" }} />
          <button className="btn btn-primary" disabled={!custom.trim()} onClick={() => onPick(custom.trim())} style={{ borderRadius:12, fontWeight:800 }}>{L("Open")}</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function PaySheet({ total, busy, regular, onPay, onClose }) {
  const [credit, setCredit]   = useState(false)
  const [upi, setUpi]         = useState(false)
  const [regulars, setRegs]   = useState(null)
  const [search, setSearch]   = useState("")
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")

  useEffect(() => {
    if (credit && regulars === null) Udhar.listCustomers().then(setRegs).catch(() => setRegs([]))
  }, [credit, regulars])

  async function addRegular() {
    try {
      const c = await Udhar.addCustomer({ name: newName.trim(), phone: newPhone.trim() || null })
      onPay("credit", c)
    } catch (e) { alert(e.message) }
  }
  const shown = (regulars || []).filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || "").includes(search))

  return (
    <motion.div {...backdrop} onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:70, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <motion.div {...sheet} onClick={e => e.stopPropagation()}
        style={{ width:"100%", maxWidth:480, maxHeight:"85vh", overflowY:"auto", background:"var(--bg1)", borderRadius:"22px 22px 0 0",
          padding:18, paddingBottom:"calc(18px + env(safe-area-inset-bottom))", display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:13, color:"var(--ink-faint)", fontWeight:700 }}>{L("Amount to collect")}</div>
          <div style={{ fontSize:38, fontWeight:900 }}>{INR(total)}</div>
        </div>
        {upi ? (
          <>
            <div style={{ fontWeight:800, textAlign:"center" }}>{L("Customer scans and pays")}</div>
            <UPIQRCode invoice={{ total, invoice_no: "Chai bill" }} storeName={getStoreName()} />
            <div style={{ fontSize:13, color:"var(--ink-dim)", textAlign:"center" }}>{L("Check the payment on your UPI app, then tap below.")}</div>
            <motion.button whileTap={{ scale:0.97 }} className="btn btn-primary" disabled={busy} onClick={() => onPay("upi")}
              style={{ minHeight:52, borderRadius:14, fontWeight:800, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <BillIcon name="check" size={20} />{busy ? L("Saving…") : L("Payment received")}
            </motion.button>
            <button onClick={() => setUpi(false)} style={{ background:"none", border:"none", color:"var(--ink-dim)", fontWeight:700, cursor:"pointer", minHeight:44 }}>
              ← {L("Back")}
            </button>
          </>
        ) : !credit ? (
          <>
          {regular && (
            <motion.button whileTap={{ scale:0.97 }} disabled={busy} onClick={() => onPay("credit", regular)}
              style={{ minHeight:56, borderRadius:16, border:"none", background:"var(--saffron)", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <BillIcon name="book" size={20} />{L("Khata")} · {regular.name}
            </motion.button>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {[["cash", "cash", L("Cash")], ["upi", "phone", "UPI"], ["credit", "book", L("Khata")]].map(([id, icon, label]) => (
              <motion.button key={id} whileTap={{ scale:0.95 }} disabled={busy}
                onClick={() => id === "credit" ? setCredit(true) : id === "upi" ? setUpi(true) : onPay(id)}
                style={{ minHeight:84, borderRadius:16, border:"1.5px solid var(--rule)", background:"var(--bg2)", cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, color:"var(--ink)" }}>
                <BillIcon name={icon} size={28} />
                <span style={{ fontWeight:800, fontSize:15 }}>{label}</span>
              </motion.button>
            ))}
          </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight:800 }}>{L("Whose khata?")}</div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L("Search name or phone")}
              style={{ minHeight:46, borderRadius:12, border:"1.5px solid var(--rule)", padding:"0 12px", fontSize:15, background:"var(--bg1)", color:"var(--ink)" }} />
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:220, overflowY:"auto" }}>
              {regulars === null && <div style={{ color:"var(--ink-faint)" }}>…</div>}
              {shown.map(c => (
                <button key={c.id} disabled={busy} onClick={() => onPay("credit", c)}
                  style={{ display:"flex", justifyContent:"space-between", alignItems:"center", minHeight:48, padding:"0 12px",
                    borderRadius:12, border:"1.5px solid var(--rule)", background:"var(--bg1)", cursor:"pointer", color:"var(--ink)" }}>
                  <span style={{ fontWeight:700 }}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</span>
                  <span style={{ fontSize:13, color: c.total_due > 0 ? "#c0392b" : "var(--ink-faint)", fontWeight:700 }}>{INR(c.total_due)}</span>
                </button>
              ))}
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--ink-dim)" }}>{L("New regular")}</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={L("Name")}
                style={{ flex:1, minWidth:0, minHeight:46, borderRadius:12, border:"1.5px solid var(--rule)", padding:"0 12px", fontSize:15, background:"var(--bg1)", color:"var(--ink)" }} />
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder={L("Phone")} inputMode="tel"
                style={{ flex:1, minWidth:0, minHeight:46, borderRadius:12, border:"1.5px solid var(--rule)", padding:"0 12px", fontSize:15, background:"var(--bg1)", color:"var(--ink)" }} />
            </div>
            <button className="btn btn-primary" disabled={busy || !newName.trim()} onClick={addRegular} style={{ minHeight:48, borderRadius:12, fontWeight:800 }}>
              {L("Add and put on khata")}
            </button>
            <button onClick={() => setCredit(false)} style={{ background:"none", border:"none", color:"var(--ink-dim)", fontWeight:700, cursor:"pointer", minHeight:40 }}>
              ← {L("Back")}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
