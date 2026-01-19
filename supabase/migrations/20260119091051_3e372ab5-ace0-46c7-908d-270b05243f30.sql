-- =============================================================================
-- FASE 1: Políticas de Retenção para Tabelas de Logs
-- =============================================================================

-- 1. Função genérica para limpeza de logs antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS TABLE(
  table_name TEXT,
  rows_deleted BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ai_logs_deleted BIGINT := 0;
  v_perf_deleted BIGINT := 0;
  v_cron_deleted BIGINT := 0;
BEGIN
  -- ai_agent_logs: manter últimos 30 dias
  WITH deleted AS (
    DELETE FROM public.ai_agent_logs
    WHERE created_at < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_ai_logs_deleted FROM deleted;
  
  -- perf_metrics_snapshots: manter últimos 14 dias
  WITH deleted AS (
    DELETE FROM public.perf_metrics_snapshots
    WHERE collected_at < NOW() - INTERVAL '14 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_perf_deleted FROM deleted;
  
  -- cron_execution_logs: manter últimos 7 dias
  WITH deleted AS (
    DELETE FROM public.cron_execution_logs
    WHERE ran_at < NOW() - INTERVAL '7 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_cron_deleted FROM deleted;
  
  -- Retornar resultados
  RETURN QUERY 
  SELECT 'ai_agent_logs'::TEXT, v_ai_logs_deleted
  UNION ALL
  SELECT 'perf_metrics_snapshots'::TEXT, v_perf_deleted
  UNION ALL
  SELECT 'cron_execution_logs'::TEXT, v_cron_deleted;
END;
$$;

-- 2. Adicionar comentários documentando políticas de retenção
COMMENT ON TABLE public.ai_agent_logs IS 'Logs de execução de agentes IA. Retenção: 30 dias.';
COMMENT ON TABLE public.perf_metrics_snapshots IS 'Snapshots de métricas de performance. Retenção: 14 dias.';
COMMENT ON TABLE public.cron_execution_logs IS 'Logs de execução de cron jobs. Retenção: 7 dias.';

-- 3. Executar limpeza inicial
SELECT * FROM public.cleanup_old_logs();