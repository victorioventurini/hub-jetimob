-- Fix permissive RLS policies

-- Drop and recreate with proper checks
DROP POLICY IF EXISTS "okr_dependencies_manage" ON public.okr_dependencies;
DROP POLICY IF EXISTS "okr_team_objective_contributors_manage" ON public.okr_team_objective_contributors;

-- okr_dependencies - requires join to get bu_id context
CREATE POLICY "okr_dependencies_manage" ON public.okr_dependencies
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.okr_team_key_results kr
    WHERE kr.id = okr_dependencies.kr_id 
    AND public.is_bu_member(auth.uid(), kr.bu_id)
  )
);

-- okr_team_objective_contributors - check via objective's bu_id
CREATE POLICY "okr_team_objective_contributors_manage" ON public.okr_team_objective_contributors
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.okr_team_objectives o
    WHERE o.id = okr_team_objective_contributors.objective_id
    AND public.is_bu_member(auth.uid(), o.bu_id)
  )
);