/**
 * CycleRitualDates — Exibe datas de rituais inline para um ciclo trimestral
 * 
 * Mostra MBR₁, MBR₂, QBR-pre e QBR com badges de status.
 */

import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface CycleRitualDatesProps {
  review_date_first_month: string | null;
  planning_date: string | null;
  review_date: string | null;
  retro_date: string | null;
}

function formatShort(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MMM", { locale: ptBR });
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

export function CycleRitualDates({ review_date_first_month, planning_date, review_date, retro_date }: CycleRitualDatesProps) {
  if (!review_date_first_month && !planning_date && !review_date && !retro_date) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 mt-1">
      <DateBadge label="MBR₁" dateStr={review_date_first_month} />
      <DateBadge label="MBR₂" dateStr={review_date} />
      <DateBadge label="QBR-pre" dateStr={planning_date} />
      <DateBadge label="QBR" dateStr={retro_date} />
    </div>
  );
}
