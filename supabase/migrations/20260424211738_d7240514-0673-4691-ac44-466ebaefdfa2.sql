-- =====================================================================
-- list_archived_projects / get_archived_project_v2 / restore_project_v2
-- Acesso a projetos arquivados (deleted_at IS NOT NULL) via SECURITY DEFINER.
-- Regra canônica v1.6: super_admin OR bu_admin OR owner OR leader_of_owner
--   OR has_permission(projects.project.update:bu).
-- Necessário porque a RLS de projects filtra deleted_at IS NULL,
-- impossibilitando SELECT direto de arquivados pelo cliente.
-- =====================================================================

DROP FUNCTION IF EXISTS public.list_archived_projects();
DROP FUNCTION IF EXISTS public.get_archived_project_v2(uuid);
DROP FUNCTION IF EXISTS public.restore_project_v2(uuid);

-- ---------------------------------------------------------------------
-- list_archived_projects()
-- Retorna projetos arquivados da BU corrente que o ator pode visualizar.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_archived_projects()
RETURNS SETOF public.projects
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_actor_profile uuid;
  v_bu_id uuid := current_bu_id();
  v_is_admin boolean;
  v_has_bu_perm boolean;
BEGIN
  IF v_auth_uid IS NULL OR v_bu_id IS NULL THEN
    RETURN;
  END IF;

  v_actor_profile := my_profile_id();

  v_is_admin :=
    is_super_admin(v_auth_uid)
    OR is_bu_admin(v_auth_uid, v_bu_id);

  v_has_bu_perm := v_actor_profile IS NOT NULL
    AND has_permission(v_actor_profile, v_bu_id, 'projects.project.update:bu');

  IF v_is_admin OR v_has_bu_perm THEN
    RETURN QUERY
      SELECT p.*
      FROM public.projects p
      WHERE p.bu_id = v_bu_id
        AND p.deleted_at IS NOT NULL
      ORDER BY p.deleted_at DESC NULLS LAST, p.created_at DESC;
    RETURN;
  END IF;

  -- Owner ou líder do owner
  RETURN QUERY
    SELECT p.*
    FROM public.projects p
    WHERE p.bu_id = v_bu_id
      AND p.deleted_at IS NOT NULL
      AND v_actor_profile IS NOT NULL
      AND (
        p.owner_id = v_actor_profile
        OR is_leader_of_project_owner(v_actor_profile, p.owner_id, v_bu_id)
      )
    ORDER BY p.deleted_at DESC NULLS LAST, p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_archived_projects() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_archived_projects() TO authenticated;

COMMENT ON FUNCTION public.list_archived_projects() IS
'Lista projetos arquivados (deleted_at NOT NULL) da BU corrente visíveis ao ator. Regra canônica v1.6.';

