
-- =====================================================
-- PEOPLE/PROFILES, NOTIFICATIONS & AUTOMATIONS: V2 MIGRATION
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- SELECT own profile (always allowed)
CREATE POLICY "profiles_select_own_v2" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- SELECT other profiles in same BU
CREATE POLICY "profiles_select_bu_v2" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    is_profile_bu_member(my_profile_id(), bu_id)
  );

-- UPDATE own profile (limited fields handled by app)
CREATE POLICY "profiles_update_own_v2" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- UPDATE other profiles (admin permission)
CREATE POLICY "profiles_update_admin_v2" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'people.profile.update:bu')
  );

-- INSERT (only via admin)
CREATE POLICY "profiles_insert_v2" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    OR has_permission(my_profile_id(), bu_id, 'people.profile.create:bu')
  );

-- DELETE (soft delete, admin only)
CREATE POLICY "profiles_delete_v2" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'people.profile.delete:bu')
  );

-- =====================================================
-- 2. NOTIFICATIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_admin_view" ON public.notifications;

-- SELECT/UPDATE/DELETE own notifications
CREATE POLICY "notifications_own_v2" ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- SELECT all BU notifications (admin)
CREATE POLICY "notifications_admin_select_v2" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    is_current_bu(bu_id) 
    AND has_permission(my_profile_id(), bu_id, 'notifications.bu.view:bu')
  );

-- =====================================================
-- 3. AUTOMATION_CONNECTIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "automation_connections_select" ON public.automation_connections;
DROP POLICY IF EXISTS "automation_connections_admin" ON public.automation_connections;

-- SELECT: Global connections or BU member
CREATE POLICY "automation_connections_select_v2" ON public.automation_connections
  FOR SELECT TO authenticated
  USING (
    scope = 'global' 
    OR (bu_id IS NOT NULL AND is_profile_bu_member(my_profile_id(), bu_id))
  );

-- INSERT/UPDATE/DELETE: Admin permission
CREATE POLICY "automation_connections_insert_v2" ON public.automation_connections
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'automations.connection.create:bu')
  );

CREATE POLICY "automation_connections_update_v2" ON public.automation_connections
  FOR UPDATE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'automations.connection.update:bu')
  );

CREATE POLICY "automation_connections_delete_v2" ON public.automation_connections
  FOR DELETE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'automations.connection.delete:bu')
  );

-- =====================================================
-- 4. AUTOMATION_INCOMING_TOKENS TABLE
-- =====================================================
DROP POLICY IF EXISTS "automation_incoming_tokens_select" ON public.automation_incoming_tokens;
DROP POLICY IF EXISTS "automation_incoming_tokens_admin" ON public.automation_incoming_tokens;

-- SELECT: Global tokens or BU member
CREATE POLICY "automation_incoming_tokens_select_v2" ON public.automation_incoming_tokens
  FOR SELECT TO authenticated
  USING (
    scope = 'global' 
    OR (bu_id IS NOT NULL AND is_profile_bu_member(my_profile_id(), bu_id))
  );

-- INSERT/UPDATE/DELETE: Admin permission
CREATE POLICY "automation_incoming_tokens_insert_v2" ON public.automation_incoming_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(my_profile_id(), bu_id, 'automations.token.create:bu')
  );

CREATE POLICY "automation_incoming_tokens_update_v2" ON public.automation_incoming_tokens
  FOR UPDATE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'automations.token.update:bu')
  );

CREATE POLICY "automation_incoming_tokens_delete_v2" ON public.automation_incoming_tokens
  FOR DELETE TO authenticated
  USING (
    has_permission(my_profile_id(), bu_id, 'automations.token.delete:bu')
  );

-- =====================================================
-- 5. AUTOMATION_LOGS TABLE (read-only, audit)
-- =====================================================
DROP POLICY IF EXISTS "automation_logs_select" ON public.automation_logs;

-- SELECT: BU member can view their BU logs
CREATE POLICY "automation_logs_select_v2" ON public.automation_logs
  FOR SELECT TO authenticated
  USING (
    bu_id IS NULL 
    OR is_profile_bu_member(my_profile_id(), bu_id)
  );

-- =====================================================
-- 6. AUTOMATION_CONNECTION_EVENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "automation_connection_events_select" ON public.automation_connection_events;

-- SELECT: Via connection access (subquery)
CREATE POLICY "automation_connection_events_select_v2" ON public.automation_connection_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.automation_connections c
      WHERE c.id = connection_id
    )
  );

-- INSERT/UPDATE/DELETE: Via connection admin access
CREATE POLICY "automation_connection_events_insert_v2" ON public.automation_connection_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.automation_connections c
      WHERE c.id = connection_id
      AND has_permission(my_profile_id(), c.bu_id, 'automations.connection.update:bu')
    )
  );

CREATE POLICY "automation_connection_events_update_v2" ON public.automation_connection_events
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.automation_connections c
      WHERE c.id = connection_id
      AND has_permission(my_profile_id(), c.bu_id, 'automations.connection.update:bu')
    )
  );

CREATE POLICY "automation_connection_events_delete_v2" ON public.automation_connection_events
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.automation_connections c
      WHERE c.id = connection_id
      AND has_permission(my_profile_id(), c.bu_id, 'automations.connection.delete:bu')
    )
  );
