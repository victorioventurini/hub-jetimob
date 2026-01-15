-- Fix v_shared_okrs_summary and v_team_contributed_okrs to exclude cancelled items

-- 1. Drop existing views
DROP VIEW IF EXISTS public.v_shared_okrs_summary;
DROP VIEW IF EXISTS public.v_team_contributed_okrs;

-- 2. Recreate v_shared_okrs_summary with cancelled filter
CREATE OR REPLACE VIEW public.v_shared_okrs_summary AS
SELECT 
  o.id AS objective_id,
  o.title,
  o.description,
  o.year,
  o.status,
  o.team_id AS primary_team_id,
  pt.name AS primary_team_name,
  o.is_shared,
  o.responsibility_model,
  array_agg(DISTINCT c.team_id) FILTER (WHERE c.team_id IS NOT NULL) AS contributor_team_ids,
  array_agg(DISTINCT ct.name) FILTER (WHERE ct.name IS NOT NULL) AS contributor_team_names,
  COUNT(DISTINCT c.team_id) AS contributor_count,
  o.created_at,
  o.updated_at
FROM public.okr_team_objectives o
LEFT JOIN public.teams pt ON o.team_id = pt.id
LEFT JOIN public.okr_team_objective_contributors c ON o.id = c.objective_id
LEFT JOIN public.teams ct ON c.team_id = ct.id
WHERE o.deleted_at IS NULL 
  AND o.cancelled_at IS NULL
  AND o.status != 'cancelled'
  AND o.is_shared = true
GROUP BY o.id, pt.name;

COMMENT ON VIEW public.v_shared_okrs_summary IS 'Resumo de OKRs compartilhados (exclui cancelados e deletados)';

-- 3. Recreate v_team_contributed_okrs with cancelled filter
CREATE OR REPLACE VIEW public.v_team_contributed_okrs AS
SELECT 
  c.team_id AS contributor_team_id,
  ct.name AS contributor_team_name,
  o.id AS objective_id,
  o.title AS objective_title,
  o.status AS objective_status,
  o.team_id AS primary_team_id,
  pt.name AS primary_team_name,
  o.is_shared,
  o.responsibility_model,
  o.created_at,
  o.updated_at
FROM public.okr_team_objectives o
INNER JOIN public.okr_team_objective_contributors c ON o.id = c.objective_id
LEFT JOIN public.teams pt ON o.team_id = pt.id
LEFT JOIN public.teams ct ON c.team_id = ct.id
WHERE o.deleted_at IS NULL 
  AND o.cancelled_at IS NULL
  AND o.status != 'cancelled'
  AND o.is_shared = true;

COMMENT ON VIEW public.v_team_contributed_okrs IS 'OKRs onde times são contribuidores (exclui cancelados e deletados)';