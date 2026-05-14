CREATE OR REPLACE FUNCTION public.soft_delete_assessment_form_question(
  p_question_id uuid,
  p_version_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question record;
  v_current_bu_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;

  v_current_bu_id := public.current_bu_id();

  IF v_current_bu_id IS NULL THEN
    RAISE EXCEPTION 'BU ativa não informada.' USING ERRCODE = '42501';
  END IF;

  SELECT
    q.id,
    q.bu_id,
    q.version_id,
    q.deleted_at,
    v.frozen
  INTO v_question
  FROM public.assessment_form_questions q
  JOIN public.assessment_form_versions v
    ON v.id = q.version_id
   AND v.bu_id = q.bu_id
  WHERE q.id = p_question_id
    AND q.version_id = p_version_id
    AND q.bu_id = v_current_bu_id
  FOR UPDATE OF q;

  IF NOT FOUND OR v_question.deleted_at IS NOT NULL THEN
    RETURN;
  END IF;

  IF v_question.frozen THEN
    RAISE EXCEPTION 'Não é possível excluir perguntas de uma versão publicada.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_assessment_permission(auth.uid(), v_question.bu_id, 'assessments.form.update:bu') THEN
    RAISE EXCEPTION 'Sem permissão para editar perguntas nesta BU.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.assessment_form_questions
  SET deleted_at = now()
  WHERE id = p_question_id
    AND version_id = p_version_id
    AND bu_id = v_question.bu_id
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_assessment_form_question(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_assessment_form_question(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_assessment_form_question(uuid, uuid) TO authenticated;