import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface ProjectProgressBarProps {
  total: number;
  done: number;
  pct: number;
  className?: string;
  showLabel?: boolean;
  /** Show percentage text inline (e.g. "65%") */
  showPct?: boolean;
}

export function ProjectProgressBar({ total, done, pct, className, showLabel = true, showPct }: ProjectProgressBarProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Progress value={pct} className="h-2 flex-1" />
      {showPct && (
        <span className="text-xs font-medium text-foreground whitespace-nowrap">
          {Math.round(pct)}%
        </span>
      )}
      {showLabel && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {done}/{total}
        </span>
      )}
    </div>
  );
}
