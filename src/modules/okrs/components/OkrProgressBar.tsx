import { cn } from '@/lib/utils';
import { OkrRagStatus, calculateProgress, OkrDirection } from '../types';
import { formatValueWithUnit } from '@/shared/constants/units';
import { Rocket } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

// Null-safe formatting helper
const safeFormat = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('pt-BR');
};

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
  const progress = calculateProgress(baseline ?? 0, current ?? 0, target ?? 0, direction);
  const isOverachieved = progress > 100;

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
            {formatValueWithUnit(current, unit)}
          </span>
          <div className="flex items-center gap-1.5">
            {isOverachieved && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-status-green/15 text-status-green text-[10px] font-medium">
                      <Rocket className="h-3 w-3" />
                      Meta superada
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-sm">
                      Superar 100% indica que a meta foi ultrapassada. Isso gera aprendizado para calibrar metas futuras.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn(
                    "font-medium",
                    isOverachieved ? "text-status-green" : "text-foreground"
                  )}>
                    {progress.toFixed(0)}%
                  </span>
                </TooltipTrigger>
                {isOverachieved && (
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-sm">
                      {progress.toFixed(1)}% da meta ({safeFormat(current)} / {safeFormat(target)})
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
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
          <span>Base: {formatValueWithUnit(baseline, unit)}</span>
          <span>Meta: {formatValueWithUnit(target, unit)}</span>
        </div>
      )}
    </div>
  );
}
