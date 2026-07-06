// parseProductDescription.js
// Parses a freeform description → all product fields at once
// e.g. "Kundan bangle, red and pink, size 2.4, MRP 2500, cost 1800"

const CATS_MAP = {
  // Bangles
  "bangle":"Bangles","bangles":"Bangles","kangan":"Bangles","kangana":"Bangles",
  "kada":"Bangles","churi":"Bangles","chudiyan":"Bangles","chudi":"Bangles",
  "glass bangle":"Bangles","lac bangle":"Bangles","metal bangle":"Bangles",
  // Earrings — most specific first
  "jhumka":"Earrings","jhumki":"Earrings","jhumkas":"Earrings",
  "chandbali":"Earrings","chandbaali":"Earrings",
  "stud":"Earrings","studs":"Earrings",
  "hoop":"Earrings","hoops":"Earrings",
  "drop earring":"Earrings","drop earrings":"Earrings","drops":"Earrings",
  "ear ring":"Earrings","earring":"Earrings","earrings":"Earrings",
  "tassel":"Earrings","dangler":"Earrings","danglers":"Earrings",
  "ear stud":"Earrings","ear studs":"Earrings",
  // Necklace
  "necklace":"Necklace","necklaces":"Necklace",
  "haar":"Necklace","mala":"Necklace","malaai":"Necklace",
  "chain":"Necklace","pendant":"Necklace","locket":"Necklace",
  "choker":"Necklace","layered":"Necklace","multi layer":"Necklace",
  // Maang Tikka
  "maang tikka":"Maang Tikka","mang tikka":"Maang Tikka","tikka":"Maang Tikka",
  "maang tika":"Maang Tikka",
  // Anklet
  "anklet":"Anklet","anklets":"Anklet","payal":"Anklet","payals":"Anklet",
  "bichiya":"Anklet","pajeb":"Anklet","nupur":"Anklet",
  // Hair Clip
  "hair clip":"Hair Clip","hair clips":"Hair Clip","hairclip":"Hair Clip",
  "clip":"Hair Clip","bobby pin":"Hair Clip","hair band":"Hair Clip",
  "hair pin":"Hair Clip","barrette":"Hair Clip",
  // Bindi
  "bindi":"Bindi","bindis":"Bindi","bindi set":"Bindi","tika":"Bindi",
  // Rings
  "ring":"Rings","rings":"Rings","anguthi":"Rings","angoothi":"Rings","mudrika":"Rings",
  "finger ring":"Rings","band ring":"Rings","solitaire":"Rings",
  // Bracelet
  "bracelet":"Bracelet","bracelets":"Bracelet","kara":"Bracelet",
  "evil eye":"Bracelet","charm bracelet":"Bracelet","tennis":"Bracelet",
  // Nose Ring
  "nose ring":"Nose Ring","nose pin":"Nose Ring","nath":"Nose Ring",
  "nose stud":"Nose Ring","naak":"Nose Ring","nathni":"Nose Ring",
  // Nail Polish
  "nail polish":"Nail Polish","nail paint":"Nail Polish","nail color":"Nail Polish",
  "nail colour":"Nail Polish","nail lacquer":"Nail Polish","nails":"Nail Polish",
  "enamel":"Nail Polish","nailpaint":"Nail Polish",
  // Kajal
  "kajal":"Kajal","kaajal":"Kajal","kohl":"Kajal","surma":"Kajal",
  "eyeliner":"Kajal","eye liner":"Kajal","eye pencil":"Kajal","liner":"Kajal",
  // Lipstick
  "lipstick":"Lipstick","lip stick":"Lipstick","lip color":"Lipstick",
  "lip colour":"Lipstick","lip gloss":"Lipstick","lip balm":"Lipstick",
  "lip care":"Lipstick","lip tint":"Lipstick","lipcolour":"Lipstick",
  // Mehendi
  "mehendi":"Mehendi","mehndi":"Mehendi","henna":"Mehendi",
  "mehandi":"Mehendi","henna cone":"Mehendi","mehendi cone":"Mehendi",
  // Perfume
  "perfume":"Perfume","attar":"Perfume","ittar":"Perfume","itr":"Perfume",
  "fragrance":"Perfume","body spray":"Perfume","deodorant":"Perfume",
  "deo":"Perfume","scent":"Perfume","cologne":"Perfume",
  // Compact / Face products
  "compact":"Compact","face powder":"Compact","pressed powder":"Compact",
  "loose powder":"Compact","foundation":"Compact","blush":"Compact",
  "bronzer":"Compact","highlighter":"Compact",
  // Skin Care
  "skin care":"Skin Care","skincare":"Skin Care","face wash":"Skin Care",
  "moisturizer":"Skin Care","moisturiser":"Skin Care","face cream":"Skin Care",
  "sunscreen":"Skin Care","serum":"Skin Care","toner":"Skin Care",
  "face pack":"Skin Care","face mask":"Skin Care","scrub":"Skin Care",
  "eye cream":"Skin Care","face lotion":"Skin Care","bb cream":"Skin Care",
  // Shampoo & Conditioner
  "shampoo":"Shampoo","conditioner":"Shampoo","hair wash":"Shampoo",
  "hair shampoo":"Shampoo","hair conditioner":"Shampoo","hair mask":"Shampoo",
  "baal shampoo":"Shampoo",
  // Hair Oil
  "hair oil":"Hair Oil","coconut oil":"Hair Oil","amla oil":"Hair Oil",
  "almond oil":"Hair Oil","hair serum":"Hair Oil","bhringraj":"Hair Oil",
  "onion oil":"Hair Oil","castor oil":"Hair Oil","argan oil":"Hair Oil",
  "jasmine oil":"Hair Oil","baal tel":"Hair Oil","tel":"Hair Oil",
  // Body Lotion
  "body lotion":"Body Lotion","body butter":"Body Lotion","body cream":"Body Lotion",
  "body milk":"Body Lotion","hand cream":"Body Lotion","hand lotion":"Body Lotion",
  "lotion":"Body Lotion",
  // Soap & Body Wash
  "soap":"Soap","body wash":"Soap","shower gel":"Soap","hand wash":"Soap",
  "sabun":"Soap","bath soap":"Soap","bathing bar":"Soap","bathing soap":"Soap",
  // Talcum Powder
  "talcum powder":"Talcum Powder","talcum":"Talcum Powder","talc":"Talcum Powder",
  "body powder":"Talcum Powder","prickly heat":"Talcum Powder","baby powder":"Talcum Powder",
  // Hair Color
  "hair color":"Hair Color","hair colour":"Hair Color","hair dye":"Hair Color",
  "baal rang":"Hair Color","hair coloring":"Hair Color","hair colouring":"Hair Color",
  "hair bleach":"Hair Color",
  // Other
  "other":"Other",
}

