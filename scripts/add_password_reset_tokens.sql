-- Migration: add password_reset_tokens table
-- Run this in Supabase → SQL Editor (NOT the full schema.sql)

create table if not exists password_reset_tokens (
  id          uuid primary key default uuid_generate_v4(),
  vendor_id   uuid not null references vendors(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
