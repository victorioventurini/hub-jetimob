-- ============================================================
-- TEAM HIERARCHY FUNCTIONS + CLEANUP OF CEO REFERENCES
-- v2.2.0 - Consolidation
-- ============================================================

-- ============================================================
-- 1. TEAM HIERARCHY FUNCTIONS
-- ============================================================

-- 1.1 Check if user is DIRECT leader of a team
CREATE OR REPLACE FUNCTION public.is_team_leader(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams
    WHERE id = p_team_id
      AND leader_user_id = p_user_id
      AND deleted_at IS NULL
  )
$$;

-- 1.2 Check if ancestor_team_id is a parent/grandparent of team_id
-- Uses recursive CTE to traverse hierarchy UP
CREATE OR REPLACE FUNCTION public.team_is_ancestor(p_ancestor_team_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Same team is not an ancestor of itself
  IF p_ancestor_team_id = p_team_id THEN
    RETURN false;
  END IF;

  -- Traverse up the hierarchy from p_team_id
  RETURN EXISTS (
    WITH RECURSIVE ancestors AS (
      -- Start from the team we're checking
      SELECT parent_team_id
      FROM public.teams
      WHERE id = p_team_id AND deleted_at IS NULL
      
      UNION ALL
      
      -- Recursively get parents
      SELECT t.parent_team_id
      FROM public.teams t
      INNER JOIN ancestors a ON t.id = a.parent_team_id
      WHERE t.deleted_at IS NULL
    )
    SELECT 1 FROM ancestors WHERE parent_team_id = p_ancestor_team_id
    UNION
    SELECT 1 FROM public.teams WHERE id = p_team_id AND parent_team_id = p_ancestor_team_id
  );
END;
$$;

-- 1.3 Check if team_id is a descendant of ancestor_team_id
-- Useful for "can I see this child team?"
CREATE OR REPLACE FUNCTION public.team_is_descendant(p_team_id uuid, p_ancestor_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_team_id = p_ancestor_team_id THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    WITH RECURSIVE descendants AS (
      SELECT id FROM public.teams WHERE parent_team_id = p_ancestor_team_id AND deleted_at IS NULL
      UNION ALL
      SELECT t.id FROM public.teams t
      INNER JOIN descendants d ON t.parent_team_id = d.id
      WHERE t.deleted_at IS NULL
    )
    SELECT 1 FROM descendants WHERE id = p_team_id
  );
END;
$$;

-- 1.4 FINAL rule: Can user manage this team?
-- Returns TRUE only if:
-- - User is super_admin (global)
-- - User is BU admin
-- - User is DIRECT leader of this exact team
-- DOES NOT allow managing parent teams, sibling teams, or other branches
CREATE OR REPLACE FUNCTION public.user_can_manage_team(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bu_id uuid;
BEGIN
  -- 1) Super admin can manage any team
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;

  -- 2) Get team's BU
  SELECT bu_id INTO v_bu_id FROM public.teams WHERE id = p_team_id AND deleted_at IS NULL;
  IF v_bu_id IS NULL THEN
    RETURN false;
  END IF;

  -- 3) BU admin can manage any team in their BU
  IF is_bu_admin(p_user_id, v_bu_id) THEN
    RETURN true;
  END IF;

  -- 4) Direct leader of this exact team
  RETURN is_team_leader(p_user_id, p_team_id);
END;
$$;

-- 1.5 Get all teams user can manage (for UI dropdowns)
CREATE OR REPLACE FUNCTION public.get_manageable_teams(p_user_id uuid, p_bu_id uuid)
RETURNS TABLE(team_id uuid, team_name text, can_manage boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    user_can_manage_team(p_user_id, t.id)
  FROM public.teams t
  WHERE t.bu_id = p_bu_id
    AND t.deleted_at IS NULL
    AND t.status = 'active'
  ORDER BY t.name;
END;
$$;

-- ============================================================
-- 2. UPDATE is_bu_admin TO REMOVE CEO REFERENCE
-- ============================================================

-- Already done in previous migration, but ensure clean version exists
CREATE OR REPLACE FUNCTION public.is_bu_admin(p_user_id uuid, p_bu_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bu_user_memberships
    WHERE user_id = p_user_id
      AND bu_id = p_bu_id
      AND role_in_bu IN ('admin', 'super_admin')
  )
$$;

-- ============================================================
-- 3. GRANT STATEMENTS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.is_team_leader(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_is_ancestor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_is_descendant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_team(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_manageable_teams(uuid, uuid) TO authenticated;