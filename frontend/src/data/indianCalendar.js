// ── Indian Festival & Seasonal Calendar ──────────────────
// Live dates: https://date.nager.at/api/v3/PublicHolidays/{year}/IN (free, no API key)
// Static data below is used only as offline fallback.

// ── Enrichment: products / tips / boost per festival keyword ──
const FESTIVAL_ENRICHMENT = [
  { keywords:["sankranti","pongal"],
    region:"All India", boost:60,
    products:["Sesame seeds","Jaggery","Rice","Oil","Ghee","Turmeric"],
    tip:"Stock til and jaggery 2 weeks before — prices rise sharply" },
  { keywords:["republic day"],
    region:"All India", boost:20,
    products:["Cold drinks","Snacks","Biscuits","Namkeen"],
    tip:"Holiday spike in snacks and beverages" },
  { keywords:["valentine"],
    region:"Urban", boost:30,
    products:["Chocolates","Biscuits","Cold drinks"],
    tip:"Chocolates and packaged sweets see good demand" },
  { keywords:["shivratri"],
    region:"All India", boost:40,
    products:["Milk","Fruits","Dry fruits","Bael leaves"],
    tip:"Shivratri fasting — milk and fruits see spike" },
  { keywords:["holi"],
    region:"North India", boost:70,
    products:["Milk","Curd","Sugar","Dry fruits","Oil"],
    tip:"Milk and dairy demand peaks on Holi — stock 3x normal" },
  { keywords:["ram navami","ram navmi"],
    region:"All India", boost:30,
    products:["Fruits","Milk","Panchamrit ingredients","Sugar"],
    tip:"Fasting festival — fruits and milk in demand" },
  { keywords:["ramadan","ramzan","eid-ul-fitr","eid ul-fitr","id-ul-fitr","al-fitr"],
    region:"Muslim areas", boost:80,
    products:["Dates","Vermicelli","Maida","Oil","Sugar","Chickpeas","Dry fruits"],
    tip:"Stock dates and sewai before Ramzan — demand 4x normal" },
  { keywords:["ugadi","tamil new year","baisakhi","vishu","bihu","navreh"],
    region:"South & North India", boost:50,
    products:["Rice","Jaggery","Mango","Coconut","Oil","Sugar"],
    tip:"Regional new years — raw mango and jaggery essential" },
  { keywords:["good friday"],
    region:"Christian areas", boost:20,
    products:["Bread","Cake","Biscuits"],
    tip:"Stock baked goods" },
  { keywords:["easter"],
    region:"Christian areas / Urban", boost:25,
    products:["Cake","Bread","Chocolates","Eggs"],
    tip:"Easter — baked goods and sweets in demand" },
  { keywords:["buddha purnima","vesak"],
    region:"All India", boost:20,
    products:["Fruits","Sweets","Incense"],
    tip:"Mild demand spike in sweets and fruits" },
  { keywords:["independence day"],
    region:"All India", boost:25,
    products:["Snacks","Cold drinks","Ice cream","Namkeen"],
    tip:"Holiday — stock snacks" },
  { keywords:["raksha bandhan","rakhi"],
    region:"North India", boost:60,
    products:["Sweets","Dry fruits","Chocolates","Ghee","Sugar"],
    tip:"Sweets and dry fruits — gift packs sell well" },
  { keywords:["eid ul-adha","eid-ul-adha","id-ul-adha","al-adha","bakrid","bakr"],
    region:"Muslim areas", boost:60,
    products:["Spices","Oil","Rice","Dry fruits"],
    tip:"Bakrid — spices and dry fruits demand peaks" },
  { keywords:["janmashtami","krishna"],
    region:"All India", boost:70,
    products:["Milk","Curd","Butter","Ghee","Sugar","Dry fruits"],
    tip:"Dairy demand peaks sharply on Janmashtami" },
  { keywords:["ganesh","chaturthi"],
    region:"Maharashtra/Telangana", boost:80,
    products:["Modak flour","Sugar","Coconut","Jaggery","Ghee"],
    tip:"10-day festival — coconut and jaggery demand very high" },
  { keywords:["navratri"],
    region:"Gujarat/North India", boost:70,
    products:["Sabudana","Kuttu flour","Sendha namak","Fruits","Milk","Curd"],
    tip:"Navratri fasting — sabudana and kuttu flour essential, stock 3 weeks early" },
  { keywords:["dussehra","vijaya dashami","vijayadashami"],
    region:"All India", boost:40,
    products:["Sweets","Dry fruits","Snacks","Cold drinks"],
    tip:"Festival week — premium sweets and dry fruits" },
  { keywords:["diwali","deepavali","dhanteras","bhai dooj"],
    region:"All India", boost:100,
    products:["Dry fruits","Ghee","Sugar","Maida","Oil","Sweets","Chocolates","Candles"],
    tip:"BIGGEST festival — stock everything 1 month early. Prices rise 20-30%." },
  { keywords:["milad","mawlid","prophet","muharram"],
    region:"Muslim areas", boost:30,
    products:["Dates","Sweets","Dry fruits"],
    tip:"Islamic occasion — sweets and dates in demand" },
  { keywords:["guru nanak","gurpurab","guru gobind"],
    region:"Punjab/North India", boost:35,
    products:["Flour","Ghee","Sugar","Milk","Dal"],
    tip:"Langar essentials — bulk staples see demand" },
  { keywords:["christmas"],
    region:"Christian areas / Urban", boost:40,
    products:["Cake","Bread","Chocolates","Cold drinks","Biscuits"],
    tip:"Cake and baked goods demand peaks" },
  { keywords:["new year"],
    region:"Urban", boost:25,
    products:["Cold drinks","Snacks","Biscuits","Chocolates"],
    tip:"New Year celebrations — snacks and beverages spike" },
]

