-- 1. Novo tipo escala
ALTER TYPE public.assessment_question_type ADD VALUE IF NOT EXISTS 'scale';

-- 2. Colunas de scoring nas questões
ALTER TABLE public.assessment_form_questions
  ADD COLUMN IF NOT EXISTS scoring jsonb NOT NULL DEFAULT '{"mode":"none"}'::jsonb,
  ADD COLUMN IF NOT EXISTS points  numeric NOT NULL DEFAULT 1;

-- 3. Colunas de score nos runs
ALTER TABLE public.assessment_runs
  ADD COLUMN IF NOT EXISTS auto_score      numeric,
  ADD COLUMN IF NOT EXISTS objective_score numeric,
  ADD COLUMN IF NOT EXISTS graded_at       timestamptz;

-- 4. Validation trigger (sem CHECK constraint, conforme regra Core)
CREATE OR REPLACE FUNCTION public.assessment_question_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_min numeric;
  v_max numeric;
  v_step numeric;
  v_mode text;
  v_option_ids uuid[];
  v_correct_ids uuid[];
BEGIN
  -- options por tipo
  IF NEW.question_type IN ('single_choice','multiple_choice') THEN
    IF NEW.options IS NULL OR jsonb_typeof(NEW.options) <> 'array' THEN
      RAISE EXCEPTION 'options_required_array';
    END IF;
    SELECT count(*) INTO v_count FROM jsonb_array_elements(NEW.options);
    IF v_count < 2 THEN
      RAISE EXCEPTION 'options_min_two';
    END IF;
  ELSIF NEW.question_type = 'scale' THEN
    IF NEW.options IS NULL OR jsonb_typeof(NEW.options) <> 'object' THEN
      RAISE EXCEPTION 'scale_options_required_object';
    END IF;
    v_min  := (NEW.options->>'min')::numeric;
    v_max  := (NEW.options->>'max')::numeric;
    v_step := COALESCE((NEW.options->>'step')::numeric, 1);
    IF v_min IS NULL OR v_max IS NULL OR v_min >= v_max THEN
      RAISE EXCEPTION 'scale_invalid_range';
    END IF;
    IF v_step <= 0 THEN
      RAISE EXCEPTION 'scale_invalid_step';
    END IF;
  END IF;

  -- scoring consistente com tipo
  v_mode := COALESCE(NEW.scoring->>'mode','none');
  IF v_mode NOT IN ('none','exact','partial','scale_target') THEN
    RAISE EXCEPTION 'scoring_mode_invalid';
  END IF;

  IF v_mode IN ('exact','partial') THEN
    IF NEW.question_type NOT IN ('single_choice','multiple_choice') THEN
      RAISE EXCEPTION 'scoring_mode_requires_choice';
    END IF;
    IF NEW.scoring->'correct_option_ids' IS NULL
       OR jsonb_typeof(NEW.scoring->'correct_option_ids') <> 'array' THEN
      RAISE EXCEPTION 'scoring_missing_correct_options';
    END IF;
    -- garante subset
    SELECT array_agg((e->>'id')::uuid)
      INTO v_option_ids
      FROM jsonb_array_elements(NEW.options) e;
    SELECT array_agg(value::uuid)
      INTO v_correct_ids
      FROM jsonb_array_elements_text(NEW.scoring->'correct_option_ids');
    IF NOT (v_correct_ids <@ v_option_ids) THEN
      RAISE EXCEPTION 'scoring_correct_not_in_options';
    END IF;
  ELSIF v_mode = 'scale_target' THEN
    IF NEW.question_type <> 'scale' THEN
      RAISE EXCEPTION 'scoring_scale_target_requires_scale';
    END IF;
    IF NEW.scoring->>'target' IS NULL THEN
      RAISE EXCEPTION 'scoring_scale_target_missing';
    END IF;
  END IF;

  IF NEW.points IS NULL OR NEW.points < 0 THEN
    RAISE EXCEPTION 'points_invalid';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assessment_question_validate ON public.assessment_form_questions;
CREATE TRIGGER trg_assessment_question_validate
BEFORE INSERT OR UPDATE ON public.assessment_form_questions
FOR EACH ROW EXECUTE FUNCTION public.assessment_question_validate();

