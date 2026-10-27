-- ============================================================
-- DukaanAI — Per-shop daily AI limit
-- Run in Supabase → SQL Editor. Until it is run the API lets
-- AI calls through uncounted (it never blocks on a missing table).
-- ============================================================

create table if not exists ai_usage (
  vendor_id  uuid not null references vendors(id) on delete cascade,
  day        date not null,               -- India date, so the limit resets at IST midnight
  count      integer not null default 0,
  primary key (vendor_id, day)
);

alter table ai_usage enable row level security;

-- Adds one AI call for today and returns the new count (atomic, safe under parallel requests)
create or replace function bump_ai_usage(p_vendor_id uuid)
returns integer
language sql
as $$
  insert into ai_usage (vendor_id, day, count)
  values (p_vendor_id, (now() at time zone 'Asia/Kolkata')::date, 1)
  on conflict (vendor_id, day) do update set count = ai_usage.count + 1
  returning count;
$$;
