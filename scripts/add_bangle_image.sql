-- Add product image support to bangle_products
-- Run in Supabase SQL editor.
--
-- ALSO required in Supabase Dashboard → Storage:
--   1. Create a new bucket named exactly:  bangle-images
--   2. Toggle it to PUBLIC so images are accessible via URL
--   3. Set file size limit to 5 MB (recommended)

ALTER TABLE bangle_products
  ADD COLUMN IF NOT EXISTS image_url TEXT;
