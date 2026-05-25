-- Supplier tracking + product location/investment fields
-- Run in Supabase SQL editor after add_bangle_tables.sql

-- Suppliers master table
CREATE TABLE IF NOT EXISTS bangle_suppliers (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id   uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text,
  city        text,
  notes       text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bangle_suppliers_vendor ON bangle_suppliers(vendor_id);

-- Add supplier, tray location, investment value to products
ALTER TABLE bangle_products
  ADD COLUMN IF NOT EXISTS supplier_id    uuid REFERENCES bangle_suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tray_location  text,
  ADD COLUMN IF NOT EXISTS stock_fullness integer CHECK (stock_fullness BETWEEN 0 AND 100);

-- Allow nullable product/variant on sale items (Quick Items have no catalog entry)
-- The items column is jsonb so no schema change needed — just document:
-- Quick Item line has: custom_description, category, unit, unit_qty, unit_price, pieces, amount
-- variant_id and product_id will be absent / null for quick items
