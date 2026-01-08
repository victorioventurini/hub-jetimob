
-- =====================================================
-- IDENTITY PREVENTION SYSTEM - RLS AUDIT VIEW + GUARD
-- =====================================================

-- 1. Create VIEW to detect RLS violations (policies comparing auth.uid() with domain columns)
CREATE OR REPLACE VIEW public.identity_rls_violations AS
WITH domain_columns AS (
  -- Known columns that store profiles.id
  SELECT 'owner_user_id' as col UNION
  SELECT 'leader_user_id' UNION
  SELECT 'created_by_user_id' UNION
  SELECT 'current_user_id' UNION
  SELECT 'assigned_user_id' UNION
  SELECT 'cancelled_by' UNION
  SELECT 'from_user_id' UNION
  SELECT 'to_user_id' UNION
  SELECT 'performed_by_user_id' UNION
  SELECT 'authorized_by_user_id' UNION
  SELECT 'mentioned_user_id' UNION
  SELECT 'author_user_id'
),
policies AS (
  SELECT 
    schemaname,
    tablename,
    policyname,
    qual::text as policy_expr
  FROM pg_policies
  WHERE schemaname = 'public'
)
SELECT 
  p.schemaname,
  p.tablename,
  p.policyname,
  dc.col as problematic_column,
  'Uses auth.uid() directly with domain column' as violation_type,
  'Replace with my_profile_id() or use conversion function' as recommendation
FROM policies p
CROSS JOIN domain_columns dc
WHERE 
  p.policy_expr ~ ('= auth\.uid\(\)') 
  AND p.policy_expr LIKE '%' || dc.col || '%'
  AND p.policy_expr !~ 'my_profile_id\(\)'
  AND p.policy_expr !~ 'is_team_leader\('
  AND p.policy_expr !~ 'user_can_manage_team\('
  AND p.policy_expr !~ 'is_bu_admin\('
  AND p.policy_expr !~ 'is_platform_admin\('
  AND p.policy_expr !~ 'is_super_admin\('
  AND p.policy_expr !~ 'user_has_bu_access\(';

COMMENT ON VIEW public.identity_rls_violations IS 
  'Audit view: detects RLS policies incorrectly comparing auth.uid() with domain columns (profiles.id).
   Expected result: 0 rows. Any row indicates a security issue.
   See docs/IDENTITY_CONVENTION.md for correction guidelines.';

-- 2. Create runtime guard function for sensitive operations
CREATE OR REPLACE FUNCTION public.assert_profile_identity(p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_my_profile_id uuid;
  v_exists boolean;
BEGIN
  -- Get current user's profile_id
  v_my_profile_id := my_profile_id();
  
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_profile_id) INTO v_exists;
  
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Profile ID % does not exist', p_profile_id;
  END IF;
  
  -- Optional: Check if it belongs to current user (when needed for ownership validation)
  -- This is a soft check - caller decides whether to enforce
  RETURN v_my_profile_id = p_profile_id;
END;
$$;

COMMENT ON FUNCTION public.assert_profile_identity(uuid) IS 
  'Runtime guard: validates that a profile_id exists.
   Returns TRUE if the profile_id belongs to current authenticated user.
   Use in sensitive operations to prevent identity confusion.
   Raises exception if profile does not exist.';

-- 3. Create enhanced version of my_profile_id that can raise exception
CREATE OR REPLACE FUNCTION public.my_profile_id_strict()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for authenticated user %', auth.uid()
      USING HINT = 'User must complete onboarding to have a profile';
  END IF;
  
  RETURN v_profile_id;
END;
$$;

COMMENT ON FUNCTION public.my_profile_id_strict() IS 
  'Strict version of my_profile_id() that raises exception if no profile exists.
   Use for write operations where profile MUST exist.
   See docs/IDENTITY_CONVENTION.md';
