-- Add module-based access control to vendors
-- Modules: 'kirana' | 'bangle_fancy'
-- Vendors can have one or more modules

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS modules text[] NOT NULL DEFAULT '{"kirana"}';

-- Existing vendors default to kirana only
UPDATE vendors SET modules = '{"kirana"}' WHERE modules IS NULL OR modules = '{}';
