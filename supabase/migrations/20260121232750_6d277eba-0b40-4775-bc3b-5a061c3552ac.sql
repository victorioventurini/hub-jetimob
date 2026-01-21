-- =====================================================
-- IDENTITY HARDENING v2.1 - RENAME ticket_participants.user_id → profile_id
-- =====================================================

-- Rename the column
ALTER TABLE public.ticket_participants 
RENAME COLUMN user_id TO profile_id;

-- Update the column comment
COMMENT ON COLUMN public.ticket_participants.profile_id IS 
'Stores profiles.id (NOT auth.users.id). FK: ticket_participants_profile_fkey. Renamed from user_id in Identity Hardening v2.1';