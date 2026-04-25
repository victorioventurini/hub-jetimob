CREATE OR REPLACE FUNCTION public.can_manage_team_okr_by_profile(p_profile_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_auth_user_id uuid;
  v_team_bu_id uuid;
BEGIN
  IF p_profile_id IS NULL OR p_team_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT t.bu_id
  INTO v_team_bu_id
  FROM public.teams t
  WHERE t.id = p_team_id
    AND t.deleted_at IS NULL
    AND t.status = 'active'
  LIMIT 1;

  IF v_team_bu_id IS NULL THEN
    RETURN false;
  END IF;

  v_auth_user_id := public.user_id_from_profile_id(p_profile_id);

  IF v_auth_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN p_team_id = ANY(
    public.get_okr_manageable_team_ids(v_auth_user_id, v_team_bu_id)
  );
END;
$function$;