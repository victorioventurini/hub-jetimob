-- Fix get_leader_teams to return correct column names matching LeaderTeam type
DROP FUNCTION IF EXISTS public.get_leader_teams(uuid);

CREATE FUNCTION public.get_leader_teams(p_bu_id uuid DEFAULT NULL::uuid)
RETURNS TABLE (
  team_id uuid,
  team_name text,
  team_description text,
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
    t.id as team_id,
    t.name as team_name,
    t.description as team_description,
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