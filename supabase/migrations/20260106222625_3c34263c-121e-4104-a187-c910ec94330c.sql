
-- =====================================================
-- FIX: KR Limit Validation - Separate org/team + cancelled_at
-- =====================================================

-- Drop the old conflicting trigger (uses old function)
DROP TRIGGER IF EXISTS enforce_max_kr_per_objective ON okr_team_key_results;

-- Create separate, correct validation functions

-- 1) Validate ORG KRs - only counts in okr_org_key_results
CREATE OR REPLACE FUNCTION public.validate_org_kr_limit()
RETURNS TRIGGER AS $$
DECLARE
  kr_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO kr_count
  FROM public.okr_org_key_results
  WHERE org_objective_id = NEW.org_objective_id
    AND cancelled_at IS NULL
    AND deleted_at IS NULL
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF kr_count >= 3 THEN
    RAISE EXCEPTION 'Limite atingido: um Objetivo Organizacional pode ter no máximo 3 KRs ativos.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2) Validate TEAM KRs - only counts in okr_team_key_results
CREATE OR REPLACE FUNCTION public.validate_team_kr_limit()
RETURNS TRIGGER AS $$
DECLARE
  kr_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO kr_count
  FROM public.okr_team_key_results
  WHERE team_objective_id = NEW.team_objective_id
    AND cancelled_at IS NULL
    AND deleted_at IS NULL
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF kr_count >= 3 THEN
    RAISE EXCEPTION 'Limite atingido: um Objetivo de Time pode ter no máximo 3 KRs ativos.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) Validate team objectives per team
CREATE OR REPLACE FUNCTION public.validate_team_objectives_limit()
RETURNS TRIGGER AS $$
DECLARE
  objective_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO objective_count
  FROM public.okr_team_objectives
  WHERE team_id = NEW.team_id
    AND status NOT IN ('cancelled', 'discarded', 'completed')
    AND deleted_at IS NULL
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF objective_count >= 3 THEN
    RAISE EXCEPTION 'Limite atingido: um Time pode ter no máximo 3 objetivos ativos.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop any old triggers that might exist
DROP TRIGGER IF EXISTS enforce_org_kr_limit ON okr_org_key_results;
DROP TRIGGER IF EXISTS enforce_team_kr_limit ON okr_team_key_results;
DROP TRIGGER IF EXISTS enforce_team_objectives_limit ON okr_team_objectives;
DROP TRIGGER IF EXISTS enforce_max_team_objectives ON okr_team_objectives;

-- Create new triggers
CREATE TRIGGER enforce_org_kr_limit
  BEFORE INSERT OR UPDATE ON okr_org_key_results
  FOR EACH ROW
  EXECUTE FUNCTION validate_org_kr_limit();

CREATE TRIGGER enforce_team_kr_limit
  BEFORE INSERT OR UPDATE ON okr_team_key_results
  FOR EACH ROW
  EXECUTE FUNCTION validate_team_kr_limit();

CREATE TRIGGER enforce_team_objectives_limit
  BEFORE INSERT OR UPDATE ON okr_team_objectives
  FOR EACH ROW
  EXECUTE FUNCTION validate_team_objectives_limit();

-- Drop the old unified function if not needed elsewhere
DROP FUNCTION IF EXISTS public.check_okr_limits() CASCADE;
DROP FUNCTION IF EXISTS public.validate_max_kr_per_objective() CASCADE;
DROP FUNCTION IF EXISTS public.validate_max_team_objectives() CASCADE;
