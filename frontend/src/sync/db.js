// ── API Client ────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"
const LS   = "dukaanai_data"
const TOK  = "dk_access"
const REF  = "dk_refresh"
const VND  = "dk_vendor"

export const getToken   = () => localStorage.getItem(TOK)
export const getRefresh = () => localStorage.getItem(REF)
export const setTokens  = (a, r) => { localStorage.setItem(TOK, a); localStorage.setItem(REF, r) }
export const clearAuth  = () => [TOK, REF, VND].forEach(k => localStorage.removeItem(k))
export const getVendor  = () => { try { return JSON.parse(localStorage.getItem(VND)) } catch { return null } }
export const setVendor  = (v) => localStorage.setItem(VND, JSON.stringify(v))
export const getPlan    = () => getVendor()?.plan || "free"
export const isCloud    = () => !!getToken() && ["pro","wholesale"].includes(getPlan())

async function tryRefresh() {
  const r = getRefresh(); if (!r) return false
  try {
    const d = await call("POST", "/auth/refresh", { refresh_token: r }, false)
    setTokens(d.access_token, d.refresh_token); return true
  } catch { return false }
}

export async function call(method, path, body = null, retry = true) {
  const headers = { "Content-Type": "application/json" }
  const token = getToken()
  if (token) headers["Authorization"] = "Bearer " + token
  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  if (res.status === 401 && retry) {
    const ok = await tryRefresh()
    if (ok) return call(method, path, body, false)
    clearAuth(); window.dispatchEvent(new Event("dk:logout"))
    throw new Error("Session expired")
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(e.detail || "HTTP " + res.status)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get:   (p)    => call("GET",    p),
  post:  (p, b) => call("POST",   p, b),
  patch: (p, b) => call("PATCH",  p, b),
  del:   (p)    => call("DELETE", p),
}

// ── Local helpers ─────────────────────────────────────────
function localRead() {
  try { return JSON.parse(localStorage.getItem(LS)) || emptyDb() }
  catch { return emptyDb() }
}
function emptyDb() { return { products:[], sales:[], invoices:[], nextId:1, nextInvNo:1 } }
function localWrite(d) { localStorage.setItem(LS, JSON.stringify(d)) }
function lid(d) { const id = "local-" + d.nextId++; localWrite(d); return id }

// ── Products ──────────────────────────────────────────────
export const Products = {
  async list(f = {}) {
    if (isCloud()) {
      const q = new URLSearchParams()
      if (f.category)  q.set("category",  f.category)
      if (f.search)    q.set("search",     f.search)
      if (f.low_stock) q.set("low_stock",  "true")
      return api.get("/products" + (q.toString() ? "?" + q : ""))
    }
    let p = localRead().products.filter(x => x.is_active !== false)
    if (f.category)  p = p.filter(x => x.category === f.category)
    if (f.search)    p = p.filter(x => x.name.toLowerCase().includes(f.search.toLowerCase()))
    if (f.low_stock) p = p.filter(x => x.stock < x.min_stock)
    return p
  },
  async create(product) {
    if (isCloud()) return api.post("/products", product)
    const d = localRead()
    const p = { ...product, id: lid(d), vendor_id:"local", is_active:true, created_at:new Date().toISOString(), updated_at:new Date().toISOString() }
    d.products.push(p); localWrite(d); return p
  },
  async update(id, updates) {
    if (isCloud()) return api.patch("/products/" + id, updates)
    const d = localRead(); const i = d.products.findIndex(p => p.id === id)
    if (i < 0) throw new Error("Not found")
    d.products[i] = { ...d.products[i], ...updates, updated_at: new Date().toISOString() }
    localWrite(d); return d.products[i]
  },
  async delete(id) {
    if (isCloud()) return api.del("/products/" + id)
    const d = localRead(); const i = d.products.findIndex(p => p.id === id)
    if (i >= 0) { d.products[i].is_active = false; localWrite(d) }
  },
  async lowStock() {
    if (isCloud()) return api.get("/products/low-stock")
    return localRead().products.filter(p => p.is_active !== false && p.stock < p.min_stock).sort((a,b) => a.stock - b.stock)
  },
}

// ── Sales ─────────────────────────────────────────────────
export const Sales = {
  async record({ product_id, qty, customer = "Walk-in", payment_mode = "Cash" }) {
    if (isCloud()) return api.post("/sales", { product_id, qty, customer, payment_mode })
    const d = localRead()
    const prod = d.products.find(p => p.id === product_id)
    if (!prod) throw new Error("Product not found")
    if (prod.stock < qty) throw new Error("Insufficient stock. Available: " + prod.stock)
    const total = Math.round(prod.mrp * qty * 100) / 100
    const sale = { id: lid(d), vendor_id:"local", product_id, product_name:prod.name, qty, unit_price:prod.mrp, total, customer, payment_mode, sold_at:new Date().toISOString() }
    prod.stock -= qty; d.sales.push(sale); localWrite(d); return sale
  },
  async today() {
    if (isCloud()) return api.get("/sales/today")
    const d = localRead(); const start = new Date(); start.setHours(0,0,0,0)
    const s = d.sales.filter(x => new Date(x.sold_at) >= start)
    return { sales: s.sort((a,b) => new Date(b.sold_at)-new Date(a.sold_at)), total: Math.round(s.reduce((sum,x) => sum+x.total,0)*100)/100, count: s.length }
  },
  async list({ days=30, limit=100 } = {}) {
    if (isCloud()) return api.get(`/sales?days=${days}&limit=${limit}`)
    const since = new Date(Date.now() - days*86400000)
    return localRead().sales.filter(s => new Date(s.sold_at) >= since).sort((a,b) => new Date(b.sold_at)-new Date(a.sold_at)).slice(0,limit)
  },
  async summary({ days=30 } = {}) {
    if (isCloud()) return api.get("/sales/summary?days=" + days)
    const since = new Date(Date.now() - days*86400000)
    const sales = localRead().sales.filter(s => new Date(s.sold_at) >= since)
    const rev = Math.round(sales.reduce((s,x) => s+x.total,0)*100)/100
    const byProd = {}
    sales.forEach(s => { byProd[s.product_name] = byProd[s.product_name] || {units:0,revenue:0}; byProd[s.product_name].units += s.qty; byProd[s.product_name].revenue += s.total })
    return { total_revenue:rev, total_units:sales.reduce((s,x) => s+x.qty,0), transaction_count:sales.length, top_products:Object.entries(byProd).map(([name,v]) => ({name,...v})).sort((a,b) => b.units-a.units).slice(0,8) }
  },
}

// ── Invoices ──────────────────────────────────────────────
export const Invoices = {
  async generate({ customer_name, customer_gstin, payment_mode="Cash", items }) {
    if (isCloud()) return api.post("/invoices", { customer_name, customer_gstin, payment_mode, items })
    const d = localRead(); let sub=0, tax=0
    const lineItems = items.map(item => {
      const s = Math.round(item.unit_price*item.qty*100)/100
      const t = Math.round(s*item.gst_percent/100*100)/100
      sub+=s; tax+=t
      return { ...item, subtotal:s, tax:t, total:Math.round((s+t)*100)/100 }
    })
    sub=Math.round(sub*100)/100; tax=Math.round(tax*100)/100
    const cgst=Math.round(tax/2*100)/100, sgst=Math.round(tax/2*100)/100
    const invNo = "INV-" + String(d.nextInvNo++).padStart(4,"0")
    const inv = { id:lid(d), vendor_id:"local", invoice_no:invNo, customer_name, customer_gstin:customer_gstin||null, payment_mode, subtotal:sub, cgst, sgst, total:Math.round((sub+tax)*100)/100, items:lineItems, status:"paid", created_at:new Date().toISOString() }
    d.invoices.push(inv); localWrite(d); return inv
  },
  async list() {
    if (isCloud()) return api.get("/invoices?limit=50")
    return localRead().invoices.sort((a,b) => new Date(b.created_at)-new Date(a.created_at))
  },
  async gstSummary(month, year) {
    if (isCloud()) return api.get(`/invoices/summary/gst?month=${month}&year=${year}`)
    const invs = localRead().invoices.filter(inv => { const d=new Date(inv.created_at); return d.getMonth()+1===month && d.getFullYear()===year && inv.status==="paid" })
    const sub=Math.round(invs.reduce((s,i) => s+i.subtotal,0)*100)/100
    const cgst=Math.round(invs.reduce((s,i) => s+i.cgst,0)*100)/100
    const sgst=Math.round(invs.reduce((s,i) => s+i.sgst,0)*100)/100
    return { period:`${year}-${String(month).padStart(2,"0")}`, invoice_count:invs.length, taxable_sales:sub, cgst_collected:cgst, sgst_collected:sgst, total_gst:Math.round((cgst+sgst)*100)/100, gross_revenue:Math.round((sub+cgst+sgst)*100)/100 }
  },
}

// ── Customers ─────────────────────────────────────────────
export const Customers = {
  async list({ search } = {}) {
    if (isCloud()) {
      const q = search ? `?search=${encodeURIComponent(search)}` : ""
      return api.get("/customers" + q)
    }
    let { customers = [] } = localRead()
    if (search) customers = customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search)
    )
    return customers.sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
  },

  async upsert({ name, phone, gstin, amount }) {
    // Called automatically every time an invoice is generated
    if (isCloud()) return api.post("/customers/upsert", { name, phone, gstin, amount })
    const d = localRead()
    if (!d.customers) d.customers = []
    const key = phone || name
    const idx = d.customers.findIndex(c =>
      (phone && c.phone === phone) || (!phone && c.name === name)
    )
    const now = new Date().toISOString()
    if (idx >= 0) {
      d.customers[idx] = {
        ...d.customers[idx],
        name,
        phone: phone || d.customers[idx].phone,
        gstin: gstin || d.customers[idx].gstin,
        total_spent: Math.round(((d.customers[idx].total_spent || 0) + amount) * 100) / 100,
        visit_count: (d.customers[idx].visit_count || 0) + 1,
        last_visited: now,
        updated_at:   now,
      }
    } else {
      d.customers.push({
        id: "cust-" + Date.now(),
        vendor_id: "local",
        name, phone: phone || null, gstin: gstin || null,
        total_spent: amount, visit_count: 1,
        last_visited: now, created_at: now, updated_at: now,
      })
    }
    localWrite(d)
  },

  async get(id) {
    if (isCloud()) return api.get("/customers/" + id)
    const { customers = [] } = localRead()
    return customers.find(c => c.id === id) || null
  },

  async invoices(id) {
    // Get all invoices for a customer by name/phone
    if (isCloud()) return api.get("/customers/" + id + "/invoices")
    const { invoices = [], customers = [] } = localRead()
    const cust = customers.find(c => c.id === id)
    if (!cust) return []
    return invoices.filter(inv =>
      inv.customer_name === cust.name ||
      (cust.phone && inv.customer_phone === cust.phone)
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  },

  async delete(id) {
    if (isCloud()) return api.del("/customers/" + id)
    const d = localRead()
    d.customers = (d.customers || []).filter(c => c.id !== id)
    localWrite(d)
  },
}

