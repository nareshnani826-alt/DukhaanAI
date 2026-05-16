// ── Auto unit detector ────────────────────────────────────
// Detects measurement unit from product name automatically

export const UNIT_TYPES = {
  kg:    { label:"kg",    symbol:"kg",  type:"weight" },
  g:     { label:"g",     symbol:"g",   type:"weight" },
  litre: { label:"litre", symbol:"L",   type:"volume" },
  ml:    { label:"ml",    symbol:"ml",  type:"volume" },
  piece: { label:"piece", symbol:"pc",  type:"count"  },
  dozen: { label:"dozen", symbol:"doz", type:"count"  },
  pack:  { label:"pack",  symbol:"pkt", type:"count"  },
  bottle:{ label:"bottle",symbol:"btl", type:"count"  },
  box:   { label:"box",   symbol:"box", type:"count"  },
  bag:   { label:"bag",   symbol:"bag", type:"count"  },
}

// Patterns to detect unit from product name
const UNIT_PATTERNS = [
  // Weight — kg
  { regex:/\b(\d+\.?\d*)\s*kg\b/i,          unit:"kg",     extract:true  },
  { regex:/\b(\d+\.?\d*)\s*kilo/i,           unit:"kg",     extract:true  },
  { regex:/\b(\d+\.?\d*)\s*kilogram/i,       unit:"kg",     extract:true  },

  // Weight — grams
  { regex:/\b(\d+\.?\d*)\s*g\b/i,            unit:"g",      extract:true  },
  { regex:/\b(\d+\.?\d*)\s*gm\b/i,           unit:"g",      extract:true  },
  { regex:/\b(\d+\.?\d*)\s*gram/i,           unit:"g",      extract:true  },

  // Volume — litre
  { regex:/\b(\d+\.?\d*)\s*l\b/i,            unit:"litre",  extract:true  },
  { regex:/\b(\d+\.?\d*)\s*lt\b/i,           unit:"litre",  extract:true  },
  { regex:/\b(\d+\.?\d*)\s*ltr/i,            unit:"litre",  extract:true  },
  { regex:/\b(\d+\.?\d*)\s*litr/i,           unit:"litre",  extract:true  },
  { regex:/\b(\d+\.?\d*)\s*liter/i,          unit:"litre",  extract:true  },

  // Volume — ml
  { regex:/\b(\d+\.?\d*)\s*ml\b/i,           unit:"ml",     extract:true  },
  { regex:/\b(\d+\.?\d*)\s*milliliter/i,     unit:"ml",     extract:true  },

  // Count types by keyword (no number needed)
  { regex:/\bpacket|pack\b/i,                unit:"pack",   extract:false },
  { regex:/\bbottle|btl\b/i,                 unit:"bottle", extract:false },
  { regex:/\bbox\b/i,                        unit:"box",    extract:false },
  { regex:/\bbag\b/i,                        unit:"bag",    extract:false },
  { regex:/\bdozen|doz\b/i,                  unit:"dozen",  extract:false },
]

// Product name keyword hints
const NAME_HINTS = {
  kg: [
    "atta","maida","rice","chawal","wheat","sugar","dal","salt","besan",
    "sooji","rawa","poha","biyyam","goduma","arisi","uppu","bellam",
    "toor","moong","chana","masoor","rajma","urad",
    "chilli","mirchi","turmeric","haldi","pasupu","coriander",
    "onion","potato","tomato","carrot","ginger","garlic",
  ],
  litre: [
    "milk","doodh","palu","paal","oil","nune","ghee","neyyi","nei",
    "coconut oil","sunflower oil","groundnut oil","mustard oil",
    "petrol","diesel","water","juice","buttermilk","lassi",
  ],
  ml: [
    "shampoo","conditioner","facewash","lotion","serum",
    "cold drink","soft drink","soda","energy drink",
    "phenyl","colin","dettol","savlon","perfume","deodorant",
  ],
  pack: [
    "biscuit","parle","maggi","noodle","chips","kurkure","namkeen",
    "popcorn","wafer","candy","chocolate","toffee","gum",
    "tea bag","coffee sachet","soup","instant","ready to eat",
  ],
  bottle: [
    "ketchup","sauce","pickle","jam","honey","vinegar","syrup",
    "water bottle","soft drink bottle","beer","wine",
  ],
  box: [
    "cereal","cornflakes","oats","muesli","health drink","horlicks",
    "bournvita","complan","tissue","match","match box",
  ],
  piece: [
    "soap","sabun","toothbrush","razor","blade","candle","bulb",
    "battery","pen","pencil","eraser","stapler","tape",
    "egg","bread","roti","parotta",
  ],
}

export function detectUnit(productName) {
  if (!productName) return { unit:"piece", qty:null }
  const name = productName.toLowerCase().trim()

  // 1. Try pattern match (looks for "500g", "1kg", "2L" etc in the name)
  for (const p of UNIT_PATTERNS) {
    const m = name.match(p.regex)
    if (m) {
      return {
        unit: p.unit,
        qty:  p.extract ? parseFloat(m[1]) : null,
        found: true,
      }
    }
  }

  // 2. Try keyword hints
  for (const [unit, keywords] of Object.entries(NAME_HINTS)) {
    for (const kw of keywords) {
      if (name.includes(kw)) {
        return { unit, qty: null, found: true }
      }
    }
  }

  // 3. Default — pieces (most generic)
  return { unit:"piece", qty: null, found: false }
}

// Extract qty + unit from a spoken string like "500 grams" or "2 kg"
export function parseSpokenQty(text) {
  if (!text) return null
  const t = text.toLowerCase()
  for (const p of UNIT_PATTERNS) {
    const m = t.match(p.regex)
    if (m && p.extract) {
      return { qty: parseFloat(m[1]), unit: p.unit }
    }
  }
  // Just a number?
  const num = t.match(/(\d+\.?\d*)/)
  if (num) return { qty: parseFloat(num[1]), unit: null }
  return null
}
