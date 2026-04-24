
-- ============================================================
-- Entity name length limits — defense in depth
-- Sincronizado com src/shared/constants/entityLimits.ts
-- ============================================================

-- 1. Org Objective title (120)
CREATE OR REPLACE FUNCTION public.validate_org_objective_title_length()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.title IS NOT NULL AND char_length(NEW.title) > 120 THEN
    RAISE EXCEPTION 'O título do objetivo organizacional excede o limite de 120 caracteres (atual: %).', char_length(NEW.title)
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_org_objective_title_length ON public.okr_org_objectives;
CREATE TRIGGER trg_validate_org_objective_title_length
  BEFORE INSERT OR UPDATE OF title ON public.okr_org_objectives
  FOR EACH ROW EXECUTE FUNCTION public.validate_org_objective_title_length();

-- 2. Team Objective title (120)
CREATE OR REPLACE FUNCTION public.validate_team_objective_title_length()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.title IS NOT NULL AND char_length(NEW.title) > 120 THEN
    RAISE EXCEPTION 'O título do objetivo de time excede o limite de 120 caracteres (atual: %).', char_length(NEW.title)
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_team_objective_title_length ON public.okr_team_objectives;
CREATE TRIGGER trg_validate_team_objective_title_length
  BEFORE INSERT OR UPDATE OF title ON public.okr_team_objectives
  FOR EACH ROW EXECUTE FUNCTION public.validate_team_objective_title_length();

-- 3. Key Result title (160)
CREATE OR REPLACE FUNCTION public.validate_kr_title_length()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.title IS NOT NULL AND char_length(NEW.title) > 160 THEN
    RAISE EXCEPTION 'O título do KR excede o limite de 160 caracteres (atual: %).', char_length(NEW.title)
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_kr_title_length ON public.okr_team_key_results;
CREATE TRIGGER trg_validate_kr_title_length
  BEFORE INSERT OR UPDATE OF title ON public.okr_team_key_results
  FOR EACH ROW EXECUTE FUNCTION public.validate_kr_title_length();

-- 4. Initiative name (120)
CREATE OR REPLACE FUNCTION public.validate_initiative_name_length()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS NOT NULL AND char_length(NEW.name) > 120 THEN
    RAISE EXCEPTION 'O nome da iniciativa excede o limite de 120 caracteres (atual: %).', char_length(NEW.name)
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_initiative_name_length ON public.okr_initiatives;
CREATE TRIGGER trg_validate_initiative_name_length
  BEFORE INSERT OR UPDATE OF name ON public.okr_initiatives
  FOR EACH ROW EXECUTE FUNCTION public.validate_initiative_name_length();

-- 5. Project name (100)
CREATE OR REPLACE FUNCTION public.validate_project_name_length()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS NOT NULL AND char_length(NEW.name) > 100 THEN
    RAISE EXCEPTION 'O nome do projeto excede o limite de 100 caracteres (atual: %).', char_length(NEW.name)
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_project_name_length ON public.projects;
CREATE TRIGGER trg_validate_project_name_length
  BEFORE INSERT OR UPDATE OF name ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.validate_project_name_length();

-- 6. Milestone name (80)
CREATE OR REPLACE FUNCTION public.validate_milestone_name_length()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS NOT NULL AND char_length(NEW.name) > 80 THEN
    RAISE EXCEPTION 'O nome do milestone excede o limite de 80 caracteres (atual: %).', char_length(NEW.name)
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_milestone_name_length ON public.project_milestones;
CREATE TRIGGER trg_validate_milestone_name_length
  BEFORE INSERT OR UPDATE OF name ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.validate_milestone_name_length();
