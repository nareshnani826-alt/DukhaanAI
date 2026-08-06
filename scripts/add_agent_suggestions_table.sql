-- ============================================================
-- Agent Suggestions — AI-generated daily ops suggestions
-- (reorder / festival prep / margin / dead stock, correlated
-- by the Daily Ops Agent). Vendor approves or dismisses each one;
-- the agent never mutates stock/orders directly.
-- Run this in Supabase → SQL Editor
-- ============================================================

create table agent_suggestions (
  id          uuid primary key default uuid_generate_v4(),
  vendor_id   uuid not null references vendors(id) on delete cascade,
  kind        text not null check (kind in ('reorder','festival_prep','margin','dead_stock')),
  title       text not null,
  summary     text not null default '',
  reasoning   text not null default '',
  urgency     text not null default 'medium'
                check (urgency in ('critical','high','medium')),
  payload     jsonb,
  status      text not null default 'pending'
                check (status in ('pending','approved','dismissed')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_agent_suggestions_vendor_status on agent_suggestions(vendor_id, status);
