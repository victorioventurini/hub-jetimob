-- =============================================================================
-- P1: Política de Retenção audit_logs (180 dias) + Função Consolidada
-- TCR v2.63.0 → v2.64.0
-- =============================================================================

-- 1. Dropar versão antiga da função (4 params)
DROP FUNCTION IF EXISTS public.cleanup_old_logs(integer, integer, integer, integer);

-- 2. Criar nova versão com audit_logs (5 params)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs(
  p_agent_logs_days integer DEFAULT 14, 
  p_perf_days integer DEFAULT 14, 
  p_cron_days integer DEFAULT 7, 
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
  -- ai_agent_logs: 14 dias (default)
  WITH deleted AS (
    DELETE FROM public.ai_agent_logs
    WHERE created_at < NOW() - (p_agent_logs_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_ai_logs_deleted FROM deleted;
  
  -- perf_metrics_snapshots: 14 dias (default)
  WITH deleted AS (
    DELETE FROM public.perf_metrics_snapshots
    WHERE collected_at < NOW() - (p_perf_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_perf_deleted FROM deleted;
  
  -- cron_execution_logs: 7 dias (default)
  WITH deleted AS (
    DELETE FROM public.cron_execution_logs
    WHERE ran_at < NOW() - (p_cron_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_cron_deleted FROM deleted;
  
  -- okr_wizard_sessions: 30 dias (default)
  WITH deleted AS (
    DELETE FROM public.okr_wizard_sessions
    WHERE completed_at IS NOT NULL 
      AND completed_at < NOW() - (p_wizard_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_wizard_deleted FROM deleted;
  
  -- audit_logs: 180 dias (default - NOVO!)
  WITH deleted AS (
    DELETE FROM public.audit_logs
    WHERE created_at < NOW() - (p_audit_logs_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_audit_deleted FROM deleted;
  
  -- Retornar resultados
  RETURN QUERY 
  SELECT 'ai_agent_logs'::TEXT, v_ai_logs_deleted
  UNION ALL
  SELECT 'perf_metrics_snapshots'::TEXT, v_perf_deleted
  UNION ALL
  SELECT 'cron_execution_logs'::TEXT, v_cron_deleted
  UNION ALL
  SELECT 'okr_wizard_sessions'::TEXT, v_wizard_deleted
  UNION ALL
  SELECT 'audit_logs'::TEXT, v_audit_deleted;
END;
$function$;

-- 3. Adicionar comentário explicativo
COMMENT ON FUNCTION public.cleanup_old_logs(integer, integer, integer, integer, integer) IS 
'Função centralizada de cleanup de logs. 
Executada semanalmente via pg_cron (domingo 03:00 UTC).
Tabelas: ai_agent_logs (14d), perf_metrics_snapshots (14d), 
cron_execution_logs (7d), okr_wizard_sessions (30d), audit_logs (180d).';