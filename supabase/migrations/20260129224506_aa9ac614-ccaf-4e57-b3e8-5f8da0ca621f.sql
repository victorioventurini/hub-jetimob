-- =============================================================================
-- IDENTITY HEALTH: Backfill missing user_id in bu_user_memberships
-- =============================================================================
-- 
-- Problem: Some memberships have profile_id but no user_id, causing:
-- 1. useUserBus() to miss those memberships (queries by user_id)
-- 2. RLS failures when user_has_bu_access() can't find the membership
--
-- Solution: Backfill user_id from profiles table
-- =============================================================================

-- Step 1: Backfill user_id where profile_id exists but user_id is NULL
UPDATE public.bu_user_memberships m
SET 
  user_id = p.user_id,
  updated_at = now()
FROM public.profiles p
WHERE m.profile_id = p.id
  AND m.user_id IS NULL
  AND p.user_id IS NOT NULL
  AND m.deleted_at IS NULL
  AND p.deleted_at IS NULL;

-- Step 2: Create view for ongoing identity health monitoring
CREATE OR REPLACE VIEW public.v_identity_health_check AS
SELECT 
  'membership_missing_user_id' as issue_type,
  m.id as record_id,
  m.profile_id,
  m.bu_id,
  p.email,
  'Membership has profile_id but no user_id' as description
FROM public.bu_user_memberships m
JOIN public.profiles p ON p.id = m.profile_id
WHERE m.user_id IS NULL
  AND m.deleted_at IS NULL
  AND p.user_id IS NOT NULL

UNION ALL

SELECT 
  'membership_missing_profile_id' as issue_type,
  m.id as record_id,
  m.profile_id,
  m.bu_id,
  NULL as email,
  'Membership has user_id but no profile_id' as description
FROM public.bu_user_memberships m
WHERE m.profile_id IS NULL
  AND m.deleted_at IS NULL
  AND m.user_id IS NOT NULL

UNION ALL

SELECT 
  'profile_missing_user_id' as issue_type,
  p.id as record_id,
  p.id as profile_id,
  NULL::uuid as bu_id,
  p.email,
  'Profile has no auth.uid() linked' as description
FROM public.profiles p
WHERE p.user_id IS NULL
  AND p.deleted_at IS NULL;

-- Step 3: Create maintenance function for cron-dispatcher integration
CREATE OR REPLACE FUNCTION public.cleanup_orphan_memberships()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fixed_count integer := 0;
  v_result jsonb;
BEGIN
  -- Backfill user_id where possible
  WITH updated AS (
    UPDATE bu_user_memberships m
    SET 
      user_id = p.user_id,
      updated_at = now()
    FROM profiles p
    WHERE m.profile_id = p.id
      AND m.user_id IS NULL
      AND p.user_id IS NOT NULL
      AND m.deleted_at IS NULL
      AND p.deleted_at IS NULL
    RETURNING m.id
  )
  SELECT COUNT(*) INTO v_fixed_count FROM updated;
  
  -- Build result
  v_result := jsonb_build_object(
    'fixed_memberships', v_fixed_count,
    'executed_at', now()
  );
  
  -- Log execution
  INSERT INTO public.cron_execution_logs (
    job_name,
    status,
    message,
    started_at,
    finished_at,
    records_processed
  ) VALUES (
    'cleanup_orphan_memberships',
    'success',
    format('Fixed %s memberships with missing user_id', v_fixed_count),
    now(),
    now(),
    v_fixed_count
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users (for admin debugging)
GRANT EXECUTE ON FUNCTION public.cleanup_orphan_memberships() TO authenticated;