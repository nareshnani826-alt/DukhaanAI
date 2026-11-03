// ── Chai shop data: menu, raw materials, orders ───────────
// Same split as db.js: Pro/Wholesale shops use the server (/chai/*), everyone
// else keeps the data on this phone under "dk_chai".
import { api, isCloud, Udhar } from "./db"

const LS = "dk_chai"

function read() {
  try { return JSON.parse(localStorage.getItem(LS)) || {} } catch { return {} }
}
function write(d) { localStorage.setItem(LS, JSON.stringify(d)) }
const newId = p => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
const round2 = n => Math.round(n * 100) / 100
// The shop's calendar day (YYYY-MM-DD) for a timestamp, in the phone's time zone
export const localDay = (d = new Date()) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`
}

// ── Starter menu + materials (first open) ─────────────────
// Recipe quantities are per cup / piece, in the material's unit.
export const STARTER_MATERIALS = [
  { key:"milk",   name:"Milk",          unit:"L",  stock:0, min_stock:5,   cost_per_unit:60 },
  { key:"sugar",  name:"Sugar",         unit:"kg", stock:0, min_stock:2,   cost_per_unit:44 },
  { key:"tea",    name:"Tea powder",    unit:"kg", stock:0, min_stock:0.5, cost_per_unit:360 },
  { key:"coffee", name:"Coffee powder", unit:"kg", stock:0, min_stock:0.25,cost_per_unit:600 },
  { key:"ginger", name:"Ginger",        unit:"kg", stock:0, min_stock:0.25,cost_per_unit:120 },
  { key:"cups",   name:"Paper cups",    unit:"pc", stock:0, min_stock:100, cost_per_unit:0.6 },
]
const TEA = [["milk",0.08],["sugar",0.012],["tea",0.004],["cups",1]]
export const STARTER_MENU = [
  { name:"Tea",          category:"Tea",    price:12, emoji:"☕", recipe:TEA },
  { name:"Ginger Tea",   category:"Tea",    price:15, emoji:"🫚", recipe:[...TEA, ["ginger",0.003]] },
  { name:"Elaichi Tea",  category:"Tea",    price:15, emoji:"🍵", recipe:TEA },
  { name:"Lemon Tea",    category:"Tea",    price:15, emoji:"🍋", recipe:[["sugar",0.012],["tea",0.003],["cups",1]] },
  { name:"Black Tea",    category:"Tea",    price:10, emoji:"🫖", recipe:[["sugar",0.012],["tea",0.004],["cups",1]] },
  { name:"Coffee",       category:"Coffee", price:20, emoji:"☕", recipe:[["milk",0.1],["sugar",0.012],["coffee",0.005],["cups",1]] },
  { name:"Boost",        category:"Coffee", price:25, emoji:"🥛", recipe:[["milk",0.12],["cups",1]] },
  { name:"Badam Milk",   category:"Coffee", price:25, emoji:"🥛", recipe:[["milk",0.15],["sugar",0.015],["cups",1]] },
  { name:"Osmania Biscuit", category:"Snacks", price:5,  emoji:"🍪", recipe:[] },
  { name:"Samosa",       category:"Snacks", price:15, emoji:"🥟", recipe:[] },
  { name:"Bun",          category:"Snacks", price:15, emoji:"🍞", recipe:[] },
  { name:"Puff",         category:"Snacks", price:25, emoji:"🥐", recipe:[] },
  { name:"Mirchi Bajji", category:"Snacks", price:20, emoji:"🌶️", recipe:[] },
  { name:"Water Bottle", category:"Other",  price:20, emoji:"💧", recipe:[] },
]
export const CATEGORIES = ["Tea", "Coffee", "Snacks", "Other"]

// Order totals and the raw material it uses — shared by the phone and the server rules
export function orderTotal(items) {
  return round2((items || []).reduce((s, it) => s + (+it.price || 0) * (+it.qty || 0), 0))
}
export function materialsUsed(items, menu) {
  const byId = Object.fromEntries((menu || []).map(m => [m.id, m]))
  const used = {}
  for (const it of items || []) {
    for (const [mid, q] of byId[it.menu_id]?.recipe || []) {
      used[mid] = round4((used[mid] || 0) + q * (+it.qty || 0))
    }
  }
  return used
}
const round4 = n => Math.round(n * 10000) / 10000

function seedLocal(d) {
  if (d.menu) return d
  const mats = STARTER_MATERIALS.map(m => ({ ...m, id: newId("cm") }))
  const idOf = Object.fromEntries(mats.map(m => [m.key, m.id]))
  d.materials = mats.map(({ key, ...m }) => m) // eslint-disable-line no-unused-vars
  d.menu = STARTER_MENU.map((m, i) => ({
    ...m, id: newId("ci"), sort: i, active: true,
    recipe: m.recipe.map(([k, q]) => [idOf[k], q]),
  }))
  d.orders = d.orders || []
  d.next_no = d.next_no || 1
  write(d)
  return d
}
const local = () => seedLocal(read())

// ── Menu ──────────────────────────────────────────────────
export const ChaiMenu = {
  async list() {
    if (isCloud()) return api.get("/chai/menu")
    return local().menu.filter(m => m.active !== false).sort((a, b) => a.sort - b.sort)
  },
  async save(item) {
    if (isCloud()) return item.id ? api.patch("/chai/menu/" + item.id, item) : api.post("/chai/menu", item)
    const d = local()
    if (item.id) {
      d.menu = d.menu.map(m => m.id === item.id ? { ...m, ...item } : m)
    } else {
      item = { ...item, id: newId("ci"), sort: d.menu.length, active: true, recipe: item.recipe || [] }
      d.menu.push(item)
    }
    write(d)
    return d.menu.find(m => m.id === item.id)
  },
  async remove(id) {
    if (isCloud()) return api.del("/chai/menu/" + id)
    const d = local()
    d.menu = d.menu.map(m => m.id === id ? { ...m, active: false } : m)
    write(d)
  },
}

// ── Raw materials ─────────────────────────────────────────
export const ChaiMaterials = {
  async list() {
    if (isCloud()) return api.get("/chai/materials")
    return local().materials
  },
  async save(mat) {
    if (isCloud()) return mat.id ? api.patch("/chai/materials/" + mat.id, mat) : api.post("/chai/materials", mat)
    const d = local()
    if (mat.id) d.materials = d.materials.map(m => m.id === mat.id ? { ...m, ...mat } : m)
    else { mat = { stock: 0, min_stock: 0, cost_per_unit: 0, ...mat, id: newId("cm") }; d.materials.push(mat) }
    write(d)
    return d.materials.find(m => m.id === mat.id)
  },
  // Add a delivery (qty > 0) or correct the count (qty < 0)
  async addStock(id, qty) {
    if (isCloud()) return api.post(`/chai/materials/${id}/stock`, { qty })
    const d = local()
    d.materials = d.materials.map(m => m.id === id ? { ...m, stock: Math.max(0, round4((+m.stock || 0) + qty)) } : m)
    write(d)
    return d.materials.find(m => m.id === id)
  },
  async remove(id) {
    if (isCloud()) return api.del("/chai/materials/" + id)
    const d = local()
    d.materials = d.materials.filter(m => m.id !== id)
    d.menu = d.menu.map(m => ({ ...m, recipe: (m.recipe || []).filter(([mid]) => mid !== id) }))
    write(d)
  },
}

// ── Orders ────────────────────────────────────────────────
// kind: "counter" (paid straight away) or "table" (kept open under a table / token label)
export const ChaiOrders = {
  async list({ from, to, status } = {}) {
    if (isCloud()) {
      const q = new URLSearchParams()
      if (from) q.set("from", from); if (to) q.set("to", to); if (status) q.set("status", status)
      return api.get("/chai/orders?" + q)
    }
    return local().orders.filter(o =>
      (!status || o.status === status) &&
      (!from || localDay(o.created_at) >= from) &&
      (!to || localDay(o.created_at) <= to)
    ).sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  // Open a table / token order, or update its items
  async saveOpen({ id, label, items }) {
    if (isCloud()) return id ? api.patch(`/chai/orders/${id}`, { items, label }) : api.post("/chai/orders", { kind:"table", label, items })
    const d = local()
    if (id) {
      d.orders = d.orders.map(o => o.id === id ? { ...o, items, label: label ?? o.label, total: orderTotal(items) } : o)
    } else {
      d.orders.push({ id: newId("co"), order_no: d.next_no++, kind:"table", label, items,
        total: orderTotal(items), status:"open", created_at: new Date().toISOString() })
    }
    write(d)
    return id ? d.orders.find(o => o.id === id) : d.orders[d.orders.length - 1]
  },

  // Take payment: a counter sale (no id) or an open table order (id). Credit goes to the regular's khata.
  async pay({ id, items, label, payment_mode, customer }) {
    let order
    if (isCloud()) {
      order = await api.post("/chai/orders/pay", { id: id || null, items, label: label || null,
        payment_mode, customer_id: customer?.id || null, customer_name: customer?.name || null })
    } else {
      const d = local()
      const now = new Date().toISOString()
      const fields = { items, total: orderTotal(items), status:"paid", payment_mode, paid_at: now,
        customer_id: customer?.id || null, customer_name: customer?.name || null }
      if (id) {
        d.orders = d.orders.map(o => o.id === id ? { ...o, ...fields } : o)
        order = d.orders.find(o => o.id === id)
      } else {
        order = { id: newId("co"), order_no: d.next_no++, kind:"counter", label: label || null,
          created_at: now, ...fields }
        d.orders.push(order)
      }
      const used = materialsUsed(items, d.menu)
      d.materials = d.materials.map(m => used[m.id] ? { ...m, stock: Math.max(0, round4((+m.stock || 0) - used[m.id])) } : m)
      write(d)
    }
    if (payment_mode === "credit" && customer?.id) {
      await Udhar.addCredit({ customerId: customer.id, amount: order.total, note: `Chai bill #${order.order_no}` })
    }
    return order
  },

  async cancel(id) {
    if (isCloud()) return api.post(`/chai/orders/${id}/cancel`)
    const d = local()
    const o = d.orders.find(x => x.id === id)
    if (!o) return
    // A paid bill gives its raw material back
    if (o.status === "paid") {
      const used = materialsUsed(o.items, d.menu)
      d.materials = d.materials.map(m => used[m.id] ? { ...m, stock: round4((+m.stock || 0) + used[m.id]) } : m)
    }
    o.status = "cancelled"
    write(d)
  },
}

