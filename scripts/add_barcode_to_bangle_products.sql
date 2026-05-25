-- Run in Supabase SQL editor
-- Adds barcode column to bangle_products

ALTER TABLE bangle_products ADD COLUMN IF NOT EXISTS barcode text;
CREATE INDEX IF NOT EXISTS idx_bangle_products_barcode ON bangle_products(barcode) WHERE barcode IS NOT NULL;
