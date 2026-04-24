-- ============================================================
-- Alinhar RLS de projects e project_milestones ao Sistema V2
-- (mem://features/projects/holistic-module-architecture-v2)
--
-- Antes: políticas de mutação só liberavam owner/bu_admin/leader.
-- Depois: também liberam quem tem permission_key V2 correspondente.
--
-- Mantém isolamento BU (is_current_bu) e exclusões existentes.
-- ============================================================

-- ─────────── projects ───────────

DROP POLICY IF EXISTS projects_insert ON public.projects;
CREATE POLICY projects_insert
  ON public.projects
  FOR INSERT
  WITH CHECK (
    is_current_bu(bu_id)
    AND (
      owner_id = my_profile_id()
      OR is_bu_admin(auth.uid(), bu_id)
      OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
      OR has_permission(my_profile_id(), bu_id, 'projects.project.create:bu')
    )
  );

DROP POLICY IF EXISTS projects_update ON public.projects;
CREATE POLICY projects_update
  ON public.projects
  FOR UPDATE
  USING (
    is_current_bu(bu_id)
    AND (
      owner_id = my_profile_id()
      OR is_bu_admin(auth.uid(), bu_id)
      OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
      OR has_permission(my_profile_id(), bu_id, 'projects.project.update:bu')
    )
  )
  WITH CHECK (
    profile_has_bu_access(my_profile_id(), bu_id)
    AND (
      owner_id = my_profile_id()
      OR is_bu_admin(auth.uid(), bu_id)
      OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
      OR has_permission(my_profile_id(), bu_id, 'projects.project.update:bu')
    )
  );

DROP POLICY IF EXISTS projects_delete ON public.projects;
CREATE POLICY projects_delete
  ON public.projects
  FOR DELETE
  USING (
    is_current_bu(bu_id)
    AND (
      owner_id = my_profile_id()
      OR is_bu_admin(auth.uid(), bu_id)
      OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
      OR has_permission(my_profile_id(), bu_id, 'projects.project.delete:bu')
    )
  );

-- ─────────── project_milestones ───────────

DROP POLICY IF EXISTS project_milestones_insert ON public.project_milestones;
CREATE POLICY project_milestones_insert
  ON public.project_milestones
  FOR INSERT
  WITH CHECK (
    is_current_bu(bu_id)
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_milestones.project_id
        AND p.bu_id = project_milestones.bu_id
        AND p.deleted_at IS NULL
        AND (
          p.owner_id = my_profile_id()
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
          OR has_permission(my_profile_id(), p.bu_id, 'projects.milestone.create:bu')
        )
    )
  );

DROP POLICY IF EXISTS project_milestones_update ON public.project_milestones;
CREATE POLICY project_milestones_update
  ON public.project_milestones
  FOR UPDATE
  USING (
    is_current_bu(bu_id)
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_milestones.project_id
        AND p.bu_id = project_milestones.bu_id
        AND p.deleted_at IS NULL
        AND (
          p.owner_id = my_profile_id()
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
          OR has_permission(my_profile_id(), p.bu_id, 'projects.milestone.update:bu')
        )
    )
  )
  WITH CHECK (is_current_bu(bu_id));

DROP POLICY IF EXISTS project_milestones_delete ON public.project_milestones;
CREATE POLICY project_milestones_delete
  ON public.project_milestones
  FOR DELETE
  USING (
    is_current_bu(bu_id)
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_milestones.project_id
        AND p.bu_id = project_milestones.bu_id
        AND p.deleted_at IS NULL
        AND (
          p.owner_id = my_profile_id()
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
          OR has_permission(my_profile_id(), p.bu_id, 'projects.milestone.delete:bu')
        )
    )
  );
