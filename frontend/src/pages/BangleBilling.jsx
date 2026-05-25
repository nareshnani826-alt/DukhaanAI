import { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { BangleProducts, BangleSales, BangleSync } from "../sync/bangleDb"
import { useLang, LangToggle } from "../hooks/useLang"
import { VOICE_LANGS } from "../voice/useProductVoice.js"
import { getSavedLang } from "../voice/i18n.js"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"

const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const UNITS = [
  { id: "piece", label: "Piece", pcs: 1  },
  { id: "dozen", label: "Dozen", pcs: 12 },
  { id: "set",   label: "Set",   pcs: 6  },
]
const COLOURS = [
  // Reds & Pinks
  "Red","Dark Red","Crimson","Hot Pink","Pink","Baby Pink","Rose Pink","Magenta",
  // Maroons & Browns
  "Maroon","Burgundy","Wine","Brown","Chocolate","Beige","Cream",
  // Greens
  "Green","Dark Green","Mehandi","Parrot Green","Light Green","Mint","Teal","Turquoise",
  // Blues
  "Blue","Navy","Sky Blue","Royal Blue","Cobalt Blue","Ice Blue",
  // Purples
  "Purple","Lavender","Violet","Lilac","Indigo",
  // Yellows & Oranges
  "Yellow","Mustard","Saffron","Orange","Peach","Coral",
  // Metallics & Neutrals
  "Gold","Rose Gold","Silver","White","Off-White","Ivory","Black","Charcoal","Gunmetal",
  // Multicolour
  "Multi","Dual Tone","Ombre","Rainbow",
]

// ── Voice cart parser ─────────────────────────────────────────
function parseVoiceCart(text, products) {
  const lower = text.toLowerCase().trim()
  const hindiNums = { ek:1,एक:1, do:2,दो:2, teen:3,तीन:3, char:4,चार:4, paanch:5,पाँच:5, chhe:6,छह:6, saat:7,सात:7, aath:8,आठ:8, nau:9,नौ:9, das:10,दस:10 }
  let qty = 1
  const numM = lower.match(/\b(\d+)\b/)
  if (numM) qty = parseInt(numM[1])
  else { for (const [w, v] of Object.entries(hindiNums)) { if (lower.includes(w)) { qty = v; break } } }

  let unit = "piece"
  if (/dozen|dz|दर्जन/.test(lower)) unit = "dozen"
  else if (/\bset\b|सेट/.test(lower)) unit = "set"

  let colour = null
  for (const c of COLOURS) { if (lower.includes(c.toLowerCase())) { colour = c; break } }

  const sizeM = text.match(/\b2\.\d+\b/)
  const size = sizeM ? sizeM[0] : null

  // Score products by keyword match
  let best = null, bestScore = 0
  const qWords = lower.split(/[\s,]+/).filter(w => w.length > 2)
  for (const p of products) {
    const pWords = p.name.toLowerCase().split(/\s+/)
    let score = 0
    for (const pw of pWords) {
      if (pw.length > 2 && qWords.some(qw => qw.includes(pw) || pw.includes(qw))) score++
    }
    if (score > bestScore) { bestScore = score; best = p }
  }
  if (!best || bestScore === 0) return null

  const variants = best.variants || []
  const variant =
    variants.find(v => (!colour || v.colour === colour) && (!size || v.size === size)) ||
    variants.find(v => !colour || v.colour === colour) ||
    variants[0]
  if (!variant) return null
  return { product: best, variant, colour, size, qty, unit }
}

// ── Scan-to-Bill Modal ────────────────────────────────────────
const isMobileDevice = () => /android|iphone|ipad|ipod/i.test(navigator.userAgent) || window.innerWidth < 640

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.QR_CODE,
]

// Mirrors variantShortCode in BangleInventory — must stay in sync
function variantShortCode(variantId) {
  const hash = Math.abs(
    (variantId || "").split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0)
  ).toString().padStart(9, "0").slice(0, 9)
  return "200" + hash
}

function findVariantMatch(products, decoded) {
  if (!decoded) return null
  const q = decoded.trim()

  // 1. Exact barcode field match on the product
  for (const p of products) {
    if (p.barcode && p.barcode === q) {
      const variant = (p.variants || []).find(v => v.stock > 0) || (p.variants || [])[0]
      if (variant) return { product: p, variant }
    }
  }

  // 2. SKU match
  for (const p of products) {
    if (p.sku && (p.sku === q || p.sku.replace(/[-\s]/g, "") === q.replace(/[-\s]/g, ""))) {
      const variant = (p.variants || []).find(v => v.stock > 0) || (p.variants || [])[0]
      if (variant) return { product: p, variant }
    }
  }

  // 3. Variant ID match (for QR codes)
  for (const p of products) {
    for (const v of (p.variants || [])) {
      if (v.id === q) return { product: p, variant: v }
    }
  }

  // 4. Short code match — labels printed from the app encode variantShortCode(v.id)
  for (const p of products) {
    for (const v of (p.variants || [])) {
      if (variantShortCode(v.id) === q) return { product: p, variant: v }
    }
  }

  return null
}

// Camera scanner — stays running after each scan (no stop), uses debounce to avoid double-reads
function ScanCamera({ products, onScanned, feedback }) {
  const [err, setErr]   = useState("")
  const scannerRef      = useRef(null)
  const lastRef         = useRef({ id: "", ts: 0 })
  const elId            = "scan-bill-cam"

  useEffect(() => {
    let stopCamera = null;
    let running = true;
    async function startNativeScanner() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const video = document.createElement("video");
        video.setAttribute("playsinline", "true");
        video.srcObject = stream;
        await video.play();
        document.getElementById(elId).appendChild(video);
        const detector = new window.BarcodeDetector({ formats: ["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code"] });
        async function scanFrame() {
          if (!running) return;
          try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
              const decoded = barcodes[0].rawValue;
              const now = Date.now();
              if (decoded === lastRef.current.id && now - lastRef.current.ts < 500) return requestAnimationFrame(scanFrame);
              lastRef.current = { id: decoded, ts: now };
              const match = findVariantMatch(products, decoded);
              onScanned(decoded, match);
            }
          } catch {}
          requestAnimationFrame(scanFrame);
        }
        scanFrame();
        stopCamera = () => {
          running = false;
          video.pause();
          stream.getTracks().forEach(t => t.stop());
          if (video.parentNode) video.parentNode.removeChild(video);
        };
      } catch (e) {
        setErr("Camera or BarcodeDetector not available. Try a different browser or device.");
      }
    }
    if ("BarcodeDetector" in window) {
      startNativeScanner();
      return () => { if (stopCamera) stopCamera(); running = false; };
    } else {
      const qr = new Html5Qrcode(elId, { formatsToSupport: BARCODE_FORMATS, verbose: false });
      scannerRef.current = qr;
      qr.start(
        { facingMode: "environment" },
        { fps: 30, qrbox: { width: 260, height: 100 }, aspectRatio: 2.6 },
        (decoded) => {
          const now = Date.now();
          if (decoded === lastRef.current.id && now - lastRef.current.ts < 500) return;
          lastRef.current = { id: decoded, ts: now };
          const match = findVariantMatch(products, decoded);
          onScanned(decoded, match);
        },
        () => {}
      ).catch(e => setErr(e?.message || "Camera access denied — allow in browser settings"));
      return () => { qr.stop().catch(() => {}) };
    }
  }, [])

  return (
    <div style={{ position:"relative" }}>
      <div id={elId} style={{ width:"100%", background:"#000", maxHeight:200, overflow:"hidden" }} />
      {feedback && (
        <div style={{ position:"absolute", bottom:6, left:0, right:0, textAlign:"center",
          fontSize:12, fontWeight:700, color:"#fff",
          background: feedback.startsWith("✓") ? "rgba(29,158,117,0.88)" : "rgba(220,38,38,0.88)",
          padding:"4px 0", borderRadius:6, margin:"0 8px" }}>
          {feedback}
        </div>
      )}
      {err && <div style={{ padding:"6px 10px", fontSize:11, color:"#ff6b6b", textAlign:"center" }}>{err}</div>}
      {!err && !feedback && (
        <div style={{ position:"absolute", bottom:6, left:0, right:0, textAlign:"center",
          fontSize:10, color:"rgba(255,255,255,0.6)" }}>Hold steady — scanning…</div>
      )}
    </div>
  )
}

