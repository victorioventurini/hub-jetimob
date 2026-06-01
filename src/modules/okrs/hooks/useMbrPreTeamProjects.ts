/**
 * useMbrPreTeamProjects — Projetos do time consumidos pelo Step "Projetos"
 * do Pré-MBR. Rito reflexivo: somente leitura, sem mutations.
 *
 * Ancoragem temporal (v2):
 *   O cut-off de "atrasado" é o **fim do mês de referência** (não `Date.now()`).
 *   - Sem `referenceMonth`: usa `defaultReferenceMonth()` (mês fechado anterior).
 *   - Com `referenceMonth`: cut-off = último dia desse mês (`monthBoundsDate`).
 *   - Milestones marcados como `done`/`cancelled` mas com `due_date` posterior
 *     ao cut-off também não são "atrasados" pela perspectiva do mês.
 *
 * Snapshot enxuto (Onda 4 F3): apenas IDs + nomes que serão exibidos no UI.
 * O draft persiste apenas o ID + texto da justificativa.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { mbrKeys } from '@/lib/queryKeys/okrs';
import { useTeamResponsibilityScope } from '@/modules/teams/hooks/useTeamResponsibilityScope';
import {
  defaultReferenceMonth,
  monthBoundsDate,
} from '@/modules/okrs/utils/mbr/referenceMonth';
import type {
  MilestoneStatus,
  ProjectHealth,
  ProjectStatus,
} from '@/modules/projects/types';

// ============================================================
// TYPES
// ============================================================

export interface MbrPreMilestoneRow {
  id: string;
  name: string;
  status: MilestoneStatus;
  due_date: string | null;
  isOverdue: boolean;
}

export interface MbrPreProjectRow {
  id: string;
  name: string;
  status: ProjectStatus;
  due_date: string | null;
  health: ProjectHealth;
  milestonesTotal: number;
  milestonesDone: number;
  completionPct: number;
  isOverdue: boolean;
  milestones: MbrPreMilestoneRow[];
  /** Pelo menos um item (projeto OU milestone) atrasado. */
  hasAnyOverdue: boolean;
}

export interface UseMbrPreTeamProjectsResult {
  projects: MbrPreProjectRow[];
  isLoading: boolean;
  /** IDs de projetos atrasados — usados pelo Opening + Summary. */
  overdueProjectIds: string[];
  /** IDs de milestones atrasados — usados pelo Opening + Summary. */
  overdueMilestoneIds: string[];
  /** Cut-off ISO (YYYY-MM-DD) usado para classificar atrasos. Útil para UI. */
  cutoffDate: string;
}

// ============================================================
// HELPERS
// ============================================================

