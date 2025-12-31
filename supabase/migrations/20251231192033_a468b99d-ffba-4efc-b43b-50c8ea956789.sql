-- Remove work_phone column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS work_phone;