import { useState, useEffect } from "react"
import VoiceAgent from "../voice/VoiceAgent.jsx"
import { Invoices, Products } from "../sync/db.js"
import { useAuth } from "../context/AuthContext.jsx"

const INR = n => "₹" + Math.round(Math.abs(n||0)).toLocaleString("en-IN")

export default function Voice() {
  const { vendor } = useAuth()
  const [billItems, setBillItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dk_voice_bill") || "[]") }
    catch { return [] }
  })
  const [notif,    setNotif]    = useState("")
  const [invoice,  setInvoice]  = useState(null)
  const [lang, setLang]     = useState(getSavedLang)
  const [customer, setCustomer] = useState("")
  const [payment,  setPayment]  = useState("Cash")
  const [generating, setGenerating] = useState(false)

  const isSafari    = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const isIOS       = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isCapacitor = !!(window.Capacitor?.isNativePlatform?.())

  useEffect(() => {
    localStorage.setItem("dk_voice_bill", JSON.stringify(billItems))
  }, [billItems])

  function showNotif(msg) { setNotif(msg); setTimeout(() => setNotif(""), 3000) }

  function openInChrome() {
    const url = "https://dukhaan-ai.vercel.app/voice"
    try {
      window.open(`intent://${url.replace("https://","")}#Intent;scheme=https;package=com.android.chrome;end`, "_blank")
    } catch { window.open(url, "_blank") }
  }

  function handleAddToBill({ product, productName, qty, unit, price }) {
    try {
      const name      = product?.name || productName || "Unknown item"
      const mrp       = product?.mrp  || price || 0
      const gst       = product?.gst_percent || 0
      const id        = product?.id   || ("voice-" + Date.now())
      const lineTotal = Math.round(mrp * qty * 100) / 100
      setInvoice(null) // clear previous invoice
      setBillItems(items => {
        const existing = items.findIndex(i => i.id === id)
        if (existing >= 0) {
          const updated = [...items]
          updated[existing] = {
            ...updated[existing],
            qty: updated[existing].qty + qty,
            lineTotal: Math.round((updated[existing].lineTotal + lineTotal) * 100) / 100,
          }
          return updated
        }
        return [...items, { id, name, mrp, gst, qty, unit, lineTotal }]
      })
      showNotif(`✓ ${name} × ${qty} added`)
    } catch(e) { showNotif("Error: " + e.message) }
  }

  async function generateVoiceBill() {
    if (!billItems.length) return showNotif("No items in bill yet")
    setGenerating(true)
    try {
      const items = billItems.map(i => ({
        name:        i.name,
        qty:         i.qty,
        unit_price:  i.mrp,
        gst_percent: i.gst,
      }))
      const inv = await Invoices.generate({
        customer_name: customer || "Walk-in Customer",
        payment_mode:  payment,
        items,
      })
      setInvoice(inv)
      setBillItems([])
      localStorage.removeItem("dk_voice_bill")
      showNotif(`✓ Invoice ${inv.invoice_no} generated!`)
    } catch(e) { showNotif("Error: " + e.message) }
    finally { setGenerating(false) }
  }

  function sendWhatsApp() {
    if (!invoice) return
    const lines = (invoice.items||[]).map(i =>
      `• ${i.name} × ${i.qty} = ${INR(i.total)}`
    ).join("\n")
    const msg =
`🧾 *Invoice from ${vendor?.store_name || "DukaanAI"}*
Invoice No: ${invoice.invoice_no}
Customer: ${invoice.customer_name}
Date: ${new Date().toLocaleDateString("en-IN")}

${lines}

Subtotal: ${INR(invoice.subtotal)}
GST: ${INR(invoice.gst_amount)}
*Total: ${INR(invoice.total)}*

Payment: ${invoice.payment_mode}
Thank you! 🙏`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
  }

  const grandTotal    = billItems.reduce((s,i) => s + i.lineTotal, 0)
  const totalGST      = billItems.reduce((s,i) => s + (i.lineTotal * i.gst / (100 + i.gst)), 0)
  const totalSubtotal = grandTotal - totalGST

  return (
    <div className="flex-1 overflow-hidden flex flex-col" style={{ background:"var(--bg0)" }}>
      {notif && (
        <div style={{
          position:"fixed", top:16, right:16, zIndex:100,
          background:"var(--jade)", color:"var(--bg1)",
          padding:"10px 16px", borderRadius:12, fontSize:12,
          boxShadow:"0 4px 20px rgba(0,0,0,0.15)", fontWeight:500,
        }}>
          {notif}
        </div>
      )}

      {/* Header */}
      <div style={{
        background:"linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)",
        padding:"16px 20px", color:"var(--bg1)", flexShrink:0,
      }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>🎤 Voice Agent</div>
            <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>
              Telugu · Hindi · Tamil · Kannada · 6 more languages
            </div>
          </div>
          <div style={{
            background:"rgba(255,255,255,0.2)", borderRadius:20,
            padding:"4px 10px", fontSize:10, fontWeight:500,
          }}>
            Free · No API cost
          </div>
        </div>

        {/* APK banner */}
        {isCapacitor && (
          <div style={{
            marginTop:12, background:"rgba(255,255,255,0.15)",
            borderRadius:10, padding:"10px 12px",
          }}>
            <div style={{ fontSize:11, marginBottom:6, fontWeight:500 }}>
              📱 For best voice experience:
            </div>
            <button onClick={openInChrome} style={{
              background:"var(--bg1)", color:"var(--jade)", border:"none",
              borderRadius:8, padding:"7px 16px", fontSize:11,
              fontWeight:600, cursor:"pointer", width:"100%",
            }}>
              🌐 Open Voice in Chrome browser
            </button>
          </div>
        )}

        {(isSafari || isIOS) && !isCapacitor && (
          <div style={{
            marginTop:12, background:"rgba(255,255,255,0.15)",
            borderRadius:10, padding:"10px 12px", fontSize:11,
          }}>
            ⚠ Use Safari on iPhone → Settings → Safari → Microphone → Allow
          </div>
        )}
      </div>

      <div style={{ flex:1, overflow:"hidden", display:"flex", gap:0 }}>

        {/* Left — Voice Agent */}
        <div style={{ flex:1, overflowY:"auto", padding:16 }}>
          <VoiceAgent onAddToBill={handleAddToBill} onLangChange={setLang} />
        </div>

        {/* Right — Bill panel */}
        <div style={{
          width:260, flexShrink:0, borderLeft:"1px solid var(--rule-soft)",
          background:"var(--bg1)", display:"flex", flexDirection:"column",
          overflowY:"auto",
        }}>
          {/* Bill header */}
          <div style={{
            padding:"12px 14px", borderBottom:"1px solid var(--rule-soft)",
            background:"var(--bg2)",
          }}>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--jade)", marginBottom:8 }}>
              🧾 Voice Bill
            </div>
            <input
              value={customer}
              onChange={e => setCustomer(e.target.value)}
              placeholder={t("customer_name", lang)}
              style={{
                width:"100%", border:"1px solid var(--rule)", borderRadius:8,
                padding:"6px 10px", fontSize:11, marginBottom:6,
                outline:"none", boxSizing:"border-box",
              }}
            />
            <select value={payment} onChange={e => setPayment(e.target.value)}
              style={{
                width:"100%", border:"1px solid var(--rule)", borderRadius:8,
                padding:"6px 10px", fontSize:11, background:"var(--bg1)",
                outline:"none", boxSizing:"border-box",
              }}>
              <option>Cash</option>
              <option>UPI</option>
              <option>Credit</option>
              <option>Cheque</option>
            </select>
          </div>

          {/* Bill items */}
          <div style={{ flex:1, overflowY:"auto", padding:"10px 14px" }}>
            {billItems.length === 0 && !invoice ? (
              <div style={{
                textAlign:"center", padding:"40px 16px",
                color:"var(--ink-faint)", fontSize:11,
              }}>
                <div style={{ fontSize:40, marginBottom:8 }}>🎤</div>
                Speak a product name to add to bill
              </div>
            ) : invoice ? (
              /* Invoice receipt */
              <div>
                <div style={{
                  background:"var(--jade-bg)", borderRadius:10,
                  padding:"10px 12px", marginBottom:10,
                  textAlign:"center",
                }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--jade)" }}>
                    ✅ Invoice Generated!
                  </div>
                  <div style={{ fontSize:11, color:"var(--jade)", marginTop:2 }}>
                    {invoice.invoice_no}
                  </div>
                </div>

                <div style={{ fontSize:11, color:"var(--ink)", marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ color:"var(--ink-faint)" }}>Customer</span>
                    <span style={{ fontWeight:500 }}>{invoice.customer_name}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ color:"var(--ink-faint)" }}>Payment</span>
                    <span>{invoice.payment_mode}</span>
                  </div>
                </div>

                <div style={{ borderTop:"1px dashed #e5e7eb", paddingTop:8, marginBottom:8 }}>
                  {(invoice.items||[]).map((item, i) => (
                    <div key={i} style={{
                      display:"flex", justifyContent:"space-between",
                      fontSize:10, marginBottom:4, color:"var(--ink-dim)",
                    }}>
                      <span style={{ flex:1, marginRight:4 }}>{item.name} ×{item.qty}</span>
                      <span style={{ fontWeight:500 }}>{INR(item.total)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop:"1px solid var(--rule)", paddingTop:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--ink-faint)", marginBottom:2 }}>
                    <span>Subtotal</span><span>{INR(invoice.subtotal)}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--ink-faint)", marginBottom:6 }}>
                    <span>GST</span><span>{INR(invoice.gst_amount)}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, fontWeight:700, color:"var(--jade)" }}>
                    <span>Total</span><span>{INR(invoice.total)}</span>
                  </div>
                </div>

                <button onClick={sendWhatsApp} style={{
                  width:"100%", marginTop:12, padding:"10px",
                  background:"#25D366", color:"var(--bg1)", border:"none",
                  borderRadius:10, fontSize:12, fontWeight:600,
                  cursor:"pointer",
                }}>
                  📲 Send on WhatsApp
                </button>
                <button onClick={() => setInvoice(null)} style={{
                  width:"100%", marginTop:6, padding:"8px",
                  background:"var(--bg2)", color:"var(--ink-faint)", border:"none",
                  borderRadius:10, fontSize:11, cursor:"pointer",
                }}>
                  New Bill
                </button>
              </div>
            ) : (
              billItems.map((item, i) => (
                <div key={item.id} style={{
                  background:"var(--bg2)", borderRadius:10,
                  padding:"8px 10px", marginBottom:8,
                  border:"1px solid #e8f5f0",
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:"#222", flex:1, paddingRight:8 }}>
                      {item.name}
                    </div>
                    <button onClick={async () => {
                        // Restore stock when item removed from bill
                        if (item.id && !item.id.startsWith("voice-")) {
                          try {
                            const prods = await Products.list()
                            const prod  = prods.find(p => p.id === item.id)
                            if (prod) {
                              await Products.update(item.id, { stock: (prod.stock || 0) + item.qty })
                            }
                          } catch(e) { console.error("Stock restore failed:", e) }
                        }
                        setBillItems(b => b.filter((_,bi) => bi !== i))
                        showNotif(`${item.name} removed — stock restored`)
                      }}
                      style={{ background:"none", border:"none", color:"var(--ink-faint)",
                        cursor:"pointer", fontSize:16, lineHeight:1 }}>
                      ×
                    </button>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                    <span style={{ fontSize:10, color:"var(--ink-faint)" }}>
                      {item.qty} {item.unit} × {INR(item.mrp)}
                      {item.gst > 0 && ` + ${item.gst}%GST`}
                    </span>
                    <span style={{ fontSize:11, fontWeight:700, color:"var(--jade)" }}>
                      {INR(item.lineTotal)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bill footer */}
          {billItems.length > 0 && !invoice && (
            <div style={{
              padding:"12px 14px", borderTop:"1px solid var(--rule-soft)",
              background:"var(--bg1)", flexShrink:0,
            }}>
              <div style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--ink-faint)", marginBottom:2 }}>
                  <span>Subtotal</span><span>{INR(totalSubtotal)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--ink-faint)", marginBottom:6 }}>
                  <span>GST</span><span>{INR(totalGST)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:15, fontWeight:700, color:"var(--jade)" }}>
                  <span>Total</span><span>{INR(grandTotal)}</span>
                </div>
              </div>
              <button onClick={generateVoiceBill} disabled={generating} style={{
                width:"100%", padding:"11px",
                background:"linear-gradient(135deg, #0F6E56, #1D9E75)",
                color:"var(--bg1)", border:"none", borderRadius:10,
                fontSize:12, fontWeight:600, cursor:"pointer",
                marginBottom:6, opacity: generating ? 0.7 : 1,
              }}>
                {generating ? "Generating..." : `🧾 ${t("generate_invoice", lang)}`}
              </button>
              <button onClick={async () => {
                  // Restore stock for ALL items when bill is cleared
                  try {
                    const prods = await Products.list()
                    for (const item of billItems) {
                      if (item.id && !item.id.startsWith("voice-")) {
                        const prod = prods.find(p => p.id === item.id)
                        if (prod) {
                          await Products.update(item.id, { stock: (prod.stock || 0) + item.qty })
                        }
                      }
                    }
                  } catch(e) { console.error("Stock restore failed:", e) }
                  setBillItems([])
                  localStorage.removeItem("dk_voice_bill")
                  showNotif("Bill cleared — stock restored")
                }} style={{
                width:"100%", padding:"8px",
                background:"var(--bg2)", color:"var(--ink-faint)",
                border:"none", borderRadius:10,
                fontSize:11, cursor:"pointer",
              }}>
                Clear Bill
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
