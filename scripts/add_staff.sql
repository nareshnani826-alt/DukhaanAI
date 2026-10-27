-- ============================================================
-- DukaanAI — Staff logins (username + PIN, manager / cashier)
-- Run in Supabase → SQL Editor BEFORE deploying the updated API.
-- ============================================================

create table if not exists staff (
  id          uuid primary key default uuid_generate_v4(),
  vendor_id   uuid not null references vendors(id) on delete cascade,
  username    text not null,            -- stored lowercase
  pin_hash    text not null,
  role        text not null check (role in ('manager','cashier')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (vendor_id, username)
);

-- API uses the service_role key; RLS keeps the anon key out
alter table staff enable row level security;

-- A staff sign-in keeps its role across token refreshes;
-- removing the staff member signs them out everywhere.
alter table refresh_tokens
  add column if not exists staff_id uuid references staff(id) on delete cascade;
