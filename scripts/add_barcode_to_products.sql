-- Run in Supabase SQL editor
-- Adds barcode column to products for barcode-based scanning

alter table products add column if not exists barcode text;
create index if not exists idx_products_barcode on products(vendor_id, barcode) where barcode is not null;
