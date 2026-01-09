-- Corrige RPC get_cycle_checkins com nomes de colunas corretos
-- Problema: RPC usava nomes incorretos (key_result_id, objective_id, created_by, owner_profile_id)
-- Correcao: Usar nomes reais (kr_id, team_objective_id, user_id, owner_user_id)

CREATE OR REPLACE FUNCTION public.get_cycle_checkins(
  p_cycle_id uuid,
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_bu_id uuid;
  v_result jsonb;
  v_feed jsonb;
  v_aggregates jsonb;
  v_overdue_krs jsonb;
  v_page integer;
  v_page_size integer;
  v_offset integer;
  v_total_count integer;
  v_search text;
  v_team_id uuid;
  v_owner_id uuid;
  v_status text;
  v_sort_by text;
  v_sort_order text;
BEGIN
  -- Obter bu_id do ciclo
  SELECT bu_id INTO v_bu_id FROM cycles WHERE id = p_cycle_id;
  
  IF v_bu_id IS NULL THEN
    RETURN jsonb_build_object(
      'feed', '[]'::jsonb,
      'aggregates', jsonb_build_object(
        'total_checkins', 0,
        'checkins_this_week', 0,
        'unique_krs_with_checkins', 0,
        'total_krs', 0,
        'overdue_krs', 0,
        'avg_progress', 0
      ),
      'overdue_krs', '[]'::jsonb,
      'pagination', jsonb_build_object('page', 1, 'page_size', 20, 'total_count', 0, 'total_pages', 0)
    );
  END IF;

  -- Extrair filtros
  v_page := COALESCE((p_filters->>'page')::integer, 1);
  v_page_size := LEAST(COALESCE((p_filters->>'page_size')::integer, 20), 100);
  v_offset := (v_page - 1) * v_page_size;
  v_search := NULLIF(TRIM(p_filters->>'search'), '');
  v_team_id := NULLIF(p_filters->>'team_id', '')::uuid;
  v_owner_id := NULLIF(p_filters->>'owner_id', '')::uuid;
  v_status := NULLIF(p_filters->>'status', '');
  v_sort_by := COALESCE(NULLIF(p_filters->>'sort_by', ''), 'created_at');
  v_sort_order := COALESCE(NULLIF(p_filters->>'sort_order', ''), 'desc');

  -- Contar total para paginacao
  SELECT COUNT(*)::integer INTO v_total_count
  FROM okr_checkins c
  INNER JOIN okr_team_key_results kr ON kr.id = c.kr_id
  INNER JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
  INNER JOIN profiles p ON p.id = c.user_id
  WHERE obj.cycle_id = p_cycle_id
    AND (v_search IS NULL OR (
      kr.title ILIKE '%' || v_search || '%' OR
      c.notes ILIKE '%' || v_search || '%' OR
      p.full_name ILIKE '%' || v_search || '%'
    ))
    AND (v_team_id IS NULL OR obj.team_id = v_team_id)
    AND (v_owner_id IS NULL OR kr.owner_user_id = v_owner_id)
    AND (v_status IS NULL OR kr.status = v_status);

  -- Buscar feed de check-ins
  SELECT COALESCE(jsonb_agg(row_to_json(feed_data)::jsonb ORDER BY 
    CASE WHEN v_sort_order = 'desc' THEN feed_data.created_at END DESC,
    CASE WHEN v_sort_order = 'asc' THEN feed_data.created_at END ASC
  ), '[]'::jsonb)
  INTO v_feed
  FROM (
    SELECT 
      c.id,
      c.kr_id as key_result_id,
      c.previous_value,
      c.new_value,
      c.notes,
      c.confidence_level,
      c.created_at,
      c.user_id as created_by,
      jsonb_build_object(
        'id', kr.id,
        'title', kr.title,
        'current_value', kr.current_value,
        'target_value', kr.target_value,
        'start_value', kr.start_value,
        'unit', kr.unit,
        'status', kr.status,
        'progress', CASE 
          WHEN kr.target_value = kr.start_value THEN 100
          ELSE ROUND(((kr.current_value - kr.start_value)::numeric / NULLIF(kr.target_value - kr.start_value, 0)::numeric) * 100, 1)
        END
      ) as key_result,
      jsonb_build_object(
        'id', obj.id,
        'title', obj.title
      ) as objective,
      jsonb_build_object(
        'id', t.id,
        'name', t.name
      ) as team,
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url
      ) as author,
      jsonb_build_object(
        'id', owner_p.id,
        'full_name', owner_p.full_name,
        'avatar_url', owner_p.avatar_url
      ) as owner,
      EXTRACT(DAY FROM (NOW() - c.created_at))::integer as days_since
    FROM okr_checkins c
    INNER JOIN okr_team_key_results kr ON kr.id = c.kr_id
    INNER JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
    INNER JOIN teams t ON t.id = obj.team_id
    INNER JOIN profiles p ON p.id = c.user_id
    LEFT JOIN profiles owner_p ON owner_p.id = kr.owner_user_id
    WHERE obj.cycle_id = p_cycle_id
      AND (v_search IS NULL OR (
        kr.title ILIKE '%' || v_search || '%' OR
        c.notes ILIKE '%' || v_search || '%' OR
        p.full_name ILIKE '%' || v_search || '%'
      ))
      AND (v_team_id IS NULL OR obj.team_id = v_team_id)
      AND (v_owner_id IS NULL OR kr.owner_user_id = v_owner_id)
      AND (v_status IS NULL OR kr.status = v_status)
    ORDER BY c.created_at DESC
    LIMIT v_page_size
    OFFSET v_offset
  ) feed_data;

  -- Calcular agregados
  SELECT jsonb_build_object(
    'total_checkins', COALESCE(COUNT(c.id), 0),
    'checkins_this_week', COALESCE(SUM(CASE WHEN c.created_at >= DATE_TRUNC('week', NOW()) THEN 1 ELSE 0 END), 0),
    'unique_krs_with_checkins', COALESCE(COUNT(DISTINCT c.kr_id), 0),
    'total_krs', (SELECT COUNT(*) FROM okr_team_key_results kr2 
                  INNER JOIN okr_team_objectives obj2 ON obj2.id = kr2.team_objective_id 
                  WHERE obj2.cycle_id = p_cycle_id),
    'overdue_krs', (SELECT COUNT(*) FROM okr_team_key_results kr3
                    INNER JOIN okr_team_objectives obj3 ON obj3.id = kr3.team_objective_id
                    WHERE obj3.cycle_id = p_cycle_id
                      AND kr3.status NOT IN ('completed', 'cancelled')
                      AND (kr3.last_checkin_at IS NULL OR kr3.last_checkin_at < NOW() - INTERVAL '7 days')),
    'avg_progress', COALESCE((
      SELECT ROUND(AVG(
        CASE 
          WHEN kr4.target_value = kr4.start_value THEN 100
          ELSE ((kr4.current_value - kr4.start_value)::numeric / NULLIF(kr4.target_value - kr4.start_value, 0)::numeric) * 100
        END
      ), 1)
      FROM okr_team_key_results kr4
      INNER JOIN okr_team_objectives obj4 ON obj4.id = kr4.team_objective_id
      WHERE obj4.cycle_id = p_cycle_id
    ), 0)
  )
  INTO v_aggregates
  FROM okr_checkins c
  INNER JOIN okr_team_key_results kr ON kr.id = c.kr_id
  INNER JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
  WHERE obj.cycle_id = p_cycle_id;

  -- Buscar KRs sem check-in recente (overdue)
  SELECT COALESCE(jsonb_agg(row_to_json(overdue_data)::jsonb ORDER BY overdue_data.days_without_checkin DESC), '[]'::jsonb)
  INTO v_overdue_krs
  FROM (
    SELECT 
      kr.id,
      kr.title,
      kr.current_value,
      kr.target_value,
      kr.start_value,
      kr.unit,
      kr.status,
      kr.last_checkin_at,
      CASE 
        WHEN kr.target_value = kr.start_value THEN 100
        ELSE ROUND(((kr.current_value - kr.start_value)::numeric / NULLIF(kr.target_value - kr.start_value, 0)::numeric) * 100, 1)
      END as progress,
      EXTRACT(DAY FROM (NOW() - COALESCE(kr.last_checkin_at, kr.created_at)))::integer as days_without_checkin,
      jsonb_build_object(
        'id', obj.id,
        'title', obj.title
      ) as objective,
      jsonb_build_object(
        'id', t.id,
        'name', t.name
      ) as team,
      jsonb_build_object(
        'id', owner_p.id,
        'full_name', owner_p.full_name,
        'avatar_url', owner_p.avatar_url
      ) as owner
    FROM okr_team_key_results kr
    INNER JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
    INNER JOIN teams t ON t.id = obj.team_id
    LEFT JOIN profiles owner_p ON owner_p.id = kr.owner_user_id
    WHERE obj.cycle_id = p_cycle_id
      AND kr.status NOT IN ('completed', 'cancelled')
      AND (kr.last_checkin_at IS NULL OR kr.last_checkin_at < NOW() - INTERVAL '7 days')
    ORDER BY 
      CASE WHEN kr.last_checkin_at IS NULL THEN 0 ELSE 1 END,
      kr.last_checkin_at ASC NULLS FIRST
    LIMIT 20
  ) overdue_data;

  -- Montar resultado final
  v_result := jsonb_build_object(
    'feed', v_feed,
    'aggregates', v_aggregates,
    'overdue_krs', v_overdue_krs,
    'pagination', jsonb_build_object(
      'page', v_page,
      'page_size', v_page_size,
      'total_count', v_total_count,
      'total_pages', CEIL(v_total_count::numeric / v_page_size)::integer
    )
  );

  RETURN v_result;
END;
$$;

-- Adicionar comentario explicativo
COMMENT ON FUNCTION public.get_cycle_checkins IS 'Retorna feed de check-ins, agregados e KRs pendentes para um ciclo. Corrigido em 2026-01-09 para usar nomes corretos de colunas.';