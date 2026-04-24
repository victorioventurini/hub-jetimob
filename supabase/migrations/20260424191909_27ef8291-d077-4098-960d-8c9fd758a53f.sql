-- ============================================================
-- Realinhar autorização do módulo Projects à regra canônica:
--   ALLOW IF
--     is_super_admin                        -- wildcard global
--     OR is_bu_admin                        -- admin da BU
--     OR owner_id = my_profile_id()         -- responsável
--     OR is_leader_of_project_owner(...)    -- líder do responsável
--     OR has_permission(... ':bu')          -- permission key V2
--   AND is_current_bu(bu_id)                -- isolamento BU
--
-- Remove o WITH CHECK = profile_has_bu_access(...) que conflitava
-- com o wildcard global do super_admin.
-- ============================================================

-- ─────────── projects ───────────

DROP POLICY IF EXISTS projects_insert ON public.projects;
CREATE POLICY projects_insert
  ON public.projects
  FOR INSERT
  WITH CHECK (
    is_current_bu(bu_id)
    AND (
      is_super_admin(auth.uid())
      OR is_bu_admin(auth.uid(), bu_id)
      OR owner_id = my_profile_id()
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
      is_super_admin(auth.uid())
      OR is_bu_admin(auth.uid(), bu_id)
      OR owner_id = my_profile_id()
      OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
      OR has_permission(my_profile_id(), bu_id, 'projects.project.update:bu')
    )
  )
  WITH CHECK (
    is_current_bu(bu_id)
    AND (
      is_super_admin(auth.uid())
      OR is_bu_admin(auth.uid(), bu_id)
      OR owner_id = my_profile_id()
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
      is_super_admin(auth.uid())
      OR is_bu_admin(auth.uid(), bu_id)
      OR owner_id = my_profile_id()
      OR is_leader_of_project_owner(my_profile_id(), owner_id, bu_id)
      OR has_permission(my_profile_id(), bu_id, 'projects.project.delete:bu')
    )
  );

-- ─────────── project_teams (herda regra do projeto pai) ───────────

DROP POLICY IF EXISTS project_teams_insert ON public.project_teams;
CREATE POLICY project_teams_insert
  ON public.project_teams
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_teams.project_id
        AND is_current_bu(p.bu_id)
        AND p.deleted_at IS NULL
        AND (
          is_super_admin(auth.uid())
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR p.owner_id = my_profile_id()
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
          OR has_permission(my_profile_id(), p.bu_id, 'projects.project.update:bu')
        )
    )
  );

DROP POLICY IF EXISTS project_teams_delete ON public.project_teams;
CREATE POLICY project_teams_delete
  ON public.project_teams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_teams.project_id
        AND is_current_bu(p.bu_id)
        AND p.deleted_at IS NULL
        AND (
          is_super_admin(auth.uid())
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR p.owner_id = my_profile_id()
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
          OR has_permission(my_profile_id(), p.bu_id, 'projects.project.update:bu')
        )
    )
  );

-- ─────────── project_krs (herda regra do projeto pai) ───────────

DROP POLICY IF EXISTS project_krs_insert ON public.project_krs;
CREATE POLICY project_krs_insert
  ON public.project_krs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_krs.project_id
        AND is_current_bu(p.bu_id)
        AND p.deleted_at IS NULL
        AND (
          is_super_admin(auth.uid())
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR p.owner_id = my_profile_id()
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
          OR has_permission(my_profile_id(), p.bu_id, 'projects.project.update:bu')
        )
    )
  );

DROP POLICY IF EXISTS project_krs_delete ON public.project_krs;
CREATE POLICY project_krs_delete
  ON public.project_krs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_krs.project_id
        AND is_current_bu(p.bu_id)
        AND p.deleted_at IS NULL
        AND (
          is_super_admin(auth.uid())
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR p.owner_id = my_profile_id()
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
          OR has_permission(my_profile_id(), p.bu_id, 'projects.project.update:bu')
        )
    )
  );
