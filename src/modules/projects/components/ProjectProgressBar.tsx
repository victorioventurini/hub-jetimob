import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface ProjectProgressBarProps {
  total: number;
  done: number;
  pct: number;
  className?: string;
  showLabel?: boolean;
}

export function ProjectProgressBar({ total, done, pct, className, showLabel = true }: ProjectProgressBarProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Progress value={pct} className="h-2 flex-1" />
      {showLabel && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {done}/{total}
        </span>
      )}
    </div>
  );
}
