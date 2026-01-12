
-- =====================================================
-- TEAMS EXTENDED, BU LOCATIONS, CYCLES, PARTNERS: V2 MIGRATION
-- =====================================================

-- =====================================================
-- 1. SQUAD_MEMBERSHIPS TABLE
-- =====================================================
DROP POLICY IF EXISTS "BU members can view squad memberships" ON public.squad_memberships;
DROP POLICY IF EXISTS "BU admins can insert squad memberships" ON public.squad_memberships;
DROP POLICY IF EXISTS "BU admins can update squad memberships" ON public.squad_memberships;
DROP POLICY IF EXISTS "BU admins can delete squad memberships" ON public.squad_memberships;

CREATE POLICY "squad_memberships_select_v2" ON public.squad_memberships
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL 
    AND is_current_bu(bu_id) 
    AND is_profile_bu_member(my_profile_id(), bu_id)
  );

CREATE POLICY "squad_memberships_insert_v2" ON public.squad_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'teams.squad.update:bu')
  );

CREATE POLICY "squad_memberships_update_v2" ON public.squad_memberships
  FOR UPDATE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'teams.squad.update:bu')
  );

CREATE POLICY "squad_memberships_delete_v2" ON public.squad_memberships
  FOR DELETE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'teams.squad.update:bu')
  );

-- =====================================================
-- 2. SQUAD_TEAMS TABLE (junction table)
-- =====================================================
DROP POLICY IF EXISTS "squad_teams_select" ON public.squad_teams;
DROP POLICY IF EXISTS "squad_teams_admin" ON public.squad_teams;

-- SELECT: Via squad access
CREATE POLICY "squad_teams_select_v2" ON public.squad_teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id = squad_id
      AND is_profile_bu_member(my_profile_id(), s.bu_id)
    )
  );

-- INSERT/UPDATE/DELETE: Via squad admin access
CREATE POLICY "squad_teams_insert_v2" ON public.squad_teams
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id = squad_id
      AND has_permission(my_profile_id(), s.bu_id, 'teams.squad.update:bu')
    )
  );

CREATE POLICY "squad_teams_update_v2" ON public.squad_teams
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id = squad_id
      AND has_permission(my_profile_id(), s.bu_id, 'teams.squad.update:bu')
    )
  );

CREATE POLICY "squad_teams_delete_v2" ON public.squad_teams
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.squads s
      WHERE s.id = squad_id
      AND has_permission(my_profile_id(), s.bu_id, 'teams.squad.delete:bu')
    )
  );

-- =====================================================
-- 3. USER_TEAM_MEMBERSHIPS TABLE
-- =====================================================
DROP POLICY IF EXISTS "team_memberships_select" ON public.user_team_memberships;
DROP POLICY IF EXISTS "team_memberships_manage" ON public.user_team_memberships;

CREATE POLICY "user_team_memberships_select_v2" ON public.user_team_memberships
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
      AND is_profile_bu_member(my_profile_id(), t.bu_id)
    )
  );

CREATE POLICY "user_team_memberships_insert_v2" ON public.user_team_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
      AND (
        has_permission(my_profile_id(), t.bu_id, 'teams.team.update:bu')
        OR t.leader_user_id = my_profile_id()
      )
    )
  );

CREATE POLICY "user_team_memberships_update_v2" ON public.user_team_memberships
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
      AND (
        has_permission(my_profile_id(), t.bu_id, 'teams.team.update:bu')
        OR t.leader_user_id = my_profile_id()
      )
    )
  );

CREATE POLICY "user_team_memberships_delete_v2" ON public.user_team_memberships
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
      AND (
        has_permission(my_profile_id(), t.bu_id, 'teams.team.update:bu')
        OR t.leader_user_id = my_profile_id()
      )
    )
  );

-- =====================================================
-- 4. BU_LOCATIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "locations_select" ON public.bu_locations;
DROP POLICY IF EXISTS "locations_admin" ON public.bu_locations;

CREATE POLICY "bu_locations_select_v2" ON public.bu_locations
  FOR SELECT TO authenticated
  USING (
    is_current_bu(bu_id) 
    AND is_profile_bu_member(my_profile_id(), bu_id)
  );

CREATE POLICY "bu_locations_insert_v2" ON public.bu_locations
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'settings.locations.create:bu')
  );

CREATE POLICY "bu_locations_update_v2" ON public.bu_locations
  FOR UPDATE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'settings.locations.update:bu')
  );

CREATE POLICY "bu_locations_delete_v2" ON public.bu_locations
  FOR DELETE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'settings.locations.delete:bu')
  );

