import { cn } from '@/lib/utils';
import { OkrRagStatus, calculateProgress, OkrDirection } from '../types';

interface OkrProgressBarProps {
  baseline: number;
  current: number;
  target: number;
  direction: OkrDirection;
  status: OkrRagStatus;
  unit?: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function OkrProgressBar({
  baseline,
  current,
  target,
  direction,
  status,
  unit = '%',
  showLabels = true,
  size = 'md',
  className,
}: OkrProgressBarProps) {
  const progress = calculateProgress(baseline, current, target, direction);

  const getStatusColor = () => {
    switch (status) {
      case 'green':
        return 'bg-status-green';
      case 'yellow':
        return 'bg-status-yellow';
      case 'red':
        return 'bg-status-red';
      case 'not_started':
      default:
        return 'bg-status-gray/30';
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm':
        return 'h-1.5';
      case 'lg':
        return 'h-4';
      case 'md':
      default:
        return 'h-2.5';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>
            {current.toLocaleString('pt-BR')} {unit}
          </span>
          <span className="font-medium text-foreground">
            {progress.toFixed(0)}%
          </span>
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', getHeight())}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', getStatusColor())}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      {showLabels && (
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span>Base: {baseline.toLocaleString('pt-BR')}</span>
          <span>Meta: {target.toLocaleString('pt-BR')}</span>
        </div>
      )}
    </div>
  );
}
