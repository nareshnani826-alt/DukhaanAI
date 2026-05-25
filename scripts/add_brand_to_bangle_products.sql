-- Run in Supabase SQL editor
-- Adds brand column to bangle_products

ALTER TABLE bangle_products ADD COLUMN IF NOT EXISTS brand text;
