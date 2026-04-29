CREATE OR REPLACE FUNCTION public.user_can_create_kpi(
  p_profile_id uuid,
  p_bu_id uuid,
  p_scope kpi_scope,
  p_area_id uuid,
  p_team_id uuid,
  p_indicator_type kpi_indicator_type
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_team_area_id uuid;
  v_parent uuid;
BEGIN
  IF p_profile_id IS NULL OR p_bu_id IS NULL OR p_scope IS NULL THEN RETURN false; END IF;

  SELECT p.user_id INTO v_user_id FROM public.profiles p WHERE p.id = p_profile_id;

  IF v_user_id IS NOT NULL AND (is_platform_admin(v_user_id) OR is_bu_admin(v_user_id, p_bu_id)) THEN
    RETURN true;
  END IF;

  IF has_permission(p_profile_id, p_bu_id, 'kpis.settings.manage:bu') THEN
    RETURN true;
  END IF;

  IF p_indicator_type = 'metric' THEN
    IF p_scope <> 'team' OR p_team_id IS NULL THEN RETURN false; END IF;
    IF EXISTS (
      SELECT 1 FROM public.user_team_memberships m
      WHERE m.team_id = p_team_id AND m.user_id = p_profile_id
    ) THEN RETURN true; END IF;
  END IF;

  IF p_scope = 'org' THEN RETURN false; END IF;

  IF p_scope = 'area' AND p_area_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.areas a
      WHERE a.id = p_area_id AND a.deleted_at IS NULL
        AND (a.leader_user_id = p_profile_id OR a.co_leader_user_id = p_profile_id)
    );
  END IF;

  IF p_scope = 'team' AND p_team_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = p_team_id AND t.deleted_at IS NULL AND t.leader_user_id = p_profile_id
    ) THEN RETURN true; END IF;

    SELECT t.area_id INTO v_team_area_id FROM public.teams t WHERE t.id = p_team_id;
    IF v_team_area_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.areas a
      WHERE a.id = v_team_area_id AND a.deleted_at IS NULL
        AND (a.leader_user_id = p_profile_id OR a.co_leader_user_id = p_profile_id)
    ) THEN RETURN true; END IF;

    v_parent := (SELECT parent_team_id FROM public.teams WHERE id = p_team_id);
    WHILE v_parent IS NOT NULL LOOP
      IF EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = v_parent AND t.deleted_at IS NULL AND t.leader_user_id = p_profile_id
      ) THEN RETURN true; END IF;
      v_parent := (SELECT parent_team_id FROM public.teams WHERE id = v_parent);
    END LOOP;
  END IF;

  RETURN false;
END;
$$;