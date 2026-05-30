-- Add store_type column to day_sessions to separate kirana vs bangle sessions
-- Run in Supabase → SQL Editor

ALTER TABLE day_sessions
  ADD COLUMN IF NOT EXISTS store_type text NOT NULL DEFAULT 'kirana';

-- Backfill any existing sessions as kirana (the original store type)
UPDATE day_sessions SET store_type = 'kirana' WHERE store_type IS NULL OR store_type = '';

-- Index for fast lookup by vendor + date + store_type
CREATE INDEX IF NOT EXISTS idx_day_sessions_vendor_date_type
  ON day_sessions (vendor_id, date, store_type);
