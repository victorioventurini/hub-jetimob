-- Fix: Leaders can view sessions of their team/sub-team members
-- The previous migration partially applied (policies 1-3 succeeded), so only add the new leader policy

CREATE POLICY "Leaders can view team tree member sessions"
ON public.okr_wizard_sessions FOR SELECT
TO authenticated
USING (
  status IN ('completed', 'in_progress')
  AND EXISTS (
    SELECT 1
    FROM profiles leader_p
    JOIN teams t ON t.leader_user_id = leader_p.id AND t.deleted_at IS NULL
    JOIN profiles member_p ON member_p.id = okr_wizard_sessions.started_by
    WHERE leader_p.user_id = auth.uid()
      AND member_p.team_id IN (
        SELECT unnest(get_descendant_team_ids(t.id))
      )
  )
);