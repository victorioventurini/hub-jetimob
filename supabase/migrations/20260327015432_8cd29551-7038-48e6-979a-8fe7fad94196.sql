-- Junction table: milestone ↔ KR (mirrors project_krs pattern)
CREATE TABLE public.milestone_krs (
  milestone_id uuid NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  key_result_id uuid NOT NULL REFERENCES public.okr_team_key_results(id) ON DELETE CASCADE,
  impact public.project_impact NOT NULL DEFAULT 'medium'::public.project_impact,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (milestone_id, key_result_id)
);

-- Enable RLS
ALTER TABLE public.milestone_krs ENABLE ROW LEVEL SECURITY;

-- SELECT: BU-scoped via milestone → project join, same as project_krs
CREATE POLICY "milestone_krs_select"
  ON public.milestone_krs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM project_milestones pm
      JOIN projects p ON p.id = pm.project_id
      WHERE pm.id = milestone_krs.milestone_id
        AND is_current_bu(p.bu_id)
        AND p.deleted_at IS NULL
    )
  );

-- INSERT: owner OR bu_admin OR leader of project owner
CREATE POLICY "milestone_krs_insert"
  ON public.milestone_krs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM project_milestones pm
      JOIN projects p ON p.id = pm.project_id
      WHERE pm.id = milestone_krs.milestone_id
        AND is_current_bu(p.bu_id)
        AND p.deleted_at IS NULL
        AND (
          p.owner_id = my_profile_id()
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
        )
    )
  );

-- DELETE: same as insert
CREATE POLICY "milestone_krs_delete"
  ON public.milestone_krs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM project_milestones pm
      JOIN projects p ON p.id = pm.project_id
      WHERE pm.id = milestone_krs.milestone_id
        AND is_current_bu(p.bu_id)
        AND p.deleted_at IS NULL
        AND (
          p.owner_id = my_profile_id()
          OR is_bu_admin(auth.uid(), p.bu_id)
          OR is_leader_of_project_owner(my_profile_id(), p.owner_id, p.bu_id)
        )
    )
  );

-- Index for reverse lookup (KR → milestones)
CREATE INDEX idx_milestone_krs_kr ON public.milestone_krs(key_result_id);