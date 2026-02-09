/**
 * useKrEffectiveValues - Hook para obter valores efetivos de KRs
 * 
 * Quando uma KR tem KPI primária vinculada, retorna:
 * - effectiveTarget: target_value da KPI
 * - effectiveBaseline: baseline da KPI (se aplicável)
 * 
 * Quando não tem KPI primária, retorna os valores originais da KR.
 * 
 * @see docs/engineering/TECHNICAL_CONTEXT_REGISTRY.md (Seção KPI-KR Linking)
 * v3.4.2
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';

// ============================================================
// TYPES
// ============================================================

export interface KrEffectiveValues {
  /** Target efetivo (da KPI se vinculada, senão da KR) */
  effectiveTarget: number;
  /** Baseline efetivo (da KR) */
  effectiveBaseline: number;
  /** Se os valores vêm da KPI primária */
  fromPrimaryKpi: boolean;
  /** Nome da KPI primária (se existir) */
  primaryKpiName: string | null;
  /** ID da KPI primária (se existir) */
  primaryKpiId: string | null;
}

export interface UseKrEffectiveValuesResult {
  data: KrEffectiveValues | null;
  isLoading: boolean;
  error: Error | null;
}

// ============================================================
// HOOK
// ============================================================

/**
 * Hook para buscar os valores efetivos de uma KR.
 * Se a KR tem KPI primária vinculada, retorna o target da KPI.
 * 
 * @param krId - ID da Key Result
 * @param krType - Tipo da KR ('org' | 'team')
 * @param fallbackTarget - Target original da KR (usado se não há KPI)
 * @param fallbackBaseline - Baseline original da KR
 */
export function useKrEffectiveValues(
  krId: string | null | undefined,
  krType: 'org' | 'team',
  fallbackTarget: number,
  fallbackBaseline: number = 0
): UseKrEffectiveValuesResult {
  const { client: supabase, isReady } = useOptionalBuClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.okrs.krEffectiveValues(krId ?? '', krType),
    queryFn: async (): Promise<KrEffectiveValues> => {
      if (!supabase || !krId) {
        return {
          effectiveTarget: fallbackTarget,
          effectiveBaseline: fallbackBaseline,
          fromPrimaryKpi: false,
          primaryKpiName: null,
          primaryKpiId: null,
        };
      }

      // Check for primary KPI linked to this KR
      const { data: linkData, error: linkError } = await supabase
        .from('okr_kr_metrics')
        .select(`
          id,
          kpi_id,
          kpi:kpi_metrics(
            id,
            name,
            target_value
          )
        `)
        .eq('kr_id', krId)
        .eq('kr_type', krType)
        .eq('role', 'primary')
        .is('deleted_at', null)
        .maybeSingle();

      if (linkError) throw linkError;

      // If no primary KPI, return fallback values
      if (!linkData || !linkData.kpi) {
        return {
          effectiveTarget: fallbackTarget,
          effectiveBaseline: fallbackBaseline,
          fromPrimaryKpi: false,
          primaryKpiName: null,
          primaryKpiId: null,
        };
      }

      // Type assertion for joined data
      const kpi = linkData.kpi as { id: string; name: string; target_value: number | null };

      return {
        effectiveTarget: kpi.target_value ?? fallbackTarget,
        effectiveBaseline: fallbackBaseline,
        fromPrimaryKpi: true,
        primaryKpiName: kpi.name,
        primaryKpiId: kpi.id,
      };
    },
    enabled: !!krId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    data: data ?? {
      effectiveTarget: fallbackTarget,
      effectiveBaseline: fallbackBaseline,
      fromPrimaryKpi: false,
      primaryKpiName: null,
      primaryKpiId: null,
    },
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Helper function para calcular o target efetivo de forma síncrona.
 * Útil quando os dados já foram carregados.
 */
export function getEffectiveTarget(
  krTarget: number,
  primaryKpiTarget: number | null | undefined,
  hasPrimaryKpi: boolean
): number {
  if (hasPrimaryKpi && primaryKpiTarget !== null && primaryKpiTarget !== undefined) {
    return primaryKpiTarget;
  }
  return krTarget;
}
