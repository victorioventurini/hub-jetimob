-- Correção: v_pending_checkins deve excluir KRs e objetivos cancelados
DROP VIEW IF EXISTS public.v_pending_checkins;

CREATE VIEW public.v_pending_checkins AS
SELECT 
  kr.id AS kr_id,
  kr.title AS kr_title,
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
  t.name AS team_name,
  t.checkin_frequency,
  t.checkin_day,
  t.checkin_deadline_hour,
  obj.title AS objective_title,
  obj.id AS objective_id,
  CASE
    WHEN kr.last_checkin_at IS NULL THEN true
    WHEN t.checkin_frequency = 'weekly' AND kr.last_checkin_at < (CURRENT_DATE - INTERVAL '7 days') THEN true
    WHEN t.checkin_frequency = 'biweekly' AND kr.last_checkin_at < (CURRENT_DATE - INTERVAL '14 days') THEN true
    ELSE false
  END AS is_overdue,
  CASE
    WHEN kr.last_checkin_at IS NULL THEN NULL
    ELSE EXTRACT(day FROM CURRENT_TIMESTAMP - kr.last_checkin_at)::integer
  END AS days_since_checkin
FROM okr_team_key_results kr
JOIN teams t ON t.id = kr.team_id
LEFT JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
WHERE kr.deleted_at IS NULL
  AND kr.cancelled_at IS NULL                    -- NOVO: excluir KRs cancelados
  AND kr.status <> 'not_started'
  AND t.deleted_at IS NULL
  AND (obj.id IS NULL OR (                        -- NOVO: objetivo não-cancelado (se existir)
    obj.deleted_at IS NULL 
    AND obj.cancelled_at IS NULL 
    AND obj.status <> 'cancelled'
  ));

-- Adicionar comentário explicativo
COMMENT ON VIEW public.v_pending_checkins IS 'Lista KRs pendentes de check-in, excluindo itens deletados e cancelados (KRs e objetivos)';