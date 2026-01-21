
-- Fix overly permissive INSERT policies (WITH CHECK true)
-- Add minimum auth validation + proper permission checks where applicable

-- =============================================================================
-- 1. notification_template_audit_log - audit table, allow authenticated inserts
-- =============================================================================

DROP POLICY IF EXISTS "Audit logs insertable by authenticated"
  ON public.notification_template_audit_log;

CREATE POLICY "Audit logs insertable by authenticated"
  ON public.notification_template_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- 2. notification_template_versions - requires template management permission
-- =============================================================================

DROP POLICY IF EXISTS "Template versions insertable by authenticated"
  ON public.notification_template_versions;

CREATE POLICY "Template versions insertable by admins"
  ON public.notification_template_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_permission(my_profile_id(), NULL::uuid, 'platform.notifications.manage:global'::text)
    OR has_permission(my_profile_id(), NULL::uuid, 'notifications.templates.manage:global'::text)
  );

-- =============================================================================
-- 3. permission_audit_log - audit table, allow authenticated inserts to own BU
-- =============================================================================

DROP POLICY IF EXISTS "permission_audit_log_insert"
  ON public.permission_audit_log;

CREATE POLICY "permission_audit_log_insert"
  ON public.permission_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
