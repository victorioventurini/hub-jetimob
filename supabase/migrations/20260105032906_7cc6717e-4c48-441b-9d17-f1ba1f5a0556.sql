-- Phase 1: Database Extensions for Shared OKRs

-- 1.1 Add team context to check-ins
ALTER TABLE public.okr_checkins 
ADD COLUMN team_id uuid REFERENCES public.teams(id);

-- Add index for performance
CREATE INDEX idx_okr_checkins_team_id ON public.okr_checkins(team_id);

-- 1.2 Create view for shared OKRs summary
CREATE OR REPLACE VIEW public.v_shared_okrs_summary AS
SELECT 
  o.id,
  o.title,
  o.description,
  o.status,
  o.team_id as primary_team_id,
  pt.name as primary_team_name,
  o.is_shared,
  o.responsibility_model,
  o.org_objective_id,
  o.cycle_id,
  o.bu_id,
  o.created_at,
  o.updated_at,
  ARRAY_AGG(DISTINCT c.team_id) FILTER (WHERE c.team_id IS NOT NULL) as contributing_team_ids,
  ARRAY_AGG(DISTINCT ct.name) FILTER (WHERE ct.name IS NOT NULL) as contributing_team_names,
  (COUNT(DISTINCT c.team_id) FILTER (WHERE c.team_id IS NOT NULL) + 1) as total_teams_count
FROM public.okr_team_objectives o
LEFT JOIN public.teams pt ON o.team_id = pt.id
LEFT JOIN public.okr_team_objective_contributors c ON o.id = c.objective_id
LEFT JOIN public.teams ct ON c.team_id = ct.id
WHERE o.deleted_at IS NULL AND o.is_shared = true
GROUP BY o.id, pt.name;

-- 1.3 Create view for team contributed objectives (where team is contributor, not primary)
CREATE OR REPLACE VIEW public.v_team_contributed_okrs AS
SELECT 
  o.id as objective_id,
  o.title,
  o.description,
  o.status,
  o.team_id as primary_team_id,
  pt.name as primary_team_name,
  o.is_shared,
  o.responsibility_model,
  o.org_objective_id,
  o.cycle_id,
  o.bu_id,
  c.team_id as contributor_team_id,
  ct.name as contributor_team_name,
  o.created_at,
  o.updated_at
FROM public.okr_team_objectives o
INNER JOIN public.okr_team_objective_contributors c ON o.id = c.objective_id
LEFT JOIN public.teams pt ON o.team_id = pt.id
LEFT JOIN public.teams ct ON c.team_id = ct.id
WHERE o.deleted_at IS NULL AND o.is_shared = true;

-- RLS for the views (views inherit from base tables, but we add explicit policies)
-- Note: Views automatically respect RLS of underlying tables