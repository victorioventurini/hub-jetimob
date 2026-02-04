import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { calculateProgress } from '../types';
import { formatValueWithUnit } from '../constants/krUnits';
import { TrendingUp, TrendingDown, Equal, Rocket } from 'lucide-react';
import { getProgressColor, TREND_COLORS } from '@/lib/colors';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

  const isOverachieved = progress > 100;

  if (!title.trim() || isNaN(target)) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span>📊</span>
        <span>Preview</span>
        {isOverachieved && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-status-green/15 text-status-green text-[10px] font-medium ml-auto">
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
      </div>
      
      <div className="space-y-2">
        <p className="text-sm font-medium line-clamp-2">{title}</p>
        
        <div className="flex items-center gap-2">
          {/* Barra visual limitada a 100%, mas progress pode ser maior */}
          <Progress value={Math.min(100, progress)} className="flex-1 h-2" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`text-sm font-semibold tabular-nums ${isOverachieved ? 'text-status-green' : ''}`}>
                  {progress.toFixed(0)}%
                </span>
              </TooltipTrigger>
              {isOverachieved && (
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">
                    {progress.toFixed(1)}% da meta ({formatValueWithUnit(currentValue, unit)} / {formatValueWithUnit(target, unit)})
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          {direction === 'up' ? (
            <TrendingUp className={`h-4 w-4 ${TREND_COLORS.up}`} />
          ) : direction === 'down' ? (
            <TrendingDown className="h-4 w-4 text-info" />
          ) : (
            <Equal className="h-4 w-4 text-status-purple" />
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
          {isOverachieved && (
            <span className="ml-2 text-status-green font-medium">
              • Meta superada. Resultado acima do esperado.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