const COLOUR_KEYS = {
  // Reds & Pinks
  "red":"Red","lal":"Red","laal":"Red","dark red":"Dark Red","crimson":"Crimson",
  "hot pink":"Hot Pink","pink":"Pink","gulabi":"Pink","rani":"Pink","rani pink":"Pink",
  "baby pink":"Baby Pink","rose pink":"Rose Pink","magenta":"Magenta",
  // Maroons & Browns
  "maroon":"Maroon","burgundi":"Burgundy","burgundy":"Burgundy","wine":"Wine",
  "brown":"Brown","chocolate":"Chocolate","beige":"Beige","cream":"Cream",
  // Greens
  "green":"Green","hara":"Green","hari":"Green","sea green":"Sea Green",
  "dark green":"Dark Green","mehandi":"Mehandi","mehndi":"Mehandi",
  "parrot green":"Parrot Green","light green":"Light Green",
  "mint":"Mint","teal":"Teal","turquoise":"Turquoise",
  // Blues
  "blue":"Blue","nila":"Blue","navy":"Navy","sky blue":"Sky Blue","neela":"Blue",
  "royal blue":"Royal Blue","cobalt blue":"Cobalt Blue","cobalt":"Cobalt Blue",
  "ice blue":"Ice Blue",
  // Purples
  "purple":"Purple","lavender":"Lavender","violet":"Violet",
  "lilac":"Lilac","indigo":"Indigo","baingani":"Purple",
  // Yellows & Oranges
  "yellow":"Yellow","peela":"Yellow","mustard":"Mustard","saffron":"Saffron",
  "orange":"Orange","narangi":"Orange","peach":"Peach","coral":"Coral",
  // Metallics & Neutrals
  "gold":"Gold","golden":"Gold","sona":"Gold","rose gold":"Rose Gold",
  "silver":"Silver","chandi":"Silver","white":"White","safed":"White",
  "off white":"Off-White","ivory":"Ivory","black":"Black","kala":"Black",
  "charcoal":"Charcoal","gunmetal":"Gunmetal",
  // Multicolour
  "multi":"Multi","multicolor":"Multi","multicolour":"Multi","rainbow":"Rainbow",
  "dual tone":"Dual Tone","ombre":"Ombre",
}

