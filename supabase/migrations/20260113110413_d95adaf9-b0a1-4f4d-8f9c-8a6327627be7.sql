-- =============================================
-- P1: Fix get_cycle_checkins - Replace c.notes with c.comments
-- Bug: okr_checkins table uses 'comments' column, not 'notes'
-- =============================================

-- First drop the existing function to recreate with fix
DROP FUNCTION IF EXISTS public.get_cycle_checkins(uuid, jsonb);

-- Recreate with correct column reference (comments instead of notes)
CREATE OR REPLACE FUNCTION public.get_cycle_checkins(p_cycle_id uuid, p_filters jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Contar total para paginacao (FIXED: c.comments instead of c.notes)
  SELECT COUNT(*)::integer INTO v_total_count
  FROM okr_checkins c
  INNER JOIN okr_team_key_results kr ON kr.id = c.kr_id
  INNER JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
  INNER JOIN profiles p ON p.id = c.user_id
  WHERE obj.cycle_id = p_cycle_id
    AND (v_search IS NULL OR (
      kr.title ILIKE '%' || v_search || '%' OR
      c.comments ILIKE '%' || v_search || '%' OR
      p.full_name ILIKE '%' || v_search || '%'
    ))
    AND (v_team_id IS NULL OR obj.team_id = v_team_id)
    AND (v_owner_id IS NULL OR kr.owner_user_id = v_owner_id)
    AND (v_status IS NULL OR kr.status = v_status);

  -- Buscar feed de check-ins (FIXED: c.comments instead of c.notes)
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
      c.comments as notes,
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
        c.comments ILIKE '%' || v_search || '%' OR
        p.full_name ILIKE '%' || v_search || '%'
      ))
      AND (v_team_id IS NULL OR obj.team_id = v_team_id)
      AND (v_owner_id IS NULL OR kr.owner_user_id = v_owner_id)
      AND (v_status IS NULL OR kr.status = v_status)
    ORDER BY c.created_at DESC
    LIMIT v_page_size OFFSET v_offset
  ) feed_data;

  -- Calcular aggregates
  SELECT jsonb_build_object(
    'total_checkins', COUNT(*)::integer,
    'checkins_this_week', COUNT(*) FILTER (WHERE c.created_at >= NOW() - INTERVAL '7 days')::integer,
    'unique_krs_with_checkins', COUNT(DISTINCT c.kr_id)::integer,
    'total_krs', (SELECT COUNT(*) FROM okr_team_key_results kr2 
                  INNER JOIN okr_team_objectives obj2 ON obj2.id = kr2.team_objective_id 
                  WHERE obj2.cycle_id = p_cycle_id)::integer,
    'avg_progress', COALESCE(ROUND(AVG(
      CASE 
        WHEN kr.target_value = kr.start_value THEN 100
        ELSE ((kr.current_value - kr.start_value)::numeric / NULLIF(kr.target_value - kr.start_value, 0)::numeric) * 100
      END
    ), 1), 0)
  )
  INTO v_aggregates
  FROM okr_checkins c
  INNER JOIN okr_team_key_results kr ON kr.id = c.kr_id
  INNER JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
  WHERE obj.cycle_id = p_cycle_id;

  -- Buscar KRs em atraso (sem check-in há mais de 7 dias)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', kr.id,
    'title', kr.title,
    'team_name', t.name,
    'owner', jsonb_build_object(
      'id', owner_p.id,
      'full_name', owner_p.full_name,
      'avatar_url', owner_p.avatar_url
    ),
    'last_checkin_at', (SELECT MAX(c2.created_at) FROM okr_checkins c2 WHERE c2.kr_id = kr.id),
    'days_since_checkin', EXTRACT(DAY FROM (NOW() - COALESCE(
      (SELECT MAX(c2.created_at) FROM okr_checkins c2 WHERE c2.kr_id = kr.id),
      obj.created_at
    )))::integer
  )), '[]'::jsonb)
  INTO v_overdue_krs
  FROM okr_team_key_results kr
  INNER JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
  INNER JOIN teams t ON t.id = obj.team_id
  LEFT JOIN profiles owner_p ON owner_p.id = kr.owner_user_id
  WHERE obj.cycle_id = p_cycle_id
    AND kr.status NOT IN ('completed', 'cancelled')
    AND (
      NOT EXISTS (SELECT 1 FROM okr_checkins c2 WHERE c2.kr_id = kr.id)
      OR (SELECT MAX(c2.created_at) FROM okr_checkins c2 WHERE c2.kr_id = kr.id) < NOW() - INTERVAL '7 days'
    )
  ORDER BY EXTRACT(DAY FROM (NOW() - COALESCE(
    (SELECT MAX(c2.created_at) FROM okr_checkins c2 WHERE c2.kr_id = kr.id),
    obj.created_at
  ))) DESC
  LIMIT 10;

  -- Update aggregates with overdue count
  v_aggregates := v_aggregates || jsonb_build_object('overdue_krs', jsonb_array_length(v_overdue_krs));

  -- Build final result
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
$function$;

-- =============================================
-- P3: Create composite indices for tickets
-- =============================================

-- Index for ticket attachments by bu + ticket
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_bu_ticket 
ON ticket_attachments(bu_id, ticket_id);

-- Index for ticket messages by bu + ticket + created_at DESC (for efficient ordering)
CREATE INDEX IF NOT EXISTS idx_ticket_messages_bu_ticket_created 
ON ticket_messages(bu_id, ticket_id, created_at DESC);