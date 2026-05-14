-- Resolve forms para a versão `published` mais recente do formulário,
-- com fallback para a version_id pinada no link.

CREATE OR REPLACE FUNCTION public.rpc_assessment_preview_lookup(p_assessment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      'version_id', COALESCE(
        (SELECT v.id FROM public.assessment_form_versions v
          WHERE v.form_id = l.form_id
            AND v.status = 'published'
            AND v.deleted_at IS NULL
          ORDER BY v.version_number DESC
          LIMIT 1),
        l.version_id
      ),
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
        WHERE q.version_id = COALESCE(
          (SELECT v.id FROM public.assessment_form_versions v
            WHERE v.form_id = l.form_id
              AND v.status = 'published'
              AND v.deleted_at IS NULL
            ORDER BY v.version_number DESC
            LIMIT 1),
          l.version_id
        )
        AND q.deleted_at IS NULL
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
$function$;


CREATE OR REPLACE FUNCTION public.rpc_assessment_invite_lookup(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invite public.assessment_invites%ROWTYPE;
  v_assessment public.assessments%ROWTYPE;
  v_forms jsonb;
BEGIN
  SELECT * INTO v_invite FROM public.assessment_invites
  WHERE token = p_token AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_not_found');
  END IF;

  IF v_invite.status IN ('expired', 'revoked') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_' || v_invite.status);
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_expired');
  END IF;

  SELECT * INTO v_assessment FROM public.assessments
  WHERE id = v_invite.assessment_id AND deleted_at IS NULL;

  IF NOT FOUND OR v_assessment.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'assessment_unavailable');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'form_id', f.id,
      'title', f.title,
      'description', f.description,
      'level', f.level,
      'position', l.position,
      'version_id', COALESCE(
        (SELECT v.id FROM public.assessment_form_versions v
          WHERE v.form_id = l.form_id
            AND v.status = 'published'
            AND v.deleted_at IS NULL
          ORDER BY v.version_number DESC
          LIMIT 1),
        l.version_id
      ),
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
        WHERE q.version_id = COALESCE(
          (SELECT v.id FROM public.assessment_form_versions v
            WHERE v.form_id = l.form_id
              AND v.status = 'published'
              AND v.deleted_at IS NULL
            ORDER BY v.version_number DESC
            LIMIT 1),
          l.version_id
        )
        AND q.deleted_at IS NULL
      ), '[]'::jsonb)
    ) ORDER BY l.position
  ) INTO v_forms
  FROM public.assessment_form_links l
  JOIN public.assessment_forms f ON f.id = l.form_id
  WHERE l.assessment_id = v_assessment.id AND l.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'ok', true,
    'invite', jsonb_build_object(
      'id', v_invite.id,
      'status', v_invite.status,
      'invitee_name', v_invite.invitee_name,
      'invitee_cpf_masked', regexp_replace(v_invite.invitee_cpf, '(\d{3})(\d{3})(\d{3})(\d{2})', '\1.***.\3-**'),
      'expires_at', v_invite.expires_at
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
$function$;