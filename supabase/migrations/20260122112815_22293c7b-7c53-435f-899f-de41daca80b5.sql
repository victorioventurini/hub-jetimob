
-- ============================================================
-- Agendar cleanup semanal de logs via pg_cron
-- Executa todo domingo às 03:00 UTC
-- ============================================================

-- Agendar cleanup de logs antigos (retém 30 dias)
SELECT cron.schedule(
  'cleanup-old-logs-weekly',
  '0 3 * * 0',  -- Todo domingo às 03:00 UTC
  $$SELECT cleanup_old_logs();$$
);

-- Comentário para documentação
COMMENT ON FUNCTION cleanup_old_logs IS 'Limpa logs antigos (>30 dias) de ai_agent_logs, perf_metrics_snapshots, cron_execution_logs. Agendado via pg_cron.';
