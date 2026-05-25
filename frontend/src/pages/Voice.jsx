import { useState, useEffect } from "react"
import VoiceAgent from "../voice/VoiceAgent.jsx"
import { Invoices, Products } from "../sync/db.js"
import { BangleProducts } from "../sync/bangleDb.js"
import { useAuth } from "../context/AuthContext.jsx"
import { t, getSavedLang } from "../voice/i18n.js"

const INR = n => "₹" + Math.round(Math.abs(n||0)).toLocaleString("en-IN")

function toBaseUnit(qty, spokenUnit, productUnit) {
  const su = (spokenUnit || "").toLowerCase()
  const pu = (productUnit || "").toLowerCase()
  // Always convert sub-units regardless of stored product unit
  if (su === "g")     return qty / 1000   // 100g → 0.1 kg
  if (su === "ml")    return qty / 1000   // 500ml → 0.5 litre
  if (su === "kg" && pu === "g")     return qty * 1000
  if (su === "litre" && pu === "ml") return qty * 1000
  return qty
}

function normalizeUnit(spokenUnit) {
  const su = (spokenUnit || "").toLowerCase()
  if (su === "g")  return "kg"
  if (su === "ml") return "litre"
  return spokenUnit || "pc"
}

export default function Voice() {
  const { vendor, hasModule } = useAuth()
  // Determine which store mode is active (mirrors Layout.jsx logic)
  const hasBangle = hasModule("bangle_fancy")
  const hasKirana = hasModule("kirana")
  const storeMode = hasBangle && !hasKirana
    ? "bangle_fancy"
    : !hasBangle
    ? "kirana"
    : (localStorage.getItem("storeMode") || "kirana")

  const [bangleProducts, setBangleProducts] = useState([])
  const [billItems, setBillItems] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("dk_voice_bill") || "{}")
      // Clear if it was saved for a different vendor
      if (saved.vendorId && saved.vendorId !== vendor?.id) return []
      return saved.items || []
    } catch { return [] }
  })
  const [notif,    setNotif]    = useState("")
  const [invoice,  setInvoice]  = useState(null)
  const [lang, setLang]     = useState(getSavedLang)
  const [customer, setCustomer] = useState("")
  const [payment,  setPayment]  = useState("Cash")
  const [generating, setGenerating] = useState(false)
  const [mobileTab,  setMobileTab]  = useState("voice")

  const isSafari    = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const isIOS       = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isCapacitor = !!(window.Capacitor?.isNativePlatform?.())
  const isMobile    = isCapacitor || window.innerWidth < 640

  useEffect(() => {
    BangleProducts.list().then(res => {
      const list = Array.isArray(res) ? res : (res?.data || [])
      setBangleProducts(list)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    localStorage.setItem("dk_voice_bill", JSON.stringify({ vendorId: vendor?.id, items: billItems }))
  }, [billItems, vendor?.id])

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
      const id          = product?.id   || ("voice-" + Date.now())
      const productUnit = product?.unit || null
      const billedQty   = toBaseUnit(qty, unit, productUnit)
      const dispUnit    = normalizeUnit(unit)
      const lineTotal   = Math.round(mrp * billedQty * 100) / 100
      setInvoice(null) // clear previous invoice
      setBillItems(items => {
        const existing = items.findIndex(i => i.id === id)
        if (existing >= 0) {
          const updated = [...items]
          updated[existing] = {
            ...updated[existing],
            qty: updated[existing].qty + billedQty,
            lineTotal: Math.round((updated[existing].lineTotal + lineTotal) * 100) / 100,
          }
          return updated
        }
        return [...items, { id, name, mrp, gst, qty: billedQty, unit: dispUnit, lineTotal }]
      })
      showNotif(`✓ ${name} × ${qty} added`)
    } catch(e) { showNotif("Error: " + e.message) }
  }

  async function generateVoiceBill() {
    if (!billItems.length) return showNotif("No items in bill yet")
    setGenerating(true)

    // Snapshot bill before clearing — if generation fails we still have it
    const billSnapshot = [...billItems]
    const expectedTotal = billSnapshot.reduce((s,i) => s + i.lineTotal, 0)

    // Clear bill immediately so the user cannot re-tap and create a duplicate
    setBillItems([])
    localStorage.removeItem("dk_voice_bill")

    try {
      const items = billSnapshot.map(i => ({
        ...(!i.id?.startsWith?.("voice-") && i.id ? { product_id: i.id } : {}),
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
      showNotif(`✓ Invoice ${inv.invoice_no} generated!`)
    } catch(e) {
      // Network/CORS errors mean the server may have saved the invoice anyway.
      // Try to recover the most recent invoice and match by total.
      const isNetworkErr = e.message?.toLowerCase().includes("fetch") ||
                           e.message?.toLowerCase().includes("network") ||
                           e.message?.toLowerCase().includes("failed")
      if (isNetworkErr) {
        try {
          const recent = await Invoices.list()
          const candidate = recent[0]
          if (candidate && Math.abs((candidate.total || 0) - expectedTotal) < 0.02 &&
              (Date.now() - new Date(candidate.created_at).getTime()) < 60000) {
            // Invoice was saved — surface it
            setInvoice(candidate)
            showNotif(`✓ Invoice ${candidate.invoice_no} saved!`)
            return
          }
        } catch {}
        // Can't confirm — bill is already cleared, tell user to check History
        showNotif("Network error — check Bill History to confirm the invoice was saved")
      } else {
        // Non-network error (e.g. validation) — restore the bill so user can retry
        setBillItems(billSnapshot)
        localStorage.setItem("dk_voice_bill", JSON.stringify({ vendorId: vendor?.id, items: billSnapshot }))
        showNotif("Error: " + e.message)
      }
    } finally {
      setGenerating(false)
    }
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
GST: ${INR((invoice.cgst || 0) + (invoice.sgst || 0))}
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

      {/* Header — dark brass, theme-aware */}
      <div style={{
        background:"var(--bg1)", borderBottom:"1px solid var(--rule)",
        padding:"12px 16px", flexShrink:0,
        position:"sticky", top:0, zIndex:5,
        backdropFilter:"blur(6px)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {/* mic icon badge */}
          <div style={{
            width:38, height:38, borderRadius:10, flexShrink:0,
            background:"linear-gradient(135deg, var(--brass,#c08a3a), var(--saffron,#e87722))",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 2px 8px rgba(232,119,34,0.3)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="var(--bg0,#140b06)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
              <div style={{ fontSize:16, fontWeight:700, color:"var(--ink)", lineHeight:1.1, letterSpacing:"-0.3px" }}>
                Voice Agent
              </div>
              <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:13, color:"var(--brass-lite)" }}>
                🎤 बोलो
              </div>
            </div>
            <div style={{ fontSize:10, color:"var(--ink-faint)", marginTop:2, letterSpacing:"0.3px" }}>
              Telugu · Hindi · Tamil · Kannada · 6 more
            </div>
          </div>
          {/* free badge */}
          <div style={{
            background:"var(--jade-bg,rgba(58,138,107,0.12))",
            border:"1px solid rgba(76,184,146,0.3)",
            borderRadius:20, padding:"4px 10px",
            fontSize:9, fontWeight:700, color:"var(--jade-lite,#4cb892)",
            letterSpacing:"0.5px", display:"flex", alignItems:"center", gap:4,
          }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--jade-lite,#4cb892)" }}/>
            FREE
          </div>
        </div>

        {/* Capacitor APK: native STT is active */}
        {isCapacitor && (
          <div style={{ marginTop:8, fontSize:11, color:"var(--jade-lite,#4cb892)", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--jade-lite,#4cb892)" }}/>
            Native voice · Telugu, Hindi, English &amp; 8 more
          </div>
        )}

        {/* Browser without native speech */}
        {!isCapacitor && !isSafari && !isIOS && !window.SpeechRecognition && !window.webkitSpeechRecognition && (
          <div style={{
            marginTop:10, background:"var(--bg2)", border:"1px solid var(--rule)",
            borderRadius:10, padding:"10px 12px",
          }}>
            <div style={{ fontSize:11, marginBottom:6, fontWeight:500, color:"var(--ink-dim)" }}>
              📱 For best voice experience:
            </div>
            <button onClick={openInChrome} style={{
              background:"var(--saffron)", color:"#fff", border:"none",
              borderRadius:8, padding:"7px 16px", fontSize:11,
              fontWeight:600, cursor:"pointer", width:"100%",
            }}>
              🌐 Open in Chrome for full voice support
            </button>
          </div>
        )}

        {(isSafari || isIOS) && !isCapacitor && (
          <div style={{
            marginTop:8, background:"var(--bg2)", border:"1px solid var(--rule)",
            borderRadius:10, padding:"8px 12px", fontSize:11, color:"var(--ink-dim)",
          }}>
            ⚠ iPhone: Settings → Safari → Microphone → Allow
          </div>
        )}
      </div>

      {/* ── Mobile tab bar ─────────────────────────────────── */}
      {isMobile && (
        <div style={{
          display:"flex", background:"var(--bg2)", flexShrink:0,
          borderBottom:"1px solid var(--rule-soft)",
        }}>
          {["voice","bill"].map(tab => (
            <button key={tab} onClick={() => setMobileTab(tab)} style={{
              flex:1, padding:"10px 0", border:"none",
              background: mobileTab === tab ? "var(--bg1)" : "transparent",
              borderBottom: mobileTab === tab ? "2px solid var(--jade)" : "2px solid transparent",
              fontSize:12, fontWeight: mobileTab === tab ? 700 : 400,
              color: mobileTab === tab ? "var(--jade)" : "var(--ink-faint)",
              cursor:"pointer",
            }}>
              {tab === "voice" ? "🎤 Voice" : `🧾 Bill${billItems.length > 0 ? ` (${billItems.length})` : ""}`}
            </button>
          ))}
        </div>
      )}

      {/* ── Content area ───────────────────────────────────── */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", gap:0 }}>

        {/* Voice panel — always visible on desktop; visible on mobile only in "voice" tab */}
        {(!isMobile || mobileTab === "voice") && (
          <div style={{
            flex:1, overflowY:"auto", padding:16,
            paddingBottom: isMobile ? 88 : 16,
          }}>
            <VoiceAgent onAddToBill={handleAddToBill} onLangChange={setLang} extraProducts={bangleProducts} storeMode={storeMode} />

            {/* Floating pill — mobile only, when items are in the bill */}
            {isMobile && billItems.length > 0 && (
              <div
                onClick={() => setMobileTab("bill")}
                style={{
                  position:"fixed", bottom:76, left:"50%", transform:"translateX(-50%)",
                  background:"linear-gradient(135deg, #0F6E56, #1D9E75)",
                  color:"#fff", borderRadius:24, padding:"10px 22px",
                  fontSize:13, fontWeight:700, cursor:"pointer", zIndex:50,
                  boxShadow:"0 4px 20px rgba(15,110,86,0.4)",
                  display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap",
                }}
              >
                🧾 {billItems.length} item{billItems.length > 1 ? "s" : ""} · {INR(grandTotal)} →
              </div>
            )}
          </div>
        )}

        {/* Bill panel — 260px sidebar on desktop; full-width tab on mobile */}
        {(!isMobile || mobileTab === "bill") && (
          <div style={{
            width: isMobile ? "100%" : 260,
            flexShrink:0,
            borderLeft: isMobile ? "none" : "1px solid var(--rule-soft)",
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
                <div style={{ textAlign:"center", padding:"40px 16px", color:"var(--ink-faint)", fontSize:11 }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
                  Invoice ready
                </div>
              ) : (
                billItems.map((item, i) => (
                  <div key={item.id} style={{
                    background:"var(--bg2)", borderRadius:10,
                    padding:"8px 10px", marginBottom:8,
                    border:"1px solid var(--rule-soft)",
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"#222", flex:1, paddingRight:8 }}>
                        {item.name}
                      </div>
                      <button onClick={async () => {
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
                paddingBottom: isMobile ? 88 : 12,
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
        )}
      </div>

      {/* ── Invoice Modal ──────────────────────────────────── */}
      {invoice && (
        <div style={{
          position:"fixed", inset:0, zIndex:200,
          background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)",
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:20,
        }}>
          <div style={{
            background:"var(--bg1)", borderRadius:20, width:"100%",
            maxWidth:480, maxHeight:"90vh", overflowY:"auto",
            boxShadow:"0 24px 60px rgba(0,0,0,0.4)",
            border:"1px solid var(--rule)",
          }}>
            {/* Modal header */}
            <div style={{
              background:"linear-gradient(135deg, var(--jade,#1a7a4a), var(--jade-lite,#27ae60))",
              borderRadius:"20px 20px 0 0", padding:"20px 20px 16px",
              textAlign:"center",
            }}>
              <div style={{ fontSize:36, marginBottom:8 }}>✅</div>
              <div style={{ fontSize:18, fontWeight:800, color:"#fff" }}>Invoice Generated!</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", marginTop:4 }}>
                {invoice.invoice_no}
              </div>
            </div>

            {/* Invoice details */}
            <div style={{ padding:"20px 20px 0" }}>
              {/* Customer + payment */}
              <div style={{
                background:"var(--bg2)", borderRadius:12, padding:"12px 14px",
                marginBottom:14,
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:11, color:"var(--ink-faint)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Customer</span>
                  <span style={{ fontSize:13, fontWeight:600, color:"var(--ink)" }}>{invoice.customer_name}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:11, color:"var(--ink-faint)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Date</span>
                  <span style={{ fontSize:13, color:"var(--ink)" }}>{new Date().toLocaleDateString("en-IN", {day:"numeric", month:"short", year:"numeric"})}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:11, color:"var(--ink-faint)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Payment</span>
                  <span style={{ fontSize:13, color:"var(--ink)" }}>{invoice.payment_mode}</span>
                </div>
              </div>

              {/* Items */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:"var(--ink-faint)", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>Items</div>
                {(invoice.items||[]).map((item, i) => (
                  <div key={i} style={{
                    display:"flex", justifyContent:"space-between", alignItems:"baseline",
                    padding:"8px 0", borderBottom: i < invoice.items.length-1 ? "1px solid var(--rule-soft)" : "none",
                  }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)" }}>{item.name}</div>
                      <div style={{ fontSize:11, color:"var(--ink-faint)" }}>×{item.qty} @ {INR(item.unit_price || item.total/item.qty)}</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)" }}>{INR(item.total)}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{
                borderTop:"2px dashed var(--rule)", paddingTop:12, marginBottom:20,
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--ink-faint)", marginBottom:6 }}>
                  <span>Subtotal</span><span>{INR(invoice.subtotal)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--ink-faint)", marginBottom:10 }}>
                  <span>GST</span><span>{INR((invoice.cgst || 0) + (invoice.sgst || 0))}</span>
                </div>
                <div style={{
                  display:"flex", justifyContent:"space-between", alignItems:"baseline",
                  background:"var(--bg2)", borderRadius:10, padding:"12px 14px",
                }}>
                  <span style={{ fontSize:14, fontWeight:700, color:"var(--ink)" }}>Total</span>
                  <span style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:28, fontWeight:800, color:"var(--jade,#1a7a4a)" }}>{INR(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ padding:"0 20px 20px", display:"flex", flexDirection:"column", gap:10 }}>
              {/* WhatsApp */}
              <button onClick={sendWhatsApp} style={{
                width:"100%", padding:"14px",
                background:"#25D366", color:"#fff", border:"none",
                borderRadius:12, fontSize:14, fontWeight:700,
                cursor:"pointer", display:"flex", alignItems:"center",
                justifyContent:"center", gap:10,
                boxShadow:"0 4px 16px rgba(37,211,102,0.4)",
              }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.5 3.5A11 11 0 003.6 17.4L2 22l4.7-1.5A11 11 0 1020.5 3.5zm-8.5 17a8.5 8.5 0 01-4.3-1.2l-.3-.2-2.8.9.9-2.7-.2-.3a8.5 8.5 0 1112.7-3.5 8.5 8.5 0 01-6 7zm4.7-6.4c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.6.1a7 7 0 01-3.4-3c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.5l-.8-2c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3a3 3 0 00-1 2.2c0 1.3 1 2.6 1.1 2.8.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.1-1.4-.1-.1-.3-.2-.5-.3z"/>
                </svg>
                Send on WhatsApp
              </button>

              {/* Print */}
              <button onClick={() => window.print()} style={{
                width:"100%", padding:"12px",
                background:"var(--bg2)", color:"var(--ink)", border:"1px solid var(--rule)",
                borderRadius:12, fontSize:13, fontWeight:600,
                cursor:"pointer", display:"flex", alignItems:"center",
                justifyContent:"center", gap:8,
              }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print Invoice
              </button>

              {/* New bill */}
              <button onClick={() => setInvoice(null)} style={{
                width:"100%", padding:"10px",
                background:"transparent", color:"var(--ink-faint)",
                border:"1px dashed var(--rule)", borderRadius:12,
                fontSize:12, cursor:"pointer",
              }}>
                + Start New Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