function enrichFestival(apiHoliday) {
  const search = (apiHoliday.name + " " + (apiHoliday.localName || "")).toLowerCase()
  const match  = FESTIVAL_ENRICHMENT.find(e => e.keywords.some(k => search.includes(k)))
  if (!match) return null
  const date = new Date(apiHoliday.date)
  return {
    name:     apiHoliday.localName || apiHoliday.name,
    region:   match.region,
    products: match.products,
    boost:    match.boost,
    tip:      match.tip,
    date,
    month:    date.getMonth() + 1,
    days:     [date.getDate()],
  }
}

// ── Static fallback (used when API is unreachable) ────────
export const FESTIVALS = [
  { month:1,  days:[14,15], name:"Makar Sankranti / Pongal", region:"All India",
    products:["Sesame seeds","Jaggery","Rice","Oil","Ghee","Turmeric"],
    boost:60, tip:"Stock til and jaggery 2 weeks before — prices rise sharply" },
  { month:1,  days:[26],    name:"Republic Day", region:"All India",
    products:["Cold drinks","Snacks","Biscuits","Namkeen"], boost:20,
    tip:"Holiday spike in snacks and beverages" },
  { month:2,  days:[14],    name:"Valentine's Day", region:"Urban",
    products:["Chocolates","Biscuits","Cold drinks"], boost:30,
    tip:"Chocolates and packaged sweets see good demand" },
  { month:3,  days:[2,3],   name:"Holi", region:"North India",
    products:["Milk","Curd","Sugar","Dry fruits","Oil"],
    boost:70, tip:"Milk and dairy demand peaks on Holi — stock 3x normal" },
  { month:4,  days:[14],    name:"Ugadi / Tamil New Year / Baisakhi", region:"South & North India",
    products:["Rice","Jaggery","Mango","Coconut","Oil","Sugar"],
    boost:50, tip:"South Indian new year — raw mango and jaggery essential" },
  { month:8,  days:[15],    name:"Independence Day", region:"All India",
    products:["Snacks","Cold drinks","Ice cream","Namkeen"], boost:25,
    tip:"Holiday — stock snacks" },
  { month:8,  days:[19,20,21,22,23], name:"Raksha Bandhan", region:"North India",
    products:["Sweets","Dry fruits","Chocolates","Ghee","Sugar"],
    boost:60, tip:"Sweets and dry fruits — gift packs sell well" },
  { month:8,  days:[23,24,25,26],    name:"Janmashtami", region:"All India",
    products:["Milk","Curd","Butter","Ghee","Sugar","Dry fruits"],
    boost:70, tip:"Dairy demand peaks sharply on Janmashtami" },
  { month:9,  days:[1,2,3,4,5,6,7,8,9,10], name:"Ganesh Chaturthi", region:"Maharashtra/Telangana",
    products:["Modak flour","Sugar","Coconut","Jaggery","Ghee"],
    boost:80, tip:"10-day festival — coconut and jaggery demand very high" },
  { month:10, days:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20], name:"Navratri",
    region:"Gujarat/North India",
    products:["Sabudana","Kuttu flour","Sendha namak","Fruits","Milk","Curd"],
    boost:70, tip:"Navratri fasting — sabudana and kuttu flour essential, stock 3 weeks early" },
  { month:10, days:[20,21,22,23,24,25,26,27,28,29,30,31], name:"Dussehra week", region:"All India",
    products:["Sweets","Dry fruits","Snacks","Cold drinks"], boost:40,
    tip:"Festival week — premium sweets and dry fruits" },
  { month:10, days:[29],    name:"Diwali", region:"All India",
    products:["Dry fruits","Ghee","Sugar","Maida","Oil","Sweets","Chocolates","Candles"],
    boost:100, tip:"BIGGEST festival — stock everything 1 month early. Prices rise 20-30%." },
  { month:12, days:[25],    name:"Christmas", region:"Christian areas / Urban",
    products:["Cake","Bread","Chocolates","Cold drinks","Biscuits"], boost:40,
    tip:"Cake and baked goods demand peaks" },
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

