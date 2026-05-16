import { useState, useEffect, useRef } from "react"
import { voiceEngine, speak } from "./engine.js"
import { parseVoiceCommand, formatConfirmation } from "./nlp.js"
import { LANGUAGES } from "./languages.js"
import { Products } from "../sync/db.js"

const pulseStyle = `
  @keyframes mic-pulse {
    0%   { box-shadow: 0 0 0 0   rgba(29,158,117,0.6); }
    70%  { box-shadow: 0 0 0 16px rgba(29,158,117,0); }
    100% { box-shadow: 0 0 0 0   rgba(29,158,117,0); }
  }
  @keyframes wave { 0%,100%{height:8px} 50%{height:24px} }
  .mic-listening { animation: mic-pulse 1.2s ease-out infinite; background: #1D9E75 !important; }
  .wave-bar { animation: wave 0.8s ease-in-out infinite; background: #1D9E75; width: 4px; border-radius: 2px; }
  .wave-bar:nth-child(2){animation-delay:.1s}
  .wave-bar:nth-child(3){animation-delay:.2s}
  .wave-bar:nth-child(4){animation-delay:.3s}
  .wave-bar:nth-child(5){animation-delay:.15s}
`

export default function VoiceAgent({ onAddToBill }) {
  const [lang,       setLang]       = useState("te-IN")
  const [listening,  setListening]  = useState(false)
  const [transcript, setTranscript] = useState("")
  const [translated, setTranslated] = useState("")
  const [parsed,     setParsed]     = useState(null)
  const [status,     setStatus]     = useState("idle")
  const [statusMsg,  setStatusMsg]  = useState("")
  const [history,    setHistory]    = useState([])
  const [products,   setProducts]   = useState([])
  const [supported,  setSupported]  = useState(true)
  const [pending,    setPending]    = useState(null)  // awaiting confirmation
  const bottomRef = useRef(null)

  useEffect(() => { Products.list().then(setProducts) }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }) }, [history])

  // ── Voice engine callbacks ────────────────────────────────
  useEffect(() => {
    setSupported(voiceEngine.supported)

    voiceEngine.onStart = () => {
      setListening(true)
      setStatus("listening")
      setStatusMsg("Listening... speak now")
      setTranscript(""); setTranslated(""); setParsed(null); setPending(null)
    }

    voiceEngine.onEnd = () => { setListening(false) }

    voiceEngine.onError = (msg) => {
      setListening(false); setStatus("error"); setStatusMsg(msg)
      addHistory({ type:"error", text: msg })
    }

    voiceEngine.onResult = async (original, translated, confidence) => {
      setStatus("processing"); setStatusMsg("Understanding...")
      setTranscript(original); setTranslated(translated)
      const cmd = parseVoiceCommand(original, translated, products)
      setParsed(cmd)
      await handleCommand(cmd, original)
    }

    return () => {
      voiceEngine.onStart = null; voiceEngine.onEnd = null
      voiceEngine.onError = null; voiceEngine.onResult = null
    }
  }, [products, lang])

  function addHistory(entry) {
    setHistory(h => [...h.slice(-19), { ...entry, id: Date.now() }])
  }

  // ── Main command handler — always asks confirmation first ─
  async function handleCommand(cmd, original) {
    const { action, product, productName, qty, unit } = cmd

    if (action === "STOCK_QUERY") {
      // Stock queries answer immediately — no confirmation needed
      const found = product || products.find(p =>
        p.name.toLowerCase().includes(productName.toLowerCase().split(" ")[0])
      )
      if (found) {
        const isLow = found.stock < found.min_stock
        const msg = isLow
          ? `${found.name}: only ${found.stock} units left — low stock!`
          : `${found.name}: ${found.stock} units in stock`
        speak(msg, lang)
        setStatus("done"); setStatusMsg(msg)
        addHistory({ type:"query", original, result: msg })
      } else {
        const msg = `"${productName}" not found in inventory. Please add it first.`
        speak(msg, lang)
        setStatus("error"); setStatusMsg(msg)
        addHistory({ type:"error", original, result: msg })
      }
      return
    }

    // For ALL other actions — show confirmation card first
    const confirmData = {
      cmd, original,
      productFound: !!product,
      displayName: product?.name || productName,
      qty, unit, action,
      price: product ? Math.round(product.mrp * qty * (1 + product.gst_percent/100) * 100) / 100 : null,
    }

    setPending(confirmData)
    setStatus("confirm")

    const actionLabel = action === "ADD_BILL" ? "Add to bill"
      : action === "ADD_STOCK"   ? "Add to stock"
      : action === "REMOVE_STOCK"? "Remove from stock"
      : "Action"

    const confirmMsg = product
      ? `${product.name}, ${qty} ${unit} — ${actionLabel}?`
      : `"${productName}" not found. Add anyway?`

    setStatusMsg(confirmMsg)
    speak(confirmMsg, lang)
  }

  // ── User confirms ─────────────────────────────────────────
  async function confirmAction() {
    if (!pending) return
    const { cmd, original, productFound, displayName, qty, unit, action, price } = pending
    setPending(null)

    try {
      if (action === "ADD_BILL") {
        if (!productFound) {
          // Product not in inventory — still add with name only (manual billing)
          onAddToBill?.({ product: null, productName: displayName, qty, unit, price: 0 })
          const msg = `"${displayName}" added to bill (no price — set it manually)`
          speak(msg, lang)
          addHistory({ type:"bill", original, result: msg })
          setStatus("done"); setStatusMsg(msg)
        } else {
          onAddToBill?.({ product: cmd.product, qty, unit })
          const msg = formatConfirmation(cmd, lang)
          speak(msg, lang)
          addHistory({ type:"bill", original, result: msg })
          setStatus("done"); setStatusMsg(msg)
        }

      } else if (action === "ADD_STOCK") {
        if (cmd.product) {
          const newStock = cmd.product.stock + qty
          await Products.update(cmd.product.id, { stock: newStock })
          const msg = `${cmd.product.name}: stock updated to ${newStock}`
          speak(msg, lang); addHistory({ type:"stock", original, result: msg })
          setStatus("done"); setStatusMsg(msg)
          Products.list().then(setProducts)
        }

      } else if (action === "REMOVE_STOCK") {
        if (cmd.product) {
          const newStock = Math.max(0, cmd.product.stock - qty)
          await Products.update(cmd.product.id, { stock: newStock })
          const msg = `${cmd.product.name}: ${qty} removed. Remaining: ${newStock}`
          speak(msg, lang); addHistory({ type:"stock", original, result: msg })
          setStatus("done"); setStatusMsg(msg)
          Products.list().then(setProducts)
        }
      }
    } catch(e) {
      const msg = "Error: " + e.message
      setStatus("error"); setStatusMsg(msg)
      addHistory({ type:"error", original, result: msg })
    }
  }

  // ── User cancels ──────────────────────────────────────────
  function cancelAction() {
    speak("Cancelled", lang)
    setPending(null)
    setStatus("idle"); setStatusMsg("")
    addHistory({ type:"cancel", text:"Cancelled" })
  }

  function handleMic() {
    voiceEngine.setLanguage(lang)
    voiceEngine.toggle()
  }

  function changeLang(code) {
    setLang(code); voiceEngine.setLanguage(code)
  }

  const statusColors = {
    idle:"text-gray-400", listening:"text-primary font-medium",
    processing:"text-amber-600 font-medium", done:"text-primary font-medium",
    error:"text-red-500", confirm:"text-amber-700 font-medium",
  }
  const historyIcons = { bill:"🧾", stock:"📦", query:"🔍", error:"❌", cancel:"↩" }

  return (
    <div className="flex flex-col h-full">
      <style>{pulseStyle}</style>

      {/* Language picker */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {LANGUAGES.map(l => (
          <button key={l.code} onClick={() => changeLang(l.code)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
              lang === l.code
                ? "bg-primary text-white border-primary"
                : "bg-white border-gray-200 text-gray-500 hover:border-primary hover:text-primary"
            }`}>
            {l.native}
          </button>
        ))}
      </div>

      {!supported && (
        <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg mb-3">
          ⚠ Voice not supported. Use <b>Chrome</b> or <b>Edge</b> browser.
        </div>
      )}

      {/* Mic button */}
      <div className="flex flex-col items-center py-4 mb-3">
        <button onClick={handleMic} disabled={!supported || status === "confirm"}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all text-white text-3xl disabled:opacity-40 ${
            listening ? "mic-listening" : "bg-primary hover:bg-primary-dark"
          }`}>
          {listening ? "⏹" : "🎤"}
        </button>

        {listening && (
          <div className="flex items-center gap-1 mt-3 h-8">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="wave-bar" style={{ animationDelay:`${i*0.1}s` }} />
            ))}
          </div>
        )}

        <div className={`mt-3 text-xs text-center max-w-xs ${statusColors[status] || "text-gray-400"}`}>
          {status === "idle" && !statusMsg
            ? `Tap mic · speak in ${LANGUAGES.find(l => l.code === lang)?.name || "your language"}`
            : statusMsg}
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="mt-3 w-full max-w-sm bg-gray-50 rounded-lg p-3 text-xs">
            <div className="text-gray-400 text-[10px] mb-1">You said:</div>
            <div className="text-gray-800 font-medium">{transcript}</div>
            {translated && translated !== transcript && (
              <>
                <div className="text-gray-400 text-[10px] mt-2 mb-1">Translated:</div>
                <div className="text-gray-500">{translated}</div>
              </>
            )}
          </div>
        )}

        {/* Parsed result chips */}
        {parsed && status !== "idle" && status !== "confirm" && (
          <div className="mt-2 w-full max-w-sm bg-primary-light rounded-lg p-3">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-[10px] text-primary-dark/60">Product</div>
                <div className="font-medium text-primary-dark truncate">{parsed.productName}</div>
              </div>
              <div>
                <div className="text-[10px] text-primary-dark/60">Quantity</div>
                <div className="font-medium text-primary-dark">{parsed.qty} {parsed.unit}</div>
              </div>
              <div>
                <div className="text-[10px] text-primary-dark/60">Action</div>
                <div className="font-medium text-primary-dark text-[10px]">
                  {parsed.action === "ADD_BILL" ? "Add to bill" :
                   parsed.action === "STOCK_QUERY" ? "Check stock" :
                   parsed.action === "ADD_STOCK" ? "Add stock" : "Remove stock"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIRMATION CARD ────────────────────────────── */}
        {status === "confirm" && pending && (
          <div className="mt-3 w-full max-w-sm border-2 border-amber-300 bg-amber-50 rounded-xl p-4">
            <div className="text-xs font-semibold text-amber-800 mb-3 text-center">
              ✋ Confirm this action
            </div>

            <div className="bg-white rounded-lg p-3 mb-3 text-xs">
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-400">Product</span>
                <span className={`font-medium ${pending.productFound ? "text-gray-800" : "text-amber-600"}`}>
                  {pending.displayName}
                  {!pending.productFound && " ⚠ not in inventory"}
                </span>
              </div>
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-400">Quantity</span>
                <span className="font-medium text-gray-800">{pending.qty} {pending.unit}</span>
              </div>
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-400">Action</span>
                <span className="font-medium text-gray-800">
                  {pending.action === "ADD_BILL" ? "Add to bill" :
                   pending.action === "ADD_STOCK" ? "Add to stock" : "Remove from stock"}
                </span>
              </div>
              {pending.price > 0 && (
                <div className="flex justify-between pt-1.5 border-t border-gray-100">
                  <span className="text-gray-400">Amount (incl. GST)</span>
                  <span className="font-semibold text-primary">₹{pending.price}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={cancelAction}
                className="py-2.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">
                ✕ Cancel
              </button>
              <button onClick={confirmAction}
                className="py-2.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-dark">
                ✓ Confirm
              </button>
            </div>

            <div className="text-[10px] text-amber-600 text-center mt-2">
              Say "yes" or tap Confirm · Say "no" or tap Cancel
            </div>
          </div>
        )}
      </div>

      {/* Quick commands guide */}
      <div className="card mb-3">
        <div className="text-[10px] font-medium text-gray-500 mb-2">Try saying:</div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { lang:"Telugu", ex:'"కిలో టమాటలు బిల్లు ఆడ్ చేయండి"' },
            { lang:"Hindi",  ex:'"Dus kilo chawal bill mein daalo"' },
            { lang:"Stock",  ex:'"Tata Salt kitna bacha?"' },
            { lang:"Tamil",  ex:'"Pathu kilo arisi bill la seer"' },
          ].map(e => (
            <div key={e.lang} className="bg-gray-50 rounded-lg p-2">
              <div className="text-[10px] text-primary font-medium mb-0.5">{e.lang}</div>
              <div className="text-[10px] text-gray-500 italic">{e.ex}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Voice history */}
      {history.length > 0 && (
        <div className="card overflow-y-auto max-h-48">
          <div className="text-[10px] font-medium text-gray-500 mb-2">Voice History</div>
          <div className="space-y-1.5">
            {history.map(h => (
              <div key={h.id} className={`text-xs p-2 rounded-lg flex items-start gap-2 ${
                h.type === "error"  ? "bg-red-50" :
                h.type === "bill"   ? "bg-primary-light" :
                h.type === "cancel" ? "bg-gray-50" : "bg-gray-50"
              }`}>
                <span className="flex-shrink-0">{historyIcons[h.type] || "💬"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-600 truncate">{h.original || h.text}</div>
                  {h.result && (
                    <div className={`text-[10px] mt-0.5 ${h.type === "error" ? "text-red-600" : "text-primary-dark"}`}>
                      {h.result}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  )
}
