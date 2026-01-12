
-- Fix: Use correct column name leader_user_id instead of leader_id
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
  
  -- Return teams where target user is leader (correct column: leader_user_id)
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    (SELECT COUNT(*) FROM profiles p WHERE p.team_id = t.id AND p.deleted_at IS NULL) as member_count
  FROM teams t
  WHERE t.bu_id = p_bu_id
    AND t.leader_user_id = p_target_profile_id
    AND t.deleted_at IS NULL
    AND t.status = 'active';
END;
$$;