-- 5. Função de scoring de um run
CREATE OR REPLACE FUNCTION public.rpc_assessment_run_grade(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_total_points  numeric := 0;
  v_earned_points numeric := 0;
  v_obj_total     numeric := 0;
  v_obj_earned    numeric := 0;
  v_correct_ids   uuid[];
  v_answer_ids    uuid[];
  v_intersection  int;
  v_target        numeric;
  v_tolerance     numeric;
  v_answer_value  numeric;
  v_earned        numeric;
BEGIN
  FOR r IN
    SELECT q.id, q.question_type, q.options, q.scoring, q.points,
           a.answer_text, a.answer_options
      FROM public.assessment_form_questions q
      JOIN public.assessment_runs run ON run.id = p_run_id
      JOIN public.assessment_form_links lnk ON lnk.version_id = q.version_id
      LEFT JOIN public.assessment_answers a ON a.run_id = p_run_id AND a.question_id = q.id
     WHERE lnk.assessment_id = run.assessment_id
       AND q.deleted_at IS NULL
  LOOP
    v_total_points := v_total_points + COALESCE(r.points,0);
    v_earned := 0;

    IF COALESCE(r.scoring->>'mode','none') = 'none' THEN
      -- texto / sem gabarito → não computa em objective_score
      CONTINUE;
    END IF;

    v_obj_total := v_obj_total + COALESCE(r.points,0);

    IF r.scoring->>'mode' IN ('exact','partial') THEN
      SELECT array_agg(value::uuid) INTO v_correct_ids
        FROM jsonb_array_elements_text(r.scoring->'correct_option_ids');
      IF r.answer_options IS NOT NULL AND jsonb_typeof(r.answer_options) = 'array' THEN
        SELECT array_agg(value::uuid) INTO v_answer_ids
          FROM jsonb_array_elements_text(r.answer_options);
      ELSE
        v_answer_ids := ARRAY[]::uuid[];
      END IF;

      IF r.scoring->>'mode' = 'exact' THEN
        IF v_answer_ids <@ v_correct_ids AND v_correct_ids <@ v_answer_ids THEN
          v_earned := r.points;
        END IF;
      ELSE
        -- partial: pontos proporcionais a (acertos - erros) / total
        SELECT count(*) INTO v_intersection
          FROM unnest(v_answer_ids) x WHERE x = ANY(v_correct_ids);
        v_earned := GREATEST(0,
          (v_intersection::numeric - (COALESCE(array_length(v_answer_ids,1),0) - v_intersection))
          / GREATEST(array_length(v_correct_ids,1),1)
        ) * r.points;
      END IF;
    ELSIF r.scoring->>'mode' = 'scale_target' THEN
      v_target    := (r.scoring->>'target')::numeric;
      v_tolerance := COALESCE((r.scoring->>'tolerance')::numeric, 0);
      IF r.answer_options IS NOT NULL AND r.answer_options ? 'value' THEN
        v_answer_value := (r.answer_options->>'value')::numeric;
        IF abs(v_answer_value - v_target) <= v_tolerance THEN
          v_earned := r.points;
        END IF;
      END IF;
    END IF;

    v_earned_points := v_earned_points + v_earned;
    v_obj_earned    := v_obj_earned + v_earned;
  END LOOP;

  UPDATE public.assessment_runs
     SET auto_score      = CASE WHEN v_total_points > 0 THEN round((v_earned_points / v_total_points)*100, 2) ELSE NULL END,
         objective_score = CASE WHEN v_obj_total    > 0 THEN round((v_obj_earned    / v_obj_total   )*100, 2) ELSE NULL END,
         graded_at       = now()
   WHERE id = p_run_id;

  RETURN jsonb_build_object(
    'ok', true,
    'auto_score', CASE WHEN v_total_points > 0 THEN round((v_earned_points / v_total_points)*100, 2) ELSE NULL END,
    'objective_score', CASE WHEN v_obj_total > 0 THEN round((v_obj_earned / v_obj_total)*100, 2) ELSE NULL END
  );
END;
$$;

-- 6. Integrar grading no submit
CREATE OR REPLACE FUNCTION public.rpc_assessment_run_submit(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Scoring automático (ignora erros para não bloquear submit)
  BEGIN
    PERFORM public.rpc_assessment_run_grade(p_run_id);
  EXCEPTION WHEN OTHERS THEN
    -- log silencioso; correção manual continua possível
    NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'total_seconds', v_total_seconds);
END;
$$;