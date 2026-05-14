-- assessment_form_questions: allow soft-delete via update for delete/publish permission too
DROP POLICY IF EXISTS questions_update ON public.assessment_form_questions;
CREATE POLICY questions_update ON public.assessment_form_questions
  FOR UPDATE
  USING (
    has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu'::text)
    OR has_assessment_permission(auth.uid(), bu_id, 'assessments.form.delete:bu'::text)
    OR has_assessment_permission(auth.uid(), bu_id, 'assessments.form.publish:bu'::text)
  );

-- assessment_form_versions: same expansion (publish/delete also imply soft-delete authority)
DO $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.assessment_form_versions'::regclass
      AND polname = 'versions_update'
  ) INTO v_exists;
  IF v_exists THEN
    EXECUTE 'DROP POLICY versions_update ON public.assessment_form_versions';
  END IF;
END$$;

CREATE POLICY versions_update ON public.assessment_form_versions
  FOR UPDATE
  USING (
    has_assessment_permission(auth.uid(), bu_id, 'assessments.form.update:bu'::text)
    OR has_assessment_permission(auth.uid(), bu_id, 'assessments.form.delete:bu'::text)
    OR has_assessment_permission(auth.uid(), bu_id, 'assessments.form.publish:bu'::text)
  );