import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Products, Invoices, Customers, api, isCloud, getStoreName } from "../sync/db.js"
import { useAuth } from "../context/AuthContext.jsx"
import { usePlan } from "../context/PlanContext.jsx"
import BarcodeScanner from "../components/BarcodeScanner.jsx"
import InvoiceView from "../components/InvoiceView.jsx"
import { lookupBarcode as lookupBarcodeAPI } from "../data/barcodeLookup.js"
import { MIN_FONT_SIZE } from "../styles/textScale"
import { getDefaultApplyGst } from "../utils/gstSettings.js"
import { getSpeechRecognition } from "../voice/nativeSpeech.js"
import { tr, uiLang } from "../i18n/kiranaStrings"

// UI text in the shop's language (falls back to English)
const L = k => tr(k, uiLang())

const hasCamera = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

// ── Pre-invoice review modal ──────────────────────────────
function ReviewModal({ rows, products, applyGst, onConfirm, onClose }) {
  const [items, setItems] = useState(() =>
    rows.map(r => {
      const p = products.find(x => x.id === r.prodId)
      if (!p) return null
      return {
        prodId:      p.id,
        name:        lineName(p, r.qty),
        qty:         +r.qty || 1,
        unit_price:  p.mrp,
        gst_percent: p.gst_percent || 0,
        cost_price:  p.cost_price  || 0,
      }
    }).filter(Boolean)
  )
  const [discountVal,  setDiscountVal]  = useState("")
  const [discountType, setDiscountType] = useState("flat") // "flat" | "percent"

  function setItem(i, k, v) {
    setItems(it => it.map((row, ri) => ri === i ? { ...row, [k]: v } : row))
  }

  const subtotal    = items.reduce((s, i) => s + Math.round(i.unit_price * i.qty * 100) / 100, 0)
  // Discount can't be negative (that would raise the price) or more than the bill
  const discNum     = Math.max(0, +discountVal || 0)
  const discountAmt = discountType === "percent"
    ? Math.round(subtotal * Math.min(discNum, 100) / 100 * 100) / 100
    : Math.min(discNum, subtotal)
  const afterDiscount = Math.round((subtotal - discountAmt) * 100) / 100

  // Distribute discount proportionally across items for GST calc.
  // Skipped entirely when the vendor has GST turned off for this bill.
  const gstTotal = !applyGst ? 0 : items.reduce((s, i) => {
    const itemSub    = Math.round(i.unit_price * i.qty * 100) / 100
    const proportion = subtotal > 0 ? itemSub / subtotal : 0
    const taxable    = Math.round(afterDiscount * proportion * 100) / 100
    return s + Math.round(taxable * i.gst_percent / 100 * 100) / 100
  }, 0)
  const grandTotal = Math.round((afterDiscount + gstTotal) * 100) / 100

  const totalCost = items.reduce((s, i) => s + Math.round(i.cost_price * i.qty * 100) / 100, 0)
  const profit    = Math.round((afterDiscount - totalCost) * 100) / 100
  const profitPct = totalCost > 0 ? Math.round(profit / totalCost * 100) : null

  function handleConfirm() {
    // Build final items — discount distributed proportionally into unit_price
    const finalItems = items.map(i => {
      const itemSub    = Math.round(i.unit_price * i.qty * 100) / 100
      const proportion = subtotal > 0 ? itemSub / subtotal : 0
      const itemDisc   = Math.round(discountAmt * proportion * 100) / 100
      const taxable    = Math.round((itemSub - itemDisc) * 100) / 100
      const effPrice   = i.qty > 0 ? Math.round(taxable / i.qty * 100) / 100 : i.unit_price
      return { product_id: i.prodId, name: i.name, qty: i.qty, unit_price: effPrice, gst_percent: i.gst_percent }
    })
    onConfirm(finalItems, discountAmt)
  }

  return (
    <div style={{
      // Above the billing bottom bar (z 160) and the phone menu, so Confirm is always reachable
      position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
      zIndex:450, display:"flex", alignItems:"flex-start", justifyContent:"center",
      padding:"16px", overflowY:"auto",
    }}>
      <div style={{
        background:"#fff", borderRadius:16, width:"100%", maxWidth:520,
        marginTop:16, marginBottom:16, overflow:"hidden",
        boxShadow:"0 20px 60px rgba(0,0,0,0.2)",
      }}>
        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #f0f0f0",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>Review Invoice</div>
            <div style={{ fontSize:MIN_FONT_SIZE, color:"#888", marginTop:2 }}>Edit prices, apply discount, confirm GST</div>
          </div>
          <button onClick={onClose} style={{
            background:"#f5f5f5", border:"none", borderRadius:8,
            padding:"6px 12px", fontSize:12, cursor:"pointer", color:"#666",
          }}>✕ Back</button>
        </div>

        <div style={{ padding:"16px 20px" }}>
          {/* Items table */}
          <div style={{ fontSize:MIN_FONT_SIZE, fontWeight:600, color:"#555", marginBottom:8 }}>Items</div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#f9fafb" }}>
                  <th style={{ textAlign:"left", padding:"6px 8px", fontWeight:600, color:"#555" }}>Product</th>
                  <th style={{ padding:"6px 8px", fontWeight:600, color:"#555", width:50 }}>Qty</th>
                  <th style={{ padding:"6px 8px", fontWeight:600, color:"#555", width:80 }}>Rate ₹</th>
                  <th style={{ padding:"6px 8px", fontWeight:600, color:"#555", width:60 }}>GST %</th>
                  <th style={{ textAlign:"right", padding:"6px 8px", fontWeight:600, color:"#555" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const effGst = applyGst ? item.gst_percent : 0
                  const total = Math.round(item.unit_price * item.qty * (1 + effGst / 100) * 100) / 100
                  const itemProfit = Math.round((item.unit_price - item.cost_price) * item.qty * 100) / 100
                  return (
                    <tr key={i} style={{ borderTop:"1px solid #f0f0f0" }}>
                      <td style={{ padding:"8px 8px" }}>
                        <div style={{ fontWeight:500 }}>{item.name}</div>
                        {item.cost_price > 0 && (
                          <div style={{ fontSize:MIN_FONT_SIZE, color: itemProfit >= 0 ? "#16a34a" : "#dc2626", marginTop:2 }}>
                            {itemProfit >= 0 ? "+" : ""}₹{itemProfit} profit
                          </div>
                        )}
                      </td>
                      <td style={{ padding:"8px 4px" }}>
                        <input type="number" min="0.01" step="0.01" value={item.qty}
                          onChange={e => setItem(i, "qty", +e.target.value > 0 ? +e.target.value : 1)}
                          style={{ width:46, textAlign:"center", border:"1px solid #e5e7eb",
                            borderRadius:6, padding:"4px 2px", fontSize:12 }} />
                      </td>
                      <td style={{ padding:"8px 4px" }}>
                        <input type="number" min="0" step="0.01" value={item.unit_price}
                          onChange={e => setItem(i, "unit_price", Math.max(0, +e.target.value || 0))}
                          style={{ width:72, border:"1px solid #e5e7eb", borderRadius:6,
                            padding:"4px 6px", fontSize:12 }} />
                      </td>
                      <td style={{ padding:"8px 4px" }}>
                        <select value={item.gst_percent}
                          onChange={e => setItem(i, "gst_percent", +e.target.value)}
                          style={{ width:56, border:"1px solid #e5e7eb", borderRadius:6,
                            padding:"4px 2px", fontSize:MIN_FONT_SIZE }}>
                          {[0,3,5,12,18,28].map(g => <option key={g} value={g}>{g}%</option>)}
                        </select>
                      </td>
                      <td style={{ padding:"8px 8px", textAlign:"right", fontWeight:600, color:"#1D9E75" }}>
                        ₹{total}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Discount */}
          <div style={{ marginTop:16, padding:"12px", background:"#f9fafb", borderRadius:10 }}>
            <div style={{ fontSize:MIN_FONT_SIZE, fontWeight:600, color:"#555", marginBottom:8 }}>Discount</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <select value={discountType} onChange={e => setDiscountType(e.target.value)}
                style={{ border:"1px solid #e5e7eb", borderRadius:8, padding:"7px 8px",
                  fontSize:12, background:"#fff" }}>
                <option value="flat">₹ Flat</option>
                <option value="percent">% Percent</option>
              </select>
              <input type="number" min="0" placeholder="0"
                value={discountVal} onChange={e => setDiscountVal(e.target.value)}
                style={{ flex:1, border:"1px solid #e5e7eb", borderRadius:8, padding:"7px 10px", fontSize:13 }} />
              {discountAmt > 0 && (
                <span style={{ fontSize:12, color:"#dc2626", fontWeight:600, whiteSpace:"nowrap" }}>
                  − ₹{discountAmt}
                </span>
              )}
            </div>
          </div>

          {/* Totals */}
          <div style={{ marginTop:14, padding:"12px", border:"1px solid #e5e7eb", borderRadius:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
              <span style={{ color:"#888" }}>Subtotal</span>
              <span>₹{Math.round(subtotal * 100) / 100}</span>
            </div>
            {discountAmt > 0 && (
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                <span style={{ color:"#dc2626" }}>Discount</span>
                <span style={{ color:"#dc2626" }}>− ₹{discountAmt}</span>
              </div>
            )}
            {applyGst ? (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                  <span style={{ color:"#888" }}>CGST</span>
                  <span>₹{Math.round(gstTotal / 2 * 100) / 100}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:10,
                  paddingBottom:10, borderBottom:"1px solid #f0f0f0" }}>
                  <span style={{ color:"#888" }}>SGST</span>
                  <span>₹{Math.round((gstTotal - gstTotal / 2) * 100) / 100}</span>
                </div>
              </>
            ) : (
              <div style={{ fontSize:12, color:"#888", marginBottom:10, paddingBottom:10,
                borderBottom:"1px solid #f0f0f0" }}>
                GST not applied to this bill
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:15, fontWeight:700 }}>
              <span>Grand Total</span>
              <span style={{ color:"#1D9E75" }}>₹{grandTotal}</span>
            </div>
          </div>

          {/* Profit */}
          {totalCost > 0 && (
            <div style={{
              marginTop:10, padding:"10px 12px", borderRadius:10,
              background: profit >= 0 ? "#f0fdf4" : "#fff1f2",
              border: `1px solid ${profit >= 0 ? "#bbf7d0" : "#fecdd3"}`,
              display:"flex", justifyContent:"space-between", alignItems:"center",
            }}>
              <span style={{ fontSize:12, color:"#555" }}>Estimated Profit</span>
              <span style={{ fontSize:13, fontWeight:700, color: profit >= 0 ? "#16a34a" : "#dc2626" }}>
                {profit >= 0 ? "+" : ""}₹{profit}
                {profitPct !== null && (
                  <span style={{ fontSize:MIN_FONT_SIZE, fontWeight:400, marginLeft:6 }}>({profitPct}%)</span>
                )}
              </span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <button onClick={onClose}
              style={{ flex:1, padding:"11px", borderRadius:10, border:"1px solid #e5e7eb",
                background:"#fff", fontSize:13, cursor:"pointer", color:"#666" }}>
              ← Edit Bill
            </button>
            <button onClick={handleConfirm}
              style={{ flex:2, padding:"11px", borderRadius:10, border:"none",
                background:"#1D9E75", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              Confirm & Generate Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Category → emoji mapping for cart item icons
const CAT_EMOJI = {
  Dairy:'🥛', Staples:'🌾', Oils:'🛢', Beverages:'🥤', Snacks:'🍪',
  'Personal Care':'🧴', Bakery:'🍞', Eggs:'🥚', Tea:'🫖', Spices:'🧂',
  Fruits:'🍎', Vegetables:'🥦', Other:'📦',
}

// Big picture for each product (Easy billing) — from the name first, then the category
const NAME_EMOJI = [
  [/ginger|garlic|adrak|lahsun|allam|vellulli/i, "🧄"], [/cashew|kaju|badam|almond|peanut|groundnut|pista|walnut|\bnuts?\b/i, "🥜"],
  [/milk|doodh|curd|dahi|lassi|paneer/i, "🥛"], [/butter|ghee|cheese/i, "🧈"], [/salt|namak/i, "🧂"],
  [/oil|tel\b/i, "🫙"], [/biscuit|cookie|parle|marie|bourbon/i, "🍪"], [/noodle|maggi|pasta|yippee/i, "🍜"],
  [/chips|lays|kurkure|namkeen|bhujia/i, "🥔"], [/chocolate|dairy milk|kitkat|5 ?star/i, "🍫"],
  [/sugar|chini|candy|toffee/i, "🍬"], [/rice|chawal|poha/i, "🍚"], [/rajma|kidney/i, "🫘"],
  [/atta|flour|maida|sooji|rava|besan/i, "🌾"], [/tea|chai/i, "🍵"], [/coffee/i, "☕"],
  [/soap|lifebuoy|lux|dettol|santoor/i, "🧼"], [/shampoo|lotion|cream|oil.*hair/i, "🧴"],
  [/tooth ?paste|colgate|pepsodent|close ?up|sensodyne|dabur red|brush/i, "🪥"], [/surf|detergent|rin|tide|ariel|nirma|vim|harpic/i, "🧺"],
  [/cola|coke|pepsi|sprite|thums|fanta|drink|soda|limca/i, "🥤"], [/juice|frooti|maaza|slice/i, "🧃"],
  [/water|bisleri|aquafina/i, "💧"], [/egg|anda/i, "🥚"], [/bread|pav|bun|rusk/i, "🍞"],
  [/tomato|tamatar|tamata/i, "🍅"], [/onion|pyaz|ullipaya/i, "🧅"], [/potato|aloo|bangala/i, "🥔"],
  [/carrot|gajar/i, "🥕"], [/brinjal|baingan|vankaya/i, "🍆"], [/corn|bhutta/i, "🌽"], [/cucumber|kheera/i, "🥒"],
  [/coriander|dhaniya|kothimeera|palak|spinach|methi|curry leaves|leaf|leaves/i, "🌿"],
  [/vegetable|sabzi|cabbage|cauliflower|gobi/i, "🥬"],
  [/banana|kela|arati/i, "🍌"], [/mango|aam\b|mamidi/i, "🥭"], [/lemon|nimbu|nimma/i, "🍋"], [/grape/i, "🍇"],
  [/coconut|nariyal|kobbari/i, "🥥"], [/orange|santra/i, "🍊"], [/apple|seb|fruit/i, "🍎"],
  [/masala|chilli|mirchi|haldi|turmeric|jeera|spice/i, "🌶️"], [/agarbatti|incense|matchbox|match/i, "🔥"],
]
// Pulses have no emoji of their own (🫘 is rajma), so they get a bowl of grains in their real colour.
// [name pattern, grain colour, round grains?] — first match wins
const PULSE_GRAIN = [
  [/rajma|kidney/i, null],
  [/kabuli|chole|chickpea/i, "#e8cd96", true],
  [/chana ?dal|senaga ?pappu|bengal gram dal/i, "#e6b437"],
  [/kala chana|black chana|chana|senagalu|bengal gram/i, "#8b5a2b", true],
  [/moong ?dal|pesara ?pappu|yellow moong/i, "#f0cf5a"],
  [/moong|green gram|pesara/i, "#7da63a", true],
  [/masoor|red lentil/i, "#e0703a"],
  [/(urad|udad|minapa|minumulu).*(dal|pappu|gota)|(dal|pappu).*(urad|udad)/i, "#f1ead6"],
  [/urad|udad|minumulu|black gram/i, "#2f2f2f", true],
  [/soya/i, "#d6a96b", true],
  [/sabudana|sago/i, "#f6f3ea", true],
  [/toor|thoor|tuvar|arhar|kandi|kandhi|\bdal\b|pappu|lentil|pulse/i, "#e9b949"],
]
function productEmoji(p) {
  const name = p?.name || ""
  const pulse = PULSE_GRAIN.find(([re]) => re.test(name))
  if (pulse && pulse[1]) return { grain: pulse[1], round: !!pulse[2] }
  const hit = NAME_EMOJI.find(([re]) => re.test(name))
  return hit ? hit[1] : (CAT_EMOJI[p?.category] || "📦")
}

// A heap of small grains in a steel bowl, drawn at emoji size.
// Grain spots are fixed (seeded) so every tile looks the same on every render.
const GRAIN_HEAP = (() => {
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const out = []
  while (out.length < 95) {
    const x = 6 + rnd() * 36, y = 8 + rnd() * 20
    // inside the mound: half-ellipse sitting on the bowl rim (y = 27)
    if (((x - 24) / 18.5) ** 2 + ((27.5 - y) / 18) ** 2 > 1) continue
    out.push({ x, y, a: Math.round(rnd() * 180), t: rnd() })
  }
  return out.sort((a, b) => a.y - b.y)   // back to front
})()
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16)
  const ch = v => Math.max(0, Math.min(255, Math.round(v * f)))
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`
}
function GrainBowl({ color, round, size = 48 }) {
  const tones = [shade(color, 0.82), color, shade(color, 1.08)]
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <ellipse cx="24" cy="27.5" rx="20.5" ry="3.4" fill={shade(color, 0.55)} />
      {GRAIN_HEAP.map((g, i) => (
        <ellipse key={i} cx={g.x} cy={g.y} rx={round ? 1.9 : 2.1} ry={round ? 1.8 : 1.35}
          fill={tones[Math.floor(g.t * 3)]} stroke="rgba(0,0,0,0.22)" strokeWidth="0.35"
          transform={round ? undefined : `rotate(${g.a} ${g.x} ${g.y})`} />
      ))}
      {/* steel katori */}
      <path d="M2.5 28 Q4 45 24 45 Q44 45 45.5 28 Z" fill="#b9c0c8" />
      <path d="M6 31 Q9 41 20 42.5" fill="none" stroke="#eef1f4" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      <path d="M2.5 28 Q24 31.5 45.5 28" fill="none" stroke="#8d96a0" strokeWidth="1.3" />
    </svg>
  )
}
function ProductPic({ p, size = 44 }) {
  const pic = productEmoji(p)
  return typeof pic === "string"
    ? <span style={{ fontSize:size, lineHeight:1 }}>{pic}</span>
    : <GrainBowl color={pic.grain} round={pic.round} size={size + 4} />
}

// "Total ₹107" said out loud in the shop's language (web: speechSynthesis; skipped where unavailable)
const TOTAL_WORDS = {
  "en-IN": n => `Total ${n} rupees`,      "hi-IN": n => `कुल ${n} रुपये`,     "te-IN": n => `మొత్తం ${n} రూపాయలు`,
  "ta-IN": n => `மொத்தம் ${n} ரூபாய்`,     "kn-IN": n => `ಒಟ್ಟು ${n} ರೂಪಾಯಿ`,  "ml-IN": n => `ആകെ ${n} രൂപ`,
  "mr-IN": n => `एकूण ${n} रुपये`,         "bn-IN": n => `মোট ${n} টাকা`,       "gu-IN": n => `કુલ ${n} રૂપિયા`,
  "pa-IN": n => `ਕੁੱਲ ${n} ਰੁਪਏ`,
}
function speakTotal(amount) {
  try {
    if (!window.speechSynthesis) return
    const lang = uiLang()
    const u = new SpeechSynthesisUtterance((TOTAL_WORDS[lang] || TOTAL_WORDS["en-IN"])(Math.round(amount)))
    u.lang = lang
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch { /* no voice on this device */ }
}
const buzz = () => { try { navigator.vibrate?.(25) } catch { /* not supported */ } }

// ── Loose items (sold by weight / volume from a bag or tin) ──
// Two kinds:
//  • unit kg/litre with no size in the name ("Sugar"): price is per kg / litre, qty in kg / litres
//  • a big bag or can ("CHANA 50 KG", "SOYABEAN CHUNKS 15 KG"): price and stock are per bag,
//    qty is a fraction of the bag (500 g of a 50 kg bag = 0.01) so stock stays in bags
// Small packets ("Tata Salt 1kg", "Besan 500 GM") stay one-tap packets.
const SIZE_RE  = /(\d+(?:\.\d+)?)\s*(kgs?|gms?|grams?|g|ltrs?|litres?|liters?|l|ml)\b/i
const BAG_MIN  = 5   // kg or litres
const round6   = n => Math.round(n * 1e6) / 1e6
function looseInfo(p) {
  if (!p) return null
  const m = (p.name || "").match(SIZE_RE)
  if (m) {
    const n = parseFloat(m[1]), u = m[2].toLowerCase()
    const kg = /^kg/.test(u) ? n : /^(g|gm|gram)/.test(u) ? n / 1000 : null
    const lt = u === "ml" ? n / 1000 : kg == null ? n : null
    if (kg != null && kg >= BAG_MIN) return { kg: true, per: kg, bag: true }
    if (lt != null && lt >= BAG_MIN) return { kg: false, per: lt, bag: true }
    return null
  }
  if (p.unit === "kg" || p.unit === "litre") return { kg: p.unit === "kg", per: 1, bag: false }
  return null
}
const isLoose = p => !!looseInfo(p)
const looseKg = p => !!looseInfo(p)?.kg
// weight (kg or litres) → "250 g" / "1.5 kg" / "750 ml" / "2 L"
function fmtWeight(kg, w) {
  if (w < 1) return `${Math.round(w * 1000)} ${kg ? "g" : "ml"}`
  return `${+w.toFixed(2)} ${kg ? "kg" : "L"}`
}
// bill quantity (in the product's own unit) → what the customer gets
function fmtQty(p, q) {
  const info = looseInfo(p)
  return info ? fmtWeight(info.kg, +q * info.per) : String(+q)
}
// price per kg / litre: "₹55.2/kg"
const ratePer = p => { const i = looseInfo(p); return i ? Math.round(p.mrp / i.per * 100) / 100 : p.mrp }
const perUnit = p => { const i = looseInfo(p); return i && !i.bag ? (i.kg ? "/kg" : "/L") : "" }
const rateLabel = p => { const i = looseInfo(p); return i ? `₹${ratePer(p)}/${i.kg ? "kg" : "L"}` : `₹${p.mrp}/unit` }
// "−" on a loose line: take off 1 kg (or 1 L) above 1 kg, 100 g below. Returns 0 when it should go.
function looseLess(p, q) {
  const { per } = looseInfo(p)
  const w = q * per
  const left = w - (w > 1 + 1e-9 ? 1 : 0.1)
  return left < 0.05 - 1e-9 ? 0 : round6(left / per)
}
// invoice line name for loose sales: "CHANA 50 KG · 500 g"
const lineName = (p, q) => isLoose(p) ? `${p.name} · ${fmtQty(p, q)}` : p.name

function LoosePicker({ product: p, inBill, change, onPick, onClose, L }) {
  const [grams, setGrams] = useState("")
  const [rupees, setRupees] = useState("")
  const info = looseInfo(p)
  const kg = info.kg
  const presets = kg ? [0.05, 0.1, 0.25, 0.5, 1, 2] : [0.1, 0.25, 0.5, 1, 2, 5]
  const rate = ratePer(p)
  const price = w => Math.round(rate * w * 100) / 100
  const fromGrams = +grams > 0 ? +grams / 1000 : 0
  const fromRupees = +rupees > 0 && rate > 0 ? Math.round(+rupees / rate * 1000) / 1000 : 0
  const pick = w => onPick(round6(w / info.per))
  const btn = { borderRadius:16, border:"2px solid var(--rule)", background:"var(--bg2)", padding:"12px 6px",
    display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer" }
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,0.45)",
      display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:520, background:"var(--bg1)",
        borderRadius:"22px 22px 0 0", padding:"18px 16px", paddingBottom:"max(20px, env(safe-area-inset-bottom))" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:18, fontWeight:900, color:"var(--ink)" }}>{change ? L("Change weight") + " · " : ""}{p.name}</div>
            <div style={{ fontSize:14, color:"var(--ink-dim)", fontWeight:700 }}>
              ₹{rate}/{kg ? "kg" : "L"} · {L("Loose")}{inBill > 0 ? ` · ${L("In bill")}: ${fmtQty(p, inBill)}` : ""}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width:44, height:44, borderRadius:12, border:"1px solid var(--rule)",
            background:"var(--bg2)", fontSize:20, color:"var(--ink-dim)" }}>✕</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, margin:"14px 0" }}>
          {presets.map(w => (
            <button key={w} onClick={() => pick(w)} style={btn}>
              <span style={{ fontSize:22, fontWeight:900, color:"var(--ink)" }}>{fmtWeight(kg, w)}</span>
              <span style={{ fontSize:15, fontWeight:800, color:"var(--brass-deep)" }}>₹{price(w)}</span>
            </button>
          ))}
        </div>
        {info.bag && (
          <button onClick={() => onPick(1)} style={{ ...btn, width:"100%", flexDirection:"row", justifyContent:"center",
            gap:10, marginBottom:10, padding:"12px" }}>
            <span style={{ fontSize:18, fontWeight:900, color:"var(--ink)" }}>{L("Full bag")} · {fmtWeight(kg, info.per)}</span>
            <span style={{ fontSize:16, fontWeight:800, color:"var(--brass-deep)" }}>₹{p.mrp}</span>
          </button>
        )}
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <input type="number" inputMode="numeric" value={grams} onChange={e => { setGrams(e.target.value); setRupees("") }}
            placeholder={kg ? L("Grams") : "ml"} className="input" style={{ flex:1, fontSize:18, padding:"12px" }} />
          <input type="number" inputMode="decimal" value={rupees} onChange={e => { setRupees(e.target.value); setGrams("") }}
            placeholder={"₹ " + L("worth")} className="input" style={{ flex:1, fontSize:18, padding:"12px" }} />
        </div>
        <button disabled={!(fromGrams || fromRupees)} onClick={() => pick(fromGrams || fromRupees)}
          style={{ width:"100%", height:58, borderRadius:16, border:"none", fontSize:18, fontWeight:900, color:"#fff",
            background: fromGrams || fromRupees ? "linear-gradient(135deg,var(--saffron),var(--saffron-hot))" : "var(--rule)" }}>
          {fromGrams || fromRupees
            ? `${L(change ? "Set" : "Add to bill")} · ${fmtWeight(kg, fromGrams || fromRupees)} · ₹${price(fromGrams || fromRupees)}`
            : L(change ? "Set" : "Add to bill")}
        </button>
      </div>
    </div>
  )
}

export default function Billing() {
  const { vendor }  = useAuth()
  const { hasFeature } = usePlan()
  const navigate    = useNavigate()
  const [dayStatus, setDayStatus] = useState(undefined)

  // Gate: check day session on mount
  useEffect(() => {
    // Local-only users have no vendor object; they never need a server day session.
    if (!isCloud()) { setDayStatus("open"); return }
    if (!vendor) return
    {
      api.get("/day-sessions/today?store_type=kirana")
        .then(s => setDayStatus(s?.status || null))
        .catch(() => setDayStatus(null))
    }
  }, [vendor?.id])

  // ── core state ────────────────────────────────────────────
  const [products,  setProducts]  = useState([])
  const [rows,      setRows]      = useState([])
  const [cust,      setCust]      = useState("")
  const [phone,     setPhone]     = useState("")
  const [gstin,     setGstin]     = useState("")
  const [pay,       setPay]       = useState("Cash")
  // Most local vendors don't issue GST bills — off by default, vendor opts
  // in per-bill, or sets a store-wide default in Settings.
  const [applyGst,  setApplyGst]  = useState(getDefaultApplyGst)
  const [invoice,   setInvoice]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [notif,     setNotif]     = useState("")
  const [scanner,   setScanner]   = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [quickAdd,  setQuickAdd]  = useState(null)

  // ── billing-first new state ───────────────────────────────
  const [searchQ,      setSearchQ]      = useState("")
  const [barcodeResult,setBarcodeResult]= useState(null)
  const [custExpanded, setCustExpanded] = useState(false)
  const [heldBills,    setHeldBills]    = useState(() => {
    try { return JSON.parse(localStorage.getItem("dk_held_bills") || "[]") } catch { return [] }
  })
  const [showHeld, setShowHeld] = useState(false)
  const [showCart, setShowCart] = useState(false)   // bill sheet over the product list (mobile-first)
  const [loosePick, setLoosePick] = useState(null)  // loose product whose weight picker is open
  const [looseChange, setLooseChange] = useState(false)  // picker sets the weight instead of adding
  // "easy" = big pictures + one PAID button; "default" = full billing screen. Remembered per phone.
  const [billMode, setBillMode] = useState(() => { try { return localStorage.getItem("dk_bill_mode") || "default" } catch { return "default" } })
  const [easyDone, setEasyDone] = useState(null)   // { total } after an Easy bill is saved
  function switchBillMode(m) {
    setBillMode(m)
    try { localStorage.setItem("dk_bill_mode", m) } catch { /* private mode */ }
  }
  const [openingDay, setOpeningDay] = useState(false)

  const searchRef = useRef(null)
  const barcodeRef = useRef(null)   // kept for compat with lookupBarcode

  useEffect(() => {
    Products.list().then(p => {
      setProducts(p)
      setRows([])  // start empty — vendor adds items manually or by search
    })
  }, [])

  function showNotif(m, dur = 2500) {
    setNotif(m); setTimeout(() => setNotif(""), dur)
  }

  const getProduct = id => products.find(p => p.id === id) || null
  const setRow = (i, k, v) => setRows(r => r.map((row, ri) => ri === i ? { ...row, [k]: v } : row))
  const addRow = ()  => setRows(r => [...r, { prodId: products[0]?.id || "", qty: 1, isNew: true }])
  const delRow = i   => setRows(r => r.filter((_, ri) => ri !== i))

  // ── Stock limit: a bill can't take more than what's in the shop ──
  const stockOf   = p  => Number(p?.stock) || 0
  const qtyInBill = id => rows.find(r => r.prodId === id)?.qty || 0
  function canAdd(product, amount = 1) {
    if (!product) return false
    const have = stockOf(product)
    if (qtyInBill(product.id) + amount <= have + 1e-9) return true
    showNotif(have <= 0
      ? `${product.name}: ${L("Out of stock")}`
      : `${L("Only")} ${fmtQty(product, have)} ${L("in stock")}: ${product.name}`)
    return false
  }
  const canAddOne = product => canAdd(product, 1)
  // Bill count: a loose item counts as one line, packets by quantity
  const itemCount = rows.reduce((n, r) => n + (isLoose(getProduct(r.prodId)) ? 1 : (+r.qty || 0)), 0)

  // ── Barcode lookup (manual + camera) ─────────────────────
  async function lookupBarcode(code) {
    const q = (code || "").trim()
    if (!q) return
    const matched = products.find(p =>
      p.barcode === q ||
      p.sku === q ||
      p.sku?.replace(/[-\s]/g, "") === q.replace(/[-\s]/g, "") ||
      p.name.toLowerCase().includes(q.toLowerCase())
    )
    if (matched) {
      setBarcodeResult(matched)
      return
    }
    // Not in local inventory — try external catalogs so we can offer Quick Add
    setBarcodeResult({ notFound: true, code: q, looking: true })
    try {
      const ext = await lookupBarcodeAPI(q, "kirana")
      setBarcodeResult({ notFound: true, code: q, looking: false, ext })
    } catch (e) {
      setBarcodeResult({ notFound: true, code: q, looking: false, ext: { found:false, diag: e.message } })
    }
  }

  async function quickAddToInventoryAndBill(code, ext) {
    try {
      const newProd = await Products.create({
        name:        ext?.name || `Item ${code}`,
        sku:         code,
        category:    ext?.category || "Other",
        unit:        "piece",
        stock:       Number(ext?.stock) || 1,
        min_stock:   10,
        mrp:         ext?.mrp ? Number(ext.mrp) : 0,
        cost_price:  ext?.cost_price ? Number(ext.cost_price) : 0,
        gst_percent: ext?.gst_percent ?? 5,
      })
      const updated = await Products.list()
      setProducts(updated)
      const created = updated.find(p => p.id === newProd.id) || newProd
      addBarcodeProductToBill(created)
      setQuickAdd(null)
      showNotif(`✓ ${created.name} added to inventory & bill`)
    } catch (e) {
      showNotif("Quick add failed: " + e.message)
    }
  }

  function addBarcodeProductToBill(product) {
    if (!canAddOne(product)) return
    setRows(rows => {
      const existing = rows.findIndex(r => r.prodId === product.id)
      if (existing >= 0) {
        const updated = [...rows]
        updated[existing] = { ...updated[existing], qty: updated[existing].qty + 1 }
        return updated
      }
      return [...rows, { prodId: product.id, qty: 1 }]
    })
    setSearchQ("")
    setBarcodeResult(null)
    showNotif(`✓ ${product.name} added to bill`)
    barcodeRef.current?.focus()
  }

  function handleCameraBarcode(code) {
    setScanner(false)
    setSearchQ(code)   // show the scanned code where a typed barcode would go
    lookupBarcode(code)
  }

  // ── Totals ────────────────────────────────────────────────
  const totals = rows.reduce((acc, row) => {
    const p = getProduct(row.prodId); if (!p) return acc
    const sub = Math.round(p.mrp * row.qty * 100) / 100
    const tax = applyGst ? Math.round(sub * p.gst_percent / 100 * 100) / 100 : 0
    return { sub: acc.sub + sub, tax: acc.tax + tax }
  }, { sub: 0, tax: 0 })
  const grandTotal = Math.round((totals.sub + totals.tax) * 100) / 100

  // ── Generate invoice ──────────────────────────────────────
  function openReview() {
    if (!cust.trim()) return showNotif("Customer name is required")
    const valid = rows.filter(r => getProduct(r.prodId) && +r.qty > 0)
    if (!valid.length) return showNotif("Add at least one item with valid quantity")
    setShowReview(true)
  }

  async function handleReviewConfirm(finalItems) {
    const over = finalItems.find(it => {
      const prod = getProduct(it.product_id)
      return prod && +it.qty > stockOf(prod)
    })
    if (over) {
      const prod = getProduct(over.product_id)
      showNotif(`${L("Only")} ${stockOf(prod)} ${L("in stock")}: ${prod.name}`)
      setEasyDone(null)
      return
    }
    setShowReview(false)
    setSaving(true)
    const custName = cust.trim() || "Walk-in"
    try {
      const inv = await Invoices.generate({
        customer_name:  custName,
        customer_phone: phone || null,
        customer_gstin: gstin || null,
        payment_mode:   pay,
        apply_gst:      applyGst,
        items:          finalItems,
      })
      setInvoice({ ...inv, customer_phone: phone })
      if (custName !== "Walk-in") await Customers.upsert({ name: custName, phone: phone||null, gstin: gstin||null, amount: inv.total })
      showNotif(`✓ Invoice ${inv.invoice_no} generated!`)
    } catch(e) { setEasyDone(null); showNotif("Error: " + e.message) }
    finally { setSaving(false) }
  }

  // ── WhatsApp share ────────────────────────────────────────
  // Opens WhatsApp (Web or app) with the bill pre-typed — requires the
  // vendor's own WhatsApp to be open/logged in, and a manual tap to send.
  // Used as a fallback when the server-side send (below) isn't available.
  function openWhatsAppLink() {
    if (!invoice) return
    const lines = invoice.items.map(i => `  • ${i.name} × ${i.qty} = ₹${i.total}`).join("\n")
    const msg =
`🧾 *Invoice ${invoice.invoice_no}*
Store: ${getStoreName(vendor) || "DukhaanAI"}
GSTIN: ${vendor?.gstin || "—"}
Date: ${new Date(invoice.created_at).toLocaleDateString("en-IN")}

Customer: *${invoice.customer_name}*
Payment: ${invoice.payment_mode}

Items:
${lines}

Subtotal: ₹${invoice.subtotal}
CGST: ₹${invoice.cgst} | SGST: ₹${invoice.sgst}
*Total: ₹${invoice.total}*

Thank you for shopping! 🙏`
    const num = (phone || "").replace(/\D/g, "")
    window.open(`https://wa.me/${num ? "91" + num : ""}?text=${encodeURIComponent(msg)}`, "_blank")
  }

  // Sends the bill directly via the WhatsApp Business API — no app opens,
  // no manual tap. This is opt-in infra: until a WhatsApp Business template
  // is configured (not something we're investing in right now), the backend
  // returns 503 "not configured" — treat that as the normal/expected case
  // and fall back to the free wa.me link with no error shown. Any other
  // failure (a real send attempt that broke) still surfaces to the vendor.
  async function sendWhatsApp() {
    if (!invoice) return
    const num = (phone || "").replace(/\D/g, "")
    if (num.length !== 10) {
      showNotif("Enter the customer's 10-digit phone number first")
      return
    }
    try {
      await api.post(`/invoices/${invoice.id}/send-whatsapp`, { phone: num })
      showNotif("✓ Bill sent via WhatsApp!")
    } catch (e) {
      if (e.status !== 503) showNotif("Couldn't auto-send (" + e.message + ") — opening WhatsApp instead")
      openWhatsAppLink()
    }
  }

  function clearBill() {
    setRows([])
    setCust(""); setPhone(""); setGstin("")
    setInvoice(null); setSearchQ(""); setBarcodeResult(null)
    setEasyDone(null)
  }

  // ── billing-first helpers ────────────────────────────────

  const [catFilter,    setCatFilter]    = useState("Frequent")
  const [easyQ,        setEasyQ]        = useState("")   // Easy mode: type to find a picture
  const [voiceActive,  setVoiceActive]  = useState(false)

  // Instant product search results as user types
  const searchResults = searchQ.trim().length >= 1
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQ.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQ.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQ))
      ).slice(0, 7)
    : []

  function startVoiceSearch() {
    const SR = getSpeechRecognition()
    if (!SR) { showNotif("Voice not supported — use Chrome or Edge"); return }
    setVoiceActive(true)
    const rec = new SR()
    rec.lang          = localStorage.getItem("dk_voice_lang") || "en-IN"
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript.trim()
      setVoiceActive(false)
      setBarcodeResult(null)
      // check if it matches exactly one product
      const matches = products.filter(p =>
        p.name.toLowerCase().includes(text.toLowerCase()) ||
        text.toLowerCase().includes(p.name.toLowerCase().split(" ")[0])
      )
      if (matches.length === 1) {
        addToCart(matches[0])          // auto-add directly
        showNotif(`🎤 "${text}" → ${matches[0].name}`)
      } else {
        setSearchQ(text)               // show results in dropdown
        setTimeout(() => searchRef.current?.focus(), 50)
      }
    }
    rec.onerror = () => { setVoiceActive(false); showNotif("Mic error — check permissions") }
    rec.onend   = () => setVoiceActive(false)
    rec.start()
  }

  function addToCart(product, amount) {
    if (isLoose(product) && amount == null) { setLoosePick(product); return }
    const amt = amount ?? 1
    if (!canAdd(product, amt)) return
    setRows(prev => {
      const idx = prev.findIndex(r => r.prodId === product.id)
      if (idx >= 0) return prev.map((r, i) => i === idx ? { ...r, qty: round6(r.qty + amt) } : r)
      return [...prev, { prodId: product.id, qty: amt }]
    })
    setLoosePick(null)
    setSearchQ("")
    setBarcodeResult(null)
    showNotif(`✓ ${product.name}${isLoose(product) ? " · " + fmtQty(product, amt) : ""}`)
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  function setLooseQty(product, q) {
    if (q > stockOf(product) + 1e-9) {
      return showNotif(`${L("Only")} ${fmtQty(product, stockOf(product))} ${L("in stock")}: ${product.name}`)
    }
    setRows(prev => prev.map(r => r.prodId === product.id ? { ...r, qty: q } : r))
    setLoosePick(null); setLooseChange(false)
  }

  function removeOne(product) {
    setRows(prev => prev.flatMap(r => r.prodId !== product.id ? [r] : isLoose(product) ? (looseLess(product, r.qty) ? [{ ...r, qty: looseLess(product, r.qty) }] : [])
      : r.qty > 1 ? [{ ...r, qty: r.qty - 1 }] : []))
  }

  // Easy billing: save straight away as a cash bill — no review screen
  async function finishEasyBill() {
    const items = rows.map(r => {
      const p = getProduct(r.prodId)
      return p && +r.qty > 0 ? { product_id: p.id, name: lineName(p, r.qty), qty: +r.qty, unit_price: p.mrp, gst_percent: p.gst_percent || 0 } : null
    }).filter(Boolean)
    if (!items.length) return showNotif(L("Tap a picture to add"))
    setEasyDone({ total: grandTotal })   // shown once the invoice exists; cleared again on failure below
    await handleReviewConfirm(items)
  }

  function holdBill() {
    if (!rows.length) { showNotif("Nothing to hold"); return }
    const held = [
      { id: Date.now(), rows, cust: cust || "Walk-in", phone, pay, heldAt: Date.now() },
      ...heldBills,
    ].slice(0, 10)
    setHeldBills(held)
    localStorage.setItem("dk_held_bills", JSON.stringify(held))
    clearBill()
    showNotif("Bill held — tap Held to resume")
  }

  function resumeBill(held) {
    setRows(held.rows)
    setCust(held.cust === "Walk-in" ? "" : held.cust)
    setPhone(held.phone || "")
    setPay(held.pay || "Cash")
    const remaining = heldBills.filter(b => b.id !== held.id)
    setHeldBills(remaining)
    localStorage.setItem("dk_held_bills", JSON.stringify(remaining))
    setShowHeld(false)
  }

  useEffect(() => {
    if (easyDone && invoice) { speakTotal(easyDone.total); buzz() }
  }, [easyDone, invoice])

  // Listen for held-bills trigger from the nav tab
  useEffect(() => {
    const h = () => setShowHeld(true)
    window.addEventListener("dk:show-held", h)
    return () => window.removeEventListener("dk:show-held", h)
  }, [])

  function openPay() {
    const valid = rows.filter(r => getProduct(r.prodId) && +r.qty > 0)
    if (!valid.length) return showNotif("Add at least one item")
    if (!cust.trim()) setCust("Walk-in")
    setShowReview(true)
  }

  // ── JSX ───────────────────────────────────────────────────
  const INR = n => "₹" + Math.round(n || 0).toLocaleString("en-IN")

  // ── Day session gate ─────────────────────────────────────
  if (dayStatus === undefined) return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:13, color:"var(--ink-faint)" }}>Checking day status…</div>
  )
  async function openDayHere() {
    setOpeningDay(true)
    try {
      const s = dayStatus === "closed"
        ? await api.post("/day-sessions/reopen")
        : await api.post("/day-sessions/open", {})
      setDayStatus(s?.status === "closed" ? "closed" : "open")
    } catch (e) {
      showNotif("Could not open the day: " + e.message)
    } finally {
      setOpeningDay(false)
    }
  }

  if (dayStatus !== "open") return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:32, textAlign:"center", gap:14, background:"var(--bg0)" }}>
      <div style={{ fontSize:48 }}>{dayStatus === "closed" ? "🌙" : "☀️"}</div>
      <div style={{ fontSize:20, fontWeight:800, color:"var(--ink)" }}>
        {L(dayStatus === "closed" ? "Shop is closed for today" : "Good morning! Open the shop")}
      </div>
      <div style={{ fontSize:14, color:"var(--ink-dim)", maxWidth:300, lineHeight:1.6 }}>
        {dayStatus === "closed"
          ? L("You closed today's accounts. Reopen to make more bills today.")
          : L("Tap below to start today's sales. Your stock is noted for the day's report.")}
      </div>
      <button onClick={openDayHere} disabled={openingDay}
        style={{ padding:"16px 32px", borderRadius:14, border:"none", minWidth:240,
          background:"linear-gradient(135deg,#e87722,#d45f00)", color:"#fff",
          fontSize:16, fontWeight:800, cursor:"pointer", opacity: openingDay ? 0.7 : 1,
          boxShadow:"0 4px 16px rgba(232,119,34,0.35)", marginTop:6 }}>
        {L(openingDay ? "Opening…" : dayStatus === "closed" ? "Reopen & start billing" : "Open shop & start billing")}
      </button>
      {notif && <div style={{ fontSize:13, color:"var(--ember)" }}>{notif}</div>}
    </div>
  )

  // ════ EASY BILLING ═══════════════════════════════════════
  // "See bill" after an Easy bill falls through to the full screen, which has the bill sheet (WhatsApp / Print)
  if (billMode === "easy" && !(invoice && !easyDone)) {
    const count = itemCount
    const cats = ["Frequent", ...Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort()]
    const q = easyQ.trim().toLowerCase()
    const shown = products.filter(p => p.is_active !== false
      && (catFilter === "Frequent" || p.category === catFilter)
      && (!q || p.name.toLowerCase().includes(q))).slice(0, 400)
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"var(--bg0)" }}>
        {notif && (
          <div style={{ position:"fixed", bottom:180, left:"50%", transform:"translateX(-50%)", zIndex:300,
            background: notif.startsWith("✓") || notif.startsWith("🎤") ? "var(--jade)" : "#b45309",
            color:"#fff", padding:"12px 20px", borderRadius:999, fontSize:16, fontWeight:800, maxWidth:"92vw", pointerEvents:"none" }}>
            {notif}
          </div>
        )}
        {scanner && <BarcodeScanner onDetected={handleCameraBarcode} onClose={() => setScanner(false)} />}
        {loosePick && (
          <LoosePicker product={loosePick} inBill={qtyInBill(loosePick.id)} change={looseChange} L={L}
            onPick={q => { looseChange ? setLooseQty(loosePick, q) : addToCart(loosePick, q); buzz() }}
            onClose={() => { setLoosePick(null); setLooseChange(false) }} />
        )}


        {/* Saved → big tick, total, next customer */}
        {invoice && easyDone && (
          <div style={{ position:"fixed", inset:0, zIndex:400, background:"var(--bg0)", display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:18, padding:24, textAlign:"center" }}>
            <div style={{ width:120, height:120, borderRadius:"50%", background:"var(--jade)", color:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:64 }}>✓</div>
            <div style={{ fontSize:20, fontWeight:800, color:"var(--ink-dim)" }}>{L("Bill saved")}</div>
            <div style={{ fontSize:56, fontWeight:900, color:"var(--ink)", lineHeight:1 }}>₹{Math.round(easyDone.total)}</div>
            <button onClick={() => { setEasyDone(null); clearBill() }}
              style={{ width:"100%", maxWidth:360, height:72, borderRadius:20, border:"none", fontSize:22, fontWeight:900,
                color:"#fff", background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))", marginTop:8 }}>
              {L("Next customer")} →
            </button>
            <button onClick={() => setEasyDone(null)}
              style={{ background:"none", border:"none", color:"var(--ink-dim)", fontSize:16, fontWeight:700, textDecoration:"underline" }}>
              {L("See bill")} · WhatsApp · {L("Print")}
            </button>
          </div>
        )}

        {/* Top: speak + scan, and the switch back */}
        <div style={{ padding:"10px 12px 6px", display:"flex", gap:10, flexShrink:0 }}>
          <button onClick={voiceActive ? undefined : startVoiceSearch}
            style={{ flex:1, height:64, borderRadius:18, fontSize:20, fontWeight:900, cursor:"pointer",
              border: voiceActive ? "3px solid #dc2626" : "2px solid var(--rule)",
              background: voiceActive ? "#fee2e2" : "var(--bg2)", color: voiceActive ? "#b91c1c" : "var(--ink)" }}>
            🎤 {voiceActive ? "…" : L("Speak")}
          </button>
          <button onClick={() => setScanner(true)}
            style={{ flex:1, height:64, borderRadius:18, border:"none", fontSize:20, fontWeight:900, cursor:"pointer",
              color:"#fff", background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))" }}>
            📷 {L("Scan")}
          </button>
        </div>
        <div style={{ padding:"0 14px 6px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <span style={{ fontSize:13, color:"var(--ink-faint)", fontWeight:700 }}>{L("Tap a picture to add")}</span>
          <button onClick={() => switchBillMode("default")}
            style={{ background:"none", border:"none", color:"var(--saffron)", fontSize:13, fontWeight:800, cursor:"pointer" }}>
            {L("Full mode")} ⇄
          </button>
        </div>

        {/* Find: type a name, or pick a category */}
        <div style={{ padding:"0 12px 8px", flexShrink:0 }}>
          <div style={{ position:"relative", marginBottom:8 }}>
            <input value={easyQ} onChange={e => setEasyQ(e.target.value)} placeholder={"🔍 " + L("Search item…")}
              className="input" style={{ width:"100%", fontSize:18, padding:"12px 48px 12px 14px", borderRadius:14 }} />
            {easyQ && (
              <button onClick={() => setEasyQ("")} aria-label="Clear search"
                style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", width:40, height:40,
                  borderRadius:10, border:"none", background:"var(--bg2)", fontSize:18, color:"var(--ink-dim)" }}>✕</button>
            )}
          </div>
          <div style={{ display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none" }}>
            {cats.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                style={{ padding:"10px 16px", borderRadius:22, border:"none", cursor:"pointer", flexShrink:0,
                  fontSize:15, fontWeight:800,
                  background: catFilter === c ? "var(--saffron)" : "var(--bg2)",
                  color:      catFilter === c ? "#fff" : "var(--ink-dim)" }}>
                {c === "Frequent" ? "⭐ " + L("All") : L(c)}
              </button>
            ))}
          </div>
        </div>

        {/* Pictures */}
        <div style={{ flex:1, overflowY:"auto", padding:"4px 12px 16px" }}>
          {shown.length === 0 ? (
            <div style={{ textAlign:"center", padding:32, color:"var(--ink-faint)", fontSize:16 }}>{L("Nothing matches.")}</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(104px,1fr))", gap:10 }}>
              {shown.map(p => {
                const inCart = rows.find(r => r.prodId === p.id)
                const out = stockOf(p) <= 0
                return (
                  <div key={p.id} style={{ position:"relative" }}>
                    <button onClick={() => { if (!out) { addToCart(p); buzz() } }}
                      style={{ width:"100%", aspectRatio:"1 / 1.12", borderRadius:18, cursor: out ? "default" : "pointer",
                        border: inCart ? "3px solid var(--saffron)" : "1.5px solid var(--rule)",
                        background: inCart ? "var(--saffron-bg)" : "var(--bg2)", opacity: out ? 0.4 : 1,
                        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, padding:6 }}>
                      <ProductPic p={p} />
                      <span style={{ fontSize:12, fontWeight:700, color:"var(--ink)", lineHeight:1.15, textAlign:"center",
                        overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{p.name}</span>
                      <span style={{ fontSize:17, fontWeight:900, color:"var(--brass-deep)" }}>₹{p.mrp}{perUnit(p)}</span>
                    </button>
                    {inCart && (
                      <>
                        <div style={{ position:"absolute", top:-6, right:-6, minWidth:34, height:34, padding:"0 8px", borderRadius:17,
                          background:"var(--saffron)", color:"#fff", fontSize:18, fontWeight:900, pointerEvents:"none",
                          display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(0,0,0,0.2)" }}>
                          {fmtQty(p, inCart.qty)}
                        </div>
                        <button onClick={() => { removeOne(p); buzz() }} aria-label={"Remove one " + p.name}
                          style={{ position:"absolute", top:-6, left:-6, width:34, height:34, borderRadius:17, border:"2px solid #fff",
                            background:"#dc2626", color:"#fff", fontSize:22, fontWeight:900, lineHeight:1,
                            boxShadow:"0 2px 6px rgba(0,0,0,0.2)" }}>−</button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Total + PAID */}
        <div style={{ flexShrink:0, background:"var(--bg2)", borderTop:"1px solid var(--rule)", padding:"10px 12px",
          display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, color:"var(--ink-dim)", fontWeight:800 }}>{count} {L("items")}</div>
            <div style={{ fontSize:32, fontWeight:900, color:"var(--ink)", lineHeight:1.05 }}>₹{grandTotal}</div>
          </div>
          {count > 0 && (
            <button onClick={clearBill} aria-label={L("Clear")}
              style={{ width:58, height:72, borderRadius:16, border:"1.5px solid rgba(192,57,43,0.3)", background:"var(--ember-bg)",
                color:"var(--ember)", fontSize:24, fontWeight:900 }}>✕</button>
          )}
          <button onClick={finishEasyBill} disabled={saving || count === 0}
            style={{ flex:1.4, height:72, borderRadius:18, border:"none", fontSize:24, fontWeight:900, color:"#fff",
              background: count ? "linear-gradient(135deg,#16a34a,#15803d)" : "var(--rule)", opacity: saving ? 0.7 : 1,
              boxShadow: count ? "0 8px 20px rgba(22,163,74,0.35)" : "none" }}>
            {saving ? "…" : "✅ " + L("PAID")}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"var(--bg0)", position:"relative" }}>

      {/* ── Toast notification ───────────────────── */}
      {notif && (
        <div style={{ position:"fixed", bottom: rows.length ? 170 : 96, left:"50%", transform:"translateX(-50%)",
          // Green for "added", amber for warnings (stock limit, errors)
          zIndex:300, background: notif.startsWith("✓") || notif.startsWith("🎤") ? "var(--jade)" : "#b45309",
          color:"#fff", maxWidth:"90vw", overflow:"hidden", textOverflow:"ellipsis",
          padding:"10px 18px", borderRadius:999, fontSize:14, fontWeight:700,
          whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.2)", pointerEvents:"none" }}>
          {notif}
        </div>
      )}

      {scanner && (
        <BarcodeScanner onDetected={handleCameraBarcode} onClose={() => setScanner(false)} />
      )}
      {loosePick && (
          <LoosePicker product={loosePick} inBill={qtyInBill(loosePick.id)} change={looseChange} L={L}
            onPick={q => { looseChange ? setLooseQty(loosePick, q) : addToCart(loosePick, q); buzz() }}
            onClose={() => { setLoosePick(null); setLooseChange(false) }} />
        )}


      {showReview && (
        <ReviewModal rows={rows} products={products} applyGst={applyGst}
          onConfirm={handleReviewConfirm} onClose={() => setShowReview(false)} />
      )}

      {/* ── Held-bills bottom sheet ───────────────── */}
      {showHeld && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end" }}
          onClick={() => setShowHeld(false)}>
          <div style={{ width:"100%", background:"var(--bg1)", borderRadius:"20px 20px 0 0",
            padding:"20px 16px 32px", maxHeight:"70vh", overflowY:"auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:800, color:"var(--ink)" }}>
                Held Bills {heldBills.length > 0 && `(${heldBills.length})`}
              </div>
              <button onClick={() => setShowHeld(false)}
                style={{ background:"none", border:"none", color:"var(--ink-faint)", fontSize:20, cursor:"pointer" }}>✕</button>
            </div>
            {heldBills.length === 0 ? (
              <div style={{ textAlign:"center", padding:"28px 0", color:"var(--ink-faint)", fontSize:13 }}>
                No held bills
              </div>
            ) : heldBills.map(b => {
              const t = b.rows.reduce((s, r) => {
                const p = products.find(x => x.id === r.prodId)
                return s + (p ? p.mrp * r.qty : 0)
              }, 0)
              return (
                <button key={b.id} onClick={() => resumeBill(b)}
                  style={{ width:"100%", background:"var(--bg2)", border:"1px solid var(--rule)",
                    borderRadius:14, padding:"14px", marginBottom:10, textAlign:"left",
                    display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:"var(--saffron-bg)",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🛒</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>
                      {b.cust || "Walk-in"} · {b.rows.reduce((s,r)=>s+r.qty,0)} items
                    </div>
                    <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", marginTop:2 }}>
                      {INR(t)} · {new Date(b.heldAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:"var(--saffron)", fontWeight:700 }}>Resume →</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Invoice bottom-sheet (after generation) ── */}
      {invoice && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.55)",
          display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          {/* Bottom sheet — fixed height, 3-section flex column */}
          <div style={{
            width:"100%", maxWidth:520,
            height:"92dvh",           /* fixed height — no overflow surprises */
            background:"var(--bg1)",
            borderRadius:"20px 20px 0 0",
            display:"flex", flexDirection:"column",
            boxShadow:"0 -8px 40px rgba(0,0,0,0.25)",
          }}>

            {/* ① Header — fixed, never scrolls */}
            <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--rule)",
              display:"flex", justifyContent:"space-between", alignItems:"center",
              flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:18 }}>✅</span>
                <div style={{ fontSize:15, fontWeight:800, color:"var(--jade)" }}>Invoice Generated</div>
              </div>
              <button onClick={clearBill}
                style={{ width:32, height:32, borderRadius:8, background:"var(--bg2)",
                  border:"1px solid var(--rule)", color:"var(--ink-faint)",
                  fontSize:16, cursor:"pointer", display:"flex",
                  alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>

            {/* ② Invoice content — scrollable, flex:1 */}
            <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 8px",
              WebkitOverflowScrolling:"touch" }}>
              <InvoiceView invoice={invoice} customerPhone={phone} />
            </div>

            {/* ③ Action buttons — fixed at bottom, never hidden */}
            <div style={{ flexShrink:0, padding:"12px 16px",
              borderTop:"1px solid var(--rule)", background:"var(--bg1)",
              paddingBottom:"max(16px, env(safe-area-inset-bottom))",
              display:"flex", flexDirection:"column", gap:10 }}>

              {/* UPI QR already shown inside <InvoiceView> above — don't duplicate it here */}

              <div>
                <label style={{ display:"block", fontSize:MIN_FONT_SIZE, fontWeight:700,
                  color:"var(--ink-faint)", marginBottom:4 }}>
                  Customer WhatsApp Number
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="10-digit mobile number" inputMode="numeric" maxLength={10}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10,
                    border:"1.5px solid var(--rule)", fontSize:14, background:"var(--bg2)",
                    color:"var(--ink)", outline:"none", boxSizing:"border-box" }} />
              </div>

              <button onClick={sendWhatsApp}
                style={{ width:"100%", padding:"14px", borderRadius:13, border:"none",
                  background:"#25D366", color:"#fff", fontSize:15, fontWeight:800,
                  cursor:"pointer", display:"flex", alignItems:"center",
                  justifyContent:"center", gap:8 }}>
                📱 Send on WhatsApp
              </button>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <button onClick={() => window.print()}
                  style={{ padding:"12px", borderRadius:12,
                    border:"1px solid var(--rule)", background:"transparent",
                    color:"var(--ink)", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  🖨 Print
                </button>
                <button onClick={clearBill}
                  style={{ padding:"12px", borderRadius:12,
                    border:"1px solid var(--rule)", background:"var(--bg2)",
                    color:"var(--ink-dim)", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  + New Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP ROW: held bills · hold · clear ────── */}
      <div style={{ padding:"8px 14px", background:"var(--bg0)",
        display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        <div style={{ flex:1, fontSize:17, color:"var(--ink)", fontWeight:800 }}>{L("New bill")}</div>
        <button onClick={() => switchBillMode("easy")}
          style={{ background:"var(--jade-bg, #e7f6ee)", border:"1px solid rgba(26,122,74,0.3)", color:"var(--jade)",
            borderRadius:10, padding:"8px 12px", fontSize:13, fontWeight:800, cursor:"pointer" }}>
          ⚡ {L("Easy")}
        </button>
        {heldBills.length > 0 && (
          <button onClick={() => setShowHeld(true)}
            style={{ background:"var(--saffron-bg)", border:"1px solid rgba(232,119,34,0.35)", color:"var(--saffron)",
              borderRadius:10, padding:"8px 12px", fontSize:13, fontWeight:800, cursor:"pointer" }}>
            ⏸ {L("Held")} ({heldBills.length})
          </button>
        )}
        {rows.length > 0 && (
          <>
            <button onClick={holdBill}
              style={{ background:"var(--bg2)", border:"1px solid var(--rule)", color:"var(--ink)",
                borderRadius:10, padding:"8px 12px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {L("Hold")}
            </button>
            <button onClick={clearBill}
              style={{ background:"var(--ember-bg)", border:"1px solid rgba(192,57,43,0.25)",
                color:"var(--ember)", borderRadius:10, padding:"8px 12px",
                fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {L("Clear")}
            </button>
          </>
        )}
      </div>

      {/* ── SEARCH + SCAN ────────────────────────── */}
      <style>{`@keyframes micPulse{0%,100%{box-shadow:0 0 0 4px rgba(220,38,38,.25)}50%{box-shadow:0 0 0 8px rgba(220,38,38,.08)}}`}</style>
      <div style={{ padding:"2px 14px 8px", background:"var(--bg0)", flexShrink:0, position:"relative", zIndex:50 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {/* Search input */}
          <div style={{
            flex:1, minWidth:0, background:"var(--bg2)",
            border:`2px solid ${searchQ ? "var(--saffron)" : "var(--rule)"}`,
            boxShadow: searchQ ? "0 4px 14px rgba(232,119,34,0.18)" : "none",
            borderRadius:14, padding:"12px 14px", display:"flex", alignItems:"center", gap:10,
            transition:"all 0.15s",
          }}>
            <span style={{ fontSize:18, color: searchQ ? "var(--saffron)" : "var(--ink-faint)", flexShrink:0 }}>🔍</span>
            <input
              ref={searchRef}
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); setBarcodeResult(null) }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  if (searchResults.length === 1) { addToCart(searchResults[0]); return }
                  if (searchResults.length === 0 && searchQ.trim()) {
                    lookupBarcode(searchQ.trim())
                    setSearchQ("")
                  }
                }
                if (e.key === "Escape") setSearchQ("")
              }}
              placeholder={L("Search item…")}
              style={{ background:"transparent", border:"none", color:"var(--ink)", fontSize:14,
                outline:"none", flex:1, fontWeight:600, minWidth:0 }}
              autoFocus
            />
            {searchQ && (
              <button onClick={() => { setSearchQ(""); setBarcodeResult(null) }}
                style={{ background:"none", border:"none", color:"var(--ink-faint)", fontSize:16, cursor:"pointer", padding:0, flexShrink:0 }}>
                ✕
              </button>
            )}
          </div>

          {/* 🎤 Voice */}
          <button onClick={voiceActive ? undefined : startVoiceSearch}
            title={voiceActive ? "Listening…" : "Voice search"}
            style={{
              width:46, height:46, borderRadius:13, flexShrink:0, cursor: voiceActive ? "default" : "pointer",
              background: voiceActive ? "linear-gradient(135deg,#dc2626,#b91c1c)" : "var(--bg2)",
              border: voiceActive ? "2px solid #dc2626" : "1.5px solid var(--rule)",
              color: voiceActive ? "#fff" : "var(--ink-faint)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:19,
              boxShadow: voiceActive ? "0 0 0 4px rgba(220,38,38,.25)" : "none",
              animation: voiceActive ? "micPulse 1s infinite" : "none",
              transition:"all 0.2s",
            }}>
            🎤
          </button>

          {/* 📷 Barcode scan */}
          <button onClick={() => setScanner(true)} title="Scan barcode"
            style={{ width:46, height:46, borderRadius:13, border:"none", cursor:"pointer", flexShrink:0,
              background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
              color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:20, boxShadow:"0 4px 14px rgba(232,119,34,0.35)" }}>
            📷
          </button>
        </div>

        {/* ── Search suggestions dropdown ─────────── */}
        {searchResults.length > 0 && (
          <div style={{ position:"absolute", left:14, right:14, top:"calc(100% - 4px)",
            background:"var(--bg1)", border:"1px solid var(--rule)",
            borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.18)", overflow:"hidden" }}>
            {searchResults.map((p, i) => (
              <button key={p.id} onClick={() => addToCart(p)}
                style={{ width:"100%", background:"none", border:"none",
                  borderBottom: i < searchResults.length-1 ? "1px solid var(--rule-soft,rgba(0,0,0,0.05))" : "none",
                  padding:"11px 16px", display:"flex", alignItems:"center", gap:12,
                  cursor:"pointer", textAlign:"left" }}
                onMouseEnter={e => e.currentTarget.style.background="var(--bg2)"}
                onMouseLeave={e => e.currentTarget.style.background="none"}>
                <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, fontSize:16,
                  background:"var(--bg2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {CAT_EMOJI[p.category] || "📦"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                  <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", marginTop:1 }}>
                    ₹{p.mrp} · {p.stock} {p.unit||"pcs"} in stock
                    {p.gst_percent > 0 && ` · GST ${p.gst_percent}%`}
                  </div>
                </div>
                <div style={{ fontSize:13, color:"var(--saffron)", fontWeight:800, flexShrink:0 }}>+ Add</div>
              </button>
            ))}
          </div>
        )}

        {/* ── Barcode result banner ─────────────────── */}
        {barcodeResult && (
          <div style={{ marginTop:8, padding:"12px 14px", borderRadius:12,
            background: barcodeResult.notFound ? "var(--ember-bg)" : "var(--jade-bg)",
            border: `1px solid ${barcodeResult.notFound ? "rgba(192,57,43,0.25)" : "rgba(26,122,74,0.25)"}` }}>
            {barcodeResult.notFound ? (
              <div>
                <div style={{ fontSize:12, color:"var(--ember)", fontWeight:700, marginBottom:6 }}>
                  Not found: "{barcodeResult.code}"
                </div>
                {barcodeResult.looking && <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)" }}>Looking up catalogs…</div>}
                {!barcodeResult.looking && barcodeResult.ext?.found && (
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ flex:1, fontSize:12, color:"var(--ink)" }}>
                      <strong>{barcodeResult.ext.name}</strong>
                      {barcodeResult.ext.mrp && ` · ₹${barcodeResult.ext.mrp}`}
                    </div>
                    <button onClick={() => quickAddToInventoryAndBill(barcodeResult.code, barcodeResult.ext)}
                      style={{ padding:"7px 14px", borderRadius:9, border:"none", background:"var(--jade)",
                        color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                      + Add to inventory
                    </button>
                  </div>
                )}
                {!barcodeResult.looking && !barcodeResult.ext?.found && !quickAdd && (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                    <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)" }}>Not in public catalogs.</div>
                    <button onClick={() => setQuickAdd({ code:barcodeResult.code, name:"", mrp:"", stock:"1", gst_percent:5, category:"Other" })}
                      style={{ padding:"7px 14px", borderRadius:9, border:"none", background:"var(--saffron)",
                        color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      + Quick Register
                    </button>
                  </div>
                )}
                {quickAdd && quickAdd.code === barcodeResult.code && (
                  <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:8 }}>
                    <input className="input" placeholder="Product name *" value={quickAdd.name} autoFocus
                      onChange={e => setQuickAdd(q => ({...q, name:e.target.value}))} />
                    <div style={{ display:"flex", gap:8 }}>
                      <input className="input" type="number" placeholder="MRP ₹" value={quickAdd.mrp}
                        onChange={e => setQuickAdd(q => ({...q, mrp:e.target.value}))} style={{ flex:1 }} />
                      <select className="input" value={quickAdd.gst_percent}
                        onChange={e => setQuickAdd(q => ({...q, gst_percent:Number(e.target.value)}))}>
                        {[0,5,12,18,28].map(g => <option key={g} value={g}>{g}% GST</option>)}
                      </select>
                    </div>
                    <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                      <button onClick={() => setQuickAdd(null)} className="btn btn-sm text-gray-500">Cancel</button>
                      <button disabled={!quickAdd.name.trim() || !quickAdd.mrp}
                        onClick={() => quickAddToInventoryAndBill(quickAdd.code, { name:quickAdd.name.trim(), category:quickAdd.category, mrp:quickAdd.mrp, stock:quickAdd.stock, gst_percent:quickAdd.gst_percent })}
                        className="btn btn-primary btn-sm">Save & Add to Bill</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--jade)" }}>{barcodeResult.name}</div>
                  <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", marginTop:2 }}>
                    ₹{barcodeResult.mrp} · Stock: {barcodeResult.stock} · GST {barcodeResult.gst_percent}%
                  </div>
                </div>
                <button onClick={() => addBarcodeProductToBill(barcodeResult)}
                  style={{ padding:"8px 16px", borderRadius:10, border:"none", background:"var(--jade)",
                    color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  + Add to bill
                </button>
                <button onClick={() => setBarcodeResult(null)}
                  style={{ background:"none", border:"none", color:"var(--ink-faint)", cursor:"pointer", fontSize:18 }}>✕</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CUSTOMER PILL ────────────────────────── */}
      <div style={{ padding:"0 14px 8px", background:"var(--bg0)", flexShrink:0 }}>
        {custExpanded ? (
          <div style={{ background:"var(--bg2)", border:"1px solid var(--rule)", borderRadius:12, padding:"12px 14px" }}>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <input value={cust} onChange={e => setCust(e.target.value)} placeholder="Customer name"
                style={{ flex:1, background:"var(--bg0)", border:"1px solid var(--rule)", borderRadius:9,
                  padding:"9px 12px", fontSize:13, color:"var(--ink)", outline:"none" }} />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone"
                style={{ width:130, background:"var(--bg0)", border:"1px solid var(--rule)", borderRadius:9,
                  padding:"9px 12px", fontSize:13, color:"var(--ink)", outline:"none" }} />
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={gstin} onChange={e => setGstin(e.target.value)} placeholder="GSTIN (optional)"
                style={{ flex:1, background:"var(--bg0)", border:"1px solid var(--rule)", borderRadius:9,
                  padding:"8px 12px", fontSize:12, color:"var(--ink)", outline:"none" }} />
              <select value={pay} onChange={e => setPay(e.target.value)}
                style={{ background:"var(--bg0)", border:"1px solid var(--rule)", borderRadius:9,
                  padding:"8px 10px", fontSize:12, color:"var(--ink)", outline:"none" }}>
                {["Cash","UPI","Credit","Cheque"].map(m => <option key={m}>{m}</option>)}
              </select>
              <button onClick={() => setCustExpanded(false)}
                style={{ background:"none", border:"none", color:"var(--saffron)", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                Done ✓
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background:"var(--bg2)", border:"1px solid var(--rule)", borderRadius:10,
            padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
              background:"linear-gradient(135deg,var(--brass),var(--saffron))",
              color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:800, fontSize:13 }}>
              {cust ? cust.charAt(0).toUpperCase() : "W"}
            </div>
            <div style={{ flex:1, fontSize:13, color: cust ? "var(--ink)" : "var(--ink-faint)", fontWeight:600 }}>
              {cust || L("Walk-in customer")}
              {phone && <span style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", marginLeft:8 }}>{phone}</span>}
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", background:"var(--bg0)",
                padding:"3px 8px", borderRadius:6, border:"1px solid var(--rule)", fontWeight:600 }}>{L(pay)}</span>
              <button onClick={() => setCustExpanded(true)}
                style={{ background:"transparent", color:"var(--saffron)", border:"none",
                  fontSize:13, fontWeight:800, cursor:"pointer" }}>
                {L(cust ? "Edit" : "+ Add")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── BILL SHEET (tap the bottom bar) ──────── */}
      {showCart && rows.length > 0 && !invoice && (
        <div onClick={() => setShowCart(false)}
          style={{ position:"fixed", inset:0, zIndex:150, background:"rgba(0,0,0,0.4)",
            display:"flex", alignItems:"flex-end" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:"100%", maxHeight:"72dvh", overflowY:"auto", background:"var(--bg1)",
              borderRadius:"20px 20px 0 0", padding:"14px 14px 168px", boxShadow:"0 -8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ fontSize:17, fontWeight:800, color:"var(--ink)" }}>
                {L("Bill")} · {itemCount} {L("items")}
              </div>
              <button onClick={() => setShowCart(false)} aria-label="Close"
                style={{ width:40, height:40, borderRadius:10, background:"var(--bg2)", border:"1px solid var(--rule)",
                  color:"var(--ink-dim)", fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            {rows.map((row, i) => {
              const p = getProduct(row.prodId)
              if (!p) return null
              const rowTotal = Math.round(p.mrp * row.qty * (1 + (applyGst ? p.gst_percent : 0) / 100) * 100) / 100
              return (
                <div key={i} style={{ background:"var(--bg2)", borderRadius:14, padding:"12px 14px",
                  marginBottom:8, border:"1px solid var(--rule)",
                  display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:"var(--ink)", lineHeight:1.25,
                      overflow:"hidden", textOverflow:"ellipsis",
                      display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{p.name}</div>
                    <div style={{ fontSize:MIN_FONT_SIZE, color:"var(--ink-faint)", marginTop:2, fontWeight:600 }}>
                      {rateLabel(p)}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:4,
                    background:"var(--bg0)", border:"1px solid var(--rule)", borderRadius:10, padding:3 }}>
{(() => {
                    const loose = isLoose(p)
                    const last = loose ? !looseLess(p, row.qty) : row.qty <= 1
                    return (<>
                    <button onClick={() => last ? delRow(i) : setRow(i, "qty", loose ? looseLess(p, row.qty) : row.qty - 1)}
                      aria-label={last ? "Remove" : "Less"}
                      style={{ width:40, height:40, borderRadius:9, background:"var(--bg2)",
                        color: last ? "var(--ember)" : "var(--brass-deep)",
                        border:"none", fontSize: last ? 13 : 18, fontWeight:800, cursor:"pointer" }}>
                      {last ? "🗑" : "−"}
                    </button>
                    {loose ? (
                      <button onClick={() => { setLooseChange(true); setLoosePick(p) }} aria-label="Change weight"
                        style={{ minWidth:22, padding:"0 4px", fontSize:15, fontWeight:800, color:"var(--ink)", whiteSpace:"nowrap",
                          background:"none", border:"none", borderBottom:"2px dashed var(--saffron)", cursor:"pointer" }}>
                        {fmtQty(p, row.qty)}
                      </button>
                    ) : (
                      <span style={{ minWidth:22, textAlign:"center", fontSize:15, fontWeight:800, color:"var(--ink)", whiteSpace:"nowrap" }}>
                        {fmtQty(p, row.qty)}
                      </span>
                    )}
                    </>)
                  })()}
                    <button onClick={() => isLoose(p) ? setLoosePick(p) : canAddOne(p) && setRow(i, "qty", row.qty + 1)} aria-label="More"
                      style={{ width:40, height:40, borderRadius:9, background:"var(--saffron)",
                        color:"#fff", border:"none", fontSize:18, fontWeight:800, cursor:"pointer" }}>
                      +
                    </button>
                  </div>
                  <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:15,
                    color:"var(--brass-deep)", fontWeight:800, minWidth:54, textAlign:"right" }}>
                    {INR(rowTotal)}
                  </div>
                </div>
              )
            })}

            <label style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 4px 0",
              fontSize:14, color:"var(--ink-dim)", cursor:"pointer" }}>
              <input type="checkbox" checked={applyGst} onChange={e => setApplyGst(e.target.checked)}
                style={{ width:20, height:20, accentColor:"var(--saffron)" }} />
              {L("Add GST to this bill")}
            </label>
          </div>
        </div>
      )}

      {/* ── PRODUCT BROWSER ─────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", background:"var(--bg1)" }}>

        {/* ── PRODUCT BROWSER ─────────────────────── */}
        {(() => {
          const cats = ["Frequent", ...Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort()]
          const shown = catFilter === "Frequent"
            ? products.slice(0, 400)
            : products.filter(p => p.category === catFilter).slice(0, 120)

          return (
            <div style={{ padding:"4px 14px 24px" }}>

              {/* Category filter pills */}
              <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8,
                scrollbarWidth:"none", marginBottom:2 }}>
                {cats.map(c => (
                  <button key={c} onClick={() => setCatFilter(c)}
                    style={{ padding:"8px 14px", borderRadius:20, border:"none", cursor:"pointer",
                      flexShrink:0, fontSize:13, fontWeight:700, transition:"all 0.12s",
                      background: catFilter === c ? "var(--saffron)" : "var(--bg2)",
                      color:      catFilter === c ? "#fff"          : "var(--ink-dim)",
                      boxShadow:  catFilter === c ? "0 3px 10px rgba(232,119,34,0.3)" : "none" }}>
                    {c === "Frequent" ? "⭐ " + L("All") : L(c)}
                  </button>
                ))}
              </div>

              {/* Product grid */}
              {shown.length === 0 ? (
                <div style={{ textAlign:"center", padding:"32px 0", color:"var(--ink-faint)", fontSize:12 }}>
                  No products in this category
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:8, paddingTop:4 }}>
                  {shown.map(p => {
                    const inCart = rows.find(r => r.prodId === p.id)
                    const outOfStock = p.stock <= 0
                    const leftAfterBill = Math.max(0, stockOf(p) - (inCart?.qty || 0))
                    return (
                      <button key={p.id}
                        onClick={() => !outOfStock && addToCart(p)}
                        style={{
                          background: inCart ? "var(--saffron-bg)" : "var(--bg2)", borderRadius:12, padding:"10px 10px",
                          border: inCart ? "2px solid var(--saffron)" : "1px solid var(--rule)",
                          cursor: outOfStock ? "default" : "pointer",
                          opacity: outOfStock ? 0.45 : 1, minHeight:72,
                          display:"flex", flexDirection:"column", justifyContent:"space-between",
                          gap:4, textAlign:"left", position:"relative",
                        }}>
                        {inCart && (
                          <div style={{ position:"absolute", top:6, right:6,
                            minWidth:24, height:24, padding:"0 7px", borderRadius:12,
                            background:"var(--saffron)", color:"#fff", fontSize:13, fontWeight:800,
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                            {fmtQty(p, inCart.qty)}
                          </div>
                        )}
                        <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", lineHeight:1.25,
                          paddingRight: inCart ? 26 : 0, overflow:"hidden", textOverflow:"ellipsis",
                          display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                          {p.name}
                        </div>
                        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:6 }}>
                          <span style={{ fontSize:16, color:"var(--brass-deep)", fontWeight:800 }}>₹{p.mrp}{perUnit(p)}</span>
                          <span style={{ fontSize:12, fontWeight:700,
                            color: outOfStock || leftAfterBill === 0 ? "var(--ember)" : leftAfterBill <= (p.min_stock || 0) ? "#b45309" : "var(--ink-faint)" }}>
                            {outOfStock ? L("Out of stock") : fmtQty(p, round6(leftAfterBill)) + " " + L("left")}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* ── BOTTOM BAR: items + total → bill sheet · Pay ── */}
      {rows.length > 0 && !invoice && !showReview && (
        <div style={{ position:"relative", zIndex:160, background:"var(--bg2)",
          borderTop:"1px solid var(--rule)", boxShadow:"0 -6px 20px rgba(26,12,4,0.08)",
          padding:"10px 14px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <button onClick={() => setShowCart(c => !c)}
            style={{ flex:1, minWidth:0, background:"var(--bg0)", border:"1px solid var(--rule)", borderRadius:14,
              padding:"8px 12px", cursor:"pointer", textAlign:"left" }}>
            <div style={{ fontSize:12, color:"var(--ink-dim)", fontWeight:700 }}>
              {itemCount} {L("items")} · {showCart ? L("hide bill") + " ▼" : L("see bill") + " ▲"}
            </div>
            <div style={{ fontSize:22, color:"var(--ink)", fontWeight:900, lineHeight:1.15 }}>
              ₹{grandTotal}
              {applyGst && <span style={{ fontSize:11, color:"var(--ink-faint)", fontWeight:600, marginLeft:6 }}>{L("incl. GST")}</span>}
            </div>
          </button>
          <button onClick={() => { setShowCart(false); openPay() }} disabled={saving}
            style={{ flexShrink:0, background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
              color:"#fff", border:"none", borderRadius:14, padding:"0 22px", height:58,
              fontSize:18, fontWeight:900, boxShadow:"0 8px 20px rgba(232,119,34,0.4)", cursor:"pointer",
              opacity: saving ? 0.7 : 1 }}>
            {saving ? "…" : L("Pay →")}
          </button>
        </div>
      )}
    </div>
  )
}
