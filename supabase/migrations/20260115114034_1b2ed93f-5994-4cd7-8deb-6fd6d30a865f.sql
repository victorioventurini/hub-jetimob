-- P4: Performance Monitoring System
-- Tabela para armazenar snapshots de métricas de performance

CREATE TABLE public.perf_metrics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collected_at timestamptz NOT NULL DEFAULT now(),
  metrics jsonb NOT NULL,
  summary jsonb NOT NULL,
  created_by text NOT NULL DEFAULT 'cron-dispatcher'
);

-- Índice para queries por data (ordenação DESC para buscar mais recentes)
CREATE INDEX idx_perf_metrics_snapshots_collected 
ON public.perf_metrics_snapshots (collected_at DESC);

-- Comentário de documentação
COMMENT ON TABLE public.perf_metrics_snapshots IS 'P4: Snapshots de métricas de performance do banco de dados';

-- RPC para coletar métricas de performance
-- SECURITY DEFINER necessário para acessar pg_stat_*
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
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_tables
  FROM (
    SELECT 
      relname as name,
      seq_scan,
      idx_scan,
      CASE 
        WHEN (seq_scan + idx_scan) = 0 THEN 0
        ELSE round(100.0 * idx_scan / (seq_scan + idx_scan), 2)
      END as idx_scan_pct,
      CASE
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

  -- Coletar índices não utilizados (exceto PKs)
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
    ORDER BY pg_relation_size(indexrelid) DESC
    LIMIT 20
  ) i;

  -- Calcular summary
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

COMMENT ON FUNCTION public.collect_perf_metrics IS 'P4: Coleta métricas de performance e insere snapshot';

-- RPC para limpar snapshots antigos (>90 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_perf_snapshots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.perf_metrics_snapshots
  WHERE collected_at < now() - interval '90 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_perf_snapshots IS 'P4: Remove snapshots de performance com mais de 90 dias';