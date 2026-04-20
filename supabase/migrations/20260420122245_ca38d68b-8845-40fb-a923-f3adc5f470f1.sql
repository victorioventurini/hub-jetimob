-- Adiciona bypass de Admin de BU nas policies de UPDATE/DELETE de Team OKRs
-- Antes: admins de BU passavam no has_permission (via bypass interno) mas eram
-- bloqueados pelo segundo bloco que exigia owner/co-resp/líder do time.
-- Depois: is_profile_bu_admin(my_profile_id(), bu_id) curto-circuita.

-- okr_team_key_results — UPDATE
DROP POLICY IF EXISTS okr_team_key_results_update_v2 ON public.okr_team_key_results;
CREATE POLICY okr_team_key_results_update_v2
ON public.okr_team_key_results
FOR UPDATE
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.team_kr.update:self_or_owner'::text)
  AND (
    is_profile_bu_admin(my_profile_id(), bu_id)
    OR owner_user_id = my_profile_id()
    OR my_profile_id() = ANY (co_responsibles)
    OR can_manage_team_okr_by_profile(my_profile_id(), team_id)
  )
);

-- okr_team_key_results — DELETE
DROP POLICY IF EXISTS okr_team_key_results_delete_v2 ON public.okr_team_key_results;
CREATE POLICY okr_team_key_results_delete_v2
ON public.okr_team_key_results
FOR DELETE
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.team_kr.delete:team'::text)
  AND (
    is_profile_bu_admin(my_profile_id(), bu_id)
    OR owner_user_id = my_profile_id()
    OR my_profile_id() = ANY (co_responsibles)
    OR can_manage_team_okr_by_profile(my_profile_id(), team_id)
  )
);

-- okr_team_objectives — UPDATE
DROP POLICY IF EXISTS okr_team_objectives_update_v2 ON public.okr_team_objectives;
CREATE POLICY okr_team_objectives_update_v2
ON public.okr_team_objectives
FOR UPDATE
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.team_objective.update:self_or_owner'::text)
  AND (
    is_profile_bu_admin(my_profile_id(), bu_id)
    OR owner_user_id = my_profile_id()
    OR can_manage_team_okr_by_profile(my_profile_id(), team_id)
  )
);

-- okr_team_objectives — DELETE
DROP POLICY IF EXISTS okr_team_objectives_delete_v2 ON public.okr_team_objectives;
CREATE POLICY okr_team_objectives_delete_v2
ON public.okr_team_objectives
FOR DELETE
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.team_objective.delete:team'::text)
  AND (
    is_profile_bu_admin(my_profile_id(), bu_id)
    OR owner_user_id = my_profile_id()
    OR can_manage_team_okr_by_profile(my_profile_id(), team_id)
  )
);