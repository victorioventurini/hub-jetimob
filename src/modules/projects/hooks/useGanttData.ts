/**
 * useGanttData — Transforms ProjectWithRelations[] into GanttItem[] for timeline visualization
 */

import { useMemo } from 'react';
import { parseISO, isValid } from 'date-fns';
import type { ProjectStatus, MilestoneStatus, ProjectWithRelations, GanttItem } from '../types';

function isValidDateStr(d: string | null | undefined): d is string {
  if (!d) return false;
  const parsed = parseISO(d);
  return isValid(parsed);
}

interface UseGanttDataResult {
  items: GanttItem[];
  /** Projects that were excluded because they lack start_date or due_date */
  excludedCount: number;
}

interface UseGanttDataOptions {
  /**
   * Quando definido (e diferente de 'all'), milestones cujo status não casa
   * com o filtro são omitidas do Gantt para alinhar a visualização ao filtro
   * de status aplicado em /projects. Projetos continuam sendo filtrados em
   * useProjects (server-side para ativos, client-side para arquivados).
   *
   * Mapeamento ProjectStatus → MilestoneStatus aceito visualmente:
   *  - 'in_progress' → mostra apenas milestones 'in_progress'
   *  - 'done'        → mostra apenas milestones 'done'
   *  - 'planned' | 'paused' | 'cancelled' → mostra apenas milestones 'todo'
   *    (estados sem equivalente direto no enum de milestone)
   */
  statusFilter?: ProjectStatus | 'all';
}

function milestoneMatchesProjectStatus(
  msStatus: MilestoneStatus,
  projectStatusFilter: ProjectStatus | 'all' | undefined,
): boolean {
  if (!projectStatusFilter || projectStatusFilter === 'all') return true;
  if (projectStatusFilter === 'in_progress') return msStatus === 'in_progress';
  if (projectStatusFilter === 'done') return msStatus === 'done';
  // planned / paused / cancelled — sem equivalente direto; mostramos apenas pendentes ('todo')
  return msStatus === 'todo';
}

export function useGanttData(
  projects: ProjectWithRelations[] | undefined,
  options: UseGanttDataOptions = {},
): UseGanttDataResult {
  const { statusFilter } = options;

  return useMemo(() => {
    if (!projects?.length) return { items: [], excludedCount: 0 };

    const items: GanttItem[] = [];
    let excludedCount = 0;

    for (const project of projects) {
      if (!isValidDateStr(project.start_date) || !isValidDateStr(project.due_date)) {
        excludedCount++;
        continue;
      }

      // Project bar
      items.push({
        id: project.id,
        type: 'project',
        name: project.name,
        start_date: project.start_date,
        due_date: project.due_date,
        status: project.status,
        health: project.health,
        owner_id: project.owner_id,
        completion_pct: project.completion_pct,
      });

      // Milestone bars under project
      if (project.milestones?.length) {
        for (const ms of project.milestones) {
          if (ms.deleted_at || !isValidDateStr(ms.due_date)) continue;
          if (!milestoneMatchesProjectStatus(ms.status, statusFilter)) continue;
          const msStart = isValidDateStr(ms.start_date)
            ? ms.start_date
            : isValidDateStr(ms.created_at)
              ? ms.created_at
              : project.start_date;
          items.push({
            id: ms.id,
            type: 'milestone',
            name: ms.name,
            start_date: msStart,
            due_date: ms.due_date,
            status: ms.status,
            owner_id: ms.owner_id ?? undefined,
            parent_id: project.id,
            notes: ms.notes,
          });
        }
      }
    }

    return { items, excludedCount };
  }, [projects, statusFilter]);
}
