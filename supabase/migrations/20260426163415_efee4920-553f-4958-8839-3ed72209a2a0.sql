-- list_archived_projects v1.1 — JSONB com joins (owner, teams, krs, milestones)
-- Requer DROP prévio porque o tipo de retorno mudou de SETOF projects → jsonb.
-- RBAC v1.6 inalterado.

DROP FUNCTION IF EXISTS public.list_archived_projects();

CREATE OR REPLACE FUNCTION public.list_archived_projects()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_actor_profile uuid;
  v_bu_id uuid := current_bu_id();
  v_is_admin boolean;
  v_has_bu_perm boolean;
  v_result jsonb;
BEGIN
  IF v_auth_uid IS NULL OR v_bu_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  v_actor_profile := my_profile_id();

  v_is_admin :=
    is_super_admin(v_auth_uid)
    OR is_bu_admin(v_auth_uid, v_bu_id);

  v_has_bu_perm := v_actor_profile IS NOT NULL
    AND has_permission(v_actor_profile, v_bu_id, 'projects.project.update:bu');

  WITH base AS (
    SELECT p.*
    FROM public.projects p
    WHERE p.bu_id = v_bu_id
      AND p.deleted_at IS NOT NULL
      AND (
        v_is_admin
        OR v_has_bu_perm
        OR (
          v_actor_profile IS NOT NULL
          AND (
            p.owner_id = v_actor_profile
            OR is_leader_of_project_owner(v_actor_profile, p.owner_id, v_bu_id)
          )
        )
      )
    ORDER BY p.deleted_at DESC NULLS LAST, p.created_at DESC
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'description', b.description,
      'status', b.status,
      'start_date', b.start_date,
      'due_date', b.due_date,
      'external_url', b.external_url,
      'owner_id', b.owner_id,
      'bu_id', b.bu_id,
      'created_at', b.created_at,
      'updated_at', b.updated_at,
      'deleted_at', b.deleted_at,
      'owner', (
        SELECT jsonb_build_object(
          'id', pr.id,
          'display_name', pr.display_name,
          'photo_url', pr.photo_url
        )
        FROM public.profiles pr
        WHERE pr.id = b.owner_id
      ),
      'project_teams', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'team_id', pt.team_id,
          'teams', jsonb_build_object('id', t.id, 'name', t.name)
        ))
        FROM public.project_teams pt
        LEFT JOIN public.teams t ON t.id = pt.team_id
        WHERE pt.project_id = b.id
      ), '[]'::jsonb),
      'project_krs', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'key_result_id', pk.key_result_id,
          'impact', pk.impact,
          'kr', jsonb_build_object('id', kr.id, 'title', kr.title)
        ))
        FROM public.project_krs pk
        LEFT JOIN public.okr_team_key_results kr ON kr.id = pk.key_result_id
        WHERE pk.project_id = b.id
      ), '[]'::jsonb),
      'project_milestones', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', m.id,
          'name', m.name,
          'status', m.status,
          'start_date', m.start_date,
          'due_date', m.due_date,
          'created_at', m.created_at,
          'deleted_at', m.deleted_at
        ))
        FROM public.project_milestones m
        WHERE m.project_id = b.id
          AND m.deleted_at IS NULL
      ), '[]'::jsonb)
    )
  ), '[]'::jsonb)
  INTO v_result
  FROM base b;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_archived_projects() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_archived_projects() TO authenticated;

COMMENT ON FUNCTION public.list_archived_projects() IS
  'v1.1 — Retorna projetos arquivados (deleted_at IS NOT NULL) da BU corrente como JSONB com joins (owner, project_teams, project_krs, project_milestones). RBAC v1.6 inalterado: super_admin OR bu_admin OR has_permission(...,projects.project.update:bu) OR owner OR is_leader_of_project_owner.';