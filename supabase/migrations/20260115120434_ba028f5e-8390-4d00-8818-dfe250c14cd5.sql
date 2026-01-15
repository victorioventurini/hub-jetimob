-- Correção: rpc_okr_dashboard_data deve excluir objetivos e KRs cancelados
CREATE OR REPLACE FUNCTION public.rpc_okr_dashboard_data(
  p_bu_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  p_view TEXT DEFAULT 'company',
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
    FROM teams
    WHERE bu_id = p_bu_id AND deleted_at IS NULL
  ) t;

  -- 2) Org Objectives com KRs (excluindo cancelados)
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
        WHERE kr.org_objective_id = o.id 
          AND kr.deleted_at IS NULL
          AND kr.cancelled_at IS NULL  -- NOVO
      ), '[]'::jsonb)
    ) ORDER BY o.created_at
  ), '[]'::jsonb)
  INTO v_org_objectives
  FROM okr_org_objectives o
  WHERE o.bu_id = p_bu_id 
    AND o.year = p_year 
    AND o.deleted_at IS NULL
    AND o.cancelled_at IS NULL  -- NOVO
    AND o.status != 'cancelled';  -- NOVO

  -- 3) Team Objectives com KRs (excluindo cancelados)
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
        WHERE kr.team_objective_id = o.id 
          AND kr.deleted_at IS NULL
          AND kr.cancelled_at IS NULL  -- NOVO
      ), '[]'::jsonb)
    ) ORDER BY o.created_at
  ), '[]'::jsonb)
  INTO v_team_objectives
  FROM okr_team_objectives o
  JOIN teams tm ON tm.id = o.team_id
  WHERE o.bu_id = p_bu_id 
    AND o.deleted_at IS NULL
    AND o.cancelled_at IS NULL  -- NOVO
    AND o.status != 'cancelled'  -- NOVO
    AND (p_team_id IS NULL OR o.team_id = p_team_id);

  -- 4) All Org KRs para cálculos (excluindo cancelados)
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
    AND o.cancelled_at IS NULL  -- NOVO
    AND kr.deleted_at IS NULL
    AND kr.cancelled_at IS NULL;  -- NOVO

  -- 5) All Team KRs para cálculos (excluindo cancelados)
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
    AND o.cancelled_at IS NULL  -- NOVO
    AND kr.deleted_at IS NULL
    AND kr.cancelled_at IS NULL  -- NOVO
    AND (p_team_id IS NULL OR o.team_id = p_team_id);

  -- 6) Latest check-in date
  SELECT MAX(c.created_at)
  INTO v_latest_checkin_date
  FROM okr_checkins c
  JOIN okr_team_key_results kr ON kr.id = c.team_kr_id
  JOIN okr_team_objectives o ON o.id = kr.team_objective_id
  WHERE o.bu_id = p_bu_id 
    AND kr.deleted_at IS NULL
    AND kr.cancelled_at IS NULL
    AND (p_team_id IS NULL OR o.team_id = p_team_id);

  -- 7) Pending checkins count (usa v_pending_checkins que já filtra cancelados)
  SELECT COUNT(*)
  INTO v_pending_checkins_count
  FROM v_pending_checkins pc
  JOIN teams t ON t.id = pc.team_id
  WHERE t.bu_id = p_bu_id
    AND pc.is_overdue = true
    AND (p_team_id IS NULL OR pc.team_id = p_team_id);

  -- 8) Status counts para KRs de time
  SELECT jsonb_build_object(
    'green', COALESCE(SUM(CASE WHEN kr.status = 'green' THEN 1 ELSE 0 END), 0),
    'yellow', COALESCE(SUM(CASE WHEN kr.status = 'yellow' THEN 1 ELSE 0 END), 0),
    'red', COALESCE(SUM(CASE WHEN kr.status = 'red' THEN 1 ELSE 0 END), 0),
    'not_started', COALESCE(SUM(CASE WHEN kr.status = 'not_started' THEN 1 ELSE 0 END), 0)
  )
  INTO v_status_counts
  FROM okr_team_key_results kr
  JOIN okr_team_objectives o ON o.id = kr.team_objective_id
  WHERE o.bu_id = p_bu_id 
    AND kr.deleted_at IS NULL
    AND kr.cancelled_at IS NULL
    AND o.deleted_at IS NULL
    AND o.cancelled_at IS NULL
    AND (p_team_id IS NULL OR o.team_id = p_team_id);

  -- 9) Overall progress (média de progresso de todas as KRs ativas)
  SELECT COALESCE(AVG(
    CASE 
      WHEN kr.target = kr.baseline THEN 0
      WHEN kr.direction = 'up' THEN 
        LEAST(100, GREATEST(0, ((kr.current_value - kr.baseline) / NULLIF(kr.target - kr.baseline, 0)) * 100))
      ELSE 
        LEAST(100, GREATEST(0, ((kr.baseline - kr.current_value) / NULLIF(kr.baseline - kr.target, 0)) * 100))
    END
  ), 0)
  INTO v_overall_progress
  FROM okr_team_key_results kr
  JOIN okr_team_objectives o ON o.id = kr.team_objective_id
  WHERE o.bu_id = p_bu_id 
    AND kr.deleted_at IS NULL
    AND kr.cancelled_at IS NULL
    AND kr.status != 'not_started'
    AND o.deleted_at IS NULL
    AND o.cancelled_at IS NULL
    AND (p_team_id IS NULL OR o.team_id = p_team_id);

  -- 10) Shared insights (avisos importantes)
  v_shared_insights := '[]'::jsonb;

  -- Build result
  v_result := jsonb_build_object(
    'teams', v_teams,
    'org_objectives', v_org_objectives,
    'team_objectives', v_team_objectives,
    'org_krs', v_org_krs,
    'team_krs', v_team_krs,
    'status_counts', v_status_counts,
    'overall_progress', ROUND(v_overall_progress, 1),
    'pending_checkins_count', v_pending_checkins_count,
    'latest_checkin_date', v_latest_checkin_date,
    'shared_insights', v_shared_insights
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.rpc_okr_dashboard_data IS 'Dados consolidados do dashboard de OKRs. Exclui objetivos e KRs deletados ou cancelados.';