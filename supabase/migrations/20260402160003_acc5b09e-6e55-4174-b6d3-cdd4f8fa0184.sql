
CREATE OR REPLACE FUNCTION public.validate_team_objectives_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  objective_count INTEGER;
BEGIN
  -- Count non-terminal objectives for the SAME cycle (draft objectives for next cycle should not block)
  SELECT COUNT(*) INTO objective_count
  FROM public.okr_team_objectives
  WHERE team_id = NEW.team_id
    AND cycle_id = NEW.cycle_id
    AND status NOT IN ('cancelled', 'discarded', 'completed')
    AND deleted_at IS NULL
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF objective_count >= 3 THEN
    RAISE EXCEPTION 'Limite atingido: um Time pode ter no máximo 3 objetivos por ciclo.';
  END IF;
  
  RETURN NEW;
END;
$$;
