DROP VIEW IF EXISTS public.v_shared_okrs_summary;

CREATE VIEW public.v_shared_okrs_summary
WITH (security_invoker = on) AS
SELECT
  o.id AS objective_id,
  o.bu_id,
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
  count(DISTINCT c.team_id) AS contributor_count,
  o.created_at,
  o.updated_at
FROM okr_team_objectives o
LEFT JOIN teams pt ON o.team_id = pt.id
LEFT JOIN okr_team_objective_contributors c ON o.id = c.objective_id
LEFT JOIN teams ct ON c.team_id = ct.id
WHERE o.deleted_at IS NULL
  AND o.cancelled_at IS NULL
  AND o.status <> 'cancelled'::okr_status
  AND o.is_shared = true
GROUP BY o.id, pt.name;

GRANT SELECT ON public.v_shared_okrs_summary TO authenticated;