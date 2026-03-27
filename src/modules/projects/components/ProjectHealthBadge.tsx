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
  /** Show only the colored dot without label/background */
  dotOnly?: boolean;
}

export function ProjectHealthBadge({ health, className, dotOnly }: ProjectHealthBadgeProps) {
  const config = healthConfig[health];

  const dot = (
    <span
      className={cn(
        'rounded-full shrink-0',
        dotOnly ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5',
        health === 'on_track' && 'bg-emerald-500',
        health === 'at_risk' && 'bg-amber-500',
        health === 'late' && 'bg-red-500',
      )}
      title={config.label}
    />
  );

  if (dotOnly) return dot;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      config.className,
      className,
    )}>
      {dot}
      {config.label}
    </span>
  );
}
