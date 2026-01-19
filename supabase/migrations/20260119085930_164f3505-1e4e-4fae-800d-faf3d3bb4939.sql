-- =====================================================
-- P1: Índices para Performance em Tabelas de Logs
-- =====================================================
-- Baseado em análise de seq_scan alto em tabelas de alto volume

-- 1. ai_agent_logs: 82k rows, 550 seq_scans
-- Usado para: consultas por bu_id, cleanup por created_at
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_created_at_bu 
ON ai_agent_logs(created_at DESC, bu_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_bu_created 
ON ai_agent_logs(bu_id, created_at DESC);

-- 2. cron_execution_logs: 14k rows, 555 seq_scans
-- Usado para: consultas por ran_at, status
CREATE INDEX IF NOT EXISTS idx_cron_execution_logs_ran_at 
ON cron_execution_logs(ran_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_execution_logs_status_ran 
ON cron_execution_logs(status, ran_at DESC);

-- 3. perf_metrics_snapshots: 5.5k rows, 122 seq_scans
-- Usa collected_at (não created_at)
CREATE INDEX IF NOT EXISTS idx_perf_metrics_snapshots_collected 
ON perf_metrics_snapshots(collected_at DESC);

-- =====================================================
-- Comentários para documentação
-- =====================================================
COMMENT ON INDEX idx_ai_agent_logs_created_at_bu IS 'Otimiza cleanup e queries por data/BU (P1 Performance 2026-01-19)';
COMMENT ON INDEX idx_ai_agent_logs_bu_created IS 'Otimiza queries de logs por BU específica';
COMMENT ON INDEX idx_cron_execution_logs_ran_at IS 'Otimiza consultas de histórico de CRON';
COMMENT ON INDEX idx_cron_execution_logs_status_ran IS 'Otimiza consultas de execuções por status';
COMMENT ON INDEX idx_perf_metrics_snapshots_collected IS 'Otimiza cleanup de snapshots antigos';