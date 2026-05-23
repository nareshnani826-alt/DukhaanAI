import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { BangleProducts, BangleSales, BangleSync } from "../sync/bangleDb"
import { useLang, LangToggle } from "../hooks/useLang"

const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const UNITS = [
  { id: "piece", label: "Piece", pcs: 1  },
  { id: "dozen", label: "Dozen", pcs: 12 },
  { id: "set",   label: "Set",   pcs: 6  },
]

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
function ProductPicker({ products, onAdd, t }) {
  const [search,  setSearch]  = useState("")
  const [product, setProduct] = useState(null)
  const [colour,  setColour]  = useState(null)
  const [size,    setSize]    = useState(null)
  const [design,  setDesign]  = useState(null)
  const [unit,    setUnit]    = useState("piece")
  const [qty,     setQty]     = useState(1)
  const [sellingPrice, setSellingPrice] = useState(0)

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
  const costPrice = matched?.cost_price ?? product?.cost_price ?? 0
  const mrp       = matched?.mrp ?? product?.mrp ?? 0
  const margin    = sellingPrice > 0 && costPrice > 0
    ? ((sellingPrice - costPrice) / sellingPrice) * 100
    : null
  const marginColor = margin === null ? "var(--ink-faint)"
    : margin > 25 ? "#1a7a4a" : margin >= 10 ? "#c47f00" : "#c0392b"
  const marginBg    = margin === null ? "var(--bg2)"
    : margin > 25 ? "rgba(26,122,74,0.12)" : margin >= 10 ? "rgba(196,127,0,0.12)" : "rgba(192,57,43,0.12)"
  const marginLabel = margin === null ? "—" : `${margin.toFixed(1)}%`
  const amount    = pieces * sellingPrice
  const canAdd    = product && matched && qty > 0 && sellingPrice > 0

  useEffect(() => {
    setSellingPrice(matched?.mrp ?? product?.mrp ?? 0)
  }, [matched?.id, product?.id])

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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t("Search products...")}
          style={{ width: "100%", border: "1.5px solid var(--rule)", borderRadius: 10,
            padding: "8px 12px", fontSize: 13, outline: "none", background: "var(--bg2)",
            color: "var(--ink)", boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = "var(--saffron)"}
          onBlur={e  => e.target.style.borderColor = "var(--rule)"} />
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
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fbeaef",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                💍
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  {p.category} · {p.variant_count} {t("variants")} · {INR(p.mrp)}
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
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--rule)",
                  background: "var(--bg2)", cursor: "pointer", fontSize: 16, color: "var(--ink-dim)" }}>−</button>
              <input type="number" min="1" value={qty}
                onChange={e => setQty(Math.max(1, +e.target.value || 1))}
                style={{ width: 60, textAlign: "center", border: "1.5px solid var(--rule)", borderRadius: 8,
                  padding: "6px 0", fontSize: 14, fontWeight: 700, color: "var(--ink)",
                  background: "var(--bg2)", outline: "none" }} />
              <button onClick={() => setQty(q => q + 1)}
                style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--rule)",
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
                textTransform: "uppercase", letterSpacing: "0.8px" }}>{t("Selling Price / piece")}</div>
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
              {costPrice > 0 && (
                <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 4 }}>
                  MRP {INR(mrp)} · Cost {INR(costPrice)}
                </div>
              )}
            </div>
          )}

          <div style={{ background: "var(--bg1)", border: "1px solid var(--rule)", borderRadius: 12,
            padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{t("Amount")} ({pieces} pcs × {INR(sellingPrice)})</div>
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
function CartPanel({ items, onRemove, onBill, t }) {
  const [customer, setCustomer] = useState({ name: "", phone: "" })
  const [payment,  setPayment]  = useState("cash")
  const [applyGst, setApplyGst] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [err,      setErr]      = useState("")

  const subtotal  = items.reduce((s, i) => s + i.amount, 0)
  const gstAmount = applyGst
    ? items.reduce((s, i) => s + i.amount * (i.gst_percent / 100), 0)
    : 0
  const total = subtotal + gstAmount

  async function checkout() {
    if (!items.length) return
    setLoading(true); setErr("")
    try {
      const sale = await BangleSales.create({
        items:          items.map(({ _id, ...rest }) => rest),
        customer_name:  customer.name  || null,
        customer_phone: customer.phone || null,
        payment_mode:   payment,
        apply_gst:      applyGst,
      })
      onBill(sale)
      setCustomer({ name: "", phone: "" }); setPayment("cash"); setApplyGst(false)
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
        {items.map(item => (
          <div key={item._id} style={{ display: "flex", alignItems: "flex-start", gap: 8,
            padding: "10px", borderRadius: 10, marginBottom: 6,
            background: "var(--bg1)", border: "1px solid var(--rule)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{item.product_name}</div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
                {[item.colour, item.size, item.design].filter(Boolean).join(" · ")}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 2 }}>
                {item.unit_qty} {item.unit} ({item.pieces} pcs) × {INR(item.unit_price)}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{INR(item.amount)}</div>
              <button onClick={() => onRemove(item._id)}
                style={{ fontSize: 10, color: "var(--ember)", background: "none", border: "none",
                  cursor: "pointer", padding: 0, marginTop: 4 }}>Remove</button>
            </div>
          </div>
        ))}
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

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <input type="checkbox" id="gst-toggle" checked={applyGst}
            onChange={e => setApplyGst(e.target.checked)}
            style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--saffron)" }} />
          <label htmlFor="gst-toggle" style={{ fontSize: 12, color: "var(--ink-dim)", cursor: "pointer" }}>
            {t("Apply GST")}
          </label>
        </div>

        {applyGst && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12,
            color: "var(--ink-dim)", marginBottom: 4 }}>
            <span>Subtotal</span><span>{INR(subtotal)}</span>
          </div>
        )}
        {applyGst && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12,
            color: "var(--ink-dim)", marginBottom: 6 }}>
            <span>GST</span><span>{INR(gstAmount)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18,
          fontWeight: 800, color: "var(--saffron)", marginBottom: 10 }}>
          <span>Total</span><span>{INR(total)}</span>
        </div>

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
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [cart,     setCart]     = useState([])
  const [receipt,  setReceipt]  = useState(null)
  const [tab,      setTab]      = useState("items")
  const [today,    setToday]    = useState(null)
  const [offline,  setOffline]  = useState(!navigator.onLine)
  const [pending,  setPending]  = useState(BangleSync.pendingCount())
  const [syncing,  setSyncing]  = useState(false)

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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
      background: "var(--bg0)" }}>

      {receipt && (
        <ReceiptModal sale={receipt} storeName={storeName}
          onClose={() => setReceipt(null)}
          onNewBill={() => { setReceipt(null); setTab("items") }} />
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
      <div className="mobile-billing-tabs"
        style={{ display: "none", background: "var(--bg1)", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
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
            <ProductPicker products={products} onAdd={addToCart} t={t} />
          </div>
          <div className={`billing-right${tab === "items" ? " billing-hidden-mobile" : ""}`}
            style={{ width: 340, minWidth: 280, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <CartPanel items={cart} onRemove={removeFromCart} onBill={onBill} t={t} />
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 680px) {
          .mobile-billing-tabs { display: flex !important; }
          .billing-layout { display: block !important; height: 100%; }
          .billing-left, .billing-right { width: 100% !important; height: 100%; border-right: none !important; }
          .billing-hidden-mobile { display: none !important; }
        }
      `}</style>
    </div>
  )
}
