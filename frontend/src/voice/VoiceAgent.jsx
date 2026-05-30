import { useState, useEffect, useRef, useCallback } from "react"
import { speak } from "./engine.js"
import { voiceEngine } from "./assemblyEngine.js"
import { parseVoiceCommand, formatConfirmation, splitMultiProduct, parseMultipleProducts, matchProduct, parseQuantity, applyGroceryAliases } from "./nlp.js"
import { t, getSavedLang, saveLang } from "./i18n.js"
import { recordProductUse, recordCorrection } from "./sessionMemory.js"
import { getConfidenceLevel } from "./phonetic.js"
import { LANGUAGES } from "./languages.js"
import { Products, getToken } from "../sync/db.js"
import { loadFromServer } from "../voice-ai/syncPatterns"
import { validateProduct, extractVariant, buildProductName } from "./productValidator.js"
import { detectUnit } from "./unitDetector.js"
import { detectPlatform } from "./engine.js"
import { createAdaptiveMatcher } from "../voice-ai/adaptiveMatcher"
import { rankMatches, extractColors } from "../voice-ai/rankingEngine"
import { learnCorrection }       from "../voice-ai/learningStore"
import { matchFromLearned, recordConfirmation } from "../voice-ai/patternLearner"
import { parseVoiceUtterance, isSpeedBilling, parseSpeedBilling } from "../voice-ai/kiranaNLP"
import { initContextPredictor, addToSession, startSession } from "../voice-ai/contextPredictor"

const pulseStyle = `
  /* ── Siri-like orb animations ─────────────────────────── */

  /* Blob shape morphing */
  @keyframes siri-morph-a {
    0%,100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
    25%      { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
    50%      { border-radius: 50% 40% 60% 30% / 40% 50% 60% 50%; }
    75%      { border-radius: 40% 60% 40% 60% / 60% 40% 60% 40%; }
  }
  @keyframes siri-morph-b {
    0%,100% { border-radius: 40% 60% 60% 40% / 40% 50% 50% 60%; }
    33%      { border-radius: 70% 30% 40% 60% / 30% 70% 40% 60%; }
    66%      { border-radius: 30% 70% 50% 50% / 60% 30% 70% 30%; }
  }
  @keyframes siri-morph-c {
    0%,100% { border-radius: 50% 50% 40% 60% / 30% 60% 40% 70%; }
    50%      { border-radius: 35% 65% 65% 35% / 55% 45% 55% 45%; }
  }

  /* Slow rotations */
  @keyframes siri-spin-cw  { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
  @keyframes siri-spin-ccw { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }

  /* Idle breathing */
  @keyframes siri-breathe {
    0%,100% { transform: scale(1);    box-shadow: 0 0 20px rgba(29,158,117,0.4); }
    50%      { transform: scale(1.06); box-shadow: 0 0 40px rgba(29,158,117,0.7); }
  }

  /* Frequency bars */
  @keyframes siri-bar {
    0%,100% { transform: scaleY(0.15); opacity: 0.5; }
    50%      { transform: scaleY(1);    opacity: 1;   }
  }

  .siri-bar {
    width: 3px;
    border-radius: 3px;
    transform-origin: bottom center;
    animation: siri-bar 0.7s ease-in-out infinite;
  }
  .siri-bar:nth-child(1)  { animation-duration: 0.60s; animation-delay: 0.00s; }
  .siri-bar:nth-child(2)  { animation-duration: 0.75s; animation-delay: 0.05s; }
  .siri-bar:nth-child(3)  { animation-duration: 0.55s; animation-delay: 0.10s; }
  .siri-bar:nth-child(4)  { animation-duration: 0.80s; animation-delay: 0.02s; }
  .siri-bar:nth-child(5)  { animation-duration: 0.65s; animation-delay: 0.15s; }
  .siri-bar:nth-child(6)  { animation-duration: 0.50s; animation-delay: 0.08s; }
  .siri-bar:nth-child(7)  { animation-duration: 0.70s; animation-delay: 0.20s; }
  .siri-bar:nth-child(8)  { animation-duration: 0.60s; animation-delay: 0.12s; }
  .siri-bar:nth-child(9)  { animation-duration: 0.85s; animation-delay: 0.04s; }
  .siri-bar:nth-child(10) { animation-duration: 0.55s; animation-delay: 0.18s; }
  .siri-bar:nth-child(11) { animation-duration: 0.72s; animation-delay: 0.06s; }
  .siri-bar:nth-child(12) { animation-duration: 0.63s; animation-delay: 0.22s; }
`

