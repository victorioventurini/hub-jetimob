/**
 * RitualHistoryPage - Histórico de rituais/wizards concluídos
 *
 * Lista sessões concluídas com filtros, detalhe expandido e follow-up de decisões.
 * Suporta deep-link via ?session={id} para abrir automaticamente uma sessão específica.
 *
 * P3.2 (modularização): cards/sub-seções extraídos para `./ritual-history/*`.
 * Esta página agora cuida apenas de filtros (URL state), paginação, deep-link e listagem.
 */

import { useMemo, useEffect, useRef } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PageHeader } from '@/components/ui/page-header';
import { ListPageFilters } from '@/components/ui/list-page-filters';
import { ViewOptionsBar } from '@/components/ui/view-options-bar';
import { History, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlState, parsers } from '@/shared/url';
import {
  useRitualHistory,
  useRitualDetail,
  type RitualHistoryFilters,
} from '../hooks/useRitualHistory';
import { useManageableTeamsFlat } from '../hooks';
import type { WizardPersona } from '../types/wizard';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import {
  WIZARD_TYPE_OPTIONS,
  EVALUATED_OPTIONS,
  hasParticipantEvaluations,
} from './ritual-history/constants';
import { RitualHistoryCard } from './ritual-history/RitualHistoryCard';

export default function RitualHistoryPage() {
  usePageTitle('Histórico de Rituais');

  // Deep-link: ?session={id}
  const sessionState = useUrlState<string>({
    key: 'session',
    defaultValue: '',
    parse: parsers.string,
  });
  const deepLinkSessionId = sessionState.value || null;

  // Filters
  const typeState = useUrlState<string>({
    key: 'type',
    defaultValue: 'all',
    parse: parsers.string,
  });
  const teamState = useUrlState<string>({
    key: 'team',
    defaultValue: '',
    parse: parsers.string,
  });

  const userState = useUrlState<string>({
    key: 'user',
    defaultValue: '',
    parse: parsers.string,
  });

  const evaluatedState = useUrlState<string>({
    key: 'evaluated',
    defaultValue: 'all',
    parse: parsers.string,
  });

  // Default: last 30 days
  const default30DaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const dateFromState = useUrlState<string>({
    key: 'from',
    defaultValue: default30DaysAgo,
    parse: parsers.string,
  });
  const dateToState = useUrlState<string>({
    key: 'to',
    defaultValue: '',
    parse: parsers.string,
  });

  // Pagination
  const pageState = useUrlState<number>({
    key: 'page',
    defaultValue: 1,
    parse: parsers.numberWithDefault(1),
  });
  const pageSize = 25;

  // Atomic page reset: track filter changes and reset page via effect
  const filterFingerprint = `${typeState.value}|${teamState.value}|${userState.value}|${dateFromState.value}|${dateToState.value}|${evaluatedState.value}`;
  const prevFilterRef = useRef(filterFingerprint);

  useEffect(() => {
    if (prevFilterRef.current !== filterFingerprint) {
      prevFilterRef.current = filterFingerprint;
      if (pageState.value !== 1) {
        pageState.set(1);
      }
    }
  }, [filterFingerprint, pageState]);

  const filters: RitualHistoryFilters = useMemo(() => ({
    wizardType: (typeState.value || 'all') as WizardPersona | 'all',
    teamId: teamState.value || null,
    userId: userState.value || null,
    dateFrom: dateFromState.value || null,
    dateTo: dateToState.value || null,
    page: pageState.value,
    pageSize,
  }), [typeState.value, teamState.value, userState.value, dateFromState.value, dateToState.value, pageState.value]);

  const { data: result, isLoading } = useRitualHistory(filters);
  const rituals = result?.items ?? [];
  const totalCount = result?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const { teams } = useManageableTeamsFlat();

  // Deep-link: fetch the specific session if not in the list
  const { data: deepLinkSession, isLoading: isLoadingDeepLink } = useRitualDetail(
    deepLinkSessionId && !rituals.some(r => r.id === deepLinkSessionId)
      ? deepLinkSessionId
      : null,
  );

  // Merge deep-link + client-side evaluated filter
  const mergedRituals = useMemo(() => {
    let list = rituals;
    if (deepLinkSession && !rituals.some(r => r.id === deepLinkSession.id)) {
      list = [deepLinkSession, ...rituals];
    }
    if (evaluatedState.value === 'yes') {
      list = list.filter(r => hasParticipantEvaluations(r.addendums));
    } else if (evaluatedState.value === 'no') {
      list = list.filter(r => !hasParticipantEvaluations(r.addendums));
    }
    return list;
  }, [rituals, deepLinkSession, evaluatedState.value]);

  const anyLoading = isLoading || (!!deepLinkSessionId && isLoadingDeepLink);

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Histórico de Rituais"
          description="Consulte rituais concluídos, decisões registradas e acompanhe pendências."
          breadcrumbs={[
            { label: 'OKRs', href: '/okrs' },
            { label: 'Histórico de Rituais' },
          ]}
        />

        <ListPageFilters hideSearch>
          <Select value={typeState.value || 'all'} onValueChange={(v) => typeState.set(v)}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Tipo de ritual" />
            </SelectTrigger>
            <SelectContent>
              {WIZARD_TYPE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {teams && teams.length > 0 && (
            <Select value={teamState.value || 'all'} onValueChange={(v) => teamState.set(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os times</SelectItem>
                {teams.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={evaluatedState.value || 'all'} onValueChange={(v) => evaluatedState.set(v)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Avaliação" />
            </SelectTrigger>
            <SelectContent>
              {EVALUATED_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <BuUserSelect
            value={userState.value || undefined}
            onValueChange={(v) => userState.set(v || '')}
            placeholder="Usuário"
            className="w-full sm:w-[220px]"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="default" className={cn(
                  "flex-1 sm:flex-none sm:w-[180px] justify-start text-left font-normal",
                  !dateFromState.value && "text-muted-foreground",
                )}>
                  <CalendarIcon className="h-4 w-4 mr-2 shrink-0" />
                  {dateFromState.value
                    ? format(parseISO(dateFromState.value), 'dd/MM/yyyy', { locale: ptBR })
                    : 'Data início'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFromState.value ? parseISO(dateFromState.value) : undefined}
                  onSelect={(date) => dateFromState.set(date ? format(date, 'yyyy-MM-dd') : '')}
                  className="p-3 pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="default" className={cn(
                  "flex-1 sm:flex-none sm:w-[180px] justify-start text-left font-normal",
                  !dateToState.value && "text-muted-foreground",
                )}>
                  <CalendarIcon className="h-4 w-4 mr-2 shrink-0" />
                  {dateToState.value
                    ? format(parseISO(dateToState.value), 'dd/MM/yyyy', { locale: ptBR })
                    : 'Data fim'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateToState.value ? parseISO(dateToState.value) : undefined}
                  onSelect={(date) => dateToState.set(date ? format(date, 'yyyy-MM-dd') : '')}
                  className="p-3 pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {(dateFromState.value !== default30DaysAgo || dateToState.value) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { dateFromState.set(default30DaysAgo); dateToState.set(''); }}
              className="text-muted-foreground"
            >
              Limpar datas
            </Button>
          )}
        </ListPageFilters>

        {!anyLoading && (
          <ViewOptionsBar
            resultCount={mergedRituals.length}
            resultCountLabel="rituais encontrados"
            resultCountLabelSingular="ritual encontrado"
          />
        )}

        {anyLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : mergedRituals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum ritual concluído encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {mergedRituals.map(ritual => (
              <RitualHistoryCard
                key={ritual.id}
                ritual={ritual}
                autoExpand={ritual.id === deepLinkSessionId}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={pageState.value <= 1}
              onClick={() => pageState.set(pageState.value - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {pageState.value} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pageState.value >= totalPages}
              onClick={() => pageState.set(pageState.value + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </HubLayout>
  );
}
