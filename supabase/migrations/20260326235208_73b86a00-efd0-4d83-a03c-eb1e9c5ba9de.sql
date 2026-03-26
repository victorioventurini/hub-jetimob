
-- 1. Create helper function: checks if a profile is a leader (direct or ancestor) 
--    of any team that the project owner belongs to.
CREATE OR REPLACE FUNCTION public.is_leader_of_project_owner(
  p_leader_profile_id uuid,
  p_owner_profile_id uuid,
  p_bu_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leader_team_ids uuid[];
  v_owner_team_id uuid;
BEGIN
  IF p_leader_profile_id IS NULL OR p_owner_profile_id IS NULL OR p_bu_id IS NULL THEN
    RETURN false;
  END IF;

  -- Avoid self-check
  IF p_leader_profile_id = p_owner_profile_id THEN
    RETURN false;
  END IF;

  -- Get the owner's team
  SELECT team_id INTO v_owner_team_id
  FROM profiles
  WHERE id = p_owner_profile_id;

  IF v_owner_team_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get all teams the leader manages (direct + descendant)
  SELECT COALESCE(get_okr_manageable_team_ids(
    (SELECT user_id FROM profiles WHERE id = p_leader_profile_id),
    p_bu_id
  ), ARRAY[]::uuid[]) INTO v_leader_team_ids;

  -- Check if owner's team is in the leader's manageable teams
  RETURN v_owner_team_id = ANY(v_leader_team_ids);
END;
$$;
