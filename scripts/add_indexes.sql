-- ============================================================
-- DukaanAI — Performance Indexes
-- Run in Supabase → SQL Editor
-- Safe to re-run: all use CREATE INDEX IF NOT EXISTS
-- ============================================================

-- Enable trigram extension for fast ilike ('%text%') searches
create extension if not exists pg_trgm;


-- ────────────────────────────────────────────────────────────
-- PRODUCTS
-- Every page that loads inventory filters by vendor_id + is_active.
-- The name column is sorted and searched on nearly every request.
-- ────────────────────────────────────────────────────────────

-- Core list query: .eq("vendor_id").eq("is_active").order("name")
create index if not exists idx_products_vendor_active_name
    on products (vendor_id, is_active, name);

-- SKU uniqueness check on every product create: .eq("vendor_id").eq("sku")
create index if not exists idx_products_vendor_sku
    on products (vendor_id, sku)
    where sku is not null;

-- Fast ilike search on name: Products.list({ search: "..." })
create index if not exists idx_products_name_trgm
    on products using gin (lower(name) gin_trgm_ops);

-- Expiry + insights queries filter by vendor_id + is_active + stock > 0
create index if not exists idx_products_vendor_active_stock
    on products (vendor_id, is_active, stock);


-- ────────────────────────────────────────────────────────────
-- SALES
-- The most write-heavy table and the most read-heavy for insights.
-- Every dashboard, insights, and day-close query filters
-- vendor_id + sold_at range.
-- ────────────────────────────────────────────────────────────

-- All time-range queries: .eq("vendor_id").gte("sold_at", ...).order("sold_at", desc=True)
create index if not exists idx_sales_vendor_sold_at
    on sales (vendor_id, sold_at desc);

-- Product-specific sales queries from insights:
-- .eq("vendor_id").eq("product_id").gte("sold_at", ...)
create index if not exists idx_sales_vendor_product_sold_at
    on sales (vendor_id, product_id, sold_at desc);

-- Payment mode filtering
create index if not exists idx_sales_vendor_payment_mode
    on sales (vendor_id, payment_mode);


-- ────────────────────────────────────────────────────────────
-- INVOICES
-- Loaded on History page and Customers page — ordered by created_at.
-- Status-based filtering for paid/unpaid queries.
-- ────────────────────────────────────────────────────────────

-- List + history: .eq("vendor_id").order("created_at", desc=True)
create index if not exists idx_invoices_vendor_created_at
    on invoices (vendor_id, created_at desc);

-- Status-filtered queries: .eq("vendor_id").eq("status").gte("created_at", ...)
create index if not exists idx_invoices_vendor_status_created_at
    on invoices (vendor_id, status, created_at desc);

-- Customer phone lookup on invoice creation
create index if not exists idx_invoices_customer_phone
    on invoices (vendor_id, customer_phone)
    where customer_phone is not null;


-- ────────────────────────────────────────────────────────────
-- DAY_SESSIONS
-- Every day-ops load queries by vendor_id + date (exact match).
-- The "pending" endpoint also queries by status.
-- ────────────────────────────────────────────────────────────

-- Primary lookup: .eq("vendor_id").eq("date")
create index if not exists idx_day_sessions_vendor_date
    on day_sessions (vendor_id, date);

-- Unclosed-session check: .eq("vendor_id").eq("status").neq("date", today)
create index if not exists idx_day_sessions_vendor_status
    on day_sessions (vendor_id, status);

-- History list: .eq("vendor_id").eq("status","closed").order("date", desc=True)
create index if not exists idx_day_sessions_vendor_status_date
    on day_sessions (vendor_id, status, date desc);


-- ────────────────────────────────────────────────────────────
-- BANGLE_PRODUCTS
-- Every bangle page load. Filtered by vendor_id + is_active,
-- ordered by created_at desc.
-- ────────────────────────────────────────────────────────────

create index if not exists idx_bangle_products_vendor_active_created
    on bangle_products (vendor_id, is_active, created_at desc);

-- Single-product lookups: .eq("id").eq("vendor_id")
create index if not exists idx_bangle_products_id_vendor
    on bangle_products (id, vendor_id);


