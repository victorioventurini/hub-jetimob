
-- Wave 1: Higienização Crítica (Completa)

-- 1. Criar funções de retenção de logs
CREATE OR REPLACE FUNCTION public.cleanup_old_agent_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM ai_agent_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_cron_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM cron_execution_logs 
  WHERE executed_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 2. Criar índice para notification_outbox (processamento)
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status_pending 
ON notification_outbox(status, next_retry_at) 
WHERE status IN ('pending', 'processing');

-- 3. Comentários de documentação
COMMENT ON FUNCTION cleanup_old_agent_logs() IS 'Remove logs de agentes IA com mais de 90 dias. Executar via cron semanal.';
COMMENT ON FUNCTION cleanup_old_cron_logs() IS 'Remove logs de cron com mais de 30 dias. Executar via cron semanal.';
