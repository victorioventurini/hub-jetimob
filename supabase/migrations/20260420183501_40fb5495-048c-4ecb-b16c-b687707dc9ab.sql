CREATE OR REPLACE FUNCTION public.validate_max_kr_per_objective()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  kr_count INTEGER;
BEGIN
  IF NEW.team_objective_id IS NOT NULL THEN
    SELECT COUNT(*) INTO kr_count
    FROM public.okr_team_key_results
    WHERE team_objective_id = NEW.team_objective_id
      AND deleted_at IS NULL
      AND cancelled_at IS NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF kr_count >= 4 THEN
      RAISE EXCEPTION 'Objective cannot have more than 4 key results';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;