// Keyboard scanner — auto-clear + refocus after each scan
function ScanKeyboard({ products, onScanned, feedback }) {
  const [value, setValue] = useState("")
  const inputRef = useRef(null)
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  function handleEnter() {
    const id = value.trim()
    if (!id) return
    const match = findVariantMatch(products, id)
    onScanned(id, match)
    setValue("")
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div style={{ padding:"10px 14px", background:"#1a1a1a", display:"flex", flexDirection:"column",
      alignItems:"center", gap:8 }}>
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>
        ⌨️ Point your USB/Bluetooth scanner at a barcode label
      </div>
      <input ref={inputRef} value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleEnter()}
        placeholder="Waiting for scanner…"
        autoComplete="off"
        style={{ width:"100%", maxWidth:320, padding:"9px 14px", borderRadius:10,
          border:"1.5px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.08)",
          color:"#fff", fontSize:13, outline:"none", textAlign:"center" }}
      />
      {feedback && (
        <div style={{ fontSize:12, fontWeight:700,
          color: feedback.startsWith("✓") ? "#4ade80" : "#f87171" }}>
          {feedback}
        </div>
      )}
    </div>
  )
}

function ScanBillModal({ products, onBill, onAddToCart, onClose }) {
  const [mode,       setMode]       = useState(() => isMobileDevice() ? "camera" : "keyboard")
  const [scanItems,  setScanItems]  = useState([])
  const [customer,   setCustomer]   = useState({ name: "", phone: "" })
  const [payment,    setPayment]    = useState("cash")
  const [discountPct,setDiscountPct]= useState(0)
  const [loading,    setLoading]    = useState(false)
  const [err,        setErr]        = useState("")
  const [feedback,   setFeedback]   = useState("")

  function showFeedback(msg) {
    setFeedback(msg)
    setTimeout(() => setFeedback(""), 2000)
  }

  function handleScanned(decoded, match) {
    if (!match) { showFeedback("✗ No product for this barcode"); return }
    const { product, variant } = match
    const dozenMrp  = variant.mrp  ?? product.mrp  ?? 0
    const dozenCost = variant.cost_price ?? product.cost_price ?? 0
    const unitPrice = +(dozenMrp / 12).toFixed(2)

    setScanItems(prev => {
      const idx = prev.findIndex(i => i.variant_id === variant.id)
      if (idx >= 0) {
        const updated = [...prev]
        const it = updated[idx]
        updated[idx] = { ...it, unit_qty: it.unit_qty + 1, pieces: it.pieces + 1,
          amount: +(it.amount + unitPrice).toFixed(2) }
        return updated
      }
      return [...prev, {
        variant_id:   variant.id,
        product_id:   product.id,
        product_name: product.name,
        colour:       variant.colour,
        size:         variant.size,
        design:       variant.design,
        unit:         "piece",
        unit_qty:     1,
        unit_price:   unitPrice,
        pieces:       1,
        amount:       unitPrice,
        cost_price:   dozenCost,
        gst_percent:  product.gst_percent || 3,
        _id:          variant.id,
      }]
    })
    const label = [product.name, variant.colour, variant.size].filter(Boolean).join(" · ")
    showFeedback(`✓ ${label}`)
  }

  function changeQty(variantId, delta) {
    setScanItems(prev => prev
      .map(i => {
        if (i.variant_id !== variantId) return i
        const newQty = i.unit_qty + delta
        if (newQty <= 0) return null
        return { ...i, unit_qty: newQty, pieces: newQty,
          amount: +(newQty * i.unit_price).toFixed(2) }
      })
      .filter(Boolean)
    )
  }

  const subtotal     = scanItems.reduce((s, i) => s + i.amount, 0)
  const discountAmt  = +(subtotal * discountPct / 100).toFixed(2)
  const afterDiscount= +(subtotal - discountAmt).toFixed(2)
  const totalCost    = scanItems.reduce((s, i) => s + (i.pieces * (i.cost_price || 0) / 12), 0)
  const profit       = afterDiscount - totalCost
  const hasCost      = scanItems.some(i => i.cost_price > 0)
  const marginPct    = afterDiscount > 0 ? (profit / afterDiscount) * 100 : 0

  async function generateBill() {
    if (!scanItems.length) return
    setLoading(true); setErr("")
    try {
      const mult = 1 - discountPct / 100
      const sale = await BangleSales.create({
        customer_name:  customer.name || "Walk-in Customer",
        customer_phone: customer.phone || null,
        items: scanItems.map(({ cost_price, _id, ...rest }) => ({
          ...rest,
          unit_price: +(rest.unit_price * mult).toFixed(2),
          amount:     +(rest.amount     * mult).toFixed(2),
        })),
        payment_mode: payment,
        apply_gst:    false,
        notes:        discountPct > 0 ? `Discount: ${discountPct}%` : null,
      })
      onBill(sale)
      onClose()
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  function addToCartAndClose() {
    scanItems.forEach(({ _id, cost_price, ...rest }) =>
      onAddToCart({ ...rest, cost_price, _id: rest.variant_id + "-" + Date.now() })
    )
    onClose()
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:60, background:"var(--bg0)",
      display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ padding:"10px 14px", background:"var(--bg1)",
        borderBottom:"1px solid var(--rule)", display:"flex",
        alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)" }}>
            📦 Scan to Bill
          </div>
          <div style={{ fontSize:11, color:"var(--ink-faint)", marginTop:1 }}>
            {scanItems.length > 0
              ? `${scanItems.length} item${scanItems.length > 1 ? "s" : ""} · ${INR(subtotal)}`
              : "Scan barcodes to add items"}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* Camera / Keyboard toggle */}
          <div style={{ display:"flex", borderRadius:8, overflow:"hidden",
            border:"1px solid var(--rule)" }}>
            {[{ id:"camera", label:"📷" }, { id:"keyboard", label:"⌨️" }].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                style={{ padding:"5px 12px", border:"none", cursor:"pointer", fontSize:14,
                  background: mode === m.id ? "var(--saffron)" : "var(--bg2)",
                  color:      mode === m.id ? "#fff" : "var(--ink-dim)" }}>
                {m.label}
              </button>
            ))}
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", fontSize:22,
              cursor:"pointer", color:"var(--ink-faint)", lineHeight:1 }}>
            ×
          </button>
        </div>
      </div>

      {/* Scanner */}
      <div style={{ flexShrink:0, background:"#111" }}>
        {mode === "camera"
          ? <ScanCamera    products={products} onScanned={handleScanned} feedback={feedback} />
          : <ScanKeyboard  products={products} onScanned={handleScanned} feedback={feedback} />
        }
      </div>

      {/* Scanned items list */}
      <div style={{ flex:1, overflowY:"auto", padding:"8px 12px" }}>
        {scanItems.length === 0 ? (
          <div style={{ textAlign:"center", padding:"32px 16px",
            color:"var(--ink-faint)", fontSize:13 }}>
            <div style={{ fontSize:36, marginBottom:10 }}>📷</div>
            Scan a barcode to start adding items
          </div>
        ) : scanItems.map(item => (
          <div key={item._id} style={{ display:"flex", alignItems:"center", gap:10,
            padding:"9px 10px", borderRadius:10, marginBottom:6,
            background:"var(--bg1)", border:"1px solid var(--rule)" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)",
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {item.product_name}
              </div>
              <div style={{ fontSize:11, color:"var(--ink-faint)", marginTop:1 }}>
                {[item.colour, item.size, item.design].filter(Boolean).join(" · ") || "—"}
              </div>
              <div style={{ fontSize:11, color:"var(--ink-dim)", marginTop:1 }}>
                {INR(item.unit_price)}/pc
              </div>
            </div>
            {/* Qty controls */}
            <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
              <button className="qty-btn" onClick={() => changeQty(item.variant_id, -1)}
                style={{ borderRadius:7, border:"1.5px solid var(--rule)",
                  background:"var(--bg2)", cursor:"pointer", fontWeight:700, fontSize:14,
                  display:"flex", alignItems:"center", justifyContent:"center", color:"var(--ink-dim)" }}>
                −
              </button>
              <span style={{ fontSize:14, fontWeight:700, minWidth:20, textAlign:"center",
                color:"var(--ink)" }}>{item.unit_qty}</span>
              <button className="qty-btn" onClick={() => changeQty(item.variant_id, +1)}
                style={{ borderRadius:7, border:"1.5px solid var(--saffron)",
                  background:"rgba(232,119,34,0.1)", cursor:"pointer", fontWeight:700, fontSize:14,
                  display:"flex", alignItems:"center", justifyContent:"center", color:"var(--saffron)" }}>
                +
              </button>
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)",
              minWidth:52, textAlign:"right", flexShrink:0 }}>
              {INR(item.amount)}
            </div>
          </div>
        ))}
      </div>

      {/* Checkout footer */}
      {scanItems.length > 0 && (
        <div style={{ borderTop:"1px solid var(--rule)", padding:"10px 14px",
          background:"var(--bg1)", flexShrink:0 }}>

          {/* Customer + payment */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:8 }}>
            <input placeholder="Customer name" value={customer.name}
              onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}
              style={{ border:"1.5px solid var(--rule)", borderRadius:8, padding:"6px 10px",
                fontSize:12, background:"var(--bg2)", color:"var(--ink)", outline:"none" }} />
            <input placeholder="Phone (optional)" value={customer.phone}
              onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))}
              style={{ border:"1.5px solid var(--rule)", borderRadius:8, padding:"6px 10px",
                fontSize:12, background:"var(--bg2)", color:"var(--ink)", outline:"none" }} />
          </div>

          {/* Payment mode */}
          <div style={{ display:"flex", gap:5, marginBottom:8 }}>
            {["cash","upi","card","credit"].map(m => (
              <button key={m} onClick={() => setPayment(m)}
                style={{ flex:1, padding:"5px 2px", borderRadius:7, border:"1.5px solid",
                  fontSize:10, fontWeight:700, cursor:"pointer", textTransform:"uppercase",
                  background:  payment === m ? "var(--saffron)" : "var(--bg2)",
                  color:       payment === m ? "#fff"           : "var(--ink-dim)",
                  borderColor: payment === m ? "var(--saffron)" : "var(--rule)" }}>
                {m}
              </button>
            ))}
          </div>

          {/* Discount */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:12, color:"var(--ink-dim)", fontWeight:600 }}>Discount</span>
            <div style={{ position:"relative", flex:1 }}>
              <input type="number" min="0" max="100" step="0.5"
                value={discountPct || ""}
                onChange={e => setDiscountPct(Math.min(100, Math.max(0, +e.target.value || 0)))}
                placeholder="0"
                style={{ width:"100%", border:"1.5px solid var(--rule)", borderRadius:8,
                  padding:"5px 26px 5px 10px", fontSize:12, background:"var(--bg2)",
                  color:"var(--ink)", outline:"none", boxSizing:"border-box" }} />
              <span style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
                fontSize:12, color:"var(--ink-faint)" }}>%</span>
            </div>
            {discountPct > 0 && (
              <span style={{ fontSize:11, color:"var(--jade)", fontWeight:600, flexShrink:0 }}>
                −{INR(discountAmt)}
              </span>
            )}
          </div>

          {/* Bill summary */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            marginBottom:8, padding:"8px 10px", borderRadius:8,
            background:"var(--bg2)", border:"1px solid var(--rule)" }}>
            <div>
              {discountPct > 0 && (
                <div style={{ fontSize:10, color:"var(--ink-faint)", textDecoration:"line-through" }}>
                  {INR(subtotal)}
                </div>
              )}
              <div style={{ fontSize:17, fontWeight:800, color:"var(--ink)" }}>
                Total {INR(afterDiscount)}
              </div>
            </div>
            {hasCost && (
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, color:"var(--ink-faint)" }}>Profit</div>
                <div style={{ fontSize:14, fontWeight:800,
                  color: marginPct >= 20 ? "var(--jade)" : marginPct >= 8 ? "#c47f00" : "#dc2626" }}>
                  {profit >= 0 ? "+" : ""}{INR(profit)}
                  <span style={{ fontSize:10, fontWeight:500, marginLeft:4 }}>
                    ({marginPct.toFixed(0)}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {err && <div style={{ fontSize:11, color:"#dc2626", marginBottom:6 }}>{err}</div>}

          {/* Action buttons */}
          <button onClick={generateBill} disabled={loading}
            style={{ width:"100%", padding:"13px", borderRadius:12, border:"none",
              fontSize:15, fontWeight:800, cursor: loading ? "default" : "pointer",
              background: loading ? "var(--bg2)"
                : "linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
              color: loading ? "var(--ink-faint)" : "#fff",
              marginBottom:7 }}>
            {loading ? "Saving…" : `🧾 Generate Bill · ${INR(afterDiscount)}`}
          </button>

          <button onClick={addToCartAndClose}
            style={{ width:"100%", padding:"9px", borderRadius:10, border:"1px dashed var(--rule)",
              fontSize:12, color:"var(--ink-faint)", background:"transparent", cursor:"pointer" }}>
            Add to cart instead
          </button>
        </div>
      )}
    </div>
  )
}

