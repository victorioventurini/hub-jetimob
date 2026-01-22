-- Fix identity convention for ticket attachments
-- uploaded_by_user_id must reference public.profiles(id) (domain identity), not auth.users(id)

ALTER TABLE public.ticket_attachments
  DROP CONSTRAINT IF EXISTS ticket_attachments_uploaded_by_user_id_fkey;

-- Keep legacy column name, but enforce correct FK target
ALTER TABLE public.ticket_attachments
  ADD CONSTRAINT ticket_attachments_uploaded_by_profile_fkey
  FOREIGN KEY (uploaded_by_user_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL
  NOT VALID;

-- Table is typically small; validate now to catch any inconsistent legacy rows
ALTER TABLE public.ticket_attachments
  VALIDATE CONSTRAINT ticket_attachments_uploaded_by_profile_fkey;
