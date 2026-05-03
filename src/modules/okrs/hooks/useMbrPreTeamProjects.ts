/**
 * useMbrPreTeamProjects — Projetos do time consumidos pelo Step "Projetos"
 * do Pré-MBR. Rito reflexivo: somente leitura, sem mutations.
 *
 * Retorna projetos ativos do time + milestones, e classifica:
 * - projeto atrasado: `due_date < hoje` e `status != 'done'`
 * - milestone atrasado: `due_date < hoje` e `status != 'done'`
 *
 * Snapshot enxuto (Onda 4 F3): apenas IDs + nomes que serão exibidos no UI.
 * O draft persiste apenas o ID + texto da justificativa.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { mbrKeys } from '@/lib/queryKeys/okrs';
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
}

// ============================================================
// HELPERS
// ============================================================

function computeHealth(
  status: string,
  dueDate: string | null,
  completionPct: number,
): ProjectHealth {
  if (status === 'done' || status === 'cancelled') return 'on_track';
  if (!dueDate) return 'on_track';
  const now = new Date();
  const due = new Date(dueDate);
  const totalDays =
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (totalDays < 0) return 'late';
  if (completionPct < 50 && totalDays < 14) return 'at_risk';
  return 'on_track';
}

function isPastDue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false;
  if (status === 'done' || status === 'cancelled') return false;
  return new Date(dueDate).getTime() < Date.now();
}

// ============================================================
// HOOK
// ============================================================

const PROJECT_COLUMNS =
  'id, name, status, due_date, ' +
  'project_milestones(id, name, status, due_date, deleted_at)';

export function useMbrPreTeamProjects(
  teamId: string | null | undefined,
): UseMbrPreTeamProjectsResult {
  const { currentBuId } = useBu();
  const supabase = useBuScopedSupabase();

  const { data, isLoading } = useQuery({
    queryKey: mbrKeys.preTeamProjects(currentBuId, teamId),
    enabled: !!supabase && !!currentBuId && !!teamId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // 1. IDs de projetos vinculados ao time
      const { data: links, error: linksErr } = await supabase
        .from('project_teams')
        .select('project_id')
        .eq('team_id', teamId!);
      if (linksErr) throw linksErr;
      const projectIds = (links ?? [])
        .map((l) => l.project_id)
        .filter(Boolean);
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
      };
    }

    const overdueProjectIds: string[] = [];
    const overdueMilestoneIds: string[] = [];

    const projects: MbrPreProjectRow[] = data
      .map((p): MbrPreProjectRow => {
        const rawMilestones = (p.project_milestones ?? []).filter(
          // project_milestones tem APENAS deleted_at (mem://standards/soft-delete-policy-v1)
          (m: { deleted_at: string | null }) => !m.deleted_at,
        );
        const total = rawMilestones.length;
        const done = rawMilestones.filter(
          (m: { status: string }) => m.status === 'done',
        ).length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        const milestones: MbrPreMilestoneRow[] = rawMilestones.map(
          (m: {
            id: string;
            name: string;
            status: string;
            due_date: string | null;
          }) => {
            const overdue = isPastDue(m.due_date, m.status);
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

        const projectOverdue = isPastDue(p.due_date, p.status);
        if (projectOverdue) overdueProjectIds.push(p.id);

        const hasAnyOverdue =
          projectOverdue || milestones.some((m) => m.isOverdue);

        return {
          id: p.id,
          name: p.name,
          status: p.status as ProjectStatus,
          due_date: p.due_date,
          health: computeHealth(p.status, p.due_date, pct),
          milestonesTotal: total,
          milestonesDone: done,
          completionPct: pct,
          isOverdue: projectOverdue,
          milestones,
          hasAnyOverdue,
        };
      })
      // Ordena: atrasados primeiro, depois por nome
      .sort((a, b) => {
        if (a.hasAnyOverdue !== b.hasAnyOverdue) {
          return a.hasAnyOverdue ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

    return {
      projects,
      isLoading,
      overdueProjectIds,
      overdueMilestoneIds,
    };
  }, [data, isLoading]);

  return result;
}
