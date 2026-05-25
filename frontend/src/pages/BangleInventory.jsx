import React, { useState, useEffect, useRef } from "react"
import JsBarcode from "jsbarcode"
import { useNavigate } from "react-router-dom"
import { getToken } from "../sync/db"
import { BangleProducts, BangleSuppliers } from "../sync/bangleDb"
import { VOICE_LANGS } from "../voice/useProductVoice.js"
import { getSavedLang } from "../voice/i18n.js"
import { parseProductDescription } from "../voice/parseProductDescription.js"
import { geminiParseProduct } from "../voice/geminiParse.js"
import { scanImageForProduct, fileToBase64 } from "../voice/geminiVision.js"
import { learnProduct, suggestMRP } from "../voice/productLearner.js"

const API    = import.meta.env.VITE_API_URL ?? ""
const INR    = n => "₹" + Number(n || 0).toLocaleString("en-IN")
const CATS = [
  // Jewellery
  "Bangles","Earrings","Necklace","Maang Tikka",
  "Anklet","Hair Clip","Bindi","Rings","Bracelet","Nose Ring",
  // Beauty & Makeup
  "Nail Polish","Kajal","Lipstick","Mehendi","Perfume","Compact","Skin Care",
  // Personal Care
  "Shampoo","Hair Oil","Body Lotion","Soap","Talcum Powder","Hair Color",
  "Other",
]

const CATEGORY_SIZES = {
  "Bangles":     ["2.2","2.4","2.6","2.8","2.10","2.12","2.14","Free Size"],
  "Earrings":    ["Studs","Drops","Hoops / Bali","Jhumka","Chandbali","Dangler","Ear Cuff","Tassel"],
  "Necklace":    ["Choker","Short (16\")","Princess (18\")","Medium (20\")","Long (24\")","Mala (30+\")","Layered"],
  "Maang Tikka": ["Small","Medium","Large","Jhoomar","Maathapatti"],
  "Anklet":      ["Small","Medium","Large","Adjustable","Free Size"],
  "Hair Clip":   ["Alligator","Claw","Bobby Pin","Banana","Butterfly","Scrunchie","U-Pin","Barrette","Hairband"],
  "Bindi":       ["Round","Oval","Tear Drop","Long","Star","Crescent","Diamond","Flower"],
  "Rings":       ["5","6","7","8","9","10","11","12","Adjustable"],
  "Bracelet":    ["XS","Small","Medium","Large","Free Size"],
  "Nose Ring":   ["Nath","Phool / Stud","Nose Ring","L-Shape Pin","Septum","Hoop","Screw"],
  // Beauty
  "Nail Polish": ["Regular","Matte","Glitter","Shimmer","Metallic","Gel","French Tip","Holographic"],
  "Kajal":       ["Pencil","Liquid","Gel Pot","Soft Kohl","Smudge Proof","Waterproof"],
  "Lipstick":    ["Matte","Glossy","Satin","Liquid Matte","Crayon","Tinted Balm","Gloss"],
  "Mehendi":     ["Regular Cone","Designer Cone","Herbal","Bridal","Rajasthani","Gel"],
  "Perfume":     ["30ml","50ml","100ml","150ml","200ml","Roll-on","Pocket"],
  "Compact":     ["Pressed Powder","Loose Powder","Foundation","BB Cream","Blush","Bronzer","Highlighter"],
  "Skin Care":   ["Face Wash","Moisturizer","Sunscreen","Serum","Toner","Face Pack","Scrub","Eye Cream"],
  // Personal Care
  "Shampoo":     ["50ml","100ml","200ml","400ml","1L","Sachet","Conditioner","Hair Mask"],
  "Hair Oil":    ["50ml","100ml","200ml","500ml","1L","Pouch","Roll-on","Serum"],
  "Body Lotion": ["50ml","100ml","200ml","400ml","Body Butter","Body Cream","Travel Size"],
  "Soap":        ["Bar 75g","Bar 100g","Bar 125g","Bar 150g","Body Wash 200ml","Body Wash 400ml","Hand Wash","Shower Gel"],
  "Talcum Powder":["50g","100g","150g","200g","300g","Prickly Heat","Baby Powder"],
  "Hair Color":  ["Natural Black","Dark Brown","Light Brown","Burgundy","Dark Red","Blonde","Wine Red","Grey Coverage"],
  "Other":       ["Small","Medium","Large","Free Size","Adjustable"],
}
const SIZES = CATEGORY_SIZES["Bangles"]

const SIZE_LABEL = {
  "Bangles":     "BANGLE SIZE",
  "Earrings":    "EARRING TYPE",
  "Necklace":    "NECKLACE LENGTH",
  "Maang Tikka": "TIKKA SIZE",
  "Anklet":      "ANKLET SIZE",
  "Hair Clip":   "CLIP TYPE",
  "Bindi":       "BINDI SHAPE",
  "Rings":       "RING SIZE",
  "Bracelet":    "BRACELET SIZE",
  "Nose Ring":   "NOSE RING TYPE",
  "Nail Polish": "FINISH TYPE",
  "Kajal":       "KAJAL TYPE",
  "Lipstick":    "LIP FINISH",
  "Mehendi":     "MEHENDI TYPE",
  "Perfume":     "SIZE / FORM",
  "Compact":       "PRODUCT TYPE",
  "Skin Care":     "PRODUCT TYPE",
  "Shampoo":       "SIZE / TYPE",
  "Hair Oil":      "SIZE",
  "Body Lotion":   "SIZE / TYPE",
  "Soap":          "TYPE / SIZE",
  "Talcum Powder": "SIZE / TYPE",
  "Hair Color":    "SHADE",
  "Other":         "SIZE / TYPE",
}

const COLOURS = [
  // Reds & Pinks
  "Red","Dark Red","Crimson","Hot Pink","Pink","Baby Pink","Rose Pink","Magenta",
  // Maroons & Browns
  "Maroon","Burgundy","Wine","Brown","Chocolate","Beige","Cream",
  // Greens
  "Green","Sea Green","Dark Green","Mehandi","Parrot Green","Light Green","Mint","Teal","Turquoise",
  // Blues
  "Blue","Navy","Sky Blue","Royal Blue","Cobalt Blue","Ice Blue",
  // Purples & Lavenders
  "Purple","Lavender","Violet","Lilac","Indigo",
  // Yellows & Oranges
  "Yellow","Mustard","Saffron","Orange","Peach","Coral",
  // Metallics & Neutrals
  "Gold","Rose Gold","Silver","White","Off-White","Ivory","Black","Charcoal","Gunmetal",
  // Multicolour
  "Multi","Dual Tone","Ombre","Rainbow",
]

// Maps each colour to its family so we can filter related shades
const COLOUR_FAMILY = {
  "Red":1,"Dark Red":1,"Crimson":1,"Hot Pink":1,"Pink":1,"Baby Pink":1,"Rose Pink":1,"Magenta":1,
  "Maroon":2,"Burgundy":2,"Wine":2,"Brown":2,"Chocolate":2,"Beige":2,"Cream":2,
  "Green":3,"Sea Green":3,"Dark Green":3,"Mehandi":3,"Parrot Green":3,"Light Green":3,"Mint":3,"Teal":3,"Turquoise":3,
  "Blue":4,"Navy":4,"Sky Blue":4,"Royal Blue":4,"Cobalt Blue":4,"Ice Blue":4,
  "Purple":5,"Lavender":5,"Violet":5,"Lilac":5,"Indigo":5,
  "Yellow":6,"Mustard":6,"Saffron":6,"Orange":6,"Peach":6,"Coral":6,
  "Gold":7,"Rose Gold":7,"Silver":7,"White":7,"Off-White":7,"Ivory":7,"Black":7,"Charcoal":7,"Gunmetal":7,
  "Multi":8,"Dual Tone":8,"Ombre":8,"Rainbow":8,
}

// Popular colours per category — shown when no colour detected from voice
const CATEGORY_COLOURS = {
  "Bangles":     COLOURS, // bangles come in every shade
  "Earrings":    ["Red","Pink","Gold","Silver","White","Black","Blue","Green","Purple","Multi","Rose Gold","Maroon","Navy","Coral","Turquoise","Magenta","Ivory","Dual Tone"],
  "Necklace":    ["Gold","Silver","Red","White","Black","Maroon","Green","Blue","Multi","Rose Gold","Coral","Purple","Ivory","Cream","Mehandi"],
  "Maang Tikka": ["Gold","Silver","Red","Maroon","White","Pink","Green","Blue","Multi","Rose Gold","Coral","Ivory"],
  "Anklet":      ["Gold","Silver","White","Red","Blue","Green","Multi","Rose Gold","Black","Ivory","Pink","Maroon"],
  "Hair Clip":   ["Black","White","Brown","Gold","Silver","Pink","Red","Blue","Green","Multi","Maroon","Navy"],
  "Bindi":       ["Red","Maroon","Gold","Silver","Black","White","Multi","Pink","Green","Blue","Coral"],
  "Rings":       ["Gold","Silver","Rose Gold","White","Black","Red","Blue","Green","Multi","Purple","Maroon","Coral"],
  "Bracelet":    ["Gold","Silver","Rose Gold","Red","Blue","Green","Multi","Black","White","Pink","Purple","Turquoise","Coral"],
  "Nose Ring":   ["Gold","Silver","Rose Gold","White","Red","Maroon","Multi"],
  "Nail Polish": ["Red","Pink","Maroon","Coral","Nude","Peach","Hot Pink","Magenta","Purple","Lavender","Gold","Silver","White","Black","Rose Pink","Burgundy","Wine","Ombre","Multi"],
  "Kajal":       ["Black","Brown","Navy","Maroon","Dark Green","Gold"],
  "Lipstick":    ["Red","Pink","Maroon","Coral","Nude","Peach","Hot Pink","Magenta","Purple","Rose Pink","Brown","Burgundy","Wine","Ivory"],
  "Mehendi":     ["Brown","Chocolate","Dark Red","Maroon","Black"],
  "Perfume":     ["Gold","Rose Gold","Silver","White","Black","Multi"],
  "Compact":     ["Ivory","Beige","Cream","Gold","Rose Gold","Brown"],
  "Skin Care":     ["White","Ivory","Cream","Beige"],
  "Shampoo":       ["White","Gold","Blue","Green","Pink","Purple","Black"],
  "Hair Oil":      ["Gold","Yellow","Brown","White","Ivory","Clear"],
  "Body Lotion":   ["White","Ivory","Cream","Pink","Gold","Rose Gold"],
  "Soap":          ["White","Pink","Red","Yellow","Green","Blue","Ivory","Multi"],
  "Talcum Powder": ["White","Pink","Blue","Ivory"],
  "Hair Color":    ["Black","Brown","Chocolate","Burgundy","Dark Red","Wine","Blonde","Auburn"],
  "Other":         COLOURS,
}

