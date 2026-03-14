-- Refactoring Wave: Add indexes for log tables with high seq_scan counts
-- ai_agent_logs: 563 seq_scans, 4.4M seq_tup_read
-- cron_execution_logs: 564 seq_scans, 1.3M seq_tup_read

CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_created_at 
ON public.ai_agent_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_execution_logs_created_at 
ON public.cron_execution_logs (created_at DESC);