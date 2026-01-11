-- Drop the existing restrictive policy
DROP POLICY IF EXISTS notification_outbox_admin ON notification_outbox;

-- Create a new policy that uses has_permission for proper access control
CREATE POLICY "notification_outbox_view_policy" ON notification_outbox
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_permission(auth.uid(), bu_id, 'notifications.outbox.view')
);

-- Create separate policies for INSERT, UPDATE, DELETE with admin-only access
CREATE POLICY "notification_outbox_insert_policy" ON notification_outbox
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "notification_outbox_update_policy" ON notification_outbox
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_permission(auth.uid(), bu_id, 'notifications.outbox.retry')
);

CREATE POLICY "notification_outbox_delete_policy" ON notification_outbox
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);