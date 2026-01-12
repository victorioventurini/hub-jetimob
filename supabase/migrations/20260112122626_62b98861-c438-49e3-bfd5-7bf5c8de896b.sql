
-- =====================================================
-- GLOBAL/PLATFORM TABLES: V2 MIGRATION (no bu_id)
-- =====================================================

-- =====================================================
-- 1. OKR_REPORTS_CONFIG (global config)
-- =====================================================
DROP POLICY IF EXISTS "okr_reports_config_admin" ON public.okr_reports_config;
DROP POLICY IF EXISTS "okr_reports_config_select" ON public.okr_reports_config;

CREATE POLICY "okr_reports_config_select_v2" ON public.okr_reports_config
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "okr_reports_config_manage_v2" ON public.okr_reports_config
  FOR ALL TO authenticated
  USING (has_permission(my_profile_id(), null, 'platform.okr_reports.manage:global'));

-- =====================================================
-- 2. AUDIT_LOGS (read-only, platform admin)
-- =====================================================
DROP POLICY IF EXISTS "audit_logs_admin" ON public.audit_logs;

CREATE POLICY "audit_logs_select_v2" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (has_permission(my_profile_id(), null, 'platform.audit.view:global'));

-- =====================================================
-- 3. SYSTEM_SETTINGS (platform admin)
-- =====================================================
DROP POLICY IF EXISTS "system_settings_modify_admin" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_select_admin" ON public.system_settings;

CREATE POLICY "system_settings_select_v2" ON public.system_settings
  FOR SELECT TO authenticated
  USING (has_permission(my_profile_id(), null, 'platform.settings.view:global'));

CREATE POLICY "system_settings_manage_v2" ON public.system_settings
  FOR ALL TO authenticated
  USING (has_permission(my_profile_id(), null, 'platform.settings.manage:global'));

-- =====================================================
-- 4. MODULES (platform admin, public read)
-- =====================================================
DROP POLICY IF EXISTS "modules_admin" ON public.modules;
DROP POLICY IF EXISTS "modules_select" ON public.modules;

CREATE POLICY "modules_select_v2" ON public.modules
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "modules_manage_v2" ON public.modules
  FOR ALL TO authenticated
  USING (has_permission(my_profile_id(), null, 'platform.modules.manage:global'));

-- =====================================================
-- 5. PERMISSION_CATALOG (platform admin, public read)
-- =====================================================
DROP POLICY IF EXISTS "permission_catalog_admin" ON public.permission_catalog;
DROP POLICY IF EXISTS "permission_catalog_select" ON public.permission_catalog;

CREATE POLICY "permission_catalog_select_v2" ON public.permission_catalog
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "permission_catalog_manage_v2" ON public.permission_catalog
  FOR ALL TO authenticated
  USING (has_permission(my_profile_id(), null, 'platform.permissions.manage:global'));

-- =====================================================
-- 6. CRON_EXECUTION_LOGS (platform admin)
-- =====================================================
DROP POLICY IF EXISTS "Admins can view cron logs" ON public.cron_execution_logs;
DROP POLICY IF EXISTS "System can insert cron logs" ON public.cron_execution_logs;

CREATE POLICY "cron_logs_select_v2" ON public.cron_execution_logs
  FOR SELECT TO authenticated
  USING (has_permission(my_profile_id(), null, 'platform.cron.view:global'));

-- Insert via service role only
CREATE POLICY "cron_logs_insert_v2" ON public.cron_execution_logs
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- =====================================================
-- 7. HUB_INTEGRATIONS_GLOBAL_CONFIG (platform admin)
-- =====================================================
DROP POLICY IF EXISTS "hub_integrations_global_config_admin" ON public.hub_integrations_global_config;

CREATE POLICY "hub_global_config_select_v2" ON public.hub_integrations_global_config
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "hub_global_config_manage_v2" ON public.hub_integrations_global_config
  FOR ALL TO authenticated
  USING (has_permission(my_profile_id(), null, 'platform.integrations.manage:global'));

-- =====================================================
-- 8. Remaining BU-scoped tables that failed
-- =====================================================