-- ---------------------------------------------------------------------
-- get_archived_project_v2(p_project_id)
-- Retorna jsonb com o projeto arquivado + relações (owner, teams, krs, milestones).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_archived_project_v2(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_actor_profile uuid;
  v_bu_id uuid;
  v_owner_id uuid;
  v_deleted_at timestamptz;
  v_authorized boolean := false;
  v_result jsonb;
BEGIN
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED');
  END IF;

  SELECT bu_id, owner_id, deleted_at
    INTO v_bu_id, v_owner_id, v_deleted_at
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  IF v_deleted_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_ARCHIVED');
  END IF;

  v_actor_profile := my_profile_id();

  v_authorized :=
    is_super_admin(v_auth_uid)
    OR is_bu_admin(v_auth_uid, v_bu_id)
    OR (v_actor_profile IS NOT NULL AND v_owner_id = v_actor_profile)
    OR (v_actor_profile IS NOT NULL AND is_leader_of_project_owner(v_actor_profile, v_owner_id, v_bu_id))
    OR (v_actor_profile IS NOT NULL AND has_permission(v_actor_profile, v_bu_id, 'projects.project.update:bu'));

  IF NOT v_authorized THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'project_id', p_project_id, 'bu_id', v_bu_id);
  END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'code', 'OK',
    'project', to_jsonb(p) || jsonb_build_object(
      'owner', (
        SELECT jsonb_build_object('id', pr.id, 'display_name', pr.display_name, 'photo_url', pr.photo_url)
        FROM profiles pr WHERE pr.id = p.owner_id
      ),
      'project_teams', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'team_id', pt.team_id,
          'teams', jsonb_build_object('id', t.id, 'name', t.name)
        ))
        FROM project_teams pt
        LEFT JOIN teams t ON t.id = pt.team_id
        WHERE pt.project_id = p.id
      ), '[]'::jsonb),
      'project_krs', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'key_result_id', pk.key_result_id,
          'org_key_result_id', pk.org_key_result_id,
          'impact', pk.impact,
          'kr', CASE WHEN pk.key_result_id IS NOT NULL THEN (
            SELECT jsonb_build_object(
              'id', kr.id,
              'title', kr.title,
              'objective', (
                SELECT jsonb_build_object(
                  'id', o.id,
                  'title', o.title,
                  'team', (SELECT jsonb_build_object('id', t.id, 'name', t.name) FROM teams t WHERE t.id = o.team_id)
                )
                FROM okr_team_objectives o WHERE o.id = kr.team_objective_id
              )
            )
            FROM okr_team_key_results kr WHERE kr.id = pk.key_result_id
          ) ELSE NULL END,
          'org_kr', CASE WHEN pk.org_key_result_id IS NOT NULL THEN (
            SELECT jsonb_build_object('id', okr.id, 'title', okr.title)
            FROM okr_org_key_results okr WHERE okr.id = pk.org_key_result_id
          ) ELSE NULL END
        ))
        FROM project_krs pk
        WHERE pk.project_id = p.id
      ), '[]'::jsonb),
      'project_milestones', COALESCE((
        SELECT jsonb_agg(to_jsonb(m) ORDER BY m.sort_order, m.created_at)
        FROM project_milestones m
        WHERE m.project_id = p.id AND m.deleted_at IS NULL
      ), '[]'::jsonb)
    )
  )
  INTO v_result
  FROM public.projects p
  WHERE p.id = p_project_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_archived_project_v2(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_archived_project_v2(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_archived_project_v2(uuid) IS
'Retorna projeto arquivado + relações (owner, teams, krs, milestones). Regra canônica v1.6.';

-- ---------------------------------------------------------------------
-- restore_project_v2(p_project_id)
-- Restaura projeto arquivado (deleted_at = NULL).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_project_v2(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_actor_profile uuid;
  v_bu_id uuid;
  v_owner_id uuid;
  v_deleted_at timestamptz;
  v_authorized boolean := false;
BEGIN
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED');
  END IF;

  SELECT bu_id, owner_id, deleted_at
    INTO v_bu_id, v_owner_id, v_deleted_at
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  IF v_deleted_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_ARCHIVED', 'project_id', p_project_id, 'bu_id', v_bu_id);
  END IF;

  v_actor_profile := my_profile_id();

  v_authorized :=
    is_super_admin(v_auth_uid)
    OR is_bu_admin(v_auth_uid, v_bu_id)
    OR (v_actor_profile IS NOT NULL AND v_owner_id = v_actor_profile)
    OR (v_actor_profile IS NOT NULL AND is_leader_of_project_owner(v_actor_profile, v_owner_id, v_bu_id))
    OR (v_actor_profile IS NOT NULL AND has_permission(v_actor_profile, v_bu_id, 'projects.project.update:bu'));

  IF NOT v_authorized THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'project_id', p_project_id, 'bu_id', v_bu_id);
  END IF;

  UPDATE public.projects
     SET deleted_at = NULL,
         updated_at = now()
   WHERE id = p_project_id
     AND deleted_at IS NOT NULL;

  RETURN jsonb_build_object('ok', true, 'code', 'RESTORED', 'project_id', p_project_id, 'bu_id', v_bu_id);
END;
$$;

REVOKE ALL ON FUNCTION public.restore_project_v2(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_project_v2(uuid) TO authenticated;

COMMENT ON FUNCTION public.restore_project_v2(uuid) IS
'Restaura projeto arquivado (deleted_at = NULL). SECURITY DEFINER. Regra canônica v1.6. Códigos: RESTORED, NOT_FOUND, FORBIDDEN, NOT_ARCHIVED, UNAUTHENTICATED.';