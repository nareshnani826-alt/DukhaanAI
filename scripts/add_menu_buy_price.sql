-- ============================================================
-- DukhaanAI — buying price for chai shop / restaurant menu items
-- For items bought ready-made (soft drinks, biscuits, samosas): what one
-- piece costs the shop, so the day's profit counts it.
-- Run in Supabase → SQL Editor BEFORE deploying the updated API.
-- ============================================================

alter table chai_menu add column if not exists buy_price numeric(10,2) not null default 0;
