/**
 * Performance Metrics Hooks
 * P4: Hooks para buscar métricas de performance do banco de dados
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/globalClient";
import { perfMetricsKeys } from "@/lib/queryKeys/integrations";

// Types for performance metrics
export interface TableMetric {
  name: string;
  seq_scan: number;
  idx_scan: number;
  idx_scan_pct: number;
  status: 'critical' | 'warning' | 'ok';
}

export interface UnusedIndex {
  name: string;
  table_name: string;
  scans: number;
  size_bytes: number;
}

export interface PerfMetricsSummary {
  total_tables: number;
  tables_critical: number;
  tables_warning: number;
  tables_ok: number;
  unused_indexes_count: number;
  unused_indexes_size_mb: number;
}

export interface PerfMetricsSnapshot {
  id: string;
  collected_at: string;
  metrics: {
    tables: TableMetric[];
    unused_indexes: UnusedIndex[];
  };
  summary: PerfMetricsSummary;
  created_by: string;
}

/**
 * Hook para buscar o snapshot mais recente de métricas
 */
export function usePerfMetricsLatest() {
  return useQuery({
    queryKey: perfMetricsKeys.latest(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perf_metrics_snapshots')
        .select('id, collected_at, metrics, summary, created_by')
        .order('collected_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        id: data.id,
        collected_at: data.collected_at,
        metrics: data.metrics as unknown as PerfMetricsSnapshot['metrics'],
        summary: data.summary as unknown as PerfMetricsSummary,
        created_by: data.created_by,
      } as PerfMetricsSnapshot;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/**
 * Hook para buscar histórico de summaries para gráfico de tendência
 */
export function usePerfMetricsHistory(days: number = 30) {
  return useQuery({
    queryKey: perfMetricsKeys.history(days),
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      const { data, error } = await supabase
        .from('perf_metrics_snapshots')
        .select('collected_at, summary')
        .gte('collected_at', since.toISOString())
        .order('collected_at', { ascending: true });
      
      if (error) throw error;
      
      // Aggregate by day (take last snapshot of each day)
      const byDay = new Map<string, { collected_at: string; summary: PerfMetricsSummary }>();
      for (const row of data || []) {
        const day = row.collected_at.split('T')[0];
        byDay.set(day, {
          collected_at: row.collected_at,
          summary: row.summary as unknown as PerfMetricsSummary,
        });
      }
      
      return Array.from(byDay.values());
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

/**
 * Hook para trigger manual de coleta de métricas
 */
export async function collectPerfMetricsManually() {
  const { data, error } = await supabase.rpc('collect_perf_metrics');
  if (error) throw error;
  return data as unknown as PerfMetricsSummary;
}
