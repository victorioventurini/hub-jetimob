/**
 * ActiveCycleIndicator — Indicador de ciclo ativo no Header
 * 
 * Exibe: Q2 2026 · Semana 4 de 13 · 31%
 * Click navega para /okrs (dashboard de OKRs)
 */

import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useActiveCycle } from '@/modules/okrs/hooks/useActiveCycle';
import { useCycleProgress } from '@/modules/okrs/hooks/useCycleData';
import { format, parseISO, differenceInWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ActiveCycleIndicator() {
  const { activeQuarterlyCycle, activeCycle } = useActiveCycle();
  const cycle = activeQuarterlyCycle || activeCycle;
  const progress = useCycleProgress(cycle);

  if (!cycle) return null;

  const start = parseISO(cycle.start_date);
  const end = parseISO(cycle.end_date);
  const totalWeeks = Math.max(1, differenceInWeeks(end, start));
  const currentWeek = Math.min(totalWeeks, Math.max(1, differenceInWeeks(new Date(), start) + 1));

  const startFormatted = format(start, "dd MMM", { locale: ptBR });
  const endFormatted = format(end, "dd MMM", { locale: ptBR });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to="/okrs" className="hidden md:flex">
          <Badge 
            variant="outline" 
            className="gap-1.5 px-2.5 py-1 text-xs font-medium cursor-pointer hover:bg-accent transition-colors"
          >
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{cycle.name}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              Sem {currentWeek}/{totalWeeks}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{progress.percentElapsed}%</span>
          </Badge>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="font-medium">{cycle.name}</p>
        <p className="text-xs text-muted-foreground">
          {startFormatted} → {endFormatted} · {progress.remainingDays} dias restantes
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
