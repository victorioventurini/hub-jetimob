
-- =====================================================
-- RESTAURAÇÃO DE RLS POLICIES - PARTE 1 (CORE)
-- =====================================================

-- PROFILES
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (is_platform_admin(auth.uid()) OR bu_id IN (SELECT bu_id FROM bu_user_memberships WHERE user_id = auth.uid()));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "profiles_admin" ON public.profiles FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR (bu_id IS NOT NULL AND is_bu_admin(auth.uid(), bu_id)));

-- USER_ROLES
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "user_roles_admin" ON public.user_roles FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()));

-- BU_UNITS
CREATE POLICY "bu_units_select" ON public.bu_units FOR SELECT TO authenticated
  USING (is_platform_admin(auth.uid()) OR id IN (SELECT bu_id FROM bu_user_memberships WHERE user_id = auth.uid()));
CREATE POLICY "bu_units_admin" ON public.bu_units FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()));

-- BU_USER_MEMBERSHIPS
CREATE POLICY "memberships_select" ON public.bu_user_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "memberships_global_admin" ON public.bu_user_memberships FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()));
CREATE POLICY "memberships_bu_admin" ON public.bu_user_memberships FOR ALL TO authenticated
  USING (is_bu_admin(auth.uid(), bu_id));

-- BU_LOCATIONS
CREATE POLICY "locations_select" ON public.bu_locations FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));
CREATE POLICY "locations_admin" ON public.bu_locations FOR ALL TO authenticated
  USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

-- TEAMS
CREATE POLICY "teams_select" ON public.teams FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));
CREATE POLICY "teams_manage" ON public.teams FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR is_bu_admin(auth.uid(), bu_id) OR user_can_manage_team(auth.uid(), id));

-- SQUADS
CREATE POLICY "squads_select" ON public.squads FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));
CREATE POLICY "squads_admin" ON public.squads FOR ALL TO authenticated
  USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

-- USER_TEAM_MEMBERSHIPS
CREATE POLICY "team_memberships_select" ON public.user_team_memberships FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND user_has_bu_access(auth.uid(), t.bu_id)));
CREATE POLICY "team_memberships_manage" ON public.user_team_memberships FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND (user_can_manage_team(auth.uid(), t.id) OR is_bu_admin(auth.uid(), t.bu_id) OR is_platform_admin(auth.uid()))));

-- CYCLES
CREATE POLICY "cycles_select" ON public.cycles FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id));
CREATE POLICY "cycles_admin" ON public.cycles FOR ALL TO authenticated
  USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

-- MODULES
CREATE POLICY "modules_select" ON public.modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "modules_admin" ON public.modules FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));

-- BU_MODULE_CONFIGS
CREATE POLICY "module_configs_select" ON public.bu_module_configs FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id));
CREATE POLICY "module_configs_admin" ON public.bu_module_configs FOR ALL TO authenticated
  USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

-- PERMISSION_CATALOG
CREATE POLICY "permission_catalog_select" ON public.permission_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "permission_catalog_admin" ON public.permission_catalog FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));

-- PERMISSION_GROUPS
CREATE POLICY "permission_groups_select" ON public.permission_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "permission_groups_admin" ON public.permission_groups FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));

-- PERMISSION_GROUP_PERMISSIONS
CREATE POLICY "pgp_select" ON public.permission_group_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "pgp_admin" ON public.permission_group_permissions FOR ALL TO authenticated USING (is_platform_admin(auth.uid()));

-- BU_PERMISSION_GROUP_CONFIGS
CREATE POLICY "bu_pgc_select" ON public.bu_permission_group_configs FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id));
CREATE POLICY "bu_pgc_admin" ON public.bu_permission_group_configs FOR ALL TO authenticated
  USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

-- BU_USER_PERMISSION_GROUPS
CREATE POLICY "bu_upg_select" ON public.bu_user_permission_groups FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id));
CREATE POLICY "bu_upg_admin" ON public.bu_user_permission_groups FOR ALL TO authenticated
  USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));

-- BU_USER_PERMISSION_OVERRIDES
CREATE POLICY "bu_upo_select" ON public.bu_user_permission_overrides FOR SELECT TO authenticated
  USING (user_has_bu_access(auth.uid(), bu_id));
CREATE POLICY "bu_upo_admin" ON public.bu_user_permission_overrides FOR ALL TO authenticated
  USING (is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid()));
