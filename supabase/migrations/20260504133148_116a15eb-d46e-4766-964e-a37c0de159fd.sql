
-- ============================================================
-- 1. Colunas de avaliação em okr_wizard_sessions
-- ============================================================

ALTER TABLE public.okr_wizard_sessions
  ADD COLUMN IF NOT EXISTS evaluation_short_code TEXT,
  ADD COLUMN IF NOT EXISTS evaluation_open_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS evaluation_closed_at  TIMESTAMPTZ;

-- short-code é case-insensitive e único quando presente
CREATE UNIQUE INDEX IF NOT EXISTS uq_wizard_sessions_eval_short_code
  ON public.okr_wizard_sessions (UPPER(evaluation_short_code))
  WHERE evaluation_short_code IS NOT NULL;

-- ============================================================
-- 2. Função geradora de short-code
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_ritual_short_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- sem 0 O 1 I L
  v_code     TEXT;
  v_len      INT  := length(v_alphabet);
  v_attempt  INT  := 0;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;
    v_code :=
      substr(v_alphabet, 1 + floor(random() * v_len)::int, 1) ||
      substr(v_alphabet, 1 + floor(random() * v_len)::int, 1) ||
      substr(v_alphabet, 1 + floor(random() * v_len)::int, 1) ||
      substr(v_alphabet, 1 + floor(random() * v_len)::int, 1);

    IF NOT EXISTS (
      SELECT 1 FROM public.okr_wizard_sessions
      WHERE UPPER(evaluation_short_code) = v_code
    ) THEN
      RETURN v_code;
    END IF;

    IF v_attempt > 50 THEN
      -- fallback 5 chars
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * v_len)::int, 1);
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 3. Tabela de respostas anônimas
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ritual_evaluation_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES public.okr_wizard_sessions(id) ON DELETE CASCADE,
  bu_id         UUID NOT NULL REFERENCES public.bu_units(id),

  -- 4 dimensões (1-5) — validadas por trigger
  score_value     SMALLINT NOT NULL,
  score_quality   SMALLINT NOT NULL,
  score_decisions SMALLINT NOT NULL,
  score_time      SMALLINT NOT NULL,

  -- Perguntas abertas
  change_one_thing TEXT NOT NULL,
  what_worked      TEXT,

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ritual_eval_responses_session
  ON public.ritual_evaluation_responses (session_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ritual_eval_responses_bu_submitted
  ON public.ritual_evaluation_responses (bu_id, submitted_at DESC) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. Trigger de validação (sem CHECK constraints)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_validate_ritual_evaluation_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open_at   TIMESTAMPTZ;
  v_closed_at TIMESTAMPTZ;
  v_completed TIMESTAMPTZ;
  v_bu_id     UUID;
BEGIN
  -- Scores 1..5
  IF NEW.score_value     NOT BETWEEN 1 AND 5
    OR NEW.score_quality   NOT BETWEEN 1 AND 5
    OR NEW.score_decisions NOT BETWEEN 1 AND 5
    OR NEW.score_time      NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Notas devem estar entre 1 e 5' USING ERRCODE = '22023';
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

  -- Janela de coleta
  SELECT evaluation_open_at, evaluation_closed_at, completed_at, bu_id
    INTO v_open_at, v_closed_at, v_completed, v_bu_id
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

  -- Garante consistência de bu_id
  NEW.bu_id := v_bu_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ritual_evaluation_response ON public.ritual_evaluation_responses;
CREATE TRIGGER trg_validate_ritual_evaluation_response
  BEFORE INSERT ON public.ritual_evaluation_responses
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_ritual_evaluation_response();

-- ============================================================
-- 5. RLS — bloqueia acesso direto; tudo via view/RPC
-- ============================================================

ALTER TABLE public.ritual_evaluation_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ritual_eval_responses_no_select ON public.ritual_evaluation_responses;
CREATE POLICY ritual_eval_responses_no_select
  ON public.ritual_evaluation_responses
  FOR SELECT TO authenticated, anon
  USING (false);

DROP POLICY IF EXISTS ritual_eval_responses_no_insert ON public.ritual_evaluation_responses;
CREATE POLICY ritual_eval_responses_no_insert
  ON public.ritual_evaluation_responses
  FOR INSERT TO authenticated, anon
  WITH CHECK (false);

DROP POLICY IF EXISTS ritual_eval_responses_no_update ON public.ritual_evaluation_responses;
CREATE POLICY ritual_eval_responses_no_update
  ON public.ritual_evaluation_responses
  FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS ritual_eval_responses_no_delete ON public.ritual_evaluation_responses;
CREATE POLICY ritual_eval_responses_no_delete
  ON public.ritual_evaluation_responses
  FOR DELETE TO authenticated, anon
  USING (false);

-- ============================================================
-- 6. Rate-limit anônimo (anti-bot)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ritual_evaluation_submit_log (
  id           BIGSERIAL PRIMARY KEY,
  short_code   TEXT NOT NULL,
  ip_hash      TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eval_submit_log_recent
  ON public.ritual_evaluation_submit_log (ip_hash, submitted_at DESC);

ALTER TABLE public.ritual_evaluation_submit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ritual_eval_log_no_access ON public.ritual_evaluation_submit_log;
CREATE POLICY ritual_eval_log_no_access
  ON public.ritual_evaluation_submit_log
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ============================================================
-- 7. View agregada (única forma de leitura quantitativa)
-- ============================================================

DROP VIEW IF EXISTS public.v_ritual_evaluation_summary;
CREATE VIEW public.v_ritual_evaluation_summary
WITH (security_invoker = true) AS
SELECT
  s.id                                                  AS session_id,
  s.bu_id,
  s.wizard_type,
  s.team_id,
  s.cycle_id,
  s.evaluation_open_at,
  s.evaluation_closed_at,
  s.completed_at,
  COUNT(r.id)                                           AS response_count,
  ROUND(AVG(r.score_value)::numeric,     2)             AS avg_value,
  ROUND(AVG(r.score_quality)::numeric,   2)             AS avg_quality,
  ROUND(AVG(r.score_decisions)::numeric, 2)             AS avg_decisions,
  ROUND(AVG(r.score_time)::numeric,      2)             AS avg_time,
  (SELECT COUNT(*) FROM public.ritual_session_attendance a
     WHERE a.session_id = s.id AND a.is_present AND a.deleted_at IS NULL) AS expected_count
FROM public.okr_wizard_sessions s
LEFT JOIN public.ritual_evaluation_responses r
  ON r.session_id = s.id AND r.deleted_at IS NULL
GROUP BY s.id;

-- ============================================================
-- 8. RPCs públicas (anônimas)
-- ============================================================

-- 8.1 Form public — retorna metadados do formulário
CREATE OR REPLACE FUNCTION public.get_public_ritual_evaluation_form(p_short_code TEXT)
RETURNS TABLE (
  session_id        UUID,
  ritual_label      TEXT,
  wizard_type       TEXT,
  show_what_worked  BOOLEAN,
  is_open           BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    CASE s.wizard_type
      WHEN 'mbr'         THEN 'MBR'
      WHEN 'mbr-first'   THEN 'MBR'
      WHEN 'qbr-meeting' THEN 'QBR'
      WHEN 'qbr-post'    THEN 'Pós-QBR'
      ELSE s.wizard_type
    END,
    s.wizard_type,
    s.wizard_type IN ('mbr','mbr-first','qbr-meeting','qbr-post'),
    (s.evaluation_open_at IS NOT NULL
       AND s.evaluation_closed_at IS NULL
       AND s.completed_at IS NULL
       AND s.evaluation_open_at > now() - interval '24 hours')
  FROM public.okr_wizard_sessions s
  WHERE UPPER(s.evaluation_short_code) = UPPER(p_short_code)
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_ritual_evaluation_form(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_ritual_evaluation_form(TEXT) TO anon, authenticated;

-- 8.2 Submit public — insere resposta com rate-limit
CREATE OR REPLACE FUNCTION public.submit_ritual_evaluation(
  p_short_code       TEXT,
  p_score_value      INT,
  p_score_quality    INT,
  p_score_decisions  INT,
  p_score_time       INT,
  p_change_one_thing TEXT,
  p_what_worked      TEXT,
  p_client_fingerprint TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_bu_id      UUID;
  v_recent     INT;
BEGIN
  -- Resolve sessão pelo short-code
  SELECT id, bu_id INTO v_session_id, v_bu_id
    FROM public.okr_wizard_sessions
   WHERE UPPER(evaluation_short_code) = UPPER(p_short_code)
   LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Código inválido' USING ERRCODE = '22023';
  END IF;

  -- Rate-limit: 10 submits/min por fingerprint
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
$$;

REVOKE ALL ON FUNCTION public.submit_ritual_evaluation(TEXT,INT,INT,INT,INT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_ritual_evaluation(TEXT,INT,INT,INT,INT,TEXT,TEXT,TEXT) TO anon, authenticated;

-- 8.3 Open evaluation — auth + permission
CREATE OR REPLACE FUNCTION public.open_ritual_evaluation(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bu_id      UUID;
  v_existing   TEXT;
  v_completed  TIMESTAMPTZ;
  v_code       TEXT;
  v_profile_id UUID := my_profile_id();
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT bu_id, evaluation_short_code, completed_at
    INTO v_bu_id, v_existing, v_completed
    FROM public.okr_wizard_sessions WHERE id = p_session_id;

  IF v_bu_id IS NULL THEN
    RAISE EXCEPTION 'Sessão não encontrada' USING ERRCODE = '22023';
  END IF;

  IF NOT has_permission(v_profile_id, v_bu_id, 'okrs.evaluation.open:as_conductor') THEN
    RAISE EXCEPTION 'Sem permissão para abrir avaliação' USING ERRCODE = '42501';
  END IF;

  IF v_completed IS NOT NULL THEN
    RAISE EXCEPTION 'Sessão já finalizada' USING ERRCODE = '22023';
  END IF;

  IF v_existing IS NULL THEN
    v_code := generate_ritual_short_code();
    UPDATE public.okr_wizard_sessions
       SET evaluation_short_code = v_code,
           evaluation_open_at    = now(),
           evaluation_closed_at  = NULL
     WHERE id = p_session_id;
  ELSE
    v_code := v_existing;
    UPDATE public.okr_wizard_sessions
       SET evaluation_open_at    = COALESCE(evaluation_open_at, now()),
           evaluation_closed_at  = NULL
     WHERE id = p_session_id;
  END IF;

  RETURN jsonb_build_object('short_code', v_code);
END;
$$;

REVOKE ALL ON FUNCTION public.open_ritual_evaluation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_ritual_evaluation(UUID) TO authenticated;

-- 8.4 Close evaluation — auth + permission
CREATE OR REPLACE FUNCTION public.close_ritual_evaluation(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bu_id      UUID;
  v_profile_id UUID := my_profile_id();
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT bu_id INTO v_bu_id FROM public.okr_wizard_sessions WHERE id = p_session_id;
  IF v_bu_id IS NULL THEN
    RAISE EXCEPTION 'Sessão não encontrada' USING ERRCODE = '22023';
  END IF;

  IF NOT has_permission(v_profile_id, v_bu_id, 'okrs.evaluation.close:as_conductor') THEN
    RAISE EXCEPTION 'Sem permissão para encerrar avaliação' USING ERRCODE = '42501';
  END IF;

  UPDATE public.okr_wizard_sessions
     SET evaluation_closed_at = COALESCE(evaluation_closed_at, now())
   WHERE id = p_session_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.close_ritual_evaluation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_ritual_evaluation(UUID) TO authenticated;

-- 8.5 Live count — auth (qualquer usuário com acesso à sessão)
CREATE OR REPLACE FUNCTION public.get_ritual_evaluation_live_count(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bu_id          UUID;
  v_profile_id     UUID := my_profile_id();
  v_response_count INT;
  v_expected_count INT;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT bu_id INTO v_bu_id FROM public.okr_wizard_sessions WHERE id = p_session_id;
  IF v_bu_id IS NULL THEN RETURN jsonb_build_object('response_count', 0, 'expected_count', 0); END IF;

  -- Mesmo escopo que SELECT na sessão (BU match)
  IF NOT (
    is_super_admin(auth.uid())
    OR is_bu_admin(v_profile_id, v_bu_id)
    OR EXISTS (SELECT 1 FROM bu_members bm WHERE bm.user_id = v_profile_id AND bm.bu_id = v_bu_id)
  ) THEN
    RAISE EXCEPTION 'Sem acesso à sessão' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_response_count
    FROM public.ritual_evaluation_responses
   WHERE session_id = p_session_id AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_expected_count
    FROM public.ritual_session_attendance
   WHERE session_id = p_session_id AND is_present AND deleted_at IS NULL;

  RETURN jsonb_build_object(
    'response_count', v_response_count,
    'expected_count', v_expected_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_ritual_evaluation_live_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ritual_evaluation_live_count(UUID) TO authenticated;

-- 8.6 Open answers — só após fechamento + permission
CREATE OR REPLACE FUNCTION public.get_ritual_evaluation_open_answers(p_session_id UUID)
RETURNS TABLE (
  change_one_thing TEXT,
  what_worked      TEXT,
  submitted_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bu_id      UUID;
  v_closed_at  TIMESTAMPTZ;
  v_profile_id UUID := my_profile_id();
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT bu_id, evaluation_closed_at
    INTO v_bu_id, v_closed_at
    FROM public.okr_wizard_sessions
   WHERE id = p_session_id;

  IF v_bu_id IS NULL THEN RETURN; END IF;

  IF NOT has_permission(v_profile_id, v_bu_id, 'okrs.evaluation.view:as_conductor') THEN
    RAISE EXCEPTION 'Sem permissão para ver respostas abertas' USING ERRCODE = '42501';
  END IF;

  IF v_closed_at IS NULL THEN
    RAISE EXCEPTION 'Coleta ainda não foi encerrada' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    r.change_one_thing,
    r.what_worked,
    -- truncamos timestamp para hora para evitar fingerprinting de ordem
    date_trunc('hour', r.submitted_at) AS submitted_at
  FROM public.ritual_evaluation_responses r
  WHERE r.session_id = p_session_id
    AND r.deleted_at IS NULL
  ORDER BY r.id;  -- ordem por id (não por tempo) preserva anonimato adicional
END;
$$;

REVOKE ALL ON FUNCTION public.get_ritual_evaluation_open_answers(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ritual_evaluation_open_answers(UUID) TO authenticated;

-- ============================================================
-- 9. Permission catalog — novas keys
-- ============================================================

INSERT INTO public.permission_catalog (key, module, resource, action, scope, description, status)
VALUES
  ('okrs.evaluation.open:as_conductor',  'okrs', 'evaluation', 'open',  'bu', 'Abrir coleta de avaliação anônima de rito (condutor)',           'active'),
  ('okrs.evaluation.close:as_conductor', 'okrs', 'evaluation', 'close', 'bu', 'Encerrar coleta de avaliação anônima de rito (condutor)',         'active'),
  ('okrs.evaluation.view:as_conductor',  'okrs', 'evaluation', 'view',  'bu', 'Ver resumo agregado e respostas abertas pós-fechamento (condutor)', 'active')
ON CONFLICT (key) DO NOTHING;
