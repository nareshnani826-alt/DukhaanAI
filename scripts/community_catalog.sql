-- Community product catalog — shared across all vendors
CREATE TABLE IF NOT EXISTS community_products (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  category     text,
  unit         text default 'pc',
  mrp          numeric(12,2) default 0,
  cost         numeric(12,2) default 0,
  gst          numeric(5,2) default 0,
  aliases      text[],
  added_by     uuid references vendors(id) on delete set null,
  usage_count  int default 1,
  verified     boolean default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  UNIQUE(name)
);

CREATE INDEX IF NOT EXISTS idx_community_products_name ON community_products(name);
CREATE INDEX IF NOT EXISTS idx_community_products_usage ON community_products(usage_count desc);

ALTER TABLE community_products DISABLE ROW LEVEL SECURITY;
