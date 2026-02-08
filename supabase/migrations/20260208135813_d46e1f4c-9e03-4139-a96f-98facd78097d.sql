-- Fix KPI governance: allow org-scoped active KPIs without area_id
-- Aligns backend validation with canonical UX rules:
-- - area_id is required only for scope='area' when lifecycle_status='active'
-- - scope='team' infers area in UI (may be null if team has no area)
-- - scope='org' is global and must not require area_id

CREATE OR REPLACE FUNCTION public.kpi_metrics_governance_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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

  -- Regra 3 (ajustada): KPI ativo requer área APENAS quando scope='area'
  IF NEW.lifecycle_status = 'active' AND NEW.scope = 'area' AND NEW.area_id IS NULL THEN
    RAISE EXCEPTION 'KPI ativo com escopo "área" requer uma área responsável (area_id)';
  END IF;

  RETURN NEW;
END;
$$;