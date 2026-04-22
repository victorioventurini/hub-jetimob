
-- ============================================================================
-- W1 — Performance: drop unused indexes + retention defaults + VACUUM
-- ============================================================================

-- 1. DROP de índices não utilizados (idx_scan = 0 confirmado em pg_stat_user_indexes)
--    Mantemos PKs e UNIQUE constraints. Removemos somente índices secundários sem uso.

DROP INDEX IF EXISTS public.idx_cron_execution_logs_created_at;
DROP INDEX IF EXISTS public.idx_okr_audit_log_created_at;
DROP INDEX IF EXISTS public.idx_asset_recommendations_job_titles;
DROP INDEX IF EXISTS public.idx_job_titles_active;
DROP INDEX IF EXISTS public.idx_partner_bu_assoc_supervisors;
DROP INDEX IF EXISTS public.idx_asset_recommendations_teams;
DROP INDEX IF EXISTS public.idx_partner_bu_assoc_supervisor_contacts;
DROP INDEX IF EXISTS public.idx_asset_phone_lines_responsible_team_id;
DROP INDEX IF EXISTS public.idx_okr_wizard_sessions_type_struct_version;
DROP INDEX IF EXISTS public.idx_partner_companies_document_unique;
DROP INDEX IF EXISTS public.idx_kpi_values_unique_period;
DROP INDEX IF EXISTS public.idx_kpi_values_rag_alerts;
DROP INDEX IF EXISTS public.idx_kpi_metrics_bu_status;
DROP INDEX IF EXISTS public.idx_kpi_metrics_category_bu;
DROP INDEX IF EXISTS public.idx_kpi_metrics_category;
DROP INDEX IF EXISTS public.idx_kpi_metrics_status;
DROP INDEX IF EXISTS public.idx_kpi_values_reference_date;
DROP INDEX IF EXISTS public.idx_project_comments_bu_id;

-- 2. Atualizar defaults de retenção em cleanup_old_logs
--    perf_metrics_snapshots: 30 dias
--    cron_execution_logs: 14 dias
--    ai_agent_logs: 60 dias
--    audit_logs: 180 dias
--    okr_wizard_sessions: 30 dias

CREATE OR REPLACE FUNCTION public.cleanup_old_logs(
  p_agent_logs_days integer DEFAULT 60,
  p_perf_days integer DEFAULT 30,
  p_cron_days integer DEFAULT 14,
  p_wizard_days integer DEFAULT 30,
  p_audit_logs_days integer DEFAULT 180
)
RETURNS TABLE(table_name text, rows_deleted bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ai_logs_deleted BIGINT := 0;
  v_perf_deleted BIGINT := 0;
  v_cron_deleted BIGINT := 0;
  v_wizard_deleted BIGINT := 0;
  v_audit_deleted BIGINT := 0;
BEGIN
  WITH deleted AS (
    DELETE FROM public.ai_agent_logs
    WHERE created_at < NOW() - (p_agent_logs_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_ai_logs_deleted FROM deleted;

  WITH deleted AS (
    DELETE FROM public.perf_metrics_snapshots
    WHERE collected_at < NOW() - (p_perf_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_perf_deleted FROM deleted;

  WITH deleted AS (
    DELETE FROM public.cron_execution_logs
    WHERE ran_at < NOW() - (p_cron_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_cron_deleted FROM deleted;

  WITH deleted AS (
    DELETE FROM public.okr_wizard_sessions
    WHERE COALESCE(updated_at, created_at) < NOW() - (p_wizard_days || ' days')::INTERVAL
      AND status IN ('draft', 'abandoned')
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_wizard_deleted FROM deleted;

  WITH deleted AS (
    DELETE FROM public.audit_logs
    WHERE created_at < NOW() - (p_audit_logs_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_audit_deleted FROM deleted;

  RETURN QUERY VALUES
    ('ai_agent_logs'::text,           v_ai_logs_deleted),
    ('perf_metrics_snapshots'::text,  v_perf_deleted),
    ('cron_execution_logs'::text,     v_cron_deleted),
    ('okr_wizard_sessions'::text,     v_wizard_deleted),
    ('audit_logs'::text,              v_audit_deleted);
END;
$function$;

-- 3. Executar limpeza imediata com novas janelas (libera 100+ MB)
SELECT * FROM public.cleanup_old_logs();

-- 4. VACUUM ANALYZE não pode ser feito dentro de transação — autovacuum cuidará após DELETE.
--    Forçamos ANALYZE nas tabelas afetadas para atualizar estatísticas:
ANALYZE public.ai_agent_logs;
ANALYZE public.perf_metrics_snapshots;
ANALYZE public.cron_execution_logs;
ANALYZE public.okr_wizard_sessions;
ANALYZE public.audit_logs;
ANALYZE public.kpi_metrics;
ANALYZE public.ai_agents;
ANALYZE public.tickets;
ANALYZE public.profiles;
ANALYZE public.okr_team_key_results;
ANALYZE public.permission_catalog;
ANALYZE public.bu_user_memberships;
