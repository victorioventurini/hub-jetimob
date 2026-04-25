CREATE OR REPLACE FUNCTION public.get_team_kr_creation_context(
  p_objective_id uuid,
  p_contributor_team_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  team_id uuid,
  org_objective_id uuid,
  cycle_id uuid,
  is_shared boolean,
  responsibility_model text,
  bu_id uuid,
  team_name text,
  org_objective_title text,
  cycle_name text,
  cycle_year integer,
  contribution_authorized boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_id uuid;
  v_current_bu_id uuid;
  v_effective_team_id uuid;
BEGIN
  IF p_objective_id IS NULL THEN
    RETURN;
  END IF;

  v_profile_id := public.my_profile_id();

  IF v_profile_id IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    v_current_bu_id := public.current_bu_id();
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  RETURN QUERY
  WITH objective_ctx AS (
    SELECT
      o.id,
      o.title,
      o.description,
      o.team_id,
      o.org_objective_id,
      o.cycle_id,
      o.is_shared,
      o.responsibility_model::text AS responsibility_model,
      o.bu_id,
      owner_team.name AS team_name,
      org_obj.title AS org_objective_title,
      c.name AS cycle_name,
      c.year AS cycle_year,
      COALESCE(p_contributor_team_id, o.team_id) AS effective_team_id
    FROM public.okr_team_objectives o
    JOIN public.teams owner_team
      ON owner_team.id = o.team_id
     AND owner_team.bu_id = o.bu_id
     AND owner_team.deleted_at IS NULL
    LEFT JOIN public.okr_org_objectives org_obj
      ON org_obj.id = o.org_objective_id
     AND org_obj.bu_id = o.bu_id
    LEFT JOIN public.cycles c
      ON c.id = o.cycle_id
     AND c.bu_id = o.bu_id
    WHERE o.id = p_objective_id
      AND o.bu_id = v_current_bu_id
      AND o.deleted_at IS NULL
      AND o.cancelled_at IS NULL
      AND o.status NOT IN ('cancelled', 'discarded')
  )
  SELECT
    ctx.id,
    ctx.title,
    ctx.description,
    ctx.team_id,
    ctx.org_objective_id,
    ctx.cycle_id,
    ctx.is_shared,
    ctx.responsibility_model,
    ctx.bu_id,
    ctx.team_name,
    ctx.org_objective_title,
    ctx.cycle_name,
    ctx.cycle_year,
    CASE
      WHEN p_contributor_team_id IS NULL OR p_contributor_team_id = ctx.team_id THEN true
      ELSE EXISTS (
        SELECT 1
        FROM public.okr_team_objective_contributors oc
        JOIN public.teams contributor_team
          ON contributor_team.id = oc.team_id
         AND contributor_team.bu_id = ctx.bu_id
         AND contributor_team.deleted_at IS NULL
         AND contributor_team.status = 'active'
        WHERE oc.objective_id = ctx.id
          AND oc.team_id = p_contributor_team_id
      )
    END AS contribution_authorized
  FROM objective_ctx ctx
  WHERE public.is_profile_bu_member(v_profile_id, ctx.bu_id)
    AND (
      public.has_permission(v_profile_id, ctx.bu_id, 'okrs.view:bu')
      OR public.has_permission(v_profile_id, ctx.bu_id, 'okrs.team_objective.read:team_tree')
      OR public.can_create_shared_team_kr_by_profile(v_profile_id, ctx.bu_id, ctx.id, ctx.effective_team_id)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_kr_creation_context(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.get_team_kr_creation_context(uuid, uuid) IS
  'Returns the BU-scoped objective context needed by the team KR creation wizard, including shared-objective contribution validation.';