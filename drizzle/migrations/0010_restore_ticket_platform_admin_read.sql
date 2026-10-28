DO $migration$
DECLARE
  definition text;
  anchor text := '  IF p_profile_id IS NOT NULL THEN v_is_bu_member := is_profile_bu_member(p_profile_id, v_ticket.bu_id); END IF;';
BEGIN
  SELECT pg_get_functiondef('public.can_view_ticket(uuid,uuid)'::regprocedure) INTO definition;
  IF position(anchor IN definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected can_view_ticket definition; refusing to change authorization';
  END IF;
  definition := replace(definition, anchor,
    '  -- Restore platform administrative reads only for the actual authenticated viewer.
  -- A supplied impersonated profile must still pass its own ticket visibility checks.
  IF v_is_platform_admin AND (p_profile_id IS NULL OR p_profile_id = public.my_profile_id()) THEN
    RETURN true;
  END IF;

' || anchor);
  EXECUTE definition;
END;
$migration$;