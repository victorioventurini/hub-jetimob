
-- ============================================
-- FIX: Add security_invoker=true to admin diagnostic views
-- 
-- These views were missing the security_invoker option, causing
-- them to be flagged as SECURITY DEFINER views by the linter.
-- ============================================

-- Fix identity_rls_violations view
DROP VIEW IF EXISTS public.identity_rls_violations;

CREATE VIEW public.identity_rls_violations
WITH (security_invoker = true)
AS
WITH domain_columns AS (
  SELECT 'owner_user_id'::text AS col
  UNION SELECT 'leader_user_id'::text
  UNION SELECT 'created_by_user_id'::text
  UNION SELECT 'current_user_id'::text
  UNION SELECT 'assigned_user_id'::text
  UNION SELECT 'cancelled_by'::text
  UNION SELECT 'from_user_id'::text
  UNION SELECT 'to_user_id'::text
  UNION SELECT 'performed_by_user_id'::text
  UNION SELECT 'authorized_by_user_id'::text
  UNION SELECT 'mentioned_user_id'::text
  UNION SELECT 'author_user_id'::text
), policies AS (
  SELECT 
    pg_policies.schemaname,
    pg_policies.tablename,
    pg_policies.policyname,
    pg_policies.qual AS policy_expr
  FROM pg_policies
  WHERE pg_policies.schemaname = 'public'::name
)
SELECT 
  p.schemaname,
  p.tablename,
  p.policyname,
  dc.col AS problematic_column,
  'Uses auth.uid() directly with domain column'::text AS violation_type,
  'Replace with my_profile_id() or use conversion function'::text AS recommendation
FROM policies p
CROSS JOIN domain_columns dc
WHERE p.policy_expr ~ '= auth\.uid\(\)'::text 
  AND p.policy_expr ~~ (('%'::text || dc.col) || '%'::text) 
  AND p.policy_expr !~ 'my_profile_id\(\)'::text 
  AND p.policy_expr !~ 'is_team_leader\('::text 
  AND p.policy_expr !~ 'user_can_manage_team\('::text 
  AND p.policy_expr !~ 'is_bu_admin\('::text 
  AND p.policy_expr !~ 'is_platform_admin\('::text 
  AND p.policy_expr !~ 'is_super_admin\('::text 
  AND p.policy_expr !~ 'user_has_bu_access\('::text;

-- Fix users_without_v2_permissions view  
DROP VIEW IF EXISTS public.users_without_v2_permissions;

CREATE VIEW public.users_without_v2_permissions
WITH (security_invoker = true)
AS
SELECT 
  m.id AS membership_id,
  m.bu_id,
  m.profile_id,
  p.display_name,
  p.work_email,
  b.name AS bu_name
FROM bu_user_memberships m
JOIN profiles p ON p.id = m.profile_id
JOIN bu_units b ON b.id = m.bu_id
WHERE m.deleted_at IS NULL 
  AND NOT EXISTS (
    SELECT 1
    FROM bu_user_permission_templates_v2 t2
    WHERE t2.user_id = m.profile_id 
      AND t2.bu_id = m.bu_id
  );

-- Add comments
COMMENT ON VIEW public.identity_rls_violations IS 'Diagnostic view to detect RLS policies that incorrectly use auth.uid() with domain columns (should use my_profile_id())';
COMMENT ON VIEW public.users_without_v2_permissions IS 'Diagnostic view to find BU members who do not have V2 permission templates assigned';
