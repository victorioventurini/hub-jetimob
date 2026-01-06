-- Update the trigger function to exclude cancelled KRs from the limit count
CREATE OR REPLACE FUNCTION public.check_okr_limits()
RETURNS TRIGGER AS $$
DECLARE
  objective_count INTEGER;
  kr_count INTEGER;
BEGIN
  -- Check objective limit per team (only for team objectives)
  IF TG_TABLE_NAME = 'okr_team_objectives' THEN
    SELECT COUNT(*) INTO objective_count
    FROM public.okr_team_objectives
    WHERE team_id = NEW.team_id
      AND status NOT IN ('cancelled', 'discarded')
      AND deleted_at IS NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF objective_count >= 3 THEN
      RAISE EXCEPTION 'Team cannot have more than 3 active objectives';
    END IF;
  END IF;
  
  -- Check KR limit per objective (for team KRs)
  IF TG_TABLE_NAME = 'okr_team_key_results' THEN
    SELECT COUNT(*) INTO kr_count
    FROM public.okr_team_key_results
    WHERE team_objective_id = NEW.team_objective_id
      AND cancelled_at IS NULL  -- Exclude cancelled KRs
      AND deleted_at IS NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF kr_count >= 3 THEN
      RAISE EXCEPTION 'Objective cannot have more than 3 active key results';
    END IF;
  END IF;
  
  -- Check KR limit per org objective (for org KRs)
  IF TG_TABLE_NAME = 'okr_org_key_results' THEN
    SELECT COUNT(*) INTO kr_count
    FROM public.okr_org_key_results
    WHERE org_objective_id = NEW.org_objective_id
      AND cancelled_at IS NULL  -- Exclude cancelled KRs
      AND deleted_at IS NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF kr_count >= 3 THEN
      RAISE EXCEPTION 'Objective cannot have more than 3 active key results';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;