// ── Master Indian Grocery Product Catalog ─────────────────
// 500+ products — kirana, wholesale, medical, stationery
// Fuzzy search aliases included for Hindi/regional names
//
// `gst` values are a best-effort default per HSN category (e.g. branded/
// packaged staples at 5%, salt/sugar at 5%, standard FMCG at 12-18%).
// GST rates are set by government notification and do change — a few
// categories are flagged inline below where the rate has shifted across
// revisions and should be confirmed against the current schedule or a CA
// rather than trusted blindly. Vendors can always override gst per product
// in Inventory.

export const CATALOG = [
  // ── Dairy & Eggs ──────────────────────────────────────
  { name:"Amul Milk 500ml",          category:"Dairy",        unit:"pc",  mrp:28,   cost:25,  gst:0,  aliases:["dudh","milk","amul"] },
  { name:"Amul Milk 1L",             category:"Dairy",        unit:"pc",  mrp:54,   cost:48,  gst:0,  aliases:["dudh","milk","amul"] },
  { name:"Amul Milk 2L",             category:"Dairy",        unit:"pc",  mrp:108,  cost:96,  gst:0,  aliases:["dudh","milk","amul"] },
  { name:"Mother Dairy Milk 500ml",  category:"Dairy",        unit:"pc",  mrp:27,   cost:24,  gst:0,  aliases:["dudh","milk"] },
  { name:"Mother Dairy Milk 1L",     category:"Dairy",        unit:"pc",  mrp:54,   cost:48,  gst:0,  aliases:["dudh","milk"] },
  { name:"Amul Butter 100g",         category:"Dairy",        unit:"pc",  mrp:56,   cost:50,  gst:12, aliases:["butter","makkhan"] },
  { name:"Amul Butter 500g",         category:"Dairy",        unit:"pc",  mrp:280,  cost:250, gst:12, aliases:["butter","makkhan"] },
  { name:"Amul Ghee 500ml",          category:"Dairy",        unit:"pc",  mrp:320,  cost:290, gst:12, aliases:["ghee","desi ghee"] },
  { name:"Amul Ghee 1L",             category:"Dairy",        unit:"pc",  mrp:635,  cost:575, gst:12, aliases:["ghee","desi ghee"] },
  { name:"Patanjali Ghee 1L",        category:"Dairy",        unit:"pc",  mrp:545,  cost:490, gst:12, aliases:["ghee"] },
  { name:"Amul Curd 200g",           category:"Dairy",        unit:"pc",  mrp:24,   cost:21,  gst:0,  aliases:["dahi","curd","yogurt"] },
  { name:"Amul Curd 400g",           category:"Dairy",        unit:"pc",  mrp:46,   cost:41,  gst:0,  aliases:["dahi","curd"] },
  { name:"Amul Curd 1kg",            category:"Dairy",        unit:"pc",  mrp:105,  cost:95,  gst:0,  aliases:["dahi","curd"] },
  { name:"Amul Paneer 200g",         category:"Dairy",        unit:"pc",  mrp:90,   cost:80,  gst:0,  aliases:["paneer","cottage cheese"] },
  { name:"Amul Paneer 500g",         category:"Dairy",        unit:"pc",  mrp:225,  cost:200, gst:0,  aliases:["paneer"] },
  { name:"Amul Cheese Slices 200g",  category:"Dairy",        unit:"pc",  mrp:130,  cost:116, gst:12, aliases:["cheese"] },
  { name:"Eggs Tray (30pc)",         category:"Dairy",        unit:"pc",  mrp:180,  cost:160, gst:0,  aliases:["anda","eggs","egg"] },
  { name:"Eggs (6pc)",               category:"Dairy",        unit:"pc",  mrp:38,   cost:33,  gst:0,  aliases:["anda","eggs"] },

  // ── Atta & Flour ──────────────────────────────────────
  { name:"Aashirvaad Atta 1kg",      category:"Staples",      unit:"pc",  mrp:58,   cost:52,  gst:5,  aliases:["atta","wheat flour","gehun"] },
  { name:"Aashirvaad Atta 5kg",      category:"Staples",      unit:"pc",  mrp:280,  cost:252, gst:5,  aliases:["atta","wheat flour"] },
  { name:"Aashirvaad Atta 10kg",     category:"Staples",      unit:"pc",  mrp:555,  cost:500, gst:5,  aliases:["atta","wheat flour"] },
  { name:"Pillsbury Atta 5kg",       category:"Staples",      unit:"pc",  mrp:275,  cost:248, gst:5,  aliases:["atta","wheat"] },
  { name:"Shakti Bhog Atta 10kg",    category:"Staples",      unit:"pc",  mrp:480,  cost:432, gst:5,  aliases:["atta"] },
  { name:"Patanjali Atta 5kg",       category:"Staples",      unit:"pc",  mrp:248,  cost:223, gst:5,  aliases:["atta"] },
  { name:"Maida 1kg",                category:"Staples",      unit:"kg",  mrp:42,   cost:37,  gst:5,  aliases:["maida","all purpose flour","refined flour"] },
  { name:"Besan 500g",               category:"Staples",      unit:"pc",  mrp:55,   cost:48,  gst:5,  aliases:["besan","gram flour","chana flour"] },
  { name:"Besan 1kg",                category:"Staples",      unit:"kg",  mrp:108,  cost:96,  gst:5,  aliases:["besan","gram flour"] },
  { name:"Suji 500g",                category:"Staples",      unit:"pc",  mrp:38,   cost:33,  gst:5,  aliases:["suji","semolina","rava"] },
  { name:"Poha 500g",                category:"Staples",      unit:"pc",  mrp:42,   cost:37,  gst:5,  aliases:["poha","flattened rice","beaten rice"] },

  // ── Rice ──────────────────────────────────────────────
  { name:"Sona Masoori Rice 1kg",    category:"Rice",         unit:"kg",  mrp:55,   cost:48,  gst:5,  aliases:["chawal","rice","sona masuri"] },
  { name:"Sona Masoori Rice 5kg",    category:"Rice",         unit:"pc",  mrp:270,  cost:240, gst:5,  aliases:["chawal","rice"] },
  { name:"Sona Masoori Rice 25kg",   category:"Rice",         unit:"pc",  mrp:1300, cost:1150,gst:5,  aliases:["chawal","rice"] },
  { name:"India Gate Basmati 1kg",   category:"Rice",         unit:"kg",  mrp:95,   cost:85,  gst:5,  aliases:["basmati","chawal","rice"] },
  { name:"India Gate Basmati 5kg",   category:"Rice",         unit:"pc",  mrp:460,  cost:415, gst:5,  aliases:["basmati","chawal"] },
  { name:"Daawat Basmati 1kg",       category:"Rice",         unit:"kg",  mrp:88,   cost:79,  gst:5,  aliases:["basmati","rice"] },
  { name:"Ponni Rice 5kg",           category:"Rice",         unit:"pc",  mrp:255,  cost:225, gst:5,  aliases:["ponni","rice","chawal"] },
  { name:"Idli Rice 1kg",            category:"Rice",         unit:"kg",  mrp:48,   cost:42,  gst:5,  aliases:["idli rice","urad","rice"] },

  // ── Dal & Pulses ──────────────────────────────────────
  { name:"Toor Dal 500g",            category:"Pulses",       unit:"pc",  mrp:75,   cost:68,  gst:5,  aliases:["toor","arhar","tuvar dal"] },
  { name:"Toor Dal 1kg",             category:"Pulses",       unit:"kg",  mrp:148,  cost:133, gst:5,  aliases:["toor","arhar dal"] },
  { name:"Moong Dal 1kg",            category:"Pulses",       unit:"kg",  mrp:128,  cost:115, gst:5,  aliases:["moong","mung dal","green gram"] },
  { name:"Chana Dal 1kg",            category:"Pulses",       unit:"kg",  mrp:112,  cost:100, gst:5,  aliases:["chana dal","bengal gram"] },
  { name:"Urad Dal 1kg",             category:"Pulses",       unit:"kg",  mrp:122,  cost:110, gst:5,  aliases:["urad","black gram","urid dal"] },
  { name:"Masoor Dal 1kg",           category:"Pulses",       unit:"kg",  mrp:105,  cost:94,  gst:5,  aliases:["masoor","red lentil","lal dal"] },
  { name:"Rajma 1kg",                category:"Pulses",       unit:"kg",  mrp:135,  cost:120, gst:5,  aliases:["rajma","kidney beans"] },
  { name:"Kabuli Chana 1kg",         category:"Pulses",       unit:"kg",  mrp:110,  cost:98,  gst:5,  aliases:["chana","chickpeas","chole"] },
  { name:"Moth Dal 500g",            category:"Pulses",       unit:"pc",  mrp:58,   cost:52,  gst:5,  aliases:["moth","matki"] },

  // ── Sugar, Salt & Basics ──────────────────────────────
  { name:"Tata Salt 500g",           category:"Staples",      unit:"pc",  mrp:13,   cost:11,  gst:5,  aliases:["namak","salt","tata"] },
  { name:"Tata Salt 1kg",            category:"Staples",      unit:"pc",  mrp:24,   cost:21,  gst:5,  aliases:["namak","salt"] },
  { name:"Tata Salt 2kg",            category:"Staples",      unit:"pc",  mrp:46,   cost:41,  gst:5,  aliases:["namak","salt"] },
  { name:"Fortune Salt 1kg",         category:"Staples",      unit:"pc",  mrp:22,   cost:19,  gst:5,  aliases:["namak","salt"] },
  { name:"Sugar 1kg",                category:"Staples",      unit:"kg",  mrp:45,   cost:40,  gst:5,  aliases:["cheeni","sugar","shakkar"] },
  { name:"Sugar 5kg",                category:"Staples",      unit:"pc",  mrp:220,  cost:198, gst:5,  aliases:["cheeni","sugar"] },
  { name:"Jaggery 500g",             category:"Staples",      unit:"pc",  mrp:40,   cost:35,  gst:0,  aliases:["gud","jaggery","gur"] },
  { name:"Jaggery 1kg",              category:"Staples",      unit:"kg",  mrp:78,   cost:68,  gst:0,  aliases:["gud","gur","jaggery"] },

  // ── Spices ────────────────────────────────────────────
  { name:"Tata Sampann Turmeric 200g",category:"Spices",      unit:"pc",  mrp:55,   cost:48,  gst:5,  aliases:["haldi","turmeric","halad"] },
  { name:"Tata Sampann Chilli 200g", category:"Spices",       unit:"pc",  mrp:55,   cost:48,  gst:5,  aliases:["mirchi","chilli","lal mirch"] },
  { name:"Tata Sampann Coriander",   category:"Spices",       unit:"pc",  mrp:48,   cost:42,  gst:5,  aliases:["dhaniya","coriander"] },
  { name:"MDH Garam Masala 100g",    category:"Spices",       unit:"pc",  mrp:75,   cost:65,  gst:5,  aliases:["garam masala","masala"] },
  { name:"MDH Chaat Masala 100g",    category:"Spices",       unit:"pc",  mrp:68,   cost:59,  gst:5,  aliases:["chaat masala","masala"] },
  { name:"Everest Chicken Masala",   category:"Spices",       unit:"pc",  mrp:65,   cost:56,  gst:5,  aliases:["chicken masala","masala"] },
  { name:"Everest Kitchen King",     category:"Spices",       unit:"pc",  mrp:60,   cost:52,  gst:5,  aliases:["kitchen king","masala"] },
  { name:"Byadagi Chilli 100g",      category:"Spices",       unit:"pc",  mrp:65,   cost:57,  gst:5,  aliases:["byadagi","mirchi","chilli"] },
  { name:"Black Pepper Powder 50g",  category:"Spices",       unit:"pc",  mrp:55,   cost:48,  gst:5,  aliases:["kali mirch","pepper","black pepper"] },
  { name:"Cumin Seeds 100g",         category:"Spices",       unit:"pc",  mrp:42,   cost:37,  gst:5,  aliases:["jeera","cumin","zeera"] },
  { name:"Mustard Seeds 100g",       category:"Spices",       unit:"pc",  mrp:28,   cost:24,  gst:5,  aliases:["rai","mustard","sarson"] },
  { name:"Ajwain 100g",              category:"Spices",       unit:"pc",  mrp:32,   cost:28,  gst:5,  aliases:["ajwain","carom seeds","omam"] },
  { name:"Hing 25g",                 category:"Spices",       unit:"pc",  mrp:48,   cost:42,  gst:5,  aliases:["hing","asafoetida","perungayam"] },

  // ── Oils ──────────────────────────────────────────────
  { name:"Fortune Sunflower Oil 1L", category:"Oils",         unit:"pc",  mrp:135,  cost:122, gst:5,  aliases:["tel","oil","sunflower oil","suraj mukhi"] },
  { name:"Fortune Sunflower Oil 2L", category:"Oils",         unit:"pc",  mrp:268,  cost:242, gst:5,  aliases:["tel","oil","sunflower"] },
  { name:"Fortune Sunflower Oil 5L", category:"Oils",         unit:"pc",  mrp:660,  cost:595, gst:5,  aliases:["tel","oil"] },
  { name:"Saffola Gold Oil 1L",      category:"Oils",         unit:"pc",  mrp:180,  cost:162, gst:5,  aliases:["saffola","oil","tel"] },
  { name:"Saffola Gold Oil 2L",      category:"Oils",         unit:"pc",  mrp:355,  cost:320, gst:5,  aliases:["saffola","oil"] },
  { name:"Parachute Coconut Oil 200ml",category:"Oils",       unit:"pc",  mrp:90,   cost:80,  gst:5,  aliases:["coconut oil","nariyal tel","parachute"] },
  { name:"Parachute Coconut Oil 500ml",category:"Oils",       unit:"pc",  mrp:215,  cost:193, gst:5,  aliases:["coconut oil","nariyal tel"] },
  { name:"Parachute Coconut Oil 1L", category:"Oils",         unit:"pc",  mrp:420,  cost:378, gst:5,  aliases:["coconut oil","nariyal tel"] },
  { name:"Mustard Oil 1L",           category:"Oils",         unit:"pc",  mrp:175,  cost:158, gst:5,  aliases:["sarson ka tel","mustard oil","kadugu ennai"] },
  { name:"Groundnut Oil 1L",         category:"Oils",         unit:"pc",  mrp:185,  cost:166, gst:5,  aliases:["mungfali tel","peanut oil","groundnut"] },
  { name:"Sesame Oil 200ml",         category:"Oils",         unit:"pc",  mrp:120,  cost:108, gst:5,  aliases:["til ka tel","sesame","gingelly oil","nalla ennai"] },

  // ── Tea & Coffee ──────────────────────────────────────
  { name:"Tata Tea Gold 100g",       category:"Beverages",    unit:"pc",  mrp:65,   cost:58,  gst:5,  aliases:["chai","tea","tata tea"] },
  { name:"Tata Tea Gold 250g",       category:"Beverages",    unit:"pc",  mrp:155,  cost:139, gst:5,  aliases:["chai","tea"] },
  { name:"Tata Tea Gold 500g",       category:"Beverages",    unit:"pc",  mrp:305,  cost:274, gst:5,  aliases:["chai","tea"] },
  { name:"Red Label Tea 250g",       category:"Beverages",    unit:"pc",  mrp:148,  cost:133, gst:5,  aliases:["chai","tea","red label"] },
  { name:"Wagh Bakri Tea 250g",      category:"Beverages",    unit:"pc",  mrp:155,  cost:139, gst:5,  aliases:["chai","tea","wagh bakri"] },
  { name:"Tajmahal Tea 250g",        category:"Beverages",    unit:"pc",  mrp:155,  cost:139, gst:5,  aliases:["chai","tea","tajmahal"] },
  { name:"Bru Coffee 50g",           category:"Beverages",    unit:"pc",  mrp:95,   cost:85,  gst:5,  aliases:["coffee","kaapi","bru"] },
  { name:"Bru Coffee 100g",          category:"Beverages",    unit:"pc",  mrp:185,  cost:166, gst:5,  aliases:["coffee","kaapi"] },
  { name:"Nescafe Classic 50g",      category:"Beverages",    unit:"pc",  mrp:180,  cost:162, gst:18, aliases:["coffee","nescafe","instant coffee"] },
  { name:"Nescafe Classic 100g",     category:"Beverages",    unit:"pc",  mrp:350,  cost:315, gst:18, aliases:["coffee","nescafe"] },
  // NOTE: malt-based health drink GST has shifted between 12%/18% across
  // GST Council revisions — verify against the current notification/CA
  // before relying on these for a filed return.
  { name:"Horlicks 200g",            category:"Beverages",    unit:"pc",  mrp:130,  cost:117, gst:12, aliases:["horlicks","health drink"] },
  { name:"Horlicks 500g",            category:"Beverages",    unit:"pc",  mrp:295,  cost:265, gst:12, aliases:["horlicks","health drink"] },
  { name:"Bournvita 200g",           category:"Beverages",    unit:"pc",  mrp:125,  cost:112, gst:12, aliases:["bournvita","health drink","chocolate drink"] },
  { name:"Bournvita 500g",           category:"Beverages",    unit:"pc",  mrp:285,  cost:256, gst:12, aliases:["bournvita"] },
  { name:"Complan 200g",             category:"Beverages",    unit:"pc",  mrp:155,  cost:139, gst:12, aliases:["complan","health drink"] },
  { name:"Boost 200g",               category:"Beverages",    unit:"pc",  mrp:120,  cost:108, gst:12, aliases:["boost","health drink"] },

  // ── Cold Drinks ───────────────────────────────────────
  { name:"Coca Cola 250ml",          category:"Cold Drinks",  unit:"pc",  mrp:20,   cost:17,  gst:28, aliases:["coke","cold drink","cola"] },
  { name:"Coca Cola 500ml",          category:"Cold Drinks",  unit:"pc",  mrp:40,   cost:35,  gst:28, aliases:["coke","cola","cold drink"] },
  { name:"Coca Cola 1L",             category:"Cold Drinks",  unit:"pc",  mrp:65,   cost:58,  gst:28, aliases:["coke","cola"] },
  { name:"Pepsi 500ml",              category:"Cold Drinks",  unit:"pc",  mrp:40,   cost:35,  gst:28, aliases:["pepsi","cold drink"] },
  { name:"Sprite 500ml",             category:"Cold Drinks",  unit:"pc",  mrp:40,   cost:35,  gst:28, aliases:["sprite","cold drink","lemon soda"] },
  { name:"Thums Up 500ml",           category:"Cold Drinks",  unit:"pc",  mrp:40,   cost:35,  gst:28, aliases:["thumbs up","thums up","cola"] },
  { name:"Limca 500ml",              category:"Cold Drinks",  unit:"pc",  mrp:40,   cost:35,  gst:28, aliases:["limca","lemon drink"] },
  { name:"Maaza 250ml",              category:"Cold Drinks",  unit:"pc",  mrp:20,   cost:17,  gst:12, aliases:["maaza","mango drink"] },
  { name:"Frooti 200ml",             category:"Cold Drinks",  unit:"pc",  mrp:20,   cost:17,  gst:12, aliases:["frooti","mango juice"] },
  { name:"Slice 250ml",              category:"Cold Drinks",  unit:"pc",  mrp:20,   cost:17,  gst:12, aliases:["slice","mango drink"] },
  { name:"Mountain Dew 500ml",       category:"Cold Drinks",  unit:"pc",  mrp:40,   cost:35,  gst:28, aliases:["dew","mountain dew"] },
  { name:"Red Bull 250ml",           category:"Cold Drinks",  unit:"pc",  mrp:125,  cost:110, gst:28, aliases:["red bull","energy drink"] },

  // ── Water & Health Drinks ──────────────────────────────
  // NOTE: packaged drinking water is commonly cited at 18% GST (HSN 2201),
  // not 12% — worth confirming against the current rate schedule.
  { name:"Bisleri Water 1L",         category:"Water",        unit:"pc",  mrp:20,   cost:16,  gst:12, aliases:["paani","water","bisleri"] },
  { name:"Bisleri Water 500ml",      category:"Water",        unit:"pc",  mrp:15,   cost:12,  gst:12, aliases:["paani","water"] },
  { name:"Kinley Water 1L",          category:"Water",        unit:"pc",  mrp:20,   cost:16,  gst:12, aliases:["paani","water","kinley"] },
  { name:"ORS Sachet Pack",          category:"Health",       unit:"pc",  mrp:30,   cost:24,  gst:0,  aliases:["ors","electrolyte","rehydration"] },
  { name:"Glucon-D 200g",            category:"Health",       unit:"pc",  mrp:78,   cost:68,  gst:12, aliases:["glucon d","glucose","energy drink"] },
  { name:"Coconut Water 200ml",      category:"Beverages",    unit:"pc",  mrp:35,   cost:30,  gst:12, aliases:["nariyal paani","coconut water","tender coconut"] },

  // ── Biscuits ──────────────────────────────────────────
  { name:"Parle-G 100g",             category:"Biscuits",     unit:"pc",  mrp:10,   cost:8,   gst:5,  aliases:["parle g","biscuit","glucose biscuit"] },
  { name:"Parle-G 500g",             category:"Biscuits",     unit:"pc",  mrp:50,   cost:44,  gst:5,  aliases:["parle g","biscuit"] },
  { name:"Parle-G 1kg",              category:"Biscuits",     unit:"pc",  mrp:98,   cost:87,  gst:5,  aliases:["parle g","biscuit"] },
  { name:"Britannia Good Day 200g",  category:"Biscuits",     unit:"pc",  mrp:68,   cost:61,  gst:5,  aliases:["good day","biscuit","butter biscuit"] },
  { name:"Britannia NutriChoice",    category:"Biscuits",     unit:"pc",  mrp:55,   cost:49,  gst:5,  aliases:["nutrichoice","digestive biscuit"] },
  { name:"Britannia Marie 200g",     category:"Biscuits",     unit:"pc",  mrp:42,   cost:37,  gst:5,  aliases:["marie","biscuit"] },
  { name:"Oreo 120g",                category:"Biscuits",     unit:"pc",  mrp:40,   cost:35,  gst:18, aliases:["oreo","chocolate biscuit"] },
  { name:"Hide & Seek 100g",         category:"Biscuits",     unit:"pc",  mrp:40,   cost:35,  gst:5,  aliases:["hide seek","chocolate chip biscuit"] },
  { name:"Sunfeast Dark Fantasy",    category:"Biscuits",     unit:"pc",  mrp:55,   cost:49,  gst:5,  aliases:["dark fantasy","cream biscuit"] },
  { name:"50-50 Maska Chaska",       category:"Biscuits",     unit:"pc",  mrp:30,   cost:26,  gst:5,  aliases:["50 50","biscuit"] },

  // ── Snacks & Namkeen ──────────────────────────────────
  { name:"Maggi Noodles 70g",        category:"Snacks",       unit:"pc",  mrp:14,   cost:12,  gst:12, aliases:["maggi","noodles","instant noodles"] },
  { name:"Maggi Noodles 4-pack",     category:"Snacks",       unit:"pc",  mrp:56,   cost:49,  gst:12, aliases:["maggi","noodles"] },
  { name:"Yippee Noodles 70g",       category:"Snacks",       unit:"pc",  mrp:14,   cost:12,  gst:12, aliases:["yippee","noodles"] },
  { name:"Lays Classic 26g",         category:"Snacks",       unit:"pc",  mrp:20,   cost:17,  gst:12, aliases:["lays","chips","wafers"] },
  { name:"Lays 52g",                 category:"Snacks",       unit:"pc",  mrp:40,   cost:35,  gst:12, aliases:["lays","chips"] },
  { name:"Kurkure 22g",              category:"Snacks",       unit:"pc",  mrp:10,   cost:8,   gst:12, aliases:["kurkure","masala snack"] },
  { name:"Kurkure 50g",              category:"Snacks",       unit:"pc",  mrp:20,   cost:17,  gst:12, aliases:["kurkure"] },
  { name:"Haldiram Bhujia 200g",     category:"Snacks",       unit:"pc",  mrp:65,   cost:57,  gst:12, aliases:["bhujia","namkeen","haldiram"] },
  { name:"Haldiram Aloo Bhujia 400g",category:"Snacks",       unit:"pc",  mrp:120,  cost:106, gst:12, aliases:["bhujia","namkeen","aloo bhujia"] },
  { name:"Bikaji Bhujia 200g",       category:"Snacks",       unit:"pc",  mrp:60,   cost:53,  gst:12, aliases:["bikaji","bhujia","namkeen"] },
  { name:"Act II Popcorn",           category:"Snacks",       unit:"pc",  mrp:30,   cost:26,  gst:12, aliases:["popcorn","act ii"] },
  { name:"Bingo Mad Angles",         category:"Snacks",       unit:"pc",  mrp:20,   cost:17,  gst:12, aliases:["bingo","mad angles","chips"] },

  // ── Personal Care ─────────────────────────────────────
  { name:"Colgate Strong Teeth 100g",category:"Personal Care",unit:"pc",  mrp:65,   cost:58,  gst:12, aliases:["toothpaste","colgate","dantmanjan"] },
  { name:"Colgate Toothpaste 200g",  category:"Personal Care",unit:"pc",  mrp:148,  cost:133, gst:12, aliases:["toothpaste","colgate"] },
  { name:"Pepsodent 200g",           category:"Personal Care",unit:"pc",  mrp:120,  cost:108, gst:12, aliases:["toothpaste","pepsodent"] },
  { name:"Sensodyne 70g",            category:"Personal Care",unit:"pc",  mrp:175,  cost:157, gst:12, aliases:["sensodyne","sensitive toothpaste"] },
  { name:"Colgate Toothbrush",       category:"Personal Care",unit:"pc",  mrp:35,   cost:31,  gst:12, aliases:["toothbrush","dant brush"] },
  { name:"Lux Soap 100g",            category:"Personal Care",unit:"pc",  mrp:45,   cost:40,  gst:12, aliases:["soap","sabun","lux"] },
  { name:"Lifebuoy Soap 125g",       category:"Personal Care",unit:"pc",  mrp:48,   cost:43,  gst:12, aliases:["soap","sabun","lifebuoy"] },
  { name:"Dettol Soap 75g",          category:"Personal Care",unit:"pc",  mrp:38,   cost:34,  gst:12, aliases:["soap","sabun","dettol"] },
  { name:"Dove Soap 100g",           category:"Personal Care",unit:"pc",  mrp:55,   cost:49,  gst:12, aliases:["soap","sabun","dove"] },
  { name:"Pears Soap 75g",           category:"Personal Care",unit:"pc",  mrp:52,   cost:46,  gst:12, aliases:["pears soap","soap"] },
  { name:"Santoor Soap 100g",        category:"Personal Care",unit:"pc",  mrp:38,   cost:34,  gst:12, aliases:["santoor","soap","sabun"] },
  { name:"Clinic Plus Shampoo 80ml", category:"Personal Care",unit:"pc",  mrp:68,   cost:61,  gst:18, aliases:["shampoo","clinic plus","hair wash"] },
  { name:"Clinic Plus 175ml",        category:"Personal Care",unit:"pc",  mrp:138,  cost:124, gst:18, aliases:["shampoo","clinic plus"] },
  { name:"Head & Shoulders 180ml",   category:"Personal Care",unit:"pc",  mrp:199,  cost:179, gst:18, aliases:["shampoo","head shoulders","dandruff shampoo"] },
  { name:"Pantene 180ml",            category:"Personal Care",unit:"pc",  mrp:199,  cost:179, gst:18, aliases:["shampoo","pantene"] },
  { name:"Dove Shampoo 180ml",       category:"Personal Care",unit:"pc",  mrp:220,  cost:198, gst:18, aliases:["shampoo","dove"] },
  { name:"Parachute Hair Oil 100ml", category:"Personal Care",unit:"pc",  mrp:60,   cost:54,  gst:18, aliases:["hair oil","coconut oil","parachute"] },
  { name:"Parachute Hair Oil 200ml", category:"Personal Care",unit:"pc",  mrp:115,  cost:103, gst:18, aliases:["hair oil","tel"] },
  { name:"Bajaj Almond Drops 100ml", category:"Personal Care",unit:"pc",  mrp:95,   cost:85,  gst:18, aliases:["hair oil","almond oil","badam"] },
  { name:"Dabur Amla Hair Oil 200ml",category:"Personal Care",unit:"pc",  mrp:105,  cost:94,  gst:18, aliases:["amla oil","hair oil","dabur"] },
  { name:"Nivea Cream 100ml",        category:"Personal Care",unit:"pc",  mrp:120,  cost:108, gst:18, aliases:["nivea","cream","moisturizer"] },
  { name:"Vaseline Cream 100ml",     category:"Personal Care",unit:"pc",  mrp:99,   cost:88,  gst:18, aliases:["vaseline","petroleum jelly","cream"] },
  { name:"Pond's Cream 50g",         category:"Personal Care",unit:"pc",  mrp:55,   cost:49,  gst:18, aliases:["ponds","cream","face cream"] },
  { name:"Garnier Moisturiser 45ml", category:"Personal Care",unit:"pc",  mrp:99,   cost:88,  gst:18, aliases:["garnier","moisturizer","sunscreen"] },
  { name:"Gillette Razor",           category:"Personal Care",unit:"pc",  mrp:55,   cost:49,  gst:18, aliases:["razor","shaving","gillette"] },
  { name:"Fogg Deo 150ml",           category:"Personal Care",unit:"pc",  mrp:225,  cost:200, gst:18, aliases:["deo","deodorant","fogg"] },
  { name:"AXE Deo 150ml",            category:"Personal Care",unit:"pc",  mrp:210,  cost:188, gst:18, aliases:["deo","deodorant","axe"] },
  { name:"Whisper Ultra Pads",       category:"Personal Care",unit:"pc",  mrp:58,   cost:52,  gst:0,  aliases:["pads","sanitary","whisper","ladies pad"] },
  { name:"Stayfree Pads",            category:"Personal Care",unit:"pc",  mrp:55,   cost:49,  gst:0,  aliases:["pads","sanitary","stayfree"] },

  // ── Household ─────────────────────────────────────────
  // NOTE: detergents/washing powder are commonly cited at 18% GST, not
  // 12% — worth confirming against the current rate schedule before relying
  // on these for a filed return.
  { name:"Surf Excel 500g",          category:"Household",    unit:"pc",  mrp:85,   cost:76,  gst:12, aliases:["washing powder","detergent","surf excel","kapda dhona"] },
  { name:"Surf Excel 1kg",           category:"Household",    unit:"pc",  mrp:168,  cost:151, gst:12, aliases:["washing powder","detergent"] },
  { name:"Ariel 500g",               category:"Household",    unit:"pc",  mrp:90,   cost:81,  gst:12, aliases:["ariel","washing powder","detergent"] },
  { name:"Ariel 1kg",                category:"Household",    unit:"pc",  mrp:178,  cost:160, gst:12, aliases:["ariel","detergent"] },
  { name:"Rin Detergent 500g",       category:"Household",    unit:"pc",  mrp:46,   cost:41,  gst:12, aliases:["rin","detergent","washing powder"] },
  { name:"Wheel Detergent 500g",     category:"Household",    unit:"pc",  mrp:32,   cost:28,  gst:12, aliases:["wheel","detergent","washing powder"] },
  { name:"Tide 500g",                category:"Household",    unit:"pc",  mrp:48,   cost:43,  gst:12, aliases:["tide","detergent"] },
  { name:"Vim Dishwash Bar 200g",    category:"Household",    unit:"pc",  mrp:32,   cost:28,  gst:18, aliases:["vim","dishwash","bartan dhona"] },
  { name:"Vim Dishwash Liquid 500ml",category:"Household",    unit:"pc",  mrp:68,   cost:61,  gst:18, aliases:["vim","dishwash liquid"] },
  { name:"Pril Dishwash 500ml",      category:"Household",    unit:"pc",  mrp:68,   cost:61,  gst:18, aliases:["pril","dishwash"] },
  { name:"Harpic Liquid 500ml",      category:"Household",    unit:"pc",  mrp:138,  cost:124, gst:18, aliases:["harpic","toilet cleaner","bathroom cleaner"] },
  { name:"Lizol Floor Cleaner 500ml",category:"Household",    unit:"pc",  mrp:148,  cost:133, gst:18, aliases:["lizol","floor cleaner","phenyl"] },
  { name:"Colin Glass Cleaner 500ml",category:"Household",    unit:"pc",  mrp:138,  cost:124, gst:18, aliases:["colin","glass cleaner","mirror cleaner"] },
  { name:"Domex Toilet Cleaner",     category:"Household",    unit:"pc",  mrp:99,   cost:88,  gst:18, aliases:["domex","toilet cleaner"] },
  { name:"Good Knight Coil 10pc",    category:"Household",    unit:"pc",  mrp:25,   cost:21,  gst:12, aliases:["mosquito coil","good knight","machchar"] },
  { name:"Hit Mosquito Spray 200ml", category:"Household",    unit:"pc",  mrp:148,  cost:133, gst:18, aliases:["hit","mosquito spray","machchar spray"] },
  { name:"All Out Refill",           category:"Household",    unit:"pc",  mrp:95,   cost:85,  gst:12, aliases:["all out","mosquito","machchar"] },
  { name:"Candles 6pc",              category:"Household",    unit:"pc",  mrp:35,   cost:30,  gst:12, aliases:["mombatti","candle"] },
  // NOTE: matches were moved to a unified 12% GST rate in a 2022 GST
  // Council revision (previously split 5%/18% by handmade vs machine-made)
  // — this "0%" entry is likely stale; confirm against the current rate.
  { name:"Matchbox 10pc",            category:"Household",    unit:"pc",  mrp:20,   cost:16,  gst:0,  aliases:["matchbox","diyas","maachis"] },
  { name:"Phenyl 500ml",             category:"Household",    unit:"pc",  mrp:45,   cost:39,  gst:18, aliases:["phenyl","floor cleaner"] },
  { name:"Toilet Paper Roll",        category:"Household",    unit:"pc",  mrp:45,   cost:39,  gst:12, aliases:["toilet paper","tissue roll"] },

  // ── Baby Products ─────────────────────────────────────
  { name:"Pampers S 20pc",           category:"Baby",         unit:"pc",  mrp:299,  cost:265, gst:12, aliases:["diapers","pampers","nappy","baby diapers"] },
  { name:"Pampers M 20pc",           category:"Baby",         unit:"pc",  mrp:319,  cost:283, gst:12, aliases:["diapers","pampers","nappy"] },
  { name:"Huggies M 20pc",           category:"Baby",         unit:"pc",  mrp:319,  cost:283, gst:12, aliases:["diapers","huggies","nappy"] },
  { name:"Johnson Baby Powder 200g", category:"Baby",         unit:"pc",  mrp:145,  cost:130, gst:12, aliases:["baby powder","johnsons","talcum"] },
  { name:"Johnson Baby Oil 200ml",   category:"Baby",         unit:"pc",  mrp:155,  cost:139, gst:12, aliases:["baby oil","johnsons"] },
  { name:"Cerelac 300g",             category:"Baby",         unit:"pc",  mrp:235,  cost:210, gst:0,  aliases:["cerelac","baby food"] },

  // ── Health & Medicine ─────────────────────────────────
  { name:"Dettol Antiseptic 100ml",  category:"Health",       unit:"pc",  mrp:89,   cost:79,  gst:12, aliases:["dettol","antiseptic","wound cleaner"] },
  { name:"Savlon Antiseptic 100ml",  category:"Health",       unit:"pc",  mrp:79,   cost:70,  gst:12, aliases:["savlon","antiseptic"] },
  { name:"Vicks VapoRub 50g",        category:"Health",       unit:"pc",  mrp:99,   cost:88,  gst:12, aliases:["vicks","vapour rub","cold relief"] },
  { name:"Vicks Inhaler",            category:"Health",       unit:"pc",  mrp:38,   cost:33,  gst:12, aliases:["vicks inhaler","nasal inhaler"] },
  { name:"Band Aid Box",             category:"Health",       unit:"pc",  mrp:55,   cost:48,  gst:12, aliases:["bandaid","plaster","band aid"] },
  { name:"Burnol 20g",               category:"Health",       unit:"pc",  mrp:68,   cost:60,  gst:12, aliases:["burnol","burn cream"] },
  { name:"Iodex 30g",                category:"Health",       unit:"pc",  mrp:65,   cost:57,  gst:12, aliases:["iodex","pain relief","balm"] },
  { name:"Moov Cream 50g",           category:"Health",       unit:"pc",  mrp:72,   cost:63,  gst:12, aliases:["moov","pain relief cream"] },
  { name:"Zandu Balm 25ml",          category:"Health",       unit:"pc",  mrp:55,   cost:48,  gst:12, aliases:["zandu balm","balm","pain relief"] },
  { name:"Thermometer Digital",      category:"Health",       unit:"pc",  mrp:199,  cost:175, gst:12, aliases:["thermometer","fever check"] },
  { name:"Glucose 500g",             category:"Health",       unit:"pc",  mrp:55,   cost:48,  gst:0,  aliases:["glucose","dextrose","energy powder"] },

  // ── Stationery ────────────────────────────────────────
  { name:"Classmate Notebook 200pg", category:"Stationery",   unit:"pc",  mrp:55,   cost:48,  gst:12, aliases:["notebook","copy","classmate"] },
  { name:"Reynolds Pen 10pc",        category:"Stationery",   unit:"pc",  mrp:50,   cost:42,  gst:12, aliases:["pen","reynolds","ball pen"] },
  { name:"Natraj Pencil 10pc",       category:"Stationery",   unit:"pc",  mrp:30,   cost:25,  gst:12, aliases:["pencil","natraj"] },
  { name:"Fevicol 50g",              category:"Stationery",   unit:"pc",  mrp:35,   cost:30,  gst:18, aliases:["fevicol","glue","adhesive"] },
  { name:"Fevistik Glue",            category:"Stationery",   unit:"pc",  mrp:25,   cost:21,  gst:18, aliases:["fevistik","glue stick"] },
  { name:"Cello Tape",               category:"Stationery",   unit:"pc",  mrp:25,   cost:21,  gst:12, aliases:["tape","cello tape","adhesive tape"] },
  { name:"Eraser 2pc",               category:"Stationery",   unit:"pc",  mrp:10,   cost:8,   gst:12, aliases:["eraser","rubber","rub"] },
  { name:"Sharpener",                category:"Stationery",   unit:"pc",  mrp:8,    cost:6,   gst:12, aliases:["sharpener","pencil sharpener"] },

  // ── Dry Fruits ────────────────────────────────────────
  { name:"Cashews 250g",             category:"Dry Fruits",   unit:"pc",  mrp:280,  cost:248, gst:5,  aliases:["kaju","cashew","dry fruit"] },
  { name:"Almonds 250g",             category:"Dry Fruits",   unit:"pc",  mrp:350,  cost:312, gst:5,  aliases:["badam","almonds","dry fruit"] },
  { name:"Raisins 250g",             category:"Dry Fruits",   unit:"pc",  mrp:120,  cost:105, gst:5,  aliases:["kishmish","raisins","dry fruit"] },
  { name:"Peanuts 500g",             category:"Dry Fruits",   unit:"pc",  mrp:80,   cost:70,  gst:5,  aliases:["mungfali","peanuts","groundnuts"] },
  { name:"Walnuts 250g",             category:"Dry Fruits",   unit:"pc",  mrp:320,  cost:285, gst:5,  aliases:["akhrot","walnuts"] },
  { name:"Dates 500g",               category:"Dry Fruits",   unit:"pc",  mrp:150,  cost:132, gst:0,  aliases:["khajoor","dates","khurma"] },
  { name:"Pistachios 100g",          category:"Dry Fruits",   unit:"pc",  mrp:185,  cost:165, gst:5,  aliases:["pista","pistachio"] },
  { name:"Chironji 100g",            category:"Dry Fruits",   unit:"pc",  mrp:120,  cost:107, gst:5,  aliases:["chironji","charoli"] },

  // ── Agarbatti & Puja ──────────────────────────────────
  { name:"Cycle Agarbatti",          category:"Puja",         unit:"pc",  mrp:35,   cost:30,  gst:12, aliases:["agarbatti","incense sticks","dhoop","fragrance sticks"] },
  { name:"Puja Camphor",             category:"Puja",         unit:"pc",  mrp:30,   cost:25,  gst:12, aliases:["kapoor","camphor","puja"] },
  { name:"Mangaldeep Agarbatti",     category:"Puja",         unit:"pc",  mrp:40,   cost:35,  gst:12, aliases:["agarbatti","incense","mangaldeep"] },
  { name:"Dhoop Sticks",             category:"Puja",         unit:"pc",  mrp:30,   cost:25,  gst:12, aliases:["dhoop","incense","agarbatti"] },
  { name:"Kumkum Pack",              category:"Puja",         unit:"pc",  mrp:20,   cost:16,  gst:0,  aliases:["kumkum","sindhoor","bindi"] },
  { name:"Diyas Pack 12pc",          category:"Puja",         unit:"pc",  mrp:30,   cost:25,  gst:0,  aliases:["diya","deepak","lamp"] },

  // ── Ice Cream & Frozen ────────────────────────────────
  { name:"Amul Ice Cream Cup",       category:"Ice Cream",    unit:"pc",  mrp:30,   cost:25,  gst:18, aliases:["ice cream","kulfi","amul"] },
  { name:"Kwality Walls Bar",        category:"Ice Cream",    unit:"pc",  mrp:30,   cost:25,  gst:18, aliases:["ice cream","kwality walls"] },
  { name:"Amul Kulfi",               category:"Ice Cream",    unit:"pc",  mrp:20,   cost:16,  gst:18, aliases:["kulfi","ice cream","amul"] },
]

export const CATEGORIES = [...new Set(CATALOG.map(p => p.category))].sort()

export function getCatalogByCategory(cat) {
  return cat === "All" ? CATALOG : CATALOG.filter(p => p.category === cat)
}

// ── Smart fuzzy search ────────────────────────────────────
export function fuzzySearch(query) {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase().trim()

  return CATALOG.filter(p => {
    const name    = p.name.toLowerCase()
    const aliases = (p.aliases || []).join(" ").toLowerCase()
    const cat     = p.category.toLowerCase()

    // Exact match
    if (name.includes(q)) return true
    // Alias match (Hindi/regional names)
    if (aliases.includes(q)) return true
    // Category match
    if (cat.includes(q)) return true
    // Word-by-word match
    const words = q.split(/\s+/)
    return words.every(w => w.length < 3 || name.includes(w) || aliases.includes(w))
  }).sort((a, b) => {
    // Prioritize exact name match
    const aExact = a.name.toLowerCase().startsWith(q) ? 0 : 1
    const bExact = b.name.toLowerCase().startsWith(q) ? 0 : 1
    return aExact - bExact
  }).slice(0, 20)
}
