-- Fix get_cycle_checkins RPC: 
-- 1. Add explicit casts for enum comparisons (okr_rag_status, okr_confidence)

CREATE OR REPLACE FUNCTION public.get_cycle_checkins(
  p_cycle_id uuid,
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page integer;
  v_page_size integer;
  v_offset integer;
  v_search text;
  v_team_id uuid;
  v_owner_id uuid;
  v_status text;
  v_confidence text;
  v_date_from date;
  v_date_to date;
  v_only_overdue boolean;
  v_sort_by text;
  v_sort_order text;
  v_total_count integer;
  v_feed jsonb;
  v_aggregates jsonb;
  v_overdue_krs jsonb;
BEGIN
  -- Extrair filtros
  v_page := COALESCE((p_filters->>'page')::integer, 1);
  v_page_size := LEAST(COALESCE((p_filters->>'page_size')::integer, 20), 100);
  v_offset := (v_page - 1) * v_page_size;
  v_search := NULLIF(TRIM(p_filters->>'search'), '');
  v_team_id := NULLIF(p_filters->>'team_id', '')::uuid;
  v_owner_id := NULLIF(p_filters->>'owner_id', '')::uuid;
  v_status := NULLIF(p_filters->>'status', '');
  v_confidence := NULLIF(p_filters->>'confidence', '');
  v_date_from := NULLIF(p_filters->>'date_from', '')::date;
  v_date_to := NULLIF(p_filters->>'date_to', '')::date;
  v_only_overdue := COALESCE((p_filters->>'only_overdue')::boolean, false);
  v_sort_by := COALESCE(NULLIF(p_filters->>'sort_by', ''), 'created_at');
  v_sort_order := COALESCE(NULLIF(p_filters->>'sort_order', ''), 'desc');

  -- Contar total para paginacao (FIXED: explicit enum casts)
  SELECT COUNT(*)::integer INTO v_total_count
  FROM okr_checkins c
  INNER JOIN okr_team_key_results kr ON kr.id = c.kr_id
  INNER JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
  INNER JOIN profiles p ON p.id = c.user_id
  WHERE obj.cycle_id = p_cycle_id
    AND (v_search IS NULL OR (
      kr.title ILIKE '%' || v_search || '%' OR
      obj.title ILIKE '%' || v_search || '%' OR
      c.comments ILIKE '%' || v_search || '%' OR
      p.display_name ILIKE '%' || v_search || '%'
    ))
    AND (v_team_id IS NULL OR obj.team_id = v_team_id)
    AND (v_owner_id IS NULL OR kr.owner_user_id = v_owner_id)
    AND (v_status IS NULL OR kr.status::text = v_status)
    AND (v_confidence IS NULL OR c.confidence::text = v_confidence)
    AND (v_date_from IS NULL OR c.created_at::date >= v_date_from)
    AND (v_date_to IS NULL OR c.created_at::date <= v_date_to);

  -- Buscar feed de check-ins (FIXED: explicit enum casts)
  SELECT jsonb_agg(feed_row ORDER BY 
    CASE WHEN v_sort_order = 'desc' THEN NULL END,
    CASE WHEN v_sort_by = 'created_at' AND v_sort_order = 'desc' THEN feed_row.created_at END DESC NULLS LAST,
    CASE WHEN v_sort_by = 'created_at' AND v_sort_order = 'asc' THEN feed_row.created_at END ASC NULLS LAST
  )
  INTO v_feed
  FROM (
    SELECT 
      c.id,
      c.created_at,
      c.current_value,
      c.previous_value,
      c.confidence::text as confidence,
      c.comments,
      c.blockers,
      kr.id as kr_id,
      kr.title as kr_title,
      kr.status::text as kr_status,
      obj.id as objective_id,
      obj.title as objective_title,
      t.id as team_id,
      t.name as team_name,
      p.id as user_id,
      p.display_name as user_name,
      p.photo_url as user_photo
    FROM okr_checkins c
    INNER JOIN okr_team_key_results kr ON kr.id = c.kr_id
    INNER JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
    INNER JOIN teams t ON t.id = obj.team_id
    INNER JOIN profiles p ON p.id = c.user_id
    WHERE obj.cycle_id = p_cycle_id
      AND (v_search IS NULL OR (
        kr.title ILIKE '%' || v_search || '%' OR
        obj.title ILIKE '%' || v_search || '%' OR
        c.comments ILIKE '%' || v_search || '%' OR
        p.display_name ILIKE '%' || v_search || '%'
      ))
      AND (v_team_id IS NULL OR obj.team_id = v_team_id)
      AND (v_owner_id IS NULL OR kr.owner_user_id = v_owner_id)
      AND (v_status IS NULL OR kr.status::text = v_status)
      AND (v_confidence IS NULL OR c.confidence::text = v_confidence)
      AND (v_date_from IS NULL OR c.created_at::date >= v_date_from)
      AND (v_date_to IS NULL OR c.created_at::date <= v_date_to)
    ORDER BY c.created_at DESC
    LIMIT v_page_size
    OFFSET v_offset
  ) feed_row;

  -- Calcular agregações
  SELECT jsonb_build_object(
    'total_checkins', COALESCE(COUNT(c.id), 0),
    'total_krs', COALESCE((
      SELECT COUNT(DISTINCT kr2.id)
      FROM okr_team_key_results kr2
      INNER JOIN okr_team_objectives obj2 ON obj2.id = kr2.team_objective_id
      WHERE obj2.cycle_id = p_cycle_id
    ), 0),
    'krs_with_recent_checkin', COALESCE((
      SELECT COUNT(DISTINCT c2.kr_id)
      FROM okr_checkins c2
      INNER JOIN okr_team_key_results kr2 ON kr2.id = c2.kr_id
      INNER JOIN okr_team_objectives obj2 ON obj2.id = kr2.team_objective_id
      WHERE obj2.cycle_id = p_cycle_id
        AND c2.created_at >= NOW() - INTERVAL '7 days'
    ), 0),
    'krs_overdue', COALESCE((
      SELECT COUNT(DISTINCT kr3.id)
      FROM okr_team_key_results kr3
      INNER JOIN okr_team_objectives obj3 ON obj3.id = kr3.team_objective_id
      WHERE obj3.cycle_id = p_cycle_id
        AND NOT EXISTS (
          SELECT 1 FROM okr_checkins c3
          WHERE c3.kr_id = kr3.id
            AND c3.created_at >= NOW() - INTERVAL '7 days'
        )
    ), 0),
    'confidence_breakdown', COALESCE((
      SELECT jsonb_object_agg(conf, cnt)
      FROM (
        SELECT c4.confidence::text as conf, COUNT(*) as cnt
        FROM okr_checkins c4
        INNER JOIN okr_team_key_results kr4 ON kr4.id = c4.kr_id
        INNER JOIN okr_team_objectives obj4 ON obj4.id = kr4.team_objective_id
        WHERE obj4.cycle_id = p_cycle_id
        GROUP BY c4.confidence
      ) conf_counts
    ), '{}'::jsonb)
  )
  INTO v_aggregates
  FROM okr_checkins c
  INNER JOIN okr_team_key_results kr ON kr.id = c.kr_id
  INNER JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
  WHERE obj.cycle_id = p_cycle_id;

  -- Buscar KRs atrasados (sem check-in nos últimos 7 dias)
  SELECT jsonb_agg(overdue_row)
  INTO v_overdue_krs
  FROM (
    SELECT 
      kr.id as kr_id,
      kr.title as kr_title,
      kr.status::text as kr_status,
      obj.id as objective_id,
      obj.title as objective_title,
      t.id as team_id,
      t.name as team_name,
      p.id as owner_id,
      p.display_name as owner_name,
      p.photo_url as owner_photo,
      (
        SELECT MAX(c5.created_at)
        FROM okr_checkins c5
        WHERE c5.kr_id = kr.id
      ) as last_checkin_at
    FROM okr_team_key_results kr
    INNER JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
    INNER JOIN teams t ON t.id = obj.team_id
    LEFT JOIN profiles p ON p.id = kr.owner_user_id
    WHERE obj.cycle_id = p_cycle_id
      AND NOT EXISTS (
        SELECT 1 FROM okr_checkins c6
        WHERE c6.kr_id = kr.id
          AND c6.created_at >= NOW() - INTERVAL '7 days'
      )
    ORDER BY (
      SELECT MAX(c7.created_at)
      FROM okr_checkins c7
      WHERE c7.kr_id = kr.id
    ) ASC NULLS FIRST
    LIMIT 50
  ) overdue_row;

  RETURN jsonb_build_object(
    'checkins', COALESCE(v_feed, '[]'::jsonb),
    'aggregates', COALESCE(v_aggregates, '{}'::jsonb),
    'overdue_krs', COALESCE(v_overdue_krs, '[]'::jsonb),
    'pagination', jsonb_build_object(
      'page', v_page,
      'page_size', v_page_size,
      'total', v_total_count,
      'total_pages', CEIL(v_total_count::float / v_page_size)::integer
    )
  );
END;
$$;