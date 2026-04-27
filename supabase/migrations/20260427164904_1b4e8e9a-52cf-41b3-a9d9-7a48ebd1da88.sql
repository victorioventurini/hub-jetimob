DROP POLICY IF EXISTS project_milestones_update ON public.project_milestones;

CREATE POLICY project_milestones_update ON public.project_milestones
  FOR UPDATE
  USING (
    is_current_bu(bu_id)
    AND (
      -- Responsável da própria milestone (novo caminho v2026-04-27)
      project_milestones.owner_id = my_profile_id()
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_milestones.project_id
          AND p.bu_id = project_milestones.bu_id
          AND p.deleted_at IS NULL
          AND (
            p.owner_id = my_profile_id()
            OR is_bu_admin(auth.uid(), p.bu_id)
            OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
            OR has_permission(my_profile_id(), p.bu_id, 'projects.milestone.update:bu'::text)
          )
      )
    )
  )
  WITH CHECK ( is_current_bu(bu_id) );