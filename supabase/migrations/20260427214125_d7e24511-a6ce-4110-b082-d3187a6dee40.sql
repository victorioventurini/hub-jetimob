CREATE OR REPLACE FUNCTION public.archive_milestone_v2(p_milestone_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_profile uuid;
  v_milestone     record;
  v_project       record;
  v_authorized    boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED');
  END IF;

  SELECT id, project_id, bu_id, deleted_at, owner_id
    INTO v_milestone
    FROM public.project_milestones
   WHERE id = p_milestone_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  IF v_milestone.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'code', 'ALREADY_ARCHIVED',
      'project_id', v_milestone.project_id
    );
  END IF;

  SELECT id, owner_id, bu_id, deleted_at
    INTO v_project
    FROM public.projects
   WHERE id = v_milestone.project_id;

  IF NOT FOUND OR v_project.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  v_actor_profile := my_profile_id();

  IF is_platform_admin(auth.uid())
     OR v_project.owner_id = v_actor_profile
     OR is_bu_admin(auth.uid(), v_project.bu_id)
     OR is_leader_of_project_owner(v_actor_profile, v_project.owner_id, v_project.bu_id)
     OR has_permission(v_actor_profile, v_project.bu_id, 'projects.milestone.delete:bu'::text)
  THEN
    v_authorized := true;
  END IF;

  IF NOT v_authorized THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  UPDATE public.project_milestones
     SET deleted_at = now()
   WHERE id = p_milestone_id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'ARCHIVED',
    'project_id', v_milestone.project_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.archive_milestone_v2(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_milestone_v2(uuid) TO authenticated;

COMMENT ON FUNCTION public.archive_milestone_v2(uuid) IS
  'Soft-delete de milestone com autorização canônica server-side (padrão Projects v1.8). Retorna {ok, code, project_id?} com ARCHIVED, ALREADY_ARCHIVED, NOT_FOUND, FORBIDDEN, UNAUTHENTICATED.';
