-- Fix functions using non-existent utm.is_active column
-- The user_team_memberships table does not have is_active - membership existence = active

-- First, drop functions that need signature changes
DROP FUNCTION IF EXISTS public.get_leader_teams(uuid);

-- Recreate get_leader_teams function
CREATE OR REPLACE FUNCTION public.get_leader_teams(p_bu_id uuid DEFAULT NULL::uuid)
RETURNS TABLE (
  id uuid,
  name text,
  leader_user_id uuid,
  parent_team_id uuid,
  member_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_bu_id uuid;
BEGIN
  v_user_id := my_profile_id();
  v_bu_id := COALESCE(p_bu_id, current_bu_id());
  
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.leader_user_id,
    t.parent_team_id,
    COALESCE((
      SELECT COUNT(*) 
      FROM user_team_memberships utm 
      WHERE utm.team_id = t.id
    ), 0) as member_count
  FROM teams t
  WHERE t.leader_user_id = v_user_id
    AND t.bu_id = v_bu_id
    AND t.deleted_at IS NULL
  ORDER BY t.name;
END;
$$;

-- Fix get_team_member_ids function (no signature change needed)
CREATE OR REPLACE FUNCTION public.get_team_member_ids(p_team_id uuid, p_include_subtree boolean DEFAULT false)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_ids uuid[];
BEGIN
  IF NOT p_include_subtree THEN
    SELECT ARRAY_AGG(DISTINCT utm.user_id)
    INTO v_member_ids
    FROM user_team_memberships utm
    WHERE utm.team_id = p_team_id;
  ELSE
    WITH RECURSIVE team_tree AS (
      SELECT id FROM teams WHERE id = p_team_id AND deleted_at IS NULL
      UNION ALL
      SELECT t.id FROM teams t
      JOIN team_tree tt ON t.parent_team_id = tt.id
      WHERE t.deleted_at IS NULL
    )
    SELECT ARRAY_AGG(DISTINCT utm.user_id)
    INTO v_member_ids
    FROM user_team_memberships utm
    WHERE utm.team_id IN (SELECT id FROM team_tree);
  END IF;

  RETURN COALESCE(v_member_ids, ARRAY[]::uuid[]);
END;
$$;

-- Fix check_scope_access function for team and team_tree scopes
CREATE OR REPLACE FUNCTION public.check_scope_access(
  p_user_id uuid,
  p_scope text,
  p_ctx jsonb DEFAULT NULL::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_squad_id uuid;
  v_target_user_id uuid;
  v_resource_owner_id uuid;
BEGIN
  CASE p_scope
    WHEN 'bu' THEN
      RETURN true;
    
    WHEN 'team' THEN
      v_team_id := (p_ctx->>'team_id')::uuid;
      IF v_team_id IS NULL THEN RETURN false; END IF;
      
      -- User is member of the team (membership existence = active)
      RETURN EXISTS (
        SELECT 1 FROM public.user_team_memberships utm
        WHERE utm.user_id = p_user_id
          AND utm.team_id = v_team_id
      );
    
    WHEN 'team_tree' THEN
      v_team_id := (p_ctx->>'team_id')::uuid;
      IF v_team_id IS NULL THEN RETURN false; END IF;
      
      -- User is member of the team or any descendant (membership existence = active)
      RETURN EXISTS (
        WITH RECURSIVE team_hierarchy AS (
          SELECT id FROM public.teams WHERE id = v_team_id AND deleted_at IS NULL
          UNION ALL
          SELECT t.id FROM public.teams t
          JOIN team_hierarchy th ON t.parent_team_id = th.id
          WHERE t.deleted_at IS NULL
        )
        SELECT 1 FROM public.user_team_memberships utm
        WHERE utm.user_id = p_user_id
          AND utm.team_id IN (SELECT id FROM team_hierarchy)
      );
    
    WHEN 'squad' THEN
      RETURN false;
    
    WHEN 'self_or_owner' THEN
      v_target_user_id := (p_ctx->>'target_user_id')::uuid;
      v_resource_owner_id := (p_ctx->>'resource_owner_id')::uuid;
      
      -- User is the target or the owner of the resource
      RETURN p_user_id = v_target_user_id OR p_user_id = v_resource_owner_id;
    
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Fix ticket visibility function
CREATE OR REPLACE FUNCTION public.can_view_ticket(p_user_id uuid, p_ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_bu_id uuid;
BEGIN
  v_bu_id := current_bu_id();
  
  SELECT 
    t.id,
    t.created_by_user_id,
    t.assigned_to_user_id,
    t.visibility,
    t.visibility_team_ids,
    t.visibility_squad_ids,
    t.visibility_user_ids
  INTO v_ticket
  FROM public.tickets t
  WHERE t.id = p_ticket_id AND t.bu_id = v_bu_id AND t.deleted_at IS NULL;
  
  IF v_ticket IS NULL THEN
    RETURN false;
  END IF;
  
  -- Creator or assignee always can view
  IF v_ticket.created_by_user_id = p_user_id OR v_ticket.assigned_to_user_id = p_user_id THEN
    RETURN true;
  END IF;
  
  -- Check visibility rules
  CASE v_ticket.visibility
    WHEN 'public' THEN
      RETURN true;
    
    WHEN 'team' THEN
      IF v_ticket.visibility_team_ids IS NULL OR array_length(v_ticket.visibility_team_ids, 1) IS NULL THEN
        RETURN false;
      END IF;
      
      -- Check if user belongs to any of the teams (membership existence = active)
      RETURN EXISTS (
        SELECT 1 FROM public.user_team_memberships utm
        WHERE utm.user_id = p_user_id
          AND (utm.team_id = ANY(v_ticket.visibility_team_ids))
      )
      OR EXISTS (
        SELECT 1 FROM public.user_squad_memberships usm
        WHERE usm.user_id = p_user_id
          AND (usm.squad_id = ANY(v_ticket.visibility_squad_ids))
      )
      OR (v_ticket.visibility_user_ids IS NOT NULL AND p_user_id = ANY(v_ticket.visibility_user_ids));
    
    WHEN 'private' THEN
      RETURN (v_ticket.visibility_user_ids IS NOT NULL AND p_user_id = ANY(v_ticket.visibility_user_ids));
    
    ELSE
      RETURN false;
  END CASE;
END;
$$;