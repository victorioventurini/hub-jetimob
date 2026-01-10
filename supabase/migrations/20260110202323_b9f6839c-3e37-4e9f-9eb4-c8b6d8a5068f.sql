-- Fix: okr_dependencies has overly permissive RLS policy
-- Drop ALL existing policies and replace with proper BU-scoped validation

-- Drop all existing policies on okr_dependencies
DROP POLICY IF EXISTS "okr_dependencies_manage" ON public.okr_dependencies;
DROP POLICY IF EXISTS "okr_dependencies_select" ON public.okr_dependencies;
DROP POLICY IF EXISTS "okr_dependencies_insert" ON public.okr_dependencies;
DROP POLICY IF EXISTS "okr_dependencies_update" ON public.okr_dependencies;
DROP POLICY IF EXISTS "okr_dependencies_delete" ON public.okr_dependencies;

-- Create proper BU-scoped policy for SELECT
CREATE POLICY "okr_dependencies_select"
  ON public.okr_dependencies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.okr_team_key_results kr
      WHERE kr.id = okr_dependencies.kr_id
        AND public.is_profile_bu_member(public.my_profile_id(), kr.bu_id)
    )
  );

-- Create proper BU-scoped policy for INSERT
CREATE POLICY "okr_dependencies_insert"
  ON public.okr_dependencies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.okr_team_key_results kr
      WHERE kr.id = okr_dependencies.kr_id
        AND public.is_profile_bu_member(public.my_profile_id(), kr.bu_id)
    )
  );

-- Create proper BU-scoped policy for UPDATE
CREATE POLICY "okr_dependencies_update"
  ON public.okr_dependencies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.okr_team_key_results kr
      WHERE kr.id = okr_dependencies.kr_id
        AND public.is_profile_bu_member(public.my_profile_id(), kr.bu_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.okr_team_key_results kr
      WHERE kr.id = okr_dependencies.kr_id
        AND public.is_profile_bu_member(public.my_profile_id(), kr.bu_id)
    )
  );

-- Create proper BU-scoped policy for DELETE
CREATE POLICY "okr_dependencies_delete"
  ON public.okr_dependencies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.okr_team_key_results kr
      WHERE kr.id = okr_dependencies.kr_id
        AND public.is_profile_bu_member(public.my_profile_id(), kr.bu_id)
    )
  );