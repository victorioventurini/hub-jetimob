-- ============================================================
-- FIX: Set search_path on kpi_metrics_governance_validate
-- ============================================================
CREATE OR REPLACE FUNCTION kpi_metrics_governance_validate()
RETURNS trigger AS $$
BEGIN
  -- Regra 1: Consistência scope ↔ team_id
  IF NEW.scope = 'team' AND NEW.team_id IS NULL THEN
    RAISE EXCEPTION 'KPI com escopo "time" requer team_id definido';
  END IF;
  
  IF NEW.scope IN ('area', 'org') AND NEW.team_id IS NOT NULL THEN
    RAISE EXCEPTION 'KPI com escopo "área" ou "org" não pode ter team_id';
  END IF;
  
  -- Regra 2: KPI ativo requer owner
  IF NEW.lifecycle_status = 'active' AND NEW.owner_user_id IS NULL THEN
    RAISE EXCEPTION 'KPI ativo requer um responsável (owner_user_id)';
  END IF;
  
  -- Regra 3: KPI ativo requer área definida (soft enforcement)
  IF NEW.lifecycle_status = 'active' AND NEW.area_id IS NULL THEN
    RAISE EXCEPTION 'KPI ativo requer uma área responsável (area_id)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- MIGRATION 2: KR-KPI Unique Primary Constraint
-- ============================================================

-- Garantir no máximo 1 KPI primary por KR (kr_id + kr_type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_okr_kr_metrics_unique_primary 
ON public.okr_kr_metrics (kr_id, kr_type) 
WHERE role = 'primary' AND deleted_at IS NULL;

-- Comentário
COMMENT ON INDEX idx_okr_kr_metrics_unique_primary IS 
'Garante que cada KR tenha no máximo 1 KPI primário ativo';