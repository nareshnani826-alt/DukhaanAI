-- ============================================================
-- DukaanAI — Fractional stock (loose items sold by weight)
-- Run in Supabase → SQL Editor.
--
-- Selling 1 kg from a "CHANA 50 KG" bag takes 0.02 bag off stock.
-- With integer columns Postgres rejected that update, so the bill
-- was saved but stock was never reduced and no sale was recorded.
-- ============================================================

alter table products
  alter column stock     type numeric(12,4) using stock::numeric,
  alter column min_stock type numeric(12,4) using min_stock::numeric;

alter table sales
  alter column qty type numeric(12,4) using qty::numeric;

-- Return type changes, so the function has to be dropped first
drop function if exists get_low_stock_products(uuid);

create function get_low_stock_products(p_vendor_id uuid)
returns table (
  id           uuid,
  vendor_id    uuid,
  name         text,
  sku          text,
  category     text,
  unit         text,
  stock        numeric,
  min_stock    numeric,
  mrp          numeric,
  cost_price   numeric,
  gst_percent  integer,
  is_active    boolean,
  created_at   timestamptz,
  updated_at   timestamptz
)
language sql
stable
parallel safe
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
