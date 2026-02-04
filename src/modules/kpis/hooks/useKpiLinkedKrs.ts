/**
 * useKpiLinkedKrs
 * 
 * Hook para buscar KRs vinculadas a uma KPI/Métrica via okr_kr_metrics.
 * Retorna KRs organizacionais e de time com papel (primary/guardrail) e dados de contexto.
 * 
 * NOTA: A tabela okr_kr_metrics NÃO possui FK para okr_team_key_results/okr_org_key_results,
 * portanto a busca é feita em etapas separadas (links → KRs → objectives).
 * 
 * @see DEVELOPMENT_STANDARDS.md - Explicit fields, bu-scoped client
 * @since v2.84.0
 */

import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { kpisKeys } from '@/lib/queryKeys';
import { calculateProgress } from '@/modules/okrs/utils/progressCalculation';
import { mapRagToCalculated, type OkrCalculatedStatus } from '@/modules/okrs/hooks/useOkrStatus';
import type { OkrMetricRole, OkrDirection, OkrRagStatus } from '@/modules/okrs/types';

// Explicit fields for each query step
const LINK_FIELDS = 'id, kr_id, kr_type, kpi_id, role, created_at' as const;

const TEAM_KR_FIELDS = `
  id, title, baseline, current_value, target, direction, status,
  team_objective_id,
  objective:okr_team_objectives!team_objective_id(
    id, title, status,
    team:teams!team_id(id, name)
  )
` as const;

const ORG_KR_FIELDS = 'id, title, baseline, current_value, target, direction, status, org_objective_id' as const;
const ORG_OBJECTIVE_FIELDS = 'id, title, status' as const;

export interface LinkedKrData {
  id: string;
  kr_id: string;
  kr_type: 'org' | 'team';
  role: OkrMetricRole;
  kr: {
    id: string;
    title: string;
    progress: number | null;
    status: OkrCalculatedStatus | null;
  };
  objective?: {
    id: string;
    title: string;
    status: string | null;
  };
  team?: {
    id: string;
    name: string;
  };
}

export interface UseKpiLinkedKrsResult {
  data: LinkedKrData[];
  primaryKrs: LinkedKrData[];
  guardrailKrs: LinkedKrData[];
  isLoading: boolean;
  error: Error | null;
}

// Type for raw link from okr_kr_metrics
interface RawLink {
  id: string;
  kr_id: string;
  kr_type: 'org' | 'team';
  kpi_id: string;
  role: OkrMetricRole;
  created_at: string;
}

// Type for Team KR with nested objective
interface TeamKrRow {
  id: string;
  title: string;
  baseline: number | null;
  current_value: number | null;
  target: number | null;
  direction: OkrDirection | null;
  status: OkrRagStatus | null;
  team_objective_id: string | null;
  objective: {
    id: string;
    title: string;
    status: string | null;
    team: {
      id: string;
      name: string;
    } | null;
  } | null;
}

// Type for Org KR
interface OrgKrRow {
  id: string;
  title: string;
  baseline: number | null;
  current_value: number | null;
  target: number | null;
  direction: OkrDirection | null;
  status: OkrRagStatus | null;
  org_objective_id: string | null;
}

// Type for Org Objective
interface OrgObjectiveRow {
  id: string;
  title: string;
  status: string | null;
}

/**
 * Busca todas as KRs vinculadas a uma KPI específica.
 * Ordena: Primárias primeiro, depois Guardrails.
 * Dentro de cada grupo: at-risk/off-track primeiro.
 */
