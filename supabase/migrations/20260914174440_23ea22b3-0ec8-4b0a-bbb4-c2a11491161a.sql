ALTER TABLE public.external_companies DROP CONSTRAINT partner_companies_created_by_fkey;

UPDATE public.external_companies ec
SET created_by = p.id
FROM public.profiles p
WHERE p.user_id = ec.created_by;

ALTER TABLE public.external_companies
  ADD CONSTRAINT partner_companies_created_by_profile_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;