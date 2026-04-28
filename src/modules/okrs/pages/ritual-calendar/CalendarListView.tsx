/**
 * CalendarListView — modo lista da aba Calendário de Ritos.
 * Recebe as mesmas ocorrências filtradas que o grid e abre o mesmo OccurrenceSheet.
 */

import { memo, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { EntityNamesCell } from '@/components/ui/entity-names-cell';
import { cn } from '@/lib/utils';
import { WIZARD_TYPE_LABELS } from '../../hooks/useRitualHistory';
import type { RitualOccurrence } from '../../hooks/useRitualOccurrences';
import type { WizardPersona } from '../../types/wizard';
import { STATUS_CONFIG } from './constants';

interface CalendarListViewProps {
  occurrences: RitualOccurrence[];
  onSelect: (occ: RitualOccurrence) => void;
  getCollaboratorLabel: (occ: RitualOccurrence) => string | null;
}

interface RowProps {
  occurrence: RitualOccurrence;
  onSelect: (occ: RitualOccurrence) => void;
  collaboratorLabel: string | null;
}

const CalendarListRow = memo(function CalendarListRow({
  occurrence,
  onSelect,
  collaboratorLabel,
}: RowProps) {
  const personaLabel =
    WIZARD_TYPE_LABELS[occurrence.wizardType as WizardPersona] || occurrence.wizardType;
  const status = STATUS_CONFIG[occurrence.status];

  return (
    <button
      type="button"
      onClick={() => onSelect(occurrence)}
      className="w-full text-left grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 sm:items-center px-3 py-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className={cn('h-2 w-2 rounded-full shrink-0', status.dotColor)} />
        <span className="text-sm font-medium truncate">{personaLabel}</span>
      </div>
      {occurrence.teamName ? (
        <EntityNamesCell teamNames={[occurrence.teamName]} maxVisible={1} />
      ) : (
        <span className="text-xs text-muted-foreground">-</span>
      )}
      <div className="flex items-center gap-2 justify-end">
        {collaboratorLabel && (
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {collaboratorLabel}
          </span>
        )}
      </div>
      <Badge variant="outline" className={cn('text-[10px] font-normal justify-self-end', status.color)}>
        {status.label}
      </Badge>
    </button>
  );
});

export function CalendarListView({
  occurrences,
  onSelect,
  getCollaboratorLabel,
}: CalendarListViewProps) {
  const grouped = useMemo(() => {
    const sorted = [...occurrences].sort((a, b) => {
      if (a.plannedDate !== b.plannedDate) return a.plannedDate.localeCompare(b.plannedDate);
      return a.wizardType.localeCompare(b.wizardType);
    });
    const map = new Map<string, RitualOccurrence[]>();
    for (const occ of sorted) {
      const list = map.get(occ.plannedDate) || [];
      list.push(occ);
      map.set(occ.plannedDate, list);
    }
    return Array.from(map.entries());
  }, [occurrences]);

  if (grouped.length === 0) {
    return (
      <div className="text-center py-8 rounded-lg bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Nenhuma ocorrência neste mês. Use as setas para navegar entre meses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([date, items]) => {
        const parsed = parseISO(date);
        const header = format(parsed, "EEE, dd 'de' MMM 'de' yyyy", { locale: ptBR });
        return (
          <div key={date}>
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-1 mb-1 border-b">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">
                {header}
              </h3>
            </div>
            <div className="space-y-1">
              {items.map(occ => (
                <CalendarListRow
                  key={occ.id}
                  occurrence={occ}
                  onSelect={onSelect}
                  collaboratorLabel={getCollaboratorLabel(occ)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
