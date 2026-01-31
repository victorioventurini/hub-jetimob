-- =============================================================================
-- Backend Optimization P2: Performance Metrics Improvements
-- =============================================================================
-- 1. Atualizar collect_perf_metrics para evitar falsos positivos
-- 2. Remover índices não utilizados (20 índices com 0 scans)
-- =============================================================================

-- 1. Atualizar função collect_perf_metrics com threshold de rows
CREATE OR REPLACE FUNCTION public.collect_perf_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tables jsonb;
  v_unused_indexes jsonb;
  v_summary jsonb;
BEGIN
  -- Coletar métricas de tabelas com atividade significativa
  -- MELHORIA: Adiciona n_live_tup para excluir tabelas pequenas (<500 rows)
  -- onde seq scan é mais eficiente que index scan
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_tables
  FROM (
    SELECT 
      relname as name,
      seq_scan,
      idx_scan,
      n_live_tup as live_rows,
      CASE 
        WHEN (seq_scan + idx_scan) = 0 THEN 0
        ELSE round(100.0 * idx_scan / (seq_scan + idx_scan), 2)
      END as idx_scan_pct,
      CASE
        WHEN n_live_tup < 500 THEN 'ok' -- Tabelas pequenas: seq scan é OK
        WHEN (seq_scan + idx_scan) = 0 THEN 'ok'
        WHEN (100.0 * idx_scan / (seq_scan + idx_scan)) < 50 THEN 'critical'
        WHEN (100.0 * idx_scan / (seq_scan + idx_scan)) < 80 THEN 'warning'
        ELSE 'ok'
      END as status
    FROM pg_stat_user_tables
    WHERE schemaname = 'public' 
      AND (seq_scan + idx_scan) > 100
    ORDER BY seq_scan DESC
    LIMIT 50
  ) t;

  -- Coletar índices não utilizados (exceto PKs e unique constraints)
  -- MELHORIA: Exclui índices de constraints (_key suffix)
  SELECT COALESCE(jsonb_agg(i), '[]'::jsonb) INTO v_unused_indexes
  FROM (
    SELECT 
      indexrelname as name,
      relname as table_name,
      idx_scan as scans,
      pg_relation_size(indexrelid) as size_bytes
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public' 
      AND idx_scan = 0
      AND indexrelname NOT LIKE '%_pkey'
      AND indexrelname NOT LIKE '%_key'  -- Exclui unique constraints
    ORDER BY pg_relation_size(indexrelid) DESC
    LIMIT 20
  ) i;

  -- Calcular summary com métricas corrigidas
  SELECT jsonb_build_object(
    'total_tables', COALESCE((SELECT COUNT(*) FROM jsonb_array_elements(v_tables)), 0),
    'tables_critical', COALESCE((SELECT COUNT(*) FROM jsonb_array_elements(v_tables) t WHERE t->>'status' = 'critical'), 0),
    'tables_warning', COALESCE((SELECT COUNT(*) FROM jsonb_array_elements(v_tables) t WHERE t->>'status' = 'warning'), 0),
    'tables_ok', COALESCE((SELECT COUNT(*) FROM jsonb_array_elements(v_tables) t WHERE t->>'status' = 'ok'), 0),
    'unused_indexes_count', COALESCE(jsonb_array_length(v_unused_indexes), 0),
    'unused_indexes_size_mb', COALESCE(
      round((SELECT SUM((ui->>'size_bytes')::bigint) FROM jsonb_array_elements(v_unused_indexes) ui) / 1024.0 / 1024.0, 2),
      0
    )
  ) INTO v_summary;

  -- Inserir snapshot
  INSERT INTO public.perf_metrics_snapshots (metrics, summary)
  VALUES (
    jsonb_build_object('tables', v_tables, 'unused_indexes', v_unused_indexes),
    v_summary
  );

  RETURN v_summary;
END;
$$;

COMMENT ON FUNCTION public.collect_perf_metrics IS 'P4: Coleta métricas de performance com threshold de rows para evitar falsos positivos em tabelas pequenas';

-- 2. Remover índices não utilizados que são redundantes (não são constraints)
-- CUIDADO: Mantemos índices de unique constraints mesmo sem uso (necessários para integridade)

-- Índices duplicados em bu_units (já tem pkey)
DROP INDEX IF EXISTS idx_bu_units_domains; -- GIN não usado, 0 scans
DROP INDEX IF EXISTS idx_bu_units_cnpj; -- 0 scans, validação via código

-- Índices duplicados em user_roles
DROP INDEX IF EXISTS idx_user_roles_user_id; -- Redundante com idx_user_roles_user_role

-- Índices duplicados em squad_memberships
DROP INDEX IF EXISTS idx_squad_memberships_bu_id; -- bu_id não é coluna chave para lookups

-- Índices não utilizados em asset_*
DROP INDEX IF EXISTS idx_asset_keyrings_bu; -- 0 scans, redundante
DROP INDEX IF EXISTS idx_asset_inventory_bu_status; -- 0 scans

-- Índices não utilizados em user_team_memberships
DROP INDEX IF EXISTS idx_user_team_memberships_user_id; -- Redundante com unique constraint
DROP INDEX IF EXISTS idx_user_team_memberships_team_id; -- 0 scans

-- Índices não utilizados em cycles
DROP INDEX IF EXISTS idx_cycles_bu_type; -- 0 scans

-- Índices não utilizados em bu_user_memberships (já tem muitos índices)
DROP INDEX IF EXISTS idx_bu_user_memberships_bu; -- Redundante com idx_bu_memberships_bu

-- Índices não utilizados em okr_audit_log
DROP INDEX IF EXISTS idx_okr_audit_log_entity_id; -- 0 scans

-- Índices não utilizados em ai_agents/documents
DROP INDEX IF EXISTS idx_ai_agents_bu_active; -- 0 scans
DROP INDEX IF EXISTS idx_ai_agent_documents_agent_id; -- 0 scans

-- Índices não utilizados em asset_hooks
DROP INDEX IF EXISTS idx_asset_hooks_claviculary; -- 0 scans