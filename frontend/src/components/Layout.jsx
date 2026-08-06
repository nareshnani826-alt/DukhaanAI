import { useNavigate, useLocation } from "react-router-dom"
import Logo from "./Logo"
import { useAuth } from "../context/AuthContext"
import { usePlan } from "../context/PlanContext"
import { useTheme } from "../context/ThemeContext"
import { useAppMode } from "../context/AppModeContext"
import { useState, useEffect, useRef } from "react"
import AuthModal from "./AuthModal"
import { LANG_KEY, getSavedLang } from "../voice/i18n"
import { getToken, Products, Sales, Invoices, Udhar } from "../sync/db"
import { BangleProducts } from "../sync/bangleDb.js"
import { VocabDB, preloadVocab } from "../sync/vocabDb.js"
import DaySessionGate from "./DaySessionGate.jsx"
import { tr } from "../i18n/kiranaStrings.js"

const KIRANA_NAV = [
  { label:"Home", to:"/dashboard",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>,
    sub:null },
  { label:"Sales", to:"/billing",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>,
    sub:[{to:"/billing",label:"GST Billing"},{to:"/history",label:"History"},{to:"/udhar",label:"Udhar Khata"},{to:"/customers",label:"Customers"}] },
  { label:"Stock", to:"/inventory",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    sub:[{to:"/inventory",label:"Inventory"},{to:"/bulk-import",label:"Bulk Import ✨"},{to:"/wastage",label:"Wastage"},{to:"/demand",label:"Demand Intel"},{to:"/expiry",label:"Expiry Intel 🕐"}] },
  { label:"Assistant", to:"/voice",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    sub:[{to:"/voice",label:"Voice Agent"}] },
  { label:"More", to:"/day",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    sub:[{to:"/day",label:"Day Ops"},{to:"/insights",label:"Insights"},{to:"/ai-suggestions",label:"AI Suggestions"},{to:"/app-screens",label:"App Screens"},{to:"/help",label:"Help"},{to:"/settings",label:"Settings"},{to:"/install",label:"Install App"}] },
]

const BANGLE_NAV = [
  { label:"Home", to:"/bangle-dashboard",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>,
    sub:null },
  { label:"Inventory", to:"/bangle-inventory",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>,
    sub:[{to:"/bangle-inventory",label:"💍 Stock"},{to:"/bangle-bulk-import",label:"📦 Bulk Import"},{to:"/bangle-festivals",label:"🗓️ Festival Calendar"},{to:"/bangle-insights",label:"📊 Insights"},{to:"/reorder",label:"🤖 Reorder Agent"}] },
  { label:"Sales", to:"/bangle-billing",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
    sub:[{to:"/bangle-billing",label:"🧾 Billing"},{to:"/bangle-history",label:"📋 Bill History"}] },
  { label:"Assistant", to:"/voice",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    sub:null },
  { label:"More", to:"/more",
    icon:<svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    sub:[{to:"/settings",label:"Settings"},{to:"/help",label:"Help"},{to:"/install",label:"Install App"}] },
]

