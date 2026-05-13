-- Allow soft-delete (UPDATE deleted_at) on assessment_forms for users with delete permission
DROP POLICY IF EXISTS forms_update ON public.assessment_forms;
CREATE POLICY forms_update ON public.assessment_forms
  FOR UPDATE
  USING (
    has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu'::text)
    OR has_assessment_permission(auth.uid(), bu_id, 'assessments.form.delete:bu'::text)
    OR has_assessment_permission(auth.uid(), bu_id, 'assessments.form.publish:bu'::text)
  );