// ── Quick Item Modal ──────────────────────────────────────────
const QUICK_CATS = [
  "Bangles","Earrings","Necklace","Maang Tikka","Anklet","Hair Clip","Bindi","Rings","Bracelet","Nose Ring",
  "Nail Polish","Kajal","Lipstick","Mehendi","Perfume","Compact","Skin Care",
  "Shampoo","Hair Oil","Body Lotion","Soap","Talcum Powder","Hair Color","Other",
]

function QuickItemModal({ onAdd, onClose, products = [] }) {
  const [desc,           setDesc]           = useState("")
  const [cat,            setCat]            = useState("Bangles")
  const [price,          setPrice]          = useState("")
  const [qty,            setQty]            = useState(1)
  const [unit,           setUnit]           = useState("piece")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [matchedProduct,  setMatchedProduct]  = useState(null)

  // Filter suggestions from catalog
  const suggestions = desc.trim().length >= 2
    ? products.filter(p =>
        p.name?.toLowerCase().includes(desc.trim().toLowerCase())
      ).slice(0, 8)
    : []

  function handleDescChange(val) {
    setDesc(val)
    setShowSuggestions(val.trim().length >= 2)
    // Re-evaluate exact match
    const exact = products.find(p => p.name?.toLowerCase() === val.trim().toLowerCase())
    setMatchedProduct(exact || null)
  }

  function pickSuggestion(prod) {
    setDesc(prod.name)
    if (prod.category) setCat(prod.category)
    if (prod.selling_price > 0) setPrice(String(prod.selling_price))
    setMatchedProduct(prod)
    setShowSuggestions(false)
  }

  // Availability status badge
  function AvailabilityBadge() {
    if (!desc.trim()) return null
    if (matchedProduct) {
      const stock = matchedProduct.total_stock ?? 0
      if (stock <= 0) return (
        <div style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:5,
          background:"#fff0f0", border:"1px solid #fca5a5", borderRadius:20,
          padding:"3px 10px", fontSize:11, fontWeight:600, color:"#dc2626" }}>
          ⚠ Out of Stock — in catalog
        </div>
      )
      if (stock <= 5) return (
        <div style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:5,
          background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:20,
          padding:"3px 10px", fontSize:11, fontWeight:600, color:"#b45309" }}>
          ⚠ Low Stock ({stock} pcs) — in catalog
        </div>
      )
      return (
        <div style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:5,
          background:"#f0fdf4", border:"1px solid #86efac", borderRadius:20,
          padding:"3px 10px", fontSize:11, fontWeight:600, color:"#166534" }}>
          ✓ In Stock ({stock} pcs) — in catalog
        </div>
      )
    }
    if (desc.trim().length >= 2 && suggestions.length === 0) return (
      <div style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:5,
        background:"#f0f9ff", border:"1px solid #93c5fd", borderRadius:20,
        padding:"3px 10px", fontSize:11, fontWeight:600, color:"#1d4ed8" }}>
        📝 New Quick Item — not in catalog
      </div>
    )
    return null
  }

  const amount = +(qty * (+price || 0)).toFixed(2)
  const canAdd = desc.trim() && +price > 0 && qty > 0

  function handleAdd() {
    if (!canAdd) return
    const unitDef = UNITS.find(u => u.id === unit)
    const pieces  = qty * (unitDef?.pcs || 1)
    onAdd({
      variant_id:          null,
      product_id:          matchedProduct?.id || null,
      product_name:        desc.trim(),
      custom_description:  desc.trim(),
      category:            cat,
      is_quick_item:       true,
      colour:              null,
      size:                null,
      design:              null,
      unit,
      unit_qty:            qty,
      unit_price:          +price,
      pieces,
      amount,
      cost_price:          0,
      gst_percent:         3,
      _id:                 Date.now(),
    })
    onClose()
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:70, background:"rgba(0,0,0,0.55)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%",
        maxWidth:420, maxHeight:"90vh", overflowY:"auto",
        padding:"20px 20px 24px", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <div style={{ fontSize:15, fontWeight:800, color:"var(--ink)" }}>⚡ Quick Item</div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", fontSize:22, cursor:"pointer",
              color:"var(--ink-faint)", lineHeight:1 }}>×</button>
        </div>

        {/* Description with autocomplete */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"var(--ink-faint)", marginBottom:5,
            textTransform:"uppercase", letterSpacing:"0.8px" }}>Item Description</div>
          <div style={{ position:"relative" }}>
            <input value={desc} onChange={e => handleDescChange(e.target.value)}
              placeholder="e.g. Glass Bangles Red, Kundan Earrings…"
              autoFocus
              style={{ width:"100%", border:"1.5px solid var(--rule)", borderRadius:10,
                padding:"9px 12px", fontSize:13, background:"var(--bg2)", color:"var(--ink)",
                outline:"none", boxSizing:"border-box" }}
              onFocus={e => { e.target.style.borderColor = "var(--saffron)"; if (desc.trim().length >= 2) setShowSuggestions(true) }}
              onBlur={e  => { e.target.style.borderColor = "var(--rule)"; setTimeout(() => setShowSuggestions(false), 150) }} />
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:80,
                background:"#fff", border:"1.5px solid var(--saffron)", borderRadius:10,
                boxShadow:"0 8px 24px rgba(0,0,0,0.15)", marginTop:3, overflow:"hidden" }}>
                {suggestions.map(prod => {
                  const stock = prod.total_stock ?? 0
                  const stockColor = stock <= 0 ? "#dc2626" : stock <= 5 ? "#b45309" : "#166534"
                  const stockLabel = stock <= 0 ? "Out of stock" : `${stock} pcs`
                  return (
                    <div key={prod.id} onMouseDown={() => pickSuggestion(prod)}
                      style={{ padding:"9px 12px", cursor:"pointer", borderBottom:"1px solid var(--rule)",
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                        transition:"background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)" }}>{prod.name}</div>
                        <div style={{ fontSize:10, color:"var(--ink-faint)" }}>{prod.category}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"var(--saffron)" }}>
                          {prod.selling_price > 0 ? `₹${prod.selling_price}` : "—"}
                        </div>
                        <div style={{ fontSize:10, fontWeight:600, color:stockColor }}>{stockLabel}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <AvailabilityBadge />
        </div>

        {/* Category chips */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"var(--ink-faint)", marginBottom:5,
            textTransform:"uppercase", letterSpacing:"0.8px" }}>Category</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {QUICK_CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{ padding:"4px 10px", borderRadius:20, border:"1.5px solid",
                  fontSize:11, fontWeight:600, cursor:"pointer",
                  background:  cat === c ? "var(--saffron)" : "var(--bg2)",
                  color:       cat === c ? "#fff"           : "var(--ink-dim)",
                  borderColor: cat === c ? "var(--saffron)" : "var(--rule)" }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Unit */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"var(--ink-faint)", marginBottom:5,
            textTransform:"uppercase", letterSpacing:"0.8px" }}>Billing Unit</div>
          <div style={{ display:"flex", gap:6 }}>
            {UNITS.map(u => (
              <button key={u.id} onClick={() => setUnit(u.id)}
                style={{ flex:1, padding:"6px 4px", borderRadius:8, border:"1.5px solid",
                  fontSize:11, fontWeight:700, cursor:"pointer",
                  background:  unit === u.id ? "var(--saffron)" : "var(--bg2)",
                  color:       unit === u.id ? "#fff"           : "var(--ink-dim)",
                  borderColor: unit === u.id ? "var(--saffron)" : "var(--rule)" }}>
                {u.label}<br/>
                <span style={{ fontSize:9, opacity:0.75 }}>{u.pcs} pc{u.pcs > 1 ? "s" : ""}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Price + Qty */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--ink-faint)", marginBottom:5,
              textTransform:"uppercase", letterSpacing:"0.8px" }}>Price / {unit}</div>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
                fontSize:13, color:"var(--ink-dim)", pointerEvents:"none" }}>₹</span>
              <input type="number" min="0" value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0"
                style={{ width:"100%", border:"1.5px solid var(--rule)",
                  borderRadius:8, padding:"8px 8px 8px 26px", fontSize:14, fontWeight:700,
                  color:"var(--ink)", background:"var(--bg2)", outline:"none",
                  boxSizing:"border-box" }}
                onFocus={e => e.target.style.borderColor = "var(--saffron)"}
                onBlur={e  => e.target.style.borderColor = "var(--rule)"} />
            </div>
          </div>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--ink-faint)", marginBottom:5,
              textTransform:"uppercase", letterSpacing:"0.8px" }}>Qty</div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ borderRadius:8, border:"1.5px solid var(--rule)",
                  background:"var(--bg2)", cursor:"pointer", fontSize:16, color:"var(--ink-dim)" }}>−</button>
              <input type="number" min="1" value={qty}
                onChange={e => setQty(Math.max(1, +e.target.value || 1))}
                style={{ flex:1, textAlign:"center", border:"1.5px solid var(--rule)",
                  borderRadius:8, padding:"6px 0", fontSize:14, fontWeight:700,
                  color:"var(--ink)", background:"var(--bg2)", outline:"none" }} />
              <button className="qty-btn" onClick={() => setQty(q => q + 1)}
                style={{ borderRadius:8, border:"1.5px solid var(--rule)",
                  background:"var(--bg2)", cursor:"pointer", fontSize:16, color:"var(--ink-dim)" }}>+</button>
            </div>
          </div>
        </div>

        <button onClick={handleAdd} disabled={!canAdd}
          style={{ width:"100%", padding:"13px", borderRadius:12, border:"none",
            fontSize:15, fontWeight:800, cursor: canAdd ? "pointer" : "default",
            background: canAdd
              ? "linear-gradient(135deg,var(--saffron),var(--saffron-hot))"
              : "var(--bg2)",
            color: canAdd ? "#fff" : "var(--ink-faint)" }}>
          {canAdd ? `+ Add to Cart · ${INR(amount)}` : "Enter description and price"}
        </button>
      </div>
    </div>
  )
}

