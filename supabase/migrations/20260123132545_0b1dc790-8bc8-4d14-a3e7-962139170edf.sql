-- Fix is_bu_admin function: p_user_id is already a profile_id (from has_permission)
-- The current implementation incorrectly tries to convert profile_id → profile_id
-- which fails because profile_id_from_user_id expects auth.users.id

CREATE OR REPLACE FUNCTION public.is_bu_admin(p_user_id uuid, p_bu_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_strict boolean;
  v_auth_user_id uuid;
  v_profile_id uuid;
BEGIN
  -- Check canary flag
  v_strict := COALESCE((get_system_setting('identity_cutover_strict'))::boolean, false);
  
  IF v_strict THEN
    RAISE EXCEPTION '[CUTOVER] is_bu_admin(user_id, bu_id) is deprecated. Use is_profile_bu_admin(my_profile_id(), bu_id) instead.';
  END IF;
  
  -- FIXED: p_user_id can be EITHER auth.users.id OR profile_id
  -- Try profile_id first (most common case from has_permission → my_profile_id())
  IF EXISTS (
    SELECT 1 FROM bu_user_memberships 
    WHERE profile_id = p_user_id 
      AND bu_id = p_bu_id 
      AND role_in_bu IN ('admin', 'super_admin')
      AND deleted_at IS NULL
  ) THEN
    RETURN true;
  END IF;
  
  -- Fallback: maybe p_user_id is actually auth.users.id, convert it
  v_profile_id := profile_id_from_user_id(p_user_id);
  IF v_profile_id IS NOT NULL THEN
    RETURN is_profile_bu_admin(v_profile_id, p_bu_id);
  END IF;
  
  RETURN false;
END;
$function$;

COMMENT ON FUNCTION public.is_bu_admin(uuid, uuid) IS 
'Checks if a user is BU admin. Accepts either profile_id or auth.users.id for backward compatibility. Prefers direct profile_id lookup.';