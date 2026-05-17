// ── Indian Grocery Default Price Database ─────────────────
// MRP = typical retail price, wholesale = typical purchase price
// Prices in INR, updated as of 2025-2026 market rates
// Vendors can always override these

export const PRODUCT_PRICES = [
  // ── Dairy ─────────────────────────────────────────────
  { name:"Amul Milk",          variants:[
    { size:"500ml", mrp:28,  wholesale:25, unit:"ml"  },
    { size:"1L",    mrp:54,  wholesale:48, unit:"litre"},
    { size:"2L",    mrp:108, wholesale:96, unit:"litre"},
  ]},
  { name:"Amul Butter",        variants:[
    { size:"100g",  mrp:56,  wholesale:50, unit:"g"   },
    { size:"500g",  mrp:280, wholesale:250,unit:"g"   },
  ]},
  { name:"Amul Ghee",          variants:[
    { size:"500ml", mrp:320, wholesale:290,unit:"ml"  },
    { size:"1L",    mrp:635, wholesale:575,unit:"litre"},
  ]},
  { name:"Amul Curd",          variants:[
    { size:"200g",  mrp:24,  wholesale:21, unit:"g"   },
    { size:"400g",  mrp:46,  wholesale:41, unit:"g"   },
    { size:"1kg",   mrp:105, wholesale:95, unit:"kg"  },
  ]},
  { name:"Amul Paneer",        variants:[
    { size:"200g",  mrp:90,  wholesale:80, unit:"g"   },
    { size:"500g",  mrp:225, wholesale:200,unit:"g"   },
  ]},
  { name:"Mother Dairy Milk",  variants:[
    { size:"500ml", mrp:27,  wholesale:24, unit:"ml"  },
    { size:"1L",    mrp:54,  wholesale:48, unit:"litre"},
  ]},

  // ── Staples ───────────────────────────────────────────
  { name:"Tata Salt",          variants:[
    { size:"500g",  mrp:13,  wholesale:11, unit:"g"   },
    { size:"1kg",   mrp:24,  wholesale:21, unit:"kg"  },
    { size:"2kg",   mrp:46,  wholesale:41, unit:"kg"  },
  ]},
  { name:"Fortune Salt",       variants:[
    { size:"1kg",   mrp:22,  wholesale:19, unit:"kg"  },
    { size:"2kg",   mrp:42,  wholesale:37, unit:"kg"  },
  ]},
  { name:"Aashirvaad Atta",    variants:[
    { size:"1kg",   mrp:58,  wholesale:52, unit:"kg"  },
    { size:"5kg",   mrp:280, wholesale:252,unit:"kg"  },
    { size:"10kg",  mrp:555, wholesale:500,unit:"kg"  },
  ]},
  { name:"Pillsbury Atta",     variants:[
    { size:"1kg",   mrp:56,  wholesale:50, unit:"kg"  },
    { size:"5kg",   mrp:275, wholesale:248,unit:"kg"  },
  ]},
  { name:"India Gate Basmati Rice", variants:[
    { size:"1kg",   mrp:95,  wholesale:85, unit:"kg"  },
    { size:"5kg",   mrp:460, wholesale:415,unit:"kg"  },
    { size:"10kg",  mrp:910, wholesale:820,unit:"kg"  },
  ]},
  { name:"Sona Masoori Rice",  variants:[
    { size:"1kg",   mrp:55,  wholesale:48, unit:"kg"  },
    { size:"5kg",   mrp:270, wholesale:240,unit:"kg"  },
    { size:"25kg",  mrp:1300,wholesale:1150,unit:"kg" },
  ]},
  { name:"Ponni Rice",         variants:[
    { size:"1kg",   mrp:52,  wholesale:45, unit:"kg"  },
    { size:"5kg",   mrp:255, wholesale:225,unit:"kg"  },
  ]},
  { name:"Toor Dal",           variants:[
    { size:"500g",  mrp:75,  wholesale:68, unit:"g"   },
    { size:"1kg",   mrp:148, wholesale:133,unit:"kg"  },
    { size:"2kg",   mrp:292, wholesale:262,unit:"kg"  },
  ]},
  { name:"Moong Dal",          variants:[
    { size:"500g",  mrp:65,  wholesale:58, unit:"g"   },
    { size:"1kg",   mrp:128, wholesale:115,unit:"kg"  },
  ]},
  { name:"Chana Dal",          variants:[
    { size:"500g",  mrp:58,  wholesale:52, unit:"g"   },
    { size:"1kg",   mrp:112, wholesale:100,unit:"kg"  },
  ]},
  { name:"Urad Dal",           variants:[
    { size:"500g",  mrp:62,  wholesale:55, unit:"g"   },
    { size:"1kg",   mrp:122, wholesale:110,unit:"kg"  },
  ]},
  { name:"Sugar",              variants:[
    { size:"1kg",   mrp:45,  wholesale:40, unit:"kg"  },
    { size:"5kg",   mrp:220, wholesale:198,unit:"kg"  },
  ]},
  { name:"Jaggery",            variants:[
    { size:"500g",  mrp:40,  wholesale:35, unit:"g"   },
    { size:"1kg",   mrp:78,  wholesale:68, unit:"kg"  },
  ]},

  // ── Oils ──────────────────────────────────────────────
  { name:"Fortune Sunflower Oil", variants:[
    { size:"1L",    mrp:135, wholesale:122,unit:"litre"},
    { size:"2L",    mrp:268, wholesale:242,unit:"litre"},
    { size:"5L",    mrp:660, wholesale:595,unit:"litre"},
  ]},
  { name:"Saffola Gold Oil",   variants:[
    { size:"1L",    mrp:180, wholesale:162,unit:"litre"},
    { size:"2L",    mrp:355, wholesale:320,unit:"litre"},
  ]},
  { name:"Parachute Coconut Oil", variants:[
    { size:"200ml", mrp:90,  wholesale:80, unit:"ml"  },
    { size:"500ml", mrp:215, wholesale:193,unit:"ml"  },
    { size:"1L",    mrp:420, wholesale:378,unit:"litre"},
  ]},

  // ── Beverages ─────────────────────────────────────────
  { name:"Tata Tea Gold",      variants:[
    { size:"100g",  mrp:65,  wholesale:58, unit:"g"   },
    { size:"250g",  mrp:155, wholesale:139,unit:"g"   },
    { size:"500g",  mrp:305, wholesale:274,unit:"g"   },
  ]},
  { name:"Red Label Tea",      variants:[
    { size:"100g",  mrp:62,  wholesale:55, unit:"g"   },
    { size:"250g",  mrp:148, wholesale:133,unit:"g"   },
    { size:"500g",  mrp:292, wholesale:262,unit:"g"   },
  ]},
  { name:"Bru Coffee",         variants:[
    { size:"50g",   mrp:95,  wholesale:85, unit:"g"   },
    { size:"100g",  mrp:185, wholesale:166,unit:"g"   },
  ]},
  { name:"Nescafe Classic",    variants:[
    { size:"50g",   mrp:180, wholesale:162,unit:"g"   },
    { size:"100g",  mrp:350, wholesale:315,unit:"g"   },
  ]},
  { name:"Horlicks",           variants:[
    { size:"200g",  mrp:130, wholesale:117,unit:"g"   },
    { size:"500g",  mrp:295, wholesale:265,unit:"g"   },
    { size:"1kg",   mrp:565, wholesale:508,unit:"kg"  },
  ]},
  { name:"Bournvita",          variants:[
    { size:"200g",  mrp:125, wholesale:112,unit:"g"   },
    { size:"500g",  mrp:285, wholesale:256,unit:"g"   },
    { size:"1kg",   mrp:545, wholesale:490,unit:"kg"  },
  ]},
  { name:"Coca Cola",          variants:[
    { size:"250ml", mrp:20,  wholesale:17, unit:"ml"  },
    { size:"500ml", mrp:40,  wholesale:35, unit:"ml"  },
    { size:"1L",    mrp:65,  wholesale:58, unit:"litre"},
    { size:"2L",    mrp:110, wholesale:99, unit:"litre"},
  ]},
  { name:"Pepsi",              variants:[
    { size:"250ml", mrp:20,  wholesale:17, unit:"ml"  },
    { size:"500ml", mrp:40,  wholesale:35, unit:"ml"  },
    { size:"1L",    mrp:65,  wholesale:58, unit:"litre"},
  ]},
  { name:"Sprite",             variants:[
    { size:"250ml", mrp:20,  wholesale:17, unit:"ml"  },
    { size:"500ml", mrp:40,  wholesale:35, unit:"ml"  },
    { size:"1L",    mrp:65,  wholesale:58, unit:"litre"},
  ]},
  { name:"Frooti",             variants:[
    { size:"200ml", mrp:20,  wholesale:17, unit:"ml"  },
    { size:"500ml", mrp:40,  wholesale:35, unit:"ml"  },
  ]},
  { name:"ORS",                variants:[
    { size:"1L",    mrp:20,  wholesale:16, unit:"litre"},
    { size:"5 sachets", mrp:30, wholesale:24, unit:"pc"},
  ]},

  // ── Snacks ────────────────────────────────────────────
  { name:"Parle-G Biscuits",   variants:[
    { size:"100g",  mrp:10,  wholesale:8,  unit:"g"   },
    { size:"200g",  mrp:20,  wholesale:17, unit:"g"   },
    { size:"500g",  mrp:50,  wholesale:44, unit:"g"   },
    { size:"1kg",   mrp:98,  wholesale:87, unit:"kg"  },
  ]},
  { name:"Britannia Good Day", variants:[
    { size:"100g",  mrp:35,  wholesale:31, unit:"g"   },
    { size:"200g",  mrp:68,  wholesale:61, unit:"g"   },
  ]},
  { name:"Maggi Noodles",      variants:[
    { size:"70g",   mrp:14,  wholesale:12, unit:"g"   },
    { size:"140g",  mrp:28,  wholesale:24, unit:"g"   },
    { size:"420g",  mrp:78,  wholesale:70, unit:"g"   },
  ]},
  { name:"Lays Chips",         variants:[
    { size:"26g",   mrp:20,  wholesale:17, unit:"g"   },
    { size:"52g",   mrp:40,  wholesale:35, unit:"g"   },
  ]},
  { name:"Kurkure",            variants:[
    { size:"22g",   mrp:10,  wholesale:8,  unit:"g"   },
    { size:"50g",   mrp:20,  wholesale:17, unit:"g"   },
  ]},

  // ── Personal Care ─────────────────────────────────────
  { name:"Colgate Toothpaste", variants:[
    { size:"100g",  mrp:78,  wholesale:70, unit:"g"   },
    { size:"200g",  mrp:148, wholesale:133,unit:"g"   },
  ]},
  { name:"Lux Soap",           variants:[
    { size:"100g",  mrp:45,  wholesale:40, unit:"g"   },
    { size:"150g",  mrp:68,  wholesale:61, unit:"g"   },
  ]},
  { name:"Lifebuoy Soap",      variants:[
    { size:"100g",  mrp:38,  wholesale:34, unit:"g"   },
    { size:"125g",  mrp:48,  wholesale:43, unit:"g"   },
  ]},
  { name:"Dettol Soap",        variants:[
    { size:"75g",   mrp:38,  wholesale:34, unit:"g"   },
    { size:"125g",  mrp:58,  wholesale:52, unit:"g"   },
  ]},
  { name:"Surf Excel",         variants:[
    { size:"500g",  mrp:85,  wholesale:76, unit:"g"   },
    { size:"1kg",   mrp:168, wholesale:151,unit:"kg"  },
    { size:"2kg",   mrp:330, wholesale:297,unit:"kg"  },
  ]},
  { name:"Clinic Plus Shampoo",variants:[
    { size:"80ml",  mrp:68,  wholesale:61, unit:"ml"  },
    { size:"175ml", mrp:138, wholesale:124,unit:"ml"  },
  ]},
  { name:"Parachute Hair Oil", variants:[
    { size:"100ml", mrp:60,  wholesale:54, unit:"ml"  },
    { size:"200ml", mrp:115, wholesale:103,unit:"ml"  },
    { size:"500ml", mrp:280, wholesale:252,unit:"ml"  },
  ]},
  { name:"Vim Dishwash",       variants:[
    { size:"200g",  mrp:32,  wholesale:28, unit:"g"   },
    { size:"500g",  mrp:68,  wholesale:61, unit:"g"   },
  ]},
]