// ── Report for a date range (YYYY-MM-DD, inclusive) ───────
export function buildReport(orders, menu, materials) {
  const paid = orders.filter(o => o.status === "paid")
  const byMode = { cash: 0, upi: 0, credit: 0 }
  const byItem = {}
  let cups = 0
  const catOf = Object.fromEntries((menu || []).map(m => [m.id, m.category]))
  for (const o of paid) {
    byMode[o.payment_mode] = round2((byMode[o.payment_mode] || 0) + (+o.total || 0))
    for (const it of o.items || []) {
      const e = byItem[it.name] || (byItem[it.name] = { name: it.name, qty: 0, amount: 0 })
      e.qty += +it.qty || 0
      e.amount = round2(e.amount + (+it.price || 0) * (+it.qty || 0))
      if (["Tea", "Coffee"].includes(catOf[it.menu_id])) cups += +it.qty || 0
    }
  }
  const used = {}
  for (const o of paid) for (const [k, v] of Object.entries(materialsUsed(o.items, menu))) used[k] = round4((used[k] || 0) + v)
  const matById = Object.fromEntries((materials || []).map(m => [m.id, m]))
  const cost = round2(Object.entries(used).reduce((s, [k, q]) => s + q * (+matById[k]?.cost_per_unit || 0), 0))
  const total = round2(paid.reduce((s, o) => s + (+o.total || 0), 0))
  return {
    total, bills: paid.length, cups, byMode, cost,
    items: Object.values(byItem).sort((a, b) => b.qty - a.qty),
    used: Object.entries(used).map(([id, qty]) => ({ id, qty, name: matById[id]?.name || "?", unit: matById[id]?.unit || "" })),
  }
}

