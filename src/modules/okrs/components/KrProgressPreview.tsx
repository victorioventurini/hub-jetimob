import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { calculateProgress } from '../types';
import { formatValueWithUnit } from '../constants/krUnits';
import { TrendingUp, TrendingDown, Equal } from 'lucide-react';
import { getProgressColor, TREND_COLORS } from '@/lib/colors';
import type { OkrDirection } from '../types';

interface KrProgressPreviewProps {
  title: string;
  baseline: number;
  currentValue: number;
  target: number;
  unit: string;
  direction: OkrDirection;
}

export function KrProgressPreview({
  title,
  baseline,
  currentValue,
  target,
  unit,
  direction,
}: KrProgressPreviewProps) {
  const progress = useMemo(() => {
    return calculateProgress(baseline, currentValue, target, direction);
  }, [baseline, currentValue, target, direction]);

  const progressColor = useMemo(() => {
    return getProgressColor(progress);
  }, [progress]);

  if (!title.trim() || isNaN(target)) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span>📊</span>
        <span>Preview</span>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm font-medium line-clamp-2">{title}</p>
        
        <div className="flex items-center gap-2">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-sm font-semibold tabular-nums">
            {progress.toFixed(0)}%
          </span>
          {direction === 'up' ? (
            <TrendingUp className={`h-4 w-4 ${TREND_COLORS.up}`} />
          ) : direction === 'down' ? (
            <TrendingDown className="h-4 w-4 text-info" />
          ) : (
            <Equal className="h-4 w-4 text-purple-500" />
          )}
        </div>
        
        <p className="text-xs text-muted-foreground">
          Progresso: {formatValueWithUnit(currentValue, unit)} de{' '}
          {formatValueWithUnit(target, unit)}
          {baseline !== 0 && (
            <span className="ml-1">
              (inicial: {formatValueWithUnit(baseline, unit)})
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