const DESIGN_KEYS = {
  "plain":"Plain",
  "kundan":"Kundan",
  "meenakari":"Meenakari","minakari":"Meenakari",
  "stone work":"Stone Work","stone":"Stone Work",
  "mirror work":"Mirror Work","mirror":"Mirror Work",
  "lac":"Lac","lakh":"Lac","lakk":"Lac",
  "metal":"Metal",
  "glass":"Glass",
  "pearl":"Pearl",
  "crystal":"Crystal",
  "thread":"Thread",
  "oxidized":"Oxidized","oxidised":"Oxidized","antique":"Antique",
  "zari":"Zari","bridal":"Bridal","temple":"Temple",
  "beaded":"Beaded","tassel":"Tassel","evil eye":"Evil Eye",
  "charm":"Charm","pendant":"Pendant","locket":"Locket",
  "adjustable":"Adjustable","band":"Band",
}

const BRANDS_MAP = {
  // Beauty / Makeup
  "lakme":"Lakme","lakmé":"Lakme",
  "maybelline":"Maybelline",
  "mac":"MAC",
  "colorbar":"Colorbar","colour bar":"Colorbar",
  "revlon":"Revlon",
  "elle 18":"Elle 18","elle18":"Elle 18",
  "nykaa":"Nykaa",
  "faces canada":"Faces Canada","faces":"Faces Canada",
  "sugar":"Sugar",
  "mars":"MARS",
  "nyx":"NYX",
  "wet n wild":"Wet n Wild",
  // Skincare
  "himalaya":"Himalaya",
  "mamaearth":"Mamaearth","mama earth":"Mamaearth",
  "biotique":"Biotique",
  "cetaphil":"Cetaphil",
  "neutrogena":"Neutrogena",
  "vaseline":"Vaseline",
  "nivea":"Nivea",
  "ponds":"Pond's","pond's":"Pond's","pond":"Pond's",
  "dove":"Dove",
  "simple":"Simple",
  // Perfume / Deo
  "fogg":"Fogg",
  "engage":"Engage",
  "wild stone":"Wild Stone",
  "axe":"Axe",
  "park avenue":"Park Avenue",
  "denver":"Denver",
  "davidoff":"Davidoff",
  "titan skinn":"Titan Skinn","skinn":"Titan Skinn",
  "yardley":"Yardley",
  "nike":"Nike",
  "adidas":"Adidas",
  // Mehendi
  "nupur":"Nupur",
  "reshma":"Reshma",
  // Shampoo / Hair
  "pantene":"Pantene",
  "head and shoulders":"Head & Shoulders","head & shoulders":"Head & Shoulders",
  "tresemme":"TRESemmé","tréssemmé":"TRESemmé",
  "sunsilk":"Sunsilk",
  "loreal":"L'Oreal","l'oreal":"L'Oreal","loreal paris":"L'Oreal",
  "clinic plus":"Clinic Plus",
  "wow":"WOW",
  // Hair Oil
  "parachute":"Parachute",
  "dabur vatika":"Dabur Vatika","vatika":"Dabur Vatika",
  "dabur amla":"Dabur Amla","amla":"Dabur Amla",
  "bajaj almond":"Bajaj Almond","bajaj":"Bajaj",
  "nihar":"Nihar",
  "indulekha":"Indulekha",
  // Hair Color
  "garnier":"Garnier",
  "godrej expert":"Godrej Expert","godrej":"Godrej",
  "bigen":"Bigen",
  "indus valley":"Indus Valley",
  "streax":"Streax",
  // Soap / Body
  "lux":"Lux",
  "lifebuoy":"Lifebuoy",
  "dettol":"Dettol",
  "pears":"Pears",
  "santoor":"Santoor",
  "margo":"Margo",
  "hamam":"Hamam",
  // Talcum
  "johnson's":"Johnson's","johnsons":"Johnson's","johnson":"Johnson's",
  "nycil":"Nycil",
  "boroplus":"Boroplus",
  "shower to shower":"Shower to Shower",
  // Jewellery
  "tanishq":"Tanishq",
  "malabar gold":"Malabar Gold","malabar":"Malabar Gold",
  "kalyan jewellers":"Kalyan Jewellers","kalyan":"Kalyan Jewellers",
  "caratlane":"CaratLane","carat lane":"CaratLane",
  "bluestone":"BlueStone","blue stone":"BlueStone",
  "voylla":"Voylla",
  "sia art":"Sia Art","sia":"Sia Art",
  "amrapali":"Amrapali",
}

