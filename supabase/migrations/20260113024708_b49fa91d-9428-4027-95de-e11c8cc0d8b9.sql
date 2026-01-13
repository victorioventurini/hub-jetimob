-- =====================================================
-- FIX: Corrigir parâmetros invertidos nas RLS policies de OKRs
-- Problema: can_manage_team_okr(team_id, my_profile_id()) 
--           deveria ser can_manage_team_okr_by_profile(my_profile_id(), team_id)
-- =====================================================

-- 1. Criar função wrapper que aceita profile_id (padrão das RLS)
CREATE OR REPLACE FUNCTION public.can_manage_team_okr_by_profile(
  p_profile_id uuid,
  p_team_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p_team_id = ANY(
    get_okr_manageable_team_ids(
      user_id_from_profile_id(p_profile_id)
    )
  )
$$;

-- Comentário explicativo
COMMENT ON FUNCTION public.can_manage_team_okr_by_profile(uuid, uuid) IS 
'Wrapper de can_manage_team_okr para uso em RLS policies. Aceita profile_id como primeiro parâmetro (compatível com my_profile_id()) e converte internamente para auth.users.id.';

-- 2. Atualizar RLS policies de okr_team_objectives

-- UPDATE policy
DROP POLICY IF EXISTS okr_team_objectives_update_v2 ON okr_team_objectives;
CREATE POLICY okr_team_objectives_update_v2 ON okr_team_objectives
FOR UPDATE USING (
  has_permission(my_profile_id(), bu_id, 'okrs.team_objective.update:self_or_owner')
  AND (
    owner_user_id = my_profile_id()
    OR can_manage_team_okr_by_profile(my_profile_id(), team_id)
  )
);

-- DELETE policy
DROP POLICY IF EXISTS okr_team_objectives_delete_v2 ON okr_team_objectives;
CREATE POLICY okr_team_objectives_delete_v2 ON okr_team_objectives
FOR DELETE USING (
  has_permission(my_profile_id(), bu_id, 'okrs.team_objective.delete:team')
  AND (
    owner_user_id = my_profile_id()
    OR can_manage_team_okr_by_profile(my_profile_id(), team_id)
  )
);

-- 3. Atualizar RLS policies de okr_team_key_results

-- UPDATE policy
DROP POLICY IF EXISTS okr_team_key_results_update_v2 ON okr_team_key_results;
CREATE POLICY okr_team_key_results_update_v2 ON okr_team_key_results
FOR UPDATE USING (
  has_permission(my_profile_id(), bu_id, 'okrs.team_kr.update:self_or_owner')
  AND (
    owner_user_id = my_profile_id()
    OR my_profile_id() = ANY(co_responsibles)
    OR can_manage_team_okr_by_profile(my_profile_id(), team_id)
  )
);

-- DELETE policy
DROP POLICY IF EXISTS okr_team_key_results_delete_v2 ON okr_team_key_results;
CREATE POLICY okr_team_key_results_delete_v2 ON okr_team_key_results
FOR DELETE USING (
  has_permission(my_profile_id(), bu_id, 'okrs.team_kr.delete:team')
  AND (
    owner_user_id = my_profile_id()
    OR my_profile_id() = ANY(co_responsibles)
    OR can_manage_team_okr_by_profile(my_profile_id(), team_id)
  )
);