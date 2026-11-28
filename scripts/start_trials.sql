-- ============================================================
-- DukhaanAI — start the 30-day free trial for existing shops
-- Every shop on Pro with no end date gets 30 days from now. After that it is
-- locked (can sign in and see everything, can't save new bills) until it pays.
-- The Google Play review demo shop (demo@dukhaanai.in) and admin accounts are
-- left without an end date so they never lock.
-- Run in Supabase → SQL Editor AFTER the updated API is live.
-- ============================================================

update vendors
   set plan_expires_at = now() + interval '30 days'
 where plan in ('pro', 'wholesale')
   and plan_expires_at is null
   and coalesce(is_admin, false) = false
   and lower(coalesce(email, '')) <> 'demo@dukhaanai.in';

-- Check: who got a trial end date, and who never ends
select store_name, email, shop_type, plan, plan_expires_at
  from vendors
 order by plan_expires_at nulls first, store_name;
