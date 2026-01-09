-- =============================================================
-- MEMBERSHIP ACTIVE RULE HARDENING
-- Fix all SQL functions to use correct membership rules
-- =============================================================

-- 1) DROP the overloaded get_team_member_ids with is_active reference
DROP FUNCTION IF EXISTS public.get_team_member_ids(uuid);

-- 2) RECREATE get_team_member_ids with correct logic (no is_active)
-- user_team_memberships: existence = active (no deleted_at/left_at/is_active column)
CREATE OR REPLACE FUNCTION public.get_team_member_ids(
  p_team_id uuid,
  p_include_subtree boolean DEFAULT false
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_member_ids uuid[];
BEGIN
  IF NOT p_include_subtree THEN
    -- Direct team members only
    -- user_team_memberships: existence = active
    SELECT ARRAY_AGG(DISTINCT utm.user_id)
    INTO v_member_ids
    FROM user_team_memberships utm
    WHERE utm.team_id = p_team_id;
  ELSE
    -- Include entire subtree
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
    -- user_team_memberships: existence = active (no filter needed)
  END IF;

  RETURN COALESCE(v_member_ids, ARRAY[]::uuid[]);
END;
$function$;

-- 3) FIX can_view_ticket: use squad_memberships (not user_squad_memberships) with deleted_at
CREATE OR REPLACE FUNCTION public.can_view_ticket(p_user_id uuid, p_ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        -- Fall through to check squad and user lists
        NULL;
      ELSE
        -- Check if user belongs to any of the visibility teams
        -- user_team_memberships: existence = active
        IF EXISTS (
          SELECT 1 FROM public.user_team_memberships utm
          WHERE utm.user_id = p_user_id
            AND utm.team_id = ANY(v_ticket.visibility_team_ids)
        ) THEN
          RETURN true;
        END IF;
      END IF;
      
      -- Check squad visibility
      -- squad_memberships: deleted_at IS NULL = active
      IF v_ticket.visibility_squad_ids IS NOT NULL AND array_length(v_ticket.visibility_squad_ids, 1) IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM public.squad_memberships sm
          WHERE sm.user_id = p_user_id
            AND sm.squad_id = ANY(v_ticket.visibility_squad_ids)
            AND sm.deleted_at IS NULL
        ) THEN
          RETURN true;
        END IF;
      END IF;
      
      -- Check explicit user visibility
      IF v_ticket.visibility_user_ids IS NOT NULL AND p_user_id = ANY(v_ticket.visibility_user_ids) THEN
        RETURN true;
      END IF;
      
      RETURN false;
    
    WHEN 'private' THEN
      RETURN (v_ticket.visibility_user_ids IS NOT NULL AND p_user_id = ANY(v_ticket.visibility_user_ids));
    
    ELSE
      RETURN false;
  END CASE;
END;
$function$;

-- 4) FIX check_scope_access: implement 'squad' scope with correct table
CREATE OR REPLACE FUNCTION public.check_scope_access(
  p_user_id uuid, 
  p_scope text, 
  p_ctx jsonb DEFAULT NULL::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      
      -- User is member of the team
      -- user_team_memberships: existence = active
      RETURN EXISTS (
        SELECT 1 FROM public.user_team_memberships utm
        WHERE utm.user_id = p_user_id
          AND utm.team_id = v_team_id
      );
    
    WHEN 'team_tree' THEN
      v_team_id := (p_ctx->>'team_id')::uuid;
      IF v_team_id IS NULL THEN RETURN false; END IF;
      
      -- User is member of the team or any descendant
      -- teams.deleted_at IS NULL for active teams
      -- user_team_memberships: existence = active
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
      v_squad_id := (p_ctx->>'squad_id')::uuid;
      IF v_squad_id IS NULL THEN RETURN false; END IF;
      
      -- User is member of the squad
      -- squad_memberships: deleted_at IS NULL = active
      RETURN EXISTS (
        SELECT 1 FROM public.squad_memberships sm
        WHERE sm.user_id = p_user_id
          AND sm.squad_id = v_squad_id
          AND sm.deleted_at IS NULL
      );
    
    WHEN 'self_or_owner' THEN
      v_target_user_id := (p_ctx->>'target_user_id')::uuid;
      v_resource_owner_id := (p_ctx->>'resource_owner_id')::uuid;
      
      -- User is the target or the owner of the resource
      RETURN p_user_id = v_target_user_id OR p_user_id = v_resource_owner_id;
    
    ELSE
      RETURN false;
  END CASE;
END;
$function$;

-- 5) Update get_leader_teams to include explicit comment about membership rule
CREATE OR REPLACE FUNCTION public.get_leader_teams(p_bu_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  team_id uuid, 
  team_name text, 
  team_description text, 
  parent_team_id uuid, 
  member_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_bu_id uuid;
BEGIN
  v_user_id := my_profile_id();
  v_bu_id := COALESCE(p_bu_id, current_bu_id());
  
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.description as team_description,
    t.parent_team_id,
    -- user_team_memberships: existence = active (no deleted_at/is_active column)
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
$function$;

-- Add comments for documentation
COMMENT ON FUNCTION public.get_team_member_ids(uuid, boolean) IS 
'Returns user IDs of team members. user_team_memberships uses existence-based active rule (no soft delete).';

COMMENT ON FUNCTION public.can_view_ticket(uuid, uuid) IS 
'Checks if user can view a ticket. Uses squad_memberships.deleted_at IS NULL for active squad members.';

COMMENT ON FUNCTION public.check_scope_access(uuid, text, jsonb) IS 
'Checks scope-based access. team/team_tree uses existence-based rule, squad uses deleted_at IS NULL.';

COMMENT ON FUNCTION public.get_leader_teams(uuid) IS 
'Returns teams where user is leader. member_count uses existence-based rule for user_team_memberships.';