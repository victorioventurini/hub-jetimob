
-- Create a debug function to log RLS context
-- This will help us understand what auth.uid() and my_profile_id() return during RLS evaluation

CREATE OR REPLACE FUNCTION public.debug_rls_ticket_insert(
  p_created_by_user_id uuid,
  p_bu_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_auth_uid uuid;
  v_my_profile_id uuid;
  v_has_bu_access boolean;
  v_profile_match boolean;
BEGIN
  -- Get current auth context
  v_auth_uid := auth.uid();
  
  -- Get my_profile_id result
  BEGIN
    SELECT id INTO v_my_profile_id
    FROM profiles
    WHERE user_id = v_auth_uid
      AND deleted_at IS NULL
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_my_profile_id := NULL;
  END;
  
  -- Check BU access
  v_has_bu_access := user_has_bu_access(v_auth_uid, p_bu_id);
  
  -- Check profile match
  v_profile_match := (p_created_by_user_id = v_my_profile_id);
  
  -- Log to app_error_logs for debugging
  INSERT INTO app_error_logs (
    module,
    action,
    error_code,
    message,
    metadata,
    user_id,
    bu_id
  ) VALUES (
    'rls_debug',
    'ticket_insert',
    CASE WHEN v_has_bu_access AND v_profile_match THEN 'WOULD_PASS' ELSE 'WOULD_FAIL' END,
    'RLS Debug: ticket insert evaluation',
    jsonb_build_object(
      'auth_uid', v_auth_uid,
      'my_profile_id', v_my_profile_id,
      'input_created_by_user_id', p_created_by_user_id,
      'input_bu_id', p_bu_id,
      'has_bu_access', v_has_bu_access,
      'profile_match', v_profile_match,
      'policy_would_pass', v_has_bu_access AND v_profile_match
    ),
    v_auth_uid,
    p_bu_id
  );
  
  RETURN jsonb_build_object(
    'auth_uid', v_auth_uid,
    'my_profile_id', v_my_profile_id,
    'input_created_by_user_id', p_created_by_user_id,
    'input_bu_id', p_bu_id,
    'has_bu_access', v_has_bu_access,
    'profile_match', v_profile_match,
    'policy_would_pass', v_has_bu_access AND v_profile_match
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.debug_rls_ticket_insert(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.debug_rls_ticket_insert IS 'Debug function to understand RLS context during ticket insert. Logs to app_error_logs and returns current auth context.';
