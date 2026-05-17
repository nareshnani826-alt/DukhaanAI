// ── Indian Festival & Seasonal Calendar ──────────────────
export const FESTIVALS = [
  { month:1, days:[14,15], name:"Makar Sankranti / Pongal", region:"All India",
    products:["Sesame seeds","Jaggery","Rice","Oil","Ghee","Turmeric"],
    boost:60, tip:"Stock til and jaggery 2 weeks before — prices rise sharply" },
  { month:1, days:[26], name:"Republic Day", region:"All India",
    products:["Cold drinks","Snacks","Biscuits","Namkeen"], boost:20,
    tip:"Holiday spike in snacks and beverages" },
  { month:2, days:[14], name:"Valentine's Day", region:"Urban",
    products:["Chocolates","Biscuits","Cold drinks"], boost:30,
    tip:"Chocolates and packaged sweets see good demand" },
  { month:3, days:[25,26,27], name:"Holi", region:"North India",
    products:["Milk","Curd","Sugar","Dry fruits","Oil"],
    boost:70, tip:"Milk and dairy demand peaks on Holi — stock 3x normal" },
  { month:4, days:[1,2,3,4,5,6,7,8,9,10,11,12,13,14], name:"Ramzan", region:"Muslim areas",
    products:["Dates","Vermicelli","Maida","Oil","Sugar","Chickpeas","Dry fruits"],
    boost:80, tip:"Stock dates and sewai before Ramzan — demand 4x normal" },
  { month:4, days:[14], name:"Ugadi / Tamil New Year / Baisakhi", region:"South & North India",
    products:["Rice","Jaggery","Mango","Coconut","Oil","Sugar"],
    boost:50, tip:"South Indian new year — raw mango and jaggery essential" },
  { month:4, days:[15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],
    name:"Summer season starts", region:"All India",
    products:["ORS packets","Cold drinks","Lemon","Coconut water","Buttermilk"],
    boost:90, tip:"Stock ORS and cold drinks heavily — summer is the peak season" },
  { month:5, days:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
    name:"Peak Summer", region:"All India",
    products:["ORS","Cold drinks","Lemon","Salt","Glucose","Coconut water"],
    boost:100, tip:"Heatwave season — ORS and electrolytes sell 5x normal. Never run out." },
  { month:6, days:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
    name:"Pre-monsoon heat", region:"All India",
    products:["ORS","Cold drinks","Lemon","Coconut water"], boost:80,
    tip:"Last weeks of heat — maintain cold drink stock" },
  { month:6, days:[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],
    name:"Monsoon starts", region:"All India",
    products:["Tea","Coffee","Biscuits","Instant noodles","Candles"],
    boost:50, tip:"Monsoon — tea, biscuits, instant foods spike" },
  { month:8, days:[15], name:"Independence Day", region:"All India",
    products:["Snacks","Cold drinks","Ice cream","Namkeen"], boost:25,
    tip:"Holiday — stock snacks" },
  { month:8, days:[19,20,21,22,23], name:"Raksha Bandhan", region:"North India",
    products:["Sweets","Dry fruits","Chocolates","Ghee","Sugar"],
    boost:60, tip:"Sweets and dry fruits — gift packs sell well" },
  { month:8, days:[23,24,25,26,27,28], name:"Janmashtami", region:"All India",
    products:["Milk","Curd","Butter","Ghee","Sugar","Dry fruits"],
    boost:70, tip:"Dairy demand peaks sharply on Janmashtami" },
  { month:9, days:[1,2,3,4,5,6,7,8,9,10], name:"Ganesh Chaturthi", region:"Maharashtra/Telangana",
    products:["Modak flour","Sugar","Coconut","Jaggery","Ghee"],
    boost:80, tip:"10-day festival — coconut and jaggery demand very high" },
  { month:10, days:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
    name:"Navratri", region:"Gujarat/North India",
    products:["Sabudana","Kuttu flour","Sendha namak","Fruits","Milk","Curd"],
    boost:70, tip:"Navratri fasting — sabudana and kuttu flour essential, stock 3 weeks early" },
  { month:10, days:[20,21,22,23,24,25,26,27,28,29,30,31],
    name:"Dussehra week", region:"All India",
    products:["Sweets","Dry fruits","Snacks","Cold drinks"], boost:40,
    tip:"Festival week — premium sweets and dry fruits" },
  { month:11, days:[1,2,3,4,5,6,7,8,9,10,11,12,13,14],
    name:"Diwali season", region:"All India",
    products:["Dry fruits","Ghee","Sugar","Maida","Oil","Sweets","Chocolates","Candles"],
    boost:100, tip:"BIGGEST festival — stock everything 1 month early. Prices rise 20-30%." },
  { month:12, days:[25], name:"Christmas", region:"Christian areas / Urban",
    products:["Cake","Bread","Chocolates","Cold drinks","Biscuits"], boost:40,
    tip:"Cake and baked goods demand peaks" },
  { month:12, days:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
    name:"Winter season", region:"North India",
    products:["Tea","Coffee","Horlicks","Ginger","Jaggery","Groundnuts"],
    boost:50, tip:"Winter comfort foods — hot beverages sell well" },
]

export const SEASONS = [
  { months:[4,5,6], name:"Summer",  color:"#E24B4A", icon:"🌡️",
    products:["ORS","Cold drinks","Lemon","Coconut water","Glucose"],
    tip:"Peak summer — hydration products are critical stock" },
  { months:[7,8,9], name:"Monsoon", color:"#378ADD", icon:"🌧️",
    products:["Tea","Biscuits","Instant noodles","Candles"],
    tip:"Rainy season — indoor snacking and hot beverages go up" },
  { months:[10,11,12], name:"Winter", color:"#7F77DD", icon:"❄️",
    products:["Tea","Coffee","Horlicks","Groundnuts","Jaggery"],
    tip:"Winter comfort — hot beverages and warmth products" },
  { months:[1,2,3], name:"Spring", color:"#1D9E75", icon:"🌸",
    products:["Cold drinks","Juice","Ice cream","Fruits"],
    tip:"Pre-summer — start stocking beverages now" },
]

export function getUpcomingFestivals(days = 45) {
  const now = new Date()
  const upcoming = []
  for (const fest of FESTIVALS) {
    for (const day of (fest.days || [])) {
      const festDate = new Date(now.getFullYear(), fest.month - 1, day)
      const diff     = Math.ceil((festDate - now) / 86400000)
      if (diff >= 0 && diff <= days) {
        upcoming.push({ ...fest, daysAway: diff, date: festDate })
        break
      }
    }
  }
  return upcoming.sort((a, b) => a.daysAway - b.daysAway)
}

export function getCurrentSeason() {
  const month = new Date().getMonth() + 1
  return SEASONS.find(s => s.months.includes(month)) || SEASONS[0]
}

export function getUrgentAlerts(inventory = []) {
  // Cross-reference upcoming festivals with current inventory
  const upcoming  = getUpcomingFestivals(14) // next 14 days
  const alerts    = []
  for (const fest of upcoming) {
    const lowItems = fest.products.filter(prod => {
      const inv = inventory.find(p =>
        p.name.toLowerCase().includes(prod.toLowerCase().split(" ")[0]) ||
        prod.toLowerCase().includes(p.name.toLowerCase().split(" ")[0])
      )
      return !inv || inv.stock < (inv.min_stock || 10)
    })
    if (lowItems.length > 0) {
      alerts.push({ ...fest, lowItems })
    }
  }
  return alerts
}
