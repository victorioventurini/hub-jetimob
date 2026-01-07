-- ============================================
-- LEADER DASHBOARD RPCs + Supporting Functions
-- TCR v2.4.0 - Leader Dashboard Evolution
-- ============================================

-- 1. GET TEAMS THAT USER CAN LEAD (for selector)
-- Returns all teams where user is direct leader
CREATE OR REPLACE FUNCTION public.get_leader_teams(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  team_id uuid,
  team_name text,
  team_description text,
  parent_team_id uuid,
  member_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_bu_id uuid := current_bu_id();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Validate BU access
  IF NOT user_has_bu_access(v_user_id, v_bu_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.description as team_description,
    t.parent_team_id,
    COALESCE((
      SELECT COUNT(*) 
      FROM user_team_memberships utm 
      WHERE utm.team_id = t.id AND utm.is_active = true
    ), 0) as member_count
  FROM teams t
  WHERE t.leader_user_id = v_user_id
    AND t.bu_id = v_bu_id
    AND t.deleted_at IS NULL
    AND t.status = 'active'
  ORDER BY t.name;
END;
$$;

COMMENT ON FUNCTION public.get_leader_teams IS 'Returns all teams where the current user is the direct leader';

-- 2. GET TEAM MEMBERS (including descendants)
-- Helper function to get all user IDs in a team and its sub-teams
CREATE OR REPLACE FUNCTION public.get_team_member_ids(p_team_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_member_ids uuid[];
BEGIN
  -- Get all team IDs (including descendants)
  WITH RECURSIVE team_tree AS (
    SELECT id FROM teams WHERE id = p_team_id AND deleted_at IS NULL
    UNION ALL
    SELECT t.id FROM teams t
    INNER JOIN team_tree tt ON t.parent_team_id = tt.id
    WHERE t.deleted_at IS NULL
  )
  SELECT ARRAY_AGG(DISTINCT utm.user_id)
  INTO v_member_ids
  FROM user_team_memberships utm
  WHERE utm.team_id IN (SELECT id FROM team_tree)
    AND utm.is_active = true;

  RETURN COALESCE(v_member_ids, ARRAY[]::uuid[]);
END;
$$;

COMMENT ON FUNCTION public.get_team_member_ids IS 'Returns array of user IDs that are members of the team and its sub-teams';

-- 3. GET DESCENDANT TEAM IDS
CREATE OR REPLACE FUNCTION public.get_descendant_team_ids(p_team_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_team_ids uuid[];
BEGIN
  WITH RECURSIVE team_tree AS (
    SELECT id FROM teams WHERE id = p_team_id AND deleted_at IS NULL
    UNION ALL
    SELECT t.id FROM teams t
    INNER JOIN team_tree tt ON t.parent_team_id = tt.id
    WHERE t.deleted_at IS NULL
  )
  SELECT ARRAY_AGG(id)
  INTO v_team_ids
  FROM team_tree;

  RETURN COALESCE(v_team_ids, ARRAY[]::uuid[]);
END;
$$;

COMMENT ON FUNCTION public.get_descendant_team_ids IS 'Returns array of team IDs including the given team and all descendants';

-- 4. MAIN RPC: LEADER DASHBOARD SUMMARY
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
  
  -- KPI data
  v_kpis_top jsonb := '[]'::jsonb;
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
      CASE WHEN t.expected_due_at < NOW() THEN 0 ELSE 1 END,
      t.expected_due_at NULLS LAST
    LIMIT 5
  ) sub;

  -- ==========================================
  -- ASSETS SUMMARY (loans by team members)
  -- ==========================================
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE 
      WHEN m.due_at IS NOT NULL AND m.due_at < NOW() THEN 1 
      ELSE 0 
    END), 0),
    COALESCE(SUM(CASE 
      WHEN m.due_at IS NOT NULL AND m.due_at BETWEEN NOW() AND NOW() + INTERVAL '48 hours' THEN 1 
      ELSE 0 
    END), 0)
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
    LEFT JOIN profiles p ON p.user_id = ai.current_user_id
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
      'tracked_count', 0,
      'at_risk_count', 0,
      'breached_count', 0,
      'top', v_kpis_top
    )
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.rpc_leader_dashboard_summary IS 'Returns aggregated dashboard data for a team leader';

