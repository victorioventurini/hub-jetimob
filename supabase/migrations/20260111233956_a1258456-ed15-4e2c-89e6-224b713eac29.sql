-- Add policy for admin view of in-app notifications
CREATE POLICY "notifications_admin_view" ON notifications
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_permission(auth.uid(), bu_id, 'notifications.inapp.view')
);