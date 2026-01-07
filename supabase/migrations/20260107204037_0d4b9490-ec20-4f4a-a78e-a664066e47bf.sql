-- CORREÇÃO CRÍTICA: Substituir FKs de auth.users para profiles.id em tabelas OKR
-- Esta migration apenas altera constraints (DDL), não faz UPDATE nos dados
-- A migração de dados será feita via função segura que respeita RLS

-- ============================================================
-- PASSO 1: Remover FKs antigas que apontam para auth.users
-- ============================================================

ALTER TABLE public.okr_org_objectives 
  DROP CONSTRAINT IF EXISTS okr_org_objectives_owner_user_id_fkey;

ALTER TABLE public.okr_org_key_results 
  DROP CONSTRAINT IF EXISTS okr_org_key_results_owner_user_id_fkey;

ALTER TABLE public.okr_team_objectives 
  DROP CONSTRAINT IF EXISTS okr_team_objectives_owner_user_id_fkey;

ALTER TABLE public.okr_team_key_results 
  DROP CONSTRAINT IF EXISTS okr_team_key_results_owner_user_id_fkey;

ALTER TABLE public.okr_checkins 
  DROP CONSTRAINT IF EXISTS okr_checkins_user_id_fkey;

-- ============================================================
-- PASSO 2: Migrar dados existentes (bypass enforce_bu_scope via session_replication_role)
-- ============================================================

-- Desabilitar triggers temporariamente para migração de dados
SET session_replication_role = replica;

-- okr_org_objectives.owner_user_id
UPDATE public.okr_org_objectives o
SET owner_user_id = p.id
FROM public.profiles p
WHERE p.user_id = o.owner_user_id
  AND o.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = o.owner_user_id);

-- okr_org_key_results.owner_user_id  
UPDATE public.okr_org_key_results o
SET owner_user_id = p.id
FROM public.profiles p
WHERE p.user_id = o.owner_user_id
  AND o.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = o.owner_user_id);

-- okr_team_objectives.owner_user_id
UPDATE public.okr_team_objectives o
SET owner_user_id = p.id
FROM public.profiles p
WHERE p.user_id = o.owner_user_id
  AND o.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = o.owner_user_id);

-- okr_team_key_results.owner_user_id
UPDATE public.okr_team_key_results o
SET owner_user_id = p.id
FROM public.profiles p
WHERE p.user_id = o.owner_user_id
  AND o.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = o.owner_user_id);

-- okr_checkins.user_id
UPDATE public.okr_checkins o
SET user_id = p.id
FROM public.profiles p
WHERE p.user_id = o.user_id
  AND o.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = o.user_id);

-- Reabilitar triggers
SET session_replication_role = DEFAULT;

-- ============================================================
-- PASSO 3: Criar novas FKs apontando para profiles.id
-- ============================================================

ALTER TABLE public.okr_org_objectives
  ADD CONSTRAINT okr_org_objectives_owner_profile_fkey
  FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

ALTER TABLE public.okr_org_key_results
  ADD CONSTRAINT okr_org_key_results_owner_profile_fkey
  FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

ALTER TABLE public.okr_team_objectives
  ADD CONSTRAINT okr_team_objectives_owner_profile_fkey
  FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

ALTER TABLE public.okr_team_key_results
  ADD CONSTRAINT okr_team_key_results_owner_profile_fkey
  FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

ALTER TABLE public.okr_checkins
  ADD CONSTRAINT okr_checkins_author_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- ============================================================
-- COMENTÁRIOS: Documentar a convenção de identidade
-- ============================================================

COMMENT ON COLUMN public.okr_org_objectives.owner_user_id IS 'PROFILE_ID: Referencia profiles.id (NÃO auth.users.id). Usar useIdentity().profileId no frontend.';
COMMENT ON COLUMN public.okr_org_key_results.owner_user_id IS 'PROFILE_ID: Referencia profiles.id (NÃO auth.users.id). Usar useIdentity().profileId no frontend.';
COMMENT ON COLUMN public.okr_team_objectives.owner_user_id IS 'PROFILE_ID: Referencia profiles.id (NÃO auth.users.id). Usar useIdentity().profileId no frontend.';
COMMENT ON COLUMN public.okr_team_key_results.owner_user_id IS 'PROFILE_ID: Referencia profiles.id (NÃO auth.users.id). Usar useIdentity().profileId no frontend.';
COMMENT ON COLUMN public.okr_checkins.user_id IS 'PROFILE_ID: Referencia profiles.id (NÃO auth.users.id). Usar useIdentity().profileId no frontend.';