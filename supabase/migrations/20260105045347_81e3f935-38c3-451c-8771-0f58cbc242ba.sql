-- Remove slack_id and add discord_id to profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS slack_id;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_id TEXT;