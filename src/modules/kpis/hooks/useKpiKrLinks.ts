/**
 * Hook to fetch all KPI-KR links for filtering purposes
 * v2.89.0 - Returns a map of kpi_id -> roles[] (primary/guardrail)
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';

export interface KpiKrLinkMap {
  /** Map of kpi_id -> array of roles (primary, guardrail) */
  linksByKpi: Map<string, ('primary' | 'guardrail')[]>;
  /** Set of KPI IDs that are linked as primary */
  primaryKpiIds: Set<string>;
  /** Set of KPI IDs that are linked as guardrail */
  guardrailKpiIds: Set<string>;
  /** Set of KPI IDs that have any link */
  linkedKpiIds: Set<string>;
}

/**
 * Fetches all active KPI-KR links for the current BU
 * Used for client-side filtering on the KPI dashboard
 */
export function useKpiKrLinks() {
  const supabase = useOptionalBuScopedSupabase();
  const { currentBuId } = useBu();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.kpis.allKrLinks(currentBuId),
    queryFn: async (): Promise<KpiKrLinkMap> => {
      if (!supabase) {
        return {
          linksByKpi: new Map(),
          primaryKpiIds: new Set(),
          guardrailKpiIds: new Set(),
          linkedKpiIds: new Set(),
        };
      }

      const { data: links, error } = await supabase
        .from('okr_kr_metrics')
        .select('kpi_id, role')
        .is('deleted_at', null);

      if (error) throw error;

      const linksByKpi = new Map<string, ('primary' | 'guardrail')[]>();
      const primaryKpiIds = new Set<string>();
      const guardrailKpiIds = new Set<string>();
      const linkedKpiIds = new Set<string>();

      for (const link of links || []) {
        const role = link.role as 'primary' | 'guardrail';
        
        // Add to linksByKpi map
        if (!linksByKpi.has(link.kpi_id)) {
          linksByKpi.set(link.kpi_id, []);
        }
        linksByKpi.get(link.kpi_id)!.push(role);
        
        // Add to role-specific sets
        if (role === 'primary') {
          primaryKpiIds.add(link.kpi_id);
        } else if (role === 'guardrail') {
          guardrailKpiIds.add(link.kpi_id);
        }
        
        // Add to linked set
        linkedKpiIds.add(link.kpi_id);
      }

      return {
        linksByKpi,
        primaryKpiIds,
        guardrailKpiIds,
        linkedKpiIds,
      };
    },
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  return {
    data: data ?? {
      linksByKpi: new Map(),
      primaryKpiIds: new Set(),
      guardrailKpiIds: new Set(),
      linkedKpiIds: new Set(),
    },
    isLoading,
    error,
  };
}
