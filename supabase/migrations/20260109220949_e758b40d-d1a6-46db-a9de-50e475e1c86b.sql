-- ============================================================
-- IDENTITY CUTOVER v3.0 — FASE 0.5 (Parte 4): OKRs (CORRIGIDO)
-- ============================================================
-- Tabelas COM bu_id: okr_checkins, okr_coaching_events, okr_contributions,
--   okr_initiatives, okr_insights, okr_objective_reviews, okr_org_key_results,
--   okr_org_objectives, okr_team_key_results, okr_team_objectives
-- Tabelas SEM bu_id: okr_dependencies (join kr), okr_team_objective_contributors (join objective)
-- ============================================================

-- okr_checkins (SELECT + INSERT)
DROP POLICY IF EXISTS "okr_checkins_select" ON okr_checkins;
CREATE POLICY "okr_checkins_select" ON okr_checkins
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

DROP POLICY IF EXISTS "okr_checkins_insert" ON okr_checkins;
CREATE POLICY "okr_checkins_insert" ON okr_checkins
FOR INSERT WITH CHECK (is_profile_bu_member(my_profile_id(), bu_id));

-- okr_coaching_events (SELECT + INSERT)
DROP POLICY IF EXISTS "okr_coaching_events_select" ON okr_coaching_events;
CREATE POLICY "okr_coaching_events_select" ON okr_coaching_events
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

DROP POLICY IF EXISTS "okr_coaching_events_insert" ON okr_coaching_events;
CREATE POLICY "okr_coaching_events_insert" ON okr_coaching_events
FOR INSERT WITH CHECK (is_profile_bu_member(my_profile_id(), bu_id));

-- okr_contributions (SELECT + ALL)
DROP POLICY IF EXISTS "okr_contributions_select" ON okr_contributions;
CREATE POLICY "okr_contributions_select" ON okr_contributions
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

DROP POLICY IF EXISTS "okr_contributions_manage" ON okr_contributions;
CREATE POLICY "okr_contributions_manage" ON okr_contributions
FOR ALL USING (is_profile_bu_member(my_profile_id(), bu_id));

-- okr_dependencies (SEM bu_id - usa join com okr_team_key_results)
DROP POLICY IF EXISTS "okr_dependencies_manage" ON okr_dependencies;
CREATE POLICY "okr_dependencies_manage" ON okr_dependencies
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM okr_team_key_results kr
    WHERE kr.id = okr_dependencies.kr_id 
      AND is_profile_bu_member(my_profile_id(), kr.bu_id)
  )
);

-- okr_initiatives (SELECT + ALL)
DROP POLICY IF EXISTS "okr_initiatives_select" ON okr_initiatives;
CREATE POLICY "okr_initiatives_select" ON okr_initiatives
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

DROP POLICY IF EXISTS "okr_initiatives_manage" ON okr_initiatives;
CREATE POLICY "okr_initiatives_manage" ON okr_initiatives
FOR ALL USING (is_profile_bu_member(my_profile_id(), bu_id));

-- okr_insights
DROP POLICY IF EXISTS "okr_insights_select" ON okr_insights;
CREATE POLICY "okr_insights_select" ON okr_insights
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

-- okr_objective_reviews (SELECT + INSERT)
DROP POLICY IF EXISTS "okr_objective_reviews_select" ON okr_objective_reviews;
CREATE POLICY "okr_objective_reviews_select" ON okr_objective_reviews
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

DROP POLICY IF EXISTS "okr_objective_reviews_insert" ON okr_objective_reviews;
CREATE POLICY "okr_objective_reviews_insert" ON okr_objective_reviews
FOR INSERT WITH CHECK (is_profile_bu_member(my_profile_id(), bu_id));

-- okr_org_key_results (SELECT + ALL)
DROP POLICY IF EXISTS "okr_org_key_results_select" ON okr_org_key_results;
CREATE POLICY "okr_org_key_results_select" ON okr_org_key_results
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

DROP POLICY IF EXISTS "okr_org_key_results_manage" ON okr_org_key_results;
CREATE POLICY "okr_org_key_results_manage" ON okr_org_key_results
FOR ALL USING (is_profile_bu_member(my_profile_id(), bu_id));

-- okr_org_objectives (SELECT + ALL)
DROP POLICY IF EXISTS "okr_org_objectives_select" ON okr_org_objectives;
CREATE POLICY "okr_org_objectives_select" ON okr_org_objectives
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

DROP POLICY IF EXISTS "okr_org_objectives_manage" ON okr_org_objectives;
CREATE POLICY "okr_org_objectives_manage" ON okr_org_objectives
FOR ALL USING (is_profile_bu_member(my_profile_id(), bu_id));

-- okr_team_key_results (SELECT + ALL)
DROP POLICY IF EXISTS "okr_team_key_results_select" ON okr_team_key_results;
CREATE POLICY "okr_team_key_results_select" ON okr_team_key_results
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

DROP POLICY IF EXISTS "okr_team_key_results_manage" ON okr_team_key_results;
CREATE POLICY "okr_team_key_results_manage" ON okr_team_key_results
FOR ALL USING (is_profile_bu_member(my_profile_id(), bu_id));

-- okr_team_objective_contributors (SEM bu_id - usa join com okr_team_objectives)
DROP POLICY IF EXISTS "okr_team_objective_contributors_manage" ON okr_team_objective_contributors;
CREATE POLICY "okr_team_objective_contributors_manage" ON okr_team_objective_contributors
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM okr_team_objectives o
    WHERE o.id = okr_team_objective_contributors.objective_id 
      AND is_profile_bu_member(my_profile_id(), o.bu_id)
  )
);

-- okr_team_objectives (SELECT + INSERT + UPDATE + DELETE)
DROP POLICY IF EXISTS "okr_team_objectives_select" ON okr_team_objectives;
CREATE POLICY "okr_team_objectives_select" ON okr_team_objectives
FOR SELECT USING (is_profile_bu_member(my_profile_id(), bu_id));

DROP POLICY IF EXISTS "okr_team_objectives_insert" ON okr_team_objectives;
CREATE POLICY "okr_team_objectives_insert" ON okr_team_objectives
FOR INSERT WITH CHECK (
  is_profile_bu_member(my_profile_id(), bu_id) 
  AND can_manage_team_okr(auth.uid(), team_id)
);

DROP POLICY IF EXISTS "okr_team_objectives_update" ON okr_team_objectives;
CREATE POLICY "okr_team_objectives_update" ON okr_team_objectives
FOR UPDATE USING (
  is_profile_bu_member(my_profile_id(), bu_id) 
  AND can_manage_team_okr(auth.uid(), team_id)
) WITH CHECK (
  is_profile_bu_member(my_profile_id(), bu_id) 
  AND can_manage_team_okr(auth.uid(), team_id)
);

DROP POLICY IF EXISTS "okr_team_objectives_delete" ON okr_team_objectives;
CREATE POLICY "okr_team_objectives_delete" ON okr_team_objectives
FOR DELETE USING (
  is_profile_bu_member(my_profile_id(), bu_id) 
  AND can_manage_team_okr(auth.uid(), team_id)
);