-- ============================================
-- Fix: Add missing image_url column to referral_rewards
-- Run this in the Supabase SQL Editor if the referral_system
-- migration was already applied without this column.
-- ============================================

ALTER TABLE public.referral_rewards
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Force PostgREST to reload its schema cache so it sees the new column
NOTIFY pgrst, 'reload schema';
