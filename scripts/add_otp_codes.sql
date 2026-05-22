-- Migration: add otp_codes table for WhatsApp OTP login
-- Run this in Supabase → SQL Editor

create table if not exists otp_codes (
  id          uuid primary key default uuid_generate_v4(),
  phone       text not null,
  code_hash   text not null,
  attempts    int not null default 0,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- Index for fast phone lookup
create index if not exists idx_otp_codes_phone on otp_codes(phone);
