
-- ============================================
-- Migration: Update OKRs RLS to V2 Permission System
-- ============================================

-- ============================================
-- 1. OKR_ORG_OBJECTIVES - Organization-level objectives
-- ============================================

DROP POLICY IF EXISTS okr_org_objectives_manage ON public.okr_org_objectives;
DROP POLICY IF EXISTS okr_org_objectives_select ON public.okr_org_objectives;

CREATE POLICY "okr_org_objectives_select_v2" ON public.okr_org_objectives
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND (
    has_permission(my_profile_id(), bu_id, 'okrs.org_objective.read:bu')
    OR has_permission(my_profile_id(), bu_id, 'okrs.view:bu')
  )
);

CREATE POLICY "okr_org_objectives_insert_v2" ON public.okr_org_objectives
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.org_objective.create:bu')
);

CREATE POLICY "okr_org_objectives_update_v2" ON public.okr_org_objectives
FOR UPDATE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.org_objective.update:self_or_owner')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.org_objective.update:self_or_owner')
);

CREATE POLICY "okr_org_objectives_delete_v2" ON public.okr_org_objectives
FOR DELETE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.org_objective.delete:bu')
);

-- ============================================
-- 2. OKR_ORG_KEY_RESULTS
-- ============================================

DROP POLICY IF EXISTS okr_org_key_results_manage ON public.okr_org_key_results;
DROP POLICY IF EXISTS okr_org_key_results_select ON public.okr_org_key_results;

CREATE POLICY "okr_org_key_results_select_v2" ON public.okr_org_key_results
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND (
    has_permission(my_profile_id(), bu_id, 'okrs.org_kr.read:bu')
    OR has_permission(my_profile_id(), bu_id, 'okrs.view:bu')
  )
);

CREATE POLICY "okr_org_key_results_insert_v2" ON public.okr_org_key_results
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.org_kr.create:bu')
);

CREATE POLICY "okr_org_key_results_update_v2" ON public.okr_org_key_results
FOR UPDATE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.org_kr.update:self_or_owner')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.org_kr.update:self_or_owner')
);

CREATE POLICY "okr_org_key_results_delete_v2" ON public.okr_org_key_results
FOR DELETE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.org_kr.delete:bu')
);

-- ============================================
-- 3. OKR_TEAM_OBJECTIVES
-- ============================================

DROP POLICY IF EXISTS okr_team_objectives_manage ON public.okr_team_objectives;
DROP POLICY IF EXISTS okr_team_objectives_select ON public.okr_team_objectives;
DROP POLICY IF EXISTS okr_team_objectives_insert ON public.okr_team_objectives;
DROP POLICY IF EXISTS okr_team_objectives_update ON public.okr_team_objectives;
DROP POLICY IF EXISTS okr_team_objectives_delete ON public.okr_team_objectives;

CREATE POLICY "okr_team_objectives_select_v2" ON public.okr_team_objectives
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND (
    has_permission(my_profile_id(), bu_id, 'okrs.team_objective.read:team_tree')
    OR has_permission(my_profile_id(), bu_id, 'okrs.view:bu')
  )
);

CREATE POLICY "okr_team_objectives_insert_v2" ON public.okr_team_objectives
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.team_objective.create:team')
);

CREATE POLICY "okr_team_objectives_update_v2" ON public.okr_team_objectives
FOR UPDATE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.team_objective.update:self_or_owner')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.team_objective.update:self_or_owner')
);

CREATE POLICY "okr_team_objectives_delete_v2" ON public.okr_team_objectives
FOR DELETE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.team_objective.delete:team')
);

-- ============================================
-- 4. OKR_TEAM_KEY_RESULTS
-- ============================================

DROP POLICY IF EXISTS okr_team_key_results_manage ON public.okr_team_key_results;
DROP POLICY IF EXISTS okr_team_key_results_select ON public.okr_team_key_results;

CREATE POLICY "okr_team_key_results_select_v2" ON public.okr_team_key_results
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND (
    has_permission(my_profile_id(), bu_id, 'okrs.team_kr.read:team_tree')
    OR has_permission(my_profile_id(), bu_id, 'okrs.view:bu')
  )
);

CREATE POLICY "okr_team_key_results_insert_v2" ON public.okr_team_key_results
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.team_kr.create:team')
);

CREATE POLICY "okr_team_key_results_update_v2" ON public.okr_team_key_results
FOR UPDATE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.team_kr.update:self_or_owner')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.team_kr.update:self_or_owner')
);

CREATE POLICY "okr_team_key_results_delete_v2" ON public.okr_team_key_results
FOR DELETE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.team_kr.delete:team')
);

-- ============================================
-- 5. OKR_CHECKINS (user_id column, not created_by)
-- ============================================

DROP POLICY IF EXISTS okr_checkins_insert ON public.okr_checkins;
DROP POLICY IF EXISTS okr_checkins_select ON public.okr_checkins;

CREATE POLICY "okr_checkins_select_v2" ON public.okr_checkins
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND (
    has_permission(my_profile_id(), bu_id, 'okrs.checkin.read:team_tree')
    OR has_permission(my_profile_id(), bu_id, 'okrs.view:bu')
  )
);

CREATE POLICY "okr_checkins_insert_v2" ON public.okr_checkins
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.checkin.create:self_or_owner')
);

CREATE POLICY "okr_checkins_update_v2" ON public.okr_checkins
FOR UPDATE TO authenticated
USING (
  user_id = my_profile_id()
  AND has_permission(my_profile_id(), bu_id, 'okrs.checkin.update:self')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.checkin.update:self')
);