function suggestedColours(selected, category) {
  // If a colour was detected → show only that colour family
  if (selected.length) {
    const families = new Set(selected.map(c => COLOUR_FAMILY[c]).filter(Boolean))
    return COLOURS.filter(c => families.has(COLOUR_FAMILY[c]))
  }
  // No colour detected → show category-popular colours
  return CATEGORY_COLOURS[category] || COLOURS
}

const CATEGORY_DESIGNS = {
  "Bangles":     ["Plain","Kundan","Meenakari","Stone Work","Mirror Work","Lac","Metal","Glass","Pearl","Crystal","Thread","Oxidized","Zari","Antique"],
  "Earrings":    ["Plain","Kundan","Stone Work","Pearl","Crystal","Thread","Oxidized","Antique","Meenakari","Zari","Beaded","Tassel"],
  "Necklace":    ["Plain","Kundan","Meenakari","Stone Work","Pearl","Crystal","Temple","Oxidized","Antique","Zari","Beaded","Pendant","Locket"],
  "Maang Tikka": ["Plain","Kundan","Stone Work","Pearl","Crystal","Meenakari","Oxidized","Antique","Bridal"],
  "Anklet":      ["Plain","Ghungroo","Stone Work","Beaded","Oxidized","Antique","Charm","Kundan","Silver"],
  "Hair Clip":   ["Plain","Floral","Stone Work","Pearl","Crystal","Bow","Metal","Fabric","Bridal"],
  "Bindi":       ["Velvet","Crystal","Stone","Glitter","Matte","Traditional","Zari","Fancy"],
  "Rings":       ["Plain","Kundan","Stone Work","Pearl","Crystal","Oxidized","Antique","Band","Adjustable"],
  "Bracelet":    ["Plain","Kundan","Stone Work","Pearl","Crystal","Charm","Beaded","Tennis","Oxidized","Antique","Evil Eye"],
  "Nose Ring":   ["Plain","Stone Work","Kundan","Pearl","Oxidized","Antique","Traditional","Bridal"],
  "Nail Polish": ["Regular","Matte","Glitter","Metallic","Holographic","Crackle","French Tip"],
  "Kajal":       ["Regular","Waterproof","Smudge Proof","Kajal Pot","Soft Formula"],
  "Lipstick":    ["Matte","Glossy","Satin","Liquid","Tinted","Long Lasting","Moisturizing"],
  "Mehendi":     ["Regular","Designer","Herbal","Arabic Style","Rajasthani","Bridal"],
  "Perfume":     ["Floral","Fruity","Woody","Musky","Spicy","Fresh","Oriental","Aquatic"],
  "Compact":     ["Matte Finish","Dewy Finish","SPF","Natural","Full Coverage","Light Coverage"],
  "Skin Care":     ["Moisturizing","Brightening","Anti-Acne","SPF","Natural","Herbal","Organic","Nourishing"],
  "Shampoo":       ["Anti-Dandruff","Moisturizing","Volumizing","Strengthening","Keratin","Herbal","Organic","Color Protect","Onion","Argan Oil"],
  "Hair Oil":      ["Coconut","Almond","Amla","Jasmine","Argan","Bhringraj","Onion","Castor","Herbal","Ayurvedic"],
  "Body Lotion":   ["Moisturizing","Whitening","Brightening","SPF","Vitamin C","Aloe Vera","Cocoa Butter","Herbal","Nourishing"],
  "Soap":          ["Regular","Moisturizing","Herbal","Antibacterial","Glycerin","Charcoal","Kojic","Exfoliating","Ayurvedic"],
  "Talcum Powder": ["Regular","Prickly Heat","Cooling","Baby Soft","Deodorant","Herbal","Sandalwood","Rose"],
  "Hair Color":    ["Permanent","Semi-Permanent","Natural/Herbal","Ammonia Free","Henna Based","Quick"],
  "Other":         ["Plain","Kundan","Stone Work","Metal","Crystal","Oxidized","Antique","Beaded"],
}

const BEAUTY_CATS = new Set([
  "Nail Polish","Kajal","Lipstick","Mehendi","Perfume","Compact","Skin Care",
  "Shampoo","Hair Oil","Body Lotion","Soap","Talcum Powder","Hair Color",
])

const CATEGORY_BRANDS = {
  // Beauty & Makeup
  "Nail Polish":   ["Lakme","Maybelline","OPI","Revlon","Elle 18","Nykaa","Colorbar","Faces Canada","Sugar","Wet n Wild"],
  "Kajal":         ["Lakme","Maybelline","Himalaya","Mamaearth","Biotique","Colorbar","Faces Canada","MARS"],
  "Lipstick":      ["Lakme","Maybelline","MAC","NYX","Colorbar","Revlon","Elle 18","Nykaa","Sugar","Faces Canada"],
  "Mehendi":       ["Nupur","Zenia","Bio Dark","Reshma","Vcc Art","Natural Henna","HennaHub"],
  "Perfume":       ["Fogg","Engage","Wild Stone","Axe","Park Avenue","Denver","Davidoff","Titan Skinn","Yardley","Nike","Adidas"],
  "Compact":       ["Lakme","Maybelline","MAC","Colorbar","Revlon","Faces Canada","MARS","Nykaa"],
  "Skin Care":     ["Lakme","Pond's","Nivea","Himalaya","Mamaearth","Biotique","Cetaphil","Neutrogena","Vaseline","Dove","Simple"],
  // Personal Care
  "Shampoo":       ["Dove","Pantene","Head & Shoulders","TRESemmé","Sunsilk","L'Oreal","Clinic Plus","Himalaya","Mamaearth","WOW","Biotique"],
  "Hair Oil":      ["Parachute","Dabur Vatika","Bajaj Almond","Nihar","Dabur Amla","Indulekha","WOW","Himalaya","Biotique"],
  "Body Lotion":   ["Vaseline","Nivea","Dove","Himalaya","Mamaearth","Biotique","Neutrogena","Pond's","Jergens"],
  "Soap":          ["Dove","Lux","Lifebuoy","Dettol","Pears","Santoor","Margo","Hamam","Himalaya","Mamaearth"],
  "Talcum Powder": ["Pond's","Johnson's","Shower to Shower","Nycil","Santoor","Boroplus","Himalaya"],
  "Hair Color":    ["Garnier","L'Oreal","Godrej Expert","Revlon","Bigen","Indus Valley","Streax","Naturtint"],
  "Other":         [],
}

function authHeaders() {
  const t = getToken()
  return t ? { "Content-Type":"application/json", Authorization:`Bearer ${t}` }
           : { "Content-Type":"application/json" }
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders(), ...opts })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    const d = e.detail
    const msg = typeof d === "string" ? d
              : Array.isArray(d)      ? d.map(x => x.msg || JSON.stringify(x)).join("; ")
              : d                     ? JSON.stringify(d)
              : "Request failed"
    throw new Error(msg)
  }
  return res.json()
}

// Fetch summary separately (no offline fallback needed — just skip if offline)
async function fetchSummary() {
  try { return await apiFetch("/bangle/stock-summary") } catch { return null }
}

// ── Shared chip toggle helpers ─────────────────────────────
function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className="px-2 py-1 rounded-full text-[11px] font-medium border transition-all"
      style={{
        background:  active ? "var(--jade,#1D9E75)" : "var(--bg2,#f5f5f5)",
        color:       active ? "#fff"                : "var(--ink-dim,#555)",
        borderColor: active ? "var(--jade,#1D9E75)" : "transparent",
      }}>
      {label}
    </button>
  )
}

function toggleArr(arr, setArr, val) {
  setArr(a => a.includes(val) ? a.filter(x => x !== val) : [...a, val])
}

