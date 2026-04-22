CREATE OR REPLACE FUNCTION public.rpc_home_dashboard_data(p_bu_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
  v_user_team_id UUID;
  v_team_name TEXT;
  v_active_cycle_id UUID;
  v_okr_on_track INTEGER := 0;
  v_okr_at_risk INTEGER := 0;
  v_okr_off_track INTEGER := 0;
  v_overdue_checkins INTEGER := 0;
  v_pending_checkins INTEGER := 0;
  v_team_count INTEGER := 0;
BEGIN
  -- Get user's team
  SELECT p.team_id INTO v_user_team_id
  FROM profiles p
  WHERE p.user_id = p_user_id
  LIMIT 1;

  -- Get team name if user has a team
  IF v_user_team_id IS NOT NULL THEN
    SELECT t.name INTO v_team_name
    FROM teams t
    WHERE t.id = v_user_team_id
      AND t.bu_id = p_bu_id
      AND t.deleted_at IS NULL;
  END IF;

  -- Resolve active QUARTER cycle for the BU (today within range, status active).
  -- Fallback: most recent quarter cycle not yet closed.
  SELECT c.id INTO v_active_cycle_id
  FROM cycles c
  WHERE c.bu_id = p_bu_id
    AND c.type = 'quarter'
    AND c.status = 'active'
    AND CURRENT_DATE BETWEEN c.start_date AND c.end_date
  ORDER BY c.start_date DESC
  LIMIT 1;

  IF v_active_cycle_id IS NULL THEN
    SELECT c.id INTO v_active_cycle_id
    FROM cycles c
    WHERE c.bu_id = p_bu_id
      AND c.type = 'quarter'
      AND c.status <> 'closed'
    ORDER BY c.start_date DESC
    LIMIT 1;
  END IF;

  -- Count OKR statuses (scoped to user's team if they have one) — ACTIVE CYCLE ONLY.
  -- KR -> team_objective -> cycle_id
  SELECT
    COALESCE(SUM(CASE WHEN kr.status = 'green' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN kr.status = 'yellow' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN kr.status = 'red' THEN 1 ELSE 0 END), 0)
  INTO v_okr_on_track, v_okr_at_risk, v_okr_off_track
  FROM okr_team_key_results kr
  JOIN okr_team_objectives o ON o.id = kr.team_objective_id
  WHERE kr.bu_id = p_bu_id
    AND kr.deleted_at IS NULL
    AND o.deleted_at IS NULL
    AND (v_active_cycle_id IS NULL OR o.cycle_id = v_active_cycle_id)
    AND (v_user_team_id IS NULL OR kr.team_id = v_user_team_id);

  -- Count pending/overdue checkins — ACTIVE CYCLE ONLY.
  SELECT
    COUNT(*) FILTER (WHERE kr.last_checkin_at IS NULL OR kr.last_checkin_at < NOW() - INTERVAL '14 days'),
    COUNT(*) FILTER (WHERE kr.last_checkin_at IS NULL OR kr.last_checkin_at < NOW() - INTERVAL '7 days')
  INTO v_overdue_checkins, v_pending_checkins
  FROM okr_team_key_results kr
  JOIN okr_team_objectives o ON o.id = kr.team_objective_id
  WHERE kr.bu_id = p_bu_id
    AND kr.deleted_at IS NULL
    AND kr.cancelled_at IS NULL
    AND kr.status <> 'green'
    AND o.deleted_at IS NULL
    AND (v_active_cycle_id IS NULL OR o.cycle_id = v_active_cycle_id)
    AND (v_user_team_id IS NULL OR kr.team_id = v_user_team_id);

  -- Count active teams
  SELECT COUNT(*) INTO v_team_count
  FROM teams
  WHERE bu_id = p_bu_id
    AND status = 'active'
    AND deleted_at IS NULL;

  -- Build result
  v_result := jsonb_build_object(
    'user_team_id', v_user_team_id,
    'user_team_name', v_team_name,
    'active_cycle_id', v_active_cycle_id,
    'okr_counts', jsonb_build_object(
      'on_track', v_okr_on_track,
      'at_risk', v_okr_at_risk,
      'off_track', v_okr_off_track
    ),
    'checkin_summary', jsonb_build_object(
      'overdue', v_overdue_checkins,
      'pending', v_pending_checkins
    ),
    'team_count', v_team_count
  );

  RETURN v_result;
END;
$function$;