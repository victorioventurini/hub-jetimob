/**
 * useKpisForWizard - Fail-safe hook for OKR wizards
 * 
 * NEVER throws exceptions - returns empty state on error.
 * Used by: collaborator-checkin, leader-prep, team-checkin wizards.
 */

import { useQuery } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { kpisKeys } from "@/lib/queryKeys/okrs";
import type { 
  KpiRagStatus, 
  KpiConfidenceLevel, 
  KpiFrequency,
  KpiLifecycleStatus,
  KpiDirection 
} from "../types";

// ============================================================
// Types
// ============================================================

export interface KpiForWizard {
  id: string;
  name: string;
  unit: string;
  target_value: number | null;
  direction: KpiDirection;
  frequency: KpiFrequency;
  lifecycle_status: KpiLifecycleStatus;
  recovery_protocol: string | null;
  team_id: string | null;
  owner_user_id: string | null;
  // Latest value data
  latest_value: number | null;
  latest_reference_date: string | null;
  latest_rag_status: KpiRagStatus;
  latest_confidence: KpiConfidenceLevel | null;
  latest_period_label: string | null;
  needs_update: boolean;
}

export interface UseKpisForWizardOptions {
  ownerId?: string;
  teamId?: string;
  includeGuardrails?: boolean;
}

export interface UseKpisForWizardResult {
  kpis: KpiForWizard[];
  guardrails: KpiForWizard[];
  isLoading: boolean;
  hasError: boolean;
  hasAlertsToShow: boolean;
  hasKpisNeedingUpdate: boolean;
}

// ============================================================
// Hook
// ============================================================

/**
 * Hook fail-safe para exibir KPIs em wizards OKR.
 * NUNCA lança exceção - retorna estado vazio em caso de erro.
 * 
 * @example
 * const { kpis, hasAlertsToShow, hasKpisNeedingUpdate } = useKpisForWizard({ 
 *   ownerId: effectiveUserId 
 * });
 */
export function useKpisForWizard(options: UseKpisForWizardOptions = {}): UseKpisForWizardResult {
  const supabase = useOptionalBuScopedSupabase();
  const { ownerId, teamId } = options;

  const { data, error, isLoading } = useQuery({
    queryKey: kpisKeys.forWizard({ ownerId, teamId }),
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000, // 5 min cache
    queryFn: async () => {
      try {
        if (!supabase) return { kpis: [], guardrails: [] };

        // 1. Fetch active KPIs
        let kpiQuery = supabase
          .from('kpi_metrics')
          .select(`
            id, name, unit, target_value, direction, frequency,
            lifecycle_status, recovery_protocol, team_id, owner_user_id
          `)
          .eq('lifecycle_status', 'active')
          .is('deleted_at', null);
          
        if (ownerId) {
          kpiQuery = kpiQuery.eq('owner_user_id', ownerId);
        }
        if (teamId) {
          kpiQuery = kpiQuery.eq('team_id', teamId);
        }
        
        const { data: kpis, error: kpiError } = await kpiQuery;
        
        if (kpiError || !kpis || kpis.length === 0) {
          return { kpis: [], guardrails: [] };
        }

        // 2. Fetch latest value per KPI (single query)
        const kpiIds = kpis.map(k => k.id);
        
        const { data: latestValues } = await supabase
          .from('kpi_values')
          .select('kpi_id, value, reference_date, rag_status, confidence, period_label')
          .in('kpi_id', kpiIds)
          .order('reference_date', { ascending: false });
        
        // 3. Map latest value per KPI (first occurrence per kpi_id)
        const latestByKpi = new Map<string, (typeof latestValues)[number]>();
        for (const v of (latestValues || [])) {
          if (!latestByKpi.has(v.kpi_id)) {
            latestByKpi.set(v.kpi_id, v);
          }
        }
        
        // 4. Enrich KPIs with latest value data
        const enrichedKpis: KpiForWizard[] = kpis.map(kpi => {
          const latest = latestByKpi.get(kpi.id);
          return {
            ...kpi,
            direction: kpi.direction as KpiDirection,
            frequency: kpi.frequency as KpiFrequency,
            lifecycle_status: kpi.lifecycle_status as KpiLifecycleStatus,
            latest_value: latest?.value ?? null,
            latest_reference_date: latest?.reference_date ?? null,
            latest_rag_status: (latest?.rag_status as KpiRagStatus) ?? 'no_data',
            latest_confidence: (latest?.confidence as KpiConfidenceLevel) ?? null,
            latest_period_label: latest?.period_label ?? null,
            needs_update: needsUpdate(kpi.frequency as KpiFrequency, latest?.reference_date),
          };
        });
        
        return { kpis: enrichedKpis, guardrails: [] };
      } catch (e) {
        console.warn('[KPI Module] Unavailable for wizard:', e);
        return { kpis: [], guardrails: [] };
      }
    },
  });
  
  const kpis = data?.kpis ?? [];
  const guardrails = data?.guardrails ?? [];
  
  return {
    kpis,
    guardrails,
    isLoading,
    hasError: !!error,
    hasAlertsToShow: kpis.some(k => 
      k.latest_rag_status && k.latest_rag_status !== 'on_track'
    ),
    hasKpisNeedingUpdate: kpis.some(k => k.needs_update),
  };
}

// ============================================================
// Helpers
// ============================================================

/**
 * Check if KPI needs update based on frequency
 */
function needsUpdate(frequency: KpiFrequency, lastDate: string | null | undefined): boolean {
  if (!lastDate) return true;
  
  const last = new Date(lastDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  
  switch (frequency) {
    case 'daily': return diffDays >= 1;
    case 'weekly': return diffDays >= 7;
    case 'monthly': return diffDays >= 30;
    case 'quarterly': return diffDays >= 90;
    case 'manual': return false; // manual frequency never auto-needs update
    default: return false;
  }
}
