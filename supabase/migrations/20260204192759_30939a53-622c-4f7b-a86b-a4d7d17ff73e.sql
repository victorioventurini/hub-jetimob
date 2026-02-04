-- Fix kpi_metrics UPDATE policy to properly check ownership
-- The current policy only checks has_permission('kpis.metric.update:self_or_owner')
-- but doesn't validate the actual ownership context

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS kpi_metrics_update_v2 ON public.kpi_metrics;

-- Create a new UPDATE policy that properly checks:
-- 1. Admin with kpis.settings.manage:bu can update any KPI
-- 2. User is the owner (owner_user_id)
-- 3. User is a contributor (kpi_data_contributors)
CREATE POLICY kpi_metrics_update_v3 ON public.kpi_metrics
  FOR UPDATE
  USING (
    -- Admin can update any KPI
    has_permission(my_profile_id(), bu_id, 'kpis.settings.manage:bu')
    OR
    -- User is the owner
    owner_user_id = my_profile_id()
    OR
    -- User is a contributor
    EXISTS (
      SELECT 1 FROM public.kpi_data_contributors kdc
      WHERE kdc.kpi_id = kpi_metrics.id
        AND kdc.contributor_user_id = my_profile_id()
        AND kdc.deleted_at IS NULL
    )
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    has_permission(my_profile_id(), bu_id, 'kpis.settings.manage:bu')
    OR
    owner_user_id = my_profile_id()
    OR
    EXISTS (
      SELECT 1 FROM public.kpi_data_contributors kdc
      WHERE kdc.kpi_id = kpi_metrics.id
        AND kdc.contributor_user_id = my_profile_id()
        AND kdc.deleted_at IS NULL
    )
  );