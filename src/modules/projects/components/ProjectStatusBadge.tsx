import { cn } from '@/lib/utils';
import type { ProjectStatus } from '../types';

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  planned: { label: 'Planejado', className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'Em andamento', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  paused: { label: 'Pausado', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  done: { label: 'Concluído', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100/50 text-muted-foreground line-through' },
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      config.className,
      className,
    )}>
      {config.label}
    </span>
  );
}