// ── Chip selector ─────────────────────────────────────────────
function Chips({ label, options, value, onChange }) {
  if (!options.length) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)", marginBottom: 5,
        textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {options.map(o => (
          <button key={o} onClick={() => onChange(value === o ? null : o)}
            style={{ padding: "4px 10px", borderRadius: 20, border: "1.5px solid",
              fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.12s",
              background:  value === o ? "var(--saffron)" : "var(--bg2)",
              color:       value === o ? "#fff"           : "var(--ink-dim)",
              borderColor: value === o ? "var(--saffron)" : "var(--rule)" }}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Product Picker ────────────────────────────────────────────
function ProductPicker({ products, onAdd, t, onScanRequest, onQuickItem }) {
  const [search,  setSearch]  = useState("")
  const [product, setProduct] = useState(null)
  const [colour,  setColour]  = useState(null)
  const [size,    setSize]    = useState(null)
  const [design,  setDesign]  = useState(null)
  const [unit,    setUnit]    = useState("piece")
  const [qty,     setQty]     = useState(1)
  const [sellingPrice, setSellingPrice] = useState(0)
  const [voiceListening, setVoiceListening] = useState(false)
  const [voiceMsg, setVoiceMsg] = useState("")
  const [voiceLang, setVoiceLang] = useState(() => getSavedLang() || "te-IN")
  const voiceRecRef = useRef(null)

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )
  const variants = product?.variants || []
  const colours  = [...new Set(variants.map(v => v.colour).filter(Boolean))]
  const sizes    = [...new Set(variants.map(v => v.size).filter(Boolean))]
  const designs  = [...new Set(variants.map(v => v.design).filter(Boolean))]

  const matched = variants.find(v =>
    (colours.length === 0 || v.colour === colour) &&
    (sizes.length   === 0 || v.size   === size)   &&
    (designs.length === 0 || v.design === design)
  )
  const unitDef   = UNITS.find(u => u.id === unit)
  const pieces    = qty * (unitDef?.pcs || 1)
  // MRP and cost are stored as PER-DOZEN prices (bangle trade convention)
  const dozenMrp  = matched?.mrp ?? product?.mrp ?? 0
  const dozenCost = matched?.cost_price ?? product?.cost_price ?? 0
  // Per-unit price for selected billing unit
  const unitPrice = (mrpDz) =>
    unit === "dozen" ? mrpDz
    : unit === "set"  ? +(mrpDz / 2).toFixed(2)   // set = 6 pcs = half dozen
    :                   +(mrpDz / 12).toFixed(2)   // piece
  const mrpPerUnit  = unitPrice(dozenMrp)
  const costPerUnit = unitPrice(dozenCost)
  const margin    = sellingPrice > 0 && costPerUnit > 0
    ? ((sellingPrice - costPerUnit) / sellingPrice) * 100
    : null
  const marginColor = margin === null ? "var(--ink-faint)"
    : margin > 25 ? "#1a7a4a" : margin >= 10 ? "#c47f00" : "#c0392b"
  const marginBg    = margin === null ? "var(--bg2)"
    : margin > 25 ? "rgba(26,122,74,0.12)" : margin >= 10 ? "rgba(196,127,0,0.12)" : "rgba(192,57,43,0.12)"
  const marginLabel = margin === null ? "—" : `${margin.toFixed(1)}%`
  // amount = qty × per-unit-price (NOT qty × pieces × per-piece-price)
  const amount    = qty * sellingPrice
  const canAdd    = product && matched && qty > 0 && sellingPrice > 0

  // Recompute selling price whenever product/variant or unit changes
  useEffect(() => {
    setSellingPrice(unitPrice(matched?.mrp ?? product?.mrp ?? 0))
  }, [matched?.id, product?.id, unit])



  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setVoiceMsg("Voice not supported — use Chrome"); return }
    setVoiceListening(true); setVoiceMsg("")
    const rec = new SR()
    rec.lang = voiceLang; rec.continuous = false; rec.interimResults = false
    rec.onend  = () => setVoiceListening(false)
    rec.onerror = () => { setVoiceListening(false); setVoiceMsg("Mic error — try again") }
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript.trim()
      const result = parseVoiceCart(text, products)
      if (!result) { setVoiceMsg(`Could not match: "${text}"`); return }
      const unitDef  = UNITS.find(u => u.id === result.unit) || UNITS[0]
      const pieces   = result.qty * unitDef.pcs
      const dozenMrp = result.variant.mrp || result.product.mrp || 0
      const vPrice   = result.unit === "dozen" ? dozenMrp
                     : result.unit === "set"   ? +(dozenMrp / 2).toFixed(2)
                     :                           +(dozenMrp / 12).toFixed(2)
      onAdd({
        variant_id:   result.variant.id,
        product_id:   result.product.id,
        product_name: result.product.name,
        colour:       result.variant.colour,
        size:         result.variant.size,
        design:       result.variant.design,
        unit:         result.unit,
        unit_qty:     result.qty,
        unit_price:   vPrice,
        pieces,
        amount:       result.qty * vPrice,
        gst_percent:  result.product.gst_percent || 3,
        _id:          Date.now(),
      })
      setVoiceMsg(`✓ Added: ${result.product.name}${result.variant.colour ? " · " + result.variant.colour : ""} × ${result.qty} ${result.unit}`)
    }
    voiceRecRef.current = rec
    rec.start()
  }

  function handleAdd() {
    if (!canAdd) return
    onAdd({
      variant_id:   matched.id,
      product_id:   product.id,
      product_name: product.name,
      colour:       matched.colour,
      size:         matched.size,
      design:       matched.design,
      unit,
      unit_qty:     qty,
      unit_price:   sellingPrice,
      pieces,
      amount,
      cost_price:   dozenCost,   // per-dozen cost — used for profit preview in cart
      gst_percent:  product.gst_percent || 3,
      _id:          Date.now(),
    })
    setProduct(null); setColour(null); setSize(null); setDesign(null)
    setUnit("piece"); setQty(1); setSearch("")
  }

  function selectProduct(p) {
    setProduct(p); setColour(null); setSize(null); setDesign(null)
    setUnit("piece"); setQty(1)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
        {/* Search + scan + voice row */}
        <div style={{ display:"flex", gap:6, marginBottom: voiceMsg ? 6 : 0 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("Search products...")}
            style={{ flex:1, border: "1.5px solid var(--rule)", borderRadius: 10,
              padding: "8px 12px", fontSize: 13, outline: "none", background: "var(--bg2)",
              color: "var(--ink)", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = "var(--saffron)"}
            onBlur={e  => e.target.style.borderColor = "var(--rule)"} />
          {/* Quick Item */}
          <button onClick={onQuickItem} title="Quick item — bill without catalog"
            style={{ padding:"8px 10px", borderRadius:10, border:"1.5px solid var(--saffron)",
              background:"rgba(232,119,34,0.08)", cursor:"pointer", flexShrink:0,
              fontSize:13, fontWeight:700, color:"var(--saffron)", whiteSpace:"nowrap" }}>
            ⚡
          </button>
          {/* Barcode Scanner */}
          <button onClick={onScanRequest} title="Scan barcode"
            style={{ padding:"8px 10px", borderRadius:10, border:"1.5px solid var(--rule)",
              background:"var(--bg2)", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color:"var(--ink-dim)" }}>
              <rect x="3"  y="4" width="2" height="16"/>
              <rect x="7"  y="4" width="1" height="16"/>
              <rect x="10" y="4" width="2" height="16"/>
              <rect x="14" y="4" width="1" height="16"/>
              <rect x="17" y="4" width="2" height="16"/>
              <rect x="21" y="4" width="1" height="16"/>
            </svg>
          </button>
          {/* Voice */}
          <button onClick={voiceListening ? () => { voiceRecRef.current?.stop(); setVoiceListening(false) } : startVoice}
            title={voiceListening ? "Stop listening" : "Voice command"}
            style={{ padding:"8px 11px", borderRadius:10, border:"1.5px solid",
              borderColor: voiceListening ? "#ef4444" : "var(--rule)",
              background: voiceListening ? "rgba(239,68,68,0.1)" : "var(--bg2)",
              cursor:"pointer", fontSize:18, flexShrink:0,
              animation: voiceListening ? "voice-ring 1.2s ease-in-out infinite" : "none" }}>
            🎤
          </button>
        </div>
        {/* Language selector — shown when voice is active or on tap */}
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:6 }}>
          {VOICE_LANGS.map(l => (
            <button key={l.code} onClick={() => setVoiceLang(l.code)}
              title={l.name}
              style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:600,
                border:"1.5px solid",
                borderColor: voiceLang === l.code ? "var(--saffron)" : "var(--rule)",
                background:  voiceLang === l.code ? "var(--saffron)" : "var(--bg2)",
                color:       voiceLang === l.code ? "#fff" : "var(--ink-dim)",
                cursor:"pointer", lineHeight:1.6 }}>
              {l.label}
            </button>
          ))}
        </div>
        {voiceMsg && (
          <div style={{ fontSize:11, marginTop:4, fontWeight:600, padding:"4px 8px", borderRadius:7,
            background: voiceMsg.startsWith("✓") ? "rgba(29,158,117,0.12)" : "rgba(220,38,38,0.08)",
            color: voiceMsg.startsWith("✓") ? "var(--jade)" : "#dc2626" }}>
            {voiceMsg}
          </div>
        )}
        {voiceListening && (
          <div style={{ fontSize:11, color:"#ef4444", fontWeight:600, textAlign:"center", marginTop:4 }}>
            🎙 Listening… say product name, colour, size &amp; quantity
          </div>
        )}
      </div>

      {!product ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--ink-faint)", fontSize: 13 }}>
              No products found
            </div>
          ) : filtered.map(p => (
            <div key={p.id} onClick={() => selectProduct(p)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 12, marginBottom: 6, cursor: "pointer",
                background: "var(--bg1)", border: "1px solid var(--rule)", transition: "all 0.12s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--saffron)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--rule)"}>
              <div style={{ width: 38, height: 38, borderRadius: 10, overflow: "hidden",
                background: "#fbeaef", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.image_url
                  ? <img src={p.image_url} alt={p.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 18 }}>💍</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  {p.category} · {p.variant_count} {t("variants")} · {INR(p.mrp)}/dz
                </div>
              </div>
              <svg width="14" height="14" fill="none" stroke="var(--ink-faint)" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <button onClick={() => setProduct(null)}
              style={{ background: "var(--bg2)", border: "1px solid var(--rule)", borderRadius: 8,
                padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "var(--ink-dim)" }}>
              ← Back
            </button>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{product.name}</div>
          </div>

          <Chips label={t("Colour")} options={colours} value={colour} onChange={setColour} />
          <Chips label={t("Size")}   options={sizes}   value={size}   onChange={setSize}   />
          <Chips label={t("Design")} options={designs}  value={design} onChange={setDesign} />

          {variants.length > 0 && (
            <div style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8, marginBottom: 10,
              background: matched ? "rgba(31,122,94,0.08)" : "rgba(179,38,30,0.07)",
              color: matched ? "var(--jade)" : "var(--ember)" }}>
              {matched
                ? `✓ ${[matched.colour, matched.size, matched.design].filter(Boolean).join(" · ")} — ${matched.stock} ${t("pcs in stock")}`
                : t("Select combination to find variant")}
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)", marginBottom: 5,
              textTransform: "uppercase", letterSpacing: "0.8px" }}>{t("Billing Unit")}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {UNITS.map(u => (
                <button key={u.id} onClick={() => setUnit(u.id)}
                  style={{ flex: 1, padding: "6px 4px", borderRadius: 8, border: "1.5px solid",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.12s",
                    background:  unit === u.id ? "var(--saffron)" : "var(--bg2)",
                    color:       unit === u.id ? "#fff"           : "var(--ink-dim)",
                    borderColor: unit === u.id ? "var(--saffron)" : "var(--rule)" }}>
                  {u.label}<br/>
                  <span style={{ fontSize: 9, opacity: 0.75 }}>{u.pcs} pc{u.pcs > 1 ? "s" : ""}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)", marginBottom: 5,
              textTransform: "uppercase", letterSpacing: "0.8px" }}>{t("Quantity")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ borderRadius: 8, border: "1.5px solid var(--rule)",
                  background: "var(--bg2)", cursor: "pointer", fontSize: 16, color: "var(--ink-dim)" }}>−</button>
              <input type="number" min="1" value={qty}
                onChange={e => setQty(Math.max(1, +e.target.value || 1))}
                style={{ width: 60, textAlign: "center", border: "1.5px solid var(--rule)", borderRadius: 8,
                  padding: "6px 0", fontSize: 14, fontWeight: 700, color: "var(--ink)",
                  background: "var(--bg2)", outline: "none" }} />
              <button className="qty-btn" onClick={() => setQty(q => q + 1)}
                style={{ borderRadius: 8, border: "1.5px solid var(--rule)",
                  background: "var(--bg2)", cursor: "pointer", fontSize: 16, color: "var(--ink-dim)" }}>+</button>
              <div style={{ fontSize: 11, color: "var(--ink-faint)", marginLeft: 4 }}>
                = {pieces} pcs
              </div>
            </div>
          </div>

          {/* ── Bargaining Margin Guard ── */}
          {matched && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)", marginBottom: 5,
                textTransform: "uppercase", letterSpacing: "0.8px" }}>
                {t("Selling Price")} / {unit}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                    fontSize: 13, color: "var(--ink-dim)", pointerEvents: "none", zIndex: 1 }}>₹</span>
                  <input type="number" min="0" value={sellingPrice || ""}
                    onChange={e => setSellingPrice(Math.max(0, +e.target.value || 0))}
                    style={{ width: "100%", paddingLeft: 24, border: "1.5px solid var(--rule)",
                      borderRadius: 8, padding: "7px 8px 7px 24px", fontSize: 14, fontWeight: 700,
                      color: "var(--ink)", background: "var(--bg2)", outline: "none", boxSizing: "border-box" }}
                    onFocus={e => e.target.style.borderColor = marginColor}
                    onBlur={e  => e.target.style.borderColor = "var(--rule)"} />
                </div>
                <div style={{ background: marginBg, border: `1.5px solid ${marginColor}`, borderRadius: 10,
                  padding: "6px 10px", textAlign: "center", flexShrink: 0, minWidth: 68 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: marginColor }}>{marginLabel}</div>
                  <div style={{ fontSize: 9, color: marginColor, opacity: 0.85, marginTop: 1 }}>
                    {margin === null ? t("set cost") : margin > 25 ? t("✓ Good") : margin >= 10 ? t("⚠ Low") : t("✗ Risk")}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 4 }}>
                MRP {INR(mrpPerUnit)}/{unit}
                {dozenCost > 0 && ` · Cost ${INR(costPerUnit)}/${unit}`}
                {unit !== "dozen" && dozenMrp > 0 && (
                  <span style={{ marginLeft: 6, opacity: 0.7 }}>({INR(dozenMrp)}/dozen)</span>
                )}
              </div>
            </div>
          )}

          <div style={{ background: "var(--bg1)", border: "1px solid var(--rule)", borderRadius: 12,
            padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                {qty} {unit} ({pieces} pcs) × {INR(sellingPrice)}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--saffron)" }}>{INR(amount)}</div>
            </div>
            <button onClick={handleAdd} disabled={!canAdd}
              style={{ background: canAdd
                ? "linear-gradient(135deg,var(--saffron),var(--saffron-hot))"
                : "var(--bg2)",
                color: canAdd ? "#fff" : "var(--ink-faint)", border: "none", borderRadius: 10,
                padding: "10px 20px", fontSize: 13, fontWeight: 700,
                cursor: canAdd ? "pointer" : "default", transition: "all 0.15s" }}>
              {t("+ Add to Cart")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Receipt Modal ─────────────────────────────────────────────
function ReceiptModal({ sale, storeName, onClose, onNewBill }) {
  const lines   = sale.items || []
  const dateStr = new Date(sale.created_at).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  })

  function shareWhatsApp() {
    const text = [
      `🧾 *${storeName}*`,
      `Date: ${dateStr}`,
      ``,
      ...lines.map(i =>
        `• ${i.product_name}${i.colour ? " " + i.colour : ""}${i.size ? " " + i.size : ""} | ${i.unit_qty} ${i.unit} = ₹${Number(i.amount).toLocaleString("en-IN")}`
      ),
      ``,
      sale.gst_amount > 0 ? `Subtotal: ₹${Number(sale.subtotal).toLocaleString("en-IN")}` : "",
      sale.gst_amount > 0 ? `GST: ₹${Number(sale.gst_amount).toLocaleString("en-IN")}` : "",
      `*Total: ₹${Number(sale.total).toLocaleString("en-IN")}*`,
      `Payment: ${sale.payment_mode.toUpperCase()}`,
    ].filter(l => l !== "").join("\n")
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg2)", borderRadius: 20, width: "100%", maxWidth: 400,
        maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>

        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid var(--rule)", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>Bill Generated!</div>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>{dateStr}</div>
          {sale.customer_name && (
            <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>
              {sale.customer_name}{sale.customer_phone ? ` · ${sale.customer_phone}` : ""}
            </div>
          )}
        </div>

        <div style={{ padding: "14px 20px" }}>
          {lines.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              padding: "8px 0", borderBottom: "1px solid var(--rule)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{item.product_name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
                  {[item.colour, item.size, item.design].filter(Boolean).join(" · ")}
                  {" · "}{item.unit_qty} {item.unit} ({item.pieces} pcs)
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", flexShrink: 0, marginLeft: 12 }}>
                {INR(item.amount)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "0 20px 14px" }}>
          {/* Show discount line if notes contains discount info */}
          {sale.notes && sale.notes.startsWith("Discount:") && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12,
              color: "#dc2626", padding: "4px 0" }}>
              <span>{sale.notes}</span>
              <span>applied</span>
            </div>
          )}
          {sale.gst_amount > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12,
                color: "var(--ink-dim)", padding: "4px 0" }}>
                <span>Subtotal</span><span>{INR(sale.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12,
                color: "var(--ink-dim)", padding: "4px 0" }}>
                <span>GST</span><span>{INR(sale.gst_amount)}</span>
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16,
            fontWeight: 800, color: "var(--saffron)", padding: "8px 0",
            borderTop: "2px solid var(--rule)", marginTop: 4 }}>
            <span>Total</span><span>{INR(sale.total)}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", textAlign: "right", marginTop: 2 }}>
            {sale.payment_mode.toUpperCase()}
          </div>
        </div>

        <div style={{ padding: "0 20px 20px", display: "flex", gap: 8 }}>
          <button onClick={shareWhatsApp}
            style={{ flex: 1, background: "#25D366", color: "#fff", border: "none",
              borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            📲 WhatsApp
          </button>
          <button onClick={onNewBill}
            style={{ flex: 1, background: "linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
              color: "#fff", border: "none", borderRadius: 10, padding: "10px 0",
              fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + New Bill
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Cart Panel ────────────────────────────────────────────────
function CartPanel({ items, onRemove, onUpdatePrice, onBill, t }) {
  const [customer,    setCustomer]    = useState({ name: "", phone: "" })
  const [payment,     setPayment]     = useState("cash")
  const [applyGst,    setApplyGst]    = useState(false)
  const [discountPct, setDiscountPct] = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [err,         setErr]         = useState("")
  const [editingId,   setEditingId]   = useState(null)
  const [editPrice,   setEditPrice]   = useState("")

  const subtotal    = items.reduce((s, i) => s + i.amount, 0)
  const discountAmt = +(subtotal * discountPct / 100).toFixed(2)
  const afterDiscount = +(subtotal - discountAmt).toFixed(2)
  const gstAmount   = applyGst
    ? items.reduce((s, i) => s + i.amount * (i.gst_percent / 100), 0)
    : 0
  const total = +(afterDiscount + gstAmount).toFixed(2)

  // Profit = revenue after discount − cost of goods sold
  // cost_price is stored per-dozen; divide by 12 for per-piece cost
  const totalCost = items.reduce((s, i) => s + (i.pieces * (i.cost_price || 0) / 12), 0)
  const profit     = +(afterDiscount - totalCost).toFixed(2)
  const marginPct  = afterDiscount > 0 ? (profit / afterDiscount * 100) : 0
  const hasCost    = items.some(i => (i.cost_price || 0) > 0)

  async function checkout() {
    if (!items.length) return
    setLoading(true); setErr("")
    try {
      // Apply discount proportionally across item amounts
      const multiplier = discountPct > 0 ? (1 - discountPct / 100) : 1
      const sendItems = items.map(({ _id, cost_price, ...rest }) => ({
        ...rest,
        amount: +(rest.amount * multiplier).toFixed(2),
      }))
      const sale = await BangleSales.create({
        items:          sendItems,
        customer_name:  customer.name  || null,
        customer_phone: customer.phone || null,
        payment_mode:   payment,
        apply_gst:      applyGst,
        notes:          discountPct > 0 ? `Discount: ${discountPct}%` : null,
      })
      onBill(sale)
      setCustomer({ name: "", phone: "" }); setPayment("cash")
      setApplyGst(false); setDiscountPct(0)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  if (!items.length) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 32, color: "var(--ink-faint)" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{t("Cart is empty")}</div>
      <div style={{ fontSize: 12, marginTop: 6 }}>{t("Add items from the left panel")}</div>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
        {items.map(item => {
          const isEditing = editingId === item._id
          const originalAmt = item._originalAmount ?? item.amount
          const priceChanged = item.amount !== originalAmt
          return (
            <div key={item._id} style={{ display: "flex", alignItems: "flex-start", gap: 8,
              padding: "10px", borderRadius: 10, marginBottom: 6,
              background: "var(--bg1)", border: "1px solid var(--rule)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                  {item.is_quick_item && (
                    <span style={{ fontSize: 9, fontWeight: 800, background: "rgba(232,119,34,0.15)",
                      color: "var(--saffron)", borderRadius: 4, padding: "1px 5px",
                      marginRight: 5, verticalAlign: "middle" }}>QUICK</span>
                  )}
                  {item.product_name}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
                  {item.category || [item.colour, item.size, item.design].filter(Boolean).join(" · ") || "—"}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 2 }}>
                  {item.unit_qty} {item.unit} ({item.pieces} pcs) × {INR(item.unit_price)}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, minWidth: 70 }}>
                {isEditing ? (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                    <div style={{ position:"relative" }}>
                      <span style={{ position:"absolute", left:6, top:"50%", transform:"translateY(-50%)",
                        fontSize:11, color:"var(--ink-dim)" }}>₹</span>
                      <input type="number" min="0" autoFocus
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const newAmt = Math.max(0, +editPrice || 0)
                            onUpdatePrice(item._id, newAmt, item.amount)
                            setEditingId(null)
                          }
                          if (e.key === "Escape") setEditingId(null)
                        }}
                        style={{ width:72, paddingLeft:18, border:"1.5px solid var(--saffron)",
                          borderRadius:6, padding:"4px 4px 4px 18px", fontSize:13, fontWeight:700,
                          color:"var(--ink)", background:"var(--bg2)", outline:"none",
                          boxSizing:"border-box" }} />
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      <button onClick={() => {
                          const newAmt = Math.max(0, +editPrice || 0)
                          onUpdatePrice(item._id, newAmt, item.amount)
                          setEditingId(null)
                        }}
                        style={{ fontSize:10, fontWeight:700, background:"var(--saffron)",
                          color:"#fff", border:"none", borderRadius:4, padding:"2px 7px", cursor:"pointer" }}>
                        ✓
                      </button>
                      <button onClick={() => setEditingId(null)}
                        style={{ fontSize:10, background:"var(--bg2)", color:"var(--ink-faint)",
                          border:"1px solid var(--rule)", borderRadius:4, padding:"2px 7px", cursor:"pointer" }}>
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(item._id); setEditPrice(item.amount) }}
                      title="Tap to edit price"
                      style={{ fontSize:13, fontWeight:700, background:"none", border:"none",
                        cursor:"pointer", padding:0, color:"var(--ink)", textAlign:"right" }}>
                      {priceChanged && (
                        <span style={{ fontSize:10, color:"var(--ink-faint)",
                          textDecoration:"line-through", display:"block" }}>
                          {INR(originalAmt)}
                        </span>
                      )}
                      {INR(item.amount)}
                      <span style={{ fontSize:9, color:"var(--ink-faint)", display:"block", marginTop:1 }}>
                        tap to edit
                      </span>
                    </button>
                    <button onClick={() => onRemove(item._id)}
                      style={{ fontSize: 10, color: "var(--ember)", background: "none", border: "none",
                        cursor: "pointer", padding: 0, marginTop: 4 }}>Remove</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ borderTop: "1px solid var(--rule)", padding: "12px 14px",
        background: "var(--bg1)", flexShrink: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          <input placeholder={t("Customer name")} value={customer.name}
            onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}
            style={{ border: "1.5px solid var(--rule)", borderRadius: 8, padding: "6px 10px",
              fontSize: 12, background: "var(--bg2)", color: "var(--ink)", outline: "none" }} />
          <input placeholder={t("Phone (optional)")} value={customer.phone}
            onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))}
            style={{ border: "1.5px solid var(--rule)", borderRadius: 8, padding: "6px 10px",
              fontSize: 12, background: "var(--bg2)", color: "var(--ink)", outline: "none" }} />
        </div>

        <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
          {["cash", "upi", "card", "credit"].map(m => (
            <button key={m} onClick={() => setPayment(m)}
              style={{ flex: 1, padding: "5px 2px", borderRadius: 7, border: "1.5px solid",
                fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase",
                background:  payment === m ? "var(--saffron)" : "var(--bg2)",
                color:       payment === m ? "#fff"           : "var(--ink-dim)",
                borderColor: payment === m ? "var(--saffron)" : "var(--rule)" }}>
              {m}
            </button>
          ))}
        </div>

        {/* Discount */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <span style={{ fontSize:12, color:"var(--ink-dim)", flexShrink:0, fontWeight:600 }}>
            {t("Discount")}
          </span>
          <div style={{ position:"relative", flex:1 }}>
            <input type="number" min="0" max="100" step="0.5"
              value={discountPct || ""}
              onChange={e => setDiscountPct(Math.min(100, Math.max(0, +e.target.value || 0)))}
              placeholder="0"
              style={{ width:"100%", border:"1.5px solid var(--rule)", borderRadius:8,
                padding:"5px 24px 5px 10px", fontSize:13, fontWeight:700, outline:"none",
                background:"var(--bg2)", color:"var(--ink)", boxSizing:"border-box" }} />
            <span style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
              fontSize:12, color:"var(--ink-faint)", pointerEvents:"none" }}>%</span>
          </div>
          {discountPct > 0 && (
            <span style={{ fontSize:12, color:"#dc2626", fontWeight:700, flexShrink:0 }}>
              −{INR(discountAmt)}
            </span>
          )}
        </div>

        {/* GST toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <input type="checkbox" id="gst-toggle" checked={applyGst}
            onChange={e => setApplyGst(e.target.checked)}
            style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--saffron)" }} />
          <label htmlFor="gst-toggle" style={{ fontSize: 12, color: "var(--ink-dim)", cursor: "pointer" }}>
            {t("Apply GST")}
          </label>
        </div>

        {/* Bill breakdown */}
        <div style={{ fontSize:12, color:"var(--ink-dim)", marginBottom:4 }}>
          {discountPct > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
              <span>Subtotal</span><span>{INR(subtotal)}</span>
            </div>
          )}
          {discountPct > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2, color:"#dc2626" }}>
              <span>Discount ({discountPct}%)</span><span>−{INR(discountAmt)}</span>
            </div>
          )}
          {applyGst && (
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
              <span>After discount</span><span>{INR(afterDiscount)}</span>
            </div>
          )}
          {applyGst && (
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
              <span>GST</span><span>{INR(gstAmount)}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18,
          fontWeight: 800, color: "var(--saffron)", marginBottom: 10 }}>
          <span>Total</span><span>{INR(total)}</span>
        </div>

        {/* Profit preview */}
        {hasCost && (
          <div style={{
            marginBottom: 10, padding:"10px 12px", borderRadius:10,
            background: profit >= 0 ? "rgba(26,122,74,0.08)" : "rgba(192,57,43,0.08)",
            border:`1px solid ${profit >= 0 ? "rgba(26,122,74,0.25)" : "rgba(192,57,43,0.25)"}`,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:11, color:"var(--ink-faint)", marginBottom:2 }}>
                  Profit on this bill
                </div>
                <div style={{ fontSize:16, fontWeight:800,
                  color: profit >= 0 ? "var(--jade)" : "#dc2626" }}>
                  {profit >= 0 ? "+" : ""}{INR(profit)}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:11, color:"var(--ink-faint)", marginBottom:2 }}>Margin</div>
                <div style={{ fontSize:18, fontWeight:800,
                  color: marginPct >= 25 ? "var(--jade)" : marginPct >= 10 ? "#c47f00" : "#dc2626" }}>
                  {marginPct.toFixed(1)}%
                </div>
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10,
              color:"var(--ink-faint)", marginTop:6 }}>
              <span>Revenue {INR(afterDiscount)}</span>
              <span>Cost {INR(totalCost)}</span>
            </div>
          </div>
        )}

        {err && <div style={{ fontSize: 11, color: "var(--ember)", marginBottom: 8 }}>{err}</div>}

        <button onClick={checkout} disabled={loading}
          style={{ width: "100%", background: loading
            ? "var(--bg2)"
            : "linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
            color: loading ? "var(--ink-faint)" : "#fff", border: "none",
            borderRadius: 12, padding: "13px 0", fontSize: 15, fontWeight: 800,
            cursor: loading ? "default" : "pointer", transition: "all 0.15s" }}>
          {loading ? t("Saving…") : t("🧾 Bill Karo")}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function BangleBilling() {
  const { vendor } = useAuth()
  const { t }      = useLang()
  const [products,     setProducts]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [cart,         setCart]         = useState([])
  const [receipt,      setReceipt]      = useState(null)
  const [tab,          setTab]          = useState("items")
  const [today,        setToday]        = useState(null)
  const [offline,      setOffline]      = useState(!navigator.onLine)
  const [pending,      setPending]      = useState(BangleSync.pendingCount())
  const [syncing,      setSyncing]      = useState(false)
  const [showScanner,  setShowScanner]  = useState(false)
  const [showQuick,    setShowQuick]    = useState(false)

  useEffect(() => {
    Promise.all([
      BangleProducts.list(),
      BangleSales.todaySummary(),
    ]).then(([prods, summ]) => {
      setProducts(prods); setToday(summ)
    }).catch(console.error).finally(() => setLoading(false))

    const onOnline  = () => { setOffline(false); syncQueue() }
    const onOffline = () => setOffline(true)
    window.addEventListener("online",  onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online",  onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  async function syncQueue() {
    if (BangleSync.pendingCount() === 0) return
    setSyncing(true)
    const result = await BangleSync.processQueue()
    setPending(result.pending)
    if (result.synced > 0) {
      const [prods, summ] = await Promise.all([
        BangleProducts.list(),
        BangleSales.todaySummary(),
      ]).catch(() => [null, null])
      if (prods) setProducts(prods)
      if (summ)  setToday(summ)
    }
    setSyncing(false)
  }

  function addToCart(item) { setCart(prev => [...prev, item]); setTab("cart") }
  function removeFromCart(id) { setCart(prev => prev.filter(i => i._id !== id)) }
  function updateCartPrice(id, newAmount, oldAmount) {
    setCart(prev => prev.map(i => {
      if (i._id !== id) return i
      const newUnitPrice = i.unit_qty > 0 ? +(newAmount / i.unit_qty).toFixed(2) : i.unit_price
      return {
        ...i,
        amount:          newAmount,
        unit_price:      newUnitPrice,
        _originalAmount: i._originalAmount ?? oldAmount,
      }
    }))
  }

  function onBill(sale) {
    setReceipt(sale)
    setCart([])
    setToday(prev => prev ? {
      total_revenue: (prev.total_revenue || 0) + sale.total,
      total_bills:   (prev.total_bills   || 0) + 1,
      total_pieces:  (prev.total_pieces  || 0) + sale.items.reduce((s, i) => s + i.pieces, 0),
    } : prev)
  }

  const storeName = vendor?.store_name || "Bangle Store"

  return (
    <div className="page-flex-fill" style={{ background: "var(--bg0)" }}>

      {receipt && (
        <ReceiptModal sale={receipt} storeName={storeName}
          onClose={() => setReceipt(null)}
          onNewBill={() => { setReceipt(null); setTab("items") }} />
      )}
      {showScanner && (
        <ScanBillModal
          products={products}
          onBill={sale => { onBill(sale); setShowScanner(false) }}
          onAddToCart={item => { addToCart(item); setTab("cart") }}
          onClose={() => setShowScanner(false)}
        />
      )}
      {showQuick && (
        <QuickItemModal
          products={products}
          onAdd={item => { addToCart(item); setTab("cart") }}
          onClose={() => setShowQuick(false)}
        />
      )}

      {/* Offline / pending-sync banner */}
      {(offline || pending > 0) && (
        <div style={{ background: offline ? "rgba(220,38,38,0.08)" : "rgba(196,127,0,0.1)",
          borderBottom: `1px solid ${offline ? "rgba(220,38,38,0.2)" : "rgba(196,127,0,0.25)"}`,
          padding: "6px 16px", display: "flex", alignItems: "center",
          justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600,
            color: offline ? "#dc2626" : "#c47f00" }}>
            {offline
              ? "📵 Offline — bills saved locally, will sync when connected"
              : `☁ ${pending} bill${pending > 1 ? "s" : ""} pending sync`}
          </div>
          {!offline && pending > 0 && (
            <button onClick={syncQueue} disabled={syncing}
              style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                background: "rgba(196,127,0,0.15)", border: "1px solid rgba(196,127,0,0.3)",
                color: "#c47f00", cursor: syncing ? "default" : "pointer" }}>
              {syncing ? "Syncing…" : "Sync now"}
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "var(--bg1)", padding: "0 20px", height: 56, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--rule)" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{t("🧾 Bangle Billing")}</div>
          <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            {t("Piece · Dozen · Set")}{today?._offline ? ` · ${t("offline mode")}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LangToggle />
          {today && (
            <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 800, color: "var(--saffron)", fontSize: 14 }}>
                  ₹{Number(today.total_revenue || 0).toLocaleString("en-IN")}
                </div>
                <div style={{ color: "var(--ink-faint)" }}>{t("Today")}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 14 }}>{today.total_bills || 0}</div>
                <div style={{ color: "var(--ink-faint)" }}>{t("Bills")}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="mobile-billing-tabs">
        {[{ id: "items", label: t("Add Items") }, { id: "cart", label: `${t("Cart")} (${cart.length})` }].map(tab_ => (
          <button key={tab_.id} onClick={() => setTab(tab_.id)}
            style={{ flex: 1, padding: "10px 0", background: "none", border: "none",
              borderBottom: `2px solid ${tab === tab_.id ? "var(--saffron)" : "transparent"}`,
              fontSize: 13, fontWeight: tab === tab_.id ? 700 : 500,
              color: tab === tab_.id ? "var(--saffron)" : "var(--ink-dim)", cursor: "pointer" }}>
            {tab_.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink-faint)", fontSize: 13 }}>Loading products…</div>
      ) : (
        <div className="billing-layout" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div className={`billing-left${tab === "cart" ? " billing-hidden-mobile" : ""}`}
            style={{ flex: 1, borderRight: "1px solid var(--rule)", overflow: "hidden",
              display: "flex", flexDirection: "column" }}>
            <ProductPicker products={products} onAdd={addToCart} t={t}
              onScanRequest={() => setShowScanner(true)}
              onQuickItem={() => setShowQuick(true)} />
          </div>
          <div className={`billing-right${tab === "items" ? " billing-hidden-mobile" : ""}`}
            style={{ width: 340, minWidth: 280, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <CartPanel items={cart} onRemove={removeFromCart}
              onUpdatePrice={updateCartPrice} onBill={onBill} t={t} />
          </div>
        </div>
      )}

    </div>
  )
}
