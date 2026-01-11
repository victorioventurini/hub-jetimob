-- Fix RLS policies for notifications admin pages to use canonical permission keys (with :scope)
-- and enforce current BU context via is_current_bu()/current_bu_id().

-- =========================
-- notification_outbox
-- =========================
DROP POLICY IF EXISTS notification_outbox_view_policy ON public.notification_outbox;
CREATE POLICY notification_outbox_view_policy
ON public.notification_outbox
FOR SELECT
TO authenticated
USING (
  is_current_bu(bu_id)
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_permission(auth.uid(), current_bu_id(), 'notifications.outbox.view:bu')
  )
);

DROP POLICY IF EXISTS notification_outbox_update_policy ON public.notification_outbox;
CREATE POLICY notification_outbox_update_policy
ON public.notification_outbox
FOR UPDATE
TO authenticated
USING (
  is_current_bu(bu_id)
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_permission(auth.uid(), current_bu_id(), 'notifications.outbox.retry:bu')
  )
);

-- =========================
-- notifications (in-app logs)
-- =========================
DROP POLICY IF EXISTS notifications_admin_view ON public.notifications;
CREATE POLICY notifications_admin_view
ON public.notifications
FOR SELECT
TO authenticated
USING (
  is_current_bu(bu_id)
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_permission(auth.uid(), current_bu_id(), 'notifications.bu.view:bu')
    OR has_permission(auth.uid(), current_bu_id(), 'notifications.bu.manage:bu')
  )
);
