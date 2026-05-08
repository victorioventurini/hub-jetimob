-- All Hands evaluation variant: 2 dimensions only (value + time)
-- score_quality and score_decisions become NULL-able per persona.

ALTER TABLE public.ritual_evaluation_responses
  ALTER COLUMN score_quality DROP NOT NULL,
  ALTER COLUMN score_decisions DROP NOT NULL;

-- Validation trigger: per-persona dimension enforcement
CREATE OR REPLACE FUNCTION public.fn_validate_ritual_evaluation_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_open_at     TIMESTAMPTZ;
  v_closed_at   TIMESTAMPTZ;
  v_completed   TIMESTAMPTZ;
  v_bu_id       UUID;
  v_wizard_type TEXT;
  v_lean        BOOLEAN;
BEGIN
  -- Carrega contexto da sessão
  SELECT evaluation_open_at, evaluation_closed_at, completed_at, bu_id, wizard_type::text
    INTO v_open_at, v_closed_at, v_completed, v_bu_id, v_wizard_type
    FROM public.okr_wizard_sessions
   WHERE id = NEW.session_id;

  IF v_open_at IS NULL THEN
    RAISE EXCEPTION 'Avaliação ainda não foi aberta para esta sessão' USING ERRCODE = '22023';
  END IF;
  IF v_closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Coleta de avaliações já foi encerrada' USING ERRCODE = '22023';
  END IF;
  IF v_completed IS NOT NULL THEN
    RAISE EXCEPTION 'Sessão já foi finalizada — avaliação imutável' USING ERRCODE = '22023';
  END IF;

  v_lean := v_wizard_type = 'all-hands';

  -- Dimensões SEMPRE obrigatórias (todas as personas)
  IF NEW.score_value NOT BETWEEN 1 AND 5
     OR NEW.score_time NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Notas devem estar entre 1 e 5' USING ERRCODE = '22023';
  END IF;

  -- Dimensões condicionais (qualidade / decisões)
  IF v_lean THEN
    IF NEW.score_quality IS NOT NULL OR NEW.score_decisions IS NOT NULL THEN
      RAISE EXCEPTION 'Avaliação enxuta (All Hands) não aceita notas de qualidade/decisões' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF NEW.score_quality IS NULL OR NEW.score_decisions IS NULL
       OR NEW.score_quality   NOT BETWEEN 1 AND 5
       OR NEW.score_decisions NOT BETWEEN 1 AND 5 THEN
      RAISE EXCEPTION 'Notas devem estar entre 1 e 5' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Pergunta obrigatória
  IF length(coalesce(trim(NEW.change_one_thing), '')) < 3 THEN
    RAISE EXCEPTION 'Resposta "se você pudesse mudar uma coisa" é obrigatória (mín. 3 caracteres)' USING ERRCODE = '22023';
  END IF;
  IF length(NEW.change_one_thing) > 1000 THEN
    RAISE EXCEPTION 'Resposta "se você pudesse mudar uma coisa" excede 1000 caracteres' USING ERRCODE = '22023';
  END IF;

  -- Pergunta opcional
  IF NEW.what_worked IS NOT NULL AND length(NEW.what_worked) > 1000 THEN
    RAISE EXCEPTION 'Resposta "o que funcionou" excede 1000 caracteres' USING ERRCODE = '22023';
  END IF;

  -- Garante consistência de bu_id
  NEW.bu_id := v_bu_id;

  RETURN NEW;
END;
$function$;

