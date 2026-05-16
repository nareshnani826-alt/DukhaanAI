-- Day sessions table
CREATE TABLE IF NOT EXISTS day_sessions (
  id              uuid primary key default uuid_generate_v4(),
  vendor_id       uuid not null references vendors(id) on delete cascade,
  date            date not null,
  opened_at       timestamptz not null default now(),
  closed_at       timestamptz,
  opening_stock   jsonb,   -- snapshot of all products at open
  closing_stock   jsonb,   -- snapshot of all products at close
  total_sales     numeric(12,2) default 0,
  total_invoices  integer default 0,
  gross_profit    numeric(12,2) default 0,
  low_stock_items jsonb,   -- items below min_stock at close
  notes           text,
  status          text default 'open' check (status in ('open','closed')),
  created_at      timestamptz not null default now(),
  unique(vendor_id, date)
);

CREATE INDEX IF NOT EXISTS idx_day_sessions_vendor ON day_sessions(vendor_id, date desc);
ALTER TABLE day_sessions DISABLE ROW LEVEL SECURITY;
