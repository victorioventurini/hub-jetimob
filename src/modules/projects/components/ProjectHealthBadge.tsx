import { cn } from '@/lib/utils';
import type { ProjectHealth } from '../types';

const healthConfig: Record<ProjectHealth, { label: string; className: string }> = {
  on_track: { label: 'No prazo', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  at_risk: { label: 'Em risco', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  late: { label: 'Atrasado', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

interface ProjectHealthBadgeProps {
  health: ProjectHealth;
  className?: string;
}

export function ProjectHealthBadge({ health, className }: ProjectHealthBadgeProps) {
  const config = healthConfig[health];
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      config.className,
      className,
    )}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        health === 'on_track' && 'bg-emerald-500',
        health === 'at_risk' && 'bg-amber-500',
        health === 'late' && 'bg-red-500',
      )} />
      {config.label}
    </span>
  );
}
