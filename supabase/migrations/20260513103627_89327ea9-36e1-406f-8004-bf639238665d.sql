-- Lookup público do convite (sem login)
CREATE OR REPLACE FUNCTION public.rpc_assessment_invite_lookup(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Forms + questions snapshot
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
$$;

REVOKE ALL ON FUNCTION public.rpc_assessment_invite_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_assessment_invite_lookup(text) TO anon, authenticated;

-- Iniciar tentativa
CREATE OR REPLACE FUNCTION public.rpc_assessment_run_start(
  p_token text,
  p_cpf text,
  p_name text DEFAULT NULL,
  p_client_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.assessment_invites%ROWTYPE;
  v_run public.assessment_runs%ROWTYPE;
  v_total_time integer;
  v_expires timestamptz;
  v_cpf_clean text;
BEGIN
  v_cpf_clean := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');

  SELECT * INTO v_invite FROM public.assessment_invites
  WHERE token = p_token AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_not_found');
  END IF;
  IF v_invite.status IN ('expired', 'revoked', 'submitted') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_' || v_invite.status);
  END IF;
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_expired');
  END IF;
  IF regexp_replace(v_invite.invitee_cpf, '\D', '', 'g') <> v_cpf_clean THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cpf_mismatch');
  END IF;

  -- Reutilizar run em andamento se existir
  SELECT * INTO v_run FROM public.assessment_runs
  WHERE invite_id = v_invite.id AND status = 'in_progress' AND deleted_at IS NULL
  ORDER BY started_at DESC LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'run_id', v_run.id, 'expires_at', v_run.expires_at, 'resumed', true);
  END IF;

  SELECT default_total_time_seconds INTO v_total_time FROM public.assessments WHERE id = v_invite.assessment_id;
  IF v_total_time IS NULL THEN
    SELECT COALESCE(SUM(q.time_limit_seconds), 0) INTO v_total_time
    FROM public.assessment_form_links l
    JOIN public.assessment_form_questions q ON q.version_id = l.version_id AND q.deleted_at IS NULL
    WHERE l.assessment_id = v_invite.assessment_id AND l.deleted_at IS NULL;
  END IF;
  v_expires := now() + make_interval(secs => GREATEST(v_total_time, 60));

  INSERT INTO public.assessment_runs (
    bu_id, invite_id, assessment_id, respondent_profile_id, respondent_cpf, respondent_name,
    status, started_at, expires_at, client_meta
  ) VALUES (
    v_invite.bu_id, v_invite.id, v_invite.assessment_id, v_invite.invitee_profile_id,
    v_cpf_clean, COALESCE(p_name, v_invite.invitee_name),
    'in_progress', now(), v_expires, p_client_meta
  ) RETURNING * INTO v_run;

  UPDATE public.assessment_invites
  SET status = 'started', started_at = COALESCE(started_at, now())
  WHERE id = v_invite.id;

  RETURN jsonb_build_object('ok', true, 'run_id', v_run.id, 'expires_at', v_run.expires_at, 'resumed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_assessment_run_start(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_assessment_run_start(text, text, text, jsonb) TO anon, authenticated;

-- Upsert resposta
CREATE OR REPLACE FUNCTION public.rpc_assessment_answer_upsert(
  p_run_id uuid,
  p_question_id uuid,
  p_answer_text text DEFAULT NULL,
  p_answer_options jsonb DEFAULT NULL,
  p_time_spent_seconds integer DEFAULT 0,
  p_paste_detected boolean DEFAULT false,
  p_signals jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.assessment_runs%ROWTYPE;
  v_question public.assessment_form_questions%ROWTYPE;
BEGIN
  SELECT * INTO v_run FROM public.assessment_runs WHERE id = p_run_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'run_not_found'); END IF;
  IF v_run.status <> 'in_progress' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'run_' || v_run.status);
  END IF;
  IF v_run.expires_at IS NOT NULL AND v_run.expires_at < now() THEN
    UPDATE public.assessment_runs SET status='expired' WHERE id=v_run.id;
    RETURN jsonb_build_object('ok', false, 'error', 'run_expired');
  END IF;

  SELECT * INTO v_question FROM public.assessment_form_questions WHERE id = p_question_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'question_not_found'); END IF;
  IF v_question.bu_id <> v_run.bu_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'question_bu_mismatch');
  END IF;

  INSERT INTO public.assessment_answers (
    bu_id, run_id, question_id, answer_text, answer_options,
    time_spent_seconds, paste_detected, signals
  ) VALUES (
    v_run.bu_id, p_run_id, p_question_id, p_answer_text, p_answer_options,
    GREATEST(p_time_spent_seconds, 0), p_paste_detected, COALESCE(p_signals, '{}'::jsonb)
  )
  ON CONFLICT (run_id, question_id) DO UPDATE SET
    answer_text = EXCLUDED.answer_text,
    answer_options = EXCLUDED.answer_options,
    time_spent_seconds = EXCLUDED.time_spent_seconds,
    paste_detected = public.assessment_answers.paste_detected OR EXCLUDED.paste_detected,
    signals = public.assessment_answers.signals || EXCLUDED.signals,
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_assessment_answer_upsert(uuid, uuid, text, jsonb, integer, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_assessment_answer_upsert(uuid, uuid, text, jsonb, integer, boolean, jsonb) TO anon, authenticated;

-- Atualizar telemetria do run (tab switch, paste, etc.)
CREATE OR REPLACE FUNCTION public.rpc_assessment_run_telemetry(
  p_run_id uuid,
  p_tab_switch_inc integer DEFAULT 0,
  p_paste_inc integer DEFAULT 0,
  p_copy_inc integer DEFAULT 0,
  p_visibility_loss_inc integer DEFAULT 0,
  p_signals jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.assessment_runs SET
    tab_switch_count = tab_switch_count + GREATEST(p_tab_switch_inc, 0),
    paste_attempt_count = paste_attempt_count + GREATEST(p_paste_inc, 0),
    copy_attempt_count = copy_attempt_count + GREATEST(p_copy_inc, 0),
    visibility_loss_seconds = visibility_loss_seconds + GREATEST(p_visibility_loss_inc, 0),
    fraud_signals = COALESCE(fraud_signals, '{}'::jsonb) || COALESCE(p_signals, '{}'::jsonb)
  WHERE id = p_run_id AND status = 'in_progress' AND deleted_at IS NULL;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_assessment_run_telemetry(uuid, integer, integer, integer, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_assessment_run_telemetry(uuid, integer, integer, integer, integer, jsonb) TO anon, authenticated;

-- Submeter run
CREATE OR REPLACE FUNCTION public.rpc_assessment_run_submit(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.assessment_runs%ROWTYPE;
  v_total_seconds integer;
BEGIN
  SELECT * INTO v_run FROM public.assessment_runs WHERE id = p_run_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'run_not_found'); END IF;
  IF v_run.status <> 'in_progress' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'run_' || v_run.status);
  END IF;

  v_total_seconds := EXTRACT(EPOCH FROM (now() - v_run.started_at))::integer;

  UPDATE public.assessment_runs
  SET status = 'submitted', submitted_at = now()
  WHERE id = p_run_id;

  UPDATE public.assessment_invites
  SET status = 'submitted', submitted_at = now(), total_time_seconds = v_total_seconds
  WHERE id = v_run.invite_id;

  RETURN jsonb_build_object('ok', true, 'total_seconds', v_total_seconds);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_assessment_run_submit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_assessment_run_submit(uuid) TO anon, authenticated;