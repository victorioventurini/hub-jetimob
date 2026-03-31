-- Add addendums column to okr_wizard_sessions
-- Stores post-submission addendums as a JSONB array
-- Each entry: { text, created_at, created_by }
ALTER TABLE public.okr_wizard_sessions
ADD COLUMN IF NOT EXISTS addendums jsonb DEFAULT '[]'::jsonb;