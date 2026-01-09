-- ============================================================
-- RPC: get_cycle_checkins
-- Retorna check-ins consolidados de um ciclo com agregações
-- ============================================================

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
  v_user_id uuid;
  v_team_id uuid;
  v_owner_id uuid;
  v_confidence text;
  v_rag_status text;
  v_date_from timestamptz;
  v_date_to timestamptz;
  v_only_overdue boolean;
  v_search text;
  v_page int;
  v_page_size int;
  v_offset int;
  v_total_count int;
  v_manageable_teams uuid[];
  v_checkins jsonb;
  v_aggregates jsonb;
  v_overdue_krs jsonb;
  v_sla_days int := 7;
BEGIN
  -- Get current context
  v_bu_id := current_bu_id();
  v_user_id := auth.uid();
  
  IF v_bu_id IS NULL THEN
    RAISE EXCEPTION 'BU context required';
  END IF;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Parse filters
  v_team_id := (p_filters->>'team_id')::uuid;
  v_owner_id := (p_filters->>'owner_id')::uuid;
  v_confidence := p_filters->>'confidence';
  v_rag_status := p_filters->>'rag_status';
  v_date_from := (p_filters->>'date_from')::timestamptz;
  v_date_to := (p_filters->>'date_to')::timestamptz;
  v_only_overdue := COALESCE((p_filters->>'only_overdue')::boolean, false);
  v_search := LOWER(COALESCE(p_filters->>'search', ''));
  v_page := COALESCE((p_filters->>'page')::int, 1);
  v_page_size := LEAST(COALESCE((p_filters->>'page_size')::int, 20), 100);
  v_offset := (v_page - 1) * v_page_size;

  -- Get manageable teams for RBAC
  SELECT array_agg(id) INTO v_manageable_teams
  FROM get_manageable_teams();
  
  -- If no manageable teams, return empty
  IF v_manageable_teams IS NULL OR array_length(v_manageable_teams, 1) = 0 THEN
    RETURN jsonb_build_object(
      'checkins', '[]'::jsonb,
      'aggregates', jsonb_build_object(
        'total_checkins', 0,
        'krs_on_track_percent', 0,
        'krs_overdue_count', 0,
        'avg_confidence', 'medium'
      ),
      'overdue_krs', '[]'::jsonb,
      'pagination', jsonb_build_object(
        'page', v_page,
        'page_size', v_page_size,
        'total', 0,
        'total_pages', 0
      )
    );
  END IF;

  -- Get check-ins with filters
  WITH filtered_checkins AS (
    SELECT 
      c.id,
      c.created_at,
      c.current_value,
      c.confidence,
      c.comments,
      c.blockers,
      kr.id AS kr_id,
      kr.title AS kr_title,
      kr.status AS kr_status,
      obj.id AS objective_id,
      obj.title AS objective_title,
      t.id AS team_id,
      t.name AS team_name,
      p.id AS user_id,
      p.display_name AS user_name,
      p.photo_url AS user_photo,
      LAG(c.current_value) OVER (PARTITION BY kr.id ORDER BY c.created_at) AS previous_value
    FROM okr_checkins c
    INNER JOIN okr_team_key_results kr ON kr.id = c.key_result_id
    INNER JOIN okr_team_objectives obj ON obj.id = kr.objective_id
    INNER JOIN teams t ON t.id = obj.team_id
    LEFT JOIN profiles p ON p.id = c.created_by
    WHERE obj.cycle_id = p_cycle_id
      AND obj.bu_id = v_bu_id
      AND t.id = ANY(v_manageable_teams)
      AND (v_team_id IS NULL OR t.id = v_team_id)
      AND (v_owner_id IS NULL OR kr.owner_profile_id = v_owner_id)
      AND (v_confidence IS NULL OR v_confidence = 'all' OR c.confidence = v_confidence)
      AND (v_rag_status IS NULL OR v_rag_status = 'all' OR kr.status = v_rag_status)
      AND (v_date_from IS NULL OR c.created_at >= v_date_from)
      AND (v_date_to IS NULL OR c.created_at <= v_date_to)
      AND (v_search = '' OR 
           LOWER(kr.title) LIKE '%' || v_search || '%' OR 
           LOWER(obj.title) LIKE '%' || v_search || '%')
  )
  SELECT 
    COUNT(*) INTO v_total_count
  FROM filtered_checkins;

  -- Get paginated check-ins
  SELECT jsonb_agg(row_to_json(fc.*) ORDER BY fc.created_at DESC)
  INTO v_checkins
  FROM (
    SELECT 
      c.id,
      c.created_at,
      c.current_value,
      c.confidence,
      c.comments,
      c.blockers,
      kr.id AS kr_id,
      kr.title AS kr_title,
      kr.status AS kr_status,
      obj.id AS objective_id,
      obj.title AS objective_title,
      t.id AS team_id,
      t.name AS team_name,
      p.id AS user_id,
      p.display_name AS user_name,
      p.photo_url AS user_photo,
      LAG(c.current_value) OVER (PARTITION BY kr.id ORDER BY c.created_at) AS previous_value
    FROM okr_checkins c
    INNER JOIN okr_team_key_results kr ON kr.id = c.key_result_id
    INNER JOIN okr_team_objectives obj ON obj.id = kr.objective_id
    INNER JOIN teams t ON t.id = obj.team_id
    LEFT JOIN profiles p ON p.id = c.created_by
    WHERE obj.cycle_id = p_cycle_id
      AND obj.bu_id = v_bu_id
      AND t.id = ANY(v_manageable_teams)
      AND (v_team_id IS NULL OR t.id = v_team_id)
      AND (v_owner_id IS NULL OR kr.owner_profile_id = v_owner_id)
      AND (v_confidence IS NULL OR v_confidence = 'all' OR c.confidence = v_confidence)
      AND (v_rag_status IS NULL OR v_rag_status = 'all' OR kr.status = v_rag_status)
      AND (v_date_from IS NULL OR c.created_at >= v_date_from)
      AND (v_date_to IS NULL OR c.created_at <= v_date_to)
      AND (v_search = '' OR 
           LOWER(kr.title) LIKE '%' || v_search || '%' OR 
           LOWER(obj.title) LIKE '%' || v_search || '%')
    ORDER BY c.created_at DESC
    LIMIT v_page_size
    OFFSET v_offset
  ) fc;

  -- Calculate aggregates
  SELECT jsonb_build_object(
    'total_checkins', COUNT(DISTINCT c.id),
    'krs_with_recent_checkin', COUNT(DISTINCT CASE 
      WHEN c.created_at >= NOW() - INTERVAL '7 days' THEN kr.id 
    END),
    'total_krs', COUNT(DISTINCT kr.id),
    'krs_on_track_percent', ROUND(
      COALESCE(
        COUNT(DISTINCT CASE WHEN c.created_at >= NOW() - INTERVAL '7 days' THEN kr.id END)::numeric * 100 
        / NULLIF(COUNT(DISTINCT kr.id), 0),
        0
      )
    ),
    'krs_overdue_count', COUNT(DISTINCT kr.id) - COUNT(DISTINCT CASE 
      WHEN c.created_at >= NOW() - INTERVAL '7 days' THEN kr.id 
    END),
    'avg_confidence', COALESCE(
      (SELECT confidence FROM (
        SELECT confidence, COUNT(*) as cnt
        FROM okr_checkins c2
        INNER JOIN okr_team_key_results kr2 ON kr2.id = c2.key_result_id
        INNER JOIN okr_team_objectives obj2 ON obj2.id = kr2.objective_id
        WHERE obj2.cycle_id = p_cycle_id AND obj2.bu_id = v_bu_id
        GROUP BY confidence
        ORDER BY cnt DESC
        LIMIT 1
      ) sub),
      'medium'
    )
  )
  INTO v_aggregates
  FROM okr_checkins c
  INNER JOIN okr_team_key_results kr ON kr.id = c.key_result_id
  INNER JOIN okr_team_objectives obj ON obj.id = kr.objective_id
  INNER JOIN teams t ON t.id = obj.team_id
  WHERE obj.cycle_id = p_cycle_id
    AND obj.bu_id = v_bu_id
    AND t.id = ANY(v_manageable_teams)
    AND (v_team_id IS NULL OR t.id = v_team_id);

  -- Get overdue KRs (no check-in in SLA days)
  SELECT jsonb_agg(row_to_json(okr.*) ORDER BY okr.days_since_checkin DESC NULLS FIRST)
  INTO v_overdue_krs
  FROM (
    SELECT DISTINCT ON (kr.id)
      kr.id AS kr_id,
      kr.title AS kr_title,
      kr.status,
      t.id AS team_id,
      t.name AS team_name,
      op.id AS owner_id,
      op.display_name AS owner_name,
      op.photo_url AS owner_photo,
      last_c.created_at AS last_checkin_at,
      EXTRACT(DAY FROM NOW() - COALESCE(last_c.created_at, obj.created_at))::int AS days_since_checkin
    FROM okr_team_key_results kr
    INNER JOIN okr_team_objectives obj ON obj.id = kr.objective_id
    INNER JOIN teams t ON t.id = obj.team_id
    LEFT JOIN profiles op ON op.id = kr.owner_profile_id
    LEFT JOIN LATERAL (
      SELECT created_at 
      FROM okr_checkins 
      WHERE key_result_id = kr.id 
      ORDER BY created_at DESC 
      LIMIT 1
    ) last_c ON true
    WHERE obj.cycle_id = p_cycle_id
      AND obj.bu_id = v_bu_id
      AND t.id = ANY(v_manageable_teams)
      AND kr.status != 'completed'
      AND (last_c.created_at IS NULL OR last_c.created_at < NOW() - (v_sla_days || ' days')::interval)
      AND (v_team_id IS NULL OR t.id = v_team_id)
    ORDER BY kr.id, last_c.created_at DESC NULLS LAST
  ) okr;

  RETURN jsonb_build_object(
    'checkins', COALESCE(v_checkins, '[]'::jsonb),
    'aggregates', v_aggregates,
    'overdue_krs', COALESCE(v_overdue_krs, '[]'::jsonb),
    'pagination', jsonb_build_object(
      'page', v_page,
      'page_size', v_page_size,
      'total', v_total_count,
      'total_pages', CEIL(v_total_count::numeric / v_page_size)
    )
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_cycle_checkins(uuid, jsonb) TO authenticated;