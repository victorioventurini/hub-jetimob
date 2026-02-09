-- ============================================================
-- KPI Dashboard Summary RPC for Leader/Admin/Collaborator
-- TCR v3.4.x - Dashboard KPI Card with Real Data
-- ============================================================

-- 1. Create the main KPI dashboard summary function
CREATE OR REPLACE FUNCTION public.rpc_kpi_dashboard_summary(
  p_team_id uuid DEFAULT NULL,
  p_scope text DEFAULT 'leader'  -- 'admin' | 'leader' | 'collaborator'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile_id uuid;
  v_bu_id uuid := current_bu_id();
  v_team_ids uuid[];
  v_result jsonb;
  
  -- RAG Counters
  v_green int := 0;
  v_yellow int := 0;
  v_red int := 0;
  v_gray int := 0;
  v_total int := 0;
  
  -- Pending updates counter
  v_needs_update int := 0;
  
  -- Top critical list
  v_top_critical jsonb := '[]'::jsonb;
BEGIN
  -- Validation
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF v_bu_id IS NULL THEN
    RAISE EXCEPTION 'NO_BU_CONTEXT';
  END IF;

  -- Get profile_id from auth.uid()
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  -- Build team IDs array based on scope
  IF p_scope = 'admin' THEN
    -- Admin sees all KPIs in the BU
    v_team_ids := NULL; -- Will be ignored in query
  ELSIF p_scope = 'leader' AND p_team_id IS NOT NULL THEN
    -- Leader sees KPIs from their team + sub-teams
    IF NOT user_can_manage_team(v_user_id, p_team_id) THEN
      RAISE EXCEPTION 'FORBIDDEN_TEAM_SCOPE';
    END IF;
    v_team_ids := get_descendant_team_ids(p_team_id);
  ELSIF p_scope = 'collaborator' THEN
    -- Collaborator sees KPIs they own or contribute to
    v_team_ids := NULL; -- Will use owner/contributor filter instead
  ELSE
    -- Default: empty result
    RETURN jsonb_build_object(
      'rag_summary', jsonb_build_object('green', 0, 'yellow', 0, 'red', 0, 'gray', 0),
      'needs_update', 0,
      'total', 0,
      'top_critical', '[]'::jsonb
    );
  END IF;

  -- ==========================================
  -- RAG SUMMARY CALCULATION
  -- ==========================================
  WITH kpi_with_latest AS (
    SELECT 
      km.id,
      km.name,
      km.unit,
      km.target_value,
      km.direction,
      km.frequency,
      km.owner_user_id,
      km.team_id,
      km.scope AS kpi_scope,
      kv.value AS latest_value,
      kv.reference_date AS latest_reference_date,
      kv.rag_status AS latest_rag_status,
      -- Calculate days since last update
      EXTRACT(EPOCH FROM (NOW() - kv.reference_date)) / 86400 AS days_since_update,
      -- Determine if needs update based on frequency
      CASE 
        WHEN kv.reference_date IS NULL THEN true
        WHEN km.frequency = 'daily' AND kv.reference_date < CURRENT_DATE - INTERVAL '1 day' THEN true
        WHEN km.frequency = 'weekly' AND kv.reference_date < CURRENT_DATE - INTERVAL '7 days' THEN true
        WHEN km.frequency = 'monthly' AND kv.reference_date < CURRENT_DATE - INTERVAL '30 days' THEN true
        WHEN km.frequency = 'quarterly' AND kv.reference_date < CURRENT_DATE - INTERVAL '90 days' THEN true
        ELSE false
      END AS needs_update_flag
    FROM kpi_metrics km
    LEFT JOIN LATERAL (
      SELECT v.value, v.reference_date, v.rag_status
      FROM kpi_values v
      WHERE v.kpi_id = km.id
      ORDER BY v.reference_date DESC
      LIMIT 1
    ) kv ON true
    WHERE km.bu_id = v_bu_id
      AND km.deleted_at IS NULL
      AND km.status = 'active'
      AND km.lifecycle_status = 'active'
      -- Scope filter
      AND (
        -- Admin: all KPIs
        (p_scope = 'admin')
        -- Leader: team KPIs + global KPIs visible to team
        OR (p_scope = 'leader' AND (
          km.team_id = ANY(v_team_ids)
          OR km.scope = 'org'
        ))
        -- Collaborator: owner or contributor
        OR (p_scope = 'collaborator' AND (
          km.owner_user_id = v_profile_id
          OR EXISTS (
            SELECT 1 FROM kpi_data_contributors kdc
            WHERE kdc.kpi_id = km.id
              AND kdc.contributor_user_id = v_profile_id
              AND kdc.deleted_at IS NULL
          )
        ))
      )
  )
  SELECT 
    COALESCE(SUM(CASE WHEN latest_rag_status = 'on_track' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN latest_rag_status = 'at_risk' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN latest_rag_status = 'off_track' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN latest_rag_status = 'no_data' OR latest_rag_status IS NULL THEN 1 ELSE 0 END), 0),
    COUNT(*),
    COALESCE(SUM(CASE WHEN needs_update_flag THEN 1 ELSE 0 END), 0)
  INTO v_green, v_yellow, v_red, v_gray, v_total, v_needs_update
  FROM kpi_with_latest;

  -- ==========================================
  -- TOP CRITICAL KPIs (priority: red > yellow > outdated)
  -- ==========================================
  WITH kpi_with_latest AS (
    SELECT 
      km.id,
      km.name,
      km.unit,
      km.target_value,
      km.direction,
      km.frequency,
      km.owner_user_id,
      km.team_id,
      kv.value AS current_value,
      kv.reference_date AS latest_reference_date,
      kv.rag_status AS rag_status,
      COALESCE(p.display_name, p.first_name || ' ' || p.last_name) AS owner_name,
      -- Calculate days since last update
      COALESCE(EXTRACT(EPOCH FROM (NOW() - kv.reference_date)) / 86400, 999)::int AS days_since_update,
      -- Priority score for sorting (lower = more critical)
      CASE 
        WHEN kv.rag_status = 'off_track' AND (kv.reference_date IS NULL OR kv.reference_date < CURRENT_DATE - INTERVAL '7 days') THEN 1
        WHEN kv.rag_status = 'off_track' THEN 2
        WHEN kv.rag_status = 'at_risk' AND (kv.reference_date IS NULL OR kv.reference_date < CURRENT_DATE - INTERVAL '7 days') THEN 3
        WHEN kv.rag_status = 'at_risk' THEN 4
        WHEN kv.rag_status = 'no_data' OR kv.rag_status IS NULL THEN 5
        ELSE 10
      END AS priority_score
    FROM kpi_metrics km
    LEFT JOIN LATERAL (
      SELECT v.value, v.reference_date, v.rag_status
      FROM kpi_values v
      WHERE v.kpi_id = km.id
      ORDER BY v.reference_date DESC
      LIMIT 1
    ) kv ON true
    LEFT JOIN profiles p ON p.id = km.owner_user_id
    WHERE km.bu_id = v_bu_id
      AND km.deleted_at IS NULL
      AND km.status = 'active'
      AND km.lifecycle_status = 'active'
      -- Same scope filter as above
      AND (
        (p_scope = 'admin')
        OR (p_scope = 'leader' AND (
          km.team_id = ANY(v_team_ids)
          OR km.scope = 'org'
        ))
        OR (p_scope = 'collaborator' AND (
          km.owner_user_id = v_profile_id
          OR EXISTS (
            SELECT 1 FROM kpi_data_contributors kdc
            WHERE kdc.kpi_id = km.id
              AND kdc.contributor_user_id = v_profile_id
              AND kdc.deleted_at IS NULL
          )
        ))
      )
      -- Only include KPIs that are critical (red, yellow, or no data)
      AND (
        kv.rag_status IN ('off_track', 'at_risk', 'no_data')
        OR kv.rag_status IS NULL
      )
  )
  SELECT COALESCE(jsonb_agg(kpi_data ORDER BY priority_score, latest_reference_date NULLS FIRST), '[]'::jsonb)
  INTO v_top_critical
  FROM (
    SELECT jsonb_build_object(
      'id', k.id,
      'name', k.name,
      'current_value', k.current_value,
      'target_value', k.target_value,
      'unit', k.unit,
      'rag_status', COALESCE(k.rag_status, 'no_data'),
      'days_since_update', k.days_since_update,
      'owner_name', k.owner_name
    ) AS kpi_data,
    k.priority_score,
    k.latest_reference_date
    FROM kpi_with_latest k
    LIMIT 5
  ) sub;

  -- ==========================================
  -- BUILD RESULT
  -- ==========================================
  v_result := jsonb_build_object(
    'rag_summary', jsonb_build_object(
      'green', v_green,
      'yellow', v_yellow,
      'red', v_red,
      'gray', v_gray
    ),
    'needs_update', v_needs_update,
    'total', v_total,
    'top_critical', v_top_critical
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.rpc_kpi_dashboard_summary IS 
'Returns KPI summary for dashboard cards. Supports admin/leader/collaborator scopes with RAG counters, pending updates, and top critical KPIs.';

-- 2. Update rpc_leader_dashboard_summary to use real KPI data
-- This replaces the hardcoded zeros with actual KPI counts
CREATE OR REPLACE FUNCTION public.rpc_leader_dashboard_summary(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_bu_id uuid := current_bu_id();
  v_team_name text;
  v_member_ids uuid[];
  v_team_ids uuid[];
  v_result jsonb;
  
  -- OKR counters
  v_okr_green int := 0;
  v_okr_yellow int := 0;
  v_okr_red int := 0;
  v_okr_not_started int := 0;
  v_okr_pending_checkins int := 0;
  
  -- Ticket counters
  v_tickets_total int := 0;
  v_tickets_overdue int := 0;
  v_tickets_due_soon int := 0;
  v_tickets_awaiting_internal int := 0;
  v_tickets_awaiting_external int := 0;
  v_tickets_top jsonb := '[]'::jsonb;
  
  -- Asset counters
  v_assets_active_loans int := 0;
  v_assets_overdue int := 0;
  v_assets_due_soon int := 0;
  v_assets_top jsonb := '[]'::jsonb;
  
  -- KPI data (now real!)
  v_kpi_summary jsonb;
BEGIN
  -- Validation
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF v_bu_id IS NULL THEN
    RAISE EXCEPTION 'NO_BU_CONTEXT';
  END IF;

  -- Validate team management permission
  IF NOT user_can_manage_team(v_user_id, p_team_id) THEN
    RAISE EXCEPTION 'FORBIDDEN_TEAM_SCOPE';
  END IF;

  -- Get team info
  SELECT name INTO v_team_name
  FROM teams 
  WHERE id = p_team_id AND deleted_at IS NULL;

  IF v_team_name IS NULL THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND';
  END IF;

  -- Get member IDs and descendant team IDs
  v_member_ids := get_team_member_ids(p_team_id);
  v_team_ids := get_descendant_team_ids(p_team_id);

  -- ==========================================
  -- OKR SUMMARY
  -- ==========================================
  SELECT 
    COALESCE(SUM(CASE WHEN kr.status = 'green' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN kr.status = 'yellow' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN kr.status = 'red' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN kr.status = 'not_started' THEN 1 ELSE 0 END), 0)
  INTO v_okr_green, v_okr_yellow, v_okr_red, v_okr_not_started
  FROM okr_team_key_results kr
  WHERE kr.bu_id = v_bu_id
    AND kr.team_id = ANY(v_team_ids)
    AND kr.deleted_at IS NULL;

  -- Count pending check-ins (KRs without check-in in last 7 days)
  SELECT COUNT(*)
  INTO v_okr_pending_checkins
  FROM okr_team_key_results kr
  WHERE kr.bu_id = v_bu_id
    AND kr.team_id = ANY(v_team_ids)
    AND kr.deleted_at IS NULL
    AND kr.status != 'cancelled'
    AND (
      kr.last_checkin_at IS NULL 
      OR kr.last_checkin_at < NOW() - INTERVAL '7 days'
    );

  -- ==========================================
  -- TICKETS SUMMARY (visible to team)
  -- ==========================================
  WITH visible_tickets AS (
    SELECT t.*
    FROM tickets t
    WHERE t.bu_id = v_bu_id
      AND t.deleted_at IS NULL
      AND t.status NOT IN ('done', 'discarded')
      AND (
        -- Ticket visibility: bu_all
        t.visibility = 'bu_all'
        -- OR visible to this team or descendants
        OR (t.visibility = 'teams' AND t.visibility_team_ids && v_team_ids)
        -- OR created/owned by team member
        OR t.created_by_user_id = ANY(v_member_ids)
        OR t.owner_user_id = ANY(v_member_ids)
      )
  )
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN expected_due_at < NOW() THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN expected_due_at BETWEEN NOW() AND NOW() + INTERVAL '48 hours' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END), 0)
  INTO v_tickets_total, v_tickets_overdue, v_tickets_due_soon, v_tickets_awaiting_internal, v_tickets_awaiting_external
  FROM visible_tickets;

  -- Top 5 critical tickets
  SELECT COALESCE(jsonb_agg(ticket_data), '[]'::jsonb)
  INTO v_tickets_top
  FROM (
    SELECT jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'status', t.status,
      'type', t.type,
      'expected_due_at', t.expected_due_at
    ) as ticket_data
    FROM tickets t
    WHERE t.bu_id = v_bu_id
      AND t.deleted_at IS NULL
      AND t.status NOT IN ('done', 'discarded')
      AND (
        t.visibility = 'bu_all'
        OR (t.visibility = 'teams' AND t.visibility_team_ids && v_team_ids)
        OR t.created_by_user_id = ANY(v_member_ids)
        OR t.owner_user_id = ANY(v_member_ids)
      )
    ORDER BY 
      CASE WHEN t.expected_due_at IS NOT NULL AND t.expected_due_at < NOW() THEN 0 ELSE 1 END,
      t.expected_due_at NULLS LAST
    LIMIT 5
  ) sub;

  -- ==========================================
  -- ASSETS SUMMARY (loans by team members)
  -- ==========================================
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN m.due_at IS NOT NULL AND m.due_at < NOW() THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN m.due_at IS NOT NULL AND m.due_at BETWEEN NOW() AND NOW() + INTERVAL '48 hours' THEN 1 ELSE 0 END), 0)
  INTO v_assets_active_loans, v_assets_overdue, v_assets_due_soon
  FROM asset_inventory ai
  LEFT JOIN LATERAL (
    SELECT due_at 
    FROM asset_movements am 
    WHERE am.asset_id = ai.id 
      AND am.movement_type = 'checkout'
    ORDER BY am.occurred_at DESC 
    LIMIT 1
  ) m ON true
  WHERE ai.bu_id = v_bu_id
    AND ai.deleted_at IS NULL
    AND ai.status = 'loaned'
    AND ai.current_holder_type = 'user'
    AND ai.current_user_id = ANY(v_member_ids);

  -- Top 5 critical asset loans
  SELECT COALESCE(jsonb_agg(asset_data), '[]'::jsonb)
  INTO v_assets_top
  FROM (
    SELECT jsonb_build_object(
      'asset_id', ai.id,
      'name', ai.name,
      'internal_code', ai.internal_code,
      'holder_user_id', ai.current_user_id,
      'holder_name', COALESCE(p.display_name, p.first_name || ' ' || p.last_name, 'N/A'),
      'due_at', m.due_at
    ) as asset_data
    FROM asset_inventory ai
    LEFT JOIN profiles p ON p.id = ai.current_user_id
    LEFT JOIN LATERAL (
      SELECT due_at 
      FROM asset_movements am 
      WHERE am.asset_id = ai.id 
        AND am.movement_type = 'checkout'
      ORDER BY am.occurred_at DESC 
      LIMIT 1
    ) m ON true
    WHERE ai.bu_id = v_bu_id
      AND ai.deleted_at IS NULL
      AND ai.status = 'loaned'
      AND ai.current_holder_type = 'user'
      AND ai.current_user_id = ANY(v_member_ids)
    ORDER BY 
      CASE WHEN m.due_at IS NOT NULL AND m.due_at < NOW() THEN 0 ELSE 1 END,
      m.due_at NULLS LAST
    LIMIT 5
  ) sub;

  -- ==========================================
  -- KPI SUMMARY (now using real data!)
  -- ==========================================
  v_kpi_summary := rpc_kpi_dashboard_summary(p_team_id, 'leader');

  -- ==========================================
  -- BUILD RESULT
  -- ==========================================
  v_result := jsonb_build_object(
    'team', jsonb_build_object(
      'id', p_team_id,
      'name', v_team_name
    ),
    'okrs', jsonb_build_object(
      'green', v_okr_green,
      'yellow', v_okr_yellow,
      'red', v_okr_red,
      'not_started', v_okr_not_started,
      'pending_checkins', v_okr_pending_checkins
    ),
    'tickets', jsonb_build_object(
      'total_open', v_tickets_total,
      'overdue', v_tickets_overdue,
      'due_soon', v_tickets_due_soon,
      'awaiting_internal', v_tickets_awaiting_internal,
      'awaiting_external', v_tickets_awaiting_external,
      'top', v_tickets_top
    ),
    'assets', jsonb_build_object(
      'active_loans', v_assets_active_loans,
      'overdue', v_assets_overdue,
      'due_soon', v_assets_due_soon,
      'top', v_assets_top
    ),
    'kpis', jsonb_build_object(
      'tracked_count', (v_kpi_summary->>'total')::int,
      'at_risk_count', (v_kpi_summary->'rag_summary'->>'yellow')::int,
      'breached_count', (v_kpi_summary->'rag_summary'->>'red')::int,
      'needs_update', (v_kpi_summary->>'needs_update')::int,
      'rag_summary', v_kpi_summary->'rag_summary',
      'top', v_kpi_summary->'top_critical'
    )
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.rpc_leader_dashboard_summary IS 'Returns aggregated dashboard data for a team leader including real KPI data';