// ── Static fallback (synchronous) ────────────────────────
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

// ── Live festival dates from Nager.Date (free, no API key) ─
const CACHE_KEY = "nager_in_holidays"
const CACHE_TTL = 12 * 60 * 60 * 1000 // 12 hours

async function fetchNagerHolidays(year) {
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error("nager API error")
  return res.json()
}

async function getLiveHolidays() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const { ts, data } = JSON.parse(cached)
      if (Date.now() - ts < CACHE_TTL) return data
    }
  } catch {}

  const now = new Date()
  const thisYear = now.getFullYear()
  const daysLeftInYear = Math.ceil((new Date(thisYear, 11, 31) - now) / 86400000)

  const years = daysLeftInYear <= 45
    ? [thisYear, thisYear + 1]
    : [thisYear]

  const results = await Promise.all(years.map(y => fetchNagerHolidays(y)))
  const data = results.flat()

  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })) } catch {}
  return data
}

export async function getUpcomingFestivalsAsync(days = 45) {
  let apiHolidays
  try {
    apiHolidays = await getLiveHolidays()
  } catch {
    return getUpcomingFestivals(days) // offline fallback
  }

  const now = new Date()
  const upcoming = []
  for (const h of apiHolidays) {
    const festDate = new Date(h.date)
    const diff     = Math.ceil((festDate - now) / 86400000)
    if (diff < 0 || diff > days) continue
    const enriched = enrichFestival(h)
    if (enriched) upcoming.push({ ...enriched, daysAway: diff, date: festDate })
  }
  return upcoming.sort((a, b) => a.daysAway - b.daysAway)
}

export function getCurrentSeason() {
  const month = new Date().getMonth() + 1
  return SEASONS.find(s => s.months.includes(month)) || SEASONS[0]
}

// Works with either static or live festival arrays
export function computeUrgentAlerts(festivals, inventory = []) {
  const alerts = []
  for (const fest of festivals.filter(f => f.daysAway <= 14)) {
    const lowItems = fest.products.filter(prod => {
      const inv = inventory.find(p =>
        p.name.toLowerCase().includes(prod.toLowerCase().split(" ")[0]) ||
        prod.toLowerCase().includes(p.name.toLowerCase().split(" ")[0])
      )
      return !inv || inv.stock < (inv.min_stock || 10)
    })
    if (lowItems.length > 0) alerts.push({ ...fest, lowItems })
  }
  return alerts
}

// Legacy sync export kept for any other callers
export function getUrgentAlerts(inventory = []) {
  return computeUrgentAlerts(getUpcomingFestivals(14), inventory)
}
