import { AlertTriangle, Clock, CalendarX, TrendingDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Cycle } from "../hooks";

interface CycleTimeAlertProps {
  cycle: Cycle;
  actualProgress: number;
  className?: string;
}

/**
 * Displays an alert when progress is significantly behind the expected cycle progress.
 */
export function CycleProgressAlert({ cycle, actualProgress, className }: CycleTimeAlertProps) {
  const today = new Date();
  const start = parseISO(cycle.start_date);
  const end = parseISO(cycle.end_date);

  // Check if cycle has ended
  if (isAfter(today, end)) {
    return null; // Don't show alert for past cycles
  }

  const totalDays = differenceInDays(end, start);
  const elapsedDays = Math.max(0, differenceInDays(today, start));
  const percentElapsed = totalDays > 0 ? Math.round((elapsedDays / totalDays) * 100) : 0;

  const expectedProgress = percentElapsed;
  const progressDelta = actualProgress - expectedProgress;

  // Only show alert if significantly behind (more than 15% behind expected)
  if (progressDelta >= -15) {
    return null;
  }

  const remainingDays = Math.max(0, differenceInDays(end, today));

  return (
    <Alert 
      variant="default" 
      className={cn(
        "border-status-yellow/50 bg-status-yellow-muted",
        className
      )}
    >
      <TrendingDown className="h-4 w-4 text-status-yellow" />
      <AlertDescription className="text-sm text-status-yellow">
        <span className="font-medium">Progresso abaixo do esperado.</span>
        {" "}
        Com {percentElapsed}% do ciclo decorrido, o esperado seria ~{expectedProgress}% de progresso.
        {" "}
        <span className="text-muted-foreground">
          Restam {remainingDays} dias até o fim do ciclo.
        </span>
      </AlertDescription>
    </Alert>
  );
}

interface InitiativeDateAlertProps {
  expectedEndDate: string;
  cycle: Cycle;
  className?: string;
}

/**
 * Displays a warning when initiative end date extends beyond cycle end.
 */
export function InitiativeDateAlert({ expectedEndDate, cycle, className }: InitiativeDateAlertProps) {
  const initEnd = parseISO(expectedEndDate);
  const cycleEnd = parseISO(cycle.end_date);

  if (!isAfter(initEnd, cycleEnd)) {
    return null;
  }

  const daysAfter = differenceInDays(initEnd, cycleEnd);

  return (
    <Alert 
      variant="default" 
      className={cn(
        "border-warning/50 bg-warning/10",
        className
      )}
    >
      <CalendarX className="h-4 w-4 text-warning" />
      <AlertDescription className="text-sm text-warning-muted-foreground">
        <span className="font-medium">Prazo além do ciclo.</span>
        {" "}
        Esta iniciativa termina {daysAfter} dia{daysAfter !== 1 ? "s" : ""} após o fim do ciclo ({format(cycleEnd, "dd/MM/yyyy", { locale: ptBR })}).
        {" "}
        <span className="text-muted-foreground">
          Isso pode impactar a avaliação do KR associado.
        </span>
      </AlertDescription>
    </Alert>
  );
}

interface CycleRemainingBadgeProps {
  cycle: Cycle;
  className?: string;
}

/**
 * Badge showing remaining time in cycle.
 */
export function CycleRemainingBadge({ cycle, className }: CycleRemainingBadgeProps) {
  const today = new Date();
  const end = parseISO(cycle.end_date);
  const remainingDays = differenceInDays(end, today);

  if (remainingDays < 0) {
    return (
      <Badge variant="secondary" className={cn("gap-1", className)}>
        <Clock className="h-3 w-3" />
        Ciclo encerrado
      </Badge>
    );
  }

  const isUrgent = remainingDays <= 7;
  const isWarning = remainingDays <= 14;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isUrgent ? "destructive" : isWarning ? "secondary" : "outline"} 
            className={cn("gap-1", className)}
          >
            <Clock className="h-3 w-3" />
            {remainingDays === 0 ? "Último dia" : `${remainingDays} dia${remainingDays !== 1 ? "s" : ""}`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {remainingDays === 0 
            ? "Hoje é o último dia do ciclo"
            : `Faltam ${remainingDays} dias para o fim do ciclo (${format(end, "dd/MM/yyyy", { locale: ptBR })})`
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ExpectedProgressIndicatorProps {
  actualProgress: number;
  cycle: Cycle;
  showLabel?: boolean;
  className?: string;
}

/**
 * Shows expected vs actual progress indicator.
 */
export function ExpectedProgressIndicator({ 
  actualProgress, 
  cycle, 
  showLabel = true,
  className 
}: ExpectedProgressIndicatorProps) {
  const today = new Date();
  const start = parseISO(cycle.start_date);
  const end = parseISO(cycle.end_date);

  const totalDays = differenceInDays(end, start);
  const elapsedDays = Math.max(0, differenceInDays(today, start));
  const expectedProgress = totalDays > 0 ? Math.round((elapsedDays / totalDays) * 100) : 0;

  const delta = actualProgress - expectedProgress;
  const isAhead = delta > 10;
  const isBehind = delta < -10;

  const getStatusColor = () => {
    if (isAhead) return "text-success";
    if (isBehind) return "text-destructive";
    return "text-muted-foreground";
  };

  const getStatusIcon = () => {
    if (isBehind) return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1 text-xs", getStatusColor(), className)}>
            {getStatusIcon()}
            {showLabel && (
              <span>
                {isBehind 
                  ? `${Math.abs(Math.round(delta))}% atrás` 
                  : isAhead 
                    ? `${Math.round(delta)}% à frente` 
                    : "No ritmo"
                }
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          <p>
            <span className="font-medium">Progresso atual:</span> {Math.round(actualProgress)}%
          </p>
          <p>
            <span className="font-medium">Esperado (linear):</span> {expectedProgress}%
          </p>
          <p className="text-muted-foreground mt-1">
            Com base em {elapsedDays} de {totalDays} dias do ciclo.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface LateInitiativesBadgeProps {
  lateCount: number;
  totalCount: number;
  className?: string;
}

/**
 * Badge indicating late initiatives on an objective.
 */
export function LateInitiativesBadge({ lateCount, totalCount, className }: LateInitiativesBadgeProps) {
  if (lateCount === 0 || totalCount === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn("gap-1 border-status-orange/50 text-status-orange", className)}>
            <AlertTriangle className="h-3 w-3" />
            {lateCount}/{totalCount} atrasada{lateCount !== 1 ? "s" : ""}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {lateCount} de {totalCount} iniciativa{totalCount !== 1 ? "s" : ""} com prazo vencido
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
