
CREATE OR REPLACE FUNCTION public.rpc_assessment_preview_lookup(p_assessment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assessment public.assessments%ROWTYPE;
  v_bu uuid;
  v_uid uuid;
  v_forms jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  v_bu := public.current_bu_id();
  IF v_bu IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_active_bu');
  END IF;

  SELECT * INTO v_assessment FROM public.assessments
  WHERE id = p_assessment_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'assessment_not_found');
  END IF;

  IF v_assessment.bu_id <> v_bu THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden_bu');
  END IF;

  IF NOT public.has_assessment_permission(v_uid, v_bu, 'assessments.assessment.view:bu') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'form_id', f.id,
      'title', f.title,
      'description', f.description,
      'level', f.level,
      'position', l.position,
      'version_id', l.version_id,
      'questions', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', q.id,
            'position', q.position,
            'question_type', q.question_type,
            'prompt', q.prompt,
            'help_text', q.help_text,
            'required', q.required,
            'time_limit_seconds', q.time_limit_seconds,
            'options', q.options
          ) ORDER BY q.position, q.created_at
        )
        FROM public.assessment_form_questions q
        WHERE q.version_id = l.version_id AND q.deleted_at IS NULL
      ), '[]'::jsonb)
    ) ORDER BY l.position
  ) INTO v_forms
  FROM public.assessment_form_links l
  JOIN public.assessment_forms f ON f.id = l.form_id
  WHERE l.assessment_id = v_assessment.id AND l.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'ok', true,
    'invite', jsonb_build_object(
      'id', 'preview',
      'status', 'preview',
      'invitee_name', 'Pré-visualização',
      'invitee_cpf_masked', '***.***.***-**',
      'expires_at', NULL
    ),
    'assessment', jsonb_build_object(
      'id', v_assessment.id,
      'title', v_assessment.title,
      'description', v_assessment.description,
      'default_total_time_seconds', v_assessment.default_total_time_seconds
    ),
    'forms', COALESCE(v_forms, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_assessment_preview_lookup(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_assessment_preview_lookup(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_assessment_preview_lookup(uuid) TO authenticated;
