import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, type OkrCalculatedStatus } from "../../hooks";

interface StatusCounts {
  on_track: number;
  at_risk: number;
  off_track: number;
  not_started: number;
  completed: number;
  dropped: number;
  total: number;
}

interface StatusDistributionBarProps {
  counts: StatusCounts;
  isLoading?: boolean;
}

const STATUS_ORDER: OkrCalculatedStatus[] = [
  'completed',
  'on_track', 
  'at_risk', 
  'off_track',
  'not_started',
  'dropped',
];

export function StatusDistributionBar({ counts, isLoading }: StatusDistributionBarProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-full rounded-full" />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
    );
  }

  const { total } = counts;
  
  if (total === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Progresso por Status</span>
          <span className="text-sm text-muted-foreground">0 KRs</span>
        </div>
        <div className="h-8 w-full rounded-full bg-muted flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Nenhum Key Result</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Progresso por Status</span>
        <span className="text-sm text-muted-foreground">{total} KRs</span>
      </div>
      
      {/* Horizontal stacked bar */}
      <div className="h-8 w-full rounded-full overflow-hidden flex bg-muted">
        {STATUS_ORDER.map((status) => {
          const count = counts[status];
          if (count === 0) return null;
          
          const percentage = (count / total) * 100;
          const config = STATUS_CONFIG[status];
          
          return (
            <Tooltip key={status}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "h-full flex items-center justify-center text-xs font-medium text-white transition-all cursor-default",
                    config.bgColor
                  )}
                  style={{ width: `${percentage}%` }}
                >
                  {percentage > 10 && count}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{config.label}: {count} ({percentage.toFixed(0)}%)</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {STATUS_ORDER.map((status) => {
          const count = counts[status];
          if (count === 0) return null;
          
          const config = STATUS_CONFIG[status];
          
          return (
            <div key={status} className="flex items-center gap-1.5 text-xs">
              <div className={cn("w-2.5 h-2.5 rounded-full", config.bgColor)} />
              <span className="text-muted-foreground">{config.label}</span>
              <span className="font-medium">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
