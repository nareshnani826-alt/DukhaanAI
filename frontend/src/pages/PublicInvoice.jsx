// Public, unauthenticated invoice view — opened by a customer from the
// WhatsApp bill notification link. No login, no vendor context: everything
// needed to render comes from GET /invoices/public/:id (Kirana) or
// GET /bangle/sales/public/:id (Bangle) — both return the same shape.
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { api } from "../sync/db"

const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PublicInvoice() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [error,   setError]   = useState("")

  useEffect(() => {
    // The id is a UUID from one of two separate tables (Kirana invoices vs
    // Bangle sales) — try Kirana first, fall back to Bangle on a 404.
    api.get(`/invoices/public/${id}`)
      .catch(e => {
        if (e.status === 404) return api.get(`/bangle/sales/public/${id}`)
        throw e
      })
      .then(setInvoice)
      .catch(e => setError(e.message || "Could not load this invoice"))
  }, [id])

  if (error) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, textAlign: "center", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#333" }}>{error}</div>
      </div>
    </div>
  )

  if (!invoice) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, color: "#999", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      Loading your bill…
    </div>
  )

  const SAFFRON = "#E87722", SAFFRON2 = "#C25500", INK = "#1a1a1a"
  const date = new Date(invoice.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <div style={{ minHeight: "100dvh", background: "#f3f4f6", padding: "24px 12px",
      fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", background: "#fff", borderRadius: 16,
        overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}>

        <div style={{ height: 6, background: `linear-gradient(90deg, ${SAFFRON}, ${SAFFRON2})` }} />

        <div style={{ padding: "20px 22px 14px" }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: SAFFRON2 }}>{invoice.store_name}</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
            Invoice {invoice.invoice_no} · {date}
          </div>
        </div>

        <div style={{ padding: "0 22px 14px" }}>
          <div style={{ fontSize: 11, color: "#888", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Bill To
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginTop: 2 }}>{invoice.customer_name}</div>
        </div>

        <div style={{ padding: "0 22px" }}>
          {(invoice.items || []).map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between",
              padding: "10px 0", borderBottom: "1px solid #f0f0f0", gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>
                  {item.qty} × {INR(item.unit_price)}{item.gst_percent > 0 ? ` · GST ${item.gst_percent}%` : ""}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: SAFFRON2, whiteSpace: "nowrap" }}>
                {INR(item.total)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "14px 22px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 4 }}>
            <span>Subtotal</span><span>{INR(invoice.subtotal)}</span>
          </div>
          {(invoice.cgst > 0 || invoice.sgst > 0) && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 4 }}>
                <span>CGST</span><span>{INR(invoice.cgst)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 4 }}>
                <span>SGST</span><span>{INR(invoice.sgst)}</span>
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            background: `linear-gradient(135deg, ${SAFFRON}, ${SAFFRON2})`,
            borderRadius: 10, padding: "12px 14px", marginTop: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{INR(invoice.total)}</span>
          </div>
        </div>

        <div style={{ padding: "12px 22px", background: "#fafafa", borderTop: "1px solid #f0f0f0",
          textAlign: "center", fontSize: 11, color: "#999" }}>
          Thank you for your business! 🙏 · Powered by DukaanAI
        </div>
      </div>
    </div>
  )
}
