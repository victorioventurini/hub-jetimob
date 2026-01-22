-- =====================================================
-- BACKEND AUDIT FIX: Consolidação de Funções de Cleanup
-- Data: 2026-01-22
-- =====================================================

-- 1. Criar função UNIFICADA de cleanup com parâmetros configuráveis
CREATE OR REPLACE FUNCTION public.cleanup_old_logs(
  p_agent_logs_days INTEGER DEFAULT 14,
  p_perf_days INTEGER DEFAULT 14,
  p_cron_days INTEGER DEFAULT 7,
  p_wizard_days INTEGER DEFAULT 30
)
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
  v_wizard_deleted BIGINT := 0;
BEGIN
  -- ai_agent_logs: usar parâmetro configurável
  WITH deleted AS (
    DELETE FROM public.ai_agent_logs
    WHERE created_at < NOW() - (p_agent_logs_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_ai_logs_deleted FROM deleted;
  
  -- perf_metrics_snapshots: usar parâmetro configurável
  WITH deleted AS (
    DELETE FROM public.perf_metrics_snapshots
    WHERE collected_at < NOW() - (p_perf_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_perf_deleted FROM deleted;
  
  -- cron_execution_logs: usar parâmetro configurável
  WITH deleted AS (
    DELETE FROM public.cron_execution_logs
    WHERE ran_at < NOW() - (p_cron_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_cron_deleted FROM deleted;
  
  -- okr_wizard_sessions: usar parâmetro configurável
  WITH deleted AS (
    DELETE FROM public.okr_wizard_sessions
    WHERE completed_at IS NOT NULL 
      AND completed_at < NOW() - (p_wizard_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_wizard_deleted FROM deleted;
  
  -- Retornar resultados
  RETURN QUERY 
  SELECT 'ai_agent_logs'::TEXT, v_ai_logs_deleted
  UNION ALL
  SELECT 'perf_metrics_snapshots'::TEXT, v_perf_deleted
  UNION ALL
  SELECT 'cron_execution_logs'::TEXT, v_cron_deleted
  UNION ALL
  SELECT 'okr_wizard_sessions'::TEXT, v_wizard_deleted;
END;
$$;

-- 2. Deprecar funções redundantes (mantendo backwards compatibility por 30 dias)
-- A função cleanup_old_agent_logs agora é um wrapper
CREATE OR REPLACE FUNCTION public.cleanup_old_agent_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- DEPRECATED: Use cleanup_old_logs() instead
  -- Esta função será removida em 2026-02-22
  RAISE NOTICE 'DEPRECATED: cleanup_old_agent_logs() is deprecated. Use cleanup_old_logs() instead.';
  
  DELETE FROM ai_agent_logs 
  WHERE created_at < NOW() - INTERVAL '14 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 3. Deprecar cleanup_old_cron_logs
CREATE OR REPLACE FUNCTION public.cleanup_old_cron_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- DEPRECATED: Use cleanup_old_logs() instead
  -- Esta função será removida em 2026-02-22
  RAISE NOTICE 'DEPRECATED: cleanup_old_cron_logs() is deprecated. Use cleanup_old_logs() instead.';
  
  DELETE FROM public.cron_execution_logs 
  WHERE ran_at < NOW() - INTERVAL '7 days';
END;
$$;

-- 4. Adicionar comentários de documentação
COMMENT ON FUNCTION public.cleanup_old_logs(INTEGER, INTEGER, INTEGER, INTEGER) IS 
'Função UNIFICADA de limpeza de logs do sistema.
Parâmetros:
- p_agent_logs_days: Dias de retenção para ai_agent_logs (default: 14)
- p_perf_days: Dias de retenção para perf_metrics_snapshots (default: 14)
- p_cron_days: Dias de retenção para cron_execution_logs (default: 7)
- p_wizard_days: Dias de retenção para okr_wizard_sessions completadas (default: 30)
Criada em: 2026-01-22 | Backend Audit Fix';

COMMENT ON FUNCTION public.cleanup_old_agent_logs() IS 
'DEPRECATED: Esta função será removida em 2026-02-22. Use cleanup_old_logs() ao invés.';

COMMENT ON FUNCTION public.cleanup_old_cron_logs() IS 
'DEPRECATED: Esta função será removida em 2026-02-22. Use cleanup_old_logs() ao invés.';