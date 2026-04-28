INSERT INTO public.kpi_data_contributors (kpi_id, contributor_user_id, role, bu_id, created_by, notes)
SELECT km.id, km.owner_user_id, 'data_entry'::kpi_contributor_role, km.bu_id, km.owner_user_id,
       'Backfill — copiado do responsável'
FROM public.kpi_metrics km
WHERE km.deleted_at IS NULL
  AND km.owner_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.kpi_data_contributors c
    WHERE c.kpi_id = km.id
      AND c.role = 'data_entry'
      AND c.deleted_at IS NULL
  )
ON CONFLICT ON CONSTRAINT uq_kpi_contributor DO NOTHING;