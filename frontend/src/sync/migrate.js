// ─────────────────────────────────────────────────────────
// sync/migrate.js  —  Local → Cloud migration
//
// Called once when a free vendor upgrades to Pro.
// Uploads all their localStorage data to Supabase,
// then clears local storage.
// ─────────────────────────────────────────────────────────

import { api } from "../api/client.js";

const LS_KEY = "dukaanai_data";

export async function migrateLocalToCloud(onProgress) {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return { migrated: 0, errors: [] };

  const data = JSON.parse(raw);
  const errors = [];
  let migrated = 0;
  const idMap = {}; // old local id → new cloud id

  const report = (msg) => onProgress?.(msg);

  // 1. Migrate products first (sales reference them)
  report("Uploading products...");
  const activeProducts = (data.products || []).filter(p => p.is_active !== false);

  for (const p of activeProducts) {
    try {
      const created = await api.post("/products", {
        name: p.name,
        sku: p.sku || null,
        category: p.category || null,
        stock: p.stock,
        min_stock: p.min_stock,
        mrp: p.mrp,
        cost_price: p.cost_price,
        gst_percent: p.gst_percent,
      });
      idMap[p.id] = created.id;
      migrated++;
    } catch (e) {
      errors.push(`Product "${p.name}": ${e.message}`);
    }
  }
  report(`${migrated} products uploaded`);

  // 2. Migrate invoices
  report("Uploading invoices...");
  for (const inv of (data.invoices || [])) {
    try {
      await api.post("/invoices", {
        customer_name: inv.customer_name,
        customer_gstin: inv.customer_gstin || null,
        payment_mode: inv.payment_mode || "Cash",
        items: inv.items.map(item => ({
          name: item.name,
          qty: item.qty,
          unit_price: item.unit_price,
          gst_percent: item.gst_percent,
        })),
      });
      migrated++;
    } catch (e) {
      errors.push(`Invoice "${inv.invoice_no}": ${e.message}`);
    }
  }
  report(`Invoices uploaded`);

  // 3. Clear local data after successful migration
  if (errors.length === 0) {
    localStorage.removeItem(LS_KEY);
    report("Local data cleared — all data now in cloud!");
  } else {
    report(`Done with ${errors.length} errors — local data kept as backup`);
  }

  return { migrated, errors };
}

export function hasLocalData() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return false;
  const data = JSON.parse(raw);
  return (data.products?.length > 0) || (data.invoices?.length > 0);
}
