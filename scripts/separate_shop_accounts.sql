-- ============================================================
-- DukaanAI — one account per shop type
-- The same email / phone can have a kirana, a chai and a bangle account,
-- each with its own password and data.
-- Run in Supabase → SQL Editor BEFORE deploying the updated API.
-- ============================================================

alter table vendors add column if not exists shop_type text;

-- Existing accounts: the shop type they already use (kirana when they have several)
update vendors set shop_type = case
    when 'kirana'       = any(modules) then 'kirana'
    when 'chai'         = any(modules) then 'chai'
    when 'bangle_fancy' = any(modules) then 'bangle_fancy'
    else 'kirana' end
  where shop_type is null;

alter table vendors alter column shop_type set default 'kirana';
alter table vendors alter column shop_type set not null;

alter table vendors drop constraint if exists vendors_shop_type_check;
alter table vendors add constraint vendors_shop_type_check
  check (shop_type in ('kirana', 'chai', 'bangle_fancy'));

-- Email was unique across all accounts; now it is unique per shop type
alter table vendors drop constraint if exists vendors_email_key;
create unique index if not exists vendors_email_shop_type on vendors (email, shop_type);
create index if not exists vendors_phone_shop_type on vendors (phone, shop_type);
