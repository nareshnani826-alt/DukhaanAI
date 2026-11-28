// Public order page — what a customer sees after scanning a shop's QR: dukhaanai.in/s/<code>[?t=<table>]
// No login. Prices shown here are only for display; the server prices the order again.
import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams, useNavigate } from "react-router-dom"
import { API_BASE } from "../sync/db"

const C = { saffron:"#e87722", dark:"#c25500", ink:"#1f1208", soft:"#7a6555", bg:"#fff8f1", card:"#fff", rule:"#f0e2d3", jade:"#1D9E75" }
const INR = n => "₹" + (Math.round((+n || 0) * 100) / 100).toLocaleString("en-IN")
const ME_KEY = "dk_order_me"   // remembers the customer's name and phone on this phone

async function call(path, opts = {}) {
  const r = await fetch(API_BASE + path, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Something went wrong. Please try again.")
  return d
}

export default function ShopOrder() {
  const { code } = useParams()
  const [params] = useSearchParams()
  const table = (params.get("t") || "").trim().slice(0, 12)
  const navigate = useNavigate()

  const [shop, setShop]     = useState(null)
  const [error, setError]   = useState("")
  const [cart, setCart]     = useState({})        // id → qty
  const [search, setSearch] = useState("")
  const [cat, setCat]       = useState("All")
  const [checkout, setCheckout] = useState(false)
  const [me, setMe] = useState(() => { try { return JSON.parse(localStorage.getItem(ME_KEY)) || { name:"", phone:"" } } catch { return { name:"", phone:"" } } })
  const [note, setNote]     = useState("")
  const [sending, setSending] = useState(false)
  const [formErr, setFormErr] = useState("")

  useEffect(() => {
    document.title = "Order online"
    call(`/public/shops/${encodeURIComponent(code)}`)
      .then(d => { setShop(d); document.title = d.store_name + " — Order online" })
      .catch(e => setError(e.message))
  }, [code])

  const items = shop?.items || []
  const cats = useMemo(() => ["All", ...Array.from(new Set(items.map(i => i.category)))], [items])
  const shown = items.filter(i => (cat === "All" || i.category === cat) && (!search || i.name.toLowerCase().includes(search.toLowerCase())))
  const lines = items.filter(i => cart[i.id] > 0).map(i => ({ ...i, qty: cart[i.id] }))
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0)
  const count = lines.reduce((s, l) => s + l.qty, 0)

  const change = (it, d) => setCart(c => {
    const max = it.stock != null ? Math.floor(it.stock) : 50
    const q = Math.max(0, Math.min(max, 50, (c[it.id] || 0) + d))
    return { ...c, [it.id]: q }
  })

  async function placeOrder() {
    const phone = me.phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "")
    if (!me.name.trim()) return setFormErr("Please enter your name")
    if (!/^[6-9]\d{9}$/.test(phone)) return setFormErr("Please enter a valid 10-digit mobile number")
    setFormErr(""); setSending(true)
    try {
      try { localStorage.setItem(ME_KEY, JSON.stringify({ name: me.name.trim(), phone })) } catch {}
      const d = await call(`/public/shops/${encodeURIComponent(code)}/orders`, { method:"POST", body: JSON.stringify({
        customer_name: me.name.trim(), customer_phone: phone, mode: table ? "table" : "pickup",
        table: table || null, note: note.trim() || null, items: lines.map(l => ({ id: l.id, qty: l.qty })),
      }) })
      navigate(`/o/${d.id}?t=${encodeURIComponent(d.token)}&s=${encodeURIComponent(code)}`)
    } catch (e) { setFormErr(e.message); setSending(false) }
  }

  if (error) return (
    <Shell><div style={{ padding:"80px 24px", textAlign:"center" }}>
      <div style={{ fontSize:44 }}>🏪</div>
      <div style={{ fontSize:18, fontWeight:800, marginTop:12, color:C.ink }}>{error}</div>
    </div></Shell>
  )
  if (!shop) return <Shell><div style={{ padding:80, textAlign:"center", color:C.soft }}>Loading menu…</div></Shell>

  return (
    <Shell>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg, ${C.saffron}, ${C.dark})`, color:"#fff", padding:"22px 18px 18px" }}>
        <div style={{ fontSize:13, opacity:.85, fontWeight:600 }}>{shop.shop_type === "chai" ? (shop.restaurant ? "🍽️ Order from your table" : "☕ Order from your table") : "🛍️ Order & pick up"}</div>
        <div style={{ fontSize:24, fontWeight:900, marginTop:4, lineHeight:1.15 }}>{shop.store_name}</div>
        {table
          ? <div style={{ display:"inline-block", marginTop:10, background:"rgba(255,255,255,.2)", borderRadius:20, padding:"5px 12px", fontSize:13, fontWeight:800 }}>Table {table}</div>
          : shop.address && <div style={{ fontSize:12, opacity:.85, marginTop:6 }}>📍 {shop.address}</div>}
      </div>

      {/* Search + categories */}
      <div style={{ position:"sticky", top:0, zIndex:5, background:C.bg, padding:"12px 14px 8px", borderBottom:`1px solid ${C.rule}` }}>
        {items.length > 12 && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
            style={{ width:"100%", padding:"11px 14px", borderRadius:12, border:`1.5px solid ${C.rule}`, fontSize:15, background:"#fff", color:C.ink, outline:"none", marginBottom:8 }} />
        )}
        {cats.length > 2 && (
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:2, scrollbarWidth:"none" }}>
            {cats.map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{ flexShrink:0, padding:"7px 13px", borderRadius:18, fontSize:13, fontWeight:700, cursor:"pointer",
                  border: cat === c ? "none" : `1px solid ${C.rule}`, background: cat === c ? C.saffron : "#fff", color: cat === c ? "#fff" : C.ink }}>{c}</button>
            ))}
          </div>
        )}
      </div>

      {/* Items */}
      <div style={{ padding:"10px 14px 120px", display:"flex", flexDirection:"column", gap:8 }}>
        {shown.length === 0 && <div style={{ textAlign:"center", color:C.soft, padding:40 }}>No items found</div>}
        {shown.map(it => {
          const q = cart[it.id] || 0
          return (
            <div key={it.id} style={{ display:"flex", alignItems:"center", gap:12, background:C.card, borderRadius:14, padding:"12px 14px",
              border: q ? `1.5px solid ${C.saffron}` : `1px solid ${C.rule}` }}>
              {it.emoji && <div style={{ fontSize:26 }}>{it.emoji}</div>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:C.ink }}>{it.name}</div>
                <div style={{ fontSize:14, fontWeight:800, color:C.dark, marginTop:2 }}>
                  {INR(it.price)}{it.unit && it.unit !== "pc" && it.unit !== "piece" ? <span style={{ fontWeight:600, color:C.soft }}> / {it.unit}</span> : null}
                </div>
              </div>
              {q === 0 ? (
                <button onClick={() => change(it, 1)} style={{ padding:"9px 18px", borderRadius:10, border:`1.5px solid ${C.saffron}`, background:"#fff", color:C.dark, fontSize:14, fontWeight:800, cursor:"pointer" }}>ADD</button>
              ) : (
                <div style={{ display:"flex", alignItems:"center", background:C.saffron, borderRadius:10, overflow:"hidden" }}>
                  <button onClick={() => change(it, -1)} aria-label="Less" style={qtyBtn}>−</button>
                  <div style={{ minWidth:26, textAlign:"center", color:"#fff", fontWeight:900, fontSize:15 }}>{q}</div>
                  <button onClick={() => change(it, 1)} aria-label="More" style={qtyBtn}>+</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Cart bar */}
      {count > 0 && !checkout && (
        <div style={{ position:"fixed", left:0, right:0, bottom:0, padding:"10px 14px calc(12px + env(safe-area-inset-bottom,0px))", background:"rgba(255,248,241,.96)", borderTop:`1px solid ${C.rule}`, zIndex:10 }}>
          <button onClick={() => setCheckout(true)}
            style={{ width:"100%", maxWidth:560, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"15px 18px", borderRadius:14, border:"none",
              background:`linear-gradient(135deg, ${C.saffron}, ${C.dark})`, color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer", boxShadow:"0 6px 18px rgba(232,119,34,.35)" }}>
            <span>{count} item{count > 1 ? "s" : ""} · {INR(total)}</span><span>Continue →</span>
          </button>
        </div>
      )}

      {/* Checkout sheet */}
      {checkout && (
        <div onClick={() => !sending && setCheckout(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:20, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:560, maxHeight:"92vh", overflowY:"auto", background:C.bg, borderRadius:"20px 20px 0 0", padding:"18px 16px calc(18px + env(safe-area-inset-bottom,0px))" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:18, fontWeight:900, color:C.ink }}>Your order</div>
              <button onClick={() => setCheckout(false)} aria-label="Close" style={{ width:34, height:34, borderRadius:10, border:`1px solid ${C.rule}`, background:"#fff", fontSize:16, cursor:"pointer", color:C.ink }}>✕</button>
            </div>
            <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${C.rule}`, padding:"6px 12px", margin:"12px 0" }}>
              {lines.map(l => (
                <div key={l.id} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", fontSize:14, color:C.ink, borderBottom:`1px dashed ${C.rule}` }}>
                  <span>{l.name} × {l.qty}</span><span style={{ fontWeight:700 }}>{INR(l.price * l.qty)}</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0 4px", fontSize:16, fontWeight:900, color:C.ink }}><span>Total</span><span>{INR(total)}</span></div>
            </div>
            <div style={{ fontSize:13, color:C.soft, marginBottom:10, fontWeight:600 }}>
              {table ? `🪑 Served at Table ${table} · pay at the counter` : "🛍️ Pick up at the shop · pay at the counter (cash or UPI)"}
            </div>
            <label style={lbl}>Your name</label>
            <input value={me.name} onChange={e => setMe(m => ({ ...m, name: e.target.value }))} placeholder="Ravi" maxLength={60} autoComplete="name" style={inp} />
            <label style={lbl}>Mobile number</label>
            <input value={me.phone} onChange={e => setMe(m => ({ ...m, phone: e.target.value }))} placeholder="98765 43210" inputMode="tel" maxLength={16} autoComplete="tel" style={inp} />
            <label style={lbl}>Note for the shop (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder={shop.shop_type === "chai" ? (shop.restaurant ? "Less spicy" : "Less sugar") : "Pack separately"} maxLength={200} style={inp} />
            {formErr && <div style={{ color:"#c0392b", fontSize:13, fontWeight:600, marginTop:10 }}>{formErr}</div>}
            <button onClick={placeOrder} disabled={sending}
              style={{ width:"100%", marginTop:14, padding:"16px", borderRadius:14, border:"none", background:C.jade, color:"#fff", fontSize:17, fontWeight:900, cursor:"pointer", opacity: sending ? .6 : 1 }}>
              {sending ? "Sending…" : `Place order · ${INR(total)}`}
            </button>
          </div>
        </div>
      )}
    </Shell>
  )
}

const qtyBtn = { width:38, height:38, border:"none", background:"transparent", color:"#fff", fontSize:20, fontWeight:900, cursor:"pointer" }
const lbl = { display:"block", fontSize:12, fontWeight:700, color:C.soft, margin:"10px 0 5px" }
const inp = { width:"100%", padding:"12px 14px", borderRadius:12, border:`1.5px solid ${C.rule}`, fontSize:16, background:"#fff", color:C.ink, outline:"none", boxSizing:"border-box" }

export function Shell({ children }) {
  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif", color:C.ink }}>
      <div style={{ maxWidth:560, margin:"0 auto", minHeight:"100vh", background:C.bg }}>{children}
        <div style={{ textAlign:"center", fontSize:11, color:C.soft, padding:"18px 0 26px" }}>Powered by <a href="https://dukhaanai.in" style={{ color:C.dark, fontWeight:700, textDecoration:"none" }}>DukhaanAI</a></div>
      </div>
    </div>
  )
}
