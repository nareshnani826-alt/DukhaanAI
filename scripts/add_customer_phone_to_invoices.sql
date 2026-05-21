-- Run this in Supabase SQL editor to add customer_phone to invoices table
alter table invoices add column if not exists customer_phone text;