-- Public form RPC: include 'all-hands' label, show_what_worked flag, and dimensions array
DROP FUNCTION IF EXISTS public.get_public_ritual_evaluation_form(text);
CREATE OR REPLACE FUNCTION public.get_public_ritual_evaluation_form(p_short_code text)
RETURNS TABLE(
  session_id uuid,
  ritual_label text,
  wizard_type text,
  show_what_worked boolean,
  is_open boolean,
  dimensions text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    CASE s.wizard_type::text
      WHEN 'mbr'         THEN 'MBR'
      WHEN 'mbr-first'   THEN 'MBR'
      WHEN 'qbr-meeting' THEN 'QBR'
      WHEN 'qbr-post'    THEN 'Pós-QBR'
      WHEN 'all-hands'   THEN 'All Hands'
      ELSE s.wizard_type::text
    END,
    s.wizard_type::text,
    (s.wizard_type::text IN ('mbr','mbr-first','qbr-meeting','qbr-post','all-hands')),
    (s.evaluation_open_at IS NOT NULL
       AND s.evaluation_closed_at IS NULL
       AND s.completed_at IS NULL
       AND s.evaluation_open_at > now() - interval '24 hours'),
    CASE s.wizard_type::text
      WHEN 'all-hands' THEN ARRAY['value','time']::text[]
      ELSE ARRAY['value','quality','decisions','time']::text[]
    END
  FROM public.okr_wizard_sessions s
  WHERE UPPER(s.evaluation_short_code) = UPPER(p_short_code)
  LIMIT 1;
END;
$function$;

-- Submit RPC: quality/decisions become optional (NULL-able)
DROP FUNCTION IF EXISTS public.submit_ritual_evaluation(text, integer, integer, integer, integer, text, text, text);
CREATE OR REPLACE FUNCTION public.submit_ritual_evaluation(
  p_short_code text,
  p_score_value integer,
  p_score_quality integer,
  p_score_decisions integer,
  p_score_time integer,
  p_change_one_thing text,
  p_what_worked text,
  p_client_fingerprint text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id UUID;
  v_bu_id      UUID;
  v_recent     INT;
BEGIN
  SELECT id, bu_id INTO v_session_id, v_bu_id
    FROM public.okr_wizard_sessions
   WHERE UPPER(evaluation_short_code) = UPPER(p_short_code)
   LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Código inválido' USING ERRCODE = '22023';
  END IF;

  IF p_client_fingerprint IS NOT NULL THEN
    SELECT COUNT(*) INTO v_recent
      FROM public.ritual_evaluation_submit_log
     WHERE ip_hash = p_client_fingerprint
       AND submitted_at > now() - interval '1 minute';
    IF v_recent >= 10 THEN
      RAISE EXCEPTION 'Muitas tentativas. Aguarde um minuto.' USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.ritual_evaluation_responses (
    session_id, bu_id,
    score_value, score_quality, score_decisions, score_time,
    change_one_thing, what_worked
  ) VALUES (
    v_session_id, v_bu_id,
    p_score_value, p_score_quality, p_score_decisions, p_score_time,
    trim(p_change_one_thing), NULLIF(trim(p_what_worked), '')
  );

  INSERT INTO public.ritual_evaluation_submit_log (short_code, ip_hash)
    VALUES (UPPER(p_short_code), p_client_fingerprint);

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- Summary RPC: AVG with FILTER to ignore NULLs
CREATE OR REPLACE FUNCTION public.get_ritual_evaluation_summary(p_session_id uuid)
RETURNS TABLE(
  session_id uuid, bu_id uuid, wizard_type text, team_id uuid, cycle_id uuid,
  evaluation_short_code text,
  evaluation_open_at timestamp with time zone,
  evaluation_closed_at timestamp with time zone,
  completed_at timestamp with time zone,
  response_count bigint,
  avg_value numeric, avg_quality numeric, avg_decisions numeric, avg_time numeric,
  expected_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    ROUND(AVG(r.score_value)     FILTER (WHERE r.score_value     IS NOT NULL), 2) AS avg_value,
    ROUND(AVG(r.score_quality)   FILTER (WHERE r.score_quality   IS NOT NULL), 2) AS avg_quality,
    ROUND(AVG(r.score_decisions) FILTER (WHERE r.score_decisions IS NOT NULL), 2) AS avg_decisions,
    ROUND(AVG(r.score_time)      FILTER (WHERE r.score_time      IS NOT NULL), 2) AS avg_time,
    (SELECT COUNT(*)::bigint FROM public.ritual_session_attendance a
      WHERE a.session_id = s.id AND a.is_present AND a.deleted_at IS NULL) AS expected_count
  FROM public.okr_wizard_sessions s
  LEFT JOIN public.ritual_evaluation_responses r
    ON r.session_id = s.id AND r.deleted_at IS NULL
  WHERE s.id = p_session_id
  GROUP BY s.id;
END;
$function$;

-- View parity
CREATE OR REPLACE VIEW public.v_ritual_evaluation_summary
WITH (security_invoker = true) AS
SELECT
  s.id AS session_id,
  s.bu_id,
  s.wizard_type,
  s.team_id,
  s.cycle_id,
  s.evaluation_short_code,
  s.evaluation_open_at,
  s.evaluation_closed_at,
  s.completed_at,
  count(r.id) AS response_count,
  round(avg(r.score_value)     FILTER (WHERE r.score_value     IS NOT NULL), 2) AS avg_value,
  round(avg(r.score_quality)   FILTER (WHERE r.score_quality   IS NOT NULL), 2) AS avg_quality,
  round(avg(r.score_decisions) FILTER (WHERE r.score_decisions IS NOT NULL), 2) AS avg_decisions,
  round(avg(r.score_time)      FILTER (WHERE r.score_time      IS NOT NULL), 2) AS avg_time,
  (SELECT count(*) FROM ritual_session_attendance a
    WHERE a.session_id = s.id AND a.is_present AND a.deleted_at IS NULL) AS expected_count
FROM okr_wizard_sessions s
LEFT JOIN ritual_evaluation_responses r
  ON r.session_id = s.id AND r.deleted_at IS NULL
GROUP BY s.id;