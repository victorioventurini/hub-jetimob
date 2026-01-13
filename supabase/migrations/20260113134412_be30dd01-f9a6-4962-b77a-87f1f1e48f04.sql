-- Fix get_cycle_checkins RPC: 
-- 1. Replace p.full_name with p.display_name (column that actually exists)
-- 2. Add obj.title to search filter for better UX

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

  -- Contar total para paginacao (FIXED: p.display_name instead of p.full_name, added obj.title)
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
    AND (v_status IS NULL OR kr.status = v_status)
    AND (v_confidence IS NULL OR c.confidence = v_confidence)
    AND (v_date_from IS NULL OR c.created_at::date >= v_date_from)
    AND (v_date_to IS NULL OR c.created_at::date <= v_date_to);

  -- Buscar feed de check-ins (FIXED: p.display_name, added obj.title)
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
      c.confidence,
      c.comments,
      c.blockers,
      kr.id as kr_id,
      kr.title as kr_title,
      kr.status as kr_status,
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
      AND (v_status IS NULL OR kr.status = v_status)
      AND (v_confidence IS NULL OR c.confidence = v_confidence)
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
    'krs_on_track_percent', COALESCE((
      SELECT ROUND(
        COUNT(*) FILTER (WHERE kr2.status = 'green')::numeric / 
        NULLIF(COUNT(*), 0)::numeric * 100, 
        1
      )
      FROM okr_team_key_results kr2
      INNER JOIN okr_team_objectives obj2 ON obj2.id = kr2.team_objective_id
      WHERE obj2.cycle_id = p_cycle_id
    ), 0),
    'krs_overdue_count', COALESCE((
      SELECT COUNT(*)
      FROM okr_team_key_results kr2
      INNER JOIN okr_team_objectives obj2 ON obj2.id = kr2.team_objective_id
      LEFT JOIN LATERAL (
        SELECT MAX(c2.created_at) as last_checkin
        FROM okr_checkins c2 WHERE c2.kr_id = kr2.id
      ) lc ON true
      WHERE obj2.cycle_id = p_cycle_id
        AND (lc.last_checkin IS NULL OR lc.last_checkin < NOW() - INTERVAL '7 days')
    ), 0),
    'avg_confidence', COALESCE((
      SELECT MODE() WITHIN GROUP (ORDER BY c2.confidence)
      FROM okr_checkins c2
      INNER JOIN okr_team_key_results kr2 ON kr2.id = c2.kr_id
      INNER JOIN okr_team_objectives obj2 ON obj2.id = kr2.team_objective_id
      WHERE obj2.cycle_id = p_cycle_id
    ), 'medium')
  )
  INTO v_aggregates
  FROM okr_checkins c
  INNER JOIN okr_team_key_results kr ON kr.id = c.kr_id
  INNER JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
  WHERE obj.cycle_id = p_cycle_id;

  -- Buscar KRs overdue (sem check-in há mais de 7 dias)
  SELECT COALESCE(jsonb_agg(overdue_row), '[]'::jsonb)
  INTO v_overdue_krs
  FROM (
    SELECT 
      kr.id as kr_id,
      kr.title as kr_title,
      kr.status,
      t.id as team_id,
      t.name as team_name,
      owner.id as owner_id,
      owner.display_name as owner_name,
      owner.photo_url as owner_photo,
      lc.last_checkin as last_checkin_at,
      EXTRACT(DAY FROM NOW() - COALESCE(lc.last_checkin, kr.created_at))::integer as days_since_checkin
    FROM okr_team_key_results kr
    INNER JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
    INNER JOIN teams t ON t.id = obj.team_id
    LEFT JOIN profiles owner ON owner.id = kr.owner_user_id
    LEFT JOIN LATERAL (
      SELECT MAX(c.created_at) as last_checkin
      FROM okr_checkins c WHERE c.kr_id = kr.id
    ) lc ON true
    WHERE obj.cycle_id = p_cycle_id
      AND (lc.last_checkin IS NULL OR lc.last_checkin < NOW() - INTERVAL '7 days')
    ORDER BY days_since_checkin DESC
    LIMIT 20
  ) overdue_row;

  RETURN jsonb_build_object(
    'feed', COALESCE(v_feed, '[]'::jsonb),
    'aggregates', v_aggregates,
    'overdue_krs', v_overdue_krs,
    'pagination', jsonb_build_object(
      'page', v_page,
      'page_size', v_page_size,
      'total_count', v_total_count,
      'total_pages', CEIL(v_total_count::numeric / v_page_size)::integer
    )
  );
END;
$$;