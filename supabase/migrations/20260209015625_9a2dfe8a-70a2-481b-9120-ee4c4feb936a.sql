-- ============================================================
-- v2.90.0: KPI Governance - Responsible Area/Team
-- Separates SCOPE (impact) from OPERATIONAL RESPONSIBILITY (ownership)
-- ============================================================

-- 1. Add new columns for operational responsibility
ALTER TABLE public.kpi_metrics 
ADD COLUMN IF NOT EXISTS responsible_area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS responsible_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_responsible_area 
ON public.kpi_metrics(responsible_area_id) 
WHERE responsible_area_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_responsible_team 
ON public.kpi_metrics(responsible_team_id) 
WHERE responsible_team_id IS NOT NULL;

-- 3. Add comments for documentation
COMMENT ON COLUMN public.kpi_metrics.responsible_area_id IS 
'v2.90.0: Área operacionalmente responsável por acompanhar e agir em desvios. Obrigatório para scope=org ativos. Separado de area_id (ownership hierárquico).';

COMMENT ON COLUMN public.kpi_metrics.responsible_team_id IS 
'v2.90.0: Time operacionalmente responsável (opcional). Permite delegação de acompanhamento para um time específico.';

-- 4. Update governance validation trigger
CREATE OR REPLACE FUNCTION public.kpi_metrics_governance_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Regra 1: scope=team → team_id obrigatório (ownership do time)
  IF NEW.scope = 'team' AND NEW.team_id IS NULL THEN
    RAISE EXCEPTION 'KPI com escopo "time" requer team_id definido';
  END IF;
  
  -- Regra 2: scope=org/area → team_id de ownership PROIBIDO
  -- (mas responsible_team_id é PERMITIDO para delegação operacional)
  IF NEW.scope IN ('area', 'org') AND NEW.team_id IS NOT NULL THEN
    RAISE EXCEPTION 'KPI com escopo "área" ou "org" não pode ter team_id de ownership (use responsible_team_id para delegação operacional)';
  END IF;
  
  -- Regra 3: KPI ativo → owner_user_id obrigatório
  IF NEW.lifecycle_status = 'active' AND NEW.owner_user_id IS NULL THEN
    RAISE EXCEPTION 'KPI ativo requer um responsável (owner_user_id)';
  END IF;
  
  -- Regra 4: scope=area ativo → area_id obrigatório (ownership da área)
  IF NEW.lifecycle_status = 'active' AND NEW.scope = 'area' AND NEW.area_id IS NULL THEN
    RAISE EXCEPTION 'KPI ativo com escopo "área" requer uma área (area_id)';
  END IF;
  
  -- Regra 5 (v2.90.0): scope=org ativo → responsible_area_id OBRIGATÓRIO
  -- Garante que KPIs Globais sempre tenham uma área operacionalmente responsável
  IF NEW.lifecycle_status = 'active' AND NEW.scope = 'org' AND NEW.responsible_area_id IS NULL THEN
    RAISE EXCEPTION 'KPI Global ativo requer uma área responsável (responsible_area_id). Toda KPI Global deve ter alguém que acompanha e age em desvios.';
  END IF;
  
  -- Regra 6 (v2.90.0): scope=org NÃO pode ter area_id de ownership
  -- KPIs globais pertencem à organização, não a uma área específica
  IF NEW.scope = 'org' AND NEW.area_id IS NOT NULL THEN
    RAISE EXCEPTION 'KPI Global não pode ter area_id de ownership (use responsible_area_id para responsabilidade operacional)';
  END IF;
  
  RETURN NEW;
END;
$$;