
-- ============================================
-- FIX: RLS policies for okr_team_key_results and okr_team_objectives
-- 
-- Problem: Current UPDATE policies only check if user has permission,
-- but don't validate if user is owner, co-responsible, or team leader.
-- This allows any user with okrs_operate_v2 template to edit ANY KR.
--
-- Solution: Update policies to validate actual ownership:
-- - User is owner (owner_user_id = my_profile_id())
-- - OR user is co-responsible (for KRs)
-- - OR user can manage the team (leader of team or ancestor)
-- ============================================

-- =====================================
-- FIX okr_team_key_results UPDATE policy
-- =====================================
DROP POLICY IF EXISTS okr_team_key_results_update_v2 ON public.okr_team_key_results;

CREATE POLICY okr_team_key_results_update_v2 ON public.okr_team_key_results
FOR UPDATE TO authenticated
USING (
  -- Must have base permission
  has_permission(my_profile_id(), bu_id, 'okrs.team_kr.update:self_or_owner')
  AND (
    -- Is owner of this KR
    owner_user_id = my_profile_id()
    -- OR is co-responsible
    OR my_profile_id() = ANY(co_responsibles)
    -- OR is team leader/manager (can manage the team's OKRs)
    OR can_manage_team_okr(team_id, my_profile_id())
  )
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.team_kr.update:self_or_owner')
  AND (
    owner_user_id = my_profile_id()
    OR my_profile_id() = ANY(co_responsibles)
    OR can_manage_team_okr(team_id, my_profile_id())
  )
);

-- =====================================
-- FIX okr_team_objectives UPDATE policy
-- =====================================
DROP POLICY IF EXISTS okr_team_objectives_update_v2 ON public.okr_team_objectives;

CREATE POLICY okr_team_objectives_update_v2 ON public.okr_team_objectives
FOR UPDATE TO authenticated
USING (
  -- Must have base permission
  has_permission(my_profile_id(), bu_id, 'okrs.team_objective.update:self_or_owner')
  AND (
    -- Is owner of this objective
    owner_user_id = my_profile_id()
    -- OR is team leader/manager (can manage the team's OKRs)
    OR can_manage_team_okr(team_id, my_profile_id())
  )
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.team_objective.update:self_or_owner')
  AND (
    owner_user_id = my_profile_id()
    OR can_manage_team_okr(team_id, my_profile_id())
  )
);

-- =====================================
-- FIX okr_team_key_results DELETE policy (same logic)
-- =====================================
DROP POLICY IF EXISTS okr_team_key_results_delete_v2 ON public.okr_team_key_results;

CREATE POLICY okr_team_key_results_delete_v2 ON public.okr_team_key_results
FOR DELETE TO authenticated
USING (
  -- Must have base permission
  has_permission(my_profile_id(), bu_id, 'okrs.team_kr.delete:team')
  AND (
    -- Is owner of this KR
    owner_user_id = my_profile_id()
    -- OR is co-responsible
    OR my_profile_id() = ANY(co_responsibles)
    -- OR is team leader/manager (can manage the team's OKRs)
    OR can_manage_team_okr(team_id, my_profile_id())
  )
);

-- =====================================
-- FIX okr_team_objectives DELETE policy (same logic)
-- =====================================
DROP POLICY IF EXISTS okr_team_objectives_delete_v2 ON public.okr_team_objectives;

CREATE POLICY okr_team_objectives_delete_v2 ON public.okr_team_objectives
FOR DELETE TO authenticated
USING (
  -- Must have base permission
  has_permission(my_profile_id(), bu_id, 'okrs.team_objective.delete:team')
  AND (
    -- Is owner of this objective
    owner_user_id = my_profile_id()
    -- OR is team leader/manager (can manage the team's OKRs)
    OR can_manage_team_okr(team_id, my_profile_id())
  )
);

-- =====================================
-- Add comment explaining the policy logic
-- =====================================
COMMENT ON POLICY okr_team_key_results_update_v2 ON public.okr_team_key_results IS 
'UPDATE allowed only for: owner, co-responsibles, or team leaders/managers. Requires okrs.team_kr.update:self_or_owner permission.';

COMMENT ON POLICY okr_team_objectives_update_v2 ON public.okr_team_objectives IS 
'UPDATE allowed only for: owner or team leaders/managers. Requires okrs.team_objective.update:self_or_owner permission.';
