
-- ============================================
-- Migration: Update KPIs RLS to V2 Permission System
-- ============================================

-- ============================================
-- 1. KPI_METRICS - KPI definitions
-- ============================================

DROP POLICY IF EXISTS kpi_metrics_admin ON public.kpi_metrics;
DROP POLICY IF EXISTS kpi_metrics_select ON public.kpi_metrics;

-- SELECT: Anyone with kpis view permission
CREATE POLICY "kpi_metrics_select_v2" ON public.kpi_metrics
FOR SELECT TO authenticated
USING (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND (
    has_permission(my_profile_id(), bu_id, 'kpis.metric.read:bu')
    OR has_permission(my_profile_id(), bu_id, 'kpis.metric.view:bu')
    OR has_permission(my_profile_id(), bu_id, 'kpis.view:bu')
  )
);

-- INSERT: Users with kpis.metric.create:bu
CREATE POLICY "kpi_metrics_insert_v2" ON public.kpi_metrics
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'kpis.metric.create:bu')
);

-- UPDATE: Users with kpis.metric.update:self_or_owner
CREATE POLICY "kpi_metrics_update_v2" ON public.kpi_metrics
FOR UPDATE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'kpis.metric.update:self_or_owner')
)
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'kpis.metric.update:self_or_owner')
);

-- DELETE: Users with kpis.metric.delete:bu
CREATE POLICY "kpi_metrics_delete_v2" ON public.kpi_metrics
FOR DELETE TO authenticated
USING (
  has_permission(my_profile_id(), bu_id, 'kpis.metric.delete:bu')
);

-- ============================================
-- 2. KPI_VALUES - KPI data points (uses kpi_id, not metric_id)
-- ============================================

DROP POLICY IF EXISTS kpi_values_insert ON public.kpi_values;
DROP POLICY IF EXISTS kpi_values_select ON public.kpi_values;

-- SELECT: Anyone who can view KPIs
CREATE POLICY "kpi_values_select_v2" ON public.kpi_values
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM kpi_metrics m
    WHERE m.id = kpi_values.kpi_id
    AND is_profile_bu_member(my_profile_id(), m.bu_id)
    AND (
      has_permission(my_profile_id(), m.bu_id, 'kpis.value.read:bu')
      OR has_permission(my_profile_id(), m.bu_id, 'kpis.view:bu')
    )
  )
);

-- INSERT: Users with kpis.value.create:bu or kpis.value.add:bu
CREATE POLICY "kpi_values_insert_v2" ON public.kpi_values
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM kpi_metrics m
    WHERE m.id = kpi_values.kpi_id
    AND (
      has_permission(my_profile_id(), m.bu_id, 'kpis.value.create:bu')
      OR has_permission(my_profile_id(), m.bu_id, 'kpis.value.add:bu')
    )
  )
);

-- UPDATE: Only own values
CREATE POLICY "kpi_values_update_v2" ON public.kpi_values
FOR UPDATE TO authenticated
USING (
  created_by = my_profile_id()
  AND EXISTS (
    SELECT 1 FROM kpi_metrics m
    WHERE m.id = kpi_values.kpi_id
    AND has_permission(my_profile_id(), m.bu_id, 'kpis.value.update_own:bu')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM kpi_metrics m
    WHERE m.id = kpi_values.kpi_id
    AND has_permission(my_profile_id(), m.bu_id, 'kpis.value.update_own:bu')
  )
);
