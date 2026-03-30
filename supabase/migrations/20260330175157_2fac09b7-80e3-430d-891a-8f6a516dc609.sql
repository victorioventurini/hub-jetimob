-- RPC: Count expected collaborator check-in participants for a team in a cycle
-- Returns the count of distinct users who are linked to active KRs, initiatives,
-- projects/milestones, or KPIs for a given team in a specific cycle.
-- Also counts how many completed collaborator sessions exist near a given date.

CREATE OR REPLACE FUNCTION public.count_collaborator_checkin_expected(
  p_bu_id uuid,
  p_team_id uuid,
  p_cycle_id uuid
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::integer
  FROM (
    -- KR owners
    SELECT kr.owner_user_id AS user_id
    FROM okr_team_key_results kr
    JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
    WHERE obj.team_id = p_team_id
      AND obj.cycle_id = p_cycle_id
      AND obj.deleted_at IS NULL
      AND kr.deleted_at IS NULL
      AND kr.owner_user_id IS NOT NULL

    UNION

    -- KR co-responsibles
    SELECT unnest(kr.co_responsibles) AS user_id
    FROM okr_team_key_results kr
    JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
    WHERE obj.team_id = p_team_id
      AND obj.cycle_id = p_cycle_id
      AND obj.deleted_at IS NULL
      AND kr.deleted_at IS NULL
      AND kr.co_responsibles IS NOT NULL

    UNION

    -- Initiative owners
    SELECT ini.owner_user_id AS user_id
    FROM okr_initiatives ini
    JOIN okr_team_key_results kr ON kr.id = ini.kr_id
    JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
    WHERE obj.team_id = p_team_id
      AND obj.cycle_id = p_cycle_id
      AND obj.deleted_at IS NULL
      AND kr.deleted_at IS NULL
      AND ini.deleted_at IS NULL
      AND ini.owner_user_id IS NOT NULL

    UNION

    -- Initiative contributors
    SELECT unnest(ini.contributors) AS user_id
    FROM okr_initiatives ini
    JOIN okr_team_key_results kr ON kr.id = ini.kr_id
    JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
    WHERE obj.team_id = p_team_id
      AND obj.cycle_id = p_cycle_id
      AND obj.deleted_at IS NULL
      AND kr.deleted_at IS NULL
      AND ini.deleted_at IS NULL
      AND ini.contributors IS NOT NULL

    UNION

    -- Project owners (via project_teams)
    SELECT p.owner_id AS user_id
    FROM projects p
    JOIN project_teams pt ON pt.project_id = p.id
    WHERE pt.team_id = p_team_id
      AND p.bu_id = p_bu_id
      AND p.deleted_at IS NULL
      AND p.owner_id IS NOT NULL

    UNION

    -- Milestone owners (via project_teams)
    SELECT pm.owner_id AS user_id
    FROM project_milestones pm
    JOIN projects p ON p.id = pm.project_id
    JOIN project_teams pt ON pt.project_id = p.id
    WHERE pt.team_id = p_team_id
      AND p.bu_id = p_bu_id
      AND p.deleted_at IS NULL
      AND pm.owner_id IS NOT NULL

    UNION

    -- KPI data contributors (for team KPIs)
    SELECT dc.contributor_user_id AS user_id
    FROM kpi_data_contributors dc
    JOIN kpi_metrics km ON km.id = dc.kpi_id
    WHERE km.team_id = p_team_id
      AND km.bu_id = p_bu_id
      AND km.deleted_at IS NULL
      AND dc.deleted_at IS NULL
  ) eligible
  WHERE user_id IS NOT NULL;
$$;

-- RPC: Count completed collaborator sessions for a team within a date range
-- Returns an array of {planned_date, completed_count} for use in calendar view
CREATE OR REPLACE FUNCTION public.count_collaborator_sessions_by_date(
  p_bu_id uuid,
  p_team_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(session_date date, completed_count integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ws.completed_at::date AS session_date,
    COUNT(DISTINCT ws.started_by)::integer AS completed_count
  FROM okr_wizard_sessions ws
  WHERE ws.bu_id = p_bu_id
    AND ws.team_id = p_team_id
    AND ws.wizard_type = 'collaborator'
    AND ws.status = 'completed'
    AND ws.completed_at IS NOT NULL
    AND ws.completed_at::date >= p_start_date
    AND ws.completed_at::date < p_end_date
  GROUP BY ws.completed_at::date;
$$;