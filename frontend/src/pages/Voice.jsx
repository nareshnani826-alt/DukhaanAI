import { useState } from "react"
import VoiceAgent from "../voice/VoiceAgent.jsx"
import { Invoices } from "../sync/db.js"

export default function Voice() {
  const [billItems, setBillItems] = useState([])
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const isIOS    = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const [notif,     setNotif]     = useState("")

  function showNotif(msg) {
    setNotif(msg)
    setTimeout(() => setNotif(""), 3000)
  }

  // ── Called by VoiceAgent when user confirms an ADD_BILL ──
  function handleAddToBill({ product, productName, qty, unit, price }) {
    try {
      // Use product data if matched, otherwise use spoken name
      const name     = product?.name  || productName || "Unknown item"
      const mrp      = product?.mrp   || price || 0
      const gst      = product?.gst_percent || 0
      const id       = product?.id    || ("voice-" + Date.now())
      const lineTotal = Math.round(mrp * qty * (1 + gst / 100) * 100) / 100

      setBillItems(items => {
        // If same product already in bill, increase qty
        const existing = items.findIndex(i => i.id === id)
        if (existing >= 0) {
          const updated = [...items]
          updated[existing] = {
            ...updated[existing],
            qty: updated[existing].qty + qty,
            lineTotal: Math.round(updated[existing].lineTotal + lineTotal),
          }
          return updated
        }
        return [...items, { id, name, mrp, gst, qty, unit, lineTotal }]
      })

      showNotif(`✓ ${name} × ${qty} added to voice bill`)
    } catch (e) {
      showNotif("Error adding to bill: " + e.message)
      console.error("handleAddToBill error:", e)
    }
  }

  async function generateVoiceBill() {
    if (!billItems.length) return showNotif("No items in voice bill yet")
    try {
      const items = billItems.map(i => ({
        name:        i.name,
        qty:         i.qty,
        unit_price:  i.mrp,
        gst_percent: i.gst,
      }))
      const inv = await Invoices.generate({
        customer_name: "Voice Customer",
        payment_mode:  "Cash",
        items,
      })
      showNotif(`✓ Invoice ${inv.invoice_no} generated! Total: ₹${inv.total}`)
      setBillItems([])
    } catch(e) {
      showNotif("Error: " + e.message)
      console.error("generateVoiceBill error:", e)
    }
  }

  const grandTotal = billItems.reduce((sum, i) => sum + i.lineTotal, 0)

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4">
      {notif && (
        <div className="fixed top-4 right-4 bg-primary text-white px-4 py-2 rounded-lg text-xs z-50 max-w-xs shadow-lg">
          {notif}
        </div>
      )}

      {(isSafari || isIOS) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-700">
          <b>⚠ Safari/iPhone:</b> Voice input requires <b>Chrome</b> or <b>Edge</b> browser.
          <br/>
          <a href="https://dukhaan-ai.vercel.app/voice"
            className="text-primary underline mt-1 inline-block"
            onClick={e => { e.preventDefault(); window.location.href="googlechrome://dukhaan-ai.vercel.app/voice" }}>
            Open in Chrome →
          </a>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-semibold">Voice Agent</h1>
          <p className="text-[10px] text-gray-400">Speak in Telugu, Hindi, Tamil, Kannada and more</p>
        </div>
        <span className="badge badge-green">Free — No API cost</span>
      </div>

      <div className="flex gap-3 flex-1 overflow-hidden min-h-0">

        {/* Left: voice agent */}
        <div className="flex-1 overflow-y-auto">
          <VoiceAgent onAddToBill={handleAddToBill} />
        </div>

        {/* Right: live voice bill */}
        <div className="w-60 flex flex-col flex-shrink-0">
          <div className="card flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium text-gray-600">Voice Bill</div>
              {billItems.length > 0 && (
                <span className="badge badge-green">{billItems.length} items</span>
              )}
            </div>

            {billItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[10px] text-gray-300 text-center px-4">
                Items you confirm by voice will appear here
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                {billItems.map((item, i) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-2.5">
                    <div className="flex justify-between items-start">
                      <div className="text-xs font-medium text-gray-700 flex-1 truncate pr-2">
                        {item.name}
                      </div>
                      <button
                        onClick={() => setBillItems(b => b.filter((_, bi) => bi !== i))}
                        className="text-gray-300 hover:text-red-400 text-sm flex-shrink-0">
                        ×
                      </button>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-gray-400">
                        {item.qty} {item.unit} × ₹{item.mrp}
                        {item.gst > 0 && ` + ${item.gst}% GST`}
                      </span>
                      <span className="text-[10px] font-semibold text-primary">
                        ₹{item.lineTotal}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {billItems.length > 0 && (
              <div className="border-t border-gray-100 pt-3 mt-auto">
                <div className="flex justify-between text-xs font-semibold mb-3">
                  <span>Grand Total</span>
                  <span className="text-primary text-sm">₹{Math.round(grandTotal * 100) / 100}</span>
                </div>
                <button onClick={generateVoiceBill}
                  className="btn btn-primary w-full text-xs mb-1.5 py-2">
                  Generate GST Invoice
                </button>
                <button onClick={() => setBillItems([])}
                  className="btn w-full text-xs text-gray-400">
                  Clear Bill
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