export function useKpiLinkedKrs(kpiId: string | null): UseKpiLinkedKrsResult {
  const { client: supabase, isReady } = useOptionalBuClient();

  const query = useQuery({
    queryKey: [...kpisKeys.detail(kpiId || ''), 'linked-krs'] as const,
    queryFn: async (): Promise<LinkedKrData[]> => {
      if (!supabase || !kpiId) return [];

      // Step 1: Fetch links from okr_kr_metrics
      const { data: links, error: linksError } = await supabase
        .from('okr_kr_metrics')
        .select(LINK_FIELDS)
        .eq('kpi_id', kpiId)
        .is('deleted_at', null);

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      const rawLinks = links as RawLink[];

      // Step 2: Separate IDs by type
      const teamKrIds = rawLinks.filter(l => l.kr_type === 'team').map(l => l.kr_id);
      const orgKrIds = rawLinks.filter(l => l.kr_type === 'org').map(l => l.kr_id);

      // Step 3: Fetch Team KRs (if any)
      let teamKrsMap = new Map<string, TeamKrRow>();
      if (teamKrIds.length > 0) {
        const { data: teamKrs, error: teamError } = await supabase
          .from('okr_team_key_results')
          .select(TEAM_KR_FIELDS)
          .in('id', teamKrIds)
          .is('deleted_at', null)
          .is('cancelled_at', null);

        if (teamError) throw teamError;
        if (teamKrs) {
          (teamKrs as TeamKrRow[]).forEach(kr => teamKrsMap.set(kr.id, kr));
        }
      }

      // Step 4: Fetch Org KRs (if any)
      let orgKrsMap = new Map<string, OrgKrRow>();
      let orgObjectivesMap = new Map<string, OrgObjectiveRow>();
      if (orgKrIds.length > 0) {
        const { data: orgKrs, error: orgError } = await supabase
          .from('okr_org_key_results')
          .select(ORG_KR_FIELDS)
          .in('id', orgKrIds)
          .is('deleted_at', null)
          .is('cancelled_at', null);

        if (orgError) throw orgError;
        if (orgKrs) {
          const orgKrsList = orgKrs as OrgKrRow[];
          orgKrsList.forEach(kr => orgKrsMap.set(kr.id, kr));

          // Fetch Org Objectives for context
          const orgObjectiveIds = [...new Set(orgKrsList.map(kr => kr.org_objective_id).filter(Boolean))] as string[];
          if (orgObjectiveIds.length > 0) {
            const { data: orgObjectives, error: objError } = await supabase
              .from('okr_org_objectives')
              .select(ORG_OBJECTIVE_FIELDS)
              .in('id', orgObjectiveIds);

            if (objError) throw objError;
            if (orgObjectives) {
              (orgObjectives as OrgObjectiveRow[]).forEach(obj => orgObjectivesMap.set(obj.id, obj));
            }
          }
        }
      }

      // Step 5: Build LinkedKrData[] from links + fetched KRs
      const result: LinkedKrData[] = [];

      for (const link of rawLinks) {
        if (link.kr_type === 'team') {
          const kr = teamKrsMap.get(link.kr_id);
          if (!kr) continue; // KR not found (deleted/cancelled or no access)

          const progress = calculateProgress(
            Number(kr.baseline) || 0,
            Number(kr.current_value) || 0,
            Number(kr.target) || 0,
            kr.direction || 'up'
          );

          const calculatedStatus: OkrCalculatedStatus = progress >= 100 
            ? 'completed' 
            : mapRagToCalculated(kr.status || 'not_started');

          result.push({
            id: link.id,
            kr_id: link.kr_id,
            kr_type: 'team',
            role: link.role,
            kr: {
              id: kr.id,
              title: kr.title,
              progress,
              status: calculatedStatus,
            },
            objective: kr.objective ? {
              id: kr.objective.id,
              title: kr.objective.title,
              status: kr.objective.status,
            } : undefined,
          team: kr.objective?.team ? {
            id: kr.objective.team.id,
            name: kr.objective.team.name,
          } : undefined,
          });
        } else if (link.kr_type === 'org') {
          const kr = orgKrsMap.get(link.kr_id);
          if (!kr) continue; // KR not found

          const progress = calculateProgress(
            Number(kr.baseline) || 0,
            Number(kr.current_value) || 0,
            Number(kr.target) || 0,
            kr.direction || 'up'
          );

          const calculatedStatus: OkrCalculatedStatus = progress >= 100 
            ? 'completed' 
            : mapRagToCalculated(kr.status || 'not_started');

          const objective = kr.org_objective_id ? orgObjectivesMap.get(kr.org_objective_id) : undefined;

          result.push({
            id: link.id,
            kr_id: link.kr_id,
            kr_type: 'org',
            role: link.role,
            kr: {
              id: kr.id,
              title: kr.title,
              progress,
              status: calculatedStatus,
            },
            objective: objective ? {
              id: objective.id,
              title: objective.title,
              status: objective.status,
            } : undefined,
          });
        }
      }

      return result;
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
    not_started: 3,
    completed: 4,
    dropped: 5,
  };

  const sortByStatus = (a: LinkedKrData, b: LinkedKrData) => {
    const priorityA = statusPriority[a.kr.status || 'not_started'] ?? 99;
    const priorityB = statusPriority[b.kr.status || 'not_started'] ?? 99;
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