-- ────────────────────────────────────────────────────────────
-- BANGLE_VARIANTS
-- CRITICAL: The N+1 fix does a single batch query using IN on
-- product_ids — this index makes that fast. Also used for
-- vendor-level variant scans in reorder, insights, billing.
-- ────────────────────────────────────────────────────────────

-- Batch fetch (post N+1 fix): .in_("product_id", ids).eq("is_active", True)
create index if not exists idx_bangle_variants_product_active
    on bangle_variants (product_id, is_active);

-- Vendor-level scans: .eq("vendor_id").eq("is_active")
create index if not exists idx_bangle_variants_vendor_active
    on bangle_variants (vendor_id, is_active);

-- Single variant lookup + stock update: .eq("id").eq("vendor_id")
create index if not exists idx_bangle_variants_id_vendor
    on bangle_variants (id, vendor_id);


-- ────────────────────────────────────────────────────────────
-- BANGLE_SALES
-- High-frequency writes (every billing transaction).
-- Nearly every bangle insight/report query filters
-- vendor_id + sale_date range.
-- ────────────────────────────────────────────────────────────

-- All date-range queries — most common pattern in insights:
-- .eq("vendor_id").gte("sale_date", ...).order("sale_date", desc=True)
create index if not exists idx_bangle_sales_vendor_sale_date
    on bangle_sales (vendor_id, sale_date desc);

-- Variant-specific history: .eq("variant_id")
create index if not exists idx_bangle_sales_variant_id
    on bangle_sales (variant_id);


-- ────────────────────────────────────────────────────────────
-- UDHAR_CUSTOMERS
-- Filtered by vendor_id on every load, ordered by total_due.
-- Name/phone ilike searches for customer lookup.
-- ────────────────────────────────────────────────────────────

-- List ordered by outstanding balance:
-- .eq("vendor_id").order("total_due", desc=True)
create index if not exists idx_udhar_customers_vendor_total_due
    on udhar_customers (vendor_id, total_due desc);

-- Name search: .eq("vendor_id").ilike("name", "%...%")
create index if not exists idx_udhar_customers_name_trgm
    on udhar_customers using gin (lower(name) gin_trgm_ops);

-- Phone search: .eq("vendor_id").ilike("phone", "%...%")
create index if not exists idx_udhar_customers_phone_trgm
    on udhar_customers using gin (lower(phone) gin_trgm_ops)
    where phone is not null;


-- ────────────────────────────────────────────────────────────
-- UDHAR_TRANSACTIONS
-- Loaded per-customer for transaction history.
-- ────────────────────────────────────────────────────────────

-- Per-customer history: .eq("customer_id").eq("vendor_id").order("created_at", desc=True)
create index if not exists idx_udhar_transactions_customer_vendor_created
    on udhar_transactions (customer_id, vendor_id, created_at desc);


-- ────────────────────────────────────────────────────────────
-- CUSTOMERS (CRM table)
-- Ordered by total_spent. Phone/name ilike searches.
-- ────────────────────────────────────────────────────────────

-- List: .eq("vendor_id").order("total_spent", desc=True)
create index if not exists idx_customers_vendor_total_spent
    on customers (vendor_id, total_spent desc);

-- Phone exact lookup (deduplication on invoice creation):
-- .eq("vendor_id").eq("phone", ...)
create index if not exists idx_customers_vendor_phone
    on customers (vendor_id, phone)
    where phone is not null;

-- Name + phone ilike search
create index if not exists idx_customers_name_trgm
    on customers using gin (lower(name) gin_trgm_ops);

create index if not exists idx_customers_phone_trgm
    on customers using gin (lower(phone) gin_trgm_ops)
    where phone is not null;


-- ────────────────────────────────────────────────────────────
-- WASTAGE_RECORDS
-- Loaded for reporting and insights, filtered by vendor_id + date.
-- ────────────────────────────────────────────────────────────

-- List + insights: .eq("vendor_id").order("created_at", desc=True)
create index if not exists idx_wastage_vendor_created_at
    on wastage_records (vendor_id, created_at desc);

-- Insights filter by reason: .eq("vendor_id").eq("reason").gte("created_at", ...)
create index if not exists idx_wastage_vendor_reason_created_at
    on wastage_records (vendor_id, reason, created_at desc);
