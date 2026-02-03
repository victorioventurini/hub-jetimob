-- ============================================================
-- MIGRATION: KPI Governance v2.2 - Scope + Area + Validation
-- ============================================================

-- 1. Criar enum kpi_scope (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_scope') THEN
    CREATE TYPE kpi_scope AS ENUM ('team', 'area', 'org');
  END IF;
END$$;

-- 2. Adicionar colunas (idempotente)
ALTER TABLE public.kpi_metrics 
ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.areas(id);

ALTER TABLE public.kpi_metrics 
ADD COLUMN IF NOT EXISTS scope kpi_scope NOT NULL DEFAULT 'team';

-- 3. Índices de performance
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_area 
ON public.kpi_metrics (area_id, lifecycle_status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_scope 
ON public.kpi_metrics (bu_id, scope, lifecycle_status) 
WHERE deleted_at IS NULL;

-- 4. Backfill: preencher area_id via team.area_id (se possível)
UPDATE public.kpi_metrics km SET
  area_id = t.area_id
FROM public.teams t
WHERE km.team_id = t.id 
  AND km.area_id IS NULL 
  AND t.area_id IS NOT NULL;

-- 5. Trigger de governança
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kpi_metrics_governance ON public.kpi_metrics;
CREATE TRIGGER trg_kpi_metrics_governance
BEFORE INSERT OR UPDATE ON public.kpi_metrics
FOR EACH ROW EXECUTE FUNCTION kpi_metrics_governance_validate();

-- 6. Comentários
COMMENT ON COLUMN public.kpi_metrics.area_id IS 'Área dona/responsável pelo KPI';
COMMENT ON COLUMN public.kpi_metrics.scope IS 'Escopo: team (time específico), area (toda área), org (toda organização)';