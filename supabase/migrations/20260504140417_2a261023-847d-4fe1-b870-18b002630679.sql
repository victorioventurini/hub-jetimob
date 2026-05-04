-- Amplia política de UPDATE/DELETE em kpi_values:
-- Permite (1) autor do registro, (2) owner do KPI (owner_user_id),
-- (3) admins da BU com kpis.settings.manage:bu.

DROP POLICY IF EXISTS kpi_values_update_v2 ON public.kpi_values;
DROP POLICY IF EXISTS kpi_values_update_v3 ON public.kpi_values;

CREATE POLICY kpi_values_update_v3
ON public.kpi_values
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.kpi_metrics m
    WHERE m.id = kpi_values.kpi_id
      AND (
        kpi_values.created_by = my_profile_id()
        OR m.owner_user_id = my_profile_id()
        OR has_permission(my_profile_id(), m.bu_id, 'kpis.settings.manage:bu')
      )
      AND (
        has_permission(my_profile_id(), m.bu_id, 'kpis.value.update_own:bu')
        OR has_permission(my_profile_id(), m.bu_id, 'kpis.settings.manage:bu')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.kpi_metrics m
    WHERE m.id = kpi_values.kpi_id
      AND (
        has_permission(my_profile_id(), m.bu_id, 'kpis.value.update_own:bu')
        OR has_permission(my_profile_id(), m.bu_id, 'kpis.settings.manage:bu')
      )
  )
);

-- DELETE com mesma lógica (antes não havia política explícita; criar/atualizar)
DROP POLICY IF EXISTS kpi_values_delete_v1 ON public.kpi_values;
DROP POLICY IF EXISTS kpi_values_delete_v2 ON public.kpi_values;

CREATE POLICY kpi_values_delete_v2
ON public.kpi_values
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.kpi_metrics m
    WHERE m.id = kpi_values.kpi_id
      AND (
        kpi_values.created_by = my_profile_id()
        OR m.owner_user_id = my_profile_id()
        OR has_permission(my_profile_id(), m.bu_id, 'kpis.settings.manage:bu')
      )
      AND (
        has_permission(my_profile_id(), m.bu_id, 'kpis.value.update_own:bu')
        OR has_permission(my_profile_id(), m.bu_id, 'kpis.settings.manage:bu')
      )
  )
);