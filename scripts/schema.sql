-- ============================================================
-- DukaanAI — Supabase PostgreSQL Schema
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- VENDORS  (one row per shop owner)
-- ────────────────────────────────────────────────────────────
create table vendors (
  id            uuid primary key default uuid_generate_v4(),
  email         text unique not null,
  password_hash text not null,
  store_name    text not null,
  gstin         text,
  phone         text,
  address       text,
  plan          text not null default 'free'
                  check (plan in ('free','pro','wholesale')),
  plan_expires_at timestamptz,
  is_active     boolean not null default true,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- PRODUCTS
-- ────────────────────────────────────────────────────────────
create table products (
  id          uuid primary key default uuid_generate_v4(),
  vendor_id   uuid not null references vendors(id) on delete cascade,
  name        text not null,
  sku         text,
  category    text,
  stock       integer not null default 0,
  min_stock   integer not null default 10,
  mrp         numeric(10,2) not null default 0,
  cost_price  numeric(10,2) not null default 0,
  gst_percent integer not null default 5
                check (gst_percent in (0,5,12,18,28)),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(vendor_id, sku)
);

-- ────────────────────────────────────────────────────────────
-- SALES
-- ────────────────────────────────────────────────────────────
create table sales (
  id          uuid primary key default uuid_generate_v4(),
  vendor_id   uuid not null references vendors(id) on delete cascade,
  product_id  uuid not null references products(id),
  product_name text not null,             -- snapshot at time of sale
  qty         integer not null,
  unit_price  numeric(10,2) not null,
  total       numeric(10,2) not null,
  customer    text default 'Walk-in',
  payment_mode text default 'Cash'
                check (payment_mode in ('Cash','UPI','Credit','Cheque')),
  sold_at     timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- INVOICES
-- ────────────────────────────────────────────────────────────
create table invoices (
  id            uuid primary key default uuid_generate_v4(),
  vendor_id     uuid not null references vendors(id) on delete cascade,
  invoice_no    text not null,
  customer_name text not null,
  customer_gstin text,
  payment_mode  text default 'Cash',
  subtotal      numeric(10,2) not null,
  cgst          numeric(10,2) not null,
  sgst          numeric(10,2) not null,
  total         numeric(10,2) not null,
  items         jsonb not null,           -- array of line items
  status        text default 'paid'
                  check (status in ('paid','pending','cancelled')),
  pdf_url       text,
  created_at    timestamptz not null default now(),
  unique(vendor_id, invoice_no)
);

-- ────────────────────────────────────────────────────────────
-- VENDORS (ledger / suppliers)
-- ────────────────────────────────────────────────────────────
create table vendor_contacts (
  id           uuid primary key default uuid_generate_v4(),
  vendor_id    uuid not null references vendors(id) on delete cascade,
  name         text not null,
  phone        text,
  email        text,
  gstin        text,
  address      text,
  outstanding  numeric(10,2) default 0,
  created_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- SUBSCRIPTIONS  (Razorpay subscription records)
-- ────────────────────────────────────────────────────────────
create table subscriptions (
  id                    uuid primary key default uuid_generate_v4(),
  vendor_id             uuid not null references vendors(id) on delete cascade,
  razorpay_sub_id       text unique,
  razorpay_plan_id      text,
  plan                  text not null check (plan in ('pro','wholesale')),
  billing_cycle         text not null check (billing_cycle in ('monthly','yearly')),
  amount                numeric(10,2) not null,
  status                text not null default 'created'
                          check (status in ('created','authenticated','active','paused','cancelled','expired')),
  current_start         timestamptz,
  current_end           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- PAYMENT EVENTS  (Razorpay webhook log)
-- ────────────────────────────────────────────────────────────
create table payment_events (
  id              uuid primary key default uuid_generate_v4(),
  vendor_id       uuid references vendors(id),
  event_type      text not null,
  razorpay_sub_id text,
  payload         jsonb,
  received_at     timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- REFRESH TOKENS
-- ────────────────────────────────────────────────────────────
create table refresh_tokens (
  id          uuid primary key default uuid_generate_v4(),
  vendor_id   uuid not null references vendors(id) on delete cascade,
  token_hash  text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ────────────────────────────────────────────────────────────
create index idx_products_vendor    on products(vendor_id);
create index idx_products_category  on products(vendor_id, category);
create index idx_products_low_stock on products(vendor_id) where stock < min_stock;
create index idx_sales_vendor       on sales(vendor_id);
create index idx_sales_date         on sales(vendor_id, sold_at desc);
create index idx_invoices_vendor    on invoices(vendor_id);
create index idx_subscriptions_vendor on subscriptions(vendor_id);

-- ────────────────────────────────────────────────────────────
-- auto-update updated_at on vendors and products
-- ────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_vendors_updated_at
  before update on vendors
  for each row execute function set_updated_at();

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

create trigger trg_subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────────────────────
-- Row-Level Security (each vendor sees only their own data)
-- ────────────────────────────────────────────────────────────
alter table products          enable row level security;
alter table sales             enable row level security;
alter table invoices          enable row level security;
alter table vendor_contacts   enable row level security;
alter table subscriptions     enable row level security;

-- NOTE: Our API uses the service_role key to bypass RLS,
-- then enforces vendor isolation in application code (JWT vendor_id).
-- These policies add a second layer of protection.

create policy "vendor sees own products"
  on products for all
  using (vendor_id = current_setting('app.vendor_id', true)::uuid);

create policy "vendor sees own sales"
  on sales for all
  using (vendor_id = current_setting('app.vendor_id', true)::uuid);

create policy "vendor sees own invoices"
  on invoices for all
  using (vendor_id = current_setting('app.vendor_id', true)::uuid);
