-- Create impersonation RPC for get_okr_manageable_team_ids
-- Allows super_admin to fetch manageable teams for a target user during impersonation

CREATE OR REPLACE FUNCTION public.get_okr_manageable_team_ids_for_impersonation(
  p_target_profile_id uuid,
  p_bu_id uuid
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_caller_user_id uuid;
  v_is_super_admin boolean;
  v_target_user_id uuid;
  v_is_target_bu_admin boolean;
  v_team_ids text[];
BEGIN
  -- Get caller's user_id
  v_caller_user_id := auth.uid();
  
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Security: Only super_admin can call this
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = v_caller_user_id
      AND ur.role = 'super_admin'
  ) INTO v_is_super_admin;
  
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Only super_admin can use impersonation functions';
  END IF;
  
  -- Get target user's auth.users.id from profiles.id
  SELECT user_id INTO v_target_user_id
  FROM profiles
  WHERE id = p_target_profile_id
    AND deleted_at IS NULL;
  
  IF v_target_user_id IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;
  
  -- Check if target is BU admin (they get all teams)
  SELECT EXISTS (
    SELECT 1 FROM bu_user_memberships bum
    WHERE bum.user_id = v_target_user_id
      AND bum.bu_id = p_bu_id
      AND bum.role_in_bu = 'admin'
      AND bum.status = 'active'
  ) INTO v_is_target_bu_admin;
  
  IF v_is_target_bu_admin THEN
    -- BU admin can manage all teams in the BU
    SELECT array_agg(t.id::text)
    INTO v_team_ids
    FROM teams t
    WHERE t.bu_id = p_bu_id
      AND t.deleted_at IS NULL
      AND t.status = 'active';
    
    RETURN COALESCE(v_team_ids, ARRAY[]::text[]);
  END IF;
  
  -- For non-admin users, get teams where target user is leader (including descendants)
  WITH RECURSIVE led_teams AS (
    -- Teams directly led by target user
    SELECT t.id
    FROM teams t
    WHERE t.bu_id = p_bu_id
      AND t.leader_user_id = p_target_profile_id
      AND t.deleted_at IS NULL
      AND t.status = 'active'
    
    UNION
    
    -- Child teams (recursively)
    SELECT t.id
    FROM teams t
    INNER JOIN led_teams lt ON t.parent_team_id = lt.id
    WHERE t.bu_id = p_bu_id
      AND t.deleted_at IS NULL
      AND t.status = 'active'
  )
  SELECT array_agg(id::text)
  INTO v_team_ids
  FROM led_teams;
  
  RETURN COALESCE(v_team_ids, ARRAY[]::text[]);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_okr_manageable_team_ids_for_impersonation(uuid, uuid) TO authenticated;