-- DukaanAI — Performance Indexes
-- Run in Supabase → SQL Editor
-- These indexes cut dashboard load time significantly on growing datasets.

-- Sales table (kirana billing)
CREATE INDEX IF NOT EXISTS idx_sales_vendor_sold_at    ON sales (vendor_id, sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_vendor_product    ON sales (vendor_id, product_id);

-- Products table
CREATE INDEX IF NOT EXISTS idx_products_vendor_active  ON products (vendor_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_vendor_stock   ON products (vendor_id, stock, min_stock) WHERE is_active = true;

-- Invoices table
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_date    ON invoices (vendor_id, created_at DESC);

-- Bangle sales
CREATE INDEX IF NOT EXISTS idx_bangle_sales_vendor_date ON bangle_sales (vendor_id, sale_date DESC);

-- Bangle variants
CREATE INDEX IF NOT EXISTS idx_bangle_variants_vendor   ON bangle_variants (vendor_id, is_active);
CREATE INDEX IF NOT EXISTS idx_bangle_variants_product  ON bangle_variants (vendor_id, product_id) WHERE is_active = true;

-- Day sessions
CREATE INDEX IF NOT EXISTS idx_day_sessions_vendor_date ON day_sessions (vendor_id, date DESC);

-- Udhar
CREATE INDEX IF NOT EXISTS idx_udhar_customers_vendor   ON udhar_customers (vendor_id, total_due DESC);
CREATE INDEX IF NOT EXISTS idx_udhar_tx_customer        ON udhar_transactions (customer_id, created_at DESC);
