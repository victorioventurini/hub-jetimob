ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS co_leader_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.teams.co_leader_user_id IS 'Co-líder do time (profiles.id). Tem as mesmas permissões do líder, sem substituí-lo.';
CREATE INDEX IF NOT EXISTS idx_teams_co_leader ON public.teams(co_leader_user_id) WHERE co_leader_user_id IS NOT NULL;

DO $$
DECLARE r record; d text;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('is_user_leader','get_leader_teams_for_impersonation','is_team_leader_by_profile','get_manageable_teams','user_can_create_kpi','get_okr_manageable_team_ids','get_leader_teams','user_can_manage_kpi','get_okr_manageable_team_ids_for_impersonation','is_team_leader')
  LOOP
    d := pg_get_functiondef(r.oid);
    d := regexp_replace(d, 't\.leader_user_id = (\w+)', '\1 IN (t.leader_user_id, t.co_leader_user_id)', 'g');
    d := regexp_replace(d, 'WHERE leader_user_id = (\w+)', 'WHERE \1 IN (leader_user_id, co_leader_user_id)', 'g');
    d := replace(d, 'p.id = t.leader_user_id', 'p.id IN (t.leader_user_id, t.co_leader_user_id)');
    EXECUTE d;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Leaders can view team tree member sessions" ON public.okr_wizard_sessions;
CREATE POLICY "Leaders can view team tree member sessions" ON public.okr_wizard_sessions FOR SELECT TO authenticated
USING ((status = ANY (ARRAY['completed'::wizard_session_status, 'in_progress'::wizard_session_status])) AND (EXISTS ( SELECT 1
   FROM ((profiles leader_p
     JOIN teams t ON (((leader_p.id IN (t.leader_user_id, t.co_leader_user_id)) AND (t.deleted_at IS NULL))))
     JOIN profiles member_p ON ((member_p.id = okr_wizard_sessions.started_by)))
  WHERE ((leader_p.user_id = auth.uid()) AND (member_p.team_id IN ( SELECT unnest(get_descendant_team_ids(t.id)) AS unnest))))));

DROP POLICY IF EXISTS teams_update_v2 ON public.teams;
CREATE POLICY teams_update_v2 ON public.teams FOR UPDATE TO authenticated
USING (has_permission(my_profile_id(), bu_id, 'teams.team.update:bu'::text) OR (my_profile_id() IN (leader_user_id, co_leader_user_id)));

DROP POLICY IF EXISTS user_team_memberships_insert_v2 ON public.user_team_memberships;
CREATE POLICY user_team_memberships_insert_v2 ON public.user_team_memberships FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM teams t WHERE t.id = user_team_memberships.team_id AND (has_permission(my_profile_id(), t.bu_id, 'teams.team.update:bu'::text) OR my_profile_id() IN (t.leader_user_id, t.co_leader_user_id))));
DROP POLICY IF EXISTS user_team_memberships_update_v2 ON public.user_team_memberships;
CREATE POLICY user_team_memberships_update_v2 ON public.user_team_memberships FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM teams t WHERE t.id = user_team_memberships.team_id AND (has_permission(my_profile_id(), t.bu_id, 'teams.team.update:bu'::text) OR my_profile_id() IN (t.leader_user_id, t.co_leader_user_id))));
DROP POLICY IF EXISTS user_team_memberships_delete_v2 ON public.user_team_memberships;
CREATE POLICY user_team_memberships_delete_v2 ON public.user_team_memberships FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM teams t WHERE t.id = user_team_memberships.team_id AND (has_permission(my_profile_id(), t.bu_id, 'teams.team.update:bu'::text) OR my_profile_id() IN (t.leader_user_id, t.co_leader_user_id))));