-- BU_INTEGRATIONS_CONFIG
DROP POLICY IF EXISTS "bu_integrations_config_admin" ON public.bu_integrations_config;
DROP POLICY IF EXISTS "bu_integrations_config_select" ON public.bu_integrations_config;

CREATE POLICY "bu_integrations_config_select_v2" ON public.bu_integrations_config
  FOR SELECT TO authenticated
  USING (is_profile_bu_member(my_profile_id(), bu_id));

CREATE POLICY "bu_integrations_config_manage_v2" ON public.bu_integrations_config
  FOR ALL TO authenticated
  USING (has_permission(my_profile_id(), bu_id, 'settings.integrations.manage:bu'));

-- BU_MODULE_CONFIGS
DROP POLICY IF EXISTS "module_configs_admin" ON public.bu_module_configs;
DROP POLICY IF EXISTS "module_configs_select" ON public.bu_module_configs;

CREATE POLICY "bu_module_configs_select_v2" ON public.bu_module_configs
  FOR SELECT TO authenticated
  USING (is_profile_bu_member(my_profile_id(), bu_id));

CREATE POLICY "bu_module_configs_manage_v2" ON public.bu_module_configs
  FOR ALL TO authenticated
  USING (has_permission(my_profile_id(), bu_id, 'settings.modules.manage:bu'));

-- BU_UNITS
DROP POLICY IF EXISTS "bu_units_admin" ON public.bu_units;
DROP POLICY IF EXISTS "bu_units_select" ON public.bu_units;

CREATE POLICY "bu_units_select_v2" ON public.bu_units
  FOR SELECT TO authenticated
  USING (is_profile_bu_member(my_profile_id(), id));

CREATE POLICY "bu_units_manage_v2" ON public.bu_units
  FOR ALL TO authenticated
  USING (has_permission(my_profile_id(), id, 'platform.bu.manage:global'));

-- BU_USER_MEMBERSHIPS
DROP POLICY IF EXISTS "memberships_bu_admin" ON public.bu_user_memberships;
DROP POLICY IF EXISTS "memberships_global_admin" ON public.bu_user_memberships;
DROP POLICY IF EXISTS "memberships_select" ON public.bu_user_memberships;

CREATE POLICY "bu_user_memberships_select_own_v2" ON public.bu_user_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "bu_user_memberships_select_admin_v2" ON public.bu_user_memberships
  FOR SELECT TO authenticated
  USING (has_permission(my_profile_id(), bu_id, 'people.membership.view:bu'));

CREATE POLICY "bu_user_memberships_manage_v2" ON public.bu_user_memberships
  FOR ALL TO authenticated
  USING (has_permission(my_profile_id(), bu_id, 'people.membership.manage:bu'));

-- BU_USER_PERMISSION_OVERRIDES
DROP POLICY IF EXISTS "bu_upo_admin" ON public.bu_user_permission_overrides;
DROP POLICY IF EXISTS "bu_upo_select" ON public.bu_user_permission_overrides;

CREATE POLICY "bu_upo_select_v2" ON public.bu_user_permission_overrides
  FOR SELECT TO authenticated
  USING (is_profile_bu_member(my_profile_id(), bu_id));

CREATE POLICY "bu_upo_manage_v2" ON public.bu_user_permission_overrides
  FOR ALL TO authenticated
  USING (has_permission(my_profile_id(), bu_id, 'permissions.override.manage:bu'));

-- BU_USER_PERMISSION_TEMPLATES_V2
DROP POLICY IF EXISTS "BU admins can manage template assignments v2" ON public.bu_user_permission_templates_v2;
DROP POLICY IF EXISTS "Users can read their own template assignments v2" ON public.bu_user_permission_templates_v2;

CREATE POLICY "bu_upt_select_v2" ON public.bu_user_permission_templates_v2
  FOR SELECT TO authenticated
  USING (
    is_current_bu(bu_id) 
    AND (user_id = my_profile_id() OR has_permission(my_profile_id(), bu_id, 'permissions.template.view:bu'))
  );

