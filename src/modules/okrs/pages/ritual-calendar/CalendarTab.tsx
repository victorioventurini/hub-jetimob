/**
 * CalendarTab — visão mensal das ocorrências de rituais com filtros.
 * Extraído de `RitualCalendarPage.tsx` em P3.2.
 *
 * Padrões canônicos aplicados:
 * - Filtros via `ListPageFilters` + `UrlSelect` + URL state (`useUrlState`).
 * - Cabeçalho de ações via `ViewOptionsBar` (contador à esquerda, controles à direita).
 * - `Tipo`, `Time` e `Usuário` persistidos na URL para links compartilháveis.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { okrsKeys } from '@/lib/queryKeys/okrs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, XCircle, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeamSelect } from '@/components/selects/TeamSelect';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import { UrlSelect } from '@/shared/filters/UrlSelect';
import { ListPageFilters } from '@/components/ui/list-page-filters';
import { ViewOptionsBar } from '@/components/ui/view-options-bar';
import { useUrlState } from '@/shared/url';
import { WIZARD_TYPE_LABELS } from '../../hooks/useRitualHistory';
import {
  useRitualOccurrences,
  type RitualOccurrence,
} from '../../hooks/useRitualOccurrences';
import { useCollaboratorCheckinCounts } from '../../hooks/useCollaboratorCheckinCounts';
import type { WizardPersona } from '../../types/wizard';
import { DAY_LABELS, STATUS_CONFIG, RECURRENT_WIZARD_TYPES } from './constants';
import { OccurrenceSheet } from './OccurrenceSheet';
import { CalendarListView } from './CalendarListView';
import {
  RitualCalendarViewToggle,
  type RitualCalendarViewMode,
} from './RitualCalendarViewToggle';
import { BulkRescheduleDialog } from './BulkRescheduleDialog';

const wizardTypeOptions = RECURRENT_WIZARD_TYPES.map((wt) => ({
  value: wt,
  label: WIZARD_TYPE_LABELS[wt] || wt,
}));

export function CalendarTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedOccurrence, setSelectedOccurrence] = useState<RitualOccurrence | null>(null);
  const [hasAutoNavigated, setHasAutoNavigated] = useState(false);
  const [showBulkReschedule, setShowBulkReschedule] = useState(false);

  // URL state — filtros persistidos para links compartilháveis
  const { value: typeFilter, set: setTypeFilter } = useUrlState<string>({
    key: 'type',
    defaultValue: '',
  });
  const { value: teamFilter, set: setTeamFilter } = useUrlState<string>({
    key: 'team',
    defaultValue: '',
  });
  const { value: userFilter, set: setUserFilter } = useUrlState<string>({
    key: 'user',
    defaultValue: '',
  });
  const { value: viewMode, set: setViewMode } = useUrlState<RitualCalendarViewMode>({
    key: 'view',
    defaultValue: 'calendar',
    parse: (v) => (v === 'list' ? 'list' : 'calendar'),
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endMonth = month === 11 ? 0 : month + 1;
  const endYear = month === 11 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-01`;

  const { data: occurrences, isLoading, error } = useRitualOccurrences({
    year,
    month,
    teamId: teamFilter || undefined,
    wizardType: typeFilter || undefined,
  });

  // Client-side user filter: filter occurrences by session started_by
  const buSupabase = useBuScopedSupabase();
  const sessionIds = useMemo(() => {
    if (!userFilter || !occurrences) return [];
    return occurrences.map(o => o.sessionId).filter(Boolean) as string[];
  }, [userFilter, occurrences]);

  const { data: userSessionIds } = useQuery({
    queryKey: okrsKeys.calendarUserSessions(userFilter || null, sessionIds),
    queryFn: async () => {
      if (!userFilter || sessionIds.length === 0) return new Set<string>();
      const { data } = await buSupabase
        .from('okr_wizard_sessions')
        .select('id, started_by')
        .in('id', sessionIds)
        .eq('started_by', userFilter);
      return new Set((data ?? []).map((s: any) => s.id as string));
    },
    enabled: !!userFilter && sessionIds.length > 0,
    staleTime: 60_000,
  });

  const filteredOccurrences = useMemo(() => {
    if (!occurrences) return [];
    if (!userFilter) return occurrences;
    return occurrences.filter(o => !o.sessionId || (userSessionIds?.has(o.sessionId) ?? false));
  }, [occurrences, userFilter, userSessionIds]);

  // Auto-navigate to next month with data if current month is empty
  const shouldAutoNav = !isLoading && !hasAutoNavigated && filteredOccurrences.length === 0;
  const nextMonth = addMonths(currentMonth, 1);
  const { data: nextMonthOccs } = useRitualOccurrences({
    year: nextMonth.getFullYear(),
    month: nextMonth.getMonth(),
    teamId: teamFilter || undefined,
    wizardType: typeFilter || undefined,
  });

  if (shouldAutoNav && (nextMonthOccs ?? []).length > 0) {
    setCurrentMonth(nextMonth);
    setHasAutoNavigated(true);
  }

  const collaboratorTeamId = useMemo(() => {
    const collabOcc = filteredOccurrences.find(o => o.wizardType === 'collaborator');
    return collabOcc?.teamId ?? null;
  }, [filteredOccurrences]);

  const { expectedCount, completedByDate } = useCollaboratorCheckinCounts(
    collaboratorTeamId,
    startDate,
    endDate,
  );

  const byDate = useMemo(() => {
    const map = new Map<string, RitualOccurrence[]>();
    for (const occ of filteredOccurrences) {
      const list = map.get(occ.plannedDate) || [];
      list.push(occ);
      map.set(occ.plannedDate, list);
    }
    return map;
  }, [filteredOccurrences]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = getDay(monthStart);

  function getCollaboratorLabel(occ: RitualOccurrence): string | null {
    if (occ.wizardType !== 'collaborator' || expectedCount === 0) return null;
    const completed = completedByDate.get(occ.plannedDate) ?? 0;
    return `${completed}/${expectedCount}`;
  }

  return (
    <div className="space-y-4">
      {/* Filtros canônicos (URL state) */}
      <ListPageFilters hideSearch>
        <UrlSelect
          value={typeFilter || 'all'}
          onChange={(v) => setTypeFilter(v === 'all' ? '' : v)}
          options={wizardTypeOptions}
          includeAllOption
          allOptionLabel="Todos os ritos"
          triggerClassName="w-full sm:w-[200px]"
        />
        <TeamSelect
          value={teamFilter || undefined}
          onValueChange={(v) => setTeamFilter(v ?? '')}
          includeAll
          allLabel="Todos os times"
          placeholder="Time"
          triggerClassName="w-full sm:w-[200px]"
        />
        <BuUserSelect
          value={userFilter || undefined}
          onValueChange={(v) => setUserFilter(v ?? '')}
          placeholder="Usuário"
          allowNone
          noneLabel="Todos os usuários"
          className="w-full sm:w-[220px]"
        />
      </ListPageFilters>

      {/* Linha de visualização: contador + ações + view toggle */}
      <ViewOptionsBar
        resultCount={filteredOccurrences.length}
        resultCountLabel="ocorrências"
        resultCountLabelSingular="ocorrência"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBulkReschedule(true)}
        >
          <CalendarRange className="h-4 w-4 mr-2" />
          Reagendar em massa
        </Button>
        <RitualCalendarViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </ViewOptionsBar>

      {error && (
        <Card>
          <CardContent className="py-6 text-center">
            <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
            <p className="text-sm text-destructive">Erro ao carregar ocorrências do calendário.</p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <Card>
          <CardContent className="p-4">
            {/* Navegação de mês — comum às duas views */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setHasAutoNavigated(true); }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold capitalize min-w-[160px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setHasAutoNavigated(true); }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {viewMode === 'calendar' ? (
              <>
                {filteredOccurrences.length === 0 && !error && (
                  <div className="text-center py-4 mb-3 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma ocorrência neste mês. Use as setas para navegar entre meses.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAY_LABELS.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startDow }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-20" />
                  ))}

                  {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayOccs = byDate.get(dateStr) || [];
                    const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

                    return (
                      <div
                        key={dateStr}
                        className={cn(
                          'h-20 rounded-lg border p-1.5 text-xs overflow-hidden',
                          isToday && 'border-primary/50 bg-primary/5',
                          dayOccs.length > 0 && 'cursor-pointer hover:bg-muted/50',
                        )}
                        onClick={() => dayOccs.length > 0 && setSelectedOccurrence(dayOccs[0])}
                      >
                        <span className={cn('font-medium', isToday && 'text-primary')}>
                          {format(day, 'd')}
                        </span>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {dayOccs.slice(0, 2).map(occ => {
                            const collabLabel = getCollaboratorLabel(occ);
                            return (
                              <div
                                key={occ.id}
                                className={cn(
                                  'flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight truncate',
                                  STATUS_CONFIG[occ.status].color,
                                )}
                                title={`${WIZARD_TYPE_LABELS[occ.wizardType as WizardPersona] || occ.wizardType} — ${STATUS_CONFIG[occ.status].label}${collabLabel ? ` (${collabLabel})` : ''}`}
                              >
                                <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_CONFIG[occ.status].dotColor)} />
                                <span className="truncate">
                                  {WIZARD_TYPE_LABELS[occ.wizardType as WizardPersona]?.split(' ')[0] || occ.wizardType}
                                </span>
                                {collabLabel && (
                                  <span className="ml-auto shrink-0 font-medium">{collabLabel}</span>
                                )}
                              </div>
                            );
                          })}
                          {dayOccs.length > 2 && (
                            <span className="text-[10px] text-muted-foreground pl-1">
                              +{dayOccs.length - 2} mais
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <CalendarListView
                occurrences={filteredOccurrences}
                onSelect={setSelectedOccurrence}
                getCollaboratorLabel={getCollaboratorLabel}
              />
            )}

            <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t">
              {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className={cn('h-2.5 w-2.5 rounded-full', cfg.dotColor)} />
                  {cfg.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedOccurrence && (
        <OccurrenceSheet
          occurrence={selectedOccurrence}
          open={!!selectedOccurrence}
          onOpenChange={open => !open && setSelectedOccurrence(null)}
          expectedCount={selectedOccurrence.wizardType === 'collaborator' ? expectedCount : undefined}
          completedCount={selectedOccurrence.wizardType === 'collaborator' ? (completedByDate.get(selectedOccurrence.plannedDate) ?? 0) : undefined}
        />
      )}

      <BulkRescheduleDialog
        open={showBulkReschedule}
        onOpenChange={setShowBulkReschedule}
      />
    </div>
  );
}
