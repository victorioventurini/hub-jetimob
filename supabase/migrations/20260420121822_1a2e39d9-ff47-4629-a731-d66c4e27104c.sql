-- Realinhar FKs cancelled_by para profiles.id (IDENTITY_CONVENTION v2.2)
-- Antes: cancelled_by referenciava auth.users(id) → falha 23503 ao salvar profile_id

ALTER TABLE public.okr_team_key_results
  DROP CONSTRAINT IF EXISTS okr_team_key_results_cancelled_by_fkey;
ALTER TABLE public.okr_team_key_results
  ADD CONSTRAINT okr_team_key_results_cancelled_by_profile_fkey
  FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.okr_org_key_results
  DROP CONSTRAINT IF EXISTS okr_org_key_results_cancelled_by_fkey;
ALTER TABLE public.okr_org_key_results
  ADD CONSTRAINT okr_org_key_results_cancelled_by_profile_fkey
  FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.okr_team_objectives
  DROP CONSTRAINT IF EXISTS okr_team_objectives_cancelled_by_fkey;
ALTER TABLE public.okr_team_objectives
  ADD CONSTRAINT okr_team_objectives_cancelled_by_profile_fkey
  FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.okr_org_objectives
  DROP CONSTRAINT IF EXISTS okr_org_objectives_cancelled_by_fkey;
ALTER TABLE public.okr_org_objectives
  ADD CONSTRAINT okr_org_objectives_cancelled_by_profile_fkey
  FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.okr_team_key_results.cancelled_by IS 'profiles.id (IDENTITY_CONVENTION v2.2)';
COMMENT ON COLUMN public.okr_org_key_results.cancelled_by IS 'profiles.id (IDENTITY_CONVENTION v2.2)';
COMMENT ON COLUMN public.okr_team_objectives.cancelled_by IS 'profiles.id (IDENTITY_CONVENTION v2.2)';
COMMENT ON COLUMN public.okr_org_objectives.cancelled_by IS 'profiles.id (IDENTITY_CONVENTION v2.2)';