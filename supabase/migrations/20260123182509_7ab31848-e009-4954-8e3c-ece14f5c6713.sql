-- Migration: Cleanup imediato de logs antigos
-- @see docs/audits/SYSTEMIC_HEALTH_ANALYSIS_2026-01-23.md

-- ai_agent_logs: manter últimos 14 dias
DELETE FROM public.ai_agent_logs 
WHERE created_at < NOW() - INTERVAL '14 days';

-- cron_execution_logs: manter últimos 7 dias
DELETE FROM public.cron_execution_logs 
WHERE created_at < NOW() - INTERVAL '7 days';

-- perf_metrics_snapshots: manter últimos 14 dias (usa collected_at)
DELETE FROM public.perf_metrics_snapshots 
WHERE collected_at < NOW() - INTERVAL '14 days';