function toTitleCase(str) {
  return str.trim().split(/\s+/).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ")
}

function stripNum(s) {
  return parseInt(String(s).replace(/[₹,\s]/g, ""), 10)
}

// ── Main parser ───────────────────────────────────────────────
export function parseProductDescription(text) {
  if (!text?.trim()) return null
  const raw = text.trim()
  const tl  = raw.toLowerCase()

  const result = {
    name: null, category: null, brand: null, mrp: null, cost_price: null,
    gst_percent: null, colours: [], sizes: [], designs: [],
    confidence: 0, source: "local",
  }

  // ── Category — check longest keys first (multi-word matches take priority) ──
  const catKeys = Object.keys(CATS_MAP).sort((a,b) => b.length - a.length)
  for (const key of catKeys) {
    if (tl.includes(key)) { result.category = CATS_MAP[key]; break }
  }

  // ── Brand — check longest keys first ─────────────────────
  const brandKeys = Object.keys(BRANDS_MAP).sort((a,b) => b.length - a.length)
  for (const key of brandKeys) {
    const re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`, "i")
    if (re.test(tl)) { result.brand = BRANDS_MAP[key]; break }
  }

  // ── MRP ───────────────────────────────────────────────────
  const mrpPatterns = [
    /(?:mrp|m\.r\.p\.?|maximum\s+retail\s+price)\s*(?:is|=|:)?\s*(?:rs\.?|₹|rupees?)?\s*(\d[\d,]*)/i,
    /(?:retail\s+price|selling\s+price|sale\s+price|market\s+price)\s*(?:is|=|:)?\s*(?:rs\.?|₹|rupees?)?\s*(\d[\d,]*)/i,
    /(?:rate|price|bhav|daam|kimat|keemat|dhara)\s*(?:is|=|:)?\s*(?:rs\.?|₹|rupees?)?\s*(\d[\d,]*)/i,
  ]
  for (const re of mrpPatterns) {
    const m = raw.match(re)
    if (m) { const v = stripNum(m[1]); if (v > 0) { result.mrp = v; break } }
  }

  // ── Cost Price ────────────────────────────────────────────
  const costPatterns = [
    /(?:cost\s+price|purchase\s+price|buying\s+price|wholesale\s+price)\s*(?:is|=|:)?\s*(?:rs\.?|₹|rupees?)?\s*(\d[\d,]*)/i,
    /(?:cost|lagat|kharid(?:ari)?|mool\s+kimat)\s*(?:is|=|:)?\s*(?:rs\.?|₹|rupees?)?\s*(\d[\d,]*)/i,
  ]
  for (const re of costPatterns) {
    const m = raw.match(re)
    if (m) { const v = stripNum(m[1]); if (v > 0) { result.cost_price = v; break } }
  }

  // ── GST ───────────────────────────────────────────────────
  const gstM = raw.match(/(\d+)\s*%?\s*(?:gst|tax)/i)
  if (gstM) {
    const pct = parseInt(gstM[1])
    if ([0,3,5,12,18].includes(pct)) result.gst_percent = pct
  }

  // ── Colours — check multi-word keys first ─────────────────
  const colKeys = Object.keys(COLOUR_KEYS).sort((a,b) => b.length - a.length)
  for (const key of colKeys) {
    const re = new RegExp(`\\b${key.replace(/\s+/g,"\\s+")}\\b`, "gi")
    if (re.test(tl)) {
      const val = COLOUR_KEYS[key]
      if (!result.colours.includes(val)) result.colours.push(val)
    }
  }

  // ── Sizes ─────────────────────────────────────────────────
  // Bangle diameters: 2.2 / 2.4 / 2.10 etc.
  for (const m of tl.matchAll(/\b(2\.[0-9]{1,2})\b/g)) {
    const v = m[1]
    if (!result.sizes.includes(v)) result.sizes.push(v)
  }
  // Ring / numeric sizes that don't look like bangle diameters
  for (const m of tl.matchAll(/\bsize\s+(\d+)(?!\.\d)\b/gi)) {
    const v = m[1]
    if (!result.sizes.includes(v)) result.sizes.push(v)
  }
  // Text sizes
  const textSizeRe = /\bsize\s*(free\s*size|small|medium|large|studs?|drops?|hoops?|jhumka|choker|short|long|mala)\b/gi
  for (const m of raw.matchAll(textSizeRe)) {
    const raw2 = m[1].trim()
    const val  = raw2.toLowerCase() === "free size" ? "Free Size" : toTitleCase(raw2)
    if (!result.sizes.includes(val)) result.sizes.push(val)
  }

  // ── Designs ───────────────────────────────────────────────
  const desKeys = Object.keys(DESIGN_KEYS).sort((a,b) => b.length - a.length)
  for (const key of desKeys) {
    const re = new RegExp(`\\b${key.replace(/\s+/g,"\\s+")}\\b`, "gi")
    if (re.test(tl)) {
      const val = DESIGN_KEYS[key]
      if (!result.designs.includes(val)) result.designs.push(val)
    }
  }

  // ── Name — take the first comma-segment, strip known field tokens ──
  const firstSeg = raw.split(/\s*[,;|]\s*/)[0]?.trim() || ""
  if (firstSeg && !/^\d/.test(firstSeg) && !/(rs\.|₹|\d+%|gst|cost|mrp)/i.test(firstSeg)) {
    let nameCandidate = firstSeg
      .replace(/\b(hai|he|hi|hain|tha|ha|is|are|be|ho)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
    if (nameCandidate.length >= 2 && nameCandidate.length <= 80) {
      result.name = toTitleCase(nameCandidate)
    }
  }

  // ── Confidence ────────────────────────────────────────────
  let hits = 0
  if (result.name)       hits++
  if (result.category)   hits++
  if (result.mrp)        hits++
  if (result.cost_price) hits++
  result.confidence = hits / 4

  return result
}
