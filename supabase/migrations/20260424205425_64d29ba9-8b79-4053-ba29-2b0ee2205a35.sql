-- =====================================================================
-- archive_project_v2 / update_project_v2
-- Centraliza no banco a regra canônica v1.6 de autorização de projetos,
-- eliminando o probe SELECT que falhava em drift de BU contextual.
-- =====================================================================

-- Drop se já existirem (idempotência da migration)
DROP FUNCTION IF EXISTS public.archive_project_v2(uuid);
DROP FUNCTION IF EXISTS public.update_project_v2(uuid, jsonb);

-- ---------------------------------------------------------------------
-- archive_project_v2(p_project_id)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_project_v2(p_project_id uuid)
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
  FROM projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  IF v_deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'code', 'ALREADY_ARCHIVED',
      'project_id', p_project_id,
      'bu_id', v_bu_id
    );
  END IF;

  v_actor_profile := my_profile_id();

  -- Regra canônica v1.6 (idêntica à RLS de projects_delete)
  v_authorized :=
    is_super_admin(v_auth_uid)
    OR is_bu_admin(v_auth_uid, v_bu_id)
    OR (v_actor_profile IS NOT NULL AND v_owner_id = v_actor_profile)
    OR (v_actor_profile IS NOT NULL AND is_leader_of_project_owner(v_actor_profile, v_owner_id, v_bu_id))
    OR (v_actor_profile IS NOT NULL AND has_permission(v_actor_profile, v_bu_id, 'projects.project.delete:bu'));

  IF NOT v_authorized THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'FORBIDDEN',
      'project_id', p_project_id,
      'bu_id', v_bu_id
    );
  END IF;

  UPDATE projects
     SET deleted_at = now()
   WHERE id = p_project_id
     AND deleted_at IS NULL;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'ARCHIVED',
    'project_id', p_project_id,
    'bu_id', v_bu_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.archive_project_v2(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_project_v2(uuid) TO authenticated;

COMMENT ON FUNCTION public.archive_project_v2(uuid) IS
'Soft-delete canônico de projetos. SECURITY DEFINER. Regra v1.6: super_admin OR bu_admin OR owner OR leader_of_owner OR has_permission(projects.project.delete:bu). Retorna jsonb com {ok, code} categorizado.';

-- ---------------------------------------------------------------------
-- update_project_v2(p_project_id, p_payload)
-- Whitelist de campos: name, description, owner_id, status,
-- start_date, due_date, external_url
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_project_v2(p_project_id uuid, p_payload jsonb)
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

  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_PAYLOAD');
  END IF;

  SELECT bu_id, owner_id, deleted_at
    INTO v_bu_id, v_owner_id, v_deleted_at
  FROM projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  IF v_deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_ARCHIVED');
  END IF;

  v_actor_profile := my_profile_id();

  v_authorized :=
    is_super_admin(v_auth_uid)
    OR is_bu_admin(v_auth_uid, v_bu_id)
    OR (v_actor_profile IS NOT NULL AND v_owner_id = v_actor_profile)
    OR (v_actor_profile IS NOT NULL AND is_leader_of_project_owner(v_actor_profile, v_owner_id, v_bu_id))
    OR (v_actor_profile IS NOT NULL AND has_permission(v_actor_profile, v_bu_id, 'projects.project.update:bu'));

  IF NOT v_authorized THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'FORBIDDEN',
      'project_id', p_project_id,
      'bu_id', v_bu_id
    );
  END IF;

  UPDATE projects
     SET
       name         = COALESCE(NULLIF(p_payload->>'name', ''), name),
       description  = CASE WHEN p_payload ? 'description' THEN NULLIF(p_payload->>'description','') ELSE description END,
       owner_id     = CASE WHEN p_payload ? 'owner_id' AND NULLIF(p_payload->>'owner_id','') IS NOT NULL
                           THEN (p_payload->>'owner_id')::uuid ELSE owner_id END,
       status       = COALESCE(NULLIF(p_payload->>'status',''), status),
       start_date   = CASE WHEN p_payload ? 'start_date' THEN NULLIF(p_payload->>'start_date','')::date ELSE start_date END,
       due_date     = CASE WHEN p_payload ? 'due_date'   THEN NULLIF(p_payload->>'due_date','')::date   ELSE due_date END,
       external_url = CASE WHEN p_payload ? 'external_url' THEN NULLIF(p_payload->>'external_url','') ELSE external_url END
   WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'UPDATED',
    'project_id', p_project_id,
    'bu_id', v_bu_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_project_v2(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_project_v2(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.update_project_v2(uuid, jsonb) IS
'Update canônico de projetos. SECURITY DEFINER. Regra v1.6: super_admin OR bu_admin OR owner OR leader_of_owner OR has_permission(projects.project.update:bu). Whitelist: name, description, owner_id, status, start_date, due_date, external_url.';
