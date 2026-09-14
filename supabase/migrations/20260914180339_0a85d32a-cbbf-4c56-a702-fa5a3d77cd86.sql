ALTER TABLE public.partner_contacts
  DROP CONSTRAINT IF EXISTS partner_contacts_created_by_fkey;

UPDATE public.partner_contacts pc
SET created_by = p.id
FROM public.profiles p
WHERE p.user_id = pc.created_by
  AND pc.created_by IS NOT NULL;

UPDATE public.partner_contacts pc
SET created_by = NULL
WHERE pc.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pc.created_by);

ALTER TABLE public.partner_contacts
  ADD CONSTRAINT partner_contacts_created_by_profile_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.partner_contacts
  ALTER COLUMN created_by SET DEFAULT public.my_profile_id();

ALTER TABLE public.partner_contact_bu_associations
  ALTER COLUMN created_by SET DEFAULT public.my_profile_id();