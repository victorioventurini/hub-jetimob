
-- ============================================================
-- MÓDULO PROJETOS — Migration completa
-- ============================================================

-- 1. ENUMS
-- ============================================================
CREATE TYPE public.project_status AS ENUM ('planned', 'in_progress', 'paused', 'done', 'cancelled');
CREATE TYPE public.milestone_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE public.project_impact AS ENUM ('high', 'medium', 'low');

-- 2. TABELAS
-- ============================================================

-- 2.1 projects
CREATE TABLE public.projects (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  description  text,
  owner_id     uuid        NOT NULL REFERENCES public.profiles(id),
  status       public.project_status NOT NULL DEFAULT 'planned',
  start_date   date,
  due_date     date,
  external_url text,
  bu_id        uuid        NOT NULL REFERENCES public.bu_units(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

-- 2.2 project_teams (N:N projeto ↔ time)
CREATE TABLE public.project_teams (
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  team_id     uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, team_id)
);

-- 2.3 project_krs (N:N projeto ↔ KR)
CREATE TABLE public.project_krs (
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  key_result_id uuid NOT NULL REFERENCES public.okr_team_key_results(id) ON DELETE CASCADE,
  impact        public.project_impact NOT NULL DEFAULT 'medium',
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, key_result_id)
);

-- 2.4 project_milestones
CREATE TABLE public.project_milestones (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  owner_id    uuid        REFERENCES public.profiles(id),
  status      public.milestone_status NOT NULL DEFAULT 'todo',
  due_date    date,
  sort_order  integer     NOT NULL DEFAULT 0,
  bu_id       uuid        NOT NULL REFERENCES public.bu_units(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- 2.5 project_milestone_dependencies
CREATE TABLE public.project_milestone_dependencies (
  milestone_id             uuid NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  depends_on_milestone_id  uuid NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  PRIMARY KEY (milestone_id, depends_on_milestone_id),
  CONSTRAINT no_self_dependency CHECK (milestone_id <> depends_on_milestone_id)
);

-- 3. TRIGGERS
-- ============================================================

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER enforce_bu_scope_projects
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

CREATE TRIGGER enforce_bu_scope_project_milestones
  BEFORE INSERT OR UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bu_scope();

-- 4. ÍNDICES
-- ============================================================

CREATE INDEX idx_projects_bu_id ON public.projects (bu_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_owner ON public.projects (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status ON public.projects (bu_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_milestones_project ON public.project_milestones (project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_krs_kr ON public.project_krs (key_result_id);
CREATE INDEX idx_project_teams_team ON public.project_teams (team_id);

-- 5. FUNÇÃO calculate_project_health
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_project_health(p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  critical_due_date date;
  days_until_due    integer;
BEGIN
  SELECT due_date INTO critical_due_date
  FROM public.project_milestones
  WHERE project_id = p_project_id
    AND status <> 'done'
    AND deleted_at IS NULL
  ORDER BY due_date ASC NULLS LAST
  LIMIT 1;

  IF critical_due_date IS NULL THEN
    RETURN 'on_track';
  END IF;

  days_until_due := critical_due_date - CURRENT_DATE;

  IF days_until_due < 0   THEN RETURN 'late';
  ELSIF days_until_due < 7 THEN RETURN 'at_risk';
  ELSE                          RETURN 'on_track';
  END IF;
END;
$$;

-- 6. RLS
-- ============================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_krs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestone_dependencies ENABLE ROW LEVEL SECURITY;

-- 6.1 projects
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (
    user_has_bu_access(auth.uid(), bu_id)
    AND is_current_bu(bu_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_bu(bu_id)
    AND owner_id = my_profile_id()
  );

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    is_current_bu(bu_id)
    AND (owner_id = my_profile_id() OR is_bu_admin(auth.uid(), bu_id))
  )
  WITH CHECK (
    is_current_bu(bu_id)
    AND (owner_id = my_profile_id() OR is_bu_admin(auth.uid(), bu_id))
  );

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (
    is_current_bu(bu_id)
    AND (owner_id = my_profile_id() OR is_bu_admin(auth.uid(), bu_id))
  );

-- 6.2 project_teams (herda acesso do projeto pai)
CREATE POLICY "project_teams_select" ON public.project_teams
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND is_current_bu(p.bu_id)
      AND p.deleted_at IS NULL
  ));

CREATE POLICY "project_teams_insert" ON public.project_teams
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND is_current_bu(p.bu_id)
      AND p.deleted_at IS NULL
      AND (p.owner_id = my_profile_id() OR is_bu_admin(auth.uid(), p.bu_id))
  ));

CREATE POLICY "project_teams_delete" ON public.project_teams
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND is_current_bu(p.bu_id)
      AND p.deleted_at IS NULL
      AND (p.owner_id = my_profile_id() OR is_bu_admin(auth.uid(), p.bu_id))
  ));

-- 6.3 project_krs (herda acesso do projeto pai)
CREATE POLICY "project_krs_select" ON public.project_krs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND is_current_bu(p.bu_id)
      AND p.deleted_at IS NULL
  ));

