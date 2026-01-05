-- Recreate the view without security definer (use invoker's permissions)
DROP VIEW IF EXISTS public.v_pending_checkins;

CREATE VIEW public.v_pending_checkins 
WITH (security_invoker = true) AS
SELECT 
  kr.id as kr_id,
  kr.title as kr_title,
  kr.owner_user_id,
  kr.co_responsibles,
  kr.team_id,
  kr.current_value,
  kr.target,
  kr.baseline,
  kr.direction,
  kr.unit,
  kr.status,
  kr.last_checkin_at,
  t.name as team_name,
  t.checkin_frequency,
  t.checkin_day,
  t.checkin_deadline_hour,
  obj.title as objective_title,
  obj.id as objective_id,
  CASE 
    WHEN kr.last_checkin_at IS NULL THEN true
    WHEN t.checkin_frequency = 'weekly' AND kr.last_checkin_at < (CURRENT_DATE - INTERVAL '7 days') THEN true
    WHEN t.checkin_frequency = 'biweekly' AND kr.last_checkin_at < (CURRENT_DATE - INTERVAL '14 days') THEN true
    ELSE false
  END as is_overdue,
  CASE 
    WHEN kr.last_checkin_at IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM (CURRENT_TIMESTAMP - kr.last_checkin_at))::integer
  END as days_since_checkin
FROM okr_team_key_results kr
JOIN teams t ON t.id = kr.team_id
LEFT JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
WHERE kr.deleted_at IS NULL 
  AND kr.status != 'not_started'
  AND t.deleted_at IS NULL;

GRANT SELECT ON public.v_pending_checkins TO authenticated;