// Patch: add update method to Customers (for manual edit)
const _CustomersUpdate = async (id, updates) => {
  if (isCloud()) return api.patch("/customers/" + id, updates)
  const d = localRead()
  const idx = (d.customers||[]).findIndex(c => c.id === id)
  if (idx < 0) throw new Error("Customer not found")
  d.customers[idx] = { ...d.customers[idx], ...updates, updated_at: new Date().toISOString() }
  localWrite(d)
  return d.customers[idx]
}
Customers.update = _CustomersUpdate

// ── Udhar Khata ───────────────────────────────────────────
export const Udhar = {

  // ── Customers ─────────────────────────────────────────
  async listCustomers({ search } = {}) {
    if (isCloud()) {
      const q = search ? `?search=${encodeURIComponent(search)}` : ""
      return api.get("/udhar/customers" + q)
    }
    const d = localRead()
    let list = d.udhar_customers || []
    if (search) list = list.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone||"").includes(search)
    )
    return list.sort((a,b) => (b.total_due||0) - (a.total_due||0))
  },

  async addCustomer({ name, phone, address }) {
    if (isCloud()) return api.post("/udhar/customers", { name, phone, address })
    const d = localRead()
    if (!d.udhar_customers) d.udhar_customers = []
    if (!d.udhar_txns)      d.udhar_txns      = []
    const c = {
      id: "uc-" + Date.now(), vendor_id:"local",
      name, phone: phone||null, address: address||null,
      total_due: 0, last_txn_at: null,
      created_at: new Date().toISOString()
    }
    d.udhar_customers.push(c); localWrite(d); return c
  },

  async updateCustomer(id, { name, phone, address }) {
    if (isCloud()) return api.patch("/udhar/customers/" + id, { name, phone, address })
    const d = localRead()
    const idx = (d.udhar_customers||[]).findIndex(c => c.id === id)
    if (idx < 0) throw new Error("Customer not found")
    d.udhar_customers[idx] = { ...d.udhar_customers[idx], name, phone: phone||null, address: address||null }
    localWrite(d)
    return d.udhar_customers[idx]
  },

  async deleteCustomer(id) {
    if (isCloud()) return api.del("/udhar/customers/" + id)
    const d = localRead()
    d.udhar_customers = (d.udhar_customers||[]).filter(c => c.id !== id)
    d.udhar_txns      = (d.udhar_txns||[]).filter(t => t.customer_id !== id)
    localWrite(d)
  },

  // ── Transactions ──────────────────────────────────────
  async transactions(customerId) {
    if (isCloud()) return api.get("/udhar/customers/" + customerId + "/transactions")
    const d = localRead()
    return (d.udhar_txns||[])
      .filter(t => t.customer_id === customerId)
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
  },

  async addCredit({ customerId, amount, note, invoiceId }) {
    if (isCloud()) return api.post("/udhar/transactions", {
      customer_id: customerId, type:"credit", amount, note, invoice_id: invoiceId||null
    })
    return _localTxn({ customerId, type:"credit", amount, note })
  },

  async addPayment({ customerId, amount, note }) {
    if (isCloud()) return api.post("/udhar/transactions", {
      customer_id: customerId, type:"payment", amount, note
    })
    return _localTxn({ customerId, type:"payment", amount, note })
  },

  async summary() {
    if (isCloud()) return api.get("/udhar/summary")
    const d    = localRead()
    const list = d.udhar_customers || []
    const total_due     = list.reduce((s,c) => s + (c.total_due||0), 0)
    const overdue_count = list.filter(c => c.total_due > 0).length
    return { total_due, overdue_count, customer_count: list.length }
  }
}

