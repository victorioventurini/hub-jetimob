-- ============================================================
-- IDENTITY CUTOVER v3.0 — FASE 0.5: Migração RLS para profile_id
-- ============================================================
-- Migra as 10 policies com acesso direto a bu_user_memberships.user_id
-- para usar profile_id via my_profile_id()
-- ============================================================

-- 1. bu_notification_event_settings (SELECT)
DROP POLICY IF EXISTS "Users can view BU notification event settings" ON bu_notification_event_settings;
CREATE POLICY "Users can view BU notification event settings" ON bu_notification_event_settings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bu_user_memberships bum
    WHERE bum.bu_id = bu_notification_event_settings.bu_id 
      AND bum.profile_id = my_profile_id()
  )
);

-- 2. bu_units (SELECT) - usar is_profile_bu_member
DROP POLICY IF EXISTS "bu_units_select" ON bu_units;
CREATE POLICY "bu_units_select" ON bu_units
FOR SELECT USING (
  is_platform_admin(auth.uid()) 
  OR is_profile_bu_member(my_profile_id(), id)
);

-- 3. notification_health_alerts (SELECT)
DROP POLICY IF EXISTS "notification_health_alerts_select" ON notification_health_alerts;
CREATE POLICY "notification_health_alerts_select" ON notification_health_alerts
FOR SELECT USING (
  is_platform_admin(auth.uid()) 
  OR (bu_id IN (
    SELECT bum.bu_id FROM bu_user_memberships bum
    WHERE bum.profile_id = my_profile_id()
      AND bum.role_in_bu IN ('admin', 'super_admin')
  ))
);

-- 4. notification_health_alert_actions (SELECT)
DROP POLICY IF EXISTS "alert_actions_select" ON notification_health_alert_actions;
CREATE POLICY "alert_actions_select" ON notification_health_alert_actions
FOR SELECT USING (
  alert_id IN (
    SELECT nha.id FROM notification_health_alerts nha
    WHERE is_platform_admin(auth.uid()) 
      OR (nha.bu_id IN (
        SELECT bum.bu_id FROM bu_user_memberships bum
        WHERE bum.profile_id = my_profile_id()
          AND bum.role_in_bu IN ('admin', 'super_admin')
      ))
  )
);

-- 5. notification_health_alert_actions (INSERT) - já usa with_check
DROP POLICY IF EXISTS "alert_actions_insert" ON notification_health_alert_actions;
CREATE POLICY "alert_actions_insert" ON notification_health_alert_actions
FOR INSERT WITH CHECK (
  alert_id IN (
    SELECT nha.id FROM notification_health_alerts nha
    WHERE is_platform_admin(auth.uid()) 
      OR (nha.bu_id IN (
        SELECT bum.bu_id FROM bu_user_memberships bum
        WHERE bum.profile_id = my_profile_id()
          AND bum.role_in_bu IN ('admin', 'super_admin')
      ))
  )
);

-- 6. permission_audit_log (SELECT)
DROP POLICY IF EXISTS "permission_audit_log_select" ON permission_audit_log;
CREATE POLICY "permission_audit_log_select" ON permission_audit_log
FOR SELECT USING (
  bu_id IN (
    SELECT m.bu_id FROM bu_user_memberships m
    WHERE m.profile_id = my_profile_id()
      AND m.role_in_bu IN ('admin', 'super_admin')
  )
);

-- 7. permission_migrations (ALL)
DROP POLICY IF EXISTS "Admin can manage permission_migrations" ON permission_migrations;
CREATE POLICY "Admin can manage permission_migrations" ON permission_migrations
FOR ALL USING (
  is_platform_admin(auth.uid()) 
  OR EXISTS (
    SELECT 1 FROM bu_user_memberships m
    WHERE m.bu_id = permission_migrations.bu_id 
      AND m.profile_id = my_profile_id()
      AND m.role_in_bu = 'admin'
  )
);

-- 8. permission_preset_items (ALL)
DROP POLICY IF EXISTS "permission_preset_items_admin" ON permission_preset_items;
CREATE POLICY "permission_preset_items_admin" ON permission_preset_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM bu_user_memberships m
    WHERE m.profile_id = my_profile_id()
      AND m.role_in_bu = 'super_admin'
  )
);

-- 9. permission_presets (ALL)
DROP POLICY IF EXISTS "permission_presets_admin" ON permission_presets;
CREATE POLICY "permission_presets_admin" ON permission_presets
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM bu_user_memberships m
    WHERE m.profile_id = my_profile_id()
      AND m.role_in_bu = 'super_admin'
  )
);

-- 10. profiles (SELECT) - usar is_profile_bu_member
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
FOR SELECT USING (
  is_platform_admin(auth.uid()) 
  OR is_profile_bu_member(my_profile_id(), bu_id)
);