-- =====================================================
-- FASE 1: Otimização do Banco de Dados (2026-01-22)
-- =====================================================

-- 1.1 Atualizar função de cleanup para 14 dias de retenção
CREATE OR REPLACE FUNCTION public.cleanup_old_agent_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_agent_logs 
  WHERE created_at < NOW() - INTERVAL '14 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 1.2 Índices parciais para tabelas com soft delete sem cobertura

-- profiles: índice para busca por BU de usuários ativos
CREATE INDEX IF NOT EXISTS idx_profiles_bu_active 
ON profiles(bu_id) 
WHERE deleted_at IS NULL;

-- bu_user_memberships: índice composto para busca de membros ativos
CREATE INDEX IF NOT EXISTS idx_bu_user_memberships_active 
ON bu_user_memberships(bu_id, user_id) 
WHERE deleted_at IS NULL;

-- job_titles: usa bu_ids (array), índice GIN
CREATE INDEX IF NOT EXISTS idx_job_titles_active 
ON job_titles USING GIN(bu_ids) 
WHERE deleted_at IS NULL;

-- ticket_subcategories: índice para busca por categoria
CREATE INDEX IF NOT EXISTS idx_ticket_subcategories_active 
ON ticket_subcategories(category_id) 
WHERE deleted_at IS NULL;

-- ticket_messages: índice para busca por ticket ordenado por data
CREATE INDEX IF NOT EXISTS idx_ticket_messages_active 
ON ticket_messages(ticket_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- 1.3 Comentários para documentação
COMMENT ON INDEX idx_profiles_bu_active IS 'Índice parcial para profiles ativos por BU (2026-01-22)';
COMMENT ON INDEX idx_bu_user_memberships_active IS 'Índice parcial para memberships ativos (2026-01-22)';
COMMENT ON INDEX idx_job_titles_active IS 'Índice GIN parcial para job_titles ativos (2026-01-22)';
COMMENT ON INDEX idx_ticket_subcategories_active IS 'Índice parcial para subcategorias ativas (2026-01-22)';
COMMENT ON INDEX idx_ticket_messages_active IS 'Índice parcial para mensagens ativas ordenadas (2026-01-22)';