// ── Add Product Modal — 2-step wizard ─────────────────────
function AddProductModal({ onClose, onSaved }) {
  const [step, setStep]           = useState(1)
  const [form, setForm]           = useState({ name:"", category:"Bangles", brand:"", mrp:"", cost_price:"", gst_percent:3 })
  const [loading, setLoading]     = useState(false)
  const [err, setErr]             = useState("")
  const [voiceLang, setVoiceLang] = useState(() => getSavedLang() || "hi-IN")
  const [flashField, setFlashField] = useState(null)
  const [selColours, setSelColours] = useState([])
  const [selSizes,   setSelSizes]   = useState([])
  const [selDesigns, setSelDesigns] = useState([])
  const [stockPer,   setStockPer]   = useState("")

  // Smart Add state
  const [smartText,    setSmartText]    = useState("")
  const [smartParsing, setSmartParsing] = useState(false)
  const [smartResult,  setSmartResult]  = useState(null)
  const [smartErr,     setSmartErr]     = useState("")
  const [smartListening, setSmartListening] = useState(false)
  const [cameraScanning,  setCameraScanning]  = useState(false)
  const [cameraPreview,   setCameraPreview]   = useState(null)
  const [barcodeScanning, setBarcodeScanning] = useState(false)
  const [barcodeErr,      setBarcodeErr]      = useState("")
  const smartRecRef    = useRef(null)
  const cameraInputRef = useRef(null)
  const barcodeInputRef = useRef(null)

  // Scan Builder — full inline variant matrix after scan/parse
  const [scanBuilder,    setScanBuilder]    = useState(null)  // result from scan/parse
  const [scanForm,       setScanForm]       = useState({ name:"", category:"Bangles", brand:"", barcode:"", mrp:"", cost_price:"", gst_percent:3 })
  const [scanSelC,       setScanSelC]       = useState([])
  const [scanSelS,       setScanSelS]       = useState([])
  const [scanSelD,       setScanSelD]       = useState([])
  const [scanStock,      setScanStock]      = useState("12")
  const [scanSaving,     setScanSaving]     = useState(false)
  const [scanErr,        setScanErr]        = useState("")
  const [scanShowAllC,   setScanShowAllC]   = useState(false)
  const [step2ShowAllC,  setStep2ShowAllC]  = useState(false)
  const [scanColourQ,    setScanColourQ]    = useState("")
  const [step2ColourQ,   setStep2ColourQ]   = useState("")

  const set = (k,v) => setForm(f => ({...f,[k]:v}))

  const hasVariants  = selColours.length > 0 || selSizes.length > 0 || selDesigns.length > 0
  const variantCount = Math.max(1, selColours.length||1)
    * Math.max(1, selSizes.length||1)
    * Math.max(1, selDesigns.length||1)
  const activeSizes   = CATEGORY_SIZES[form.category]   || CATEGORY_SIZES["Other"]
  const activeDesigns = CATEGORY_DESIGNS[form.category] || CATEGORY_DESIGNS["Other"]
  const sizeLabel     = SIZE_LABEL[form.category] || "SIZE"

  useEffect(() => { setSelSizes([]); setSelDesigns([]) }, [form.category])
  useEffect(() => {
    if (!flashField) return
    const t = setTimeout(() => setFlashField(null), 1500)
    return () => clearTimeout(t)
  }, [flashField])

  async function parseSmartText(text) {
    if (!text?.trim()) return
    setSmartParsing(true); setSmartErr(""); setSmartResult(null)
    try {
      // Step 1: local parser (free, offline)
      let result = parseProductDescription(text)

      // Step 2: Gemini Flash fallback if local confidence is low
      if (!result || result.confidence < 0.5) {
        try {
          result = await geminiParseProduct(text)
        } catch {
          // Gemini not available (no API key or network error) — use local result anyway
        }
      }

      if (result && (result.name || result.category || result.mrp)) {
        openScanBuilder(result)
      } else {
        setSmartErr("Could not understand. Try: \"Red Kundan bangle, size 2.4, MRP 2500, cost 1800\"")
      }
    } catch (e) {
      setSmartErr("Parse error — try manual entry below.")
    } finally {
      setSmartParsing(false)
    }
  }

  function openScanBuilder(result) {
    if (!result) return
    setScanBuilder(result)
    if (result._preview) setCameraPreview(result._preview)
    setScanForm({
      name:        result.name        || "",
      category:    result.category    || "Bangles",
      brand:       result.brand       || "",
      barcode:     result.barcode     || "",
      mrp:         result.mrp         ? String(result.mrp)        : "",
      cost_price:  result.cost_price  ? String(result.cost_price) : "",
      gst_percent: result.gst_percent ?? 3,
    })
    setScanSelC(result.colours || [])
    setScanSelS(result.sizes   || [])
    setScanSelD(result.designs || [])
    setScanStock("12")
    setScanErr("")
    setSmartResult(null); setSmartText(""); setCameraPreview(null); setBarcodeErr("")
  }

  function closeScanBuilder() {
    setScanBuilder(null); setScanErr(""); setBarcodeErr("")
  }

  async function saveScanBuilder() {
    if (!scanForm.name.trim()) { setScanErr("Product name is required"); return }
    setScanSaving(true); setScanErr("")
    try {
      const product = await apiFetch("/bangle/products", {
        method: "POST",
        body: JSON.stringify({
          name:        scanForm.name.trim(),
          category:    scanForm.category,
          brand:       scanForm.brand.trim() || null,
          barcode:     scanForm.barcode.trim() || null,
          mrp:         Number(scanForm.mrp)        || 0,
          cost_price:  Number(scanForm.cost_price) || 0,
          gst_percent: Number(scanForm.gst_percent) || 3,
        })
      })
      if (scanSelC.length || scanSelS.length || scanSelD.length) {
        await apiFetch(`/bangle/products/${product.id}/variants/bulk`, {
          method: "POST",
          body: JSON.stringify({
            colours:           scanSelC,
            sizes:             scanSelS,
            designs:           scanSelD,
            stock_per_variant: Number(scanStock) || 0,
          })
        })
      }
      learnProduct({ category: product.category, colours: scanSelC, sizes: scanSelS, designs: scanSelD, mrp: product.mrp, cost_price: product.cost_price })
      onSaved()
    } catch (e) {
      setScanErr(e.message)
    }
    setScanSaving(false)
  }

  function startSmartVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSmartErr("Voice not supported in this browser. Use Chrome."); return }
    setSmartListening(true); setSmartErr("")
    const rec = new SR()
    rec.lang = voiceLang; rec.continuous = false; rec.interimResults = false; rec.maxAlternatives = 1
    rec.onend  = () => setSmartListening(false)
    rec.onerror = (e) => { setSmartListening(false); if (e.error !== "aborted") setSmartErr("Mic error — try again.") }
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript.trim()
      setSmartText(t)
      parseSmartText(t)
    }
    smartRecRef.current = rec
    try { rec.start() } catch { setSmartListening(false) }
  }

  function stopSmartVoice() {
    try { smartRecRef.current?.stop() } catch {}
    setSmartListening(false)
  }

  async function handleCameraCapture(e) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be re-selected
    e.target.value = ""

    setCameraScanning(true); setSmartErr(""); setSmartResult(null)
    try {
      const { base64, mimeType, preview } = await fileToBase64(file)
      setCameraPreview(preview)
      const result = await scanImageForProduct(base64, mimeType)
      if (result && (result.name || result.category || result.mrp)) {
        openScanBuilder({ ...result, _preview: preview })
      } else {
        setSmartErr("Could not read the image. Try better lighting or a clearer photo.")
      }
    } catch (err) {
      setSmartErr(`Scan failed: ${err.message}`)
      setCameraPreview(null)
    } finally {
      setCameraScanning(false)
    }
  }

  function mapOffCategory(tags) {
    if (!tags || !tags.length) return "Other"
    const t = tags.join(" ").toLowerCase()
    if (t.includes("nail polish") || t.includes("nail varnish")) return "Nail Polish"
    if (t.includes("kajal") || t.includes("kohl") || t.includes("eyeliner")) return "Kajal"
    if (t.includes("lipstick") || t.includes("lip color") || t.includes("lip colour")) return "Lipstick"
    if (t.includes("mehendi") || t.includes("henna")) return "Mehendi"
    if (t.includes("perfume") || t.includes("fragrance") || t.includes("eau de") || t.includes("deodorant")) return "Perfume"
    if (t.includes("compact") || t.includes("foundation") || t.includes("pressed powder")) return "Compact"
    if (t.includes("cream") || t.includes("moisturizer") || t.includes("serum") || t.includes("face wash") || t.includes("skin care")) return "Skin Care"
    if (t.includes("shampoo") || t.includes("conditioner")) return "Shampoo"
    if (t.includes("hair oil") || t.includes("hair serum")) return "Hair Oil"
    if (t.includes("body lotion") || t.includes("body cream") || t.includes("body butter")) return "Body Lotion"
    if (t.includes("soap") || t.includes("body wash") || t.includes("hand wash")) return "Soap"
    if (t.includes("talc") || t.includes("talcum") || t.includes("body powder")) return "Talcum Powder"
    if (t.includes("hair color") || t.includes("hair dye") || t.includes("hair colour")) return "Hair Color"
    if (t.includes("bangle") || t.includes("kada")) return "Bangles"
    if (t.includes("earring") || t.includes("jhumka")) return "Earrings"
    if (t.includes("necklace")) return "Necklace"
    if (t.includes("ring")) return "Rings"
    if (t.includes("bracelet")) return "Bracelet"
    if (t.includes("anklet")) return "Anklet"
    if (t.includes("hair clip") || t.includes("hair pin")) return "Hair Clip"
    if (t.includes("bindi")) return "Bindi"
    if (t.includes("tikka") || t.includes("maang")) return "Maang Tikka"
    if (t.includes("nose ring") || t.includes("nath")) return "Nose Ring"
    return "Other"
  }

  async function handleBarcodeCapture(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setBarcodeScanning(true); setBarcodeErr(""); setSmartErr("")
    try {
      if (!("BarcodeDetector" in window)) {
        setBarcodeErr("Barcode scanner needs Chrome on Android. Type barcode manually in the form.")
        setBarcodeScanning(false)
        return
      }
      const detector = new window.BarcodeDetector({ formats: ["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code"] })
      const bitmap = await createImageBitmap(file)
      const barcodes = await detector.detect(bitmap)
      if (!barcodes.length) {
        setBarcodeErr("No barcode detected. Hold camera steady in good lighting and try again.")
        setBarcodeScanning(false)
        return
      }
      const barcode = barcodes[0].rawValue
      let productData = { name:"", category:"Other", brand:"", barcode, source:"barcode-scan" }
      try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v3/product/${barcode}.json`)
        const data = await res.json()
        if (data.status === "success" && data.product) {
          const p = data.product
          const name = p.product_name_en || p.product_name || p.generic_name || ""
          const brand = p.brands?.split(",")[0]?.trim() || ""
          const catTags = [...(p.categories_tags || []), ...(p.labels_tags || []), p.product_name || ""]
          productData = { name, brand, barcode, category: mapOffCategory(catTags), source:"barcode-scan" }
        } else {
          setBarcodeErr(`Barcode ${barcode} scanned — fill product details manually.`)
        }
      } catch {
        setBarcodeErr(`Barcode ${barcode} scanned — couldn't fetch product info.`)
      }
      openScanBuilder(productData)
    } catch (err) {
      setBarcodeErr(`Scan failed: ${err.message}`)
    } finally {
      setBarcodeScanning(false)
    }
  }

  function goNext() {
    if (!form.name.trim()) { setErr("Product name is required"); return }
    setErr(""); setStep(2)
  }

  async function saveProduct(withVariants) {
    setLoading(true); setErr("")
    try {
      const p = await apiFetch("/bangle/products", {
        method:"POST",
        body: JSON.stringify({...form, mrp:+form.mrp||0, cost_price:+form.cost_price||0})
      })
      if (withVariants && hasVariants) {
        await apiFetch(`/bangle/products/${p.id}/variants/bulk`, {
          method:"POST",
          body: JSON.stringify({
            colours: selColours, sizes: selSizes, designs: selDesigns,
            stock_per_variant: +stockPer||0,
          })
        })
      }
      learnProduct({
        category: form.category,
        colours:  selColours, sizes: selSizes, designs: selDesigns,
        mrp: +form.mrp||0, cost_price: +form.cost_price||0,
      })
      onSaved(p)
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const flash = (f) => flashField===f
    ? { transition:"background-color 0.3s ease", backgroundColor:"rgba(43,158,110,0.18)" }
    : { transition:"background-color 0.3s ease" }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => e.target===e.currentTarget && onClose()}>
      <style>{`
        @keyframes voice-ring-inv {
          0%,100%{ box-shadow:0 0 0 0 rgba(239,68,68,.45),0 4px 16px rgba(239,68,68,.25); }
          50%    { box-shadow:0 0 0 14px rgba(239,68,68,0),0 6px 24px rgba(239,68,68,.1); }
        }
      `}</style>

      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl flex flex-col max-h-[92vh]">

        {/* ── Sticky header ── */}
        <div className="px-5 pt-5 pb-4 border-b" style={{borderColor:"var(--rule,#e5e7eb)"}}>

          {/* Title row */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-sm font-bold" style={{color:"var(--ink)"}}>
                {step===1 ? "Add New Product" : form.name || "Add Variants"}
              </div>
              {step===2 && (
                <div className="text-[11px] mt-0.5" style={{color:"var(--ink-faint)"}}>
                  {form.category} &nbsp;·&nbsp; MRP {form.mrp ? INR(form.mrp) : "—"}
                  {form.cost_price ? ` · Cost ${INR(form.cost_price)}` : ""}
                </div>
              )}
            </div>
            <button onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>

          {/* Step indicator */}
          <div style={{display:"flex", alignItems:"center", gap:0}}>
            {[{n:1,label:"Details"},{n:2,label:"Variants"}].map(({n,label},i)=>(
              <React.Fragment key={n}>
                {i>0 && (
                  <div style={{
                    flex:1, height:2, margin:"0 6px",
                    background: step>=2 ? "var(--saffron)" : "var(--rule,#e5e7eb)",
                    transition:"background 0.3s",
                  }}/>
                )}
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{
                    width:22, height:22, borderRadius:"50%", flexShrink:0,
                    fontSize:10, fontWeight:800,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background: step>n ? "var(--jade,#1D9E75)" : step===n ? "var(--saffron)" : "transparent",
                    color:       step>=n ? "#fff" : "var(--ink-faint,#9ca3af)",
                    border:      step<n  ? "1.5px solid var(--rule,#e5e7eb)" : "none",
                    transition:"all 0.3s",
                  }}>
                    {step>n ? "✓" : n}
                  </div>
                  <span style={{
                    fontSize:11, fontWeight: step===n ? 700 : 400,
                    color: step===n ? "var(--ink)" : "var(--ink-faint,#9ca3af)",
                    transition:"all 0.3s",
                  }}>{label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">

          {/* ── STEP 1: Basic details ── */}
          {step===1 && (
            <>
              {/* Smart Add panel */}
              <div style={{
                background:"var(--bg2,#f9fafb)", border:"1.5px solid var(--rule,#e5e7eb)",
                borderRadius:14, padding:"12px 14px",
              }}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
                  <span style={{fontSize:11, fontWeight:700, color:"var(--ink)"}}>
                    ⚡ Smart Add <span style={{fontWeight:400, color:"var(--ink-faint)"}}>— describe in one line</span>
                  </span>
                  {/* Language picker for mic */}
                  <div style={{display:"flex", gap:3, flexWrap:"wrap", justifyContent:"flex-end"}}>
                    {VOICE_LANGS.map(l=>(
                      <button key={l.code} onClick={()=>setVoiceLang(l.code)} title={l.name}
                        style={{
                          padding:"1px 7px", borderRadius:20, fontSize:10, fontWeight:700, cursor:"pointer",
                          background: voiceLang===l.code ? "var(--saffron)" : "transparent",
                          color:       voiceLang===l.code ? "#fff"          : "var(--ink-faint,#9ca3af)",
                          border:`1px solid ${voiceLang===l.code?"var(--saffron)":"var(--rule,#e5e7eb)"}`,
                        }}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{position:"relative"}}>
                  <textarea
                    value={smartText}
                    onChange={e => setSmartText(e.target.value)}
                    onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); parseSmartText(smartText) } }}
                    placeholder={'e.g. "Red Kundan bangle, size 2.4, MRP 2500, cost 1800"'}
                    rows={2}
                    style={{
                      width:"100%", boxSizing:"border-box",
                      borderRadius:8, border:"1px solid var(--rule,#e5e7eb)",
                      padding:"7px 10px", fontSize:12, resize:"none",
                      background:"#fff", color:"var(--ink)",
                      outline:"none",
                    }}
                  />
                </div>
                {/* Hidden camera file input — opens rear camera on mobile */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{display:"none"}}
                  onChange={handleCameraCapture}
                />
                {/* Hidden barcode camera input */}
                <input
                  ref={barcodeInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{display:"none"}}
                  onChange={handleBarcodeCapture}
                />

                <div style={{display:"flex", gap:6, marginTop:8}}>
                  <button
                    onClick={() => parseSmartText(smartText)}
                    disabled={smartParsing || cameraScanning || !smartText.trim()}
                    style={{
                      flex:1, padding:"6px 0", borderRadius:8, border:"none", cursor:"pointer",
                      background: smartParsing ? "#ccc" : "linear-gradient(135deg,#0F6E56,#1D9E75)",
                      color:"#fff", fontSize:12, fontWeight:700,
                      opacity: smartText.trim() ? 1 : 0.55,
                    }}>
                    {smartParsing ? "Parsing…" : "⚡ Parse"}
                  </button>
                  <button
                    onClick={smartListening ? stopSmartVoice : startSmartVoice}
                    disabled={cameraScanning}
                    style={{
                      padding:"6px 12px", borderRadius:8, border:"none", cursor:"pointer",
                      background: smartListening
                        ? "linear-gradient(135deg,#ef4444,#dc2626)"
                        : "linear-gradient(135deg,#e87722,#c47f00)",
                      color:"#fff", fontSize:13,
                      animation: smartListening ? "voice-ring-inv 1.2s ease-in-out infinite" : "none",
                    }}
                    title={smartListening ? "Stop recording" : "Speak product description"}>
                    {smartListening ? "⏹" : "🎤"}
                  </button>
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={cameraScanning || smartParsing || barcodeScanning}
                    style={{
                      padding:"6px 12px", borderRadius:8, border:"none", cursor:"pointer",
                      background: cameraScanning
                        ? "#ccc"
                        : "linear-gradient(135deg,#6366f1,#4f46e5)",
                      color:"#fff", fontSize:15,
                    }}
                    title="Take photo of price tag or product">
                    {cameraScanning ? "⏳" : "📷"}
                  </button>
                  <button
                    onClick={() => barcodeInputRef.current?.click()}
                    disabled={barcodeScanning || cameraScanning || smartParsing}
                    style={{
                      padding:"6px 12px", borderRadius:8, border:"none", cursor:"pointer",
                      background: barcodeScanning
                        ? "#ccc"
                        : "linear-gradient(135deg,#0891b2,#0e7490)",
                      color:"#fff", fontSize:15,
                    }}
                    title="Scan product barcode">
                    {barcodeScanning ? "⏳" : "🏷️"}
                  </button>
                </div>
                {smartListening && (
                  <div style={{fontSize:11, color:"#ef4444", textAlign:"center", marginTop:6, fontWeight:600}}>
                    Listening… speak your product description
                  </div>
                )}
                {smartErr && (
                  <div style={{fontSize:11, color:"#ef4444", marginTop:6, lineHeight:1.4}}>{smartErr}</div>
                )}
                {barcodeErr && (
                  <div style={{fontSize:11, color:"#0891b2", marginTop:6, lineHeight:1.4}}>{barcodeErr}</div>
                )}
                {/* Camera scanning indicator */}
                {cameraScanning && (
                  <div style={{
                    marginTop:10, textAlign:"center", padding:"14px 0",
                    background:"#f0f0ff", borderRadius:10, border:"1.5px solid #6366f1",
                  }}>
                    <div style={{fontSize:22, marginBottom:4}}>📷</div>
                    <div style={{fontSize:12, fontWeight:700, color:"#6366f1"}}>Reading image…</div>
                    <div style={{fontSize:11, color:"var(--ink-faint)", marginTop:2}}>Gemini Vision is scanning</div>
                  </div>
                )}
                {barcodeScanning && (
                  <div style={{
                    marginTop:10, textAlign:"center", padding:"14px 0",
                    background:"#f0f9ff", borderRadius:10, border:"1.5px solid #0891b2",
                  }}>
                    <div style={{fontSize:22, marginBottom:4}}>🏷️</div>
                    <div style={{fontSize:12, fontWeight:700, color:"#0891b2"}}>Reading barcode…</div>
                    <div style={{fontSize:11, color:"var(--ink-faint)", marginTop:2}}>Looking up product details</div>
                  </div>
                )}

                {/* Scan Builder — full inline variant matrix */}
                {scanBuilder && (() => {
                  const cat      = scanForm.category || "Bangles"
                  const sizes    = CATEGORY_SIZES[cat]   || CATEGORY_SIZES["Other"]
                  const designs  = CATEGORY_DESIGNS[cat] || CATEGORY_DESIGNS["Other"]
                  const varCount = Math.max(1,scanSelC.length||1) * Math.max(1,scanSelS.length||1) * Math.max(1,scanSelD.length||1)
                  const toggleC  = v => setScanSelC(p => p.includes(v) ? p.filter(x=>x!==v) : [...p,v])
                  const toggleS  = v => setScanSelS(p => p.includes(v) ? p.filter(x=>x!==v) : [...p,v])
                  const toggleD  = v => setScanSelD(p => p.includes(v) ? p.filter(x=>x!==v) : [...p,v])
                  return (
                    <div style={{marginTop:10, background:"#f0faf6", border:"2px solid #1D9E75", borderRadius:14, padding:"12px 14px"}}>
                      {/* Header */}
                      <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:12}}>
                        {cameraPreview && (
                          <img src={cameraPreview} alt="scan"
                            style={{width:52,height:52,objectFit:"cover",borderRadius:10,flexShrink:0,border:"1px solid #1D9E75"}}/>
                        )}
                        <div style={{flex:1}}>
                          <div style={{fontSize:12, fontWeight:700, color:"#0F6E56"}}>
                            {scanBuilder.source==="gemini-vision" ? "📷 Image Scanned" : scanBuilder.source==="barcode-scan" ? "🏷️ Barcode Scanned" : "⚡ Smart Parsed"} — configure all variants
                          </div>
                          <div style={{fontSize:10, color:"var(--ink-faint)", marginTop:1}}>
                            {scanForm.barcode
                              ? <span>Barcode: <span style={{fontFamily:"monospace"}}>{scanForm.barcode}</span></span>
                              : "Select colours, sizes & designs → save everything in one tap"
                            }
                          </div>
                        </div>
                        <button onClick={closeScanBuilder}
                          style={{background:"none",border:"none",cursor:"pointer",color:"var(--ink-faint)",fontSize:18,padding:"0 4px"}}>×</button>
                      </div>

                      {/* Product fields */}
                      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12}}>
                        <div style={{gridColumn:"1/-1"}}>
                          <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)", marginBottom:4}}>PRODUCT NAME *</div>
                          <input value={scanForm.name}
                            onChange={e => setScanForm(f=>({...f,name:e.target.value}))}
                            placeholder="e.g. Kundan Bangle Set"
                            style={{width:"100%",border:"1.5px solid #1D9E75",borderRadius:8,padding:"6px 10px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)", marginBottom:4}}>CATEGORY</div>
                          <select value={scanForm.category}
                            onChange={e => { setScanForm(f=>({...f,category:e.target.value})); setScanSelS([]); setScanSelD([]) }}
                            style={{width:"100%",border:"1.5px solid var(--rule)",borderRadius:8,padding:"6px 8px",fontSize:12,outline:"none",background:"white"}}>
                            {CATS.map(c=><option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)", marginBottom:4}}>GST %</div>
                          <select value={scanForm.gst_percent}
                            onChange={e => setScanForm(f=>({...f,gst_percent:Number(e.target.value)}))}
                            style={{width:"100%",border:"1.5px solid var(--rule)",borderRadius:8,padding:"6px 8px",fontSize:12,outline:"none",background:"white"}}>
                            {[0,3,5,12,18].map(g=><option key={g} value={g}>{g}%</option>)}
                          </select>
                        </div>
                        <div>
                          <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)", marginBottom:4}}>MRP (₹)</div>
                          <input type="number" min="0" value={scanForm.mrp}
                            onChange={e => setScanForm(f=>({...f,mrp:e.target.value}))}
                            placeholder="0"
                            style={{width:"100%",border:"1.5px solid var(--rule)",borderRadius:8,padding:"6px 10px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)", marginBottom:4}}>COST (₹)</div>
                          <input type="number" min="0" value={scanForm.cost_price}
                            onChange={e => setScanForm(f=>({...f,cost_price:e.target.value}))}
                            placeholder="0"
                            style={{width:"100%",border:"1.5px solid var(--rule)",borderRadius:8,padding:"6px 10px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                        </div>
                        {BEAUTY_CATS.has(scanForm.category) && (
                          <div style={{gridColumn:"1/-1"}}>
                            <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)", marginBottom:4}}>BRAND <span style={{fontWeight:400}}>(optional)</span></div>
                            <input value={scanForm.brand}
                              onChange={e => setScanForm(f=>({...f,brand:e.target.value}))}
                              list={`scan-brands-${scanForm.category}`}
                              placeholder={`e.g. ${(CATEGORY_BRANDS[scanForm.category]||[])[0]||"Lakme, Parachute…"}`}
                              style={{width:"100%",border:"1.5px solid var(--rule)",borderRadius:8,padding:"6px 10px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                            <datalist id={`scan-brands-${scanForm.category}`}>
                              {(CATEGORY_BRANDS[scanForm.category]||[]).map(b=><option key={b} value={b}/>)}
                            </datalist>
                          </div>
                        )}
                      </div>

                      {/* Colour chips — searchable; filtered to detected family when colours are auto-detected */}
                      <div style={{marginBottom:10}}>
                        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5}}>
                          <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)", letterSpacing:"0.5px"}}>COLOURS</div>
                          {scanSelC.length > 0 && !scanColourQ && (
                            <button onClick={()=>setScanShowAllC(v=>!v)}
                              style={{background:"none",border:"none",fontSize:10,color:"var(--jade)",cursor:"pointer",padding:0,fontWeight:600}}>
                              {scanShowAllC ? "Show related only" : `Show all ${COLOURS.length}`}
                            </button>
                          )}
                        </div>
                        <input
                          value={scanColourQ} onChange={e=>setScanColourQ(e.target.value)}
                          placeholder="Search colour…"
                          style={{width:"100%",border:"1.5px solid var(--rule)",borderRadius:8,padding:"5px 10px",fontSize:11,outline:"none",boxSizing:"border-box",marginBottom:6}}/>
                        <div style={{display:"flex", flexWrap:"wrap", gap:5}}>
                          {(scanColourQ
                            ? COLOURS.filter(c=>c.toLowerCase().includes(scanColourQ.toLowerCase()))
                            : (scanShowAllC ? COLOURS : suggestedColours(scanSelC, scanForm.category))
                          ).map(c=><Chip key={c} label={c} active={scanSelC.includes(c)} onClick={()=>toggleC(c)}/>)}
                        </div>
                      </div>

                      {/* Size chips */}
                      <div style={{marginBottom:10}}>
                        <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)", marginBottom:6, letterSpacing:"0.5px"}}>
                          {SIZE_LABEL[cat] || "SIZE"}
                        </div>
                        <div style={{display:"flex", flexWrap:"wrap", gap:5}}>
                          {sizes.map(s=><Chip key={s} label={s} active={scanSelS.includes(s)} onClick={()=>toggleS(s)}/>)}
                        </div>
                      </div>

                      {/* Design chips */}
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)", marginBottom:6, letterSpacing:"0.5px"}}>DESIGN <span style={{fontWeight:400}}>(optional)</span></div>
                        <div style={{display:"flex", flexWrap:"wrap", gap:5}}>
                          {designs.map(d=><Chip key={d} label={d} active={scanSelD.includes(d)} onClick={()=>toggleD(d)}/>)}
                        </div>
                      </div>

                      {/* Stock + variant count + save */}
                      <div style={{background:"white", borderRadius:10, padding:"10px 12px", marginBottom:10}}>
                        <div style={{display:"flex", alignItems:"center", gap:12}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:10, fontWeight:700, color:"var(--ink-dim)", marginBottom:4}}>STOCK PER VARIANT</div>
                            <input type="number" min="0" value={scanStock}
                              onChange={e=>setScanStock(e.target.value)}
                              style={{width:"100%",border:"1.5px solid var(--saffron)",borderRadius:8,padding:"6px 10px",fontSize:14,fontWeight:700,color:"var(--saffron)",textAlign:"center",outline:"none",boxSizing:"border-box"}}/>
                          </div>
                          <div style={{textAlign:"center", color:"var(--jade)", fontSize:11, fontWeight:700}}>
                            <div style={{fontSize:20}}>{varCount}</div>
                            <div>variants</div>
                            <div style={{fontSize:10, color:"var(--ink-faint)", fontWeight:400}}>
                              {varCount * (Number(scanStock)||0)} pcs total
                            </div>
                          </div>
                        </div>
                      </div>

                      {scanErr && <div style={{color:"#dc2626", fontSize:11, marginBottom:8}}>{scanErr}</div>}

                      <button onClick={saveScanBuilder} disabled={scanSaving}
                        style={{
                          width:"100%", padding:"12px 0",
                          background: scanSaving ? "#ccc" : "linear-gradient(135deg,#0F6E56,#1D9E75)",
                          color:"#fff", border:"none", borderRadius:10,
                          fontSize:13, fontWeight:700, cursor: scanSaving ? "not-allowed" : "pointer",
                        }}>
                        {scanSaving ? "Saving…" : `📦 Add ${varCount} Variant${varCount!==1?"s":""} to Inventory`}
                      </button>
                    </div>
                  )
                })()}
              </div>

              <div style={{
                display:"flex", alignItems:"center", gap:8,
                color:"var(--ink-faint,#9ca3af)", fontSize:10, fontWeight:600,
              }}>
                <div style={{flex:1, height:1, background:"var(--rule,#e5e7eb)"}}/>
                OR FILL MANUALLY
                <div style={{flex:1, height:1, background:"var(--rule,#e5e7eb)"}}/>
              </div>

              <div>
                <label className="label">Product Name *</label>
                <input className="input" placeholder="e.g. Kundan Bangle, Pearl Earrings…"
                  value={form.name} onChange={e=>set("name",e.target.value)}
                  style={flash("name")} />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category}
                  onChange={e=>set("category",e.target.value)} style={flash("category")}>
                  {CATS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">MRP (₹)</label>
                  <input className="input" type="number" min="0" placeholder="0"
                    value={form.mrp} onChange={e=>set("mrp",e.target.value)}
                    style={flash("mrp")} />
                </div>
                <div>
                  <label className="label">Cost (₹)</label>
                  <input className="input" type="number" min="0" placeholder="0"
                    value={form.cost_price} onChange={e=>{
                      set("cost_price",e.target.value)
                      if (!form.mrp) {
                        const suggested = suggestMRP(+e.target.value, form.category)
                        if (suggested > 0) set("mrp", String(suggested))
                      }
                    }}
                    style={flash("cost_price")} />
                </div>
              </div>
              <div>
                <label className="label">GST %</label>
                <select className="input" value={form.gst_percent}
                  onChange={e=>set("gst_percent",+e.target.value)} style={flash("gst_percent")}>
                  {[0,3,5,12,18].map(g=><option key={g} value={g}>{g}%</option>)}
                </select>
              </div>

              {BEAUTY_CATS.has(form.category) && (
                <div>
                  <label className="label">Brand <span style={{fontWeight:400,color:"var(--ink-faint)"}}>optional</span></label>
                  <input className="input" list="manual-brands"
                    placeholder={`e.g. ${(CATEGORY_BRANDS[form.category]||[])[0]||"Lakme, Parachute…"}`}
                    value={form.brand} onChange={e=>set("brand",e.target.value)}
                    style={flash("brand")} />
                  <datalist id="manual-brands">
                    {(CATEGORY_BRANDS[form.category]||[]).map(b=><option key={b} value={b}/>)}
                  </datalist>
                </div>
              )}

              {err && <p className="text-red-500 text-xs">{err}</p>}

              {/* Step 1 actions */}
              <div style={{display:"flex", gap:8, paddingTop:4}}>
                <button onClick={()=>saveProduct(false)} disabled={loading}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
                  style={{
                    border:"1.5px solid var(--rule,#e5e7eb)",
                    color:"var(--ink-dim,#6b7280)",
                    background:"transparent",
                  }}>
                  {loading ? "Saving…" : "Save Only"}
                </button>
                <button onClick={goNext} disabled={loading}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                  style={{background:"linear-gradient(135deg,#0F6E56,#1D9E75)"}}>
                  Add Variants →
                </button>
              </div>
              <p className="text-[10px] text-center" style={{color:"var(--ink-faint,#9ca3af)"}}>
                "Save Only" for single items &nbsp;·&nbsp; "Add Variants" for multiple colours/sizes
              </p>
            </>
          )}

          {/* ── STEP 2: Variants ── */}
          {step===2 && (
            <>
              {/* Colours — searchable; filtered to detected family when colours are pre-selected */}
              <div style={{borderRadius:8, padding:"2px 0", ...flash("colours")}}>
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5}}>
                  <div className="text-[10px] font-bold" style={{color:"var(--ink-faint)"}}>COLOURS</div>
                  {selColours.length > 0 && !step2ColourQ && (
                    <button onClick={()=>setStep2ShowAllC(v=>!v)}
                      style={{background:"none",border:"none",fontSize:10,color:"var(--jade)",cursor:"pointer",padding:0,fontWeight:600}}>
                      {step2ShowAllC ? "Show related only" : `Show all ${COLOURS.length}`}
                    </button>
                  )}
                </div>
                <input
                  value={step2ColourQ} onChange={e=>setStep2ColourQ(e.target.value)}
                  placeholder="Search colour…"
                  style={{width:"100%",border:"1.5px solid var(--rule)",borderRadius:8,padding:"5px 10px",fontSize:11,outline:"none",boxSizing:"border-box",marginBottom:6}}/>
                <div className="flex flex-wrap gap-1.5">
                  {(step2ColourQ
                    ? COLOURS.filter(c=>c.toLowerCase().includes(step2ColourQ.toLowerCase()))
                    : (step2ShowAllC ? COLOURS : suggestedColours(selColours, form.category))
                  ).map(c=>(
                    <Chip key={c} label={c}
                      active={selColours.includes(c)}
                      onClick={()=>toggleArr(selColours,setSelColours,c)} />
                  ))}
                </div>
              </div>

              {/* Sizes — label + options from category */}
              <div style={{borderRadius:8, padding:"2px 0", ...flash("sizes")}}>
                <div className="text-[10px] font-bold mb-1.5" style={{color:"var(--ink-faint)"}}>
                  {sizeLabel}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeSizes.map(s=>(
                    <Chip key={s} label={s}
                      active={selSizes.includes(s)}
                      onClick={()=>toggleArr(selSizes,setSelSizes,s)} />
                  ))}
                </div>
              </div>

              {/* Designs */}
              <div style={{borderRadius:8, padding:"2px 0", ...flash("designs")}}>
                <div className="text-[10px] font-bold mb-1.5" style={{color:"var(--ink-faint)"}}>
                  DESIGN <span style={{fontWeight:400}}>(optional)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeDesigns.map(d=>(
                    <Chip key={d} label={d}
                      active={selDesigns.includes(d)}
                      onClick={()=>toggleArr(selDesigns,setSelDesigns,d)} />
                  ))}
                </div>
              </div>

              {/* Stock — only shows once a chip is selected */}
              {hasVariants && (
                <div style={{
                  background:"var(--bg2,#f9fafb)", borderRadius:12,
                  border:"1px solid var(--rule,#e5e7eb)", padding:"12px 14px",
                }}>
                  <label className="label">Opening Stock per Variant</label>
                  <div style={{display:"flex", alignItems:"center", gap:8}}>
                    <input className="input" type="number" min="0" placeholder="0"
                      value={stockPer} onChange={e=>setStockPer(e.target.value)}
                      style={{flex:1, ...flash("stock_per")}} />
                    <span style={{fontSize:11, color:"var(--ink-faint)", whiteSpace:"nowrap"}}>
                      ×{variantCount} = {variantCount*(+stockPer||0)} pcs
                    </span>
                  </div>
                  <p style={{fontSize:10, color:"var(--jade,#1D9E75)", marginTop:6, fontWeight:600}}>
                    {variantCount} variant{variantCount>1?"s":""} will be created
                  </p>
                </div>
              )}

              {!hasVariants && (
                <p className="text-[11px] text-center py-2" style={{color:"var(--ink-faint,#9ca3af)"}}>
                  Select colours / sizes above to create variants
                </p>
              )}

              {err && <p className="text-red-500 text-xs">{err}</p>}

              {/* Step 2 actions */}
              <div style={{display:"flex", gap:8, paddingTop:4}}>
                <button onClick={()=>{setStep(1);setErr("")}}
                  className="py-2 rounded-xl text-sm font-semibold"
                  style={{
                    padding:"8px 16px",
                    border:"1.5px solid var(--rule,#e5e7eb)",
                    color:"var(--ink-dim,#6b7280)",
                    background:"transparent",
                  }}>
                  ← Back
                </button>
                <button onClick={()=>saveProduct(true)} disabled={loading}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                  style={{background:"linear-gradient(135deg,#0F6E56,#1D9E75)"}}>
                  {loading
                    ? "Saving…"
                    : hasVariants
                      ? `Save + ${variantCount} Variant${variantCount>1?"s":""}`
                      : "Save Product"}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Add Variants Modal ─────────────────────────────────────
