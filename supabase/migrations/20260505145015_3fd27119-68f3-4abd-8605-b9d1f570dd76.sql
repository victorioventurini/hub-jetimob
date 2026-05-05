CREATE OR REPLACE FUNCTION public.get_ritual_evaluation_summary(p_session_id uuid)
RETURNS TABLE(
  session_id uuid,
  bu_id uuid,
  wizard_type text,
  team_id uuid,
  cycle_id uuid,
  evaluation_short_code text,
  evaluation_open_at timestamptz,
  evaluation_closed_at timestamptz,
  completed_at timestamptz,
  response_count bigint,
  avg_value numeric,
  avg_quality numeric,
  avg_decisions numeric,
  avg_time numeric,
  expected_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bu_id uuid;
  v_profile_id uuid := my_profile_id();
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT s.bu_id INTO v_bu_id
    FROM public.okr_wizard_sessions s
   WHERE s.id = p_session_id;

  IF v_bu_id IS NULL THEN RETURN; END IF;

  -- Mesma permissão usada para abrir/encerrar/ver respostas abertas.
  IF NOT has_permission(v_profile_id, v_bu_id, 'okrs.evaluation.view:as_conductor') THEN
    RAISE EXCEPTION 'Sem permissão para ver resumo da avaliação' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.bu_id,
    s.wizard_type::text,
    s.team_id,
    s.cycle_id,
    s.evaluation_short_code,
    s.evaluation_open_at,
    s.evaluation_closed_at,
    s.completed_at,
    COUNT(r.id)::bigint AS response_count,
    ROUND(AVG(r.score_value), 2) AS avg_value,
    ROUND(AVG(r.score_quality), 2) AS avg_quality,
    ROUND(AVG(r.score_decisions), 2) AS avg_decisions,
    ROUND(AVG(r.score_time), 2) AS avg_time,
    (SELECT COUNT(*)::bigint FROM public.ritual_session_attendance a
      WHERE a.session_id = s.id AND a.is_present AND a.deleted_at IS NULL) AS expected_count
  FROM public.okr_wizard_sessions s
  LEFT JOIN public.ritual_evaluation_responses r
    ON r.session_id = s.id AND r.deleted_at IS NULL
  WHERE s.id = p_session_id
  GROUP BY s.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ritual_evaluation_summary(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_ritual_evaluation_summary(uuid) IS
'Resumo agregado de avaliação anônima de rito. SECURITY DEFINER pois a base ritual_evaluation_responses tem SELECT USING(false) (anonimato). Valida BU + permission key okrs.evaluation.view:as_conductor.';