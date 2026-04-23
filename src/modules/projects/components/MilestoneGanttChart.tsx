/**
 * MilestoneGanttChart — Wrapper around GanttTimeline for a single project's milestones
 */

import { useMemo } from 'react';
import { isValid, parseISO } from 'date-fns';
import type { ProjectMilestone, GanttItem } from '../types';
import { GanttTimeline } from './GanttTimeline';

interface MilestoneGanttChartProps {
  milestones: ProjectMilestone[];
  projectStartDate?: string | null;
  projectDueDate?: string | null;
}

export function MilestoneGanttChart({ milestones, projectStartDate, projectDueDate }: MilestoneGanttChartProps) {
  const { items, excludedCount } = useMemo(() => {
    const items: GanttItem[] = [];
    let excludedCount = 0;

    const sorted = [...milestones]
      .filter((m) => !m.deleted_at)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));

    for (const m of sorted) {
      if (!m.due_date || !isValid(parseISO(m.due_date))) {
        excludedCount++;
        continue;
      }

      // Use real start_date when present; fallback only for legacy/edge cases.
      const startDate =
        m.start_date && isValid(parseISO(m.start_date))
          ? m.start_date
          : m.created_at && isValid(parseISO(m.created_at))
            ? m.created_at
            : projectStartDate && isValid(parseISO(projectStartDate))
              ? projectStartDate
              : m.due_date;

      items.push({
        id: m.id,
        type: 'milestone',
        name: m.name,
        start_date: startDate,
        due_date: m.due_date,
        status: m.status,
        owner_id: m.owner_id ?? undefined,
        notes: m.notes,
      });
    }

    return { items, excludedCount };
  }, [milestones, projectStartDate, projectDueDate]);

  return (
    <GanttTimeline
      items={items}
      excludedCount={excludedCount}
      showLegend={false}
    />
  );
}
