/**
 * CycleRitualDates — Exibe datas de rituais inline para um ciclo trimestral
 * 
 * Mostra MBR (review_date), Pré-QBR (planning_date) e QBR (retro_date) com badges de status.
 * Nos meses de QBR (quando retro_date existe), o MBR aparece como "Substituído pelo QBR".
 */

import { format, parseISO, isPast, isWithinInterval, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CycleRitualDatesProps {
  planning_date: string | null;
  review_date: string | null;
  retro_date: string | null;
  end_date?: string | null;
}

function formatShort(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MMM", { locale: ptBR });
}

/**
 * Checks if the MBR review_date falls within the QBR period (retro_date → end_date+7d).
 * This means MBR is "replaced" by QBR in that quarter.
 */
function isMbrReplacedByQbr(
  review_date: string | null,
  retro_date: string | null,
  end_date: string | null,
): boolean {
  if (!review_date || !retro_date || !end_date) return false;

  const review = parseISO(review_date);
  const retro = parseISO(retro_date);
  const endPlusWindow = addDays(parseISO(end_date), 7);

  return isWithinInterval(review, { start: retro, end: endPlusWindow });
}

function DateBadge({ label, dateStr }: { label: string; dateStr: string | null }) {
  if (!dateStr) return null;

  const past = isPast(parseISO(dateStr));

  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <Badge
        variant={past ? 'default' : 'secondary'}
        className={past
          ? 'bg-success/15 text-success border-success/30 text-[10px] px-1.5 py-0'
          : 'text-[10px] px-1.5 py-0'
        }
      >
        {formatShort(dateStr)}
      </Badge>
    </span>
  );
}

function ReplacedByQbrBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">MBR:</span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-muted-foreground/20 gap-0.5"
            >
              <Info className="h-2.5 w-2.5" />
              Substituído pelo QBR
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>O QBR substitui o MBR neste mês</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function CycleRitualDates({ planning_date, review_date, retro_date, end_date }: CycleRitualDatesProps) {
  // Don't render if no ritual dates configured
  if (!planning_date && !review_date && !retro_date) return null;

  const mbrReplaced = isMbrReplacedByQbr(review_date, retro_date, end_date ?? null);

  return (
    <div className="flex flex-wrap items-center gap-3 mt-1">
      {mbrReplaced ? (
        <ReplacedByQbrBadge />
      ) : (
        <DateBadge label="MBR" dateStr={review_date} />
      )}
      <DateBadge label="Pré-QBR" dateStr={planning_date} />
      <DateBadge label="QBR" dateStr={retro_date} />
    </div>
  );
}
