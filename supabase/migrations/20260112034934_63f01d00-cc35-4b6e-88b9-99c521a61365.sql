
-- RPC para buscar role de um usuário para impersonação
CREATE OR REPLACE FUNCTION public.get_user_role_for_impersonation(
  p_target_profile_id uuid,
  p_bu_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_caller_user_id uuid;
  v_role text;
BEGIN
  -- Security: Only super_admin can call this
  v_caller_user_id := auth.uid();
  
  IF NOT public.is_super_admin(v_caller_user_id) THEN
    RAISE EXCEPTION 'Only super_admin can impersonate users';
  END IF;
  
  -- Validate inputs
  IF p_target_profile_id IS NULL THEN
    RAISE EXCEPTION 'Target profile ID is required';
  END IF;
  
  IF p_bu_id IS NULL THEN
    RAISE EXCEPTION 'BU ID is required';
  END IF;
  
  -- Get role for target user in the specified BU
  SELECT role_in_bu INTO v_role
  FROM bu_user_memberships
  WHERE profile_id = p_target_profile_id
    AND bu_id = p_bu_id
    AND deleted_at IS NULL
  LIMIT 1;
  
  RETURN COALESCE(v_role, 'collaborator');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role_for_impersonation(uuid, uuid) TO authenticated;

-- RPC para buscar times onde o usuário é líder (para impersonação)
CREATE OR REPLACE FUNCTION public.get_leader_teams_for_impersonation(
  p_target_profile_id uuid,
  p_bu_id uuid
)
RETURNS TABLE(
  team_id uuid,
  team_name text,
  member_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_caller_user_id uuid;
BEGIN
  -- Security: Only super_admin can call this
  v_caller_user_id := auth.uid();
  
  IF NOT public.is_super_admin(v_caller_user_id) THEN
    RAISE EXCEPTION 'Only super_admin can impersonate users';
  END IF;
  
  -- Validate inputs
  IF p_target_profile_id IS NULL THEN
    RAISE EXCEPTION 'Target profile ID is required';
  END IF;
  
  IF p_bu_id IS NULL THEN
    RAISE EXCEPTION 'BU ID is required';
  END IF;
  
  -- Return teams where target user is leader
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    (SELECT COUNT(*) FROM profiles p WHERE p.team_id = t.id AND p.deleted_at IS NULL) as member_count
  FROM teams t
  WHERE t.bu_id = p_bu_id
    AND t.leader_id = p_target_profile_id
    AND t.deleted_at IS NULL
    AND t.status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leader_teams_for_impersonation(uuid, uuid) TO authenticated;
