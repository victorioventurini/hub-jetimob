-- RPC agregadora para o dashboard de OKRs
-- Consolida: teams, orgObjectives, teamObjectives, orgKrs, teamKrs, pendingCheckins, latestCheckinDate, sharedInsights

CREATE OR REPLACE FUNCTION public.rpc_okr_dashboard_data(
  p_bu_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  p_view TEXT DEFAULT 'company', -- 'company' | 'team' | 'my'
  p_team_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_teams JSONB;
  v_org_objectives JSONB;
  v_team_objectives JSONB;
  v_org_krs JSONB;
  v_team_krs JSONB;
  v_status_counts JSONB;
  v_overall_progress NUMERIC;
  v_pending_checkins_count INTEGER;
  v_latest_checkin_date TIMESTAMPTZ;
  v_shared_insights JSONB;
BEGIN
  -- 1) Teams da BU
  SELECT COALESCE(jsonb_agg(t ORDER BY t.name), '[]'::jsonb)
  INTO v_teams
  FROM (
    SELECT id, name, description, parent_team_id, created_at
    FROM okr_teams
    WHERE bu_id = p_bu_id AND deleted_at IS NULL
  ) t;

  -- 2) Org Objectives com KRs (para company view)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'title', o.title,
      'description', o.description,
      'year', o.year,
      'status', o.status,
      'created_at', o.created_at,
      'key_results', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', kr.id,
            'title', kr.title,
            'baseline', kr.baseline,
            'current_value', kr.current_value,
            'target', kr.target,
            'direction', kr.direction,
            'unit', kr.unit,
            'status', kr.status
          ) ORDER BY kr.created_at
        )
        FROM okr_org_key_results kr
        WHERE kr.org_objective_id = o.id AND kr.deleted_at IS NULL
      ), '[]'::jsonb)
    ) ORDER BY o.created_at
  ), '[]'::jsonb)
  INTO v_org_objectives
  FROM okr_org_objectives o
  WHERE o.bu_id = p_bu_id 
    AND o.year = p_year 
    AND o.deleted_at IS NULL;

  -- 3) Team Objectives com KRs (filtra por team_id se fornecido)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'title', o.title,
      'description', o.description,
      'status', o.status,
      'team_id', o.team_id,
      'team', jsonb_build_object('id', tm.id, 'name', tm.name),
      'created_at', o.created_at,
      'key_results', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', kr.id,
            'title', kr.title,
            'baseline', kr.baseline,
            'current_value', kr.current_value,
            'target', kr.target,
            'direction', kr.direction,
            'unit', kr.unit,
            'status', kr.status,
            'linked_org_kr_id', kr.linked_org_kr_id
          ) ORDER BY kr.created_at
        )
        FROM okr_team_key_results kr
        WHERE kr.team_objective_id = o.id AND kr.deleted_at IS NULL
      ), '[]'::jsonb)
    ) ORDER BY o.created_at
  ), '[]'::jsonb)
  INTO v_team_objectives
  FROM okr_team_objectives o
  JOIN okr_teams tm ON tm.id = o.team_id
  WHERE o.bu_id = p_bu_id 
    AND o.deleted_at IS NULL
    AND (p_team_id IS NULL OR o.team_id = p_team_id);

  -- 4) All Org KRs para cálculos
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', kr.id,
      'baseline', kr.baseline,
      'current_value', kr.current_value,
      'target', kr.target,
      'direction', kr.direction,
      'status', kr.status
    )
  ), '[]'::jsonb)
  INTO v_org_krs
  FROM okr_org_key_results kr
  JOIN okr_org_objectives o ON o.id = kr.org_objective_id
  WHERE o.bu_id = p_bu_id 
    AND o.year = p_year 
    AND o.deleted_at IS NULL 
    AND kr.deleted_at IS NULL;

  -- 5) All Team KRs para cálculos
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', kr.id,
      'baseline', kr.baseline,
      'current_value', kr.current_value,
      'target', kr.target,
      'direction', kr.direction,
      'status', kr.status,
      'linked_org_kr_id', kr.linked_org_kr_id
    )
  ), '[]'::jsonb)
  INTO v_team_krs
  FROM okr_team_key_results kr
  JOIN okr_team_objectives o ON o.id = kr.team_objective_id
  WHERE o.bu_id = p_bu_id 
    AND o.deleted_at IS NULL 
    AND kr.deleted_at IS NULL
    AND (p_team_id IS NULL OR o.team_id = p_team_id);

  -- 6) Latest check-in date
  SELECT MAX(c.created_at)
  INTO v_latest_checkin_date
  FROM okr_checkins c
  JOIN okr_team_key_results kr ON kr.id = c.team_kr_id
  JOIN okr_team_objectives o ON o.id = kr.team_objective_id
  WHERE o.bu_id = p_bu_id AND kr.deleted_at IS NULL;

  -- 7) Pending check-ins count (overdue)
  SELECT COUNT(*)::INTEGER
  INTO v_pending_checkins_count
  FROM okr_team_key_results kr
  JOIN okr_team_objectives o ON o.id = kr.team_objective_id
  WHERE o.bu_id = p_bu_id 
    AND kr.deleted_at IS NULL 
    AND o.deleted_at IS NULL
    AND kr.status = 'active'
    AND (kr.last_checkin_at IS NULL OR kr.last_checkin_at < NOW() - INTERVAL '7 days');

  -- 8) Shared OKRs insights
  SELECT jsonb_build_object(
    'shared_okrs_count', COUNT(*) FILTER (WHERE kr.linked_org_kr_id IS NOT NULL),
    'total_team_krs', COUNT(*),
    'overdue_shared_count', COUNT(*) FILTER (
      WHERE kr.linked_org_kr_id IS NOT NULL 
      AND kr.status = 'active'
      AND (kr.last_checkin_at IS NULL OR kr.last_checkin_at < NOW() - INTERVAL '7 days')
    )
  )
  INTO v_shared_insights
  FROM okr_team_key_results kr
  JOIN okr_team_objectives o ON o.id = kr.team_objective_id
  WHERE o.bu_id = p_bu_id AND kr.deleted_at IS NULL AND o.deleted_at IS NULL;

  -- Build final result
  v_result := jsonb_build_object(
    'teams', v_teams,
    'org_objectives', v_org_objectives,
    'team_objectives', v_team_objectives,
    'org_krs', v_org_krs,
    'team_krs', v_team_krs,
    'latest_checkin_date', v_latest_checkin_date,
    'pending_checkins_count', v_pending_checkins_count,
    'shared_insights', v_shared_insights,
    'meta', jsonb_build_object(
      'bu_id', p_bu_id,
      'year', p_year,
      'view', p_view,
      'team_id', p_team_id,
      'fetched_at', NOW()
    )
  );

  RETURN v_result;
END;
$$;

-- Grant execute para authenticated users
GRANT EXECUTE ON FUNCTION public.rpc_okr_dashboard_data(UUID, INTEGER, TEXT, UUID) TO authenticated;