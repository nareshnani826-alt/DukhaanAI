import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"

const UPI_KEY = "dk_upi_vpa"

export function getUPIVpa()        { try { return localStorage.getItem(UPI_KEY) || "" } catch { return "" } }
export function saveUPIVpa(v)      { try { localStorage.setItem(UPI_KEY, v.trim()) } catch {} }

// Build UPI deep-link URL
function buildUPIUrl(vpa, storeName, amount, invoiceNo) {
  const params = new URLSearchParams({
    pa: vpa,
    pn: storeName || "DukaanAI",
    am: Number(amount || 0).toFixed(2),
    cu: "INR",
    tn: `Payment for ${invoiceNo || "Invoice"}`,
    tr: invoiceNo || "",
  })
  return `upi://pay?${params.toString()}`
}

// ── UPIQRCode ─────────────────────────────────────────────────
// Shows a UPI QR code for the given invoice amount.
// If no UPI VPA is saved, shows a one-time setup prompt.
export default function UPIQRCode({ invoice, storeName, compact = false }) {
  const canvasRef  = useRef(null)
  const [vpa,      setVpa]      = useState(getUPIVpa)
  const [editMode, setEditMode] = useState(!getUPIVpa())
  const [draft,    setDraft]    = useState(getUPIVpa)
  const [copied,   setCopied]   = useState(false)

  const amount    = Number(invoice?.total || 0).toFixed(2)
  const invoiceNo = invoice?.invoice_no || ""
  const upiUrl    = vpa ? buildUPIUrl(vpa, storeName, amount, invoiceNo) : null

  // Generate QR whenever UPI URL changes
  useEffect(() => {
    if (!upiUrl || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, upiUrl, {
      width:         compact ? 160 : 200,
      margin:        1,
      color:         { dark: "#1a1a1a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).catch(() => {})
  }, [upiUrl, compact])

  function saveVpa() {
    const v = draft.trim()
    if (!v) return
    saveUPIVpa(v)
    setVpa(v)
    setEditMode(false)
  }

  function copyUPI() {
    navigator.clipboard?.writeText(vpa).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Setup prompt (no UPI ID saved) ───────────────────────
  if (editMode) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #f0faf6, #e6f7f1)",
        border: "1.5px solid #a7dfc9",
        borderRadius: 16, padding: "16px 18px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>📱</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0a5c3e" }}>
              Enable UPI Payments
            </div>
            <div style={{ fontSize: 11, color: "#2d7a5a" }}>
              Customers scan & pay instantly — no cash handling
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="yourname@upi or 9876543210@paytm"
            onKeyDown={e => e.key === "Enter" && saveVpa()}
            style={{
              flex: 1, padding: "10px 12px", borderRadius: 10,
              border: "1.5px solid #a7dfc9", fontSize: 12,
              background: "#fff", outline: "none",
            }}
            autoFocus
          />
          <button onClick={saveVpa}
            style={{
              padding: "10px 16px", borderRadius: 10, border: "none",
              background: "#1D9E75", color: "#fff",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              whiteSpace: "nowrap",
            }}>
            Save →
          </button>
        </div>

        <div style={{ fontSize: 10, color: "#2d7a5a", lineHeight: 1.5 }}>
          Your UPI ID is like: <b>9876543210@paytm</b>, <b>name@okaxis</b>, <b>name@ybl</b>
          — find it in your GPay / PhonePe / Paytm app settings.
        </div>
      </div>
    )
  }

  // ── QR Display ────────────────────────────────────────────
  return (
    <div style={{
      background: "#fff",
      border: "2px solid #e6f7f1",
      borderRadius: 16,
      padding: compact ? "12px" : "16px",
      display: "flex",
      flexDirection: compact ? "row" : "column",
      alignItems: "center",
      gap: compact ? 14 : 10,
    }}>

      {/* QR canvas */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <canvas ref={canvasRef} style={{ borderRadius: 10, display: "block" }} />
        {/* UPI logo overlay */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 32, height: 32, borderRadius: 6,
          background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 0 2px #fff",
          fontSize: 18,
        }}>
          💳
        </div>
      </div>

      {/* Info panel */}
      <div style={{ flex: 1, textAlign: compact ? "left" : "center" }}>
        <div style={{
          fontSize: compact ? 20 : 26, fontWeight: 900,
          color: "#1D9E75", lineHeight: 1,
        }}>
          ₹{amount}
        </div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
          Scan with <b>GPay · PhonePe · Paytm</b>
        </div>
        <div style={{
          marginTop: 6, fontSize: 10,
          display: "flex", alignItems: "center", gap: 6,
          justifyContent: compact ? "flex-start" : "center",
        }}>
          <span style={{ color: "#888" }}>{vpa}</span>
          <button onClick={copyUPI}
            style={{
              padding: "2px 8px", borderRadius: 6,
              border: "1px solid #ddd", background: "#f5f5f5",
              fontSize: 9, fontWeight: 600, cursor: "pointer",
              color: copied ? "#1D9E75" : "#555",
            }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
          <button onClick={() => { setDraft(vpa); setEditMode(true) }}
            style={{
              padding: "2px 6px", borderRadius: 6, border: "none",
              background: "none", fontSize: 9, color: "#aaa", cursor: "pointer",
            }}>
            Edit
          </button>
        </div>

        {/* UPI app icons */}
        {!compact && (
          <div style={{
            display: "flex", justifyContent: "center", gap: 8, marginTop: 8,
          }}>
            {[
              { name: "GPay",     emoji: "🟢" },
              { name: "PhonePe",  emoji: "🟣" },
              { name: "Paytm",    emoji: "🔵" },
              { name: "BHIM",     emoji: "🟠" },
            ].map(app => (
              <div key={app.name} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 2, fontSize: 9, color: "#888",
              }}>
                <span style={{ fontSize: 16 }}>{app.emoji}</span>
                {app.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
