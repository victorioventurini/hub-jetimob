-- =====================================================
-- FIX SECURITY ISSUES: SECURITY DEFINER views + automation_logs RLS
-- =====================================================

-- =====================================================
-- 1. Fix SECURITY DEFINER views (add security_invoker = true)
-- =====================================================

-- Fix v_objective_health
DROP VIEW IF EXISTS public.v_objective_health;

CREATE VIEW public.v_objective_health 
WITH (security_invoker = true) AS
SELECT 
  'org' AS objective_type,
  id AS objective_id,
  bu_id,
  health_score,
  health_status,
  last_health_calculated_at
FROM public.okr_org_objectives
WHERE deleted_at IS NULL AND status != 'cancelled'
UNION ALL
SELECT 
  'team' AS objective_type,
  id AS objective_id,
  bu_id,
  health_score,
  health_status,
  last_health_calculated_at
FROM public.okr_team_objectives
WHERE deleted_at IS NULL AND status != 'cancelled';

-- Fix v_okr_insights_active
DROP VIEW IF EXISTS public.v_okr_insights_active;

CREATE VIEW public.v_okr_insights_active 
WITH (security_invoker = true) AS
SELECT *
FROM public.okr_insights
WHERE deleted_at IS NULL
ORDER BY 
  CASE severity 
    WHEN 'critical' THEN 1 
    WHEN 'warning' THEN 2 
    WHEN 'info' THEN 3 
  END,
  created_at DESC;

-- =====================================================
-- 2. Fix automation_logs RLS - prevent NULL bu_id exposure
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view logs for their BU" ON public.automation_logs;

-- Create stricter policy: require bu_id to be NOT NULL for regular users
CREATE POLICY "Users can view logs for their BU only"
  ON public.automation_logs FOR SELECT
  TO authenticated 
  USING (
    -- Regular users: only their BU's logs (bu_id must NOT be NULL)
    (bu_id IS NOT NULL AND bu_id IN (
      SELECT bum.bu_id FROM public.bu_user_memberships bum WHERE bum.user_id = auth.uid()
    ))
    OR
    -- Platform admins can see all logs including NULL bu_id
    public.is_platform_admin(auth.uid())
  );