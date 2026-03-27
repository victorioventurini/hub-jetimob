/**
 * useGanttData — Transforms ProjectWithRelations[] into GanttItem[] for timeline visualization
 */

import { useMemo } from 'react';
import { parseISO, isValid } from 'date-fns';
import type { ProjectWithRelations, GanttItem } from '../types';

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

export function useGanttData(projects: ProjectWithRelations[] | undefined): UseGanttDataResult {
  return useMemo(() => {
    if (!projects?.length) return { items: [], excludedCount: 0 };

    const items: GanttItem[] = [];
    let excludedCount = 0;

    for (const project of projects) {
      if (!project.start_date || !project.due_date) {
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
      });

      // Milestone bars under project
      if (project.milestones?.length) {
        for (const ms of project.milestones) {
          if (!ms.due_date || ms.deleted_at) continue;
          items.push({
            id: ms.id,
            type: 'milestone',
            name: ms.name,
            start_date: ms.created_at, // milestones may not have start_date, use created_at
            due_date: ms.due_date,
            status: ms.status,
            owner_id: ms.owner_id ?? undefined,
            parent_id: project.id,
          });
        }
      }
    }

    return { items, excludedCount };
  }, [projects]);
}
