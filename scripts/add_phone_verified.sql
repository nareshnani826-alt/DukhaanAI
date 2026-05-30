-- ============================================================
-- DukaanAI — Phone verification for registration
-- Run in Supabase → SQL Editor
-- ============================================================

-- Track whether a vendor's phone number has been OTP-verified
alter table vendors
  add column if not exists phone_verified boolean not null default false;

-- Existing vendors who already have a phone are trusted (they logged in)
update vendors set phone_verified = true where phone is not null;

-- Index for fast phone lookup on login (already used in auth)
create index if not exists idx_vendors_phone
  on vendors (phone)
  where phone is not null;