CREATE POLICY "project_krs_insert" ON public.project_krs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND is_current_bu(p.bu_id)
      AND p.deleted_at IS NULL
      AND (p.owner_id = my_profile_id() OR is_bu_admin(auth.uid(), p.bu_id))
  ));

CREATE POLICY "project_krs_delete" ON public.project_krs
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND is_current_bu(p.bu_id)
      AND p.deleted_at IS NULL
      AND (p.owner_id = my_profile_id() OR is_bu_admin(auth.uid(), p.bu_id))
  ));

-- 6.4 project_milestones
CREATE POLICY "project_milestones_select" ON public.project_milestones
  FOR SELECT TO authenticated
  USING (
    user_has_bu_access(auth.uid(), bu_id)
    AND is_current_bu(bu_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "project_milestones_insert" ON public.project_milestones
  FOR INSERT TO authenticated
  WITH CHECK (
    is_current_bu(bu_id)
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.bu_id = bu_id
        AND p.deleted_at IS NULL
        AND (p.owner_id = my_profile_id() OR is_bu_admin(auth.uid(), p.bu_id))
    )
  );

CREATE POLICY "project_milestones_update" ON public.project_milestones
  FOR UPDATE TO authenticated
  USING (
    is_current_bu(bu_id)
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.bu_id = bu_id
        AND p.deleted_at IS NULL
        AND (p.owner_id = my_profile_id() OR is_bu_admin(auth.uid(), p.bu_id))
    )
  )
  WITH CHECK (
    is_current_bu(bu_id)
  );

CREATE POLICY "project_milestones_delete" ON public.project_milestones
  FOR DELETE TO authenticated
  USING (
    is_current_bu(bu_id)
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.bu_id = bu_id
        AND p.deleted_at IS NULL
        AND (p.owner_id = my_profile_id() OR is_bu_admin(auth.uid(), p.bu_id))
    )
  );

-- 6.5 project_milestone_dependencies (herda do milestone pai)
CREATE POLICY "project_milestone_deps_select" ON public.project_milestone_dependencies
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_milestones m
    WHERE m.id = milestone_id
      AND is_current_bu(m.bu_id)
      AND m.deleted_at IS NULL
  ));

CREATE POLICY "project_milestone_deps_insert" ON public.project_milestone_dependencies
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.project_milestones m
    JOIN public.projects p ON p.id = m.project_id
    WHERE m.id = milestone_id
      AND is_current_bu(m.bu_id)
      AND m.deleted_at IS NULL
      AND (p.owner_id = my_profile_id() OR is_bu_admin(auth.uid(), p.bu_id))
  ));

CREATE POLICY "project_milestone_deps_delete" ON public.project_milestone_dependencies
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_milestones m
    JOIN public.projects p ON p.id = m.project_id
    WHERE m.id = milestone_id
      AND is_current_bu(m.bu_id)
      AND m.deleted_at IS NULL
      AND (p.owner_id = my_profile_id() OR is_bu_admin(auth.uid(), p.bu_id))
  ));

-- 7. ATUALIZAR MÓDULO EXISTENTE
-- ============================================================

UPDATE public.modules
SET status = 'active', route = '/projects', icon = 'folder-kanban'
WHERE slug = 'projects';

-- 8. PERMISSION CATALOG
-- ============================================================

INSERT INTO public.permission_catalog (key, module, resource, action, scope, description, status) VALUES
  ('projects.project.read:bu', 'projects', 'project', 'read', 'bu', 'Ver projetos da BU', 'active'),
  ('projects.project.create:bu', 'projects', 'project', 'create', 'bu', 'Criar projeto na BU', 'active'),
  ('projects.project.update:self_or_owner', 'projects', 'project', 'update', 'self_or_owner', 'Editar próprio projeto', 'active'),
  ('projects.project.update:bu', 'projects', 'project', 'update', 'bu', 'Editar qualquer projeto (admin)', 'active'),
  ('projects.project.delete:self_or_owner', 'projects', 'project', 'delete', 'self_or_owner', 'Arquivar próprio projeto', 'active'),
  ('projects.milestone.read:bu', 'projects', 'milestone', 'read', 'bu', 'Ver milestones da BU', 'active'),
  ('projects.milestone.create:bu', 'projects', 'milestone', 'create', 'bu', 'Criar milestone', 'active'),
  ('projects.milestone.update:bu', 'projects', 'milestone', 'update', 'bu', 'Atualizar qualquer milestone', 'active');
