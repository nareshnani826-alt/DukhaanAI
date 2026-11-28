-- ============================================================
-- DukaanAI — Restaurant shop type
-- Restaurants use the chai shop tables (chai_menu, chai_materials, chai_orders);
-- only the allowed shop types change.
-- Run in Supabase → SQL Editor BEFORE deploying the updated API.
-- ============================================================

alter table vendors drop constraint if exists vendors_shop_type_check;
alter table vendors add constraint vendors_shop_type_check
  check (shop_type in ('kirana', 'chai', 'restaurant', 'bangle_fancy'));
