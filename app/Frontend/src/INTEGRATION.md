# Frontend Sync Layer — Integration Guide

## What was built

```
frontend/src/
├── app.js                 ← Main entry point, exposes window.DukaanAI
├── api/
│   ├── client.js          ← Base HTTP client (handles tokens, refresh)
│   └── auth.js            ← Register, login, logout calls
├── sync/
│   ├── dataStore.js       ← THE SYNC LAYER (local ↔ cloud router)
│   └── migrate.js         ← Uploads local data to cloud on upgrade
└── ui/
    └── auth.js            ← Login/Register modal UI
```

## How the sync layer works

Every data call goes through `dataStore.js`.
It checks if the vendor is logged in AND on Pro plan:
- **Free / not logged in** → reads/writes `localStorage`
- **Pro / Wholesale** → calls your FastAPI backend

The UI never knows which mode it's in.

---

## Step 1 — Add to your HTML file

Add this ONE line just before `</body>` in your existing `index.html`:

```html
<script type="module" src="src/app.js"></script>
```

Also add a sync badge somewhere in your header/topbar:

```html
<span id="sync-mode-badge" style="font-size:11px"></span>
```

---

## Step 2 — Replace data calls in your existing JS

### Products

```js
// BEFORE (localStorage)
const data = JSON.parse(localStorage.getItem('dukaanai'));
const products = data.products;

// AFTER (sync layer)
const products = await DukaanAI.Products.list();
const products = await DukaanAI.Products.list({ category: "Dairy" });
const products = await DukaanAI.Products.list({ search: "tata" });
const products = await DukaanAI.Products.list({ low_stock: true });
```

```js
// BEFORE
data.products.push({ ...newProduct });
localStorage.setItem('dukaanai', JSON.stringify(data));

// AFTER
await DukaanAI.Products.create({
  name: "Tata Salt 1kg",
  sku: "TS-001",
  category: "Staples",
  stock: 100,
  min_stock: 20,
  mrp: 28,
  cost_price: 22,
  gst_percent: 5,
});
```

```js
// BEFORE
data.products[idx] = { ...updates };
localStorage.setItem('dukaanai', JSON.stringify(data));

// AFTER
await DukaanAI.Products.update(productId, { stock: 50 });
```

```js
// Get low stock alerts
const alerts = await DukaanAI.Products.lowStock();
```

---

### Sales

```js
// BEFORE
DB.sales.push({ prod: product.name, qty, amount: ... });
product.stock -= qty;
localStorage.setItem(...);

// AFTER  (stock deducted automatically!)
await DukaanAI.Sales.record({
  product_id: "prod-uuid-or-local-id",
  qty: 5,
  customer: "Ravi Kirana",
  payment_mode: "UPI",
});
```

```js
// Sales history
const sales = await DukaanAI.Sales.list({ days: 30 });

// Today's sales
const today = await DukaanAI.Sales.today();
console.log(today.total, today.count);

// Summary for dashboard
const summary = await DukaanAI.Sales.summary({ days: 30 });
console.log(summary.total_revenue, summary.top_products);
```

---

### Invoices

```js
// Generate GST invoice
const invoice = await DukaanAI.Invoices.generate({
  customer_name: "Ravi Kirana Mart",
  customer_gstin: "29AABCU9603R1ZX",
  payment_mode: "Cash",
  items: [
    { name: "Tata Salt 1kg", qty: 10, unit_price: 28, gst_percent: 5 },
    { name: "Amul Butter 500g", qty: 5, unit_price: 285, gst_percent: 12 },
  ],
});
console.log(invoice.invoice_no, invoice.total);

// List invoices
const invoices = await DukaanAI.Invoices.list();

// GST monthly summary
const gst = await DukaanAI.Invoices.gstSummary(5, 2026);
console.log(gst.total_gst, gst.cgst_collected);
```

---

### Auth

```js
// Show login modal
DukaanAI.AuthUI.show("login");
DukaanAI.AuthUI.show("register");

// Check mode
DukaanAI.SyncStatus.getMode()   // "local" or "cloud"
DukaanAI.SyncStatus.isCloud()   // true/false

// Logout
await DukaanAI.authApi.logout();
```

---

## Step 3 — Add sync status to your sidebar

In your existing sidebar HTML, add:

```html
<div style="padding:8px 14px;border-top:0.5px solid #eee">
  <span id="sync-mode-badge" style="font-size:11px"></span>
</div>
```

This automatically shows:
- `● Local only — Login for cloud sync` (free, not logged in)
- `● Free plan — Upgrade to Pro` (logged in, free plan)
- `● Cloud sync ON — Sharma General Stores` (Pro plan)

---

## Step 4 — Test the full flow

1. Open your HTML app in browser
2. Use it normally — all data goes to localStorage (free mode)
3. Click "Login for cloud sync" in sidebar → register/login
4. If on free plan → still uses localStorage
5. Upgrade to Pro → data moves to cloud automatically

---

## Error handling

Always wrap in try/catch:

```js
try {
  await DukaanAI.Sales.record({ product_id, qty: 5 });
  showNotif("Sale recorded!");
} catch (e) {
  showNotif("Error: " + e.message);  // e.g. "Insufficient stock"
}
```
