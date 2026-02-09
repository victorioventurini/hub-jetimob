/**
 * useKrPrimaryKpiBatch - Hook para buscar KPIs primárias de múltiplas KRs
 * 
 * Otimizado para listagens: faz uma única query para obter todas as
 * KPIs primárias vinculadas a um conjunto de KRs.
 * 
 * @see docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md (Seção KPI-KR Linking)
 * @see memory/features/kpis/primary-kpi-single-source-truth
 * @version 3.4.2
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';

// ============================================================
// TYPES
// ============================================================

export interface KrPrimaryKpiInfo {
  /** ID da KR */
  krId: string;
  /** Tipo da KR */
  krType: 'org' | 'team';
  /** ID da KPI */
  kpiId: string;
  /** Nome da KPI */
  kpiName: string;
  /** Direção da KPI */
  direction: 'up' | 'down' | 'maintain';
}

export interface UseKrPrimaryKpiBatchResult {
  /** Map de krId -> dados da KPI primária */
  kpiByKrId: Map<string, KrPrimaryKpiInfo>;
  /** Verifica se uma KR tem KPI primária */
  hasKrPrimaryKpi: (krId: string) => boolean;
  /** Obtém dados da KPI primária de uma KR */
  getKrPrimaryKpi: (krId: string) => KrPrimaryKpiInfo | undefined;
  /** Se está carregando */
  isLoading: boolean;
  /** Erro (se houver) */
  error: Error | null;
}

// ============================================================
// HOOK
// ============================================================

/**
 * Hook para buscar KPIs primárias de múltiplas KRs em batch.
 * 
 * Uso:
 * ```tsx
 * const { hasKrPrimaryKpi, getKrPrimaryKpi } = useKrPrimaryKpiBatch(krIds, 'team');
 * 
 * // Na renderização de cada KR:
 * if (hasKrPrimaryKpi(kr.id)) {
 *   const kpi = getKrPrimaryKpi(kr.id);
 *   // Mostrar badge de KPI
 * }
 * ```
 * 
 * @param krIds - Array de IDs de Key Results
 * @param krType - Tipo das KRs ('org' | 'team')
 */
export function useKrPrimaryKpiBatch(
  krIds: string[],
  krType: 'org' | 'team'
): UseKrPrimaryKpiBatchResult {
  const { client: supabase, isReady } = useOptionalBuClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.okrs.krPrimaryKpiBatch(krIds, krType),
    queryFn: async (): Promise<Map<string, KrPrimaryKpiInfo>> => {
      if (!supabase || krIds.length === 0) {
        return new Map();
      }

      const { data: links, error: linksError } = await supabase
        .from('okr_kr_metrics')
        .select(`
          kr_id,
          kr_type,
          kpi_id,
          kpi:kpi_metrics(
            id,
            name,
            direction
          )
        `)
        .in('kr_id', krIds)
        .eq('kr_type', krType)
        .eq('role', 'primary')
        .is('deleted_at', null);

      if (linksError) throw linksError;
      if (!links) return new Map();

      const result = new Map<string, KrPrimaryKpiInfo>();
      
      for (const link of links) {
        const kpi = link.kpi as any;
        if (!kpi) continue;

        result.set(link.kr_id, {
          krId: link.kr_id,
          krType: link.kr_type as 'org' | 'team',
          kpiId: kpi.id,
          kpiName: kpi.name,
          direction: kpi.direction || 'up',
        });
      }

      return result;
    },
    enabled: isReady && !!supabase && krIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const kpiByKrId = data ?? new Map<string, KrPrimaryKpiInfo>();

  return {
    kpiByKrId,
    hasKrPrimaryKpi: (krId: string) => kpiByKrId.has(krId),
    getKrPrimaryKpi: (krId: string) => kpiByKrId.get(krId),
    isLoading,
    error: error as Error | null,
  };
}
