-- ============================================================
-- DukaanAI — Global Vocabulary / Alias Learning Table
-- Shared across ALL vendors — one user teaches, everyone benefits
-- Run in Supabase → SQL Editor
-- ============================================================

create table if not exists global_vocab (
  id           uuid primary key default uuid_generate_v4(),
  term         text          not null,          -- normalised lowercase search term
  product_name text          not null,          -- product name it maps to (case-insensitive match)
  lang         text          not null default 'te-IN',  -- BCP-47 language code
  store_type   text          not null default 'kirana', -- 'kirana' | 'bangle_fancy'
  hits         integer       not null default 1,        -- confirmed by N different users
  confidence   integer       not null default 1,        -- manual teach = 10, auto-learned = 1
  created_by   uuid          references vendors(id) on delete set null,
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now(),
  unique(term, store_type)
);

-- Indexes for fast lookup
create index if not exists idx_global_vocab_term       on global_vocab(term);
create index if not exists idx_global_vocab_store_type on global_vocab(store_type);
create index if not exists idx_global_vocab_confidence on global_vocab(confidence desc);

-- Row Level Security: everyone can read, authenticated users can insert/update
alter table global_vocab enable row level security;

create policy "public read vocab"
  on global_vocab for select using (true);

create policy "authenticated teach vocab"
  on global_vocab for insert
  with check (auth.role() = 'authenticated');

create policy "authenticated update vocab"
  on global_vocab for update
  using (auth.role() = 'authenticated');
