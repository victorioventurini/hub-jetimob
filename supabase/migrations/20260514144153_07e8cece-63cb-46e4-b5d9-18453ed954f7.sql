CREATE OR REPLACE FUNCTION public.has_assessment_permission(_user_id uuid, _bu_id uuid, _key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  IF _user_id IS NULL OR _bu_id IS NULL OR _key IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_platform_admin(_user_id) OR public.is_bu_admin(_user_id, _bu_id) THEN
    RETURN true;
  END IF;

  v_profile_id := public.profile_id_from_user_id(_user_id);
  IF v_profile_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN public.user_has_permission(v_profile_id, _bu_id, _key);
END;
$$;