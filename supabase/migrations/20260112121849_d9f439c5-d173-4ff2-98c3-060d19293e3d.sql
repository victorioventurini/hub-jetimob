
-- =====================================================
-- TEAMS MODULE: MIGRATE RLS TO V2 PERMISSION SYSTEM
-- Tables: teams, squads
-- =====================================================

-- =====================================================
-- 1. TEAMS TABLE
-- =====================================================
DROP POLICY IF EXISTS "teams_select" ON public.teams;
DROP POLICY IF EXISTS "teams_manage" ON public.teams;

-- SELECT: Any BU member can view teams
CREATE POLICY "teams_select_v2" ON public.teams
  FOR SELECT TO authenticated
  USING (
    is_profile_bu_member(my_profile_id(), bu_id)
    AND is_current_bu(bu_id)
  );

-- INSERT: BU admin or teams.team.create:bu permission
CREATE POLICY "teams_insert_v2" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'teams.team.create:bu')
  );

-- UPDATE: BU admin, team leader, or teams.team.update:bu permission
CREATE POLICY "teams_update_v2" ON public.teams
  FOR UPDATE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'teams.team.update:bu')
    OR leader_user_id = my_profile_id()
  );

-- DELETE: Only BU admin or teams.team.delete:bu permission
CREATE POLICY "teams_delete_v2" ON public.teams
  FOR DELETE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'teams.team.delete:bu')
  );

-- =====================================================
-- 2. SQUADS TABLE
-- =====================================================
DROP POLICY IF EXISTS "squads_select" ON public.squads;
DROP POLICY IF EXISTS "squads_admin" ON public.squads;

-- SELECT: Any BU member can view squads
CREATE POLICY "squads_select_v2" ON public.squads
  FOR SELECT TO authenticated
  USING (
    is_profile_bu_member(my_profile_id(), bu_id)
    AND is_current_bu(bu_id)
  );

-- INSERT: teams.squad.create:bu permission
CREATE POLICY "squads_insert_v2" ON public.squads
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'teams.squad.create:bu')
  );

-- UPDATE: teams.squad.update:bu permission
CREATE POLICY "squads_update_v2" ON public.squads
  FOR UPDATE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'teams.squad.update:bu')
  );

-- DELETE: teams.squad.delete:bu permission
CREATE POLICY "squads_delete_v2" ON public.squads
  FOR DELETE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'teams.squad.delete:bu')
  );
