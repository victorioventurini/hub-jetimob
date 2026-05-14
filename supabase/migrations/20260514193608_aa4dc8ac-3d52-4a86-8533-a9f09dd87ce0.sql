DROP POLICY IF EXISTS assessments_update ON public.assessments;
DROP POLICY IF EXISTS assessments_update_metadata ON public.assessments;
DROP POLICY IF EXISTS assessments_soft_delete ON public.assessments;

CREATE POLICY assessments_update_metadata
ON public.assessments
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND public.has_assessment_permission(auth.uid(), bu_id, 'assessments.assessment.update:bu')
)
WITH CHECK (
  deleted_at IS NULL
  AND public.has_assessment_permission(auth.uid(), bu_id, 'assessments.assessment.update:bu')
);

CREATE POLICY assessments_soft_delete
ON public.assessments
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND public.has_assessment_permission(auth.uid(), bu_id, 'assessments.assessment.delete:bu')
)
WITH CHECK (
  public.has_assessment_permission(auth.uid(), bu_id, 'assessments.assessment.delete:bu')
);

CREATE OR REPLACE FUNCTION public.soft_delete_assessment(p_assessment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assessment record;
  v_active_invites integer;
  v_current_bu_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;

  v_current_bu_id := public.current_bu_id();

  IF v_current_bu_id IS NULL THEN
    RAISE EXCEPTION 'BU ativa não informada.' USING ERRCODE = '42501';
  END IF;

  SELECT id, bu_id, deleted_at
    INTO v_assessment
  FROM public.assessments
  WHERE id = p_assessment_id
    AND bu_id = v_current_bu_id
  FOR UPDATE;

  IF NOT FOUND OR v_assessment.deleted_at IS NOT NULL THEN
    RETURN;
  END IF;

  IF NOT public.has_assessment_permission(auth.uid(), v_assessment.bu_id, 'assessments.assessment.delete:bu') THEN
    RAISE EXCEPTION 'Sem permissão para excluir provas nesta BU.' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*)
    INTO v_active_invites
  FROM public.assessment_invites
  WHERE assessment_id = p_assessment_id
    AND bu_id = v_assessment.bu_id
    AND deleted_at IS NULL
    AND status IN ('pending', 'started');

  IF v_active_invites > 0 THEN
    RAISE EXCEPTION 'Existem % convite(s) ativo(s). Revogue-os antes de excluir a prova.', v_active_invites;
  END IF;

  UPDATE public.assessment_form_links
  SET deleted_at = COALESCE(deleted_at, now())
  WHERE assessment_id = p_assessment_id
    AND bu_id = v_assessment.bu_id
    AND deleted_at IS NULL;

  UPDATE public.assessments
  SET deleted_at = now()
  WHERE id = p_assessment_id
    AND bu_id = v_assessment.bu_id
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_assessment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_assessment(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_assessment(uuid) TO authenticated;