-- 1. Add start_date column (nullable initially for backfill)
ALTER TABLE public.project_milestones
  ADD COLUMN IF NOT EXISTS start_date date;

-- 2. Backfill existing rows — disable BU enforcement trigger temporarily
ALTER TABLE public.project_milestones DISABLE TRIGGER USER;

UPDATE public.project_milestones
SET start_date = COALESCE(due_date, created_at::date)
WHERE start_date IS NULL;

ALTER TABLE public.project_milestones ENABLE TRIGGER USER;

-- 3. Enforce NOT NULL after backfill
ALTER TABLE public.project_milestones
  ALTER COLUMN start_date SET NOT NULL;

-- 4. Validation function + trigger (no CHECK constraints per project standard)
CREATE OR REPLACE FUNCTION public.validate_project_milestone_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.start_date IS NOT NULL
     AND NEW.due_date IS NOT NULL
     AND NEW.start_date > NEW.due_date THEN
    RAISE EXCEPTION 'project_milestones.start_date (%) cannot be greater than due_date (%)',
      NEW.start_date, NEW.due_date
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_milestones_validate_dates ON public.project_milestones;

CREATE TRIGGER trg_project_milestones_validate_dates
BEFORE INSERT OR UPDATE OF start_date, due_date
ON public.project_milestones
FOR EACH ROW
EXECUTE FUNCTION public.validate_project_milestone_dates();