// Owner screen for QR ordering: switch it on, share / print the QR, and answer orders.
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import QRCode from "qrcode"
import { api } from "../sync/db"
import { useAuth } from "../context/AuthContext"
import { tr, uiLang } from "../i18n/kiranaStrings"
import { printHtml } from "../utils/print.js"
import { isNativeApp } from "../utils/features"

const L = k => tr(k, uiLang())
const SITE = "https://dukhaanai.in"      // the QR must open the website, also when made inside the Android app
const INR = n => "₹" + (Math.round((+n || 0) * 100) / 100).toLocaleString("en-IN")
const ago = iso => { const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000)); return m < 1 ? L("just now") : m < 60 ? `${m} ${L("min ago")}` : new Date(iso).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }) }
const STATUS = { new:["🔔 New","#e87722"], accepted:["👍 Accepted","#2563eb"], ready:["✅ Ready","#1D9E75"], done:["Done","#888"], rejected:["Rejected","#c0392b"], cancelled:["Cancelled","#888"] }

export default function OnlineOrders() {
  const { vendor, role } = useAuth()
  const navigate = useNavigate()
  const [cfg, setCfg]       = useState(null)
  const [orders, setOrders] = useState([])
  const [showDone, setShowDone] = useState(false)
  const [busy, setBusy]     = useState("")
  const [msg, setMsg]       = useState("")
  const [tables, setTables] = useState(6)
  const [qr, setQr]         = useState("")
  const owner = role === "owner"

  const link = cfg?.shop_code ? `${SITE}/s/${cfg.shop_code}` : ""
  const note = m => { setMsg(m); setTimeout(() => setMsg(""), 3500) }

  useEffect(() => { api.get("/online-orders/settings").then(setCfg).catch(e => setCfg({ error: e.message })) }, [])
  useEffect(() => { if (link) QRCode.toDataURL(link, { width: 520, margin: 1 }).then(setQr) }, [link])

  // Orders refresh every 5 s while this screen is open
  useEffect(() => {
    if (!cfg?.enabled) return
    let stop = false, t
    const load = async () => {
      try { const d = await api.get(`/online-orders${showDone ? "?include_done=true" : ""}`); if (!stop) setOrders(d) } catch {}
      if (!stop) t = setTimeout(load, 5000)
    }
    load()
    return () => { stop = true; clearTimeout(t) }
  }, [cfg?.enabled, showDone])

  async function toggle(on) {
    setBusy("toggle")
    try { setCfg(await api.patch("/online-orders/settings", { enabled: on })) }
    catch (e) { note(e.message) } finally { setBusy("") }
  }

  async function act(o, action, body) {
    setBusy(o.id + action)
    try {
      const r = await api.post(`/online-orders/${o.id}/${action}`, body || {})
      setOrders(list => list.map(x => x.id === o.id ? { ...x, ...r } : x).filter(x => showDone || ["new","accepted","ready"].includes(x.status)))
      if (action === "bill") note(`${L("Bill made")}: ${r.invoice?.invoice_no || ""} · ${INR(r.invoice?.total)}`)
      if (action === "accept" && o.shop_type === "chai") note(L("Added to Tables — take payment there"))
      window.dispatchEvent(new Event("dk:orders-changed"))
    } catch (e) { note(e.message) } finally { setBusy("") }
  }

  function share() {
    const text = `${vendor?.store_name || "Our shop"} — order online here: ${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
  }

  async function printQr(n = 0) {
    const make = async (url, label) => `<div class="q"><img src="${await QRCode.toDataURL(url, { width: 520, margin: 1 })}"><div class="t">${label}</div><div class="s">Scan to order · ${esc(vendor?.store_name || "")}</div></div>`
    const cards = n > 0
      ? await Promise.all(Array.from({ length: n }, (_, i) => make(`${link}?t=${i + 1}`, `Table ${i + 1}`)))
      : [await make(link, "Scan to order")]
    await printHtml(n > 0 ? "Table QR codes" : "Order QR code", `<div class="g">${cards.join("")}</div>`, `
      .g{display:grid;grid-template-columns:${n > 0 ? "1fr 1fr" : "1fr"};gap:12px}
      .q{border:2px dashed #e87722;border-radius:12px;padding:14px;text-align:center;page-break-inside:avoid}
      .q img{width:${n > 0 ? "70%" : "60%"};max-width:320px} .t{font-size:${n > 0 ? 22 : 26}px;font-weight:800;margin-top:6px}
      .s{font-size:13px;color:#555;margin-top:4px}`)
  }

  if (!cfg) return <Page><div style={{ padding:30, textAlign:"center", color:"var(--ink-faint)" }}>{L("Loading…")}</div></Page>
  if (cfg.error) return <Page><Card><div style={{ color:"#c0392b" }}>{cfg.error}</div></Card></Page>

  if (!cfg.pro) return (
    <Page>
      <Card>
        <div style={{ fontSize:30 }}>📲</div>
        <div style={{ fontSize:16, fontWeight:800, color:"var(--ink)", marginTop:6 }}>{L("Customers order from your QR code")}</div>
        <div style={{ fontSize:13, color:"var(--ink-dim)", marginTop:6, lineHeight:1.5 }}>
          {L("Customers scan your QR, choose items and place the order. You get an alert and tap Accept.")}
          {" "}{isNativeApp() ? L("This needs a Pro account.") : L("This is part of the Pro plan.")}
        </div>
        {!isNativeApp() && <button onClick={() => navigate("/settings")} style={btn("#e87722")}>{L("See plans")}</button>}
      </Card>
    </Page>
  )

  const open = orders.filter(o => ["new","accepted","ready"].includes(o.status))
  return (
    <Page>
      {msg && <div style={{ position:"fixed", top:70, left:16, right:16, zIndex:40, background:"#1f1208", color:"#fff", borderRadius:12, padding:"11px 14px", fontSize:13, fontWeight:600, textAlign:"center" }}>{msg}</div>}

      <Card>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:800, color:"var(--ink)" }}>📲 {L("Take orders by QR code")}</div>
            <div style={{ fontSize:12, color:"var(--ink-dim)", marginTop:3 }}>
              {cfg.shop_type === "chai" ? L("Customers order from their table. Accepted orders go to your Tables screen.") : L("Customers order and pick up. You make the bill when they collect.")}
            </div>
          </div>
          {owner && (
            <button onClick={() => toggle(!cfg.enabled)} disabled={busy === "toggle"} aria-pressed={cfg.enabled}
              style={{ width:58, height:32, borderRadius:20, border:"none", cursor:"pointer", position:"relative", flexShrink:0,
                background: cfg.enabled ? "#1D9E75" : "#ccc", transition:"background .2s" }}>
              <span style={{ position:"absolute", top:3, left: cfg.enabled ? 29 : 3, width:26, height:26, borderRadius:"50%", background:"#fff", transition:"left .2s" }} />
            </button>
          )}
        </div>
        {!cfg.enabled && !owner && <div style={{ fontSize:12, color:"var(--ink-faint)", marginTop:8 }}>{L("Ask the shop owner to switch this on.")}</div>}

        {cfg.enabled && link && (
          <div style={{ marginTop:14, textAlign:"center" }}>
            {qr && <img src={qr} alt="Order QR code" style={{ width:190, height:190, borderRadius:12, border:"1px solid var(--rule)", background:"#fff", padding:6 }} />}
            <div style={{ fontSize:12, color:"var(--ink-dim)", marginTop:6, wordBreak:"break-all" }}>{link}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
              <button onClick={share} style={btn("#25D366")}>📱 {L("Share on WhatsApp")}</button>
              <button onClick={() => printQr(0)} style={btn("#e87722")}>🖨 {L("Print QR")}</button>
            </div>
            {cfg.shop_type === "chai" && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10 }}>
                <span style={{ fontSize:13, color:"var(--ink-dim)", flex:1, textAlign:"left" }}>{L("One QR per table")}</span>
                <input type="number" min={1} max={40} value={tables} onChange={e => setTables(Math.max(1, Math.min(40, +e.target.value || 1)))}
                  style={{ width:64, padding:"8px", borderRadius:10, border:"1px solid var(--rule)", fontSize:15, textAlign:"center", background:"var(--bg2)", color:"var(--ink)" }} />
                <button onClick={() => printQr(tables)} style={{ ...btn("#7a4a1e"), width:"auto", padding:"10px 14px" }}>🖨 {L("Print tables")}</button>
              </div>
            )}
          </div>
        )}
      </Card>

      {cfg.enabled && (
        <>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", margin:"18px 2px 8px" }}>
            <div style={{ fontSize:15, fontWeight:800, color:"var(--ink)" }}>{L("Orders")} {open.length > 0 && <span style={{ color:"#e87722" }}>({open.length})</span>}</div>
            <label style={{ fontSize:12, color:"var(--ink-dim)", display:"flex", gap:6, alignItems:"center" }}>
              <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} /> {L("Show finished")}
            </label>
          </div>
          {orders.length === 0 && <Card><div style={{ textAlign:"center", color:"var(--ink-faint)", fontSize:13, padding:"10px 0" }}>{L("No orders yet. Share your QR code to get started.")}</div></Card>}
          {orders.map(o => {
            const [st, col] = STATUS[o.status] || [o.status, "#888"]
            const b = a => busy === o.id + a
            return (
              <div key={o.id} style={{ background:"var(--bg1, #fff)", border: o.status === "new" ? "2px solid #e87722" : "1px solid var(--rule)", borderRadius:14, padding:14, marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontSize:16, fontWeight:900, color:"var(--ink)" }}>#{o.order_no} · {o.customer_name}</div>
                  <span style={{ fontSize:11, fontWeight:800, color:"#fff", background:col, borderRadius:12, padding:"3px 9px" }}>{L(st)}</span>
                </div>
                <div style={{ fontSize:12, color:"var(--ink-dim)", marginTop:3 }}>
                  {o.mode === "table" ? `🪑 ${L("Table")} ${o.table_label}` : `🛍️ ${L("Pickup")}`} · <a href={`tel:${o.customer_phone}`} style={{ color:"var(--jade, #1D9E75)", fontWeight:700 }}>{o.customer_phone}</a> · {ago(o.created_at)}
                </div>
                <div style={{ margin:"8px 0", fontSize:14, color:"var(--ink)" }}>
                  {(o.items || []).map((l, i) => <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"2px 0" }}><span>{l.name} × {l.qty}</span><span>{INR(l.amount ?? l.price * l.qty)}</span></div>)}
                  <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, borderTop:"1px dashed var(--rule)", marginTop:4, paddingTop:5 }}><span>{L("Total")}</span><span>{INR(o.total)}</span></div>
                </div>
                {o.note && <div style={{ fontSize:13, background:"#fff6e5", color:"#7a4a00", borderRadius:8, padding:"6px 9px", marginBottom:8 }}>📝 {o.note}</div>}
                {o.status === "rejected" && o.reject_reason && <div style={{ fontSize:12, color:"#c0392b" }}>{o.reject_reason}</div>}

                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {o.status === "new" && <>
                    <button onClick={() => act(o, "reject", { reason: "Sorry, we can't take this order now." })} disabled={b("reject")} style={{ ...btn("transparent"), color:"#c0392b", border:"1.5px solid #f0c2bc", flex:1 }}>{L("Reject")}</button>
                    <button onClick={() => act(o, "accept")} disabled={b("accept")} style={{ ...btn("#1D9E75"), flex:2 }}>✓ {L("Accept")}</button>
                  </>}
                  {o.status === "accepted" && <button onClick={() => act(o, "ready")} disabled={b("ready")} style={{ ...btn("#2563eb"), flex:1 }}>{L("Mark ready")}</button>}
                  {o.shop_type === "kirana" && ["accepted","ready"].includes(o.status) && <>
                    <button onClick={() => act(o, "bill", { payment_mode:"Cash" })} disabled={b("bill")} style={{ ...btn("#e87722"), flex:1 }}>🧾 {L("Bill · Cash")}</button>
                    <button onClick={() => act(o, "bill", { payment_mode:"UPI" })} disabled={b("bill")} style={{ ...btn("#e87722"), flex:1 }}>🧾 {L("Bill · UPI")}</button>
                  </>}
                  {o.shop_type === "chai" && ["accepted","ready"].includes(o.status) && <>
                    <button onClick={() => navigate("/chai-billing", { state:{ mode:"table" } })} style={{ ...btn("transparent"), color:"var(--ink)", border:"1px solid var(--rule)", flex:1 }}>{L("Open Tables")}</button>
                    <button onClick={() => act(o, "done")} disabled={b("done")} style={{ ...btn("#888"), flex:1 }}>{L("Done")}</button>
                  </>}
                </div>
              </div>
            )
          })}
        </>
      )}
    </Page>
  )
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]))
const btn = bg => ({ width:"100%", padding:"11px 12px", borderRadius:11, border:"none", background:bg, color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer" })
function Page({ children }) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="page-sticky-header flex items-center mb-4"><h1 className="text-sm font-semibold">{L("Online orders (QR)")}</h1></div>
      {children}
    </div>
  )
}
function Card({ children }) {
  return <div className="card mb-3" style={{ padding:16 }}>{children}</div>
}