-- 5. LEADER FOCUS ITEMS
CREATE OR REPLACE FUNCTION public.rpc_leader_dashboard_focus(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_bu_id uuid := current_bu_id();
  v_member_ids uuid[];
  v_team_ids uuid[];
  v_focus_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_count int;
BEGIN
  -- Validation
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF NOT user_can_manage_team(v_user_id, p_team_id) THEN
    RAISE EXCEPTION 'FORBIDDEN_TEAM_SCOPE';
  END IF;

  v_member_ids := get_team_member_ids(p_team_id);
  v_team_ids := get_descendant_team_ids(p_team_id);

  -- Focus 1: Overdue assets
  SELECT COUNT(*)
  INTO v_count
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
    AND ai.current_user_id = ANY(v_member_ids)
    AND m.due_at < NOW();

  IF v_count > 0 THEN
    v_focus_items := v_focus_items || jsonb_build_object(
      'type', 'warning',
      'label', v_count || ' ativo(s) com devolução atrasada',
      'url', '/assets/inventory?filter=overdue',
      'cta', 'Cobrar devolução'
    );
  END IF;

  -- Focus 2: Overdue tickets
  SELECT COUNT(*)
  INTO v_count
  FROM tickets t
  WHERE t.bu_id = v_bu_id
    AND t.deleted_at IS NULL
    AND t.status NOT IN ('done', 'discarded')
    AND t.expected_due_at < NOW()
    AND (
      t.visibility = 'bu_all'
      OR (t.visibility = 'teams' AND t.visibility_team_ids && v_team_ids)
      OR t.owner_user_id = ANY(v_member_ids)
    );

  IF v_count > 0 THEN
    v_focus_items := v_focus_items || jsonb_build_object(
      'type', 'warning',
      'label', v_count || ' ticket(s) vencido(s)',
      'url', '/tickets?filter=overdue',
      'cta', 'Ver tickets'
    );
  END IF;

  -- Focus 3: OKRs needing check-in
  SELECT COUNT(*)
  INTO v_count
  FROM okr_team_key_results kr
  WHERE kr.bu_id = v_bu_id
    AND kr.team_id = ANY(v_team_ids)
    AND kr.deleted_at IS NULL
    AND kr.status != 'cancelled'
    AND (kr.last_checkin_at IS NULL OR kr.last_checkin_at < NOW() - INTERVAL '7 days');

  IF v_count > 0 THEN
    v_focus_items := v_focus_items || jsonb_build_object(
      'type', 'action',
      'label', v_count || ' KR(s) precisam de check-in',
      'url', '/okrs?team=' || p_team_id::text,
      'cta', 'Fazer check-in'
    );
  END IF;

  -- Limit to 3 items
  IF jsonb_array_length(v_focus_items) > 3 THEN
    v_focus_items := (
      SELECT jsonb_agg(elem)
      FROM (SELECT elem FROM jsonb_array_elements(v_focus_items) elem LIMIT 3) sub
    );
  END IF;

  -- If no items, return encouraging message
  IF jsonb_array_length(v_focus_items) = 0 THEN
    v_focus_items := jsonb_build_array(
      jsonb_build_object(
        'type', 'info',
        'label', 'Tudo em dia no seu time!',
        'url', NULL,
        'cta', NULL
      )
    );
  END IF;

  RETURN v_focus_items;
END;
$$;

COMMENT ON FUNCTION public.rpc_leader_dashboard_focus IS 'Returns top 3 focus items for a team leader';

-- 6. CHECK IF USER IS A LEADER (has at least one manageable team)
CREATE OR REPLACE FUNCTION public.is_user_leader(p_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_bu_id uuid := current_bu_id();
BEGIN
  IF v_user_id IS NULL OR v_bu_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM teams t
    WHERE t.leader_user_id = v_user_id
      AND t.bu_id = v_bu_id
      AND t.deleted_at IS NULL
      AND t.status = 'active'
  );
END;
$$;

COMMENT ON FUNCTION public.is_user_leader IS 'Returns true if user is a leader of at least one team in the current BU';

-- 7. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_teams_leader_bu 
  ON teams(leader_user_id, bu_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_asset_inventory_loaned_user 
  ON asset_inventory(bu_id, current_user_id) 
  WHERE status = 'loaned' AND current_holder_type = 'user' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_visibility_due 
  ON tickets(bu_id, visibility, expected_due_at) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_okr_team_kr_checkin 
  ON okr_team_key_results(bu_id, team_id, last_checkin_at) 
  WHERE deleted_at IS NULL;