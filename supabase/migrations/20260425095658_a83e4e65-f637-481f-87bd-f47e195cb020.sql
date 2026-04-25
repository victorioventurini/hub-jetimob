CREATE OR REPLACE FUNCTION public.can_create_shared_team_kr_by_profile(
  p_profile_id uuid,
  p_bu_id uuid,
  p_objective_id uuid,
  p_kr_team_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.okr_team_objectives o
    JOIN public.teams kr_team
      ON kr_team.id = p_kr_team_id
     AND kr_team.bu_id = p_bu_id
     AND kr_team.deleted_at IS NULL
     AND kr_team.status = 'active'
    WHERE o.id = p_objective_id
      AND o.bu_id = p_bu_id
      AND o.deleted_at IS NULL
      AND o.cancelled_at IS NULL
      AND o.status NOT IN ('cancelled', 'discarded')
      AND (
        (
          o.team_id = p_kr_team_id
          AND (
            public.is_profile_bu_admin(p_profile_id, p_bu_id)
            OR o.owner_user_id = p_profile_id
            OR public.can_manage_team_okr_by_profile(p_profile_id, p_kr_team_id)
          )
        )
        OR (
          o.is_shared = true
          AND EXISTS (
            SELECT 1
            FROM public.okr_team_objective_contributors c
            WHERE c.objective_id = o.id
              AND c.team_id = p_kr_team_id
          )
          AND (
            public.is_profile_bu_admin(p_profile_id, p_bu_id)
            OR o.owner_user_id = p_profile_id
            OR public.can_manage_team_okr_by_profile(p_profile_id, o.team_id)
            OR public.can_manage_team_okr_by_profile(p_profile_id, p_kr_team_id)
          )
        )
      )
  )
$function$;

DROP POLICY IF EXISTS okr_team_key_results_insert_v2 ON public.okr_team_key_results;

CREATE POLICY okr_team_key_results_insert_v2
ON public.okr_team_key_results
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_profile_bu_member(public.my_profile_id(), bu_id)
  AND public.has_permission(public.my_profile_id(), bu_id, 'okrs.team_kr.create:team')
  AND public.can_create_shared_team_kr_by_profile(
    public.my_profile_id(),
    bu_id,
    team_objective_id,
    team_id
  )
);

DROP POLICY IF EXISTS okr_initiatives_insert_v2 ON public.okr_initiatives;

CREATE POLICY okr_initiatives_insert_v2
ON public.okr_initiatives
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_permission(public.my_profile_id(), bu_id, 'okrs.initiative.create:team')
  AND (
    owner_user_id = public.my_profile_id()
    OR public.can_manage_team_okr_by_profile(
      public.my_profile_id(),
      (
        SELECT kr.team_id
        FROM public.okr_team_key_results kr
        WHERE kr.id = okr_initiatives.kr_id
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.okr_team_key_results kr
      WHERE kr.id = okr_initiatives.kr_id
        AND kr.bu_id = okr_initiatives.bu_id
        AND public.can_create_shared_team_kr_by_profile(
          public.my_profile_id(),
          okr_initiatives.bu_id,
          kr.team_objective_id,
          kr.team_id
        )
    )
  )
);