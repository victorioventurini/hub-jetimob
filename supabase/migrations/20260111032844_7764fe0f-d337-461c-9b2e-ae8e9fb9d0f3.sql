-- RPC agregadora para Home Dashboard
-- Consolida queries de: user team, OKR counts, pending checkins, team info
-- Retorna JSONB com todos os dados necessários para o dashboard

CREATE OR REPLACE FUNCTION public.rpc_home_dashboard_data(
  p_bu_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_user_team_id UUID;
  v_team_name TEXT;
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
  
  -- Count OKR statuses (scoped to user's team if they have one)
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'green' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'yellow' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'red' THEN 1 ELSE 0 END), 0)
  INTO v_okr_on_track, v_okr_at_risk, v_okr_off_track
  FROM okr_team_key_results
  WHERE bu_id = p_bu_id
    AND deleted_at IS NULL
    AND (v_user_team_id IS NULL OR team_id = v_user_team_id);
  
  -- Count pending/overdue checkins (KRs without recent checkin)
  SELECT 
    COUNT(*) FILTER (WHERE last_checkin_at IS NULL OR last_checkin_at < NOW() - INTERVAL '14 days'),
    COUNT(*) FILTER (WHERE last_checkin_at IS NULL OR last_checkin_at < NOW() - INTERVAL '7 days')
  INTO v_overdue_checkins, v_pending_checkins
  FROM okr_team_key_results
  WHERE bu_id = p_bu_id
    AND deleted_at IS NULL
    AND cancelled_at IS NULL
    AND status != 'completed'
    AND (v_user_team_id IS NULL OR team_id = v_user_team_id);
  
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
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.rpc_home_dashboard_data(UUID, UUID) TO authenticated;