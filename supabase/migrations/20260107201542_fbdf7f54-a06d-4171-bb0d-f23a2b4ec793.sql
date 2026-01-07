
-- Corrigir a função get_leader_teams para considerar que leader_user_id 
-- referencia profiles.id e não auth.users.id
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
  v_profile_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Validate BU access
  IF NOT user_has_bu_access(v_user_id, v_bu_id) THEN
    RETURN;
  END IF;

  -- Get profile_id from user_id (since leader_user_id references profiles.id)
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_profile_id IS NULL THEN
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
  WHERE t.leader_user_id = v_profile_id
    AND t.bu_id = v_bu_id
    AND t.deleted_at IS NULL
    AND t.status = 'active'
  ORDER BY t.name;
END;
$$;
