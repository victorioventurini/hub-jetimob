-- Fix OKR tables SELECT policies: change from public to authenticated
-- The policies use my_profile_id() which requires auth.uid()

-- Fix okr_org_objectives
DROP POLICY IF EXISTS okr_org_objectives_select ON public.okr_org_objectives;
CREATE POLICY "okr_org_objectives_select" 
ON public.okr_org_objectives 
FOR SELECT 
TO authenticated
USING (is_profile_bu_member(my_profile_id(), bu_id));

-- Fix okr_org_key_results
DROP POLICY IF EXISTS okr_org_key_results_select ON public.okr_org_key_results;
CREATE POLICY "okr_org_key_results_select" 
ON public.okr_org_key_results 
FOR SELECT 
TO authenticated
USING (is_profile_bu_member(my_profile_id(), bu_id));

-- Fix okr_team_objectives
DROP POLICY IF EXISTS okr_team_objectives_select ON public.okr_team_objectives;
CREATE POLICY "okr_team_objectives_select" 
ON public.okr_team_objectives 
FOR SELECT 
TO authenticated
USING (is_profile_bu_member(my_profile_id(), bu_id));

-- Fix okr_team_key_results
DROP POLICY IF EXISTS okr_team_key_results_select ON public.okr_team_key_results;
CREATE POLICY "okr_team_key_results_select" 
ON public.okr_team_key_results 
FOR SELECT 
TO authenticated
USING (is_profile_bu_member(my_profile_id(), bu_id));