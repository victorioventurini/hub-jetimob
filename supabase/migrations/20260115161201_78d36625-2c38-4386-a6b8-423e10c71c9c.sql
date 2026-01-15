-- ==============================================================
-- FIX 1: Enable RLS on perf_metrics_snapshots
-- This table stores performance monitoring data collected by cron-dispatcher
-- RLS will prevent public access while allowing service role operations
-- ==============================================================

ALTER TABLE public.perf_metrics_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can read (via cron-dispatcher)
-- No authenticated user should access this directly - it's operational data
CREATE POLICY "perf_metrics_snapshots_deny_all"
  ON public.perf_metrics_snapshots
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Note: Service role bypasses RLS, so cron-dispatcher will continue working

-- ==============================================================
-- FIX 2: Convert v_pending_checkins to SECURITY INVOKER
-- This view shows pending OKR checkins - must respect RLS
-- ==============================================================

DROP VIEW IF EXISTS public.v_pending_checkins;

CREATE VIEW public.v_pending_checkins 
WITH (security_invoker = on)
AS
SELECT kr.id AS kr_id,
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
        WHEN t.checkin_frequency = 'weekly'::text AND kr.last_checkin_at < (CURRENT_DATE - '7 days'::interval) THEN true
        WHEN t.checkin_frequency = 'biweekly'::text AND kr.last_checkin_at < (CURRENT_DATE - '14 days'::interval) THEN true
        ELSE false
    END AS is_overdue,
    CASE
        WHEN kr.last_checkin_at IS NULL THEN NULL::integer
        ELSE EXTRACT(day FROM CURRENT_TIMESTAMP - kr.last_checkin_at)::integer
    END AS days_since_checkin
FROM okr_team_key_results kr
JOIN teams t ON t.id = kr.team_id
LEFT JOIN okr_team_objectives obj ON obj.id = kr.team_objective_id
WHERE kr.deleted_at IS NULL 
  AND kr.cancelled_at IS NULL 
  AND kr.status <> 'not_started'::okr_rag_status 
  AND t.deleted_at IS NULL 
  AND (obj.id IS NULL OR obj.deleted_at IS NULL AND obj.cancelled_at IS NULL AND obj.status <> 'cancelled'::okr_status);

-- ==============================================================
-- FIX 3: Convert v_shared_okrs_summary to SECURITY INVOKER
-- This view shows shared OKR objectives - must respect RLS
-- ==============================================================

DROP VIEW IF EXISTS public.v_shared_okrs_summary;

CREATE VIEW public.v_shared_okrs_summary 
WITH (security_invoker = on)
AS
SELECT o.id AS objective_id,
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

-- ==============================================================
-- FIX 4: Convert v_team_contributed_okrs to SECURITY INVOKER
-- This view shows OKRs with team contributions - must respect RLS
-- ==============================================================

DROP VIEW IF EXISTS public.v_team_contributed_okrs;

CREATE VIEW public.v_team_contributed_okrs 
WITH (security_invoker = on)
AS
SELECT c.team_id AS contributor_team_id,
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
FROM okr_team_objectives o
JOIN okr_team_objective_contributors c ON o.id = c.objective_id
LEFT JOIN teams pt ON o.team_id = pt.id
LEFT JOIN teams ct ON c.team_id = ct.id
WHERE o.deleted_at IS NULL 
  AND o.cancelled_at IS NULL 
  AND o.status <> 'cancelled'::okr_status 
  AND o.is_shared = true;