// ── Fuzzy match product name to get price ─────────────────
export function lookupPrice(productName, size = null) {
  const name = productName.toLowerCase().trim()

  // Find best matching product
  let best = null, bestScore = 0
  for (const p of PRODUCT_PRICES) {
    const pname = p.name.toLowerCase()
    let score = 0
    if (name === pname) score = 1
    else if (name.includes(pname) || pname.includes(name)) score = 0.9
    else {
      const nameWords = name.split(/\s+/)
      const pWords    = pname.split(/\s+/)
      const matches   = nameWords.filter(w => w.length > 3 && pWords.some(pw => pw.includes(w) || w.includes(pw)))
      score = matches.length / Math.max(nameWords.length, pWords.length)
    }
    if (score > bestScore) { bestScore = score; best = p }
  }

  if (!best || bestScore < 0.4) return null

  // Find matching variant
  let variant = null
  if (size) {
    variant = best.variants.find(v =>
      v.size.toLowerCase().replace(/\s/g,"") === size.toLowerCase().replace(/\s/g,"")
    )
  }
  // Default to first variant if no size match
  if (!variant) variant = best.variants[0]

  return {
    productName: best.name,
    size:        variant.size,
    mrp:         variant.mrp,
    wholesale:   variant.wholesale,
    unit:        variant.unit,
    allVariants: best.variants,
    margin:      Math.round(((variant.mrp - variant.wholesale) / variant.mrp) * 100),
  }
}

// ── Get all variants for a product ───────────────────────
export function getVariants(productName) {
  const name = productName.toLowerCase().trim()
  const prod = PRODUCT_PRICES.find(p =>
    p.name.toLowerCase().includes(name.split(" ")[0]) ||
    name.includes(p.name.toLowerCase().split(" ")[0])
  )
  return prod ? prod.variants : []
}