const BANGLE_MOB_TABS = [
  { to:"/bangle-billing", label:"Bill",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { to:"/bangle-inventory", label:"Stock",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg> },
  { to:"/voice", label:"", voice:true },
  { to:"/bangle-history", label:"History",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-4"/><polyline points="3 3 3 7 7 7"/></svg> },
  { to:"/more", label:"More",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg> },
]

// Billing-first 4-tab nav — billing IS home, no dashboard tab
const MOB_TABS = [
  { to:"/billing", label:"Bill",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.97-1.67L23 6H6"/></svg> },
  { to:"/billing", label:"Held", held:true,
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> },
  { to:"/voice", label:"Voice",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> },
  { to:"/more", label:"More",
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg> },
]

const API = import.meta.env.VITE_API_URL

const CHIPS_BY_LANG = {
  "en-IN": ["Do you have milk?", "Low stock", "Today's sales", "Udhaar dues"],
  "te-IN": ["పాలు ఉందా?", "తక్కువ స్టాక్", "ఈరోజు అమ్మకాలు", "ఉధార్ బాకీలు"],
  "hi-IN": ["क्या दूध है?", "कम स्टॉक", "आज की बिक्री", "उधार बकाया"],
  "ta-IN": ["பால் இருக்கா?", "குறைந்த ஸ்டாக்", "இன்றைய விற்பனை", "கடன் நிலுவை"],
  "kn-IN": ["ಹಾಲು ಇದೆಯಾ?", "ಕಡಿಮೆ ಸ್ಟಾಕ್", "ಇಂದಿನ ಮಾರಾಟ", "ಉಧಾರ್ ಬಾಕಿ"],
  "ml-IN": ["പാൽ ഉണ്ടോ?", "കുറഞ്ഞ സ്റ്റോക്ക്", "ഇന്നത്തെ വിൽപ്പന", "കടം ബാക്കി"],
  "mr-IN": ["दूध आहे का?", "कमी स्टॉक", "आजची विक्री", "उधार थकबाकी"],
  "bn-IN": ["দুধ আছে?", "কম স্টক", "আজকের বিক্রয়", "উধার বকেয়া"],
  "gu-IN": ["દૂધ છે?", "ઓછો સ્ટોક", "આજનું વેચાણ", "ઉધાર બાકી"],
  "pa-IN": ["ਦੁੱਧ ਹੈ?", "ਘੱਟ ਸਟਾਕ", "ਅੱਜ ਦੀ ਵਿਕਰੀ", "ਉਧਾਰ ਬਕਾਇਆ"],
}

const BANGLE_CHIPS_BY_LANG = {
  "en-IN": ["Low stock bangles", "Today's sales", "Best margin", "Out of stock"],
  "te-IN": ["తక్కువ స్టాక్ బంగిళ్ళు", "ఈరోజు అమ్మకాలు", "అత్యధిక మార్జిన్", "స్టాక్ లేనివి"],
  "hi-IN": ["कम स्टॉक बंगल", "आज की बिक्री", "सबसे ज़्यादा मार्जिन", "स्टॉक खत्म"],
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })
}

// ── Detect store-related questions ────────────────────────────
function isStoreQuestion(q) {
  return /stock|inventory|price|mrp|cost|margin|profit|sale|revenue|invoice|bill|udh|khata|due|baki|wastage|expire|damage|product|item|low|reorder|categ|brand|sku|unit|available|do you have|have you|is there|do we have|kya hai|milega|milta|undi|vundi|unnaya|ఉందా|కావాలి|ఉన్నాయా|వస్తువు|స్టాక్|అమ్మకాలు|బాకీ|ధర|ఉధార్|తక్కువ|లాభ|स्टॉक|बिक्री|उधार|कीमत|लाभ|मिलेगा|ஸ்டாக்|விற்பனை|கடன்|கிடைக்கும்|ಸ್ಟಾಕ್|ಮಾರಾಟ|ಬಾಕಿ/i.test(q)
}

// ── Helper: margin % ──────────────────────────────────────────
function calcMargin(p) {
  const mrp  = parseFloat(p.mrp || 0)
  const cost = parseFloat(p.cost_price || 0)
  if (mrp <= 0 || cost <= 0) return 0
  return Math.round((mrp - cost) / mrp * 100)
}

// ── Indic script → approximate Roman phonetics ────────────────
function transliterateIndic(text) {
  const MAP = {
    // ── Telugu ──────────────────────────────────────────────
    'అ':'a','ఆ':'aa','ఇ':'i','ఈ':'ee','ఉ':'u','ఊ':'oo','ఎ':'e','ఏ':'ae','ఒ':'o','ఓ':'oo','ఔ':'au',
    'ా':'a','ి':'i','ీ':'ee','ు':'u','ూ':'oo','ె':'e','ే':'ae','ొ':'o','ో':'oo','ై':'ai','ౌ':'au',
    'క':'k','ఖ':'kh','గ':'g','ఘ':'gh','ఙ':'ng','చ':'ch','ఛ':'chh','జ':'j','ఝ':'jh','ఞ':'ny',
    'ట':'t','ఠ':'th','డ':'d','ఢ':'dh','ణ':'n','త':'t','థ':'th','ద':'d','ధ':'dh','న':'n',
    'ప':'p','ఫ':'ph','బ':'b','భ':'bh','మ':'m','య':'y','ర':'r','ల':'l','వ':'v',
    'శ':'sh','ష':'sh','స':'s','హ':'h','ళ':'l','ఱ':'r','ం':'n','ః':'h','్':'','ఁ':'n',
    // ── Devanagari (Hindi/Marathi) ───────────────────────────
    'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ए':'e','ऐ':'ai','ओ':'o','औ':'au',
    'ा':'a','ि':'i','ी':'ee','ु':'u','ू':'oo','े':'e','ै':'ai','ो':'o','ौ':'au',
    'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ng','च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'ny',
    'ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n',
    'प':'p','फ':'f','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v',
    'श':'sh','ष':'sh','स':'s','ह':'h','ं':'n','ः':'h','्':'','़':'',
    // ── Tamil ────────────────────────────────────────────────
    'அ':'a','ஆ':'aa','இ':'i','ஈ':'ee','உ':'u','ஊ':'oo','எ':'e','ஏ':'ae','ஒ':'o','ஓ':'oo',
    'ா':'a','ி':'i','ீ':'ee','ு':'u','ூ':'oo','ெ':'e','ே':'ae','ொ':'o','ோ':'oo','ை':'ai','ௌ':'au',
    'க':'k','ங':'ng','ச':'ch','ஞ':'ny','ட':'t','ண':'n','த':'t','ந':'n','ப':'p','ம':'m',
    'ய':'y','ர':'r','ல':'l','வ':'v','ழ':'l','ள':'l','ற':'r','ன':'n',
    'ஜ':'j','ஷ':'sh','ஸ':'s','ஹ':'h','ஃ':'',
    // ── Kannada ──────────────────────────────────────────────
    'ಅ':'a','ಆ':'aa','ಇ':'i','ಈ':'ee','ಉ':'u','ಊ':'oo','ಎ':'e','ಏ':'ae','ಒ':'o','ಓ':'oo',
    'ಾ':'a','ಿ':'i','ೀ':'ee','ು':'u','ೂ':'oo','ೆ':'e','ೇ':'ae','ೊ':'o','ೋ':'oo','ೈ':'ai','ೌ':'au',
    'ಕ':'k','ಖ':'kh','ಗ':'g','ಘ':'gh','ಙ':'ng','ಚ':'ch','ಛ':'chh','ಜ':'j','ಝ':'jh','ಞ':'ny',
    'ಟ':'t','ಠ':'th','ಡ':'d','ಢ':'dh','ಣ':'n','ತ':'t','ಥ':'th','ದ':'d','ಧ':'dh','ನ':'n',
    'ಪ':'p','ಫ':'ph','ಬ':'b','ಭ':'bh','ಮ':'m','ಯ':'y','ರ':'r','ಲ':'l','ವ':'v',
    'ಶ':'sh','ಷ':'sh','ಸ':'s','ಹ':'h','ಳ':'l','ಂ':'n','ಃ':'h','್':'',
    // ── Malayalam ────────────────────────────────────────────
    'അ':'a','ആ':'aa','ഇ':'i','ഈ':'ee','ഉ':'u','ഊ':'oo','എ':'e','ഏ':'ae','ഒ':'o','ഓ':'oo',
    'ാ':'a','ി':'i','ീ':'ee','ു':'u','ൂ':'oo','െ':'e','േ':'ae','ൊ':'o','ോ':'oo','ൈ':'ai','ൌ':'au',
    'ക':'k','ഖ':'kh','ഗ':'g','ഘ':'gh','ങ':'ng','ച':'ch','ഛ':'chh','ജ':'j','ഝ':'jh','ഞ':'ny',
    'ട':'t','ഠ':'th','ഡ':'d','ഢ':'dh','ണ':'n','ത':'t','ഥ':'th','ദ':'d','ധ':'dh','ന':'n',
    'പ':'p','ഫ':'ph','ബ':'b','ഭ':'bh','മ':'m','യ':'y','ര':'r','ല':'l','വ':'v',
    'ശ':'sh','ഷ':'sh','സ':'s','ഹ':'h','ള':'l','ഴ':'l','റ':'r','ം':'n','ഃ':'h','്':'',
  }
  return text.split('').map(c => MAP[c] ?? c).join('')
}

// Reduce a word to its consonant skeleton for phonetic matching
// e.g. "laakee" → "lk", "lucky" → "lk", "neyil" → "nl", "nail" → "nl"
function phoneticKey(s) {
  return s.toLowerCase()
    .replace(/sh/g,'x').replace(/ch/g,'c').replace(/th/g,'t').replace(/ph/g,'f')
    .replace(/kh/g,'k').replace(/gh/g,'g').replace(/dh/g,'d').replace(/bh/g,'b')
    .replace(/ck/g,'k').replace(/c(?=[^h]|$)/g,'k')  // c (not before h) = k
    .replace(/[aeiouhy]/g,'')   // strip vowels + y/h (vary heavily across languages)
    .replace(/(.)\1+/g,'$1')    // dedup consecutive identical
}

// ── Answer using db.js APIs (auth handled internally, no raw fetch) ──
async function localReply(q, storeMode = "kirana") {
  // Strip punctuation before any processing so "milk?" matches "milk"
  const query = q.toLowerCase().replace(/[?!.,;:'"()\-]/g, " ").replace(/\s+/g, " ").trim()

  // Fetch products from the active store
  const products = storeMode === "bangle_fancy"
    ? await BangleProducts.list().then(r => {
        const list = Array.isArray(r) ? r : (r?.data || [])
        // Normalise bangle product fields to match kirana shape
        return list.map(p => ({
          ...p,
          stock:      typeof p.total_stock === "number" ? p.total_stock : 0,
          min_stock:  p.min_stock || 0,
          cost_price: p.cost_price || 0,
          unit:       "piece",
        }))
      }).catch(() => [])
    : await Products.list({ limit: 1000 }).then(r => Array.isArray(r) ? r : (r?.data || [])).catch(() => [])

  // ── Availability / product search ───────────────────────
  const isAvailQuery = /do you have|do we have|have you|is there|available|milega|milta|undi|vundi|unnaya|ఉందా|కావాలి|ఉన్నాయా|मिलेगा|किधर|கிடைக்கும்|ಸಿಗುತ್ತಾ/i.test(query)

  const stopWords = new Set(["stock","price","mrp","cost","margin","the","and","is","in","of","what","how","many","much","about","tell","me","give","show","do","we","have","any","for","check","available","you","your","store","kya","hai","yahan","idhar","please","pls"])
  const indicStops = new Set(["unda","undaa","undi","vundi","unnai","unnaya","kavali","kaval","ikkade","milega","milta","hain","chahiye","chupandu","ahe","aahe","ide","idhe","unna","iruka"])

  const hasIndic = /[^\x00-\x7F]/.test(query)
  const words     = query.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))
  const romanWords = hasIndic
    ? transliterateIndic(query).toLowerCase().split(/\s+/)
        .filter(w => w.length > 1 && !stopWords.has(w) && !indicStops.has(w))
    : []
  const allWords = hasIndic ? [...new Set([...words, ...romanWords])] : words

  const isAnalyticsQuery = /sale|revenue|udh|baki|wastage|low stock|reorder|categ|margin|profit|top|best|most/.test(query)

  // ── 0. Learned vocabulary — fastest path (central repo) ──────
  const vocabHits = await VocabDB.lookup(allWords, storeMode).catch(() => [])
  const vocabProducts = vocabHits.length > 0
    ? products.filter(p => vocabHits.some(h =>
        h.product_name?.toLowerCase() === p.name?.toLowerCase()
      ))
    : []

  // ── 1. Phonetic / substring match ─────────────────────────────
  // wordMatches: how many search words appear in a product name (for scoring)
  function wordMatchCount(p) {
    const name = (p.name || "").toLowerCase()
    const cat  = (p.category || "").toLowerCase()
    return allWords.filter(w => {
      if (name.includes(w) || cat.includes(w)) return true
      if (hasIndic && w.length > 1) {
        const wKey = phoneticKey(w)
        if (wKey.length < 2) return false
        return name.split(/\s+/).some(nw => {
          const nk = phoneticKey(nw)
          return nk.length >= 2 && (nk === wKey || nk.startsWith(wKey) || wKey.startsWith(nk))
        })
      }
      return false
    }).length
  }

  let phoneticMatched = []
  if (allWords.length > 0 && vocabProducts.length === 0) {
    // Tier 1: ALL words must match (precise — "amul milk" → only Amul Milk products)
    const strict = products.filter(p => wordMatchCount(p) === allWords.length)
    if (strict.length > 0) {
      phoneticMatched = strict
    } else {
      // Tier 2: at least one word matches — sort by how many words match
      phoneticMatched = products
        .map(p => ({ p, score: wordMatchCount(p) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(x => x.p)
    }
  }

  const matched = vocabProducts.length > 0 ? vocabProducts : phoneticMatched

  // ── Auto-learn: when phonetic match finds exactly 1 confident product ──
  if (phoneticMatched.length === 1 && !isAnalyticsQuery) {
    const p = phoneticMatched[0]
    const saveOpts = [true, storeMode]  // autoLearned=true, storeMode
    romanWords.filter(w => w.length > 3 && !indicStops.has(w))
      .forEach(w => VocabDB.save(w, null, p.name, ...saveOpts).catch(() => {}))
    words.filter(w => /[^\x00-\x7F]/.test(w))
      .forEach(w => VocabDB.save(w, null, p.name, ...saveOpts).catch(() => {}))
  }

  if (matched.length > 0 && !isAnalyticsQuery) {
    const fromVocab = vocabProducts.length > 0
    const lines = matched.slice(0, 5).map(p => {
      const stock    = parseFloat(p.stock || 0)
      const minStock = parseFloat(p.min_stock || 0)
      const isOut    = stock === 0
      const isLow    = !isOut && minStock > 0 && stock < minStock
      const m        = calcMargin(p)
      const mrpLine  = p.mrp > 0 ? ` · MRP ₹${p.mrp}` : ""

      if (isOut) {
        return `❌ ${p.name}${p.category ? ` (${p.category})` : ""}
   Status: OUT OF STOCK — 0 units remaining
   👉 You need to purchase this product to fulfill the request.${mrpLine}`
      }
      if (isLow) {
        return `⚠️ ${p.name}${p.category ? ` (${p.category})` : ""}
   Status: RUNNING LOW — only ${stock} ${p.unit||"units"} left (min: ${minStock})
   👉 Stock is low — consider restocking soon.${mrpLine}${m > 0 ? ` · Margin ${m}%` : ""}`
      }
      return `✅ ${p.name}${p.category ? ` (${p.category})` : ""}
   Status: IN STOCK — ${stock} ${p.unit||"units"} available${mrpLine}${m > 0 ? ` · Margin ${m}%` : ""}`
    })

    const header = matched.length === 1
      ? (fromVocab ? "🧠 (from learned vocab)\n" : "")
      : `Found ${matched.length} matching product(s):\n\n`
    return `${header}${lines.join("\n\n")}`
  }

  // ── Not found → return teach data so chat can prompt user ─────
  // Skip this for analytics queries (profit, sales, revenue etc.) — let them
  // fall through to the dedicated analytics handlers below.
  if (allWords.length > 0 && matched.length === 0 && !isAnalyticsQuery && (isAvailQuery || allWords.some(w => w.length > 3))) {
    const displayWords = romanWords.length > 0 ? romanWords : words
    const searchTerm   = displayWords.filter(w => w.length > 3).slice(0, 3).join(" ") || displayWords.join(" ")
    const topProducts  = [...products]
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      .slice(0, 8)
    return {
      _teach:        true,
      text:          `❓ "${searchTerm}" is not found in your inventory.\n\nThis product hasn't been added yet, or I might not recognize the name you used.`,
      teachTerm:     searchTerm,
      indicTerms:    words.filter(w => /[^\x00-\x7F]/.test(w)),
      romanTerms:    romanWords.filter(w => w.length > 2 && !indicStops.has(w)),
      products:      topProducts,
    }
  }

  // ── Sales ────────────────────────────────────────────────
  if (/sale|revenue|invoice|bill|అమ్మకాలు|बिक्री|விற்பனை|ಮಾರಾಟ/.test(query)) {
    const [today, month, bills] = await Promise.all([
      Sales.today().catch(() => ({ total:0, count:0, sales:[] })),
      Sales.summary({ days:30 }).catch(() => ({ total_revenue:0, transaction_count:0, top_products:[] })),
      Invoices.list().catch(() => []),
    ])
    const todayBills = bills.filter(b => {
      const d = new Date(b.created_at)
      const now = new Date()
      return d.toDateString() === now.toDateString()
    })
    const topLines = (month.top_products||[]).slice(0,5).map(p => `  • ${p.name} — ${p.units} sold`)
    return `💰 Sales Summary:
• Today: ₹${today.total||0} (${today.count||0} sales, ${todayBills.length} invoices)
• This month: ₹${month.total_revenue||0} (${month.transaction_count||0} sales)
${topLines.length ? `\n🏆 Top products this month:\n${topLines.join("\n")}` : ""}`
  }

  // ── Bill / Invoice history ───────────────────────────────
  if (/history|invoice|bill history|recent bill/.test(query)) {
    const bills = await Invoices.list().catch(() => [])
    if (!bills.length) return "No bills generated yet."
    const lines = bills.slice(0,8).map(b =>
      `• ${b.invoice_no} — ${b.customer_name} — ₹${b.total} (${new Date(b.created_at).toLocaleDateString("en-IN")})`
    )
    return `🧾 Recent Bills (${bills.length} total):\n\n${lines.join("\n")}`
  }

  // ── Udhaar ───────────────────────────────────────────────
  if (/udh|khata|due|baki|bakaya|బాకీ|उधार|கடன்|ಬಾಕಿ/.test(query)) {
    const customers = await Udhar.listCustomers().catch(() => [])
    const due   = customers.filter(c => parseFloat(c.total_due||0) > 0)
    const total = due.reduce((s,c) => s + parseFloat(c.total_due||0), 0)
    if (due.length === 0) return "✅ No udhaar dues! All customers are clear."
    const lines = due.slice(0,8).map(c => `• ${c.name}${c.phone?` (${c.phone})`:""} — ₹${parseFloat(c.total_due).toFixed(2)}`)
    return `🧾 Udhaar Summary:
• Total due: ₹${total.toFixed(2)}
• Customers with dues: ${due.length}

Top dues:
${lines.join("\n")}`
  }

  // ── Low stock / reorder ──────────────────────────────────
  if (/low|reorder|out of|minimum|min|తక్కువ|कम|குறைந்த|ಕಡಿಮೆ/.test(query)) {
    const low = products.filter(p => parseFloat(p.stock||0) > 0 && parseFloat(p.stock||0) < parseFloat(p.min_stock||0))
    const out = products.filter(p => parseFloat(p.stock||0) === 0)
    if (low.length === 0 && out.length === 0) return "✅ All products have sufficient stock! Nothing to reorder."
    let reply = ""
    if (out.length > 0) reply += `❌ Out of stock (${out.length}):\n${out.slice(0,8).map(p=>`• ${p.name}`).join("\n")}\n\n`
    if (low.length > 0) reply += `⚠️ Low stock (${low.length}):\n${low.slice(0,8).map(p=>`• ${p.name} — ${p.stock}/${p.min_stock} ${p.unit||""}`).join("\n")}`
    return reply.trim()
  }

  // ── Today's / period profit ──────────────────────────────
  if (/profit|లాభ|लाभ|லாபம்|ಲಾಭ/.test(query)) {
    const isToday = /today|aaj|ఈరోజు|आज|இன்று|ಇಂದು/.test(query)
    const isMonth = /month|mahina|నెల|महीना|மாதம்|ತಿಂಗಳು/.test(query)
    const days = isToday ? 1 : isMonth ? 30 : 7

    const [salesData, todaySales] = await Promise.all([
      Sales.summary({ days }).catch(() => ({ total_revenue: 0, transaction_count: 0 })),
      isToday ? Sales.today().catch(() => ({ total: 0, count: 0, sales: [] })) : Promise.resolve(null),
    ])

    // Calculate cost from products' cost_price × qty sold
    const allSales = isToday && todaySales?.sales
      ? todaySales.sales
      : []

    let cost = 0
    let hasCost = false
    if (allSales.length > 0) {
      for (const s of allSales) {
        const prod = products.find(p => p.id === s.product_id)
        if (prod?.cost_price > 0) {
          cost += parseFloat(prod.cost_price) * parseFloat(s.qty || 1)
          hasCost = true
        }
      }
    }

    const revenue = isToday
      ? (todaySales?.total || 0)
      : (salesData?.total_revenue || 0)

    const label = isToday ? "Today" : isMonth ? "This month" : "Last 7 days"
    const profitLine = hasCost
      ? `• Profit: ₹${(revenue - cost).toFixed(2)} (Revenue ₹${revenue} − Cost ₹${cost.toFixed(2)})`
      : `• Revenue: ₹${revenue}\n• Profit: Set cost prices in Inventory to calculate profit`

    // Also show best-margin products as a bonus
    const top3 = products
      .filter(p => parseFloat(p.mrp||0) > 0 && parseFloat(p.cost_price||0) > 0)
      .map(p => ({ ...p, m: calcMargin(p) }))
      .sort((a, b) => b.m - a.m)
      .slice(0, 3)
      .map(p => `  • ${p.name} — ${p.m}% margin`)

    return `💰 Profit Summary (${label}):
${profitLine}
• Transactions: ${isToday ? (todaySales?.count || 0) : (salesData?.transaction_count || 0)}
${top3.length ? `\n🏆 Top margin products:\n${top3.join("\n")}` : ""}`
  }

  // ── Best margin products ─────────────────────────────────
  if (/margin|profitable|best.*product|top.*product/.test(query)) {
    const withMargin = products
      .filter(p => parseFloat(p.mrp||0) > 0 && parseFloat(p.cost_price||0) > 0)
      .map(p => ({ ...p, m: calcMargin(p) }))
      .sort((a,b) => b.m - a.m)
    if (withMargin.length === 0) return "No margin data available. Please add MRP and cost price to your products."
    const lines = withMargin.slice(0,8).map(p => `• ${p.name} — ${p.m}% margin (MRP ₹${p.mrp} | Cost ₹${p.cost_price})`)
    return `🏆 Best Margin Products:\n\n${lines.join("\n")}`
  }

  // ── Categories ───────────────────────────────────────────
  if (/categ|type|section|group/.test(query)) {
    const cats = [...new Set(products.map(p=>p.category).filter(Boolean))].sort()
    if (cats.length === 0) return "No categories found. Add categories to your products in inventory."
    const lines = cats.map(c => {
      const count = products.filter(p => p.category === c).length
      return `• ${c} — ${count} product(s)`
    })
    return `📂 Product Categories (${cats.length}):\n\n${lines.join("\n")}`
  }

  // ── Full inventory overview ──────────────────────────────
  if (/stock|inventory|all|list|total|overview|సమాచారం|स्टॉक|ஸ்டாக்|ಸ್ಟಾಕ್/.test(query)) {
    const low      = products.filter(p => parseFloat(p.stock||0) > 0 && parseFloat(p.stock||0) < parseFloat(p.min_stock||0))
    const out      = products.filter(p => parseFloat(p.stock||0) === 0)
    const ok       = products.filter(p => parseFloat(p.stock||0) >= parseFloat(p.min_stock||0))
    const cats     = [...new Set(products.map(p=>p.category).filter(Boolean))]
    const totalVal = products.reduce((s,p) => s + parseFloat(p.stock||0) * parseFloat(p.cost_price||0), 0)
    return `📦 Inventory Overview:
• Total products: ${products.length}
• ✅ In stock: ${ok.length}
• ⚠️ Low stock: ${low.length}
• ❌ Out of stock: ${out.length}
• 📂 Categories: ${cats.length > 0 ? cats.join(", ") : "None set"}
• 💰 Inventory value: ₹${totalVal.toFixed(2)}`
  }

  return null // not handled locally
}

// ── Widget UI strings by language ─────────────────────────────
const WIDGET_STRINGS = {
  "en-IN": {
    title:       "Shop Assistant",
    subtitle:    "Live data · Groq + Gemini AI",
    welcome:     "Hello! 👋 I'm your Shop Assistant.\nAsk me about stock, sales, margins, udhaar — or anything else!",
    placeholder: "Ask about your store...",
    listening:   "🎙 Listening…",
    footer:      "Store data: Free · AI: Groq → Gemini",
    connError:   "⚠️ Connection error. Please try again.",
    limitErr:    "😢 Sorry, AI has hit its daily limit. It refreshes every day — please try again later!",
    fallback:    "😢 Sorry, I don't have information on that. Ask me about stock, sales, udhaar or margins!",
  },
  "te-IN": {
    title:       "షాప్ అసిస్టెంట్",
    subtitle:    "లైవ్ డేటా · Groq + Gemini AI",
    welcome:     "నమస్కారం! 👋 నేను మీ షాప్ అసిస్టెంట్.\nస్టాక్, అమ్మకాలు, మార్జిన్, ఉధార్ గురించి అడగండి!",
    placeholder: "మీ స్టోర్ గురించి అడగండి...",
    listening:   "🎙 వింటున్నాను…",
    footer:      "స్టోర్ డేటా: ఉచితం · AI: Groq → Gemini",
    connError:   "⚠️ కనెక్షన్ లోపం. మళ్ళీ ప్రయత్నించండి.",
    limitErr:    "😢 క్షమించండి, AI దైనందిన పరిమితిని చేరుకుంది. తర్వాత ప్రయత్నించండి!",
    fallback:    "😢 క్షమించండి, ఇప్పుడు ఆ సమాచారం లేదు. స్టాక్, అమ్మకాలు లేదా ఉధార్ గురించి అడగండి!",
  },
  "hi-IN": {
    title:       "शॉप असिस्टेंट",
    subtitle:    "लाइव डेटा · Groq + Gemini AI",
    welcome:     "नमस्ते! 👋 मैं आपका शॉप असिस्टेंट हूँ।\nस्टॉक, बिक्री, मार्जिन, उधार — कुछ भी पूछें!",
    placeholder: "अपनी दुकान के बारे में पूछें...",
    listening:   "🎙 सुन रहा हूँ…",
    footer:      "स्टोर डेटा: मुफ़्त · AI: Groq → Gemini",
    connError:   "⚠️ कनेक्शन त्रुटि। कृपया पुनः प्रयास करें।",
    limitErr:    "😢 माफ़ करें, AI की दैनिक सीमा समाप्त हो गई। कल फिर प्रयास करें!",
    fallback:    "😢 माफ़ करें, अभी वह जानकारी उपलब्ध नहीं है। स्टॉक, बिक्री या उधार के बारे में पूछें!",
  },
  "ta-IN": {
    title:       "கடை உதவியாளர்",
    subtitle:    "நேரடி தரவு · Groq + Gemini AI",
    welcome:     "வணக்கம்! 👋 நான் உங்கள் கடை உதவியாளர்.\nஸ்டாக், விற்பனை, மார்ஜின், கடன் — எதுவும் கேளுங்கள்!",
    placeholder: "உங்கள் கடை பற்றி கேளுங்கள்...",
    listening:   "🎙 கேட்கிறேன்…",
    footer:      "ஸ்டோர் டேட்டா: இலவசம் · AI: Groq → Gemini",
    connError:   "⚠️ இணைப்பு பிழை. மீண்டும் முயற்சிக்கவும்.",
    limitErr:    "😢 மன்னிக்கவும், AI தினசரி வரம்பை எட்டிவிட்டது. பின்னர் முயற்சிக்கவும்!",
    fallback:    "😢 மன்னிக்கவும், தகவல் இல்லை. ஸ்டாக், விற்பனை அல்லது கடன் பற்றி கேளுங்கள்!",
  },
  "kn-IN": {
    title:       "ಅಂಗಡಿ ಸಹಾಯಕ",
    subtitle:    "ನೇರ ಡೇಟಾ · Groq + Gemini AI",
    welcome:     "ನಮಸ್ಕಾರ! 👋 ನಾನು ನಿಮ್ಮ ಅಂಗಡಿ ಸಹಾಯಕ.\nಸ್ಟಾಕ್, ಮಾರಾಟ, ಮಾರ್ಜಿನ್, ಉಧಾರ್ — ಏನಾದರೂ ಕೇಳಿ!",
    placeholder: "ನಿಮ್ಮ ಅಂಗಡಿ ಬಗ್ಗೆ ಕೇಳಿ...",
    listening:   "🎙 ಕೇಳುತ್ತಿದ್ದೇನೆ…",
    footer:      "ಸ್ಟೋರ್ ಡೇಟಾ: ಉಚಿತ · AI: Groq → Gemini",
    connError:   "⚠️ ಸಂಪರ್ಕ ದೋಷ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    limitErr:    "😢 ಕ್ಷಮಿಸಿ, AI ದೈನಂದಿನ ಮಿತಿ ತಲುಪಿದೆ. ನಂತರ ಪ್ರಯತ್ನಿಸಿ!",
    fallback:    "😢 ಕ್ಷಮಿಸಿ, ಮಾಹಿತಿ ಇಲ್ಲ. ಸ್ಟಾಕ್, ಮಾರಾಟ ಅಥವಾ ಉಧಾರ್ ಬಗ್ಗೆ ಕೇಳಿ!",
  },
  "ml-IN": {
    title:       "ഷോപ്പ് അസിസ്റ്റന്റ്",
    subtitle:    "തത്സമയ ഡേറ്റ · Groq + Gemini AI",
    welcome:     "നമസ്കാരം! 👋 ഞാൻ നിങ്ങളുടെ ഷോപ്പ് അസിസ്റ്റന്റ് ആണ്.\nസ്റ്റോക്ക്, വിൽപ്പന, മാർജിൻ, കടം — എന്തും ചോദിക്കൂ!",
    placeholder: "നിങ്ങളുടെ കടയെക്കുറിച്ച് ചോദിക്കൂ...",
    listening:   "🎙 കേൾക്കുന്നു…",
    footer:      "സ്റ്റോർ ഡേറ്റ: സൗജന്യം · AI: Groq → Gemini",
    connError:   "⚠️ കണക്ഷൻ പിശക്. വീണ്ടും ശ്രമിക്കൂ.",
    limitErr:    "😢 ക്ഷമിക്കണം, AI ദൈനംദിന പരിധി കഴിഞ്ഞു. പിന്നീട് ശ്രമിക്കൂ!",
    fallback:    "😢 ക്ഷമിക്കണം, ആ വിവരം ഇല്ല. സ്റ്റോക്ക്, വിൽപ്പന അല്ലെങ്കിൽ കടം ചോദിക്കൂ!",
  },
  "mr-IN": {
    title:       "शॉप असिस्टंट",
    subtitle:    "थेट डेटा · Groq + Gemini AI",
    welcome:     "नमस्कार! 👋 मी तुमचा शॉप असिस्टंट आहे.\nस्टॉक, विक्री, मार्जिन, उधार — काहीही विचारा!",
    placeholder: "तुमच्या दुकानाबद्दल विचारा...",
    listening:   "🎙 ऐकत आहे…",
    footer:      "स्टोर डेटा: मोफत · AI: Groq → Gemini",
    connError:   "⚠️ कनेक्शन त्रुटी. पुन्हा प्रयत्न करा.",
    limitErr:    "😢 माफ करा, AI ची दैनंदिन मर्यादा संपली. नंतर प्रयत्न करा!",
    fallback:    "😢 माफ करा, ती माहिती उपलब्ध नाही. स्टॉक, विक्री किंवा उधार विचारा!",
  },
  "bn-IN": {
    title:       "শপ অ্যাসিস্ট্যান্ট",
    subtitle:    "লাইভ ডেটা · Groq + Gemini AI",
    welcome:     "নমস্কার! 👋 আমি আপনার শপ অ্যাসিস্ট্যান্ট।\nস্টক, বিক্রয়, মার্জিন, উধার — যেকোনো কিছু জিজ্ঞেস করুন!",
    placeholder: "আপনার দোকান সম্পর্কে জিজ্ঞেস করুন...",
    listening:   "🎙 শুনছি…",
    footer:      "স্টোর ডেটা: বিনামূল্যে · AI: Groq → Gemini",
    connError:   "⚠️ সংযোগ ত্রুটি। আবার চেষ্টা করুন।",
    limitErr:    "😢 দুঃখিত, AI এর দৈনিক সীমা শেষ হয়েছে। পরে চেষ্টা করুন!",
    fallback:    "😢 দুঃখিত, ঐ তথ্য নেই। স্টক, বিক্রয় বা উধার সম্পর্কে জিজ্ঞেস করুন!",
  },
  "gu-IN": {
    title:       "શૉપ આસિસ્ટન્ટ",
    subtitle:    "લાઇવ ડેટા · Groq + Gemini AI",
    welcome:     "નમસ્તે! 👋 હું તમારો શૉપ આસિસ્ટન્ટ છું.\nસ્ટૉક, વેચાણ, માર્જિન, ઉધાર — ગમે તે પૂછો!",
    placeholder: "તમારી દુકાન વિશે પૂછો...",
    listening:   "🎙 સાંભળી રહ્યો છું…",
    footer:      "સ્ટોર ડેટા: મફત · AI: Groq → Gemini",
    connError:   "⚠️ કનેક્શન ભૂલ. ફરી પ્રયાસ કરો.",
    limitErr:    "😢 માફ કરજો, AI ની દૈનિક મર્યાદા પૂર્ણ થઈ. બાદમાં પ્રયાસ કરો!",
    fallback:    "😢 માફ કરજો, ત્યાં જાણ નથી. સ્ટૉક, વેચાણ અથવા ઉધાર પૂછો!",
  },
  "pa-IN": {
    title:       "ਸ਼ਾਪ ਅਸਿਸਟੈਂਟ",
    subtitle:    "ਲਾਈਵ ਡੇਟਾ · Groq + Gemini AI",
    welcome:     "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! 👋 ਮੈਂ ਤੁਹਾਡਾ ਸ਼ਾਪ ਅਸਿਸਟੈਂਟ ਹਾਂ।\nਸਟਾਕ, ਵਿਕਰੀ, ਮਾਰਜਿਨ, ਉਧਾਰ — ਕੁਝ ਵੀ ਪੁੱਛੋ!",
    placeholder: "ਆਪਣੀ ਦੁਕਾਨ ਬਾਰੇ ਪੁੱਛੋ...",
    listening:   "🎙 ਸੁਣ ਰਿਹਾ ਹਾਂ…",
    footer:      "ਸਟੋਰ ਡੇਟਾ: ਮੁਫ਼ਤ · AI: Groq → Gemini",
    connError:   "⚠️ ਕਨੈਕਸ਼ਨ ਗਲਤੀ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
    limitErr:    "😢 ਮਾਫ਼ ਕਰਨਾ, AI ਦੀ ਰੋਜ਼ਾਨਾ ਸੀਮਾ ਖਤਮ ਹੋ ਗਈ। ਬਾਅਦ ਵਿੱਚ ਕੋਸ਼ਿਸ਼ ਕਰੋ!",
    fallback:    "😢 ਮਾਫ਼ ਕਰਨਾ, ਉਹ ਜਾਣਕਾਰੀ ਨਹੀਂ ਹੈ। ਸਟਾਕ, ਵਿਕਰੀ ਜਾਂ ਉਧਾਰ ਬਾਰੇ ਪੁੱਛੋ!",
  },
}

// ── AIChatWidget ──────────────────────────────────────────────
function AIChatWidget() {
  const { vendor, hasModule } = useAuth()
  const hasBangle = hasModule("bangle_fancy")
  const hasKirana = hasModule("kirana")
  const storeMode = hasBangle && !hasKirana
    ? "bangle_fancy"
    : !hasBangle ? "kirana"
    : (localStorage.getItem("storeMode") || "kirana")
  const isBangle = storeMode === "bangle_fancy"

  const [open, setOpen]           = useState(false)
  const [lang, setLang]           = useState(getSavedLang)
  const t = WIDGET_STRINGS[lang] || WIDGET_STRINGS["en-IN"]
  const [messages, setMessages]   = useState(() => {
    const initT = WIDGET_STRINGS[getSavedLang()] || WIDGET_STRINGS["en-IN"]
    return [{ id:1, role:"assistant", text:initT.welcome, time:timestamp() }]
  })
  const [input, setInput]         = useState("")
  const [loading, setLoading]     = useState(false)
  const [chipsUsed, setChipsUsed] = useState(false)
  const [micActive, setMicActive] = useState(false)
  const msgsRef    = useRef(null)
  const inputRef   = useRef(null)
  const recRef     = useRef(null)
  const langInitRef = useRef(true)

  useEffect(() => {
    if (langInitRef.current) { langInitRef.current = false; return }
    setMessages([{ id:1, role:"assistant", text:t.welcome, time:timestamp() }])
    setChipsUsed(false)
  }, [lang])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [messages, loading, open])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
      preloadVocab(storeMode)  // warm the central vocab cache in background
    }
  }, [open])

  async function send(text) {
    const q = (text || input).trim()
    if (!q || loading) return

    setInput("")
    setChipsUsed(true)
    setMessages(p => [...p, { id:Date.now(), role:"user", text:q, time:timestamp() }])
    setLoading(true)

    try {
      const token = getToken()
      let reply     = null
      let teachData = null

      // 1. Store question → local db.js APIs (zero latency, always free)
      if (token && isStoreQuestion(q)) {
        try {
          const localResult = await localReply(q, storeMode)
          if (localResult && localResult._teach) {
            reply     = localResult.text
            teachData = {
              term:        localResult.teachTerm,
              indicTerms:  localResult.indicTerms,
              romanTerms:  localResult.romanTerms,
              products:    localResult.products,
            }
          } else if (typeof localResult === "string") {
            reply = localResult
          }
        } catch(e) { console.error(e) }
      }

      // 2. No local answer → backend cascade: Groq → Gemini → sorry
      if (!reply) {
        try {
          const res = await fetch(`${API}/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ message: q, language: lang, history: [], store_context: {}, store: isBangle ? "bangle" : "kirana" }),
          })
          if (res.ok) {
            const data = await res.json()
            reply = data?.response || null
          } else if (res.status === 429 || res.status === 503) {
            reply = t.limitErr
          } else {
            reply = null
          }
        } catch(e) {
          console.error("AI fetch error:", e)
        }
      }

      // 3. Both local + AI failed
      if (!reply) reply = t.fallback

      const botMsg = { id:Date.now()+1, role:"assistant", text:reply, time:timestamp() }
      if (teachData) botMsg.teach = teachData
      setMessages(p => [...p, botMsg])
    } catch(e) {
      console.error("Chat error:", e)
      setMessages(p => [...p, { id:Date.now()+1, role:"assistant",
        text:t.connError, time:timestamp() }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  async function handleTeach(msgId, teachData, product) {
    const allTerms = [
      teachData.term,
      ...(teachData.indicTerms || []),
      ...(teachData.romanTerms || []),
    ].filter(Boolean)
    // Save all term forms to central repo (autoLearned=false = high confidence = 10)
    await Promise.all(allTerms.map(tt =>
      VocabDB.save(tt, null, product.name, false, storeMode, lang).catch(() => {})
    ))

    // Mark this message as taught (hides the teach UI)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, taught: true } : m))

    // Show confirmation + availability
    const stock = parseFloat(product.stock || 0)
    const avail = stock === 0 ? `❌ OUT OF STOCK` : `✅ ${stock} ${product.unit || "units"} in stock`
    setMessages(prev => [...prev, {
      id: Date.now(), role: "assistant",
      text: `🎓 Learned! "${teachData.term}" = ${product.name}\n\nI'll recognize this instantly next time!\n\n${avail}${product.mrp > 0 ? ` · MRP ₹${product.mrp}` : ""}`,
      time: timestamp(),
    }])
  }

  function stopMic() {
    try { recRef.current?.stop() } catch {}
    recRef.current = null
    setMicActive(false)
  }

  function startMic() {
    // Toggle: if already listening, stop
    if (micActive) { stopMic(); return }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    recRef.current = rec
    rec.lang = lang
    rec.onstart  = () => setMicActive(true)
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript
      stopMic()
      send(text)
    }
    rec.onerror  = () => stopMic()
    rec.onend    = () => stopMic()
    rec.start()
  }

  // Stop mic when widget is closed or component unmounts
  useEffect(() => {
    if (!open) stopMic()
  }, [open])

  const chips = isBangle
    ? (BANGLE_CHIPS_BY_LANG[lang] || BANGLE_CHIPS_BY_LANG["en-IN"])
    : (CHIPS_BY_LANG[lang] || CHIPS_BY_LANG["en-IN"])

  return (
    <>
      {open && (
        <div className="mob-chat-panel" style={{
          position:"fixed", bottom:90, right:24, zIndex:200,
          width:320, height:480, borderRadius:18,
          background:"var(--bg1, #f7f4f2)",
          boxShadow:"0 8px 40px rgba(0,0,0,0.18)",
          border:"1px solid var(--rule, #eee)",
          display:"flex", flexDirection:"column", overflow:"hidden",
          animation:"chatPop 0.2s ease-out",
        }}>
          {/* Header */}
          <div style={{ background:"var(--saffron, #e87722)", padding:"11px 13px",
            display:"flex", alignItems:"center", gap:9, flexShrink:0 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
              background:"rgba(255,255,255,0.2)", border:"2px solid rgba(255,255,255,0.35)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🤖</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:"white", fontWeight:700, fontSize:13 }}>{t.title}</div>
              <div style={{ color:"rgba(255,255,255,0.85)", fontSize:10,
                display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:"50%",
                  background:"#a3f0c4", display:"inline-block" }}/>
                {t.subtitle}
              </div>
            </div>
            <select value={lang} onChange={e => setLang(e.target.value)}
              style={{ fontSize:10, borderRadius:20, padding:"3px 7px", border:"none",
                background:"rgba(255,255,255,0.9)", color:"var(--saffron, #e87722)",
                outline:"none", cursor:"pointer", fontWeight:600 }}>
              <option value="en-IN">EN</option>
              <option value="te-IN">తె</option>
              <option value="hi-IN">हि</option>
              <option value="ta-IN">த</option>
              <option value="kn-IN">ಕ</option>
              <option value="ml-IN">മ</option>
              <option value="mr-IN">म</option>
              <option value="bn-IN">ব</option>
              <option value="gu-IN">ગ</option>
              <option value="pa-IN">ਪ</option>
            </select>
            <button onClick={() => setOpen(false)}
              style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:"50%",
                width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", color:"white", fontSize:13, flexShrink:0 }}>✕</button>
          </div>

          {/* Messages */}
          <div ref={msgsRef} style={{ flex:1, overflowY:"auto", padding:"10px",
            display:"flex", flexDirection:"column", gap:8,
            background:"var(--bg1, #f7f4f2)", scrollbarWidth:"none" }}>

            {messages.map(msg => (
              <div key={msg.id} style={{ display:"flex", alignItems:"flex-end", gap:6,
                flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                {msg.role === "assistant" && (
                  <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0,
                    background:"var(--saffron, #e87722)", display:"flex",
                    alignItems:"center", justifyContent:"center", fontSize:12 }}>🤖</div>
                )}
                <div style={{ maxWidth:"86%" }}>
                  <div style={{
                    padding:"8px 11px", fontSize:12, lineHeight:1.55, whiteSpace:"pre-wrap",
                    borderRadius: msg.role === "user" ? "13px 13px 4px 13px" : "13px 13px 13px 4px",
                    background: msg.role === "user" ? "var(--saffron, #e87722)" : "var(--bg0, #fff)",
                    color: msg.role === "user" ? "white" : "var(--ink, #1a1a1a)",
                    border: msg.role === "assistant" ? "0.5px solid var(--rule, #eee)" : "none",
                    boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
                  }}>{msg.text}</div>

                  {/* ── Teach Me UI ── */}
                  {msg.teach && !msg.taught && msg.teach.products?.length > 0 && (
                    <div style={{
                      marginTop:5, padding:"8px 10px",
                      background:"linear-gradient(135deg,#fefce8,#fef9c3)",
                      border:"1px solid #fde047", borderRadius:"0 10px 10px 10px",
                    }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"#92400e", marginBottom:6 }}>
                        🎓 Teach me — which product is "{msg.teach.term}"?
                      </div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {msg.teach.products.map(p => (
                          <button key={p.id || p.name}
                            onClick={() => handleTeach(msg.id, msg.teach, p)}
                            style={{
                              fontSize:10, padding:"3px 9px", borderRadius:12, cursor:"pointer",
                              border:"1.5px solid #d97706", background:"#fff",
                              color:"#92400e", fontWeight:600, transition:"all 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background="#d97706"; e.currentTarget.style.color="#fff" }}
                            onMouseLeave={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.color="#92400e" }}>
                            {p.name}
                          </button>
                        ))}
                      </div>
                      <div style={{ fontSize:9, color:"#a16207", marginTop:5, fontStyle:"italic" }}>
                        Tap the correct product — I'll remember it forever 🧠
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize:9, color:"var(--ink-faint, #bbb)", marginTop:2,
                    textAlign: msg.role === "user" ? "right" : "left" }}>{msg.time}</div>
                </div>
              </div>
            ))}

            {/* Typing dots */}
            {loading && (
              <div style={{ display:"flex", alignItems:"flex-end", gap:6 }}>
                <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0,
                  background:"var(--saffron, #e87722)", display:"flex",
                  alignItems:"center", justifyContent:"center", fontSize:12 }}>🤖</div>
                <div style={{ padding:"10px 13px", borderRadius:"13px 13px 13px 4px",
                  background:"var(--bg0, #fff)", border:"0.5px solid var(--rule, #eee)",
                  display:"flex", gap:4, alignItems:"center" }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{ width:6, height:6, borderRadius:"50%",
                      background:"var(--saffron, #e87722)", display:"inline-block",
                      animation:"dukaanTyping 1.1s infinite",
                      animationDelay:`${i*0.18}s`, opacity:0.4 }}/>
                  ))}
                </div>
              </div>
            )}

            {/* Quick chips */}
            {!chipsUsed && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:2 }}>
                {chips.map(chip => (
                  <button key={chip} onClick={() => send(chip)}
                    style={{ fontSize:11, fontWeight:500, borderRadius:20,
                      padding:"5px 11px", cursor:"pointer", transition:"all 0.15s",
                      background:"var(--bg0, white)",
                      border:"1.5px solid var(--saffron, #e87722)",
                      color:"var(--saffron, #e87722)" }}
                    onMouseEnter={e => { e.currentTarget.style.background="var(--saffron, #e87722)"; e.currentTarget.style.color="white" }}
                    onMouseLeave={e => { e.currentTarget.style.background="var(--bg0, white)"; e.currentTarget.style.color="var(--saffron, #e87722)" }}>
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ background:"var(--bg0, #fff)", borderTop:"0.5px solid var(--rule, #eee)",
            padding:"8px 10px", display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:6,
              background: micActive ? "rgba(220,38,38,0.05)" : "var(--bg1, #f7f4f2)", borderRadius:20,
              border: micActive ? "1.5px solid rgba(220,38,38,0.45)" : "0.5px solid var(--rule, #eee)",
              padding:"0 10px", minHeight:34, transition:"all 0.2s" }}>
              {micActive ? (
                <div onClick={stopMic} title="Tap to stop"
                  style={{ flex:1, display:"flex", alignItems:"center", gap:6, padding:"6px 0", cursor:"pointer" }}>
                  <span style={{ fontSize:11, color:"#dc2626", fontWeight:600,
                    animation:"micListenPulse 1.2s ease-in-out infinite" }}>{t.listening}</span>
                  <div style={{ display:"flex", gap:2, alignItems:"flex-end" }}>
                    {[0,1,2,3].map(i => (
                      <span key={i} style={{
                        width:3, borderRadius:2, background:"#dc2626",
                        animation:`micWave 0.8s ease-in-out infinite`,
                        animationDelay:`${i*0.1}s`,
                        height:`${8 + i % 2 * 5}px`, display:"inline-block",
                      }}/>
                    ))}
                  </div>
                  <span style={{ fontSize:9, color:"rgba(220,38,38,0.6)", marginLeft:2 }}>tap to stop</span>
                </div>
              ) : (
                <input ref={inputRef} type="text" value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder={t.placeholder}
                  disabled={loading}
                  style={{ flex:1, border:"none", outline:"none", background:"transparent",
                    fontSize:12, color:"var(--ink, #1a1a1a)", fontFamily:"inherit", padding:"6px 0" }}/>
              )}
              <button onClick={startMic} aria-label={micActive ? "Stop listening" : "Voice input"}
                title={micActive ? "Tap to stop" : "Voice input"}
                style={{ background: micActive ? "rgba(220,38,38,0.15)" : "none",
                  border: micActive ? "1.5px solid rgba(220,38,38,0.5)" : "none",
                  cursor: "pointer", padding:"2px",
                  borderRadius:"50%", width:24, height:24,
                  color: micActive ? "#dc2626" : "var(--saffron, #e87722)",
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                  animation: micActive ? "micRing 1.4s ease-in-out infinite" : "none" }}>
                {micActive ? (
                  /* Stop icon when active */
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                    fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                  </svg>
                ) : (
                  /* Mic icon when idle */
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="11" rx="3"/>
                    <path d="M5 10a7 7 0 0 0 14 0"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                    <line x1="9" y1="22" x2="15" y2="22"/>
                  </svg>
                )}
              </button>
            </div>
            <button onClick={() => send()} disabled={loading || !input.trim()} aria-label="Send"
              style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, border:"none",
                background:"var(--saffron, #e87722)", color:"white",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                opacity: loading || !input.trim() ? 0.5 : 1 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <div style={{ textAlign:"center", fontSize:9, color:"var(--ink-faint, #ccc)",
            padding:"3px", background:"var(--bg0, white)" }}>
            {t.footer}
          </div>
        </div>
      )}

      {/* Floating bubble button — hidden on Voice page (bill panel already occupies bottom-right) */}
      {(() => {
        const billingRoute   = storeMode === "bangle_fancy" ? "/bangle-billing" : "/billing"
        const dashboardRoute = storeMode === "bangle_fancy" ? "/bangle-dashboard" : "/dashboard"
        const newBillFabVisible = location.pathname !== billingRoute
          && location.pathname !== dashboardRoute
        // Stack above the New Bill FAB when both are visible; else sit just above the tab bar
        const bubbleBottom = newBillFabVisible ? 130 : 84
        return (
      <button onClick={() => setOpen(o => !o)} title="AI Assistant"
        className="mob-chat-btn"
        style={{ position:"fixed", bottom: bubbleBottom, right:24, zIndex:201,
          width:52, height:52, borderRadius:"50%",
          display: location.pathname === "/voice" ? "none" : "flex",
          background: open ? "var(--ink, #333)" : "linear-gradient(135deg,var(--saffron, #e87722),#d45f00)",
          border:"3px solid var(--bg1, #fff)",
          boxShadow:"0 4px 20px rgba(232,119,34,0.45)",
          alignItems:"center", justifyContent:"center",
          cursor:"pointer", transition:"all 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.transform="scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
        {open ? (
          <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>
        )
      })()}

      <style>{`
        @keyframes chatPop {
          from { opacity:0; transform:scale(0.92) translateY(10px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes dukaanTyping {
          0%,80%,100% { transform:translateY(0); opacity:0.3; }
          40% { transform:translateY(-4px); opacity:1; }
        }
        @keyframes micListenPulse {
          0%,100% { opacity:1; }
          50%     { opacity:0.5; }
        }
        @keyframes micWave {
          0%,100% { transform:scaleY(1); }
          50%     { transform:scaleY(2.2); }
        }
        @keyframes micRing {
          0%,100% { box-shadow:0 0 0 0 rgba(220,38,38,0.4); }
          50%     { box-shadow:0 0 0 5px rgba(220,38,38,0); }
        }
      `}</style>
    </>
  )
}

// ── Main Layout ───────────────────────────────────────────────
export default function Layout({ children }) {
  const { vendor, loggedIn, cloud, hasModule, logout } = useAuth()
  const hasBangle = hasModule("bangle_fancy")
  const hasKirana = hasModule("kirana")
  const multiStore = hasBangle && hasKirana

  const [storeMode, setStoreMode] = useState("kirana")

  // UI language — read from voice language setting (unified key)
  const [uiLang, setUiLang] = useState(() => {
    try { return localStorage.getItem("dk_voice_lang") || "en-IN" } catch { return "en-IN" }
  })
  const [showLangPicker, setShowLangPicker] = useState(false)
  useEffect(() => {
    const sync = () => { try { setUiLang(localStorage.getItem("dk_voice_lang") || "en-IN") } catch {} }
    window.addEventListener("storage", sync)
    window.addEventListener("dk:voice-lang", sync)
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("dk:voice-lang", sync) }
  }, [])
  const tNav = (key) => tr(key, uiLang)

  function setAppLang(code) {
    try {
      localStorage.setItem("dk_voice_lang", code)
      window.dispatchEvent(new CustomEvent("dk:voice-lang", { detail: code }))
    } catch {}
    setUiLang(code)
    window.dispatchEvent(new Event("storage"))
    setShowLangPicker(false)
  }

  const LANG_OPTIONS = [
    { code:"en-IN", label:"English", native:"EN"   },
    { code:"te-IN", label:"Telugu",  native:"తె"   },
    { code:"hi-IN", label:"Hindi",   native:"हि"    },
    { code:"ta-IN", label:"Tamil",   native:"த"    },
    { code:"kn-IN", label:"Kannada", native:"ಕ"    },
    { code:"ml-IN", label:"Malayalam",native:"മ"   },
    { code:"mr-IN", label:"Marathi", native:"म"    },
    { code:"bn-IN", label:"Bengali", native:"বাং"  },
    { code:"gu-IN", label:"Gujarati",native:"ગુ"   },
    { code:"pa-IN", label:"Punjabi", native:"ਪੰ"   },
  ]
  const currentLangNative = LANG_OPTIONS.find(l => l.code === uiLang)?.native || "EN"

  // Re-derive mode whenever vendor changes (login/logout) or modules change
  useEffect(() => {
    let newMode = "kirana"
    if (!vendor) {
      // Logged out — restore last used mode from localStorage
      const saved = localStorage.getItem("storeMode")
      newMode = saved === "bangle_fancy" ? "bangle_fancy" : "kirana"
    } else if (hasBangle && !hasKirana) {
      newMode = "bangle_fancy"
    } else if (multiStore) {
      const saved = localStorage.getItem("storeMode")
      newMode = saved === "bangle_fancy" ? "bangle_fancy" : "kirana"
    }
    setStoreMode(newMode)

    const SHARED_ROUTES = ["/voice", "/more", "/settings", "/help", "/install"]
    const onShared      = SHARED_ROUTES.some(r => location.pathname.startsWith(r))
    // Every bangle-store route is prefixed "/bangle-" by convention, plus the
    // one outlier "/reorder" — matching on the prefix (instead of hand-listing
    // every page) means a newly added bangle-* page can't silently fall through
    // this guard and get bounced back to /bangle-dashboard the way /bangle-day,
    // /bangle-history and /bangle-udhar previously did.
    const onBangleOnly  = location.pathname.startsWith("/bangle-") || location.pathname.startsWith("/reorder")

    if (vendor && newMode === "bangle_fancy" && !onBangleOnly && !onShared) {
      // On a kirana-only route while in bangle mode → go to bangle home
      navigate("/bangle-dashboard")
    } else if (vendor && newMode === "kirana" && onBangleOnly) {
      // On a bangle-only route while in kirana mode → go to kirana home
      navigate("/dashboard")
    }
  }, [vendor, hasBangle, hasKirana])

  function switchMode(mode) {
    setStoreMode(mode)
    localStorage.setItem("storeMode", mode)
    // Navigate to the home screen of the selected store
    navigate(mode === "bangle_fancy" ? "/bangle-dashboard" : "/dashboard")
  }

  const NAV      = storeMode === "bangle_fancy" ? BANGLE_NAV : KIRANA_NAV
  const MOB_TABS_ACTIVE = storeMode === "bangle_fancy" ? BANGLE_MOB_TABS : MOB_TABS
  const storeLabel = storeMode === "bangle_fancy" ? "Bangle Store" : "Kirana POS"

  const { planLabel } = usePlan()
  const { theme, toggleTheme, isDark } = useTheme()
  const { appMode } = useAppMode()
  const [showAuth, setShowAuth] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const navigate  = useNavigate()
  const location  = useLocation()

  useEffect(() => {
    if (location.state?.showLogin) {
      setShowAuth(true)
      navigate(location.pathname, { replace:true, state:{ ...location.state, showLogin:false } })
    }
  }, [location.state, location.pathname, navigate])

  // Auto-expand the sidebar section whose sub-item matches the current route
  useEffect(() => {
    const active = NAV.find(nav => nav.sub?.some(s => location.pathname.startsWith(s.to)))
    if (active) setExpanded(active.label)
  }, [location.pathname])

  function isActive(nav) {
    if (nav.sub) return nav.sub.some(s => location.pathname.startsWith(s.to))
    return location.pathname.startsWith(nav.to)
  }

  return (
    <div className="app-shell">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={() => navigate(storeMode === "bangle_fancy" ? "/bangle-dashboard" : "/dashboard")}
              style={{ background:"none", border:"none", padding:0, cursor:"pointer",
                display:"flex", alignItems:"center", gap:10 }}>
              <Logo size={38} storeLabel={storeLabel} />
            </button>
          </div>
          {loggedIn && (
            <div style={{ marginTop:10, display:"inline-flex", alignItems:"center", gap:4,
              background:"var(--saffron-bg)", color:"var(--saffron)",
              fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:20,
              border:"1px solid rgba(232,119,34,0.25)" }}>
              ★ {planLabel?.name || "Free"} Plan
            </div>
          )}
        </div>

        {multiStore && (
          <div style={{ display:"flex", gap:6, padding:"10px 14px 2px" }}>
            {[
              { id:"kirana",       label:"🛒 Kirana" },
              { id:"bangle_fancy", label:"💍 Bangle" },
            ].map(({ id, label }) => {
              const active = storeMode === id
              return (
                <button key={id} onClick={() => switchMode(id)}
                  style={{ flex:1, padding:"6px 4px", borderRadius:8, border:"1px solid",
                    fontSize:10, fontWeight:700, cursor:"pointer", transition:"all 0.15s",
                    background: active ? "var(--saffron)" : "var(--bg2)",
                    color:       active ? "#fff"          : "var(--ink-dim)",
                    borderColor: active ? "var(--saffron)": "var(--rule)" }}>
                  {label}
                </button>
              )
            })}
          </div>
        )}

        <nav className="sidebar-nav">
          <div style={{ fontSize:9, fontWeight:700, color:"var(--ink-faint)",
            letterSpacing:"1.5px", padding:"10px 16px 4px", textTransform:"uppercase" }}>{tNav("Menu")}</div>
          {NAV.map(nav => {
            const active = isActive(nav)
            const isOpen = expanded === nav.label
            const hasSub = !!nav.sub?.length
            return (
              <div key={nav.label}>
                <div onClick={() => hasSub ? setExpanded(isOpen ? null : nav.label) : navigate(nav.to)}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px",
                    cursor:"pointer", userSelect:"none", transition:"all 0.15s",
                    borderLeft:`3px solid ${active ? "var(--saffron)" : "transparent"}`,
                    background: active ? "var(--saffron-bg)" : "transparent",
                    color: active ? "var(--saffron)" : "var(--ink-dim)" }}
                  onMouseEnter={e => { if(!active) e.currentTarget.style.background="var(--bg2)" }}
                  onMouseLeave={e => { if(!active) e.currentTarget.style.background="transparent" }}>
                  <span style={{ width:16, height:16, display:"flex", alignItems:"center",
                    justifyContent:"center", flexShrink:0,
                    color: active ? "var(--saffron)" : "var(--ink-faint)" }}>{nav.icon}</span>
                  <span style={{ flex:1, fontSize:13, fontWeight: active ? 700 : 500 }}>{tNav(nav.label)}</span>
                  {hasSub && (
                    <svg width="10" height="10" fill="none" stroke="var(--ink-faint)" strokeWidth="2" viewBox="0 0 24 24"
                      style={{ transform: isOpen?"rotate(90deg)":"none", transition:"0.2s" }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  )}
                </div>
                {hasSub && isOpen && (
                  <div style={{ background:"var(--bg2)" }}>
                    {nav.sub.map(s => {
                      const on = location.pathname === s.to || location.pathname.startsWith(s.to)
                      return (
                        <div key={s.to} onClick={() => navigate(s.to)}
                          style={{ display:"flex", alignItems:"center", gap:8,
                            padding:"8px 16px 8px 42px", cursor:"pointer", fontSize:12,
                            color: on ? "var(--saffron)" : "var(--ink-dim)",
                            fontWeight: on ? 600 : 400,
                            background: on ? "var(--saffron-bg)" : "transparent",
                            borderLeft: on ? "3px solid var(--saffron)" : "3px solid transparent",
                            transition:"all 0.1s" }}
                          onMouseEnter={e => { if(!on) e.currentTarget.style.color="var(--ink)" }}
                          onMouseLeave={e => { if(!on) e.currentTarget.style.color="var(--ink-dim)" }}>
                          <div style={{ width:5, height:5, borderRadius:"50%",
                            background: on ? "var(--saffron)" : "var(--ink-faint)", flexShrink:0 }}/>
                          {tNav(s.label)}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)", marginBottom:2 }}>
            {vendor?.store_name || "DukaanAI"}
          </div>
          <div style={{ fontSize:10, color: cloud ? "var(--jade)" : "var(--ink-faint)", marginBottom:10 }}>
            {cloud ? "● Cloud sync ON" : loggedIn ? "● Free plan" : "● Local only"}
          </div>
          {!loggedIn
            ? <button onClick={() => setShowAuth(true)} className="btn btn-primary btn-sm" style={{ width:"100%" }}>
                Login / Register
              </button>
            : (
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <button onClick={() => setShowLangPicker(true)} title={`Language: ${LANG_OPTIONS.find(l=>l.code===uiLang)?.label || "English"}`}
                  style={{ width:34, height:34, borderRadius:9, flexShrink:0,
                    background:"var(--bg2)", border:"1px solid var(--rule)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer", fontSize:15, transition:"all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="var(--saffron)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="var(--rule)"}>
                  🌐
                </button>
                <button onClick={toggleTheme} title={isDark ? "Switch to Light" : "Switch to Dark"}
                  style={{ width:34, height:34, borderRadius:9, flexShrink:0,
                    background:"var(--bg2)", border:"1px solid var(--rule)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer", fontSize:15, transition:"all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="var(--saffron)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="var(--rule)"}>
                  {isDark ? "☀️" : "🌙"}
                </button>
                <button onClick={logout} title="Logout"
                  style={{ width:34, height:34, borderRadius:9, flexShrink:0,
                    background:"var(--bg2)", border:"1px solid var(--rule)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer", color:"var(--ink-faint)", transition:"all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="var(--ember,#c0392b)"; e.currentTarget.style.color="var(--ember,#c0392b)" }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="var(--rule)"; e.currentTarget.style.color="var(--ink-faint)" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              </div>
            )
          }
        </div>
      </aside>

      <main className="app-main">
        <div className="mobile-header">
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:9, flexShrink:0,
              background:"linear-gradient(135deg,var(--saffron),var(--saffron-hot))",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"'Tiro Devanagari Hindi',serif", fontWeight:700, fontSize:16, color:"#fff",
              boxShadow:"0 2px 8px rgba(212,98,31,0.35)" }}>द</div>
            <div>
              <div style={{ fontFamily:"'Tiro Devanagari Hindi',serif", fontSize:16,
                color:"var(--ink)", fontWeight:700, lineHeight:1 }}>
                दुकान<span style={{color:"var(--saffron)"}}>•</span>AI
              </div>
              <div style={{ fontSize:9, color: cloud ? "var(--jade)" : "var(--ink-faint)",
                letterSpacing:"0.5px", marginTop:1 }}>
                {cloud ? "● Cloud sync" : "● Local"}
              </div>
            </div>
          </div>

          {/* Store switcher — only visible when vendor has both modules */}
          {multiStore && (
            <div style={{ display:"flex", gap:5, flex:1, justifyContent:"center" }}>
              {[
                { id:"kirana",       label:"🛒 Kirana" },
                { id:"bangle_fancy", label:"💍 Bangle" },
              ].map(({ id, label }) => {
                const active = storeMode === id
                return (
                  <button key={id} onClick={() => switchMode(id)}
                    style={{ padding:"5px 12px", borderRadius:20, border:"1.5px solid",
                      fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.15s",
                      background: active ? "var(--saffron)" : "var(--bg2)",
                      color:       active ? "#fff"          : "var(--ink-dim)",
                      borderColor: active ? "var(--saffron)": "var(--rule)",
                      boxShadow:   active ? "0 2px 8px rgba(232,119,34,0.35)" : "none" }}>
                    {label}
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {/* Language picker button */}
            <button onClick={() => setShowLangPicker(true)}
              title="Change language"
              style={{ background:"var(--bg2)", border:"1px solid var(--rule)",
                borderRadius:8, padding:"5px 10px", cursor:"pointer",
                fontSize:13, fontWeight:800, color:"var(--ink)",
                boxShadow:"0 1px 4px var(--shadow)", minWidth:36, textAlign:"center" }}>
              {currentLangNative}
            </button>
            <button onClick={toggleTheme}
              style={{ background:"var(--bg2)", border:"1px solid var(--rule)",
                borderRadius:8, padding:"5px 9px", cursor:"pointer", fontSize:14,
                boxShadow:"0 1px 4px var(--shadow)" }}>
              {isDark ? "☀️" : "🌙"}
            </button>
            {!loggedIn
              ? <button onClick={() => setShowAuth(true)} className="btn btn-primary btn-sm">Login</button>
              : <button onClick={logout}
                  style={{ background:"var(--bg2)", color:"var(--ink-dim)",
                    border:"1px solid var(--rule)", borderRadius:8,
                    padding:"5px 10px", fontSize:10, cursor:"pointer" }}>Logout</button>
            }
          </div>
        </div>
        {children}
      </main>

      <nav className="mobile-bottom-nav" style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:100,
        background:"var(--bg2)", borderTop:"1px solid var(--rule)",
        display:"none", alignItems:"flex-end", justifyContent:"space-around",
        padding:"8px 4px 12px", boxShadow:"0 -4px 20px var(--shadow)" }}>
        {(storeMode === "bangle_fancy" ? MOB_TABS_ACTIVE : MOB_TABS).map(tab => {
          // Held-bills tab: navigate to /billing + dispatch show-held event
          if (tab.held) {
            const heldCount = (() => { try { return JSON.parse(localStorage.getItem("dk_held_bills")||"[]").length } catch { return 0 } })()
            const onBilling = location.pathname === "/billing"
            return (
              <button key="held"
                onClick={() => { navigate("/billing"); window.dispatchEvent(new CustomEvent("dk:show-held")) }}
                style={{ background:"transparent", border:"none", cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                  color:"var(--ink-faint)", padding:"4px 10px",
                  flex:1, position:"relative" }}>
                <div style={{ position:"relative", width:22, height:22,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {tab.icon}
                  {heldCount > 0 && (
                    <div style={{ position:"absolute", top:-4, right:-6,
                      minWidth:14, height:14, padding:"0 3px", borderRadius:7,
                      background:"var(--ember)", color:"#fff",
                      fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {heldCount}
                    </div>
                  )}
                </div>
                <span style={{ fontSize:10, fontWeight:500 }}>{tNav(tab.label)}</span>
              </button>
            )
          }

          const PRIMARY = storeMode === "bangle_fancy"
            ? ["/bangle-billing", "/bangle-inventory", "/voice", "/bangle-history"]
            : ["/billing", "/voice"]
          const on = tab.to === "/more"
            ? !PRIMARY.some(p => location.pathname.startsWith(p)) && location.pathname !== "/"
            : location.pathname.startsWith(tab.to)
          return (
            <button key={tab.to + tab.label} onClick={() => navigate(tab.to)}
              style={{ background:"transparent", border:"none", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                color: on ? "var(--saffron)" : "var(--ink-faint)", padding:"4px 10px",
                flex:1, position:"relative" }}>
              {on && <div style={{ position:"absolute", top:0, left:"25%", right:"25%",
                height:2, borderRadius:"0 0 2px 2px", background:"var(--saffron)" }}/>}
              <div style={{ width:22, height:22,
                background: on ? "var(--saffron-bg)" : "transparent",
                borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center",
                padding:2 }}>{tab.icon}</div>
              <span style={{ fontSize:10, fontWeight: on ? 700 : 500 }}>{tNav(tab.label)}</span>
            </button>
          )
        })}
      </nav>

      {/* ── Language picker sheet ─────────────────── */}
      {showLangPicker && (
        <div style={{ position:"fixed", inset:0, zIndex:9998, background:"rgba(0,0,0,0.5)",
          display:"flex", alignItems:"flex-end" }}
          onClick={() => setShowLangPicker(false)}>
          <div style={{ width:"100%", background:"var(--bg1)", borderRadius:"20px 20px 0 0",
            padding:"20px 16px 32px", boxShadow:"0 -8px 32px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:800, color:"var(--ink)" }}>🌐 Language</div>
              <button onClick={() => setShowLangPicker(false)}
                style={{ background:"none", border:"none", color:"var(--ink-faint)", fontSize:20, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {LANG_OPTIONS.map(l => (
                <button key={l.code} onClick={() => setAppLang(l.code)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                    borderRadius:14, border:`1.5px solid ${uiLang===l.code ? "var(--saffron)" : "var(--rule)"}`,
                    background: uiLang===l.code ? "var(--saffron-bg)" : "var(--bg2)",
                    cursor:"pointer", textAlign:"left", transition:"all 0.12s" }}>
                  <div style={{ width:36, height:36, borderRadius:10,
                    background: uiLang===l.code ? "var(--saffron)" : "var(--bg0)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:18, fontWeight:800,
                    color: uiLang===l.code ? "#fff" : "var(--ink)", flexShrink:0 }}>
                    {l.native}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)" }}>{l.label}</div>
                    {uiLang===l.code && (
                      <div style={{ fontSize:10, color:"var(--saffron)", fontWeight:700 }}>✓ Active</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Persistent "New Bill" FAB ───────────────── */}
      {(() => {
        const billingRoute  = storeMode === "bangle_fancy" ? "/bangle-billing" : "/billing"
        const dashboardRoute = storeMode === "bangle_fancy" ? "/bangle-dashboard" : "/dashboard"
        if (location.pathname === billingRoute)   return null  // already on billing
        if (location.pathname === dashboardRoute) return null  // dashboard has its own tile
        if (showAuth) return null
        return (
          <button
            onClick={() => navigate(billingRoute)}
            className="mob-newbill-fab"
            style={{
              position: "fixed", bottom: 74, right: 16, zIndex: 98,
              background: "linear-gradient(135deg, var(--saffron), var(--saffron-hot))",
              color: "#fff", border: "none", borderRadius: 28,
              padding: "13px 22px", fontSize: 14, fontWeight: 800,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 6px 24px rgba(232,119,34,0.55)",
              letterSpacing: "0.2px", whiteSpace: "nowrap",
            }}>
            🧾 <span>New Bill</span>
          </button>
        )
      })()}

      {/* Groq AI chat bubble — hidden while auth modal is open */}
      {!showAuth && <AIChatWidget />}

      {/* Daily open/close gate — prompts on first load each day */}
      {loggedIn && <DaySessionGate vendor={vendor} />}
    </div>
  )
}
