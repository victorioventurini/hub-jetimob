import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RAG_STATUS_COLORS } from '@/lib/colors';

interface OkrCycleProgressProps {
  startDate: string | Date;
  endDate: string | Date;
  currentProgress?: number;
  cycleName?: string;
  className?: string;
  variant?: 'badge' | 'bar' | 'full';
}

export function OkrCycleProgress({ 
  startDate, 
  endDate, 
  currentProgress = 0,
  cycleName,
  className,
  variant = 'badge',
}: OkrCycleProgressProps) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  const totalDays = differenceInDays(end, start);
  const elapsedDays = differenceInDays(now, start);
  const remainingDays = differenceInDays(end, now);
  
  const cycleProgress = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
  const isOverdue = isAfter(now, end);
  const hasNotStarted = isBefore(now, start);

  // Calculate if progress is behind schedule
  const expectedProgress = cycleProgress;
  const progressGap = expectedProgress - currentProgress;
  const isAtRisk = progressGap > 15 && !isOverdue && !hasNotStarted;
  const isOnTrack = progressGap <= 0;

  if (variant === 'badge') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs cursor-help',
              isOverdue && `${RAG_STATUS_COLORS.red.badge} ${RAG_STATUS_COLORS.red.border}`,
              isAtRisk && `${RAG_STATUS_COLORS.yellow.badge} ${RAG_STATUS_COLORS.yellow.border}`,
              isOnTrack && !isOverdue && `${RAG_STATUS_COLORS.green.badge} ${RAG_STATUS_COLORS.green.border}`,
              className
            )}
          >
            {isOverdue ? (
              <AlertTriangle className="w-3 h-3 mr-1" />
            ) : (
              <Clock className="w-3 h-3 mr-1" />
            )}
            {cycleName || `${Math.round(cycleProgress)}% do ciclo`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm">
                {format(start, 'd MMM', { locale: ptBR })} - {format(end, 'd MMM yyyy', { locale: ptBR })}
              </span>
            </div>
            {!isOverdue && !hasNotStarted && (
              <>
                <div className="text-xs text-muted-foreground">
                  ⏳ {Math.round(cycleProgress)}% do tempo decorrido
                </div>
                {isAtRisk && (
                  <div className="text-xs text-yellow-600">
                    ⚠️ Progresso {Math.round(progressGap)}% abaixo do esperado
                  </div>
                )}
                {isOnTrack && (
                  <div className="text-xs text-green-600">
                    ✓ Progresso alinhado ou adiantado
                  </div>
                )}
              </>
            )}
            {isOverdue && (
              <div className="text-xs text-red-600">
                ⚠️ Ciclo encerrado há {Math.abs(remainingDays)} dias
              </div>
            )}
            {hasNotStarted && (
              <div className="text-xs text-muted-foreground">
                Inicia em {remainingDays} dias
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'bar') {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Tempo decorrido
          </span>
          <span className={cn(
            'font-medium',
            isOverdue && 'text-red-600',
            isAtRisk && 'text-yellow-600',
          )}>
            {Math.round(cycleProgress)}%
          </span>
        </div>
        <Progress 
          value={cycleProgress} 
          className="h-1.5"
        />
        {remainingDays > 0 && !isOverdue && (
          <p className="text-[10px] text-muted-foreground">
            {remainingDays} dias restantes
          </p>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={cn('p-3 rounded-lg bg-muted/30 space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{cycleName || 'Ciclo'}</span>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            'text-xs',
            isOverdue && `${RAG_STATUS_COLORS.red.badge} ${RAG_STATUS_COLORS.red.border}`,
            isAtRisk && `${RAG_STATUS_COLORS.yellow.badge} ${RAG_STATUS_COLORS.yellow.border}`,
            isOnTrack && !isOverdue && `${RAG_STATUS_COLORS.green.badge} ${RAG_STATUS_COLORS.green.border}`,
          )}
        >
          {isOverdue ? 'Encerrado' : isAtRisk ? 'Atrasado' : 'No prazo'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-muted-foreground">Início</p>
          <p className="font-medium">{format(start, 'd MMM yyyy', { locale: ptBR })}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Fim</p>
          <p className="font-medium">{format(end, 'd MMM yyyy', { locale: ptBR })}</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Tempo</span>
          <span>{Math.round(cycleProgress)}%</span>
        </div>
        <div className="relative">
          <Progress value={cycleProgress} className="h-2" />
          {/* Progress marker */}
          {currentProgress > 0 && currentProgress < 100 && (
            <div 
              className="absolute top-0 w-0.5 h-2 bg-primary"
              style={{ left: `${currentProgress}%` }}
            />
          )}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{Math.round(currentProgress)}%</span>
        </div>
      </div>

      {isAtRisk && (
        <div className="flex items-center gap-1.5 text-xs text-yellow-600 pt-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{Math.round(progressGap)}% abaixo do esperado para este ponto do ciclo</span>
        </div>
      )}
      
      {isOnTrack && !isOverdue && (
        <div className="flex items-center gap-1.5 text-xs text-green-600 pt-1">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Progresso alinhado com o tempo</span>
        </div>
      )}
    </div>
  );
}