function AddVariantsModal({ product, onClose, onSaved }) {
  const [mode, setMode]       = useState("matrix") // matrix | single
  const [selColours, setSelColours] = useState([])
  const [selSizes,   setSelSizes]   = useState([])
  const [selDesigns, setSelDesigns] = useState([])
  const [stockPer,   setStockPer]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")

  // Single variant
  const [single, setSingle] = useState({colour:"",size:"",design:"",stock:0})

  const matrixCount = Math.max(1,selColours.length||1) * Math.max(1,selSizes.length||1) * Math.max(1,selDesigns.length||1)

  async function saveMatrix() {
    setLoading(true); setErr("")
    try {
      const res = await apiFetch(`/bangle/products/${product.id}/variants/bulk`, {
        method:"POST",
        body: JSON.stringify({
          colours: selColours.length ? selColours : [],
          sizes:   selSizes.length   ? selSizes   : [],
          designs: selDesigns.length ? selDesigns : [],
          stock_per_variant: +stockPer||0,
        })
      })
      onSaved(res)
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  async function saveSingle() {
    setLoading(true); setErr("")
    try {
      const res = await apiFetch(`/bangle/products/${product.id}/variants`, {
        method:"POST",
        body: JSON.stringify({...single, stock:+single.stock||0})
      })
      onSaved({created:1, variants:[res]})
    } catch(e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="sticky top-0 bg-white p-5 pb-3 border-b">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-bold" style={{color:"var(--ink)"}}>Add Variants</div>
              <div className="text-[11px]" style={{color:"var(--ink-faint)"}}>{product.name}</div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <div className="flex gap-2 mt-3">
            {[["matrix","Matrix (bulk)"],["single","Single variant"]].map(([m,l])=>(
              <button key={m} onClick={()=>setMode(m)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                style={{
                  background: mode===m ? "var(--jade,#1D9E75)" : "transparent",
                  color: mode===m ? "#fff" : "var(--ink-dim)",
                  borderColor: mode===m ? "var(--jade,#1D9E75)" : "#e5e7eb"
                }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {mode === "matrix" ? (
            <>
              <div>
                <div className="text-xs font-bold mb-2" style={{color:"var(--ink-dim)"}}>COLOURS</div>
                <div className="flex flex-wrap gap-1.5">
                  {COLOURS.map(c=><Chip key={c} label={c} active={selColours.includes(c)} onClick={()=>toggleArr(selColours,setSelColours,c)}/>)}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold mb-2" style={{color:"var(--ink-dim)"}}>
                  {SIZE_LABEL[product.category] || "SIZE"}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(CATEGORY_SIZES[product.category] || CATEGORY_SIZES["Other"])
                    .map(s=><Chip key={s} label={s} active={selSizes.includes(s)} onClick={()=>toggleArr(selSizes,setSelSizes,s)}/>)}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold mb-2" style={{color:"var(--ink-dim)"}}>DESIGN (optional)</div>
                <div className="flex flex-wrap gap-1.5">
                  {(CATEGORY_DESIGNS[product.category] || CATEGORY_DESIGNS["Other"]).map(d=><Chip key={d} label={d} active={selDesigns.includes(d)} onClick={()=>toggleArr(selDesigns,setSelDesigns,d)}/>)}
                </div>
              </div>
              <div>
                <label className="label">Opening stock per variant</label>
                <input className="input" type="number" min="0" value={stockPer}
                  onChange={e=>setStockPer(e.target.value)} placeholder="0" />
              </div>
              {(selColours.length>0||selSizes.length>0||selDesigns.length>0) && (
                <div className="text-xs text-center py-2 rounded-lg" style={{background:"#f0faf6",color:"var(--jade)"}}>
                  Will create <b>{matrixCount}</b> variants
                </div>
              )}
              {err && <p className="text-red-500 text-xs">{err}</p>}
              <button onClick={saveMatrix} disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{background:"linear-gradient(135deg,#0F6E56,#1D9E75)"}}>
                {loading ? "Creating..." : `Create ${matrixCount} Variants`}
              </button>
            </>
          ) : (
            <>
              {[["colour","Colour","e.g. Red"],["size","Size","e.g. 2.6"],["design","Design","e.g. Kundan"]].map(([k,l,p])=>(
                <div key={k}>
                  <label className="label">{l}</label>
                  <input className="input" placeholder={p} value={single[k]}
                    onChange={e=>setSingle(s=>({...s,[k]:e.target.value}))} />
                </div>
              ))}
              <div>
                <label className="label">Opening Stock</label>
                <input className="input" type="number" min="0" value={single.stock}
                  onChange={e=>setSingle(s=>({...s,stock:e.target.value}))} />
              </div>
              {err && <p className="text-red-500 text-xs">{err}</p>}
              <button onClick={saveSingle} disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{background:"linear-gradient(135deg,#0F6E56,#1D9E75)"}}>
                {loading ? "Saving..." : "Add Variant"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Variant Row ────────────────────────────────────────────
function VariantRow({ variant, productMrp, onStockChange }) {
  const [stock, setStock] = useState(variant.stock)
  const [saving, setSaving] = useState(false)
  const isLow = stock < variant.min_stock
  const isOut = stock === 0

  async function save(newStock) {
    setSaving(true)
    try {
      await apiFetch(`/bangle/variants/${variant.id}`, {
        method:"PATCH", body: JSON.stringify({stock: newStock})
      })
      onStockChange(variant.id, newStock)
    } catch {}
    finally { setSaving(false) }
  }

  return (
    <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs"
      style={{background: isOut?"#fef2f2": isLow?"#fffbeb":"#f8faf8"}}>
      <div className="flex-1 flex flex-wrap gap-1">
        {variant.colour && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{background:"#e8f4f0",color:"var(--jade)"}}>{variant.colour}</span>}
        {variant.size   && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{background:"#eef2fe",color:"#4f46e5"}}>{variant.size}</span>}
        {variant.design && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{background:"#fdf4ff",color:"#9333ea"}}>{variant.design}</span>}
      </div>
      <div className="text-[10px]" style={{color: isOut?"#dc2626":isLow?"#d97706":"var(--ink-faint)"}}>
        {isOut?"OUT":isLow?"LOW":""}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={()=>{const n=Math.max(0,stock-1);setStock(n);save(n)}}
          className="w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center"
          style={{background:"var(--bg2)",color:"var(--ink-dim)"}}>−</button>
        <input type="number" min="0" value={stock}
          onChange={e=>setStock(+e.target.value)}
          onBlur={e=>save(+e.target.value)}
          className="w-12 text-center text-xs font-bold rounded-md border"
          style={{borderColor:"var(--rule)",padding:"2px 4px"}}/>
        <button onClick={()=>{const n=stock+1;setStock(n);save(n)}}
          className="w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center"
          style={{background:"var(--bg2)",color:"var(--ink-dim)"}}>+</button>
      </div>
      <div className="text-[10px] font-semibold w-12 text-right" style={{color:"var(--jade)"}}>
        {INR(variant.mrp||productMrp)}
      </div>
    </div>
  )
}

// ── Barcode Labels Modal ────────────────────────────────────
// Single barcode label — needs its own ref so JsBarcode can target the SVG
function BarcodeLabel({ product, variant }) {
  const svgRef = useRef(null)
  const mrp = variant.mrp || product.mrp || 0

  useEffect(() => {
    if (!svgRef.current || !variant.id) return
    try {
      JsBarcode(svgRef.current, variant.id, {
        format:       "CODE128",
        width:        1.4,
        height:       38,
        displayValue: false,
        margin:       4,
        background:   "#ffffff",
        lineColor:    "#000000",
      })
    } catch(e) { console.error("JsBarcode error:", e) }
  }, [variant.id])

  const variantLabel = [variant.colour, variant.size, variant.design].filter(Boolean).join(" · ") || "Default"

  return (
    <div className="barcode-label"
      style={{ border:"1.5px solid #d1d5db", borderRadius:8, padding:"8px 10px",
        textAlign:"center", background:"#fff", display:"flex", flexDirection:"column", alignItems:"center" }}>
      {product.image_url ? (
        <img src={product.image_url} alt={product.name}
          style={{ width:44, height:44, objectFit:"cover", borderRadius:6, marginBottom:4 }} />
      ) : (
        <div style={{ width:44, height:44, borderRadius:6, marginBottom:4,
          background:"#fbeaef", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
          💍
        </div>
      )}
      <div style={{ fontWeight:700, color:"#111", fontSize:11, lineHeight:1.3, marginBottom:2 }}>
        {product.name}
      </div>
      <div style={{ color:"#6b7280", fontSize:9, marginBottom:6 }}>{variantLabel}</div>
      <svg ref={svgRef} style={{ maxWidth:"100%", height:50 }} />
      <div style={{ fontWeight:800, color:"var(--saffron,#e87722)", fontSize:13, marginTop:4 }}>
        {INR(mrp)}<span style={{ fontSize:8, fontWeight:500, color:"#9ca3af", marginLeft:2 }}>/dz</span>
      </div>
      {product.gst_percent > 0 && (
        <div style={{ fontSize:8, color:"#9ca3af", marginTop:1 }}>
          +{product.gst_percent}% GST
        </div>
      )}
    </div>
  )
}

function BarcodeLabelsModal({ product, onClose }) {
  const variants = (product.variants || []).filter(v => v.is_active !== false)

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#barcode-print-area) { display: none !important; }
          #barcode-print-area {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px; padding: 12px;
          }
          .barcode-label { page-break-inside: avoid; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl"
          style={{ maxHeight:"88vh", display:"flex", flexDirection:"column" }}>
          {/* Header */}
          <div className="no-print" style={{ padding:"16px 20px", borderBottom:"1px solid var(--rule)",
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)" }}>🏷️ Barcode Labels</div>
              <div style={{ fontSize:11, color:"var(--ink-faint)" }}>
                {product.name} · {variants.length} label{variants.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => window.print()}
                style={{ background:"var(--saffron)", color:"#fff", border:"none", borderRadius:8,
                  padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                🖨️ Print All
              </button>
              <button onClick={onClose}
                style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"var(--ink-faint)" }}>
                ×
              </button>
            </div>
          </div>

          {/* Labels grid */}
          <div id="barcode-print-area" style={{ overflowY:"auto", flex:1, padding:14,
            display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:10 }}>
            {variants.length === 0 ? (
              <div style={{ gridColumn:"1/-1", textAlign:"center", padding:32, color:"var(--ink-faint)", fontSize:13 }}>
                No active variants — add variants first to generate labels
              </div>
            ) : variants.map(v => (
              <BarcodeLabel key={v.id} product={product} variant={v} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Edit Product Modal ─────────────────────────────────────
function EditProductModal({ product, onClose, onSaved, suppliers }) {
  const [form, setForm] = useState({
    name:          product.name          || "",
    category:      product.category      || "Bangles",
    brand:         product.brand         || "",
    mrp:           product.mrp           != null ? String(product.mrp)        : "",
    cost_price:    product.cost_price    != null ? String(product.cost_price) : "",
    gst_percent:   product.gst_percent   != null ? product.gst_percent        : 3,
    supplier_id:   product.supplier_id   || "",
    tray_location: product.tray_location || "",
    stock_fullness: product.stock_fullness ?? null,
  })
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState("")

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const FULLNESS_LEVELS = [
    { value: 0,   label: "Empty",  color: "#dc2626" },
    { value: 25,  label: "25%",    color: "#f97316" },
    { value: 50,  label: "50%",    color: "#eab308" },
    { value: 75,  label: "75%",    color: "#22c55e" },
    { value: 100, label: "Full",   color: "#16a34a" },
  ]

  async function save() {
    if (!form.name.trim()) { setErr("Product name is required"); return }
    setLoading(true); setErr("")
    try {
      const updated = await apiFetch(`/bangle/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name:          form.name.trim(),
          category:      form.category,
          brand:         form.brand.trim() || null,
          mrp:           Number(form.mrp)        || 0,
          cost_price:    Number(form.cost_price) || 0,
          gst_percent:   Number(form.gst_percent),
          supplier_id:   form.supplier_id   || null,
          tray_location: form.tray_location || null,
          stock_fullness: form.stock_fullness,
        })
      })
      onSaved(updated)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-y-auto max-h-[92vh]">
        <div className="px-5 pt-5 pb-4 border-b flex justify-between items-center" style={{borderColor:"var(--rule)"}}>
          <div>
            <div className="text-sm font-bold" style={{color:"var(--ink)"}}>Edit Product</div>
            <div className="text-[11px] mt-0.5" style={{color:"var(--ink-faint)"}}>Update pricing or product details</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="label">Product Name *</label>
            <input className="input" value={form.name}
              onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category}
              onChange={e => set("category", e.target.value)}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">MRP (₹)</label>
              <input className="input" type="number" min="0" placeholder="0"
                value={form.mrp} onChange={e => set("mrp", e.target.value)} />
            </div>
            <div>
              <label className="label">Cost Price (₹)</label>
              <input className="input" type="number" min="0" placeholder="0"
                value={form.cost_price} onChange={e => set("cost_price", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">GST %</label>
            <select className="input" value={form.gst_percent}
              onChange={e => set("gst_percent", Number(e.target.value))}>
              {[0,3,5,12,18].map(g => <option key={g} value={g}>{g}%</option>)}
            </select>
          </div>
          {BEAUTY_CATS.has(form.category) && (
            <div>
              <label className="label">Brand <span style={{fontWeight:400,color:"var(--ink-faint)"}}>optional</span></label>
              <input className="input" list="edit-brands"
                placeholder={`e.g. ${(CATEGORY_BRANDS[form.category]||[])[0]||"Lakme, Parachute…"}`}
                value={form.brand} onChange={e => set("brand", e.target.value)} />
              <datalist id="edit-brands">
                {(CATEGORY_BRANDS[form.category]||[]).map(b => <option key={b} value={b}/>)}
              </datalist>
            </div>
          )}

          {/* Supplier + Tray */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Supplier</label>
              <select className="input" value={form.supplier_id}
                onChange={e => set("supplier_id", e.target.value)}>
                <option value="">— None —</option>
                {(suppliers || []).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tray / Location</label>
              <input className="input" placeholder="e.g. A2, Shelf 3"
                value={form.tray_location}
                onChange={e => set("tray_location", e.target.value)} />
            </div>
          </div>

          {/* Stock Fullness */}
          <div>
            <label className="label">Tray Fullness</label>
            <div style={{display:"flex", gap:5}}>
              {FULLNESS_LEVELS.map(lvl => (
                <button key={lvl.value}
                  onClick={() => set("stock_fullness", form.stock_fullness === lvl.value ? null : lvl.value)}
                  style={{
                    flex:1, padding:"5px 2px", borderRadius:8, border:"1.5px solid",
                    fontSize:10, fontWeight:700, cursor:"pointer",
                    background:  form.stock_fullness === lvl.value ? lvl.color      : "var(--bg2)",
                    color:       form.stock_fullness === lvl.value ? "#fff"         : "var(--ink-dim)",
                    borderColor: form.stock_fullness === lvl.value ? lvl.color      : "var(--rule)",
                  }}>
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Profit preview */}
          {form.mrp && form.cost_price && Number(form.mrp) > 0 && Number(form.cost_price) > 0 && (
            <div style={{background:"#f0faf6", borderRadius:10, padding:"8px 12px", fontSize:11}}>
              <div style={{display:"flex", justifyContent:"space-between"}}>
                <span style={{color:"var(--ink-faint)"}}>Margin per dozen</span>
                <span style={{fontWeight:700, color:"var(--jade)"}}>
                  {INR(Number(form.mrp) - Number(form.cost_price))}
                  &nbsp;({Math.round((Number(form.mrp) - Number(form.cost_price)) / Number(form.mrp) * 100)}%)
                </span>
              </div>
            </div>
          )}

          {err && <p className="text-red-500 text-xs">{err}</p>}

          <div style={{display:"flex", gap:8, paddingTop:4}}>
            <button onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{border:"1.5px solid var(--rule)", color:"var(--ink-dim)", background:"transparent"}}>
              Cancel
            </button>
            <button onClick={save} disabled={loading}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{background:"linear-gradient(135deg,#0F6E56,#1D9E75)"}}>
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Image compress helper (client-side, before upload) ─────────
function compressImage(file, maxPx = 900, quality = 0.78) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement("canvas")
      canvas.width = w; canvas.height = h
      canvas.getContext("2d").drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => resolve(blob || file), "image/jpeg", quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

const FULLNESS_COLORS = { 0:"#dc2626", 25:"#f97316", 50:"#eab308", 75:"#22c55e", 100:"#16a34a" }

// ── Product Card ───────────────────────────────────────────
function ProductCard({ product, onAddVariants, onStockChange, onProductUpdated, suppliers }) {
  const [expanded,      setExpanded]      = useState(false)
  const [showEdit,      setShowEdit]      = useState(false)
  const [showLabels,    setShowLabels]    = useState(false)
  const [imgUploading,  setImgUploading]  = useState(false)
  const [imgErr,        setImgErr]        = useState("")
  const imgInputRef = useRef(null)

  const isLow = product.low_stock_count > 0
  const isOut = product.total_stock === 0 && product.variant_count > 0

  // Investment = sum(variant.stock × cost_price_per_dozen / 12)
  const investment = (product.variants || []).reduce((s, v) => {
    const cost = v.cost_price || product.cost_price || 0
    return s + v.stock * cost / 12
  }, 0)

  const supplierName = suppliers?.find(s => s.id === product.supplier_id)?.name

  async function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgUploading(true); setImgErr("")
    try {
      const compressed = await compressImage(file)
      const url = await BangleProducts.uploadImage(product.id, compressed)
      onProductUpdated({ ...product, image_url: url })
    } catch(err) {
      setImgErr(err.message || "Upload failed")
    } finally {
      setImgUploading(false)
      e.target.value = ""
    }
  }

  async function handleRemoveImage(e) {
    e.stopPropagation()
    if (!window.confirm("Remove photo?")) return
    setImgUploading(true); setImgErr("")
    try {
      await BangleProducts.removeImage(product.id)
      onProductUpdated({ ...product, image_url: null })
    } catch(err) {
      setImgErr(err.message || "Remove failed")
    } finally {
      setImgUploading(false)
    }
  }

  async function handleAutoImage(e) {
    e.stopPropagation()
    setImgUploading(true); setImgErr("")
    try {
      const url = await BangleProducts.autoImage(product.id)
      onProductUpdated({ ...product, image_url: url })
    } catch(err) {
      setImgErr(err?.message || "Could not find image — try again or upload manually")
    } finally {
      setImgUploading(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{background:"var(--bg1)",border:"1px solid var(--rule)"}}>
      {showEdit && (
        <EditProductModal
          product={product}
          suppliers={suppliers}
          onClose={() => setShowEdit(false)}
          onSaved={updated => { onProductUpdated(updated); setShowEdit(false) }}
        />
      )}
      {showLabels && (
        <BarcodeLabelsModal product={product} onClose={() => setShowLabels(false)} />
      )}

      <div className="flex items-center gap-3 p-4">
        {/* Product image / placeholder — tap to upload */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden",
              background: "#fbeaef", cursor: "pointer", position: "relative" }}
            onClick={() => imgInputRef.current?.click()}
            title="Tap to add/change photo">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                💍
              </div>
            )}
            {imgUploading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.75)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, borderRadius: 12 }}>⟳</div>
            )}
          </div>
          {/* Camera badge */}
          <div style={{ position: "absolute", bottom: 0, right: 0,
            background: "rgba(0,0,0,0.55)", borderRadius: "0 0 12px 0",
            padding: "2px 4px", fontSize: 10, lineHeight: 1, pointerEvents: "none" }}>
            📷
          </div>
          <input ref={imgInputRef} type="file" accept="image/*"
            style={{ display: "none" }} onChange={handleImageChange} />
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div style={{display:"flex", alignItems:"center", gap:6}}>
            <div className="font-semibold text-sm truncate" style={{color:"var(--ink)"}}>{product.name}</div>
            {/* Fullness pill */}
            {product.stock_fullness != null && (
              <div style={{
                flexShrink:0, fontSize:9, fontWeight:800, borderRadius:20, padding:"1px 6px",
                background: FULLNESS_COLORS[product.stock_fullness] + "22",
                color: FULLNESS_COLORS[product.stock_fullness],
                border: `1px solid ${FULLNESS_COLORS[product.stock_fullness]}44`,
              }}>
                {product.stock_fullness === 0 ? "Empty"
                  : product.stock_fullness === 100 ? "Full"
                  : `${product.stock_fullness}%`}
              </div>
            )}
          </div>
          <div className="text-[11px] flex flex-wrap gap-x-2 mt-0.5" style={{color:"var(--ink-faint)"}}>
            <span>{product.category}</span>
            <span>·</span>
            <span>{product.variant_count} variants</span>
            <span>·</span>
            <span style={{color: isOut?"#dc2626":isLow?"#d97706":"var(--jade)"}}>
              {product.total_stock} pcs
            </span>
            {investment > 0 && (
              <>
                <span>·</span>
                <span style={{color:"#7c5cbf",fontWeight:600}}>₹{Math.round(investment)} invested</span>
              </>
            )}
            {product.tray_location && (
              <>
                <span>·</span>
                <span style={{color:"var(--ink-dim)"}}>📍{product.tray_location}</span>
              </>
            )}
            {supplierName && (
              <>
                <span>·</span>
                <span style={{color:"var(--ink-dim)"}}>{supplierName}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isLow && !isOut && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:"#fffbeb",color:"#d97706"}}>
              {product.low_stock_count} low
            </span>
          )}
          {isOut && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:"#fef2f2",color:"#dc2626"}}>
              OUT
            </span>
          )}
          {/* Edit button */}
          <button onClick={e => { e.stopPropagation(); setShowEdit(true) }}
            title="Edit product details"
            style={{
              padding:"4px 8px", borderRadius:8, border:"1px solid var(--rule)",
              background:"var(--bg2)", color:"var(--ink-dim)", fontSize:12, cursor:"pointer",
              lineHeight:1,
            }}>
            ✏️
          </button>
          <div onClick={() => setExpanded(!expanded)} style={{color:"var(--ink-faint)",fontSize:18,transform:expanded?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s",cursor:"pointer"}}>⌄</div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t" style={{borderColor:"var(--rule)"}}>
          <div className="pt-3 space-y-1.5">
            {product.variants.length === 0 ? (
              <div className="text-center py-4 text-xs" style={{color:"var(--ink-faint)"}}>
                No variants yet — add colour/size/design combinations
              </div>
            ) : product.variants.map(v => (
              <VariantRow key={v.id} variant={v} productMrp={product.mrp}
                onStockChange={(id, s) => onStockChange(product.id, id, s)} />
            ))}
          </div>
          {imgErr && (
            <div style={{fontSize:11, color:"#dc2626", marginTop:6}}>{imgErr}</div>
          )}
          <div style={{display:"flex", gap:8, marginTop:12}}>
            <button
              onClick={() => onAddVariants(product)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold border-2 border-dashed transition-colors"
              style={{borderColor:"var(--saffron)",color:"var(--saffron)",background:"transparent"}}>
              + Add Variants
            </button>
            {/* Auto-fetch image from internet — always available */}
            <button onClick={handleAutoImage} disabled={imgUploading}
              className="py-2 rounded-xl text-xs font-semibold border"
              style={{padding:"8px 10px", borderColor:"var(--sky,#2471a3)", color:"var(--sky,#2471a3)",
                background:"transparent", flexShrink:0, opacity: imgUploading ? 0.5 : 1}}>
              🔄 Photo
            </button>
            {product.image_url && (
              <button onClick={handleRemoveImage} disabled={imgUploading}
                className="py-2 rounded-xl text-xs font-semibold border"
                style={{padding:"8px 10px", borderColor:"var(--ember)", color:"var(--ember)", background:"transparent", flexShrink:0}}>
                🗑
              </button>
            )}
            {product.variants.length > 0 && (
              <button
                onClick={() => setShowLabels(true)}
                className="py-2 rounded-xl text-xs font-semibold border"
                style={{padding:"8px 14px", borderColor:"var(--jade)", color:"var(--jade)", background:"transparent", flexShrink:0}}>
                🏷️ Barcodes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────
export default function BangleInventory() {
  const navigate = useNavigate()
  const [products,   setProducts]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [category,   setCategory]   = useState("All")
  const [search,     setSearch]     = useState("")
  const [showAdd,    setShowAdd]    = useState(false)
  const [addVariFor, setAddVariFor] = useState(null)
  const [summary,    setSummary]    = useState(null)
  const [suppliers,  setSuppliers]  = useState([])

  useEffect(() => {
    loadProducts()
    BangleSuppliers.list().then(setSuppliers).catch(() => {})
  }, [])

  async function loadProducts() {
    setLoading(true)
    try {
      const [prods, summ] = await Promise.all([
        BangleProducts.list(),  // falls back to cache when offline
        fetchSummary(),
      ])
      setProducts(prods)
      if (summ) setSummary(summ)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  function onProductSaved(p) {
    setProducts(prev => [{ ...p, variants:[], total_stock:0, variant_count:0, low_stock_count:0 }, ...prev])
    setShowAdd(false)
  }

  function onVariantsSaved(res) {
    setProducts(prev => prev.map(p => {
      if (p.id !== addVariFor.id) return p
      const newVars = [...p.variants, ...res.variants]
      return { ...p, variants:newVars, variant_count:newVars.length, total_stock:newVars.reduce((s,v)=>s+v.stock,0) }
    }))
    setAddVariFor(null)
  }

  function onProductUpdated(updated) {
    setProducts(prev => prev.map(p => {
      if (p.id !== updated.id) return p
      // Cascade price fields to variants so UI reflects immediately
      const variants = p.variants.map(v => ({
        ...v,
        ...(updated.mrp        != null ? { mrp: updated.mrp }               : {}),
        ...(updated.cost_price != null ? { cost_price: updated.cost_price } : {}),
      }))
      return { ...p, ...updated, variants }
    }))
  }

  function onStockChange(productId, variantId, newStock) {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p
      const variants = p.variants.map(v => v.id===variantId ? {...v,stock:newStock} : v)
      return {...p, variants, total_stock: variants.reduce((s,v)=>s+v.stock,0)}
    }))
  }

  const filtered = products.filter(p => {
    if (category !== "All" && p.category !== category) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{background:"var(--bg0)"}}>

      {showAdd    && <AddProductModal onClose={()=>setShowAdd(false)} onSaved={onProductSaved} />}
      {addVariFor && <AddVariantsModal product={addVariFor} onClose={()=>setAddVariFor(null)} onSaved={onVariantsSaved} />}

      {/* Header */}
      <div style={{background:"var(--bg1)",padding:"0 20px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid var(--rule)",flexShrink:0}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:"var(--ink)"}}>💍 Bangle Inventory</div>
          <div style={{fontSize:11,color:"var(--ink-faint)"}}>Variants by colour, size &amp; design</div>
        </div>
        <div className="inv-header-actions" style={{display:"flex",gap:8}}>
          <button className="inv-bulk-btn" onClick={()=>navigate("/bangle-bulk-import")}
            style={{background:"var(--bg2)",color:"var(--ink-dim)",border:"none",borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            📦 Bulk Import
          </button>
          <button className="inv-add-btn" onClick={()=>setShowAdd(true)}
            style={{background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            + Add Product
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {summary && (
        <div className="bangle-summary-strip" style={{display:"flex",gap:1,background:"var(--rule)",flexShrink:0}}>
          {[
            {label:"Products",  value:products.length,                           color:"var(--jade)"},
            {label:"Variants",  value:summary.total_variants,                    color:"var(--jade)"},
            {label:"Pieces",    value:summary.total_pieces,                      color:"var(--ink)"},
            {label:"Invested",  value:summary.total_investment > 0 ? `₹${Math.round(summary.total_investment/1000)}k` : "—", color:"#7c5cbf"},
            {label:"Low Stock", value:summary.low_stock,                         color:"#d97706"},
            {label:"Out",       value:summary.out_of_stock,                      color:"#dc2626"},
          ].map(s => (
            <div key={s.label} style={{flex:1,padding:"10px 6px",textAlign:"center",background:"var(--bg1)"}}>
              <div style={{fontSize:14,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:9,color:"var(--ink-faint)",marginTop:1}}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{background:"var(--bg1)",padding:"10px 16px",borderBottom:"1px solid var(--rule)",flexShrink:0}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search products..."
          style={{width:"100%",border:"1.5px solid var(--rule)",borderRadius:10,padding:"7px 12px",fontSize:12,outline:"none",marginBottom:8,boxSizing:"border-box"}}/>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
          {["All",...CATS].map(c=>(
            <button key={c} onClick={()=>setCategory(c)}
              style={{padding:"4px 12px",borderRadius:20,border:"none",fontSize:11,fontWeight:500,whiteSpace:"nowrap",cursor:"pointer",flexShrink:0,
                background:category===c?"var(--saffron)":"var(--bg2)",
                color:category===c?"#fff":"var(--ink-dim)"}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
        {loading ? (
          <div style={{textAlign:"center",padding:48,color:"var(--ink-faint)",fontSize:13}}>Loading inventory...</div>
        ) : filtered.length === 0 ? (
          <div style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:48,marginBottom:12}}>💍</div>
            <div style={{fontSize:15,fontWeight:700,color:"var(--ink)",marginBottom:6}}>
              {products.length===0 ? "No products yet" : "No matches"}
            </div>
            <div style={{fontSize:12,color:"var(--ink-faint)",marginBottom:20}}>
              {products.length===0 ? "Add your first bangle product to get started" : "Try a different search or category"}
            </div>
            {products.length===0 && (
              <button onClick={()=>setShowAdd(true)}
                style={{background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                + Add First Product
              </button>
            )}
          </div>
        ) : filtered.map(p => (
          <ProductCard key={p.id} product={p} suppliers={suppliers}
            onAddVariants={setAddVariFor} onStockChange={onStockChange} onProductUpdated={onProductUpdated} />
        ))}
      </div>
    </div>
  )
}
