-- Atualizar RPC para filtrar também status 'discarded' (TCR §2.2)
-- Esta alteração garante que OKRs canceladas E descartadas sejam excluídas

-- Primeiro, remover a função existente
DROP FUNCTION IF EXISTS public.rpc_okr_dashboard_data(UUID, INTEGER, TEXT, UUID);

-- Recriar função com filtro de status 'discarded'
CREATE FUNCTION public.rpc_okr_dashboard_data(
  p_bu_id UUID,
  p_year INTEGER,
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

  -- 2) Org Objectives com KRs (excluindo cancelados e descartados)
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
          AND kr.cancelled_at IS NULL
      ), '[]'::jsonb)
    ) ORDER BY o.created_at
  ), '[]'::jsonb)
  INTO v_org_objectives
  FROM okr_org_objectives o
  WHERE o.bu_id = p_bu_id 
    AND o.year = p_year 
    AND o.deleted_at IS NULL
    AND o.cancelled_at IS NULL
    AND o.status NOT IN ('cancelled', 'discarded');

  -- 3) Team Objectives com KRs (excluindo cancelados e descartados)
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
          AND kr.cancelled_at IS NULL
      ), '[]'::jsonb)
    ) ORDER BY o.created_at
  ), '[]'::jsonb)
  INTO v_team_objectives
  FROM okr_team_objectives o
  JOIN teams tm ON tm.id = o.team_id
  WHERE o.bu_id = p_bu_id 
    AND o.deleted_at IS NULL
    AND o.cancelled_at IS NULL
    AND o.status NOT IN ('cancelled', 'discarded')
    AND (p_team_id IS NULL OR o.team_id = p_team_id);

  -- 4) All Org KRs para cálculos (excluindo cancelados e descartados)
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
    AND o.cancelled_at IS NULL
    AND o.status NOT IN ('cancelled', 'discarded')
    AND kr.deleted_at IS NULL
    AND kr.cancelled_at IS NULL;

  -- 5) All Team KRs para cálculos (excluindo cancelados e descartados)
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
    AND o.cancelled_at IS NULL
    AND o.status NOT IN ('cancelled', 'discarded')
    AND kr.deleted_at IS NULL
    AND kr.cancelled_at IS NULL
    AND (p_team_id IS NULL OR o.team_id = p_team_id);

  -- 6) Pending checkins count (KRs sem check-in nos últimos 7 dias)
  SELECT COUNT(*)::INTEGER
  INTO v_pending_checkins_count
  FROM okr_team_key_results kr
  JOIN okr_team_objectives o ON o.id = kr.team_objective_id
  WHERE o.bu_id = p_bu_id 
    AND o.deleted_at IS NULL 
    AND o.cancelled_at IS NULL
    AND o.status NOT IN ('cancelled', 'discarded')
    AND kr.deleted_at IS NULL
    AND kr.cancelled_at IS NULL
    AND (p_team_id IS NULL OR o.team_id = p_team_id)
    AND (kr.last_checkin_at IS NULL OR kr.last_checkin_at < NOW() - INTERVAL '7 days');

  -- 7) Latest checkin date
  SELECT MAX(kr.last_checkin_at)
  INTO v_latest_checkin_date
  FROM okr_team_key_results kr
  JOIN okr_team_objectives o ON o.id = kr.team_objective_id
  WHERE o.bu_id = p_bu_id 
    AND o.deleted_at IS NULL 
    AND o.cancelled_at IS NULL
    AND o.status NOT IN ('cancelled', 'discarded')
    AND kr.deleted_at IS NULL
    AND kr.cancelled_at IS NULL
    AND (p_team_id IS NULL OR o.team_id = p_team_id);

  -- 8) Shared OKRs insights
  SELECT jsonb_build_object(
    'shared_okrs_count', COALESCE((
      SELECT COUNT(DISTINCT kr.id)
      FROM okr_team_key_results kr
      JOIN okr_team_objectives o ON o.id = kr.team_objective_id
      WHERE o.bu_id = p_bu_id 
        AND o.deleted_at IS NULL 
        AND o.cancelled_at IS NULL
        AND o.status NOT IN ('cancelled', 'discarded')
        AND kr.deleted_at IS NULL
        AND kr.cancelled_at IS NULL
        AND kr.linked_org_kr_id IS NOT NULL
    ), 0),
    'total_team_krs', COALESCE((
      SELECT COUNT(*)
      FROM okr_team_key_results kr
      JOIN okr_team_objectives o ON o.id = kr.team_objective_id
      WHERE o.bu_id = p_bu_id 
        AND o.deleted_at IS NULL 
        AND o.cancelled_at IS NULL
        AND o.status NOT IN ('cancelled', 'discarded')
        AND kr.deleted_at IS NULL
        AND kr.cancelled_at IS NULL
    ), 0),
    'overdue_shared_count', 0
  )
  INTO v_shared_insights;

  -- Build result
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

-- Comentário para documentar a mudança
COMMENT ON FUNCTION public.rpc_okr_dashboard_data IS 'RPC agregada do dashboard OKR. Filtra status cancelled E discarded (TCR §2.2 v2.75.0)';