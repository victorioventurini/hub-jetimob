-- =====================================================
-- Security Fix: Harden notifications RLS policies
-- Issue: notifications_inadequate_protection (warn)
-- 
-- Current policy uses auth.uid() directly which works but
-- could be improved to align with V2 security patterns
-- =====================================================

-- 1. Drop the old notifications policy
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;

-- 2. Create hardened notifications policies (V2 aligned)
-- SELECT: Users can only view their own notifications
CREATE POLICY "notifications_select_own_v2"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: System/triggers insert notifications, not users directly
-- If direct insert is needed, user can only insert for themselves
CREATE POLICY "notifications_insert_own_v2"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own notifications (mark as read, etc.)
CREATE POLICY "notifications_update_own_v2"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own notifications
CREATE POLICY "notifications_delete_own_v2"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Note: notification_deliveries policy already uses subquery to notifications
-- which inherits the notification ownership check - no changes needed there

-- Add comment documenting the security decision
COMMENT ON POLICY "notifications_select_own_v2" ON public.notifications IS 
  'V2 hardened: Users can only view notifications addressed to their auth.uid(). 
   Notifications use auth.users.id (not profiles.id) per IDENTITY_CONVENTION.md section on notifications.
   This is the correct approach as notifications are tied to authentication identity, not domain identity.';
