-- =============================================================================
-- P2: Índices de Performance para Tabelas de Log/Notificações
-- =============================================================================

-- Índice para ai_agent_logs (busca por agent_id)
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_agent_id 
ON public.ai_agent_logs(agent_id);

-- Índice para notification_deliveries (busca por notification_id)
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification_id 
ON public.notification_deliveries(notification_id);

-- Índice para ai_agent_documents (busca por agent_id)  
CREATE INDEX IF NOT EXISTS idx_ai_agent_documents_agent_id 
ON public.ai_agent_documents(agent_id);

-- Índice para okr_audit_log (busca por entity_id)
CREATE INDEX IF NOT EXISTS idx_okr_audit_log_entity_id 
ON public.okr_audit_log(entity_id);