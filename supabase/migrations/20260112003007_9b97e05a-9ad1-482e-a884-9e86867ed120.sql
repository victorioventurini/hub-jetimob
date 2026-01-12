-- ============================================================
-- Wave 4: RPC Agregadora para Dashboard de Tickets
-- ============================================================

-- RPC para buscar resumo de tickets de forma otimizada
-- Retorna contagens por status, prioridade e vencimento em uma única query
CREATE OR REPLACE FUNCTION rpc_tickets_summary(
  p_bu_id UUID,
  p_team_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_status_counts JSONB;
  v_priority_counts JSONB;
  v_overdue_count INTEGER;
  v_due_today_count INTEGER;
  v_due_this_week_count INTEGER;
  v_avg_resolution_hours NUMERIC;
  v_total_open INTEGER;
  v_total_closed INTEGER;
BEGIN
  -- Status counts
  SELECT jsonb_object_agg(status, cnt) INTO v_status_counts
  FROM (
    SELECT status, COUNT(*) as cnt
    FROM tickets
    WHERE bu_id = p_bu_id
      AND deleted_at IS NULL
      AND (p_team_id IS NULL OR owner_team_id = p_team_id)
    GROUP BY status
  ) s;

  -- Priority counts (only open tickets)
  SELECT jsonb_object_agg(COALESCE(priority, 'normal'), cnt) INTO v_priority_counts
  FROM (
    SELECT priority, COUNT(*) as cnt
    FROM tickets
    WHERE bu_id = p_bu_id
      AND deleted_at IS NULL
      AND status NOT IN ('done', 'discarded')
      AND (p_team_id IS NULL OR owner_team_id = p_team_id)
    GROUP BY priority
  ) p;

  -- Overdue count
  SELECT COUNT(*) INTO v_overdue_count
  FROM tickets
  WHERE bu_id = p_bu_id
    AND deleted_at IS NULL
    AND status NOT IN ('done', 'discarded')
    AND expected_due_at < NOW()
    AND (p_team_id IS NULL OR owner_team_id = p_team_id);

  -- Due today
  SELECT COUNT(*) INTO v_due_today_count
  FROM tickets
  WHERE bu_id = p_bu_id
    AND deleted_at IS NULL
    AND status NOT IN ('done', 'discarded')
    AND expected_due_at::date = CURRENT_DATE
    AND (p_team_id IS NULL OR owner_team_id = p_team_id);

  -- Due this week
  SELECT COUNT(*) INTO v_due_this_week_count
  FROM tickets
  WHERE bu_id = p_bu_id
    AND deleted_at IS NULL
    AND status NOT IN ('done', 'discarded')
    AND expected_due_at >= NOW()
    AND expected_due_at <= NOW() + INTERVAL '7 days'
    AND (p_team_id IS NULL OR owner_team_id = p_team_id);

  -- Average resolution time (last 30 days)
  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600), 1)
  INTO v_avg_resolution_hours
  FROM tickets
  WHERE bu_id = p_bu_id
    AND deleted_at IS NULL
    AND status = 'done'
    AND resolved_at IS NOT NULL
    AND resolved_at >= NOW() - INTERVAL '30 days'
    AND (p_team_id IS NULL OR owner_team_id = p_team_id);

  -- Total open/closed
  SELECT 
    COUNT(*) FILTER (WHERE status NOT IN ('done', 'discarded')),
    COUNT(*) FILTER (WHERE status IN ('done', 'discarded'))
  INTO v_total_open, v_total_closed
  FROM tickets
  WHERE bu_id = p_bu_id
    AND deleted_at IS NULL
    AND (p_team_id IS NULL OR owner_team_id = p_team_id);

  -- Build result
  v_result := jsonb_build_object(
    'status_counts', COALESCE(v_status_counts, '{}'::jsonb),
    'priority_counts', COALESCE(v_priority_counts, '{}'::jsonb),
    'overdue_count', COALESCE(v_overdue_count, 0),
    'due_today_count', COALESCE(v_due_today_count, 0),
    'due_this_week_count', COALESCE(v_due_this_week_count, 0),
    'avg_resolution_hours', v_avg_resolution_hours,
    'total_open', COALESCE(v_total_open, 0),
    'total_closed', COALESCE(v_total_closed, 0)
  );

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION rpc_tickets_summary(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION rpc_tickets_summary IS 'Aggregated tickets summary for dashboard - consolidates multiple queries into one';