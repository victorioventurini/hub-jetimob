
-- Fix project_teams RLS policies to align with projects table
-- Bug: INSERT/DELETE only checked owner_id = my_profile_id() OR is_bu_admin,
-- missing leadership check. This caused failures when a user created a project
-- with a different owner and tried to assign teams.

DROP POLICY IF EXISTS project_teams_insert ON public.project_teams;
DROP POLICY IF EXISTS project_teams_delete ON public.project_teams;

-- INSERT: allow owner, leader of owner, or BU admin
CREATE POLICY project_teams_insert ON public.project_teams
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_teams.project_id
        AND is_current_bu(p.bu_id)
        AND p.deleted_at IS NULL
        AND (
          p.owner_id = my_profile_id()
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
        )
    )
  );

-- DELETE: same logic
CREATE POLICY project_teams_delete ON public.project_teams
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_teams.project_id
        AND is_current_bu(p.bu_id)
        AND p.deleted_at IS NULL
        AND (
          p.owner_id = my_profile_id()
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
        )
    )
  );
