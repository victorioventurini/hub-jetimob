-- Expor evaluation_short_code na view agregada para o framework hidratar o estado da coleta sem RPC extra.
DROP VIEW IF EXISTS public.v_ritual_evaluation_summary;
CREATE VIEW public.v_ritual_evaluation_summary
WITH (security_invoker = true) AS
SELECT
  s.id                                                  AS session_id,
  s.bu_id,
  s.wizard_type,
  s.team_id,
  s.cycle_id,
  s.evaluation_short_code,
  s.evaluation_open_at,
  s.evaluation_closed_at,
  s.completed_at,
  COUNT(r.id)                                           AS response_count,
  ROUND(AVG(r.score_value)::numeric,     2)             AS avg_value,
  ROUND(AVG(r.score_quality)::numeric,   2)             AS avg_quality,
  ROUND(AVG(r.score_decisions)::numeric, 2)             AS avg_decisions,
  ROUND(AVG(r.score_time)::numeric,      2)             AS avg_time,
  (SELECT COUNT(*) FROM public.ritual_session_attendance a
     WHERE a.session_id = s.id AND a.is_present AND a.deleted_at IS NULL) AS expected_count
FROM public.okr_wizard_sessions s
LEFT JOIN public.ritual_evaluation_responses r
  ON r.session_id = s.id AND r.deleted_at IS NULL
GROUP BY s.id;