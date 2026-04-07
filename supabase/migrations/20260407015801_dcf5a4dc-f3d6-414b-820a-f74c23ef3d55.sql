
-- Função que sincroniza current_value da KR quando KPI primário recebe novo valor
CREATE OR REPLACE FUNCTION public.sync_org_kr_from_primary_kpi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE okr_org_key_results
  SET current_value = NEW.value,
      updated_at = now()
  WHERE id IN (
    SELECT kr_id FROM okr_kr_metrics
    WHERE kpi_id = NEW.kpi_id
      AND kr_type = 'org'
      AND role = 'primary'
      AND deleted_at IS NULL
  );

  UPDATE okr_team_key_results
  SET current_value = NEW.value,
      updated_at = now()
  WHERE id IN (
    SELECT kr_id FROM okr_kr_metrics
    WHERE kpi_id = NEW.kpi_id
      AND kr_type = 'team'
      AND role = 'primary'
      AND deleted_at IS NULL
  );

  RETURN NEW;
END;
$$;

-- Trigger (drop if exists from previous failed attempt)
DROP TRIGGER IF EXISTS trg_sync_kr_from_primary_kpi ON public.kpi_values;
CREATE TRIGGER trg_sync_kr_from_primary_kpi
  AFTER INSERT ON public.kpi_values
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_org_kr_from_primary_kpi();

-- Backfill: desabilitar triggers de escopo temporariamente
ALTER TABLE okr_org_key_results DISABLE TRIGGER trg_enforce_bu_scope_okr_org_key_results;
ALTER TABLE okr_org_key_results DISABLE TRIGGER audit_okr_org_key_results;
ALTER TABLE okr_team_key_results DISABLE TRIGGER trg_enforce_bu_scope_okr_team_key_results;
ALTER TABLE okr_team_key_results DISABLE TRIGGER audit_okr_team_key_results;

-- Backfill org KRs
WITH latest_kpi AS (
  SELECT DISTINCT ON (km.kr_id)
    km.kr_id,
    km.kr_type,
    kv.value
  FROM okr_kr_metrics km
  JOIN kpi_values kv ON kv.kpi_id = km.kpi_id
  WHERE km.role = 'primary'
    AND km.deleted_at IS NULL
  ORDER BY km.kr_id, kv.reference_date DESC
)
UPDATE okr_org_key_results org
SET current_value = lk.value, updated_at = now()
FROM latest_kpi lk
WHERE lk.kr_id = org.id AND lk.kr_type = 'org';

-- Backfill team KRs
WITH latest_kpi AS (
  SELECT DISTINCT ON (km.kr_id)
    km.kr_id,
    km.kr_type,
    kv.value
  FROM okr_kr_metrics km
  JOIN kpi_values kv ON kv.kpi_id = km.kpi_id
  WHERE km.role = 'primary'
    AND km.deleted_at IS NULL
  ORDER BY km.kr_id, kv.reference_date DESC
)
UPDATE okr_team_key_results tkr
SET current_value = lk.value, updated_at = now()
FROM latest_kpi lk
WHERE lk.kr_id = tkr.id AND lk.kr_type = 'team';

-- Reabilitar triggers
ALTER TABLE okr_org_key_results ENABLE TRIGGER trg_enforce_bu_scope_okr_org_key_results;
ALTER TABLE okr_org_key_results ENABLE TRIGGER audit_okr_org_key_results;
ALTER TABLE okr_team_key_results ENABLE TRIGGER trg_enforce_bu_scope_okr_team_key_results;
ALTER TABLE okr_team_key_results ENABLE TRIGGER audit_okr_team_key_results;
