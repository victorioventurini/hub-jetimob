DROP POLICY IF EXISTS forms_update ON public.assessment_forms;
CREATE POLICY forms_update
ON public.assessment_forms
FOR UPDATE
TO authenticated
USING (
  public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu')
  OR public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.delete:bu')
  OR public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.publish:bu')
)
WITH CHECK (
  public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu')
  OR public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.delete:bu')
  OR public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.publish:bu')
);

DROP POLICY IF EXISTS versions_update ON public.assessment_form_versions;
CREATE POLICY versions_update
ON public.assessment_form_versions
FOR UPDATE
TO authenticated
USING (
  public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu')
  OR public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.delete:bu')
  OR public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.publish:bu')
)
WITH CHECK (
  public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu')
  OR public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.delete:bu')
  OR public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.publish:bu')
);

DROP POLICY IF EXISTS questions_update ON public.assessment_form_questions;
CREATE POLICY questions_update
ON public.assessment_form_questions
FOR UPDATE
TO authenticated
USING (
  public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu')
  OR public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.delete:bu')
  OR public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.publish:bu')
)
WITH CHECK (
  public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu')
  OR public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.delete:bu')
  OR public.has_assessment_permission(auth.uid(), bu_id, 'assessments.form.publish:bu')
);