-- ============================================================
-- DukaanAI — Low Stock RPC Function
-- Run in Supabase → SQL Editor BEFORE deploying the updated API.
-- Eliminates the Python-side full-table-fetch for low-stock queries.
-- ============================================================

create or replace function get_low_stock_products(p_vendor_id uuid)
returns table (
  id           uuid,
  vendor_id    uuid,
  name         text,
  sku          text,
  category     text,
  unit         text,
  stock        integer,
  min_stock    integer,
  mrp          numeric,
  cost_price   numeric,
  gst_percent  integer,
  is_active    boolean,
  created_at   timestamptz,
  updated_at   timestamptz
)
language sql
stable        -- tells Postgres this is a pure read, enables caching
parallel safe -- safe to run in parallel query plans
as $$
  select
    id, vendor_id, name, sku, category, unit,
    stock, min_stock, mrp, cost_price, gst_percent,
    is_active, created_at, updated_at
  from products
  where vendor_id   = p_vendor_id
    and is_active   = true
    and stock       < min_stock
  order by stock asc;
$$;
