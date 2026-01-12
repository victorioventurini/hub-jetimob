-- =============================================================
-- RPC: get_user_permissions_for_impersonation
-- Permite que super_admin busque as permissões de qualquer usuário
-- para funcionalidade de "View as User"
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_user_permissions_for_impersonation(
  p_target_profile_id uuid,
  p_bu_id uuid
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_caller_user_id uuid;
  v_permissions text[];
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
  
  -- Get permissions for target user using existing function
  SELECT ARRAY_AGG(permission_key) INTO v_permissions
  FROM public.get_effective_permissions_v2(p_target_profile_id, p_bu_id);
  
  RETURN COALESCE(v_permissions, ARRAY[]::text[]);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_permissions_for_impersonation(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.get_user_permissions_for_impersonation IS 
'Returns the permission keys for a target user in a specific BU. 
Only super_admin can call this function (used for View as User feature).';