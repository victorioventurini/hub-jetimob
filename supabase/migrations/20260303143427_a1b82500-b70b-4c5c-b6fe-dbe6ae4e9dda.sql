-- BU admins (and super_admins) can view ALL completed wizard sessions in their BU
CREATE POLICY "BU admins can view all wizard sessions"
ON public.okr_wizard_sessions
FOR SELECT
TO authenticated
USING (
  status = 'completed'
  AND EXISTS (
    SELECT 1 FROM bu_user_memberships bum
    JOIN profiles p ON p.id = bum.profile_id
    WHERE p.user_id = auth.uid()
      AND bum.bu_id = okr_wizard_sessions.bu_id
      AND bum.role_in_bu IN ('admin', 'super_admin')
      AND bum.deleted_at IS NULL
  )
);