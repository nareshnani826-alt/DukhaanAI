-- ============================================================
-- DukhaanAI — QR ordering (customers order from the shop's QR code)
-- Run once in Supabase → SQL Editor. Safe to run again.
-- ============================================================

-- Each shop gets a short public code for its QR link: dukhaanai.in/s/<shop_code>
alter table vendors add column if not exists shop_code     text;
alter table vendors add column if not exists online_orders boolean not null default false;
create unique index if not exists vendors_shop_code_key on vendors(shop_code) where shop_code is not null;

create table if not exists online_orders (
  id              uuid primary key default uuid_generate_v4(),
  vendor_id       uuid not null references vendors(id) on delete cascade,
  order_no        int  not null,
  shop_type       text not null default 'kirana',              -- kirana | chai
  mode            text not null default 'pickup'
                    check (mode in ('pickup', 'table')),
  table_label     text,                                         -- "5" when ordered from table 5's QR
  customer_name   text not null,
  customer_phone  text not null,
  note            text,
  items           jsonb not null default '[]',                  -- [{id, name, price, qty}] — priced by the server
  total           numeric(12,2) not null default 0,
  status          text not null default 'new'
                    check (status in ('new', 'accepted', 'ready', 'done', 'rejected', 'cancelled')),
  reject_reason   text,
  access_token    text not null,                                -- lets the customer's phone see its own order
  invoice_id      uuid,                                         -- kirana: the bill made from this order
  chai_order_id   uuid,                                         -- chai: the open table order it became
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists online_orders_vendor_status on online_orders(vendor_id, status, created_at desc);
create index if not exists online_orders_phone on online_orders(vendor_id, customer_phone, created_at desc);

-- Only the server (service role) reads and writes these rows
alter table online_orders enable row level security;
