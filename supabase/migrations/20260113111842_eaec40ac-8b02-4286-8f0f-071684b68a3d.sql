-- =============================================
-- Cleanup automático para audit_logs e ai_agent_logs
-- Retém dados por 90 dias, execução manual ou via cron
-- =============================================

-- Função de cleanup para audit_logs
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(p_retention_days INTEGER DEFAULT 90)
RETURNS TABLE(deleted_count BIGINT, table_name TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff_date TIMESTAMPTZ;
  v_audit_deleted BIGINT;
  v_agent_logs_deleted BIGINT;
BEGIN
  v_cutoff_date := NOW() - (p_retention_days || ' days')::INTERVAL;
  
  -- Cleanup audit_logs
  WITH deleted AS (
    DELETE FROM public.audit_logs 
    WHERE created_at < v_cutoff_date
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_audit_deleted FROM deleted;
  
  -- Cleanup ai_agent_logs (também cresce muito)
  WITH deleted AS (
    DELETE FROM public.ai_agent_logs 
    WHERE created_at < v_cutoff_date
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_agent_logs_deleted FROM deleted;
  
  -- Retorna resultados
  RETURN QUERY 
    SELECT v_audit_deleted, 'audit_logs'::TEXT
    UNION ALL
    SELECT v_agent_logs_deleted, 'ai_agent_logs'::TEXT;
END;
$$;

-- Permissão apenas para service_role (chamada via cron ou admin)
REVOKE ALL ON FUNCTION public.cleanup_old_audit_logs FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs TO service_role;

-- Adicionar comentário para documentação
COMMENT ON FUNCTION public.cleanup_old_audit_logs IS 
'Limpa registros de audit_logs e ai_agent_logs mais antigos que p_retention_days (default: 90). 
Executar via cron semanal ou manualmente por admin. Retorna contagem de registros deletados por tabela.';