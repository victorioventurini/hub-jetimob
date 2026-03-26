
-- Update projects RLS policies to include leader hierarchy

-- DROP and recreate UPDATE policy
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE
  USING (
    is_current_bu(bu_id) AND (
      owner_id = my_profile_id()
      OR is_bu_admin(auth.uid(), bu_id)
      OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
    )
  )
  WITH CHECK (is_current_bu(bu_id));

-- DROP and recreate DELETE policy
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE
  USING (
    is_current_bu(bu_id) AND (
      owner_id = my_profile_id()
      OR is_bu_admin(auth.uid(), bu_id)
      OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
    )
  );

-- DROP and recreate INSERT policy to allow creating projects for subordinates
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT
  WITH CHECK (
    is_current_bu(bu_id) AND (
      owner_id = my_profile_id()
      OR is_bu_admin(auth.uid(), bu_id)
      OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
    )
  );

-- Update project_milestones policies
DROP POLICY IF EXISTS "project_milestones_insert" ON public.project_milestones;
CREATE POLICY "project_milestones_insert" ON public.project_milestones
  FOR INSERT
  WITH CHECK (
    is_current_bu(bu_id) AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones.project_id
        AND p.bu_id = bu_id
        AND p.deleted_at IS NULL
        AND (
          p.owner_id = my_profile_id()
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
        )
    )
  );

DROP POLICY IF EXISTS "project_milestones_update" ON public.project_milestones;
CREATE POLICY "project_milestones_update" ON public.project_milestones
  FOR UPDATE
  USING (
    is_current_bu(bu_id) AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones.project_id
        AND p.bu_id = bu_id
        AND p.deleted_at IS NULL
        AND (
          p.owner_id = my_profile_id()
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
        )
    )
  )
  WITH CHECK (is_current_bu(bu_id));

DROP POLICY IF EXISTS "project_milestones_delete" ON public.project_milestones;
CREATE POLICY "project_milestones_delete" ON public.project_milestones
  FOR DELETE
  USING (
    is_current_bu(bu_id) AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones.project_id
        AND p.bu_id = bu_id
        AND p.deleted_at IS NULL
        AND (
          p.owner_id = my_profile_id()
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
        )
    )
  );

-- Update project_krs policies
DROP POLICY IF EXISTS "project_krs_insert" ON public.project_krs;
CREATE POLICY "project_krs_insert" ON public.project_krs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_krs.project_id
        AND is_current_bu(p.bu_id)
        AND p.deleted_at IS NULL
        AND (
          p.owner_id = my_profile_id()
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
        )
    )
  );

DROP POLICY IF EXISTS "project_krs_delete" ON public.project_krs;
CREATE POLICY "project_krs_delete" ON public.project_krs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_krs.project_id
        AND is_current_bu(p.bu_id)
        AND p.deleted_at IS NULL
        AND (
          p.owner_id = my_profile_id()
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
        )
    )
  );
