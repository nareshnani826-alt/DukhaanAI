-- ============================================================
-- Bangle / Fancy Store Module
-- Completely separate from kirana products table
-- ============================================================

-- Master product (e.g. "Kundan Bangle", "Jhumka Earring")
CREATE TABLE IF NOT EXISTS bangle_products (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id   uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name        text NOT NULL,
  category    text NOT NULL DEFAULT 'Bangles',
  description text,
  mrp         numeric(10,2) NOT NULL DEFAULT 0,
  cost_price  numeric(10,2) NOT NULL DEFAULT 0,
  gst_percent integer NOT NULL DEFAULT 3
                CHECK (gst_percent IN (0,3,5,12,18,28)),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Variants: each row = one colour+size+design combination
CREATE TABLE IF NOT EXISTS bangle_variants (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  uuid NOT NULL REFERENCES bangle_products(id) ON DELETE CASCADE,
  vendor_id   uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  colour      text,              -- Red, Gold, Silver, Green, Pink, ...
  size        text,              -- 2.2 / 2.4 / 2.6 / 2.8 / 2.10 / Free Size
  design      text,              -- Plain, Kundan, Meenakari, Stone, ...
  stock       integer NOT NULL DEFAULT 0,
  min_stock   integer NOT NULL DEFAULT 12,  -- 1 dozen trigger
  mrp         numeric(10,2),     -- NULL = inherit from product
  cost_price  numeric(10,2),     -- NULL = inherit from product
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast vendor lookups
CREATE INDEX IF NOT EXISTS idx_bangle_products_vendor ON bangle_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bangle_variants_product ON bangle_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_bangle_variants_vendor ON bangle_variants(vendor_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_bangle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bangle_products_updated_at ON bangle_products;
CREATE TRIGGER trg_bangle_products_updated_at
  BEFORE UPDATE ON bangle_products
  FOR EACH ROW EXECUTE FUNCTION update_bangle_updated_at();

DROP TRIGGER IF EXISTS trg_bangle_variants_updated_at ON bangle_variants;
CREATE TRIGGER trg_bangle_variants_updated_at
  BEFORE UPDATE ON bangle_variants
  FOR EACH ROW EXECUTE FUNCTION update_bangle_updated_at();
