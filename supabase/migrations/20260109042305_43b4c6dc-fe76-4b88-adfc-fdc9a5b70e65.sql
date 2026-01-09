-- ============================================
-- Canonical Email Resolver Functions
-- ============================================
-- These functions provide a single source of truth for resolving
-- notification recipient information from auth.users.id

-- 1) resolve_work_email: Get work email for a given auth user ID
-- Falls back to auth.users.email if work_email is null
CREATE OR REPLACE FUNCTION public.resolve_work_email(p_auth_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_work_email text;
  v_auth_email text;
BEGIN
  -- First try to get work_email from profiles
  SELECT p.work_email INTO v_work_email
  FROM profiles p
  WHERE p.user_id = p_auth_user_id
    AND p.deleted_at IS NULL
  LIMIT 1;
  
  -- If work_email exists, return it
  IF v_work_email IS NOT NULL THEN
    RETURN v_work_email;
  END IF;
  
  -- Fallback: get email from auth.users
  SELECT au.email INTO v_auth_email
  FROM auth.users au
  WHERE au.id = p_auth_user_id;
  
  RETURN v_auth_email;
END;
$$;

-- 2) resolve_notification_recipient: Get full recipient info
-- Returns jsonb with work_email, display_name, profile_id
CREATE OR REPLACE FUNCTION public.resolve_notification_recipient(p_auth_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_profile_id uuid;
  v_display_name text;
  v_work_email text;
  v_auth_email text;
BEGIN
  -- Get profile data
  SELECT 
    p.id,
    p.display_name,
    p.work_email
  INTO v_profile_id, v_display_name, v_work_email
  FROM profiles p
  WHERE p.user_id = p_auth_user_id
    AND p.deleted_at IS NULL
  LIMIT 1;
  
  -- If no work_email, fallback to auth.users.email
  IF v_work_email IS NULL THEN
    SELECT au.email INTO v_auth_email
    FROM auth.users au
    WHERE au.id = p_auth_user_id;
    
    v_work_email := v_auth_email;
  END IF;
  
  -- Build result
  v_result := jsonb_build_object(
    'profile_id', v_profile_id,
    'display_name', COALESCE(v_display_name, 'Usuário'),
    'work_email', v_work_email,
    'has_profile', v_profile_id IS NOT NULL
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.resolve_work_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_work_email(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_notification_recipient(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_notification_recipient(uuid) TO service_role;

-- Add comments
COMMENT ON FUNCTION public.resolve_work_email(uuid) IS 
'Canonical resolver for notification email. Returns profiles.work_email with fallback to auth.users.email. 
NEVER use profiles.email directly - that field does not exist.';

COMMENT ON FUNCTION public.resolve_notification_recipient(uuid) IS 
'Full recipient resolver for notifications. Returns {profile_id, display_name, work_email, has_profile}.
Use this for any notification that needs recipient info.';