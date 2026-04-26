-- Fix: cast explícito text → project_status no COALESCE de status
-- Bug: COALESCE(NULLIF(p_payload->>'status',''), status) falha com
-- "COALESCE types text and project_status cannot be matched"
-- Causa: NULLIF retorna text; coluna status é do enum project_status.
-- Demais regras (whitelist, autorização v1.6, RBAC) inalteradas.

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
       status       = COALESCE(
                        NULLIF(p_payload->>'status','')::public.project_status,
                        status
                      ),
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
'v1.7 — Fix cast text→project_status no COALESCE de status. Whitelist e RBAC v1.6 inalterados.';