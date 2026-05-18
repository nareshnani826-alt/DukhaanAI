// ── Master Indian Grocery Product Catalog ─────────────────
// 200+ products across all major kirana categories
// Vendors can select and bulk-add to their inventory

export const CATALOG = [
  // ── Dairy & Eggs ──────────────────────────────────────
  { name:"Amul Milk 500ml",        category:"Dairy",    unit:"pc",  mrp:28,  cost:25,  gst:0  },
  { name:"Amul Milk 1L",           category:"Dairy",    unit:"pc",  mrp:54,  cost:48,  gst:0  },
  { name:"Amul Butter 100g",       category:"Dairy",    unit:"pc",  mrp:56,  cost:50,  gst:12 },
  { name:"Amul Butter 500g",       category:"Dairy",    unit:"pc",  mrp:280, cost:250, gst:12 },
  { name:"Amul Ghee 500ml",        category:"Dairy",    unit:"pc",  mrp:320, cost:290, gst:12 },
  { name:"Amul Ghee 1L",           category:"Dairy",    unit:"pc",  mrp:635, cost:575, gst:12 },
  { name:"Amul Curd 400g",         category:"Dairy",    unit:"pc",  mrp:46,  cost:41,  gst:0  },
  { name:"Amul Paneer 200g",       category:"Dairy",    unit:"pc",  mrp:90,  cost:80,  gst:0  },
  { name:"Mother Dairy Milk 500ml",category:"Dairy",    unit:"pc",  mrp:27,  cost:24,  gst:0  },
  { name:"Eggs (30 pack)",         category:"Dairy",    unit:"pc",  mrp:180, cost:160, gst:0  },

  // ── Atta, Rice & Pulses ───────────────────────────────
  { name:"Aashirvaad Atta 5kg",    category:"Staples",  unit:"pc",  mrp:280, cost:252, gst:0  },
  { name:"Aashirvaad Atta 10kg",   category:"Staples",  unit:"pc",  mrp:555, cost:500, gst:0  },
  { name:"Pillsbury Atta 5kg",     category:"Staples",  unit:"pc",  mrp:275, cost:248, gst:0  },
  { name:"Sona Masoori Rice 1kg",  category:"Staples",  unit:"kg",  mrp:55,  cost:48,  gst:0  },
  { name:"Sona Masoori Rice 5kg",  category:"Staples",  unit:"pc",  mrp:270, cost:240, gst:0  },
  { name:"Sona Masoori Rice 25kg", category:"Staples",  unit:"pc",  mrp:1300,cost:1150,gst:0  },
  { name:"Basmati Rice 1kg",       category:"Staples",  unit:"kg",  mrp:95,  cost:85,  gst:0  },
  { name:"Ponni Rice 5kg",         category:"Staples",  unit:"pc",  mrp:255, cost:225, gst:0  },
  { name:"Toor Dal 1kg",           category:"Staples",  unit:"kg",  mrp:148, cost:133, gst:0  },
  { name:"Moong Dal 1kg",          category:"Staples",  unit:"kg",  mrp:128, cost:115, gst:0  },
  { name:"Chana Dal 1kg",          category:"Staples",  unit:"kg",  mrp:112, cost:100, gst:0  },
  { name:"Urad Dal 1kg",           category:"Staples",  unit:"kg",  mrp:122, cost:110, gst:0  },
  { name:"Rajma 1kg",              category:"Staples",  unit:"kg",  mrp:135, cost:120, gst:0  },
  { name:"Chana (Kabuli) 1kg",     category:"Staples",  unit:"kg",  mrp:110, cost:98,  gst:0  },

  // ── Sugar, Salt & Spices ──────────────────────────────
  { name:"Tata Salt 1kg",          category:"Staples",  unit:"pc",  mrp:24,  cost:21,  gst:0  },
  { name:"Tata Salt 2kg",          category:"Staples",  unit:"pc",  mrp:46,  cost:41,  gst:0  },
  { name:"Sugar 1kg",              category:"Staples",  unit:"kg",  mrp:45,  cost:40,  gst:0  },
  { name:"Sugar 5kg",              category:"Staples",  unit:"pc",  mrp:220, cost:198, gst:0  },
  { name:"Jaggery 1kg",            category:"Staples",  unit:"kg",  mrp:78,  cost:68,  gst:0  },
  { name:"Tata Sampann Turmeric",  category:"Spices",   unit:"pc",  mrp:55,  cost:48,  gst:5  },
  { name:"Tata Sampann Chilli",    category:"Spices",   unit:"pc",  mrp:55,  cost:48,  gst:5  },
  { name:"MDH Garam Masala 100g",  category:"Spices",   unit:"pc",  mrp:75,  cost:65,  gst:5  },
  { name:"Everest Chicken Masala", category:"Spices",   unit:"pc",  mrp:65,  cost:56,  gst:5  },

  // ── Oils ──────────────────────────────────────────────
  { name:"Fortune Sunflower Oil 1L",category:"Oils",   unit:"pc",  mrp:135, cost:122, gst:5  },
  { name:"Fortune Sunflower Oil 5L",category:"Oils",   unit:"pc",  mrp:660, cost:595, gst:5  },
  { name:"Saffola Gold Oil 1L",    category:"Oils",    unit:"pc",  mrp:180, cost:162, gst:5  },
  { name:"Parachute Coconut Oil 500ml",category:"Oils",unit:"pc",  mrp:215, cost:193, gst:5  },
  { name:"Parachute Coconut Oil 1L",category:"Oils",   unit:"pc",  mrp:420, cost:378, gst:5  },
  { name:"Mustard Oil 1L",         category:"Oils",    unit:"pc",  mrp:175, cost:158, gst:5  },
  { name:"Groundnut Oil 1L",       category:"Oils",    unit:"pc",  mrp:185, cost:166, gst:5  },

  // ── Beverages ─────────────────────────────────────────
  { name:"Tata Tea Gold 250g",     category:"Beverages",unit:"pc", mrp:155, cost:139, gst:5  },
  { name:"Tata Tea Gold 500g",     category:"Beverages",unit:"pc", mrp:305, cost:274, gst:5  },
  { name:"Red Label Tea 250g",     category:"Beverages",unit:"pc", mrp:148, cost:133, gst:5  },
  { name:"Bru Coffee 100g",        category:"Beverages",unit:"pc", mrp:185, cost:166, gst:5  },
  { name:"Nescafe Classic 100g",   category:"Beverages",unit:"pc", mrp:350, cost:315, gst:5  },
  { name:"Horlicks 500g",          category:"Beverages",unit:"pc", mrp:295, cost:265, gst:12 },
  { name:"Bournvita 500g",         category:"Beverages",unit:"pc", mrp:285, cost:256, gst:12 },
  { name:"Complan 500g",           category:"Beverages",unit:"pc", mrp:310, cost:279, gst:12 },
  { name:"Coca Cola 500ml",        category:"Beverages",unit:"pc", mrp:40,  cost:35,  gst:28 },
  { name:"Pepsi 500ml",            category:"Beverages",unit:"pc", mrp:40,  cost:35,  gst:28 },
  { name:"Sprite 500ml",           category:"Beverages",unit:"pc", mrp:40,  cost:35,  gst:28 },
  { name:"Thums Up 500ml",         category:"Beverages",unit:"pc", mrp:40,  cost:35,  gst:28 },
  { name:"Frooti 200ml",           category:"Beverages",unit:"pc", mrp:20,  cost:17,  gst:12 },
  { name:"Real Fruit Juice 1L",    category:"Beverages",unit:"pc", mrp:99,  cost:88,  gst:12 },
  { name:"ORS Sachet (Pack of 5)", category:"Beverages",unit:"pc", mrp:30,  cost:24,  gst:0  },
  { name:"Glucon-D 200g",          category:"Beverages",unit:"pc", mrp:78,  cost:68,  gst:12 },
  { name:"Coconut Water 200ml",    category:"Beverages",unit:"pc", mrp:35,  cost:30,  gst:12 },

  // ── Biscuits & Snacks ─────────────────────────────────
  { name:"Parle-G 500g",           category:"Snacks",  unit:"pc",  mrp:50,  cost:44,  gst:5  },
  { name:"Parle-G 1kg",            category:"Snacks",  unit:"pc",  mrp:98,  cost:87,  gst:5  },
  { name:"Britannia Good Day 200g",category:"Snacks",  unit:"pc",  mrp:68,  cost:61,  gst:5  },
  { name:"Britannia Marie 200g",   category:"Snacks",  unit:"pc",  mrp:42,  cost:37,  gst:5  },
  { name:"Hide & Seek 200g",       category:"Snacks",  unit:"pc",  mrp:72,  cost:64,  gst:5  },
  { name:"Maggi Noodles 70g",      category:"Snacks",  unit:"pc",  mrp:14,  cost:12,  gst:12 },
  { name:"Maggi Noodles 4-pack",   category:"Snacks",  unit:"pc",  mrp:56,  cost:49,  gst:12 },
  { name:"Lays Classic 26g",       category:"Snacks",  unit:"pc",  mrp:20,  cost:17,  gst:12 },
  { name:"Kurkure 50g",            category:"Snacks",  unit:"pc",  mrp:20,  cost:17,  gst:12 },
  { name:"Haldiram Namkeen 200g",  category:"Snacks",  unit:"pc",  mrp:65,  cost:57,  gst:12 },
  { name:"Bikaji Bhujia 200g",     category:"Snacks",  unit:"pc",  mrp:60,  cost:53,  gst:12 },
  { name:"Pringles Original 110g", category:"Snacks",  unit:"pc",  mrp:199, cost:175, gst:12 },

  // ── Personal Care ─────────────────────────────────────
  { name:"Colgate Toothpaste 200g",category:"Personal Care",unit:"pc",mrp:148,cost:133,gst:12},
  { name:"Pepsodent Toothpaste 200g",category:"Personal Care",unit:"pc",mrp:120,cost:108,gst:12},
  { name:"Lux Soap 100g",          category:"Personal Care",unit:"pc",mrp:45, cost:40,  gst:12 },
  { name:"Lifebuoy Soap 125g",     category:"Personal Care",unit:"pc",mrp:48, cost:43,  gst:12 },
  { name:"Dettol Soap 75g",        category:"Personal Care",unit:"pc",mrp:38, cost:34,  gst:12 },
  { name:"Dove Soap 100g",         category:"Personal Care",unit:"pc",mrp:55, cost:49,  gst:12 },
  { name:"Clinic Plus Shampoo 175ml",category:"Personal Care",unit:"pc",mrp:138,cost:124,gst:18},
  { name:"Head & Shoulders 180ml", category:"Personal Care",unit:"pc",mrp:199,cost:179, gst:18 },
  { name:"Parachute Hair Oil 200ml",category:"Personal Care",unit:"pc",mrp:115,cost:103,gst:18},
  { name:"Bajaj Almond Oil 100ml", category:"Personal Care",unit:"pc",mrp:95, cost:85,  gst:18 },
  { name:"Fair & Lovely Cream 50g",category:"Personal Care",unit:"pc",mrp:55, cost:49,  gst:18 },
  { name:"Vaseline Cream 100ml",   category:"Personal Care",unit:"pc",mrp:99, cost:88,  gst:18 },

  // ── Household ─────────────────────────────────────────
  { name:"Surf Excel 1kg",         category:"Household",unit:"pc", mrp:168, cost:151, gst:12 },
  { name:"Ariel 1kg",              category:"Household",unit:"pc", mrp:178, cost:160, gst:12 },
  { name:"Rin Detergent 1kg",      category:"Household",unit:"pc", mrp:89,  cost:80,  gst:12 },
  { name:"Vim Dishwash 500g",      category:"Household",unit:"pc", mrp:68,  cost:61,  gst:18 },
  { name:"Harpic Liquid 500ml",    category:"Household",unit:"pc", mrp:138, cost:124, gst:18 },
  { name:"Lizol Floor Cleaner 500ml",category:"Household",unit:"pc",mrp:148,cost:133, gst:18 },
  { name:"Good Knight Coil",       category:"Household",unit:"pc", mrp:25,  cost:21,  gst:12 },
  { name:"Hit Mosquito Spray 200ml",category:"Household",unit:"pc",mrp:148, cost:133, gst:18 },
  { name:"Candles (Pack of 6)",    category:"Household",unit:"pc", mrp:35,  cost:30,  gst:12 },
  { name:"Matchbox (Pack of 10)",  category:"Household",unit:"pc", mrp:20,  cost:16,  gst:0  },

  // ── Baby & Health ─────────────────────────────────────
  { name:"Dettol Antiseptic 100ml",category:"Health",  unit:"pc",  mrp:89,  cost:79,  gst:12 },
  { name:"Savlon Antiseptic 100ml",category:"Health",  unit:"pc",  mrp:79,  cost:70,  gst:12 },
  { name:"Band Aid Box",           category:"Health",  unit:"pc",  mrp:55,  cost:48,  gst:12 },
  { name:"Vicks VapoRub 50g",      category:"Health",  unit:"pc",  mrp:99,  cost:88,  gst:12 },
  { name:"Burnol 20g",             category:"Health",  unit:"pc",  mrp:68,  cost:60,  gst:12 },
  { name:"Pampers Diapers S (20pc)",category:"Baby",   unit:"pc",  mrp:299, cost:265, gst:12 },
  { name:"Huggies Diapers M (20pc)",category:"Baby",   unit:"pc",  mrp:319, cost:283, gst:12 },
  { name:"Johnson Baby Powder 200g",category:"Baby",   unit:"pc",  mrp:145, cost:130, gst:12 },

  // ── Stationery ────────────────────────────────────────
  { name:"Classmate Notebook 200pg",category:"Stationery",unit:"pc",mrp:55, cost:48,  gst:12 },
  { name:"Reynolds Pen (10pc)",    category:"Stationery",unit:"pc", mrp:50, cost:42,  gst:12 },
  { name:"Fevicol 50g",            category:"Stationery",unit:"pc", mrp:35, cost:30,  gst:18 },

  // ── Dry Fruits ────────────────────────────────────────
  { name:"Cashews 250g",           category:"Dry Fruits",unit:"pc",mrp:280, cost:248, gst:5  },
  { name:"Almonds 250g",           category:"Dry Fruits",unit:"pc",mrp:350, cost:312, gst:5  },
  { name:"Raisins 250g",           category:"Dry Fruits",unit:"pc",mrp:120, cost:105, gst:5  },
  { name:"Peanuts 500g",           category:"Dry Fruits",unit:"pc",mrp:80,  cost:70,  gst:5  },
  { name:"Dates 500g",             category:"Dry Fruits",unit:"pc",mrp:150, cost:132, gst:0  },
]

export const CATEGORIES = [...new Set(CATALOG.map(p => p.category))]

export function getCatalogByCategory(cat) {
  return cat === "All" ? CATALOG : CATALOG.filter(p => p.category === cat)
}