-- =====================================================
-- 5. CYCLES TABLE
-- =====================================================
DROP POLICY IF EXISTS "cycles_select" ON public.cycles;
DROP POLICY IF EXISTS "cycles_admin" ON public.cycles;

CREATE POLICY "cycles_select_v2" ON public.cycles
  FOR SELECT TO authenticated
  USING (
    is_current_bu(bu_id) 
    AND is_profile_bu_member(my_profile_id(), bu_id)
  );

CREATE POLICY "cycles_insert_v2" ON public.cycles
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'okrs.cycle.create:bu')
  );

CREATE POLICY "cycles_update_v2" ON public.cycles
  FOR UPDATE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'okrs.cycle.update:bu')
  );

CREATE POLICY "cycles_delete_v2" ON public.cycles
  FOR DELETE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'okrs.cycle.delete:bu')
  );

-- =====================================================
-- 6. PARTNER_COMPANIES TABLE
-- =====================================================
DROP POLICY IF EXISTS "partner_companies_select" ON public.partner_companies;
DROP POLICY IF EXISTS "partner_companies_admin" ON public.partner_companies;

CREATE POLICY "partner_companies_select_v2" ON public.partner_companies
  FOR SELECT TO authenticated
  USING (
    is_profile_bu_member(my_profile_id(), bu_id)
  );

CREATE POLICY "partner_companies_insert_v2" ON public.partner_companies
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'partners.company.create:bu')
  );

CREATE POLICY "partner_companies_update_v2" ON public.partner_companies
  FOR UPDATE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'partners.company.update:bu')
  );

CREATE POLICY "partner_companies_delete_v2" ON public.partner_companies
  FOR DELETE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'partners.company.delete:bu')
  );

-- =====================================================
-- 7. PARTNER_CONTACTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "partner_contacts_select" ON public.partner_contacts;
DROP POLICY IF EXISTS "partner_contacts_admin" ON public.partner_contacts;

CREATE POLICY "partner_contacts_select_v2" ON public.partner_contacts
  FOR SELECT TO authenticated
  USING (
    is_profile_bu_member(my_profile_id(), bu_id)
  );

CREATE POLICY "partner_contacts_insert_v2" ON public.partner_contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'partners.contact.create:bu')
  );

CREATE POLICY "partner_contacts_update_v2" ON public.partner_contacts
  FOR UPDATE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'partners.contact.update:bu')
  );

CREATE POLICY "partner_contacts_delete_v2" ON public.partner_contacts
  FOR DELETE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'partners.contact.delete:bu')
  );

-- =====================================================
-- 8. PARTNER_CONTACT_CAPABILITIES TABLE
-- =====================================================
DROP POLICY IF EXISTS "partner_contact_capabilities_select" ON public.partner_contact_capabilities;
DROP POLICY IF EXISTS "partner_contact_capabilities_admin" ON public.partner_contact_capabilities;

CREATE POLICY "partner_contact_capabilities_select_v2" ON public.partner_contact_capabilities
  FOR SELECT TO authenticated
  USING (
    is_profile_bu_member(my_profile_id(), bu_id)
  );

CREATE POLICY "partner_contact_capabilities_insert_v2" ON public.partner_contact_capabilities
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'partners.contact.update:bu')
  );

CREATE POLICY "partner_contact_capabilities_update_v2" ON public.partner_contact_capabilities
  FOR UPDATE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'partners.contact.update:bu')
  );

CREATE POLICY "partner_contact_capabilities_delete_v2" ON public.partner_contact_capabilities
  FOR DELETE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'partners.contact.update:bu')
  );

-- =====================================================
-- 9. PARTNER_SERVICE_MAPPINGS TABLE
-- =====================================================
DROP POLICY IF EXISTS "partner_service_mappings_select" ON public.partner_service_mappings;
DROP POLICY IF EXISTS "partner_service_mappings_admin" ON public.partner_service_mappings;

CREATE POLICY "partner_service_mappings_select_v2" ON public.partner_service_mappings
  FOR SELECT TO authenticated
  USING (
    is_profile_bu_member(my_profile_id(), bu_id)
  );

CREATE POLICY "partner_service_mappings_insert_v2" ON public.partner_service_mappings
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'partners.company.update:bu')
  );

CREATE POLICY "partner_service_mappings_update_v2" ON public.partner_service_mappings
  FOR UPDATE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'partners.company.update:bu')
  );

CREATE POLICY "partner_service_mappings_delete_v2" ON public.partner_service_mappings
  FOR DELETE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'partners.company.update:bu')
  );
