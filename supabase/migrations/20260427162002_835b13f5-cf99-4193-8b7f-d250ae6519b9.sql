-- Wave 4: Hardening RLS — endurecer SELECT policies para impedir
-- vazamento cross-BU em KPIs, OKRs e Análises.
--
-- Padrão canônico (alinhado a tickets, projects, teams, squads):
--   is_profile_bu_member(my_profile_id(), bu_id)
--   AND is_current_bu(bu_id)            <-- nova restrição
--   AND <permission gate atual>
--
-- is_current_bu já contempla bypass para platform_admin via is_platform_admin(auth.uid()).
-- Nenhuma mudança em INSERT/UPDATE/DELETE: continuam protegidas pelas policies de mutação existentes.

-- ============================================================
-- ANALYSIS REPORTS
-- ============================================================
DROP POLICY IF EXISTS analysis_reports_select_v1 ON public.analysis_reports;
CREATE POLICY analysis_reports_select_v2
ON public.analysis_reports
FOR SELECT
USING (
  deleted_at IS NULL
  AND is_profile_bu_member(my_profile_id(), bu_id)
  AND is_current_bu(bu_id)
);

-- ============================================================
-- KPIs
-- ============================================================
DROP POLICY IF EXISTS kpi_metrics_select_v2 ON public.kpi_metrics;
CREATE POLICY kpi_metrics_select_v3
ON public.kpi_metrics
FOR SELECT
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND is_current_bu(bu_id)
  AND (
    has_permission(my_profile_id(), bu_id, 'kpis.metric.read:bu')
    OR has_permission(my_profile_id(), bu_id, 'kpis.metric.view:bu')
    OR has_permission(my_profile_id(), bu_id, 'kpis.view:bu')
  )
);

DROP POLICY IF EXISTS kpi_values_select_v2 ON public.kpi_values;
CREATE POLICY kpi_values_select_v3
ON public.kpi_values
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM kpi_metrics m
    WHERE m.id = kpi_values.kpi_id
      AND is_profile_bu_member(my_profile_id(), m.bu_id)
      AND is_current_bu(m.bu_id)
      AND (
        has_permission(my_profile_id(), m.bu_id, 'kpis.value.read:bu')
        OR has_permission(my_profile_id(), m.bu_id, 'kpis.view:bu')
      )
  )
);

-- ============================================================
-- OKRs — Org
-- ============================================================
DROP POLICY IF EXISTS okr_org_objectives_select_v2 ON public.okr_org_objectives;
CREATE POLICY okr_org_objectives_select_v3
ON public.okr_org_objectives
FOR SELECT
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND is_current_bu(bu_id)
  AND (
    has_permission(my_profile_id(), bu_id, 'okrs.org_objective.read:bu')
    OR has_permission(my_profile_id(), bu_id, 'okrs.view:bu')
  )
);

DROP POLICY IF EXISTS okr_org_key_results_select_v2 ON public.okr_org_key_results;
CREATE POLICY okr_org_key_results_select_v3
ON public.okr_org_key_results
FOR SELECT
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND is_current_bu(bu_id)
  AND (
    has_permission(my_profile_id(), bu_id, 'okrs.org_kr.read:bu')
    OR has_permission(my_profile_id(), bu_id, 'okrs.view:bu')
  )
);

-- ============================================================
-- OKRs — Team
-- ============================================================
DROP POLICY IF EXISTS okr_team_objectives_select_v2 ON public.okr_team_objectives;
CREATE POLICY okr_team_objectives_select_v3
ON public.okr_team_objectives
FOR SELECT
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND is_current_bu(bu_id)
  AND (
    has_permission(my_profile_id(), bu_id, 'okrs.team_objective.read:team_tree')
    OR has_permission(my_profile_id(), bu_id, 'okrs.view:bu')
  )
);

DROP POLICY IF EXISTS okr_team_key_results_select_v2 ON public.okr_team_key_results;
CREATE POLICY okr_team_key_results_select_v3
ON public.okr_team_key_results
FOR SELECT
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND is_current_bu(bu_id)
  AND (
    has_permission(my_profile_id(), bu_id, 'okrs.team_kr.read:team_tree')
    OR has_permission(my_profile_id(), bu_id, 'okrs.view:bu')
  )
);
