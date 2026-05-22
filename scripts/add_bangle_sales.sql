-- ============================================================
-- Bangle Sales Module
-- ============================================================

CREATE TABLE IF NOT EXISTS bangle_sales (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id     uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  customer_name  text,
  customer_phone text,
  items         jsonb NOT NULL DEFAULT '[]',
  subtotal      numeric(10,2) NOT NULL DEFAULT 0,
  gst_amount    numeric(10,2) NOT NULL DEFAULT 0,
  total         numeric(10,2) NOT NULL DEFAULT 0,
  payment_mode  text NOT NULL DEFAULT 'cash'
                  CHECK (payment_mode IN ('cash','upi','card','credit')),
  notes         text,
  sale_date     date NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bangle_sales_vendor ON bangle_sales(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bangle_sales_date   ON bangle_sales(vendor_id, sale_date);