export default function VoiceAgent({ onAddToBill, onLangChange, extraProducts = [], storeMode = "kirana" }) {
  const [lang,       setLang]       = useState(() => getSavedLang())
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
  const [multiPending, setMultiPending] = useState([])
  const [showCorrection, setShowCorrection] = useState(false)
  const [correctionText, setCorrectionText] = useState("")
  const [continuous,     setContinuous]     = useState(false)
  const bottomRef   = useRef(null)
  const matcherRef  = useRef(null)
  const pendingRef  = useRef(null)   // mirror of pending for use inside callbacks
  const statusRef   = useRef("idle") // mirror of status for use inside callbacks
  const continuousRef = useRef(false)

  // Keep refs in sync
  useEffect(() => { pendingRef.current    = pending    }, [pending])
  useEffect(() => { statusRef.current     = status     }, [status])
  useEffect(() => { continuousRef.current = continuous }, [continuous])


  // YES / NO words across 10 Indian languages
  const YES_WORDS = ["yes","yeah","yep","ok","okay","sure","correct","right","confirm","add","proceed",
    "haan","ha","ji","bilkul","zaroor",             // Hindi
    "avunu","avun","sari","ok","haan",              // Telugu
    "aamam","sari","aama",                          // Tamil
    "houdu","sari","haan",                          // Kannada
    "athe","undo","sheri",                          // Malayalam
    "hoy","baro","haan",                            // Marathi
    "hya","ha","theek",                             // Bengali
    "ha","sahi","theek",                            // Gujarati
    "han","theek","sahi",                           // Punjabi
  ]
  const NO_WORDS  = ["no","nope","cancel","stop","wrong","incorrect","remove",
    "nahi","nai","nahi","mat","band",               // Hindi
    "vaddu","vaddhu","venda","ledu",                // Telugu
    "venda","illai","vendam",                       // Tamil
    "beda","bidi","illa",                           // Kannada
    "venda","aila","venda",                         // Malayalam
    "nako","nahi","band",                           // Marathi
    "na","nah","bando",                             // Bengali
    "na","nahi","nako",                             // Gujarati
    "nahi","na","band",                             // Punjabi
  ]

  function isYesWord(text) {
    const lower = (text || "").toLowerCase()
    return YES_WORDS.some(w => new RegExp(`\\b${w}\\b`).test(lower))
  }
  function isNoWord(text) {
    const lower = (text || "").toLowerCase()
    return NO_WORDS.some(w => new RegExp(`\\b${w}\\b`).test(lower))
  }

  useEffect(() => {
    const bangleFlat = extraProducts.map(p => ({
      id:          p.id,
      name:        p.name,
      mrp:         p.mrp,
      unit:        "piece",
      stock:       typeof p.total_stock === "number" ? p.total_stock : 9999,
      gst_percent: p.gst_percent || 3,
      _isBangle:   true,
    }))

    if (storeMode === "bangle_fancy") {
      // Bangle store: only match against bangle products — exclude kirana items entirely
      setProducts(bangleFlat)
      matcherRef.current = createAdaptiveMatcher(bangleFlat)
      voiceEngine.setGrammarHints(bangleFlat.map(pr => pr.name))
    } else {
      // Kirana store: load kirana products and optionally merge any bangle extras
      Products.list().then((res) => {
        const kiranaList = Array.isArray(res) ? res : (res?.data || [])
        const merged = [...kiranaList, ...bangleFlat]
        setProducts(merged)
        matcherRef.current = createAdaptiveMatcher(merged)
        voiceEngine.setGrammarHints(merged.map(pr => pr.name))
      }).catch(e => console.error("Products load failed:", e))
    }

    initContextPredictor()
    startSession()
    setPlatform(detectPlatform())

    // Load learned patterns from server so they work on any device
    if (getToken()) loadFromServer().catch(() => {})
  }, [extraProducts, storeMode])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }) }, [history])

  // Reload the product list after mutations — respects current store mode
  function refreshProducts() {
    if (storeMode === "bangle_fancy") return // bangle products are static (stock managed separately)
    Products.list().then((res) => {
      const kiranaList = Array.isArray(res) ? res : (res?.data || [])
      const bangleFlat = extraProducts.map(ep => ({
        id: ep.id, name: ep.name, mrp: ep.mrp, unit: "piece",
        stock: typeof ep.total_stock === "number" ? ep.total_stock : 9999,
        gst_percent: ep.gst_percent || 3, _isBangle: true,
      }))
      const merged = [...kiranaList, ...bangleFlat]
      setProducts(merged)
      matcherRef.current = createAdaptiveMatcher(merged)
      voiceEngine.setGrammarHints(merged.map(pr => pr.name))
    }).catch(() => {})
  }

  useEffect(() => {
    setSupported(voiceEngine.supported)

    voiceEngine.onStart = () => {
      setListening(true)
      if (statusRef.current === "confirm") {
        // Preserve the confirmation card — just show the yes/no hint
        setStatusMsg(t("voice_confirm_hint", lang))
      } else {
        // Fresh session — reset all state
        setStatus("listening")
        setStatusMsg(t("listening", lang))
        setTranscript(""); setTranslated(""); setPending(null)
      }
    }
    voiceEngine.onEnd = () => {
      setListening(false)
      if (!continuousRef.current) return   // hands-free OFF → stop here

      const s = statusRef.current

      // Confirm mode: no result → restart quickly so user can say yes/no again
      if (s === "confirm") {
        setTimeout(() => {
          if (statusRef.current === "confirm") {
            window.speechSynthesis?.cancel()
            voiceEngine.setLanguage(lang)
            voiceEngine.start()
          }
        }, 800)
        return
      }

      // Listening mode: recognition ended with no speech (silence / timeout)
      // → restart immediately so the mic stays alive without any tap
      if (s === "listening" || s === "idle") {
        setTimeout(() => {
          // Only restart if we're still in a "waiting" state and not processing
          const cur = statusRef.current
          if (cur === "listening" || cur === "idle") {
            voiceEngine.setLanguage(lang)
            voiceEngine.start()
          }
        }, 400)
      }
    }
    voiceEngine.onError = (msg, permanent = false) => {
      setListening(false); setStatus("error"); setStatusMsg(msg)
      addHistory({ type:"error", text: msg })
      // Non-permanent errors (no-speech, network, generic): auto-reset to idle
      // after 3 s so the mic button is clearly available again.
      if (!permanent) {
        setTimeout(() => {
          setStatus(s  => s  === "error" ? "idle"  : s)
          setStatusMsg(m => m === msg    ? ""      : m)
        }, 3000)
      }
    }
    voiceEngine.onResult = async (original, translated) => {
      setTranscript(original); setTranslated(translated)
      const combinedText = `${translated || ""} ${original || ""}`.trim()

      // ── Voice confirmation: intercept yes/no when confirm card is open ──
      // In confirm mode NEVER fall through to handleCommand — the mic might have
      // picked up TTS output or noise, which would overwrite and clear the card.
      if (statusRef.current === "confirm") {
        if (pendingRef.current) {
          if (isYesWord(combinedText)) {
            voiceEngine.stop()
            setTimeout(() => confirmActionRef.current?.(), 50)
          } else if (isNoWord(combinedText)) {
            voiceEngine.stop()
            setTimeout(() => cancelActionRef.current?.(), 50)
          }
          // Anything else: ignore silently — keep the card open
        }
        return   // ← always bail out; never run NLP in confirm mode
      }

      setStatus("processing"); setStatusMsg(t("listening", lang))
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

    // ── Detect multi-product utterance ────────────────────
    // Require segments to be > 3 chars to avoid "aur" alone triggering multi-mode
    const segments      = splitMultiProduct(original).filter(s => s.trim().length > 3)
    const transSegments = splitMultiProduct(translated || original).filter(s => s.trim().length > 3)
    const isMulti = segments.length > 1 || transSegments.length > 1

    if (isMulti) {
      await handleMultiProduct(original, translated)
      return
    }

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
    // Layer 1: adaptive matcher (Fuse.js + learned ranking boost)
    let invMatch = null
    if (matcherRef.current) {
      // For bangle store: "glasses" is a mistranslation of గాజాలు (bangles).
      // Normalise it so fuse.js scores correctly against product names.
      const searchText = storeMode === "bangle_fancy"
        ? text.replace(/\bglasses?\b/gi, "bangles").replace(/\bare a dime a dozen\b/gi, "one dozen")
        : text
      const fuzzyMatches = matcherRef.current.findMatches(searchText)
      // Pass original (untranslated) text so Telugu colour words are also considered
      const ranked       = rankMatches(searchText, fuzzyMatches, original)
      if (ranked.length > 0) {
        const top = ranked[0]
        const fullProd = products.find(p => p.id === top.product?.id || p.name === top.product?.name)
        if (fullProd) invMatch = { ...fullProd, _confidence: top.finalScore }
      }
    }
    // Layer 2: patternLearner — autonomous phoneme + habit matching
    if (!invMatch) {
      const learned = matchFromLearned(text, products)
      if (learned) invMatch = learned
    }
    // Layer 3: kiranaNLP — abbreviation expansion + quantity normalization
    if (!invMatch) {
      const parsed = parseVoiceUtterance(text)
      for (const { productPhrase } of parsed) {
        if (!productPhrase) continue
        const learned2 = matchFromLearned(productPhrase, products)
        if (learned2) { invMatch = learned2; break }
        const nlpMatch = findInInventory(productPhrase, stdName, products)
        if (nlpMatch) { invMatch = nlpMatch; break }
      }
    }
    // Layer 4: speed billing — "5 SM", "2 GF"
    if (!invMatch && isSpeedBilling(text)) {
      const speedItems = parseSpeedBilling(text)
      for (const { productPhrase } of speedItems) {
        const m = findInInventory(productPhrase, null, products)
        if (m) { invMatch = m; break }
      }
    }
    // Layer 5: fallback rule-based NLP
    if (!invMatch) invMatch = findInInventory(text, stdName, products)

    // if (isStockQuery) {
    //   // Answer stock query immediately
    //   if (invMatch) {
    //     const msg = invMatch.stock < invMatch.min_stock
    //       ? `${invMatch.name}: only ${invMatch.stock} ${invMatch.unit||"units"} left — low stock!`
    //       : `${invMatch.name}: ${invMatch.stock} ${invMatch.unit||"units"} in stock`
    //     speak(msg, lang)
    //     setStatus("done"); setStatusMsg(msg)
    //     addHistory({ type:"query", original, result: msg })
    //   } else {
    //     const msg = `Product not found in your inventory`
    //     speak(msg, lang); setStatus("error"); setStatusMsg(msg)
    //     addHistory({ type:"error", original, result: msg })
    //   }
    //   return
    // }

    // ── Colour conflict guard ─────────────────────────────
    // If the user said a specific colour (e.g. "blue", "emerald") but the matched
    // product is a DIFFERENT colour, check whether that colour even exists in
    // inventory. If not → reject with a helpful message listing available colours.
    if (invMatch) {
      const allText      = `${text} ${original}`.trim()
      const spokenColors = extractColors(allText)
      if (spokenColors.length > 0) {
        const matchedColors = extractColors(invMatch.name)
        const colorOk = spokenColors.some(c => matchedColors.includes(c))
        if (!colorOk) {
          // Is there ANY product in inventory with the spoken colour?
          const inventoryHasColor = products.some(p =>
            spokenColors.some(c => extractColors(p.name).includes(c))
          )
          if (!inventoryHasColor) {
            const available = [...new Set(
              products.flatMap(p => extractColors(p.name))
            )].join(", ")
            const colorWord = spokenColors[0]
            const msg = t("color_not_found", lang, colorWord, available)
            speak(msg, lang)
            setStatus("error")
            setStatusMsg(msg)
            addHistory({ type:"error", original, result: msg })
            return
          }
          // Inventory HAS that colour but ranking picked wrong — force re-search
          // using just the colour word so the right product wins
          const colorOnlyMatches = matcherRef.current?.findMatches(spokenColors[0]) || []
          const colorRanked = rankMatches(spokenColors[0], colorOnlyMatches, original)
          if (colorRanked.length > 0) {
            const best = products.find(p =>
              p.id === colorRanked[0].product?.id || p.name === colorRanked[0].product?.name
            )
            if (best) invMatch = { ...best, _confidence: colorRanked[0].finalScore }
          }
        }
      }
    }

    // ── Reject if nothing recognized ─────────────────────
    if (!invMatch && !validation.found) {
      const msg = t("not_found", lang)
      speak(t("not_found", lang), lang)
      setStatus("error")
      setStatusMsg(t("not_found", lang))
      addHistory({ type:"error", original, result: t("not_found", lang) })
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
    const qtyLabel = `${qty} ${unit}`
    if (invMatch) {
      confirmMsg = isAddStock
        ? t("stock_confirm",    lang, invMatch.name, qtyLabel)
        : t("confirm_question", lang, invMatch.name, qtyLabel)
    } else {
      confirmMsg = isAddStock
        ? t("stock_confirm",    lang, stdName, qtyLabel)
        : t("confirm_question", lang, stdName, qtyLabel)
    }

    setStatusMsg(confirmMsg)
    speak(confirmMsg, lang)
  }

  // ── Handle multi-product utterance ───────────────────────
  async function handleMultiProduct(original, translated) {
    const origSegs  = splitMultiProduct(original)
    const transSegs = splitMultiProduct(translated || original)

    // Use whichever split gave more segments
    const useOrig  = origSegs.length >= transSegs.length
    const segments = useOrig ? origSegs : transSegs
    const altSegs  = useOrig ? transSegs : origSegs

    const parsed = []
    for (let i = 0; i < segments.length; i++) {
      const seg    = segments[i]?.trim()
      const altSeg = altSegs[i]?.trim() || seg
      if (!seg) continue

      // ── Use full 5-layer matchProduct from nlp.js ────────
      // This handles aliases, phonetics, corrections, frequency
      const aliasedSeg = applyGroceryAliases(seg)
      const aliasedAlt = applyGroceryAliases(altSeg)
      const { qty, unit } = parseQuantity(aliasedSeg || seg)

      // Try both original segment and translated alternate
      let invMatch = matchProduct(seg, altSeg, products)
                  || matchProduct(aliasedSeg, aliasedAlt, products)

      // Also try the old findInInventory as fallback


      if (!invMatch) {
        invMatch = findInInventory(seg, null, products)
                || findInInventory(altSeg, null, products)
      }

      // Build display name
      const displayName = invMatch?.name || seg

      parsed.push({
        original: seg,
        text:     altSeg,
        qty,
        unit,
        action:   "ADD_BILL",
        invMatch: invMatch || null,
        stdName:  displayName,
        found:    !!invMatch,
      })
    }

    // Filter out truly empty results
    const validItems = parsed.filter(p => p.invMatch || p.stdName)

    if (validItems.length === 0) {
      const msg = t("not_found", lang)
      speak(msg, lang); setStatus("error"); setStatusMsg(msg)
      return
    }

    // Show multi-confirmation UI — even for unrecognized items
    setMultiPending(validItems)
    setStatus("confirm")

    const foundCount   = validItems.filter(p => p.invMatch).length
    const names        = validItems.map(p => `${p.invMatch?.name || p.stdName} ×${p.qty}`).join(", ")
    const confirmMsg   = `${validItems.length} items: ${names}`
    setStatusMsg(confirmMsg)
    speak(t("confirm_items", lang), lang)
  }

  // ── Confirm ALL multi-product items ───────────────────────
  async function confirmMultiAction() {
    if (!multiPending.length) return
    const items = [...multiPending]
    setMultiPending([])

    let added = 0
    for (const item of items) {
      const { action, qty, unit, invMatch, stdName } = item
      try {
        if (action === "ADD_BILL") {
          if (invMatch) {
            if (!invMatch._isBangle) {
              const newStock = Math.max(0, invMatch.stock - qty)
              await Products.update(invMatch.id, { stock: newStock })
            }
            onAddToBill?.({ product: invMatch, qty, unit })
          } else {
            onAddToBill?.({ product: null, productName: stdName, qty, unit, price: 0 })
          }
          addHistory({ type:"bill", original: item.original, result: `${stdName || invMatch?.name} × ${qty} added` })
          added++
        }
      } catch(e) { console.error("Multi-add error:", e) }
    }

    const msg = t("items_added", lang, added)
    speak(msg, lang)
    setStatus("done"); setStatusMsg(msg)
    refreshProducts()
  }

  // ── Confirm action ────────────────────────────────────────
  async function confirmAction() {
    if (!pending) return
    const { original, action, qty, unit, invMatch, validation, stdName, variant, isNewProduct } = pending
    const correctionOriginal = pending.original
    setPending(null)

    try {
      if (action === "ADD_BILL") {
        if (invMatch) {
          // Bangle products have _isBangle flag — don't touch kirana stock
          if (!invMatch._isBangle) {
            const newStock = Math.max(0, invMatch.stock - qty)
            await Products.update(invMatch.id, { stock: newStock })
          }
          onAddToBill?.({ product: invMatch, qty, unit })
          // Record use for session frequency boost
          recordProductUse(invMatch.id, invMatch.name)
          // Teach learnCorrection (Fuse ranking boost)
          learnCorrection(correctionOriginal, invMatch.name)
          // Teach patternLearner (phoneme + autonomous learning)
          recordConfirmation(correctionOriginal, invMatch.name)
          // Track in context session (affinity learning)
          addToSession(invMatch.name)
          const msg = continuousRef.current
            ? t("next_item_prompt", lang, invMatch.name)
            : t("added_to_bill",   lang, invMatch.name, qty)
          speak(msg, lang)
          addHistory({ type:"bill", original, result: msg })
          setStatus("done"); setStatusMsg(msg)
          if (!invMatch._isBangle) refreshProducts()
        } else {
          onAddToBill?.({ product: null, productName: stdName, qty, unit, price: 0 })
          const msg = t("item_added_set_price", lang, stdName)
          speak(msg, lang)
          addHistory({ type:"bill", original, result: msg })
          setStatus("done"); setStatusMsg(msg)
        }

      } else if (action === "ADD_STOCK") {
        if (invMatch) {
          // ── UPDATE EXISTING PRODUCT STOCK ──────────────
          const newStock = invMatch.stock + qty
          await Products.update(invMatch.id, { stock: newStock })
          const msg = t("stock_updated", lang, invMatch.name, invMatch.stock, `${newStock} ${unit}`)
          speak(msg, lang)
          addHistory({ type:"stock", original, result: msg })
          setStatus("done"); setStatusMsg(msg)
          refreshProducts()

        } else if (validation.found) {
          // ── CREATE NEW PRODUCT FROM DATABASE ──────────
          const detectedUnit = detectUnit(stdName)
          await Products.create({
            name:        stdName,
            category:    validation.product.category,
            unit:        detectedUnit.unit || validation.product.unit || "piece",
            stock:       qty,
            min_stock:   Math.max(5, Math.floor(qty * 0.2)),
            mrp:         0,
            cost_price:  0,
            gst_percent: validation.product.gst || 5,
          })
          const msg = t("new_product_added", lang, stdName, `${qty} ${unit}`)
          speak(msg, lang)
          addHistory({ type:"stock", original, result: msg })
          setStatus("done"); setStatusMsg(msg)
          refreshProducts()

        } else {
          const msg = t("product_unrecognized", lang, stdName)
          speak(msg, lang)
          addHistory({ type:"error", original, result: msg })
          setStatus("error"); setStatusMsg(msg)
        }
      }
    } catch(e) {
      const msg = t("err_generic", lang)
      setStatus("error"); setStatusMsg(msg)
      addHistory({ type:"error", original, result: msg })
      speak(msg, lang)
    }
  }

  function cancelAction() {
    speak(t("cancelled", lang), lang)
    setPending(null); setStatus("idle"); setStatusMsg("")
    addHistory({ type:"cancel", text:"Cancelled" })
  }

  // Stable refs so voiceEngine.onResult closure always calls the latest version
  const confirmActionRef = useRef(null)
  const cancelActionRef  = useRef(null)
  useEffect(() => { confirmActionRef.current = confirmAction }, [pending, lang])
  useEffect(() => { cancelActionRef.current  = cancelAction  }, [pending, lang])

  // Auto-start mic after confirmation card opens (voice-confirm mode).
  useEffect(() => {
    if (status === "confirm" && continuous && !voiceEngine.isListening) {
      const timer = setTimeout(() => {
        window.speechSynthesis?.cancel()
        voiceEngine.setLanguage(lang); voiceEngine.start()
      }, 1800)
      return () => clearTimeout(timer)
    }
  }, [status, continuous])

  // Auto-restart mic after item is added (continuous mode).
  useEffect(() => {
    if (status === "done" && continuous) {
      const timer = setTimeout(() => {
        window.speechSynthesis?.cancel()
        voiceEngine.setLanguage(lang); voiceEngine.start()
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [status, continuous])

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

      {/* ── Siri Orb + Mic button ─────────────────────────── */}
      <div className="flex flex-col items-center py-4 mb-3" style={{ position:"relative" }}>

        {/* Orb container */}
        <div style={{ position:"relative", width:160, height:160,
          display:"flex", alignItems:"center", justifyContent:"center" }}>

          {/* ── Listening: three morphing colour blobs ── */}
          {listening && (<>
            {/* Blob 1 — jade */}
            <div style={{
              position:"absolute", width:130, height:130,
              background:"radial-gradient(circle at 40% 40%, #27AE60, #0a7a58 60%, transparent 80%)",
              animation:"siri-morph-a 3.5s ease-in-out infinite, siri-spin-cw 10s linear infinite",
              opacity:0.75, filter:"blur(14px)",
            }}/>
            {/* Blob 2 — saffron */}
            <div style={{
              position:"absolute", width:115, height:115,
              background:"radial-gradient(circle at 60% 50%, #E87722, #c05a10 60%, transparent 80%)",
              animation:"siri-morph-b 4.2s ease-in-out infinite, siri-spin-ccw 13s linear infinite",
              opacity:0.6, filter:"blur(12px)",
            }}/>
            {/* Blob 3 — indigo accent */}
            <div style={{
              position:"absolute", width:105, height:105,
              background:"radial-gradient(circle at 50% 60%, #6C63FF, #3b3799 60%, transparent 80%)",
              animation:"siri-morph-c 5s ease-in-out infinite, siri-spin-cw 16s linear infinite reverse",
              opacity:0.45, filter:"blur(16px)",
            }}/>
          </>)}

          {/* ── Idle: soft breathing glow ── */}
          {!listening && (
            <div style={{
              position:"absolute", width:108, height:108, borderRadius:"50%",
              background:"radial-gradient(circle, rgba(29,158,117,0.35), transparent 70%)",
              animation:"siri-breathe 2.4s ease-in-out infinite",
            }}/>
          )}

          {/* ── Central mic button ── */}
          <button onClick={handleMic} disabled={!supported || status === "confirm"}
            style={{
              width:88, height:88, borderRadius:"50%", position:"relative", zIndex:2,
              display:"flex", alignItems:"center", justifyContent:"center",
              background: listening
                ? "linear-gradient(145deg,#1a1a2e,#16213e)"
                : "linear-gradient(145deg,#0F6E56,#1D9E75)",
              border: listening ? "2px solid rgba(255,255,255,0.15)" : "none",
              cursor:"pointer", outline:"none",
              boxShadow: listening
                ? "0 0 0 2px rgba(232,119,34,0.5), 0 0 40px rgba(108,99,255,0.4), 0 8px 32px rgba(0,0,0,0.4)"
                : "0 6px 28px rgba(15,110,86,0.5), 0 0 0 3px rgba(29,158,117,0.15)",
              transition:"all 0.4s cubic-bezier(.34,1.56,.64,1)",
              opacity: (!supported || status === "confirm") ? 0.4 : 1,
            }}>
            {listening ? (
              /* Stop icon when listening */
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <rect x="7" y="7" width="10" height="10" rx="2.5" fill="white"/>
              </svg>
            ) : (
              /* Mic icon when idle */
              <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>
        </div>

        {/* ── Frequency bars (Siri-style) ── */}
        <div style={{
          display:"flex", alignItems:"flex-end", justifyContent:"center",
          gap:3, height:36, marginTop:8,
          opacity: listening ? 1 : 0,
          transition:"opacity 0.4s ease",
        }}>
          {[28,42,56,36,52,44,60,38,48,32,54,40].map((h, i) => (
            <div key={i} className="siri-bar" style={{
              height: h,
              background: i % 3 === 0
                ? "linear-gradient(to top,#0F6E56,#27AE60)"
                : i % 3 === 1
                ? "linear-gradient(to top,#c05a10,#E87722)"
                : "linear-gradient(to top,#3b3799,#6C63FF)",
            }}/>
          ))}
        </div>

        {/* Status text */}
        <div className={`mt-3 text-xs text-center max-w-xs ${statusColors[status] || "text-gray-400"}`}
          style={{ minHeight:18 }}>
          {status === "idle" && !statusMsg
            ? t("tap_to_speak", lang)
            : statusMsg}
        </div>

        {/* Continuous mode toggle */}
        <button
          onClick={() => setContinuous(c => !c)}
          style={{
            marginTop: 10,
            display: "flex", alignItems: "center", gap: 7,
            padding: "6px 14px", borderRadius: 20,
            border: `1.5px solid ${continuous ? "var(--jade,#1D9E75)" : "var(--rule,#e0e0e0)"}`,
            background: continuous ? "rgba(29,158,117,0.10)" : "var(--bg2,#f5f5f5)",
            cursor: "pointer", fontSize: 11, fontWeight: 700,
            color: continuous ? "var(--jade,#1D9E75)" : "var(--ink-faint,#999)",
            transition: "all 0.2s",
          }}>
          {/* Toggle pill */}
          <div style={{
            width: 28, height: 16, borderRadius: 8, position: "relative",
            background: continuous ? "var(--jade,#1D9E75)" : "#ccc",
            transition: "background 0.2s", flexShrink: 0,
          }}>
            <div style={{
              position: "absolute", top: 2,
              left: continuous ? 14 : 2,
              width: 12, height: 12, borderRadius: "50%",
              background: "#fff", transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}/>
          </div>
          {continuous ? "🎙️ Hands-free ON" : "Hands-free OFF"}
        </button>

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

        {/* Multi-product confirmation card */}
        {status === "confirm" && multiPending.length > 0 && (
          <div style={{ marginTop:12, width:"100%", maxWidth:400,
            border:"2px solid var(--saffron,#e87722)", borderRadius:16,
            background:"rgba(232,119,34,0.06)", padding:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--saffron,#e87722)",
              textAlign:"center", marginBottom:12 }}>
              🎤 Heard {multiPending.length} items — confirm all?
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
              {multiPending.map((item, i) => {
                const pcs = item.unit === "dozen" ? item.qty * 12
                          : item.unit === "set"   ? item.qty * 6
                          : item.qty
                const lineAmt = item.invMatch?.mrp ? Math.round(item.invMatch.mrp * pcs) : 0
                return (
                  <div key={i} style={{ background:"var(--bg1,#fff)", borderRadius:10,
                    padding:"10px 12px", border:"1px solid var(--rule,rgba(0,0,0,0.08))" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"var(--ink,#1a0c04)", marginBottom:4 }}>
                          {item.invMatch?.name || item.stdName}
                          {!item.invMatch && (
                            <span style={{ fontSize:10, color:"var(--ember,#c0392b)", marginLeft:6 }}>
                              (not found)
                            </span>
                          )}
                        </div>
                        {/* Qty stepper */}
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <button
                            onClick={() => setMultiPending(mp => mp.map((x,j) =>
                              j===i ? {...x, qty: Math.max(1, x.qty-1)} : x))}
                            style={{ width:24,height:24,borderRadius:6,border:"1px solid var(--rule,#e0e0e0)",
                              background:"var(--bg2,#f5f5f5)",fontSize:14,fontWeight:700,
                              color:"var(--ink,#1a0c04)",cursor:"pointer",lineHeight:1 }}>−</button>
                          <span style={{ minWidth:52,textAlign:"center",fontSize:12,fontWeight:600,
                            color:"var(--ink,#1a0c04)" }}>{item.qty} {item.unit}</span>
                          <button
                            onClick={() => setMultiPending(mp => mp.map((x,j) =>
                              j===i ? {...x, qty: x.qty+1} : x))}
                            style={{ width:24,height:24,borderRadius:6,border:"1px solid var(--rule,#e0e0e0)",
                              background:"var(--bg2,#f5f5f5)",fontSize:14,fontWeight:700,
                              color:"var(--ink,#1a0c04)",cursor:"pointer",lineHeight:1 }}>+</button>
                          {lineAmt > 0 && (
                            <span style={{ marginLeft:6,fontSize:11,color:"var(--ink-faint,#888)" }}>
                              ₹{lineAmt}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setMultiPending(mp => mp.filter((_,j) => j !== i))}
                        style={{ background:"none", border:"none", color:"var(--ink-faint,#aaa)",
                          fontSize:18, cursor:"pointer", lineHeight:1, marginLeft:8 }}>×</button>
                    </div>
                  </div>
                )
              })}
            </div>
            {multiPending.length > 0 && (
              <div style={{ fontSize:12, fontWeight:600, color:"var(--ink-dim,#555)",
                textAlign:"center", marginBottom:10 }}>
                Total: ₹{multiPending.reduce((sum, item) => {
                  const pcs = item.unit === "dozen" ? item.qty * 12
                            : item.unit === "set"   ? item.qty * 6
                            : item.qty
                  return sum + Math.round((item.invMatch?.mrp || 0) * pcs)
                }, 0).toLocaleString("en-IN")}
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <button onClick={() => { setMultiPending([]); setStatus("idle"); setStatusMsg("") }}
                style={{ padding:"10px", borderRadius:10, fontSize:12, fontWeight:600,
                  background:"var(--bg2,#f5f5f5)", border:"1px solid var(--rule,#e0e0e0)",
                  color:"var(--ink-dim,#666)", cursor:"pointer" }}>
                ✕ Cancel all
              </button>
              <button onClick={confirmMultiAction}
                style={{ padding:"10px", borderRadius:10, fontSize:12, fontWeight:700,
                  background:"var(--saffron,#e87722)", border:"none",
                  color:"#fff", cursor:"pointer" }}>
                ✓ Add {multiPending.length} items
              </button>
            </div>
          </div>
        )}

        {/* Single confirmation card */}
        {status === "confirm" && pending && multiPending.length === 0 && (
          <div className="mt-3 w-full max-w-sm border-2 border-amber-300 bg-amber-50 rounded-xl p-4">
            <div className="text-xs font-semibold text-amber-800 mb-2 text-center">🎙️ Confirm this action</div>
            {/* Voice confirm hint — shown when continuous mode is on */}
            {continuous && (
              <div style={{
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                marginBottom:10, padding:"6px 12px", borderRadius:20,
                background:"rgba(232,119,34,0.12)", border:"1px solid rgba(232,119,34,0.3)",
              }}>
                <span style={{ fontSize:12 }}>🎤</span>
                <span style={{ fontSize:10, fontWeight:600, color:"#92400e" }}>
                  {t("voice_confirm_hint", lang)}
                </span>
                {listening && (
                  <span style={{
                    width:8, height:8, borderRadius:"50%", background:"#e87722",
                    animation:"siri-breathe 1s ease-in-out infinite", flexShrink:0,
                  }}/>
                )}
              </div>
            )}
            <div style={{background:"var(--bg1,#fff)",borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:12}}>
              {/* Improvement 4: Confidence indicator */}
              {pending.invMatch?._confidence && (
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,alignItems:"center"}}>
                  <span style={{fontSize:10,color:"var(--ink-faint,#888)"}}>Match confidence</span>
                  <span style={{
                    fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,
                    background: pending.invMatch._confidence >= 0.85 ? "rgba(26,122,74,0.15)" : pending.invMatch._confidence >= 0.60 ? "rgba(232,119,34,0.15)" : "rgba(192,57,43,0.15)",
                    color: pending.invMatch._confidence >= 0.85 ? "var(--jade,#1a7a4a)" : pending.invMatch._confidence >= 0.60 ? "var(--saffron,#e87722)" : "var(--ember,#c0392b)",
                  }}>
                    {pending.invMatch._confidence >= 0.85 ? "✓ High" : pending.invMatch._confidence >= 0.60 ? "~ Medium" : "? Low"} 
                    {" "}({Math.round((pending.invMatch._confidence||0.8)*100)}%)
                  </span>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{color:"var(--ink-faint,#888)"}}>Product</span>
                <span style={{fontWeight:600,color:"var(--ink,#1a0c04)"}}>
                  {pending.invMatch?.name || pending.stdName}
                  {!pending.invMatch && <span style={{fontSize:10,color:"var(--ember,#c0392b)",marginLeft:6}}>(not in inventory)</span>}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Quantity</span>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <button
                    onClick={() => setPending(p => ({ ...p, qty: Math.max(1, p.qty - 1) }))}
                    style={{width:26,height:26,borderRadius:6,border:"1px solid var(--rule,#e0e0e0)",
                      background:"var(--bg2,#f5f5f5)",fontSize:15,fontWeight:700,
                      color:"var(--ink,#1a0c04)",cursor:"pointer",lineHeight:1}}>−</button>
                  <span style={{minWidth:48,textAlign:"center",fontWeight:600,fontSize:13,
                    color:"var(--ink,#1a0c04)"}}>
                    {pending.qty} {pending.unit}
                  </span>
                  <button
                    onClick={() => setPending(p => ({ ...p, qty: p.qty + 1 }))}
                    style={{width:26,height:26,borderRadius:6,border:"1px solid var(--rule,#e0e0e0)",
                      background:"var(--bg2,#f5f5f5)",fontSize:15,fontWeight:700,
                      color:"var(--ink,#1a0c04)",cursor:"pointer",lineHeight:1}}>+</button>
                </div>
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
                  {(() => {
                    const pcs = pending.unit === "dozen" ? pending.qty * 12
                              : pending.unit === "set"   ? pending.qty * 6
                              : pending.qty
                    const after = Math.max(0, pending.invMatch.stock - pcs)
                    return (
                      <span className={`font-medium ${after < pending.invMatch.min_stock ? "text-red-500" : "text-primary"}`}>
                        {pending.invMatch.stock} → {after}
                      </span>
                    )
                  })()}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={cancelAction}
                style={{padding:"10px",borderRadius:10,fontSize:11,fontWeight:500,
                  background:"var(--bg2,#f5f5f5)",border:"1px solid var(--rule,#e0e0e0)",
                  color:"var(--ink-dim,#666)",cursor:"pointer"}}>
                ✕ {t("cancel",lang)}
              </button>
              <button onClick={confirmAction}
                style={{padding:"10px",borderRadius:10,fontSize:12,fontWeight:700,
                  background:"var(--saffron,#e87722)",border:"none",color:"#fff",cursor:"pointer"}}>
                ✓ {t("add_to_bill",lang)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick commands */}
      <div className="card mb-3">
        <div className="text-[10px] font-medium text-gray-500 mb-2">Try saying:</div>
        <div className="grid grid-cols-2 gap-1.5">
          {(storeMode === "bangle_fancy" ? [
            { lang:"Telugu",  ex:'"Rendu red kundan bangle size 2.4"' },
            { lang:"Hindi",   ex:'"Teen gold jhumka aur ek pink bangle"' },
            { lang:"Stock",   ex:'"Red bangle kitna bacha?"' },
            { lang:"Bill",    ex:'"Ek green earring bill mein daalo"' },
          ] : [
            { lang:"Telugu",  ex:'"Amul Milk 2 litres, Tata Salt 1 kilo"' },
            { lang:"Hindi",   ex:'"Do doodh aur ek namak aur paanch biscuit"' },
            { lang:"Stock",   ex:'"Maggi kitna bacha?"' },
            { lang:"Bill",    ex:'"Parle-G 5 packet bill mein daalo"' },
          ]).map(e => (
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

  // Fraction notation: "1/2 kg", "1/4 litre", "3/4 kg" — must run first
  // because the numeric regex would grab only the denominator (e.g. 2 from 1/2)
  const fracMatch = t.match(/\b(\d+)\/(\d+)\s*(kg|kilo|kilogram|gram|g\b|litre|liter|ltr|ml)\b/i)
  if (fracMatch) {
    const qty     = parseFloat(fracMatch[1]) / parseFloat(fracMatch[2])
    const unitRaw = fracMatch[3].toLowerCase()
    const unit    = /kg|kilo/.test(unitRaw) ? "kg"
                  : /^g$|gram/.test(unitRaw) ? "g"
                  : /litre|liter|ltr/.test(unitRaw) ? "litre"
                  : /ml/.test(unitRaw) ? "ml"
                  : "pc"
    return { qty, unit }
  }

  // Fraction words → multiplier (checked before numeric patterns)
  // Also covers compound transliterations like "arakilo" (అరకిలో as one word)
  const FRACTIONS = [
    // Half kg — compound transliterations (no space)
    { r:/\b(arakilo|arakg|arakkg|ardhakg|adhakg|aadhakilo|ardhakilo)\b/i,      qty:0.5,  unit:"kg"    },
    { r:/\b(aralit|ardhalitre|adhalitre|halflitre|halfliter)\b/i,               qty:0.5,  unit:"litre" },
    // Quarter kg — compound
    { r:/\b(pavkg|paavkg|paokilo|quarterkilo|quarterkg)\b/i,                    qty:0.25, unit:"kg"    },
    // Half — allow articles between word and unit: "half a kilo", "half kg", "ardha ek kilo"
    { r:/\b(half|adha|aadha|aadh|ardha|సగం|అర)\b.{0,8}\b(kg|kilo|kilogram)\b/i,  qty:0.5,  unit:"kg"    },
    { r:/\b(half|adha|aadha|aadh|ardha|సగం|అర)\b.{0,8}\b(litre|liter|ltr)\b/i,   qty:0.5,  unit:"litre" },
    // Quarter — same treatment
    { r:/\b(quarter|paao|paav|pav|paaon|చావుగంట|పాతిక)\b.{0,8}\b(kg|kilo)\b/i,   qty:0.25, unit:"kg"    },
    { r:/\b(quarter|paao|paav|pav|paaon|చావుగంట|పాతిక)\b.{0,8}\b(litre|liter)\b/i,qty:0.25, unit:"litre" },
    { r:/\bteen\s*quarter\s*(kg|kilo)/i,                                         qty:0.75, unit:"kg"    },
    { r:/\bsawa\s*(kg|kilo)/i,                                                   qty:1.25, unit:"kg"    },
    { r:/\b(dedh|deedh|de[dḍ]h)\s*(kg|kilo)/i,                                  qty:1.5,  unit:"kg"    },
  ]

  for (const f of FRACTIONS) {
    if (f.r.test(t)) return { qty: f.qty, unit: f.unit }
  }

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
    { r:/(\d+\.?\d*)\s*(dozen|doz|darjan|దజను|டஜன்|ಡಜನ್|ডজন|ਦਰਜਨ)/i, unit:"dozen" },
    { r:/(\d+\.?\d*)/,            unit:"pc"    },
  ]
  const WORD_NUMS = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
    ek:1,do:2,teen:3,char:4,paanch:5,chhe:6,saat:7,aath:8,nau:9,das:10,
    bees:20,tees:30,pachaas:50,okati:1,rendu:2,moodu:3,padi:10 }

  for (const p of patterns) {
    const m = t.match(p.r)
    if (m) return { qty: parseFloat(m[1]), unit: p.unit }
  }
  // "dozen" / "darjan" with no leading number → 1 dozen
  if (/\b(dozen|doz|darjan|దజను|டஜன்|ಡಜನ್|ডজন|ਦਰਜਨ)\b/i.test(t)) return { qty: 1, unit: "dozen" }
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