CREATE POLICY "bu_upt_manage_v2" ON public.bu_user_permission_templates_v2
  FOR ALL TO authenticated
  USING (
    is_current_bu(bu_id) 
    AND has_permission(my_profile_id(), bu_id, 'permissions.template.manage:bu')
  );

-- NOTIFICATION_HEALTH_ALERTS
DROP POLICY IF EXISTS "notification_health_alerts_select" ON public.notification_health_alerts;

CREATE POLICY "notification_health_alerts_select_v2" ON public.notification_health_alerts
  FOR SELECT TO authenticated
  USING (has_permission(my_profile_id(), bu_id, 'notifications.alerts.view:bu'));

-- NOTIFICATION_HEALTH_ALERT_ACTIONS
DROP POLICY IF EXISTS "alert_actions_select" ON public.notification_health_alert_actions;
DROP POLICY IF EXISTS "alert_actions_insert" ON public.notification_health_alert_actions;

CREATE POLICY "alert_actions_select_v2" ON public.notification_health_alert_actions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notification_health_alerts nha
      WHERE nha.id = alert_id
      AND has_permission(my_profile_id(), nha.bu_id, 'notifications.alerts.view:bu')
    )
  );

CREATE POLICY "alert_actions_insert_v2" ON public.notification_health_alert_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notification_health_alerts nha
      WHERE nha.id = alert_id
      AND has_permission(my_profile_id(), nha.bu_id, 'notifications.alerts.manage:bu')
    )
  );

-- NOTIFICATION_OUTBOX
DROP POLICY IF EXISTS "notification_outbox_view_policy" ON public.notification_outbox;
DROP POLICY IF EXISTS "notification_outbox_update_policy" ON public.notification_outbox;
DROP POLICY IF EXISTS "notification_outbox_delete_policy" ON public.notification_outbox;
DROP POLICY IF EXISTS "notification_outbox_insert_policy" ON public.notification_outbox;

CREATE POLICY "notification_outbox_select_v2" ON public.notification_outbox
  FOR SELECT TO authenticated
  USING (is_current_bu(bu_id) AND has_permission(my_profile_id(), bu_id, 'notifications.outbox.view:bu'));

CREATE POLICY "notification_outbox_update_v2" ON public.notification_outbox
  FOR UPDATE TO authenticated
  USING (is_current_bu(bu_id) AND has_permission(my_profile_id(), bu_id, 'notifications.outbox.retry:bu'));

CREATE POLICY "notification_outbox_delete_v2" ON public.notification_outbox
  FOR DELETE TO authenticated
  USING (is_current_bu(bu_id) AND has_permission(my_profile_id(), bu_id, 'notifications.outbox.manage:bu'));

CREATE POLICY "notification_outbox_insert_v2" ON public.notification_outbox
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- APP_ERROR_LOGS
DROP POLICY IF EXISTS "app_error_logs_admin" ON public.app_error_logs;

CREATE POLICY "app_error_logs_select_v2" ON public.app_error_logs
  FOR SELECT TO authenticated
  USING (bu_id IS NULL OR is_profile_bu_member(my_profile_id(), bu_id));

-- ASSET_PERMISSIONS (clean up legacy)
DROP POLICY IF EXISTS "asset_permissions_manage_v2" ON public.asset_permissions;

CREATE POLICY "asset_permissions_manage_v2_clean" ON public.asset_permissions
  FOR ALL TO authenticated
  USING (has_permission(my_profile_id(), bu_id, 'assets.settings.manage:bu'));

-- PERMISSION_MIGRATIONS
DROP POLICY IF EXISTS "Admin can manage permission_migrations" ON public.permission_migrations;

CREATE POLICY "permission_migrations_manage_v2" ON public.permission_migrations
  FOR ALL TO authenticated
  USING (has_permission(my_profile_id(), bu_id, 'permissions.migration.manage:bu'));

-- TICKETS - Remove remaining legacy
DROP POLICY IF EXISTS "BU admins can delete tickets" ON public.tickets;
DROP POLICY IF EXISTS "BU users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Ticket owners and admins can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view tickets they have access to" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
