CREATE OR REPLACE FUNCTION public.can_write_kpi_value(_profile_id uuid, _kpi_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.kpi_metrics m
    WHERE m.id = _kpi_id
      AND public.is_current_bu(m.bu_id)
      AND (
        public.has_permission(_profile_id, m.bu_id, 'kpis.value.create:bu')
        OR public.has_permission(_profile_id, m.bu_id, 'kpis.value.add:bu')
        OR public.has_permission(_profile_id, m.bu_id, 'kpis.value.update_own:bu')
        OR public.has_permission(_profile_id, m.bu_id, 'kpis.settings.manage:bu')
        OR m.owner_user_id = _profile_id
        OR EXISTS (
          SELECT 1
          FROM public.kpi_data_contributors c
          WHERE c.kpi_id = m.id
            AND c.contributor_user_id = _profile_id
            AND c.deleted_at IS NULL
        )
      )
  )
$$;

DROP POLICY IF EXISTS kpi_values_insert_v2 ON public.kpi_values;
CREATE POLICY kpi_values_insert_v2
ON public.kpi_values
FOR INSERT
TO authenticated
WITH CHECK (public.can_write_kpi_value(public.my_profile_id(), kpi_id));

DROP POLICY IF EXISTS kpi_values_update_v3 ON public.kpi_values;
CREATE POLICY kpi_values_update_v3
ON public.kpi_values
FOR UPDATE
TO authenticated
USING (
  public.can_write_kpi_value(public.my_profile_id(), kpi_id)
  AND EXISTS (
    SELECT 1
    FROM public.kpi_metrics m
    WHERE m.id = kpi_values.kpi_id
      AND (
        kpi_values.created_by = public.my_profile_id()
        OR m.owner_user_id = public.my_profile_id()
        OR public.has_permission(public.my_profile_id(), m.bu_id, 'kpis.settings.manage:bu')
      )
  )
)
WITH CHECK (public.can_write_kpi_value(public.my_profile_id(), kpi_id));

DROP POLICY IF EXISTS kpi_values_delete_v2 ON public.kpi_values;
CREATE POLICY kpi_values_delete_v2
ON public.kpi_values
FOR DELETE
TO authenticated
USING (
  public.can_write_kpi_value(public.my_profile_id(), kpi_id)
  AND EXISTS (
    SELECT 1
    FROM public.kpi_metrics m
    WHERE m.id = kpi_values.kpi_id
      AND (
        kpi_values.created_by = public.my_profile_id()
        OR m.owner_user_id = public.my_profile_id()
        OR public.has_permission(public.my_profile_id(), m.bu_id, 'kpis.settings.manage:bu')
      )
  )
);