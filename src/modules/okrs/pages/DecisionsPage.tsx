/**
 * DecisionsPage — Inbox unificado de decisões/notas registradas em rituais.
 *
 * Escopos disponíveis (controlados por papel do usuário):
 *  - self  : minhas decisões (atribuídas a mim ou criadas por mim)
 *  - team  : do meu time (líder)
 *  - area  : da minha área (líder de área)
 *  - all   : toda a BU (admin)
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PageHeader } from '@/components/ui/page-header';
import { ListPageFilters } from '@/components/ui/list-page-filters';
import { ViewOptionsBar } from '@/components/ui/view-options-bar';
import { Lightbulb, CalendarIcon, Inbox, Users, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlState, parsers } from '@/shared/url';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import {
  useDecisionsInbox,
  useDecisionsScopeContext,
  type DecisionsInboxScope,
  type DecisionsInboxFilters,
} from '@/modules/okrs/hooks/useDecisionsInbox';
import {
  useUpdateDecisionFollowUp,
  useDecisionThread,
} from '@/modules/okrs/hooks';
import { DecisionFollowUpRow } from '@/modules/okrs/components/wizards/shared/DecisionFollowUpRow';
import { getRitualLabel, getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import { RITUAL_LABELS } from '@/modules/okrs/constants/ritualLabels';
import { ALL_RITUAL_WIZARD_TYPES } from '@/modules/okrs/constants/ritualWizardTypes';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

const PAGE_SIZE = 25;

const SCOPE_LABELS: Record<DecisionsInboxScope, string> = {
  self: 'Minhas',
  team: 'Meu time',
  area: 'Minha área',
  all: 'Toda a BU',
};

const STATUS_OPTIONS: Array<{ value: 'pending' | 'done' | 'all'; label: string }> = [
  { value: 'pending', label: 'Pendentes' },
  { value: 'done', label: 'Concluídas' },
  { value: 'all', label: 'Todas' },
];

const CATEGORY_OPTIONS: Array<{ value: TeamCheckinDecision['category'] | 'all'; label: string }> = [
  { value: 'all', label: 'Todas as categorias' },
  { value: 'decision', label: 'Decisão' },
  { value: 'focus_adjustment', label: 'Ajuste de foco' },
  { value: 'next_step', label: 'Próximo passo' },
  { value: 'strategic_proposal', label: 'Proposta estratégica' },
];

export default function DecisionsPage() {
  usePageTitle('Decisões');

  // ── URL state (filtros + paginação) ──
  const scopeState = useUrlState<string>({ key: 'scope', defaultValue: 'self', parse: parsers.string });
  const statusState = useUrlState<string>({ key: 'status', defaultValue: 'pending', parse: parsers.string });
  const categoryState = useUrlState<string>({ key: 'category', defaultValue: 'all', parse: parsers.string });
  const wizardState = useUrlState<string>({ key: 'ritual', defaultValue: 'all', parse: parsers.string });
  const ownerState = useUrlState<string>({ key: 'owner', defaultValue: '', parse: parsers.string });
  const dateFromState = useUrlState<string>({ key: 'from', defaultValue: '', parse: parsers.string });
  const dateToState = useUrlState<string>({ key: 'to', defaultValue: '', parse: parsers.string });
  const searchState = useUrlState<string>({ key: 'q', defaultValue: '', parse: parsers.string });
  const pageState = useUrlState<number>({ key: 'page', defaultValue: 1, parse: parsers.numberWithDefault(1) });

  // ── Escopo disponível ──
  const { data: scopeCtx, isLoading: isScopeLoading } = useDecisionsScopeContext();
  const availableScopes = scopeCtx?.availableScopes ?? ['self'];
  const currentScope: DecisionsInboxScope = (availableScopes.includes(scopeState.value as DecisionsInboxScope)
    ? scopeState.value
    : 'self') as DecisionsInboxScope;

  const filters: DecisionsInboxFilters = useMemo(() => ({
    status: (statusState.value || 'pending') as 'pending' | 'done' | 'all',
    category: categoryState.value && categoryState.value !== 'all'
      ? (categoryState.value as TeamCheckinDecision['category'])
      : undefined,
    wizardType: (wizardState.value || 'all') as WizardPersona | 'all',
    ownerProfileId: ownerState.value || null,
    dateFrom: dateFromState.value || null,
    dateTo: dateToState.value || null,
    search: searchState.value || undefined,
  }), [statusState.value, categoryState.value, wizardState.value, ownerState.value, dateFromState.value, dateToState.value, searchState.value]);

  const { data, isLoading } = useDecisionsInbox({
    scope: currentScope,
    filters,
    page: pageState.value,
    pageSize: PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const { mutate: updateFollowUp, isPending: isUpdating } = useUpdateDecisionFollowUp();
  const { mutate: addThreadMessage, isPending: isAddingMessage } = useDecisionThread();

  const wizardOptions = useMemo(() => {
    // Canônico: usa ALL_RITUAL_WIZARD_TYPES (exclui ritos descontinuados como
    // 'managers-checkin' e históricos 'mbr-first'/'mbr-pre-first'), garantindo
    // unicidade pela natureza de Set do array tipado.
    const seen = new Set<string>();
    const ritualEntries = ALL_RITUAL_WIZARD_TYPES
      .filter((value) => {
        if (seen.has(value)) return false;
        seen.add(value);
        return Boolean(RITUAL_LABELS[value]);
      })
      .map((value) => ({ value, label: RITUAL_LABELS[value] }));

    return [
      { value: 'all', label: 'Todos os ritos' },
      ...ritualEntries,
    ];
  }, []);

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Decisões e Notas"
          description="Acompanhe decisões registradas nos ritos — atribuídas a você, do seu time, da sua área ou de toda a BU."
          breadcrumbs={[
            { label: 'Rituais', href: '/rituals' },
            { label: 'Decisões' },
          ]}
        />

        {/* Escopo */}
        {availableScopes.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {availableScopes.map((s) => (
              <Button
                key={s}
                variant={currentScope === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => { scopeState.set(s); pageState.set(1); }}
              >
                {SCOPE_LABELS[s]}
              </Button>
            ))}
          </div>
        )}

        {/* Filtros */}
        <ListPageFilters hideSearch>
          <Select value={statusState.value || 'pending'} onValueChange={(v) => { statusState.set(v); pageState.set(1); }}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryState.value || 'all'} onValueChange={(v) => { categoryState.set(v); pageState.set(1); }}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={wizardState.value || 'all'} onValueChange={(v) => { wizardState.set(v); pageState.set(1); }}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Rito" />
            </SelectTrigger>
            <SelectContent>
              {wizardOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <BuUserSelect
            value={ownerState.value || undefined}
            onValueChange={(v) => { ownerState.set(v || ''); pageState.set(1); }}
            placeholder="Responsável"
            className="w-full sm:w-[220px]"
          />

          <Input
            placeholder="Buscar no texto…"
            value={searchState.value}
            onChange={(e) => { searchState.set(e.target.value); pageState.set(1); }}
            className="w-full sm:w-[220px]"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="default" className={cn(
                  'flex-1 sm:flex-none sm:w-[160px] justify-start text-left font-normal',
                  !dateFromState.value && 'text-muted-foreground',
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
                  onSelect={(d) => { dateFromState.set(d ? format(d, 'yyyy-MM-dd') : ''); pageState.set(1); }}
                  className="p-3 pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="default" className={cn(
                  'flex-1 sm:flex-none sm:w-[160px] justify-start text-left font-normal',
                  !dateToState.value && 'text-muted-foreground',
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
                  onSelect={(d) => { dateToState.set(d ? format(d, 'yyyy-MM-dd') : ''); pageState.set(1); }}
                  className="p-3 pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </ListPageFilters>

        {!isLoading && (
          <ViewOptionsBar
            resultCount={totalCount}
            resultCountLabel="decisões encontradas"
            resultCountLabelSingular="decisão encontrada"
          />
        )}

        {isLoading || isScopeLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhuma decisão encontrada com os filtros atuais.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const ritualLabel = getRitualLabel(item.wizardType);
              const stepLabel = item.decision.sourceStep
                ? getStepLabel(item.wizardType, item.decision.sourceStep, item.structureVersion as StructureVersion)
                : null;
              return (
                <Card key={`${item.sessionId}-${item.decision.id}`}>
                  <CardContent className="p-4 space-y-3">
                    {/* Origem */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="gap-1">
                        <Lightbulb className="h-3 w-3" />
                        {ritualLabel}
                      </Badge>
                      {stepLabel && (
                        <Badge variant="outline" className="text-[10px]">
                          {stepLabel.shortLabel ?? stepLabel.title}
                        </Badge>
                      )}
                      {item.teamName && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {item.teamName}
                        </span>
                      )}
                      {item.completedAt && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(parseISO(item.completedAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      )}
                      <div className="flex-1" />
                      <Button variant="ghost" size="sm" asChild className="h-6 px-2">
                        <Link to={`/rituals/history?session=${item.sessionId}`} className="gap-1 text-xs">
                          Abrir rito
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>

                    <DecisionFollowUpRow
                      decision={item.decision}
                      sessionId={item.sessionId}
                      onUpdate={({ sessionId, decisionId, updates }) => {
                        updateFollowUp({ sessionId, decisionId, updates });
                      }}
                      isPending={isUpdating}
                      onAddMessage={({ sessionId, decisionId, content }) => {
                        addThreadMessage({ sessionId, decisionId, content });
                      }}
                      isAddingMessage={isAddingMessage}
                    />
                  </CardContent>
                </Card>
              );
            })}
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
