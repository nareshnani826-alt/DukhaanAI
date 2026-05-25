-- Run in Supabase SQL editor
-- Adds unit column to products for tracking measurement unit (kg, litre, piece, etc.)

alter table products add column if not exists unit text not null default 'piece';
