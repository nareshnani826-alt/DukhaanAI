-- Run this in Supabase SQL editor to enable cross-device learning sync
-- Each vendor gets one row per pattern_type — upserted on every sync

create table if not exists vendor_learned_patterns (
  vendor_id    uuid        not null references vendors(id) on delete cascade,
  pattern_type text        not null,   -- 'patterns' | 'abbr' | 'rules' | 'corrections' | 'context'
  data         jsonb       not null default '{}',
  updated_at   timestamptz not null default now(),
  primary key (vendor_id, pattern_type)
);

-- Index for fast vendor lookups
create index if not exists idx_vlp_vendor on vendor_learned_patterns(vendor_id);

-- Auto-update updated_at on upsert
create or replace function set_vlp_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_vlp_updated_at on vendor_learned_patterns;
create trigger trg_vlp_updated_at
  before update on vendor_learned_patterns
  for each row execute function set_vlp_updated_at();

-- RLS: vendors can only read/write their own rows
alter table vendor_learned_patterns enable row level security;

drop policy if exists "vendor own patterns" on vendor_learned_patterns;
create policy "vendor own patterns" on vendor_learned_patterns
  using (vendor_id::text = auth.uid()::text)
  with check (vendor_id::text = auth.uid()::text);
