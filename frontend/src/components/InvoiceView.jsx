import { useAuth } from "../context/AuthContext.jsx"

function toWords(amount) {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"]
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"]
  function b100(n) {
    return n < 20 ? ones[n] : tens[Math.floor(n/10)] + (n%10 ? " "+ones[n%10] : "")
  }
  function b1000(n) {
    return n < 100 ? b100(n) : ones[Math.floor(n/100)]+" Hundred"+(n%100 ? " "+b100(n%100) : "")
  }
  const n = Math.round(amount)
  if (!n) return "Zero Rupees Only"
  const cr = Math.floor(n/10000000)
  const lk = Math.floor((n%10000000)/100000)
  const th = Math.floor((n%100000)/1000)
  const rt = n%1000
  let w = ""
  if (cr) w += b1000(cr)+" Crore "
  if (lk) w += b100(lk)+" Lakh "
  if (th) w += b1000(th)+" Thousand "
  if (rt) w += b1000(rt)
  return w.trim()+" Rupees Only"
}

const PAY_ICON = { Cash:"💵", UPI:"📱", Credit:"📋", Cheque:"🏦" }

export default function InvoiceView({ invoice, customerPhone }) {
  const { vendor } = useAuth()

  const date = new Date(invoice.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  })

  return (
    <div style={{
      fontFamily: "'Segoe UI', Arial, sans-serif",
      background: "#fff",
      color: "#1a1a1a",
      width: "100%",
      fontSize: 12,
    }}>
      {/* Top accent bar */}
      <div style={{ height: 4, background: "linear-gradient(90deg, #0a4d3c, #1D9E75, #27AE60)" }} />

      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ padding: "18px 22px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        {/* Store branding */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg, #0a4d3c, #1D9E75)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 18, fontWeight: 900,
            }}>
              {(vendor?.store_name || "D")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#0a4d3c", letterSpacing: "-0.4px", lineHeight: 1.15 }}>
                {vendor?.store_name || "DukhaanAI"}
              </div>
              {vendor?.gstin && (
                <div style={{ fontSize: 10, color: "#666", marginTop: 1 }}>
                  GSTIN: <span style={{ fontWeight: 600 }}>{vendor.gstin}</span>
                </div>
              )}
            </div>
          </div>
          {vendor?.address && (
            <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>📍 {vendor.address}</div>
          )}
          {vendor?.phone && (
            <div style={{ fontSize: 10, color: "#555" }}>📞 {vendor.phone}</div>
          )}
        </div>

        {/* Invoice meta */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            display: "inline-block",
            background: "#0a4d3c", color: "#fff",
            padding: "3px 11px", borderRadius: 20,
            fontSize: 9, fontWeight: 800, letterSpacing: "2px",
            marginBottom: 8,
          }}>TAX INVOICE</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.3px" }}>
            {invoice.invoice_no}
          </div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>{date}</div>
          <div style={{
            marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4,
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 6, padding: "2px 8px",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
            <span style={{ fontSize: 9, color: "#16a34a", fontWeight: 700, letterSpacing: "0.5px" }}>
              {(invoice.status || "PAID").toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1.5px dashed #d1fae5", margin: "0 22px" }} />

      {/* ── Bill To + Payment ─────────────────────────────── */}
      <div style={{ padding: "12px 22px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", color: "#888", textTransform: "uppercase", marginBottom: 5 }}>Bill To</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{invoice.customer_name}</div>
          {(invoice.customer_phone || customerPhone) && (
            <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>📞 {invoice.customer_phone || customerPhone}</div>
          )}
          {invoice.customer_gstin && (
            <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>GSTIN: {invoice.customer_gstin}</div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", color: "#888", textTransform: "uppercase", marginBottom: 5 }}>Payment Mode</div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "#f9fafb", border: "1px solid #e5e7eb",
            borderRadius: 8, padding: "5px 12px",
            fontSize: 12, fontWeight: 600, color: "#374151",
          }}>
            {PAY_ICON[invoice.payment_mode] || "💰"} {invoice.payment_mode}
          </div>
        </div>
      </div>

      {/* ── Items table ───────────────────────────────────── */}
      <div style={{ padding: "0 22px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#0a4d3c" }}>
              <th style={{ padding: "8px 8px", textAlign: "left", color: "rgba(255,255,255,0.85)", fontWeight: 600, width: 26, borderRadius: "6px 0 0 0" }}>#</th>
              <th style={{ padding: "8px 8px", textAlign: "left", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>Item Description</th>
              <th style={{ padding: "8px 8px", textAlign: "center", color: "rgba(255,255,255,0.85)", fontWeight: 600, width: 42 }}>Qty</th>
              <th style={{ padding: "8px 8px", textAlign: "right", color: "rgba(255,255,255,0.85)", fontWeight: 600, width: 68 }}>Rate</th>
              <th style={{ padding: "8px 8px", textAlign: "right", color: "rgba(255,255,255,0.85)", fontWeight: 600, width: 72 }}>Taxable</th>
              <th style={{ padding: "8px 8px", textAlign: "center", color: "rgba(255,255,255,0.85)", fontWeight: 600, width: 44 }}>GST%</th>
              <th style={{ padding: "8px 8px", textAlign: "right", color: "rgba(255,255,255,0.85)", fontWeight: 600, width: 60 }}>Tax</th>
              <th style={{ padding: "8px 8px", textAlign: "right", color: "#fff", fontWeight: 700, width: 72, borderRadius: "0 6px 0 0" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item, i) => {
              const taxable = item.subtotal != null ? item.subtotal : Math.round(item.unit_price * item.qty * 100) / 100
              const tax     = item.tax     != null ? item.tax     : Math.round(taxable * (item.gst_percent || 0) / 100 * 100) / 100
              const total   = item.total   != null ? item.total   : Math.round((taxable + tax) * 100) / 100
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fffe", borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "9px 8px", color: "#aaa", fontWeight: 600, textAlign: "center" }}>{i+1}</td>
                  <td style={{ padding: "9px 8px" }}>
                    <div style={{ fontWeight: 600, color: "#1a1a1a" }}>{item.name}</div>
                  </td>
                  <td style={{ padding: "9px 8px", textAlign: "center", color: "#374151" }}>{item.qty}</td>
                  <td style={{ padding: "9px 8px", textAlign: "right", color: "#374151" }}>₹{item.unit_price}</td>
                  <td style={{ padding: "9px 8px", textAlign: "right", color: "#374151" }}>₹{taxable}</td>
                  <td style={{ padding: "9px 8px", textAlign: "center", color: "#374151" }}>{item.gst_percent || 0}%</td>
                  <td style={{ padding: "9px 8px", textAlign: "right", color: "#374151" }}>₹{tax}</td>
                  <td style={{ padding: "9px 8px", textAlign: "right", fontWeight: 700, color: "#0a4d3c" }}>₹{total}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Totals ────────────────────────────────────────── */}
      <div style={{ padding: "14px 22px", display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 260 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#666" }}>
            <span>Taxable Amount</span><span>₹{invoice.subtotal}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#666" }}>
            <span>CGST</span><span>₹{invoice.cgst}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", paddingBottom: 10, color: "#666", borderBottom: "1.5px solid #e5e7eb", marginBottom: 8 }}>
            <span>SGST</span><span>₹{invoice.sgst}</span>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "linear-gradient(135deg, #0a4d3c, #1D9E75)",
            borderRadius: 10, padding: "10px 14px",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Grand Total</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>₹{invoice.total}</span>
          </div>
        </div>
      </div>

      {/* ── Amount in words ───────────────────────────────── */}
      <div style={{ padding: "0 22px 14px" }}>
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "7px 12px" }}>
          <span style={{ fontSize: 9, color: "#888", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>Amount in Words: </span>
          <span style={{ fontSize: 11, color: "#374151", fontStyle: "italic" }}>{toWords(invoice.total)}</span>
        </div>
      </div>

      {/* ── Signature + T&C ───────────────────────────────── */}
      <div style={{ padding: "0 22px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#aaa", lineHeight: 1.7 }}>
          <div>E. &amp; O.E.</div>
          <div>This is a computer-generated invoice.</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #374151", paddingTop: 6, width: 140 }}>
            <div style={{ fontSize: 10, color: "#666" }}>Authorised Signatory</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginTop: 2 }}>
              {vendor?.store_name || "DukhaanAI"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0a4d3c, #1D9E75)",
        padding: "10px 22px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>Thank you for your business! 🙏</div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", marginTop: 3, letterSpacing: "1px" }}>
          POWERED BY DUKHAANAI
        </div>
      </div>
    </div>
  )
}
