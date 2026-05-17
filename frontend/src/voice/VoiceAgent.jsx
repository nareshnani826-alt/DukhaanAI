import { useState, useEffect, useRef, useCallback } from "react"
import { voiceEngine, speak } from "./engine.js"
import { parseVoiceCommand, formatConfirmation } from "./nlp.js"
import { LANGUAGES } from "./languages.js"
import { Products } from "../sync/db.js"
import { validateProduct, extractVariant, buildProductName } from "./productValidator.js"
import { detectUnit } from "./unitDetector.js"
import { detectPlatform } from "./engine.js"

const pulseStyle = `
  @keyframes mic-pulse { 0%{box-shadow:0 0 0 0 rgba(29,158,117,0.6)} 70%{box-shadow:0 0 0 16px rgba(29,158,117,0)} 100%{box-shadow:0 0 0 0 rgba(29,158,117,0)} }
  @keyframes wave { 0%,100%{height:8px} 50%{height:24px} }
  .mic-listening { animation: mic-pulse 1.2s ease-out infinite; background: #1D9E75 !important; }
  .wave-bar { animation: wave 0.8s ease-in-out infinite; background: #1D9E75; width: 4px; border-radius: 2px; }
  .wave-bar:nth-child(2){animation-delay:.1s} .wave-bar:nth-child(3){animation-delay:.2s}
  .wave-bar:nth-child(4){animation-delay:.3s} .wave-bar:nth-child(5){animation-delay:.15s}
`

