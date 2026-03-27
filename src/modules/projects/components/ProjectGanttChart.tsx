/**
 * ProjectGanttChart — Wrapper around GanttTimeline for the global projects view
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GanttItem } from '../types';
import { GanttTimeline } from './GanttTimeline';

interface ProjectGanttChartProps {
  items: GanttItem[];
  excludedCount: number;
}

export function ProjectGanttChart({ items, excludedCount }: ProjectGanttChartProps) {
  const navigate = useNavigate();

  const handleItemClick = useCallback(
    (item: GanttItem) => {
      const projectId = item.type === 'project' ? item.id : item.parent_id;
      if (projectId) navigate(`/projects/${projectId}`);
    },
    [navigate],
  );

  return (
    <GanttTimeline
      items={items}
      excludedCount={excludedCount}
      showLegend
      onItemClick={handleItemClick}
    />
  );
}
