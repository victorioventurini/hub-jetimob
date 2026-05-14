-- Separate normal form editing from form soft-delete and provide a guarded backend operation.
DROP POLICY IF EXISTS forms_update ON public.assessment_forms;
DROP POLICY IF EXISTS forms_update_metadata ON public.assessment_forms;
DROP POLICY IF EXISTS forms_soft_delete ON public.assessment_forms;

CREATE POLICY forms_update_metadata
ON public.assessment_forms
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu')
    OR public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.publish:bu')
  )
)
WITH CHECK (
  deleted_at IS NULL
  AND (
    public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu')
    OR public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.publish:bu')
  )
);

CREATE POLICY forms_soft_delete
ON public.assessment_forms
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.delete:bu')
)
WITH CHECK (
  public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.delete:bu')
);

CREATE OR REPLACE FUNCTION public.soft_delete_assessment_form(p_form_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form record;
  v_active_links integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;

  SELECT id, bu_id, deleted_at
    INTO v_form
  FROM public.assessment_forms
  WHERE id = p_form_id
  FOR UPDATE;

  IF NOT FOUND OR v_form.deleted_at IS NOT NULL THEN
    RETURN;
  END IF;

  IF NOT public.has_assessment_permission(auth.uid(), v_form.bu_id, 'assessments.form.delete:bu') THEN
    RAISE EXCEPTION 'Sem permissão para excluir formulários nesta BU.' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*)
    INTO v_active_links
  FROM public.assessment_form_links
  WHERE form_id = p_form_id
    AND bu_id = v_form.bu_id
    AND deleted_at IS NULL;

  IF v_active_links > 0 THEN
    RAISE EXCEPTION 'Formulário em uso por % prova(s). Desvincule antes de excluir.', v_active_links;
  END IF;

  UPDATE public.assessment_forms
  SET deleted_at = now()
  WHERE id = p_form_id
    AND bu_id = v_form.bu_id
    AND deleted_at IS NULL;

  UPDATE public.assessment_form_versions
  SET deleted_at = now()
  WHERE form_id = p_form_id
    AND bu_id = v_form.bu_id
    AND deleted_at IS NULL;

  UPDATE public.assessment_form_questions
  SET deleted_at = now()
  WHERE bu_id = v_form.bu_id
    AND deleted_at IS NULL
    AND version_id IN (
      SELECT id
      FROM public.assessment_form_versions
      WHERE form_id = p_form_id
        AND bu_id = v_form.bu_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_assessment_form(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_assessment_form(uuid) TO authenticated;