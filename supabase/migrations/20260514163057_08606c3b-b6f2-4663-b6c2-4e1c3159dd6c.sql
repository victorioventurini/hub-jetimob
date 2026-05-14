REVOKE ALL ON FUNCTION public.soft_delete_assessment_form(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_assessment_form(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_assessment_form(uuid) TO authenticated;