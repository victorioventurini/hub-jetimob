ALTER TABLE public.kpi_metrics DISABLE TRIGGER trg_enforce_bu_scope_kpi_metrics;
UPDATE public.kpi_metrics
SET lifecycle_status = 'active'
WHERE lifecycle_status <> 'active'
  AND deleted_at IS NULL;
ALTER TABLE public.kpi_metrics ENABLE TRIGGER trg_enforce_bu_scope_kpi_metrics;