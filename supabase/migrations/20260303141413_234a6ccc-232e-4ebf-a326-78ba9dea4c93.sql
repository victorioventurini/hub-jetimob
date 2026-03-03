
-- Add RLS policy: Team members can view completed sessions of their team
-- Uses user_team_memberships (correct table per data model)
CREATE POLICY "Team members can view team wizard sessions"
ON public.okr_wizard_sessions
FOR SELECT
TO authenticated
USING (
  okr_wizard_sessions.status = 'completed'
  AND okr_wizard_sessions.team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_team_memberships utm
    JOIN public.profiles p ON p.id = utm.user_id
    WHERE p.user_id = auth.uid()
      AND utm.team_id = okr_wizard_sessions.team_id
  )
);
