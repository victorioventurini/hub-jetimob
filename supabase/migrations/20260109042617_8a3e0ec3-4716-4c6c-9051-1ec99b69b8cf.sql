-- ============================================
-- Update Email Resolver to handle legacy records
-- ============================================
-- Some old outbox records have profiles.id in user_id field
-- instead of auth.users.id. This update handles both cases.

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
  -- First try: assume p_auth_user_id is auth.users.id (correct usage)
  SELECT 
    p.id,
    p.display_name,
    p.work_email
  INTO v_profile_id, v_display_name, v_work_email
  FROM profiles p
  WHERE p.user_id = p_auth_user_id
    AND p.deleted_at IS NULL
  LIMIT 1;
  
  -- If not found, try: maybe p_auth_user_id is actually profiles.id (legacy records)
  IF v_profile_id IS NULL THEN
    SELECT 
      p.id,
      p.display_name,
      p.work_email
    INTO v_profile_id, v_display_name, v_work_email
    FROM profiles p
    WHERE p.id = p_auth_user_id
      AND p.deleted_at IS NULL
    LIMIT 1;
  END IF;
  
  -- If still no work_email, fallback to auth.users.email
  IF v_work_email IS NULL THEN
    -- Try auth.users.email for the provided ID
    SELECT au.email INTO v_auth_email
    FROM auth.users au
    WHERE au.id = p_auth_user_id;
    
    -- If that didn't work and we found a profile, get auth email via profile.user_id
    IF v_auth_email IS NULL AND v_profile_id IS NOT NULL THEN
      SELECT au.email INTO v_auth_email
      FROM auth.users au
      JOIN profiles p ON p.user_id = au.id
      WHERE p.id = v_profile_id;
    END IF;
    
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

-- Also update resolve_work_email for consistency
CREATE OR REPLACE FUNCTION public.resolve_work_email(p_auth_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_work_email text;
  v_auth_email text;
  v_profile_user_id uuid;
BEGIN
  -- First try: assume p_auth_user_id is auth.users.id
  SELECT p.work_email INTO v_work_email
  FROM profiles p
  WHERE p.user_id = p_auth_user_id
    AND p.deleted_at IS NULL
  LIMIT 1;
  
  -- If not found, try: maybe it's profiles.id (legacy)
  IF v_work_email IS NULL THEN
    SELECT p.work_email, p.user_id INTO v_work_email, v_profile_user_id
    FROM profiles p
    WHERE p.id = p_auth_user_id
      AND p.deleted_at IS NULL
    LIMIT 1;
  END IF;
  
  -- If work_email exists, return it
  IF v_work_email IS NOT NULL THEN
    RETURN v_work_email;
  END IF;
  
  -- Fallback: get email from auth.users
  SELECT au.email INTO v_auth_email
  FROM auth.users au
  WHERE au.id = COALESCE(v_profile_user_id, p_auth_user_id);
  
  RETURN v_auth_email;
END;
$$;

COMMENT ON FUNCTION public.resolve_notification_recipient(uuid) IS 
'Full recipient resolver for notifications. Handles both auth.users.id (correct) and profiles.id (legacy) as input.
Returns {profile_id, display_name, work_email, has_profile}.';