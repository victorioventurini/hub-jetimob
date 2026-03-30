/**
 * ProjectStatusSummary — Summary cards with project counts by status
 * 
 * Follows the KpiStatusSummary canonical pattern: grid of cards with counts.
 */

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import type { ProjectWithRelations, ProjectStatus } from '../types';

interface ProjectStatusSummaryProps {
  projects: ProjectWithRelations[];
  className?: string;
}

const statusConfig: Array<{
  key: ProjectStatus | 'total';
  label: string;
  color: string;
}> = [
  { key: 'total', label: 'Total', color: 'text-foreground' },
  { key: 'in_progress', label: 'Em andamento', color: 'text-blue-600 dark:text-blue-400' },
  { key: 'planned', label: 'Planejados', color: 'text-muted-foreground' },
  { key: 'paused', label: 'Pausados', color: 'text-amber-600 dark:text-amber-400' },
  { key: 'done', label: 'Concluídos', color: 'text-emerald-600 dark:text-emerald-400' },
];

export function ProjectStatusSummary({ projects, className }: ProjectStatusSummaryProps) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { total: projects.length };
    for (const p of projects) {
      map[p.status] = (map[p.status] || 0) + 1;
    }
    return map;
  }, [projects]);

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-5 gap-3', className)}>
      {statusConfig.map((item) => {
        const value = counts[item.key] || 0;
        const pct = item.key !== 'total' && counts.total > 0
          ? Math.round((value / counts.total) * 100)
          : undefined;

        return (
          <Card key={item.key} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-baseline justify-between">
                <span className={cn('text-2xl font-bold', item.color)}>
                  {value}
                </span>
                {pct !== undefined && (
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
