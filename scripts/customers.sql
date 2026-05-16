-- ── DukaanAI: Customer history table ─────────────────────
-- Run this in Supabase → SQL Editor

CREATE TABLE customers (
  id           uuid primary key default uuid_generate_v4(),
  vendor_id    uuid not null references vendors(id) on delete cascade,
  name         text not null,
  phone        text,
  gstin        text,
  address      text,
  notes        text,
  total_spent  numeric(12,2) not null default 0,
  visit_count  integer not null default 0,
  last_visited timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(vendor_id, phone)   -- one record per phone per vendor
);

-- Index for fast lookups
CREATE INDEX idx_customers_vendor    ON customers(vendor_id);
CREATE INDEX idx_customers_phone     ON customers(vendor_id, phone);
CREATE INDEX idx_customers_spent     ON customers(vendor_id, total_spent desc);

-- Auto update updated_at
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Disable RLS (we enforce isolation in API layer via JWT)
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
