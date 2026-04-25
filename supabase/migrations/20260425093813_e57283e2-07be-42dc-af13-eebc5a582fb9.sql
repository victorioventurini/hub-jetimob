CREATE OR REPLACE FUNCTION public.validate_team_kr_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  kr_count integer;
BEGIN
  SELECT count(*) INTO kr_count
  FROM public.okr_team_key_results
  WHERE team_objective_id = NEW.team_objective_id
    AND team_id = NEW.team_id
    AND cancelled_at IS NULL
    AND deleted_at IS NULL
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF kr_count >= 4 THEN
    RAISE EXCEPTION 'Limite atingido: um time pode ter no máximo 4 KRs ativos neste objetivo.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS okr_team_key_results_insert_v2 ON public.okr_team_key_results;

CREATE POLICY okr_team_key_results_insert_v2
ON public.okr_team_key_results
FOR INSERT
TO authenticated
WITH CHECK (
  is_profile_bu_member(my_profile_id(), bu_id)
  AND has_permission(my_profile_id(), bu_id, 'okrs.team_kr.create:team')
  AND can_manage_team_okr_by_profile(my_profile_id(), team_id)
  AND EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = okr_team_key_results.team_id
      AND t.bu_id = okr_team_key_results.bu_id
      AND t.deleted_at IS NULL
      AND t.status = 'active'
  )
  AND EXISTS (
    SELECT 1
    FROM public.okr_team_objectives o
    WHERE o.id = okr_team_key_results.team_objective_id
      AND o.bu_id = okr_team_key_results.bu_id
      AND o.deleted_at IS NULL
      AND o.cancelled_at IS NULL
      AND o.status NOT IN ('cancelled', 'discarded')
      AND (
        o.team_id = okr_team_key_results.team_id
        OR (
          o.is_shared = true
          AND EXISTS (
            SELECT 1
            FROM public.okr_team_objective_contributors c
            WHERE c.objective_id = o.id
              AND c.team_id = okr_team_key_results.team_id
          )
        )
      )
  )
);