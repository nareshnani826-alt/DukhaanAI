-- ============================================================
-- DukaanAI — Chai shop (menu, raw materials, orders)
-- Run in Supabase → SQL Editor BEFORE deploying the updated API.
-- ============================================================

create table if not exists chai_materials (
  id             uuid primary key default uuid_generate_v4(),
  vendor_id      uuid not null references vendors(id) on delete cascade,
  name           text not null,
  unit           text not null default 'pc',        -- L, kg, pc …
  stock          numeric(14,4) not null default 0,
  min_stock      numeric(14,4) not null default 0,
  cost_per_unit  numeric(12,2) not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists chai_materials_vendor on chai_materials(vendor_id);

create table if not exists chai_menu (
  id          uuid primary key default uuid_generate_v4(),
  vendor_id   uuid not null references vendors(id) on delete cascade,
  name        text not null,
  category    text not null default 'Tea',
  price       numeric(10,2) not null default 0,
  emoji       text,
  sort        int not null default 0,
  active      boolean not null default true,
  recipe      jsonb not null default '[]',           -- [[material_id, qty per cup], …]
  created_at  timestamptz not null default now()
);
create index if not exists chai_menu_vendor on chai_menu(vendor_id);

create table if not exists chai_orders (
  id             uuid primary key default uuid_generate_v4(),
  vendor_id      uuid not null references vendors(id) on delete cascade,
  order_no       int not null,
  kind           text not null default 'counter' check (kind in ('counter','table')),
  label          text,                               -- table / token name
  items          jsonb not null default '[]',        -- [{menu_id, name, price, qty}]
  total          numeric(12,2) not null default 0,
  status         text not null default 'open' check (status in ('open','paid','cancelled')),
  payment_mode   text check (payment_mode in ('cash','upi','credit')),
  customer_id    uuid references udhar_customers(id) on delete set null,
  customer_name  text,
  created_at     timestamptz not null default now(),
  paid_at        timestamptz
);
create index if not exists chai_orders_vendor_created on chai_orders(vendor_id, created_at desc);

-- API uses the service_role key; RLS keeps the anon key out
alter table chai_materials enable row level security;
alter table chai_menu      enable row level security;
alter table chai_orders    enable row level security;