/** Health relativo ao cut-off do mês de referência. */
function computeHealth(
  status: string,
  dueDate: string | null,
  completionPct: number,
  cutoffDate: string,
): ProjectHealth {
  if (status === 'done' || status === 'cancelled') return 'on_track';
  if (!dueDate) return 'on_track';
  const cutoff = new Date(`${cutoffDate}T23:59:59`);
  const due = new Date(dueDate);
  const daysToDue = (due.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
  if (daysToDue < 0) return 'late';
  if (completionPct < 50 && daysToDue < 14) return 'at_risk';
  return 'on_track';
}

/**
 * "Atrasado" do ponto de vista do mês de referência:
 *   - status ainda em aberto no fim do mês (não `done`/`cancelled`)
 *   - `due_date` <= cut-off do mês (vencia dentro ou antes do mês analisado)
 */
function isPastDueAtCutoff(
  dueDate: string | null,
  status: string,
  cutoffDate: string,
): boolean {
  if (!dueDate) return false;
  if (status === 'done' || status === 'cancelled') return false;
  return dueDate <= cutoffDate;
}

// ============================================================
// HOOK
// ============================================================

const PROJECT_COLUMNS =
  'id, name, status, due_date, owner_id, ' +
  'project_milestones(id, name, status, due_date, owner_id, deleted_at)';

export function useMbrPreTeamProjects(
  teamId: string | null | undefined,
  referenceMonth?: string | null,
): UseMbrPreTeamProjectsResult {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();
  const scope = useTeamResponsibilityScope(teamId);

  const refMonth = referenceMonth || defaultReferenceMonth();
  const cutoffDate = useMemo(() => {
    const bounds = monthBoundsDate(refMonth);
    return bounds?.end ?? refMonth;
  }, [refMonth]);

  const { data, isLoading } = useQuery({
    queryKey: mbrKeys.preTeamProjects(currentBuId, teamId, refMonth),
    enabled:
      !!supabase &&
      !!currentBuId &&
      !!teamId &&
      !scope.isLoading &&
      scope.teamIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // 1. IDs de projetos vinculados ao time OU subtimes
      const { data: links, error: linksErr } = await supabase
        .from('project_teams')
        .select('project_id')
        .in('team_id', scope.teamIds);
      if (linksErr) throw linksErr;
      const projectIds = Array.from(
        new Set((links ?? []).map((l) => l.project_id).filter(Boolean)),
      );
      if (projectIds.length === 0) return [];

      // 2. Projetos ativos (não done/cancelled) com milestones
      const { data: projects, error } = await supabase
        .from('projects')
        .select(PROJECT_COLUMNS)
        .eq('bu_id', currentBuId!)
        .in('id', projectIds)
        .in('status', ['planned', 'in_progress', 'paused'])
        .is('deleted_at', null);
      if (error) throw error;
      return projects ?? [];
    },
  });

  const result = useMemo<UseMbrPreTeamProjectsResult>(() => {
    if (!data) {
      return {
        projects: [],
        isLoading,
        overdueProjectIds: [],
        overdueMilestoneIds: [],
        cutoffDate,
      };
    }

  const memberIds = scope.memberProfileIds;

  const result = useMemo<UseMbrPreTeamProjectsResult>(() => {
    if (!data) {
      return {
        projects: [],
        isLoading: isLoading || scope.isLoading,
        overdueProjectIds: [],
        overdueMilestoneIds: [],
        cutoffDate,
      };
    }

    const overdueProjectIds: string[] = [];
    const overdueMilestoneIds: string[] = [];

    const projects: MbrPreProjectRow[] = (data as any[])
      .map((p): MbrPreProjectRow | null => {
        // Filtra milestones por responsabilidade do time + subtimes
        const rawMilestones = (p.project_milestones ?? []).filter(
          // project_milestones tem APENAS deleted_at (mem://standards/soft-delete-policy-v1)
          (m: any) => !m.deleted_at && m.owner_id && memberIds.has(m.owner_id),
        );
        const ownerIsMember = !!p.owner_id && memberIds.has(p.owner_id);

        // Projeto só aparece se owner é membro OU tem milestone de membro
        if (!ownerIsMember && rawMilestones.length === 0) return null;

        const total = rawMilestones.length;
        const done = rawMilestones.filter(
          (m: any) => m.status === 'done',
        ).length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        const milestones: MbrPreMilestoneRow[] = rawMilestones.map(
          (m: any) => {
            const overdue = isPastDueAtCutoff(m.due_date, m.status, cutoffDate);
            if (overdue) overdueMilestoneIds.push(m.id);
            return {
              id: m.id,
              name: m.name,
              status: m.status as MilestoneStatus,
              due_date: m.due_date,
              isOverdue: overdue,
            };
          },
        );

        const projectOverdue = isPastDueAtCutoff(p.due_date, p.status, cutoffDate);
        if (projectOverdue) overdueProjectIds.push(p.id);

        const hasAnyOverdue =
          projectOverdue || milestones.some((m) => m.isOverdue);

        return {
          id: p.id,
          name: p.name,
          status: p.status as ProjectStatus,
          due_date: p.due_date,
          health: computeHealth(p.status, p.due_date, pct, cutoffDate),
          milestonesTotal: total,
          milestonesDone: done,
          completionPct: pct,
          isOverdue: projectOverdue,
          milestones,
          hasAnyOverdue,
        };
      })
      .filter((p): p is MbrPreProjectRow => p !== null)
      // Ordena: atrasados primeiro, depois por nome
      .sort((a, b) => {
        if (a.hasAnyOverdue !== b.hasAnyOverdue) {
          return a.hasAnyOverdue ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

    return {
      projects,
      isLoading: isLoading || scope.isLoading,
      overdueProjectIds,
      overdueMilestoneIds,
      cutoffDate,
    };
  }, [data, isLoading, scope.isLoading, memberIds, cutoffDate]);

  return result;
}