-- ============================================
-- 6. OKR_INITIATIVES
-- ============================================

DROP POLICY IF EXISTS okr_initiatives_manage ON public.okr_initiatives;
DROP POLICY IF EXISTS okr_initiatives_select ON public.okr_initiatives;

CREATE POLICY "okr_initiatives_select_v2" ON public.okr_initiatives
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND (
    has_permission(my_profile_id(), bu_id, 'okrs.initiative.read:team_tree')
    OR has_permission(my_profile_id(), bu_id, 'okrs.view:bu')
  )
);

CREATE POLICY "okr_initiatives_insert_v2" ON public.okr_initiatives
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.initiative.create:team')
);

CREATE POLICY "okr_initiatives_update_v2" ON public.okr_initiatives
FOR UPDATE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.initiative.update:self_or_owner')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.initiative.update:self_or_owner')
);

CREATE POLICY "okr_initiatives_delete_v2" ON public.okr_initiatives
FOR DELETE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.initiative.delete:self_or_owner')
);

-- ============================================
-- 7. OKR_CONTRIBUTIONS
-- ============================================

DROP POLICY IF EXISTS okr_contributions_manage ON public.okr_contributions;
DROP POLICY IF EXISTS okr_contributions_select ON public.okr_contributions;

CREATE POLICY "okr_contributions_select_v2" ON public.okr_contributions
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'okrs.view:bu')
);

CREATE POLICY "okr_contributions_manage_v2" ON public.okr_contributions
FOR ALL TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.links.manage:bu')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.links.manage:bu')
);

-- ============================================
-- 8. OKR_TEAM_OBJECTIVE_CONTRIBUTORS
-- ============================================

DROP POLICY IF EXISTS okr_team_objective_contributors_manage ON public.okr_team_objective_contributors;
DROP POLICY IF EXISTS okr_team_objective_contributors_select ON public.okr_team_objective_contributors;

CREATE POLICY "okr_team_objective_contributors_select_v2" ON public.okr_team_objective_contributors
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM okr_team_objectives o
    WHERE o.id = okr_team_objective_contributors.objective_id
    AND is_profile_bu_member(my_profile_id(), o.bu_id)
    AND has_permission(my_profile_id(), o.bu_id, 'okrs.view:bu')
  )
);

CREATE POLICY "okr_team_objective_contributors_manage_v2" ON public.okr_team_objective_contributors
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM okr_team_objectives o
    WHERE o.id = okr_team_objective_contributors.objective_id
    AND has_permission(my_profile_id(), o.bu_id, 'okrs.team_objective.update:self_or_owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM okr_team_objectives o
    WHERE o.id = okr_team_objective_contributors.objective_id
    AND has_permission(my_profile_id(), o.bu_id, 'okrs.team_objective.update:self_or_owner')
  )
);

-- ============================================
-- 9. OKR_DEPENDENCIES
-- ============================================

DROP POLICY IF EXISTS okr_dependencies_delete ON public.okr_dependencies;
DROP POLICY IF EXISTS okr_dependencies_insert ON public.okr_dependencies;
DROP POLICY IF EXISTS okr_dependencies_select ON public.okr_dependencies;
DROP POLICY IF EXISTS okr_dependencies_update ON public.okr_dependencies;

CREATE POLICY "okr_dependencies_select_v2" ON public.okr_dependencies
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM okr_team_key_results kr
    WHERE kr.id = okr_dependencies.kr_id
    AND is_profile_bu_member(my_profile_id(), kr.bu_id)
    AND has_permission(my_profile_id(), kr.bu_id, 'okrs.view:bu')
  )
);

CREATE POLICY "okr_dependencies_manage_v2" ON public.okr_dependencies
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM okr_team_key_results kr
    WHERE kr.id = okr_dependencies.kr_id
    AND has_permission(my_profile_id(), kr.bu_id, 'okrs.links.manage:bu')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM okr_team_key_results kr
    WHERE kr.id = okr_dependencies.kr_id
    AND has_permission(my_profile_id(), kr.bu_id, 'okrs.links.manage:bu')
  )
);

-- ============================================
-- 10. OKR_COACHING_EVENTS
-- ============================================

DROP POLICY IF EXISTS okr_coaching_events_insert ON public.okr_coaching_events;
DROP POLICY IF EXISTS okr_coaching_events_select ON public.okr_coaching_events;

CREATE POLICY "okr_coaching_events_select_v2" ON public.okr_coaching_events
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'okrs.coaching.view:bu')
);

CREATE POLICY "okr_coaching_events_insert_v2" ON public.okr_coaching_events
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.coaching.invoke:bu')
);

-- ============================================
-- 11. OKR_INSIGHTS
-- ============================================

DROP POLICY IF EXISTS okr_insights_select ON public.okr_insights;

CREATE POLICY "okr_insights_select_v2" ON public.okr_insights
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'okrs.insights.view:bu')
);

CREATE POLICY "okr_insights_manage_v2" ON public.okr_insights
FOR ALL TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'okrs.insights.manage:bu')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.insights.manage:bu')
);

-- ============================================
-- 12. OKR_OBJECTIVE_REVIEWS
-- ============================================

DROP POLICY IF EXISTS okr_objective_reviews_insert ON public.okr_objective_reviews;
DROP POLICY IF EXISTS okr_objective_reviews_select ON public.okr_objective_reviews;

CREATE POLICY "okr_objective_reviews_select_v2" ON public.okr_objective_reviews
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'okrs.view:bu')
);

CREATE POLICY "okr_objective_reviews_insert_v2" ON public.okr_objective_reviews
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.team_objective.update:self_or_owner')
);
