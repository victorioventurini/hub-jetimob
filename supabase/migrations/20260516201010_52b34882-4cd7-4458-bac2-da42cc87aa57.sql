CREATE OR REPLACE FUNCTION public.rpc_assessment_run_start(p_token text, p_cpf text, p_name text DEFAULT NULL::text, p_client_meta jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    JOIN public.assessment_form_questions q
      ON q.version_id = COALESCE(
           (SELECT v.id FROM public.assessment_form_versions v
             WHERE v.form_id = l.form_id
               AND v.status = 'published'
               AND v.deleted_at IS NULL
             ORDER BY v.version_number DESC
             LIMIT 1),
           l.version_id
         )
     AND q.deleted_at IS NULL
    WHERE l.assessment_id = v_invite.assessment_id
      AND l.deleted_at IS NULL;
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
$function$;