export default function VoiceAgent({ onAddToBill }) {
  const [lang,       setLang]       = useState("te-IN")
  const [listening,  setListening]  = useState(false)
  const [transcript, setTranscript] = useState("")
  const [translated, setTranslated] = useState("")
  const [status,     setStatus]     = useState("idle")
  const [statusMsg,  setStatusMsg]  = useState("")
  const [history,    setHistory]    = useState([])
  const [products,   setProducts]   = useState([])
  const [supported,  setSupported]  = useState(true)
  const [pending,    setPending]    = useState(null)
  const [platform,   setPlatform]   = useState({})
  const bottomRef = useRef(null)

  useEffect(() => {
    Products.list().then(setProducts)
    setPlatform(detectPlatform())
  }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }) }, [history])

  useEffect(() => {
    setSupported(voiceEngine.supported)

    voiceEngine.onStart = () => {
      setListening(true); setStatus("listening")
      setStatusMsg("Listening... speak now")
      setTranscript(""); setTranslated(""); setPending(null)
    }
    voiceEngine.onEnd   = () => setListening(false)
    voiceEngine.onError = (msg) => {
      setListening(false); setStatus("error"); setStatusMsg(msg)
      addHistory({ type:"error", text: msg })
    }
    voiceEngine.onResult = async (original, translated) => {
      setStatus("processing"); setStatusMsg("Understanding...")
      setTranscript(original); setTranslated(translated)
      await handleCommand(original, translated)
    }
    return () => {
      voiceEngine.onStart = null; voiceEngine.onEnd = null
      voiceEngine.onError = null; voiceEngine.onResult = null
    }
  }, [products, lang])

  function addHistory(entry) {
    setHistory(h => [...h.slice(-19), { ...entry, id: Date.now() }])
  }

  async function handleCommand(original, translated) {
    const text = translated || original
    const tl   = text.toLowerCase()

    // ── Detect action ─────────────────────────────────────
    const isStockQuery = /kitna|how many|stock|bacha|enta|evvalavu|eshtu/i.test(tl)
    const isAddStock   = /aaya|vacchindi|received|restock|add stock|stock mein|kondi/i.test(tl)
    // isAddBill only if explicit bill keyword OR has quantity mentioned
    const hasBillKw    = /bill|invoice|charge|becho|daalo|seer|pannu/i.test(tl)
    const hasQty       = /\d+|kilo|litre|gram|packet|bottle|ek|do|teen|okati|rendu|moodu/i.test(tl)
    const isAddBill    = hasBillKw || (hasQty && !isStockQuery && !isAddStock)

    // ── Extract qty + unit ────────────────────────────────
    const { qty, unit } = extractQtyUnit(text)

    // ── Validate product against known database ───────────
    const validation = validateProduct(text)
    const variant    = validation.product ? extractVariant(text, validation.product) : null
    const stdName    = validation.product ? buildProductName(validation.product, variant) : null

    // ── Try to match against vendor's actual inventory ────
    const invMatch = findInInventory(text, stdName, products)

    if (isStockQuery) {
      // Answer stock query immediately
      if (invMatch) {
        const msg = invMatch.stock < invMatch.min_stock
          ? `${invMatch.name}: only ${invMatch.stock} ${invMatch.unit||"units"} left — low stock!`
          : `${invMatch.name}: ${invMatch.stock} ${invMatch.unit||"units"} in stock`
        speak(msg, lang)
        setStatus("done"); setStatusMsg(msg)
        addHistory({ type:"query", original, result: msg })
      } else {
        const msg = `Product not found in your inventory`
        speak(msg, lang); setStatus("error"); setStatusMsg(msg)
        addHistory({ type:"error", original, result: msg })
      }
      return
    }

    // ── Reject if nothing recognized ─────────────────────
    if (!invMatch && !validation.found) {
      const msg = "No product recognized. Please say a product name clearly, like 'Tata Salt' or 'Amul Milk'."
      speak(msg, lang)
      setStatus("error")
      setStatusMsg(msg)
      addHistory({ type:"error", original, result: msg })
      return
    }

    // ── Build confirmation data ───────────────────────────
    const confirmData = {
      original, text, qty, unit,
      action:   isAddStock ? "ADD_STOCK" : "ADD_BILL",
      invMatch,
      validation,
      stdName:  stdName || invMatch?.name,
      variant,
    }

    setPending(confirmData)
    setStatus("confirm")

    let confirmMsg = ""
    if (invMatch) {
      confirmMsg = isAddStock
        ? `Add ${qty} ${unit} to ${invMatch.name}? Current: ${invMatch.stock}`
        : `${invMatch.name} × ${qty} — add to bill?`
    } else {
      confirmMsg = isAddStock
        ? `New product "${stdName}" — add with ${qty} ${unit} stock?`
        : `"${stdName}" not in inventory. Add to bill anyway?`
    }

    setStatusMsg(confirmMsg)
    speak(confirmMsg, lang)
  }

  // ── Confirm action ────────────────────────────────────────
  async function confirmAction() {
    if (!pending) return
    const { original, action, qty, unit, invMatch, validation, stdName, variant, isNewProduct } = pending
    setPending(null)

    try {
      if (action === "ADD_BILL") {
        if (invMatch) {
          // Deduct stock + add to bill
          const newStock = Math.max(0, invMatch.stock - qty)
          await Products.update(invMatch.id, { stock: newStock })
          onAddToBill?.({ product: invMatch, qty, unit })
          const msg = `${invMatch.name} × ${qty} added to bill. Stock: ${newStock}`
          speak(msg, lang)
          addHistory({ type:"bill", original, result: msg })
          setStatus("done"); setStatusMsg(msg)
          Products.list().then(setProducts) // refresh
        } else {
          onAddToBill?.({ product: null, productName: stdName, qty, unit, price: 0 })
          const msg = `"${stdName}" added to bill — set price manually`
          speak(msg, lang)
          addHistory({ type:"bill", original, result: msg })
          setStatus("done"); setStatusMsg(msg)
        }

      } else if (action === "ADD_STOCK") {
        if (invMatch) {
          // ── UPDATE EXISTING PRODUCT STOCK ──────────────
          const newStock = invMatch.stock + qty
          await Products.update(invMatch.id, { stock: newStock })
          const msg = `${invMatch.name} stock updated: ${invMatch.stock} → ${newStock} ${unit}`
          speak(msg, lang)
          addHistory({ type:"stock", original, result: msg })
          setStatus("done"); setStatusMsg(msg)
          Products.list().then(setProducts)

        } else if (validation.found) {
          // ── CREATE NEW PRODUCT FROM DATABASE ──────────
          const detectedUnit = detectUnit(stdName)
          const newProduct = await Products.create({
            name:        stdName,
            category:    validation.product.category,
            unit:        detectedUnit.unit || validation.product.unit || "piece",
            stock:       qty,
            min_stock:   Math.max(5, Math.floor(qty * 0.2)),
            mrp:         0,
            cost_price:  0,
            gst_percent: validation.product.gst || 5,
          })
          const msg = `New product "${stdName}" added with ${qty} ${unit} stock. Set the price in Inventory!`
          speak(msg, lang)
          addHistory({ type:"stock", original, result: msg })
          setStatus("done"); setStatusMsg(msg)
          Products.list().then(setProducts)

        } else {
          // Unknown product — don't add
          const msg = `"${stdName}" is not a recognized product. Please add it manually from Inventory.`
          speak(msg, lang)
          addHistory({ type:"error", original, result: msg })
          setStatus("error"); setStatusMsg(msg)
        }
      }
    } catch(e) {
      const msg = "Error: " + e.message
      setStatus("error"); setStatusMsg(msg)
      addHistory({ type:"error", original, result: msg })
      speak("Sorry, something went wrong", lang)
    }
  }

  function cancelAction() {
    speak("Cancelled", lang)
    setPending(null); setStatus("idle"); setStatusMsg("")
    addHistory({ type:"cancel", text:"Cancelled" })
  }

  function handleMic() { voiceEngine.setLanguage(lang); voiceEngine.toggle() }
  function changeLang(code) { setLang(code); voiceEngine.setLanguage(code) }

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
              lang === l.code ? "bg-primary text-white border-primary" : "bg-white border-gray-200 text-gray-500 hover:border-primary hover:text-primary"
            }`}>
            {l.native}
          </button>
        ))}
      </div>

      {!supported && platform.isIOS && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3 text-xs text-amber-800">
          <div className="font-semibold text-sm mb-2">🍎 Enable voice on iPhone</div>
          <div className="space-y-1.5 text-amber-700">
            <div>1. Open <b>Settings</b> on your iPhone</div>
            <div>2. Scroll down → tap <b>Safari</b></div>
            <div>3. Tap <b>Microphone</b> → select <b>Allow</b></div>
            <div>4. Come back here and reload the page</div>
          </div>
          <div className="mt-3 p-2 bg-amber-100 rounded-lg text-[10px] text-amber-600">
            Note: iOS 16.4+ supports voice in Safari. Make sure your iPhone is updated.
          </div>
        </div>
      )}
      {!supported && !platform.isIOS && (
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
            {[1,2,3,4,5].map(i => <div key={i} className="wave-bar" style={{ animationDelay:`${i*0.1}s` }} />)}
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

        {/* Confirmation card */}
        {status === "confirm" && pending && (
          <div className="mt-3 w-full max-w-sm border-2 border-amber-300 bg-amber-50 rounded-xl p-4">
            <div className="text-xs font-semibold text-amber-800 mb-3 text-center">✋ Confirm this action</div>
            <div className="bg-white rounded-lg p-3 mb-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400">Product</span>
                <span className={`font-medium ${pending.invMatch ? "text-gray-800" : "text-amber-600"}`}>
                  {pending.invMatch?.name || pending.stdName}
                  {!pending.invMatch && pending.validation.found && <span className="text-[10px] text-primary ml-1">(from database)</span>}
                  {!pending.invMatch && !pending.validation.found && <span className="text-[10px] text-red-500 ml-1">(unrecognized)</span>}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Quantity</span>
                <span className="font-medium text-gray-800">{pending.qty} {pending.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Action</span>
                <span className="font-medium text-gray-800">
                  {pending.action === "ADD_BILL" ? "Add to bill" : "Add to stock"}
                </span>
              </div>
              {pending.invMatch && pending.action === "ADD_STOCK" && (
                <div className="flex justify-between border-t border-gray-100 pt-1.5">
                  <span className="text-gray-400">Current stock</span>
                  <span className="font-medium text-primary">{pending.invMatch.stock} → {pending.invMatch.stock + pending.qty}</span>
                </div>
              )}
              {pending.invMatch && pending.action === "ADD_BILL" && (
                <div className="flex justify-between border-t border-gray-100 pt-1.5">
                  <span className="text-gray-400">Stock after sale</span>
                  <span className={`font-medium ${pending.invMatch.stock - pending.qty < pending.invMatch.min_stock ? "text-red-500" : "text-primary"}`}>
                    {pending.invMatch.stock} → {Math.max(0, pending.invMatch.stock - pending.qty)}
                  </span>
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
          </div>
        )}
      </div>

      {/* Quick commands */}
      <div className="card mb-3">
        <div className="text-[10px] font-medium text-gray-500 mb-2">Try saying:</div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { lang:"Telugu", ex:'"Amul Milk 2 litres stock lo add cheyyi"' },
            { lang:"Hindi",  ex:'"Tata Salt 10 kilo aaya"' },
            { lang:"Stock",  ex:'"Maggi kitna bacha?"' },
            { lang:"Bill",   ex:'"Parle-G 5 packet bill mein daalo"' },
          ].map(e => (
            <div key={e.lang} className="bg-gray-50 rounded-lg p-2">
              <div className="text-[10px] text-primary font-medium mb-0.5">{e.lang}</div>
              <div className="text-[10px] text-gray-500 italic">{e.ex}</div>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="card overflow-y-auto max-h-48">
          <div className="text-[10px] font-medium text-gray-500 mb-2">Voice History</div>
          <div className="space-y-1.5">
            {history.map(h => (
              <div key={h.id} className={`text-xs p-2 rounded-lg flex items-start gap-2 ${
                h.type==="error" ? "bg-red-50" : h.type==="bill" ? "bg-primary-light" : "bg-gray-50"
              }`}>
                <span className="flex-shrink-0">{historyIcons[h.type]||"💬"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-600 truncate">{h.original||h.text}</div>
                  {h.result && <div className={`text-[10px] mt-0.5 ${h.type==="error"?"text-red-600":"text-primary-dark"}`}>{h.result}</div>}
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

// ── Helpers ───────────────────────────────────────────────

function extractQtyUnit(text) {
  const t = text.toLowerCase()
  const patterns = [
    { r:/(\d+\.?\d*)\s*kg/i,      unit:"kg"    },
    { r:/(\d+\.?\d*)\s*kilo/i,    unit:"kg"    },
    { r:/(\d+\.?\d*)\s*gram/i,    unit:"g"     },
    { r:/(\d+\.?\d*)\s*\bg\b/i,   unit:"g"     },
    { r:/(\d+\.?\d*)\s*litre/i,   unit:"litre" },
    { r:/(\d+\.?\d*)\s*liter/i,   unit:"litre" },
    { r:/(\d+\.?\d*)\s*\bl\b/i,   unit:"litre" },
    { r:/(\d+\.?\d*)\s*ml/i,      unit:"ml"    },
    { r:/(\d+\.?\d*)\s*packet/i,  unit:"pack"  },
    { r:/(\d+\.?\d*)\s*pack/i,    unit:"pack"  },
    { r:/(\d+\.?\d*)\s*bottle/i,  unit:"btl"   },
    { r:/(\d+\.?\d*)\s*piece/i,   unit:"pc"    },
    { r:/(\d+\.?\d*)/,            unit:"pc"    },
  ]
  const WORD_NUMS = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
    ek:1,do:2,teen:3,char:4,paanch:5,chhe:6,saat:7,aath:8,nau:9,das:10,
    bees:20,tees:30,pachaas:50,okati:1,rendu:2,moodu:3,padi:10 }

  for (const p of patterns) {
    const m = t.match(p.r)
    if (m) return { qty: parseFloat(m[1]), unit: p.unit }
  }
  for (const [word, num] of Object.entries(WORD_NUMS)) {
    if (t.includes(word)) return { qty: num, unit: "pc" }
  }
  return { qty: 1, unit: "pc" }
}

function findInInventory(text, stdName, products) {
  const t = text.toLowerCase()
  // Exact match first
  let found = products.find(p => t.includes(p.name.toLowerCase()))
  if (found) return found
  // Standard name match
  if (stdName) {
    found = products.find(p =>
      p.name.toLowerCase().includes(stdName.toLowerCase().split(" ")[0]) ||
      stdName.toLowerCase().includes(p.name.toLowerCase().split(" ")[0])
    )
    if (found) return found
  }
  // Word match
  const words = t.split(/\s+/).filter(w => w.length > 3)
  for (const p of products) {
    const pWords = p.name.toLowerCase().split(/\s+/)
    const matches = words.filter(w => pWords.some(pw => pw.includes(w) || w.includes(pw)))
    if (matches.length >= 1 && p.name.length < 30) return p
  }
  return null
}

function extractProductName(text) {
  const stopWords = new Set(["add","to","bill","invoice","stock","the","a","an","of","in",
    "please","mein","ko","ka","ki","ke","lo","do","de","hai","aaya","vacchindi"])
  const words = text.toLowerCase().split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w) && isNaN(w) &&
      !["kg","litre","liter","ml","gram","packet","pack","bottle","piece","pc"].includes(w))
  return words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Unknown"
}
