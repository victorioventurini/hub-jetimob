-- ============================================================
-- Wave 1 Fix: Cleanup duplicatas e policies faltantes
-- ============================================================

-- 1. Remover função duplicada cleanup_old_logs() sem parâmetros
DROP FUNCTION IF EXISTS public.cleanup_old_logs();

-- 2. Adicionar INSERT policy em audit_logs (estava faltando!)
-- Permite INSERT de usuários autenticados (sem verificar BU, pois é log global)
CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (true);

-- 3. Executar cleanup de logs agora
-- ai_agent_logs: 14 dias, perf_metrics: 14 dias, cron_logs: 7 dias, wizard: 30 dias
DO $$
DECLARE
  v_ai_logs_deleted BIGINT := 0;
  v_perf_deleted BIGINT := 0;
  v_cron_deleted BIGINT := 0;
  v_wizard_deleted BIGINT := 0;
BEGIN
  -- ai_agent_logs: manter últimos 14 dias
  WITH deleted AS (
    DELETE FROM public.ai_agent_logs
    WHERE created_at < NOW() - INTERVAL '14 days'
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
  
  -- okr_wizard_sessions: manter últimos 30 dias (apenas completadas)
  WITH deleted AS (
    DELETE FROM public.okr_wizard_sessions
    WHERE completed_at IS NOT NULL 
      AND completed_at < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_wizard_deleted FROM deleted;
  
  RAISE NOTICE 'Cleanup results: ai_agent_logs=%, perf_metrics=%, cron_logs=%, wizard=%',
    v_ai_logs_deleted, v_perf_deleted, v_cron_deleted, v_wizard_deleted;
END $$;