// ── WhatsApp bill ─────────────────────────────────────────
export function chaiBillText(order, storeName) {
  const when = new Date(order.paid_at || order.created_at)
  const lines = (order.items || []).map(it => `${it.name} × ${it.qty} = ₹${round2(it.price * it.qty)}`).join("\n")
  const paid = order.payment_mode === "credit" ? "Added to your khata" : order.payment_mode === "upi" ? "Paid by UPI" : "Paid in cash"
  return `☕ *${storeName || "Chai Shop"}*
Bill #${order.order_no}${order.label ? ` · ${order.label}` : ""}
${when.toLocaleDateString("en-IN")} ${when.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}

${lines}

*Total: ₹${order.total}*
${paid}

Thank you! 🙏`
}

// Opens WhatsApp with the bill typed in; with no number the shopkeeper picks the chat
export function sendOnWhatsApp(phone, text) {
  const num = String(phone || "").replace(/\D/g, "").slice(-10)
  window.open(`https://wa.me/${num.length === 10 ? "91" + num : ""}?text=${encodeURIComponent(text)}`, "_blank")
}

// ── Regulars' usual order ─────────────────────────────────
// From khata bills: each regular's most frequent order (same items and quantities).
export function regularsUsual(orders) {
  const by = {}
  for (const o of orders) {
    if (o.status !== "paid" || !o.customer_id || !(o.items || []).length) continue
    const r = by[o.customer_id] || (by[o.customer_id] = { customer: { id: o.customer_id, name: o.customer_name || "?" }, count: 0, sigs: {} })
    r.count++
    const items = o.items.map(({ menu_id, name, price, qty }) => ({ menu_id, name, price, qty }))
    const sig = items.map(i => `${i.menu_id}:${i.qty}`).sort().join("|")
    const e = r.sigs[sig] || (r.sigs[sig] = { n: 0, items })
    e.n++
  }
  return Object.values(by)
    .map(r => ({ customer: r.customer, count: r.count, items: Object.values(r.sigs).sort((a, b) => b.n - a.n)[0].items }))
    .sort((a, b) => b.count - a.count)
}

