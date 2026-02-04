/**
 * useKpiLinkedKrs
 * 
 * Hook para buscar KRs vinculadas a uma KPI/Métrica via okr_kr_metrics.
 * Retorna KRs organizacionais e de time com papel (primary/guardrail) e dados de contexto.
 * 
 * @see DEVELOPMENT_STANDARDS.md - Explicit fields, bu-scoped client
 * @since v2.84.0
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { kpisKeys } from '@/lib/queryKeys';
import type { OkrMetricRole } from '@/modules/okrs/types';

// Explicit fields for okr_kr_metrics with nested KR data
const KR_LINK_FIELDS_TEAM = `
  id, kr_id, kr_type, kpi_id, role, created_at,
  team_kr:okr_team_key_results!kr_id(
    id, title, progress, status,
    objective:okr_team_objectives!objective_id(
      id, title, status,
      team:teams!team_id(id, name, color)
    )
  )
` as const;

const KR_LINK_FIELDS_ORG = `
  id, kr_id, kr_type, kpi_id, role, created_at,
  org_kr:okr_org_key_results!kr_id(
    id, title, progress, status,
    objective:okr_org_objectives!objective_id(id, title, status)
  )
` as const;

export interface LinkedKrData {
  id: string;
  kr_id: string;
  kr_type: 'org' | 'team';
  role: OkrMetricRole;
  kr: {
    id: string;
    title: string;
    progress: number | null;
    status: string | null;
  };
  objective?: {
    id: string;
    title: string;
    status: string | null;
  };
  team?: {
    id: string;
    name: string;
    color: string | null;
  };
}

export interface UseKpiLinkedKrsResult {
  data: LinkedKrData[];
  primaryKrs: LinkedKrData[];
  guardrailKrs: LinkedKrData[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Busca todas as KRs vinculadas a uma KPI específica.
 * Ordena: Primárias primeiro, depois Guardrails.
 * Dentro de cada grupo: at-risk/off-track primeiro.
 */
export function useKpiLinkedKrs(kpiId: string | null): UseKpiLinkedKrsResult {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  const query = useQuery({
    queryKey: [...kpisKeys.detail(kpiId || ''), 'linked-krs'] as const,
    queryFn: async () => {
      if (!supabase || !kpiId) return [];

      // Query team KRs
      const { data: teamLinks, error: teamError } = await supabase
        .from('okr_kr_metrics')
        .select(KR_LINK_FIELDS_TEAM)
        .eq('kpi_id', kpiId)
        .eq('kr_type', 'team')
        .is('deleted_at', null);

      if (teamError) throw teamError;

      // Query org KRs
      const { data: orgLinks, error: orgError } = await supabase
        .from('okr_kr_metrics')
        .select(KR_LINK_FIELDS_ORG)
        .eq('kpi_id', kpiId)
        .eq('kr_type', 'org')
        .is('deleted_at', null);

      if (orgError) throw orgError;

      // Transform team KRs
      const teamKrs: LinkedKrData[] = (teamLinks || [])
        .filter((link: any) => link.team_kr)
        .map((link: any) => ({
          id: link.id,
          kr_id: link.kr_id,
          kr_type: 'team' as const,
          role: link.role as OkrMetricRole,
          kr: {
            id: link.team_kr.id,
            title: link.team_kr.title,
            progress: link.team_kr.progress,
            status: link.team_kr.status,
          },
          objective: link.team_kr.objective ? {
            id: link.team_kr.objective.id,
            title: link.team_kr.objective.title,
            status: link.team_kr.objective.status,
          } : undefined,
          team: link.team_kr.objective?.team ? {
            id: link.team_kr.objective.team.id,
            name: link.team_kr.objective.team.name,
            color: link.team_kr.objective.team.color,
          } : undefined,
        }));

      // Transform org KRs
      const orgKrs: LinkedKrData[] = (orgLinks || [])
        .filter((link: any) => link.org_kr)
        .map((link: any) => ({
          id: link.id,
          kr_id: link.kr_id,
          kr_type: 'org' as const,
          role: link.role as OkrMetricRole,
          kr: {
            id: link.org_kr.id,
            title: link.org_kr.title,
            progress: link.org_kr.progress,
            status: link.org_kr.status,
          },
          objective: link.org_kr.objective ? {
            id: link.org_kr.objective.id,
            title: link.org_kr.objective.title,
            status: link.org_kr.objective.status,
          } : undefined,
        }));

      return [...teamKrs, ...orgKrs];
    },
    enabled: !!kpiId && isReady && !!supabase,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Separate by role
  const allKrs = query.data || [];
  const primaryKrs = allKrs.filter((kr) => kr.role === 'primary');
  const guardrailKrs = allKrs.filter((kr) => kr.role === 'guardrail');

  // Sort by status priority (at-risk/off-track first)
  const statusPriority: Record<string, number> = {
    off_track: 0,
    at_risk: 1,
    on_track: 2,
    no_data: 3,
    completed: 4,
    cancelled: 5,
  };

  const sortByStatus = (a: LinkedKrData, b: LinkedKrData) => {
    const priorityA = statusPriority[a.kr.status || 'no_data'] ?? 99;
    const priorityB = statusPriority[b.kr.status || 'no_data'] ?? 99;
    return priorityA - priorityB;
  };

  return {
    data: [...primaryKrs.sort(sortByStatus), ...guardrailKrs.sort(sortByStatus)],
    primaryKrs: primaryKrs.sort(sortByStatus),
    guardrailKrs: guardrailKrs.sort(sortByStatus),
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
