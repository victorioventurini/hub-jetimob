CREATE OR REPLACE FUNCTION public.validate_reasonable_due_date()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.due_date IS NOT NULL AND (NEW.due_date < DATE '2000-01-01' OR NEW.due_date > DATE '2099-12-31') THEN
    RAISE EXCEPTION 'Data inválida: o prazo deve estar entre 2000 e 2099.' USING ERRCODE = '22007';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validate_due_date ON public.project_milestones;
CREATE TRIGGER trg_validate_due_date BEFORE INSERT OR UPDATE OF due_date ON public.project_milestones FOR EACH ROW EXECUTE FUNCTION public.validate_reasonable_due_date();
DROP TRIGGER IF EXISTS trg_validate_due_date ON public.projects;
CREATE TRIGGER trg_validate_due_date BEFORE INSERT OR UPDATE OF due_date ON public.projects FOR EACH ROW EXECUTE FUNCTION public.validate_reasonable_due_date();