// ── Tomorrow's buying list ────────────────────────────────
// Raw material used on the same weekday in the last 4 weeks (or the daily average when there
// is no such day yet), plus 10% spare, minus what is in stock now.
export function buyingList(orders, menu, materials, forDate) {
  const day = new Date(forDate)
  const usedOn = {}
  for (const o of orders) {
    if (o.status !== "paid") continue
    const d = localDay(o.created_at)
    const u = usedOn[d] || (usedOn[d] = {})
    for (const [k, v] of Object.entries(materialsUsed(o.items, menu))) u[k] = (u[k] || 0) + v
  }
  const days = Object.keys(usedOn)
  const same = days.filter(d => new Date(d + "T12:00:00").getDay() === day.getDay())
  const basis = same.length ? same : days
  if (!basis.length) return { basis: 0, sameWeekday: false, items: [] }
  const items = (materials || []).map(m => {
    const avg = basis.reduce((s, d) => s + (usedOn[d][m.id] || 0), 0) / basis.length
    const need = round4(avg * 1.1)
    return { id: m.id, name: m.name, unit: m.unit, need, stock: +m.stock || 0, buy: Math.max(0, round4(need - (+m.stock || 0))) }
  }).filter(x => x.need > 0)
  return { basis: basis.length, sameWeekday: same.length > 0, items }
}
