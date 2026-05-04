-- Drop indexes (idempotent)
DROP INDEX IF EXISTS public.idx_outbox_sent_at;
DROP INDEX IF EXISTS public.idx_asset_movements_pending;
DROP INDEX IF EXISTS public.idx_kpi_target_history_bu_id;
DROP INDEX IF EXISTS public.idx_areas_bu_id;
DROP INDEX IF EXISTS public.idx_tickets_status;
DROP INDEX IF EXISTS public.idx_tickets_bu;
DROP INDEX IF EXISTS public.idx_ticket_participants_bu_ticket;
DROP INDEX IF EXISTS public.idx_ticket_messages_pinned;
DROP INDEX IF EXISTS public.idx_kpi_metrics_responsible_area;
DROP INDEX IF EXISTS public.idx_okr_checkins_bu_id;
DROP INDEX IF EXISTS public.idx_kpi_contributors_bu;
DROP INDEX IF EXISTS public.idx_ai_agent_logs_created_at_bu;

-- Recria cleanup_old_logs com nova janela (drop por causa de mudança de retorno)
DROP FUNCTION IF EXISTS public.cleanup_old_logs(integer,integer,integer,integer,integer);

CREATE OR REPLACE FUNCTION public.cleanup_old_logs(
  p_agent_logs_days integer DEFAULT 60,
  p_perf_days integer DEFAULT 14,
  p_cron_days integer DEFAULT 14,
  p_wizard_days integer DEFAULT 30,
  p_audit_logs_days integer DEFAULT 180
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ai_agent_logs
   WHERE created_at < now() - make_interval(days => p_agent_logs_days);
  DELETE FROM public.perf_metrics_snapshots
   WHERE collected_at < now() - make_interval(days => p_perf_days);
  DELETE FROM public.cron_execution_logs
   WHERE created_at < now() - make_interval(days => p_cron_days);
  DELETE FROM public.okr_wizard_sessions
   WHERE updated_at < now() - make_interval(days => p_wizard_days)
     AND status IN ('draft','abandoned');
  DELETE FROM public.audit_logs
   WHERE created_at < now() - make_interval(days => p_audit_logs_days);
END;
$$;

-- Limpeza imediata
DELETE FROM public.perf_metrics_snapshots
 WHERE collected_at < now() - INTERVAL '14 days';