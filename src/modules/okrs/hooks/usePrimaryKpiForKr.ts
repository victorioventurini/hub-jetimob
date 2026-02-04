/**
 * usePrimaryKpiForKr - Hook para verificar se KR tem KPI primária vinculada
 * 
 * Implementa a regra de "fonte única de verdade":
 * - Quando KR tem KPI primária, o valor numérico vem da KPI
 * - O progresso da KR é calculado automaticamente
 * - O campo de valor da KR fica bloqueado (read-only)
 * 
 * @see docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md (Seção KPI-KR Linking)
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';

// ============================================================
// TYPES
// ============================================================

export interface PrimaryKpiData {
  /** ID do registro em okr_kr_metrics */
  linkId: string;
  /** ID da KPI vinculada */
  kpiId: string;
  /** Nome da KPI */
  kpiName: string;
  /** Unidade da KPI */
  kpiUnit: string;
  /** Valor atual da KPI (latest value) */
  currentValue: number | null;
  /** Meta da KPI */
  targetValue: number | null;
  /** Direção da KPI */
  direction: 'up' | 'down' | 'maintain';
  /** Status RAG da KPI */
  ragStatus: 'green' | 'yellow' | 'red' | 'no_data';
  /** Data da última atualização */
  lastUpdatedAt: string | null;
}

export interface UsePrimaryKpiForKrResult {
  /** Se a KR tem uma KPI primária vinculada */
  hasPrimaryKpi: boolean;
  /** Dados da KPI primária (se existir) */
  primaryKpi: PrimaryKpiData | null;
  /** Se está carregando */
  isLoading: boolean;
  /** Erro (se houver) */
  error: Error | null;
}

// ============================================================
// QUERY FIELDS
// ============================================================

const PRIMARY_KPI_FIELDS = `
  id,
  kpi_id,
  kpi:kpi_metrics(
    id,
    name,
    unit,
    target_value,
    direction,
    kpi_values(
      value,
      reference_date,
      rag_status
    )
  )
` as const;

// ============================================================
// HOOK
// ============================================================

/**
 * Hook para buscar a KPI primária vinculada a uma KR.
 * 
 * Uso:
 * ```tsx
 * const { hasPrimaryKpi, primaryKpi, isLoading } = usePrimaryKpiForKr(krId, 'team');
 * 
 * if (hasPrimaryKpi) {
 *   // Bloquear edição do valor
 *   // Mostrar banner explicativo
 * }
 * ```
 * 
 * @param krId - ID da Key Result
 * @param krType - Tipo da KR ('org' | 'team')
 */
export function usePrimaryKpiForKr(
  krId: string | null | undefined,
  krType: 'org' | 'team'
): UsePrimaryKpiForKrResult {
  const { client: supabase, isReady } = useOptionalBuClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.okrs.krMetricsRole('primary', krId ?? '', krType),
    queryFn: async (): Promise<PrimaryKpiData | null> => {
      if (!supabase || !krId) return null;

      const { data: linkData, error: linkError } = await supabase
        .from('okr_kr_metrics')
        .select(PRIMARY_KPI_FIELDS)
        .eq('kr_id', krId)
        .eq('kr_type', krType)
        .eq('role', 'primary')
        .is('deleted_at', null)
        .maybeSingle();

      if (linkError) throw linkError;
      if (!linkData) return null;

      // Type assertion for joined data
      const kpi = linkData.kpi as any;
      if (!kpi) return null;

      // Get latest value (most recent by reference_date)
      const values = kpi.kpi_values || [];
      const latestValue = values.length > 0
        ? values.sort((a: any, b: any) => 
            new Date(b.reference_date).getTime() - new Date(a.reference_date).getTime()
          )[0]
        : null;

      return {
        linkId: linkData.id,
        kpiId: kpi.id,
        kpiName: kpi.name,
        kpiUnit: kpi.unit || '',
        currentValue: latestValue?.value ?? null,
        targetValue: kpi.target_value,
        direction: kpi.direction || 'up',
        ragStatus: latestValue?.rag_status || 'no_data',
        lastUpdatedAt: latestValue?.reference_date || null,
      };
    },
    enabled: !!krId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    hasPrimaryKpi: !!data,
    primaryKpi: data ?? null,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Verifica se uma KR deve ter o valor bloqueado (fonte única = KPI)
 */
export function isKrValueLocked(hasPrimaryKpi: boolean): boolean {
  return hasPrimaryKpi;
}

/**
 * Calcula o progresso da KR baseado na KPI primária
 */
export function calculateKrProgressFromKpi(
  kpiCurrentValue: number | null,
  krBaseline: number,
  krTarget: number,
  direction: 'up' | 'down' | 'maintain'
): number {
  if (kpiCurrentValue === null) return 0;

  if (direction === 'maintain') {
    return kpiCurrentValue >= krTarget ? 100 : 0;
  }

  const range = krTarget - krBaseline;
  if (range === 0) return kpiCurrentValue >= krTarget ? 100 : 0;

  if (direction === 'up') {
    const progress = ((kpiCurrentValue - krBaseline) / range) * 100;
    return Math.max(0, progress);
  } else {
    const progress = ((krBaseline - kpiCurrentValue) / (krBaseline - krTarget)) * 100;
    return Math.max(0, progress);
  }
}
