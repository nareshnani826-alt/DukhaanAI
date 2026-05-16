// ─────────────────────────────────────────────────────────
// sync/dataStore.js  —  THE SYNC LAYER
//
// This is the heart of the dual-mode system.
// Every part of the UI calls THIS — never localStorage or
// the API directly. This layer decides which to use.
//
//   Free plan  →  localStorage  (offline, instant, free)
//   Pro plan   →  FastAPI + Supabase  (cloud, synced)
//
// The UI code never needs to know which mode it's in.
// ─────────────────────────────────────────────────────────

import { api } from "../api/client.js";

// ── Local storage helpers ─────────────────────────────────

const LS_KEY = "dukaanai_data";

function localRead() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {
      products: [],
      sales: [],
      invoices: [],
      vendors: [],
      nextId: 1,
      nextInvNo: 1,
    };
  } catch { return { products: [], sales: [], invoices: [], vendors: [], nextId: 1, nextInvNo: 1 }; }
}

function localWrite(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function localId(data) {
  const id = `local-${data.nextId++}`;
  localWrite(data);
  return id;
}

// ── Mode check ────────────────────────────────────────────

function isCloud() {
  return api.isLoggedIn() && api.isProPlan();
}

// ── PRODUCTS ──────────────────────────────────────────────

export const Products = {

  async list(filters = {}) {
    if (isCloud()) {
      const params = new URLSearchParams();
      if (filters.category)  params.set("category", filters.category);
      if (filters.search)    params.set("search", filters.search);
      if (filters.low_stock) params.set("low_stock", "true");
      const qs = params.toString();
      return api.get(`/products${qs ? "?" + qs : ""}`);
    }
    // Local
    let { products } = localRead();
    products = products.filter(p => p.is_active !== false);
    if (filters.category) products = products.filter(p => p.category === filters.category);
    if (filters.search)   products = products.filter(p =>
      p.name.toLowerCase().includes(filters.search.toLowerCase())
    );
    if (filters.low_stock) products = products.filter(p => p.stock < p.min_stock);
    return products;
  },

  async get(id) {
    if (isCloud()) return api.get(`/products/${id}`);
    const { products } = localRead();
    return products.find(p => p.id === id) || null;
  },

  async create(product) {
    if (isCloud()) return api.post("/products", product);
    const data = localRead();
    const newProduct = {
      ...product,
      id: localId(data),
      vendor_id: "local",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.products.push(newProduct);
    localWrite(data);
    return newProduct;
  },

  async update(id, updates) {
    if (isCloud()) return api.patch(`/products/${id}`, updates);
    const data = localRead();
    const idx = data.products.findIndex(p => p.id === id);
    if (idx === -1) throw new Error("Product not found");
    data.products[idx] = { ...data.products[idx], ...updates, updated_at: new Date().toISOString() };
    localWrite(data);
    return data.products[idx];
  },

  async delete(id) {
    if (isCloud()) return api.delete(`/products/${id}`);
    const data = localRead();
    const idx = data.products.findIndex(p => p.id === id);
    if (idx !== -1) { data.products[idx].is_active = false; localWrite(data); }
    return { message: "Product removed" };
  },

  async adjustStock(id, adjustment) {
    if (isCloud()) return api.post(`/products/${id}/adjust-stock?adjustment=${adjustment}`);
    const data = localRead();
    const idx = data.products.findIndex(p => p.id === id);
    if (idx === -1) throw new Error("Product not found");
    const newStock = data.products[idx].stock + adjustment;
    if (newStock < 0) throw new Error("Insufficient stock");
    data.products[idx].stock = newStock;
    data.products[idx].updated_at = new Date().toISOString();
    localWrite(data);
    return data.products[idx];
  },

  async lowStock() {
    if (isCloud()) return api.get("/products/low-stock");
    const { products } = localRead();
    return products
      .filter(p => p.is_active !== false && p.stock < p.min_stock)
      .sort((a, b) => a.stock - b.stock);
  },

  async categories() {
    if (isCloud()) return api.get("/products/categories");
    const { products } = localRead();
    const cats = [...new Set(products.filter(p => p.category).map(p => p.category))].sort();
    return { categories: cats };
  },
};

// ── SALES ─────────────────────────────────────────────────

export const Sales = {

  async record({ product_id, qty, customer = "Walk-in", payment_mode = "Cash" }) {
    if (isCloud()) return api.post("/sales", { product_id, qty, customer, payment_mode });

    const data = localRead();
    const product = data.products.find(p => p.id === product_id);
    if (!product) throw new Error("Product not found");
    if (product.stock < qty) throw new Error(`Insufficient stock. Available: ${product.stock}`);

    const total = parseFloat((product.mrp * qty).toFixed(2));
    const now = new Date();
    const sale = {
      id: localId(data),
      vendor_id: "local",
      product_id,
      product_name: product.name,
      qty,
      unit_price: product.mrp,
      total,
      customer,
      payment_mode,
      sold_at: now.toISOString(),
    };

    // Deduct stock
    product.stock -= qty;
    product.updated_at = now.toISOString();
    data.sales.push(sale);
    localWrite(data);
    return sale;
  },

  async list({ days = 30, limit = 100 } = {}) {
    if (isCloud()) return api.get(`/sales?days=${days}&limit=${limit}`);
    const { sales } = localRead();
    const since = new Date(Date.now() - days * 86400000);
    return sales
      .filter(s => new Date(s.sold_at) >= since)
      .sort((a, b) => new Date(b.sold_at) - new Date(a.sold_at))
      .slice(0, limit);
  },

  async today() {
    if (isCloud()) return api.get("/sales/today");
    const { sales } = localRead();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySales = sales.filter(s => new Date(s.sold_at) >= todayStart);
    return {
      sales: todaySales.sort((a, b) => new Date(b.sold_at) - new Date(a.sold_at)),
      total: parseFloat(todaySales.reduce((sum, s) => sum + s.total, 0).toFixed(2)),
      count: todaySales.length,
    };
  },

  async summary({ days = 30 } = {}) {
    if (isCloud()) return api.get(`/sales/summary?days=${days}`);
    const { sales } = localRead();
    const since = new Date(Date.now() - days * 86400000);
    const filtered = sales.filter(s => new Date(s.sold_at) >= since);
    const totalRevenue = parseFloat(filtered.reduce((sum, s) => sum + s.total, 0).toFixed(2));
    const totalUnits = filtered.reduce((sum, s) => sum + s.qty, 0);

    const productSales = {};
    filtered.forEach(s => {
      if (!productSales[s.product_name]) productSales[s.product_name] = { units: 0, revenue: 0 };
      productSales[s.product_name].units += s.qty;
      productSales[s.product_name].revenue += s.total;
    });
    const topProducts = Object.entries(productSales)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);

    return {
      period_days: days,
      total_revenue: totalRevenue,
      total_units: totalUnits,
      transaction_count: filtered.length,
      avg_transaction: filtered.length ? parseFloat((totalRevenue / filtered.length).toFixed(2)) : 0,
      top_products: topProducts,
    };
  },
};

// ── INVOICES ──────────────────────────────────────────────

export const Invoices = {

  async generate({ customer_name, customer_gstin, payment_mode = "Cash", items }) {
    if (isCloud()) return api.post("/invoices", { customer_name, customer_gstin, payment_mode, items });

    const data = localRead();
    let subtotal = 0, taxTotal = 0;
    const lineItems = items.map(item => {
      const itemSub = parseFloat((item.unit_price * item.qty).toFixed(2));
      const itemTax = parseFloat((itemSub * item.gst_percent / 100).toFixed(2));
      subtotal += itemSub;
      taxTotal += itemTax;
      return { ...item, subtotal: itemSub, tax: itemTax, total: parseFloat((itemSub + itemTax).toFixed(2)) };
    });

    subtotal  = parseFloat(subtotal.toFixed(2));
    taxTotal  = parseFloat(taxTotal.toFixed(2));
    const cgst = parseFloat((taxTotal / 2).toFixed(2));
    const sgst = parseFloat((taxTotal / 2).toFixed(2));
    const total = parseFloat((subtotal + taxTotal).toFixed(2));
    const invNo = `INV-${String(data.nextInvNo++).padStart(4, "0")}`;

    const invoice = {
      id: localId(data),
      vendor_id: "local",
      invoice_no: invNo,
      customer_name,
      customer_gstin: customer_gstin || null,
      payment_mode,
      subtotal,
      cgst,
      sgst,
      total,
      items: lineItems,
      status: "paid",
      pdf_url: null,
      created_at: new Date().toISOString(),
    };

    data.invoices.push(invoice);
    localWrite(data);
    return invoice;
  },

  async list({ limit = 50 } = {}) {
    if (isCloud()) return api.get(`/invoices?limit=${limit}`);
    const { invoices } = localRead();
    return invoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
  },

  async get(id) {
    if (isCloud()) return api.get(`/invoices/${id}`);
    const { invoices } = localRead();
    return invoices.find(inv => inv.id === id) || null;
  },

  async gstSummary(month, year) {
    if (isCloud()) return api.get(`/invoices/summary/gst?month=${month}&year=${year}`);
    const { invoices } = localRead();
    const filtered = invoices.filter(inv => {
      const d = new Date(inv.created_at);
      return d.getMonth() + 1 === month && d.getFullYear() === year && inv.status === "paid";
    });
    const taxableSales = parseFloat(filtered.reduce((s, i) => s + i.subtotal, 0).toFixed(2));
    const cgst = parseFloat(filtered.reduce((s, i) => s + i.cgst, 0).toFixed(2));
    const sgst = parseFloat(filtered.reduce((s, i) => s + i.sgst, 0).toFixed(2));
    return {
      period: `${year}-${String(month).padStart(2, "0")}`,
      invoice_count: filtered.length,
      taxable_sales: taxableSales,
      cgst_collected: cgst,
      sgst_collected: sgst,
      total_gst: parseFloat((cgst + sgst).toFixed(2)),
      gross_revenue: parseFloat((taxableSales + cgst + sgst).toFixed(2)),
    };
  },
};

// ── SYNC STATUS ───────────────────────────────────────────

export const SyncStatus = {
  getMode() { return isCloud() ? "cloud" : "local"; },
  isCloud,
  isLocal: () => !isCloud(),
};
