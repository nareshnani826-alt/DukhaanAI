import { useAuth } from "../context/AuthContext.jsx"
import PrinterButton from "./PrinterButton.jsx"
import UPIQRCode from "./UPIQRCode.jsx"

/* ── helpers ─────────────────────────────────────────────────── */
function toWords(amount) {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"]
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"]
  function b100(n) { return n < 20 ? ones[n] : tens[Math.floor(n/10)] + (n%10 ? " "+ones[n%10] : "") }
  function b1k(n)  { return n < 100 ? b100(n) : ones[Math.floor(n/100)]+" Hundred"+(n%100 ? " "+b100(n%100) : "") }
  const n = Math.round(amount)
  if (!n) return "Zero Rupees Only"
  const cr = Math.floor(n/10000000), lk = Math.floor((n%10000000)/100000)
  const th = Math.floor((n%100000)/1000),  rt = n%1000
  let w = ""
  if (cr) w += b1k(cr)+" Crore "
  if (lk) w += b100(lk)+" Lakh "
  if (th) w += b1k(th)+" Thousand "
  if (rt) w += b1k(rt)
  return w.trim()+" Rupees Only"
}

const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/* ── Shared invoice layout (Kirana + Bangle) ─────────────────── */
export default function InvoiceView({ invoice, customerPhone }) {
  const { vendor } = useAuth()

  const date = new Date(invoice.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  })
  const time = new Date(invoice.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  })

  // Normalise items: works for both Kirana and Bangle sale structures
  const items = (invoice.items || []).map((it, i) => {
    const desc  = it.name || [it.product_name, it.colour, it.size, it.design].filter(Boolean).join(" · ")
    const qty   = it.qty   ?? `${it.unit_qty} ${it.unit || ""}`.trim()
    const rate  = it.unit_price ?? (it.mrp || 0)
    const tax   = it.tax   ?? 0
    const taxPc = it.gst_percent ?? 0
    const taxable = it.subtotal ?? Math.round((rate * (it.qty || it.unit_qty || 1)) * 100) / 100
    const total = it.total ?? it.amount ?? taxable + tax
    return { sl: i + 1, desc, qty, rate, taxable, taxPc, tax, total }
  })

  const subtotal   = invoice.subtotal   ?? items.reduce((s, i) => s + i.taxable, 0)
  const totalTax   = (invoice.cgst ?? 0) + (invoice.sgst ?? 0) || invoice.gst_amount || 0
  const grandTotal = invoice.total

  const SAFFRON  = "#E87722"
  const SAFFRON2 = "#C25500"
  const JADE     = "#1D9E75"
  const INK      = "#1a1a1a"
  const LIGHT    = "#FFF8F2"

  return (
    <div style={{
      fontFamily: "'Segoe UI', Arial, sans-serif",
      background: "#fff",
      color: INK,
      width: "100%",
      fontSize: 12,
    }}>

      {/* ── Top accent bar ── */}
      <div style={{ height: 6, background: `linear-gradient(90deg, ${SAFFRON}, ${SAFFRON2})` }} />

      {/* ══ HEADER: Logo left · INVOICE right ═══════════════════ */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "20px 24px 16px", gap: 12,
      }}>

        {/* Left: Logo + store info */}
        <div style={{ flex: 1 }}>
          {/* Logo mark */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 11, flexShrink: 0,
              background: `linear-gradient(135deg, ${SAFFRON}, ${SAFFRON2})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 3px 10px ${SAFFRON}55`,
            }}>
              {/* Mini shop SVG */}
              <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
                <path d="M8 23L24 11L40 23Z" fill="white"/>
                <rect x="9" y="23" width="30" height="17" rx="1" fill="white"/>
                <path d="M18.5 40L18.5 33C18.5 30 21 28 24 28C27 28 29.5 30 29.5 33L29.5 40Z" fill={SAFFRON}/>
                <rect x="11" y="25.5" width="6" height="5" rx="1" fill={SAFFRON} opacity="0.45"/>
                <rect x="31" y="25.5" width="6" height="5" rx="1" fill={SAFFRON} opacity="0.45"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: SAFFRON2, letterSpacing: "-0.3px", lineHeight: 1.15 }}>
                {vendor?.store_name || "DukaanAI"}
              </div>
              {vendor?.gstin && (
                <div style={{ fontSize: 9, color: "#777", marginTop: 1 }}>
                  GSTIN: <b>{vendor.gstin}</b>
                </div>
              )}
            </div>
          </div>
          {vendor?.address && <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>📍 {vendor.address}</div>}
          {vendor?.phone   && <div style={{ fontSize: 10, color: "#555" }}>📞 {vendor.phone}</div>}
        </div>

        {/* Right: INVOICE heading */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontSize: 30, fontWeight: 900, color: SAFFRON,
            letterSpacing: "-1px", lineHeight: 1,
          }}>INVOICE</div>
          <div style={{ fontSize: 9, color: "#aaa", letterSpacing: "2px", marginTop: 2 }}>TAX INVOICE</div>
          {/* Status badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8,
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 20, padding: "3px 10px",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a", display: "inline-block" }}/>
            <span style={{ fontSize: 9, color: "#16a34a", fontWeight: 700, letterSpacing: "0.5px" }}>
              {(invoice.status || "PAID").toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* ══ INFO BAR (saffron background) ════════════════════════ */}
      <div style={{
        background: LIGHT,
        borderTop: `2px solid ${SAFFRON}`,
        borderBottom: `2px solid ${SAFFRON}`,
        padding: "10px 24px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gap: 8,
      }}>
        {[
          { label: "Invoice No",    value: invoice.invoice_no || `#${invoice.id?.slice(-6).toUpperCase()}` },
          { label: "Issue Date",    value: date },
          { label: "Time",          value: time },
          { label: "Payment Mode",  value: invoice.payment_mode || "Cash" },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 8, color: "#888", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>
              {label}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: INK, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ══ BILL TO ═══════════════════════════════════════════════ */}
      <div style={{ padding: "12px 24px", borderBottom: "1px dashed #e5e7eb" }}>
        <div style={{ fontSize: 8, color: "#888", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 4 }}>
          Bill To
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{invoice.customer_name}</div>
        {(invoice.customer_phone || customerPhone) && (
          <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
            📞 {invoice.customer_phone || customerPhone}
          </div>
        )}
        {invoice.customer_gstin && (
          <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>GSTIN: {invoice.customer_gstin}</div>
        )}
      </div>

      {/* ══ ITEMS TABLE ══════════════════════════════════════════ */}
      <div style={{ padding: "0 24px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 12 }}>
          <thead>
            <tr style={{ background: `linear-gradient(90deg, ${SAFFRON}, ${SAFFRON2})` }}>
              {["SL", "Product Description", "Price", "Qty.", "Taxable", "GST%", "Tax", "Total"].map((h, i) => (
                <th key={h} style={{
                  padding: "9px 8px",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 10,
                  textAlign: i === 1 ? "left" : i === 0 ? "center" : "right",
                  letterSpacing: "0.3px",
                  borderRadius: i === 0 ? "6px 0 0 0" : i === 7 ? "0 6px 0 0" : 0,
                  whiteSpace: "nowrap",
                  width: i === 0 ? 28 : i === 1 ? "auto" : i === 2 ? 64 : i === 3 ? 44 : i === 4 ? 70 : i === 5 ? 44 : i === 6 ? 58 : 72,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : LIGHT, borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "9px 8px", textAlign: "center", color: "#aaa", fontWeight: 600 }}>{item.sl}</td>
                <td style={{ padding: "9px 8px", fontWeight: 600, color: INK }}>{item.desc}</td>
                <td style={{ padding: "9px 8px", textAlign: "right", color: "#374151" }}>{INR(item.rate)}</td>
                <td style={{ padding: "9px 8px", textAlign: "right", color: "#374151" }}>{item.qty}</td>
                <td style={{ padding: "9px 8px", textAlign: "right", color: "#374151" }}>{INR(item.taxable)}</td>
                <td style={{ padding: "9px 8px", textAlign: "right", color: "#374151" }}>{item.taxPc}%</td>
                <td style={{ padding: "9px 8px", textAlign: "right", color: "#374151" }}>{INR(item.tax)}</td>
                <td style={{ padding: "9px 8px", textAlign: "right", fontWeight: 700, color: SAFFRON2 }}>{INR(item.total)}</td>
              </tr>
            ))}
            {/* Empty filler rows to match reference (min 6 rows) */}
            {items.length < 6 && [...Array(6 - items.length)].map((_, i) => (
              <tr key={"empty-"+i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                {[...Array(8)].map((_, j) => <td key={j} style={{ padding: "9px 8px", color: "#eee" }}>–</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ══ FOOTER: Terms left · Totals right ════════════════════ */}
      <div style={{
        padding: "16px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16,
      }}>
        {/* Left: Terms */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: INK, marginBottom: 4 }}>Terms &amp; Conditions</div>
          <div style={{ fontSize: 9, color: "#888", lineHeight: 1.7 }}>
            <div>• Goods once sold will not be taken back.</div>
            <div>• Subject to local jurisdiction.</div>
            <div>• E. &amp; O.E.</div>
            <div>• This is a computer-generated invoice.</div>
          </div>

          {/* Amount in words */}
          <div style={{ marginTop: 12, padding: "6px 10px", background: LIGHT, borderRadius: 6,
            border: `1px solid ${SAFFRON}33`, fontSize: 9, color: "#555" }}>
            <span style={{ fontWeight: 700, color: SAFFRON2 }}>Amount in Words: </span>
            <span style={{ fontStyle: "italic" }}>{toWords(grandTotal)}</span>
          </div>
        </div>

        {/* Right: Totals */}
        <div style={{ minWidth: 220 }}>
          {[
            { label: "Subtotal",    value: INR(subtotal) },
            { label: "CGST",        value: INR(invoice.cgst ?? totalTax / 2) },
            { label: "SGST",        value: INR(invoice.sgst ?? totalTax / 2) },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "4px 10px", fontSize: 11, color: "#666",
              borderBottom: "1px solid #f0f0f0",
            }}>
              <span>{label}</span><span>{value}</span>
            </div>
          ))}

          {/* Grand total — the red/accent box from the reference */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: `linear-gradient(135deg, ${SAFFRON}, ${SAFFRON2})`,
            borderRadius: "0 0 8px 8px",
            padding: "10px 10px",
            marginTop: 2,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
              {INR(grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* ══ SIGNATURE ROW ════════════════════════════════════════ */}
      <div style={{
        padding: "4px 24px 18px",
        display: "flex", justifyContent: "flex-end",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ height: 36 }} /> {/* space for manual signature */}
          <div style={{ borderTop: `1.5px solid ${INK}`, paddingTop: 5, width: 160 }}>
            <div style={{ fontSize: 9, color: "#888", letterSpacing: "0.5px" }}>Authorised Signatory</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: INK, marginTop: 2 }}>
              {vendor?.store_name || "DukaanAI"}
            </div>
          </div>
        </div>
      </div>

      {/* ══ FOOTER BAND ═════════════════════════════════════════ */}
      <div style={{
        background: `linear-gradient(90deg, ${SAFFRON2}, ${SAFFRON})`,
        padding: "10px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
          Thank you for your business! 🙏
        </div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", letterSpacing: "1.5px" }}>
          POWERED BY DUKAANAI
        </div>
      </div>

      {/* ══ UPI QR + PRINT ══════════════════════════════════════ */}
      <div style={{ borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
        <div style={{ padding: "14px 24px 0" }}>
          <UPIQRCode invoice={invoice} storeName={vendor?.store_name} compact={true} />
        </div>
        <div style={{
          padding: "12px 24px 14px",
          display: "flex", justifyContent: "center",
        }}>
          <PrinterButton invoice={invoice} size="md" />
        </div>
      </div>
    </div>
  )
}