function _localTxn({ customerId, type, amount, note }) {
  const d = localRead()
  if (!d.udhar_customers) d.udhar_customers = []
  if (!d.udhar_txns)      d.udhar_txns      = []
  const ci = d.udhar_customers.findIndex(c => c.id === customerId)
  if (ci < 0) throw new Error("Customer not found")
  const delta = type === "credit" ? +amount : -amount
  d.udhar_customers[ci].total_due   = Math.max(0, Math.round(((d.udhar_customers[ci].total_due||0) + delta)*100)/100)
  d.udhar_customers[ci].last_txn_at = new Date().toISOString()
  const txn = {
    id: "ut-" + Date.now(), vendor_id:"local", customer_id: customerId,
    type, amount: +amount, note: note||null,
    created_at: new Date().toISOString()
  }
  d.udhar_txns.push(txn); localWrite(d); return txn
}

// ── Wastage Recording ─────────────────────────────────────
export const Wastage = {
  async list() {
    if (isCloud()) return api.get("/wastage/")
    const d = localRead()
    return (d.wastage_records || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
  },

  async record({ productId, qty, reason, note }) {
    if (isCloud()) return api.post("/wastage/", { product_id:productId, qty, reason, note })
    const d = localRead()
    if (!d.wastage_records) d.wastage_records = []
    const prod = (d.products||[]).find(p => p.id === productId)
    if (!prod) throw new Error("Product not found")
    const newStock = Math.max(0, (prod.stock||0) - qty)
    const lossVal  = Math.round(qty * (prod.cost_price||0) * 100) / 100
    // Update stock
    const pi = d.products.findIndex(p => p.id === productId)
    if (pi >= 0) d.products[pi].stock = newStock
    // Record
    const rec = {
      id: "wr-" + Date.now(), vendor_id:"local",
      product_id: productId, product_name: prod.name,
      qty, unit: prod.unit||"piece", reason, note: note||null,
      loss_value: lossVal, stock_before: prod.stock||0, stock_after: newStock,
      created_at: new Date().toISOString()
    }
    d.wastage_records.push(rec)
    localWrite(d)
    return rec
  },

  async summary() {
    if (isCloud()) return api.get("/wastage/summary")
    const d       = localRead()
    const records = d.wastage_records || []
    const month   = new Date().getMonth()
    const total_loss  = records.reduce((s,r) => s + (r.loss_value||0), 0)
    const this_month  = records
      .filter(r => new Date(r.created_at).getMonth() === month)
      .reduce((s,r) => s + (r.loss_value||0), 0)
    const by_reason = {}
    records.forEach(r => {
      by_reason[r.reason] = (by_reason[r.reason]||0) + (r.loss_value||0)
    })
    return { total_loss: Math.round(total_loss*100)/100, total_items: records.length,
             by_reason, this_month: Math.round(this_month*100)/100 }
  }
}

// ── Community Catalog ─────────────────────────────────────
export const CommunityCatalog = {
  // Search community products
  async search(query) {
    if (isCloud()) {
      return api.get("/community-catalog/search?q=" + encodeURIComponent(query))
    }
    return [] // community only works when logged in
  },

  // Add product to community when vendor adds it manually
  async contribute(product) {
    if (!isCloud()) return
    try {
      await api.post("/community-catalog/contribute", {
        name:     product.name,
        category: product.category || "Other",
        unit:     product.unit     || "pc",
        mrp:      product.mrp      || 0,
        cost:     product.cost_price || 0,
        gst:      product.gst_percent || 0,
      })
    } catch {} // silent fail - community is optional
  },

  // Get trending/popular community products
  async trending() {
    if (isCloud()) return api.get("/community-catalog/trending")
    return []
  }
}
