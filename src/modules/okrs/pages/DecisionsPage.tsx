/**
 * DecisionsPage — Inbox unificado de decisões/notas registradas em rituais.
 *
 * Escopos disponíveis (controlados por papel do usuário):
 *  - self  : minhas decisões (atribuídas a mim ou criadas por mim)
 *  - team  : do meu time (líder)
 *  - area  : da minha área (líder de área)
 *  - all   : toda a BU (admin)
 */
import { useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { ListPageFilters } from '@/components/ui/list-page-filters';
import { ViewOptionsBar } from '@/components/ui/view-options-bar';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Lightbulb, CalendarIcon, Users, ExternalLink } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlState, parsers } from '@/shared/url';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import { TeamSelect } from '@/components/selects/TeamSelect';
import { useTeamTree, useHierarchicalTeamList } from '@/modules/teams/hooks';
import type { TeamTreeNode } from '@/modules/teams/types';
import {
  UrlSearchInput,
  UrlDateRangePicker,
  UrlFilterBar,
  buildActiveFilters,
} from '@/shared/filters';
import { SavedLinksPopover } from '@/shared/saved-links';
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
  const scopeState = useUrlState<DecisionsInboxScope>({
    key: 'scope',
    defaultValue: 'self',
    parse: parsers.string as (v: string) => DecisionsInboxScope,
  });
  const statusState = useUrlState<string>({ key: 'status', defaultValue: 'pending', parse: parsers.string });
  const categoryState = useUrlState<string>({ key: 'category', defaultValue: 'all', parse: parsers.string });
  const wizardState = useUrlState<string>({ key: 'ritual', defaultValue: 'all', parse: parsers.string });
  const ownerState = useUrlState<string>({ key: 'owner', defaultValue: '', parse: parsers.string });
  const dateFromState = useUrlState<string>({ key: 'from', defaultValue: '', parse: parsers.string });
  const dateToState = useUrlState<string>({ key: 'to', defaultValue: '', parse: parsers.string });
  const searchState = useUrlState<string>({ key: 'q', defaultValue: '', parse: parsers.string });
  const pageState = useUrlState<number>({ key: 'page', defaultValue: 1, parse: parsers.numberWithDefault(1) });
  const teamState = useUrlState<string>({ key: 'team', defaultValue: '', parse: parsers.string });

  // Reset atômico da paginação quando qualquer filtro muda, evitando sobrescrever
  // o parâmetro recém-alterado com múltiplos setSearchParams no mesmo tick.
  const filterFingerprint = [
    scopeState.value,
    statusState.value,
    categoryState.value,
    wizardState.value,
    ownerState.value,
    teamState.value,
    dateFromState.value,
    dateToState.value,
    searchState.value,
  ].join('|');
  const prevFilterRef = useRef(filterFingerprint);

  useEffect(() => {
    if (prevFilterRef.current !== filterFingerprint) {
      prevFilterRef.current = filterFingerprint;
      if (pageState.value !== 1) {
        pageState.set(1);
      }
    }
  }, [filterFingerprint, pageState]);

  // ── Expansão de subtimes (padrão `team-filter-includes-subteams`) ──
  const { tree: teamTree } = useTeamTree();
  const { teams: hierarchicalTeams } = useHierarchicalTeamList();

  const overrideTeamIds = useMemo<string[] | undefined>(() => {
    if (!teamState.value) return undefined;
    const collect = (nodes: TeamTreeNode[], targetId: string, inSubtree: boolean): string[] => {
      const acc: string[] = [];
      for (const node of nodes) {
        const here = inSubtree || node.id === targetId;
        if (here) acc.push(node.id);
        acc.push(...collect(node.children, targetId, here));
      }
      return acc;
    };
    const ids = collect(teamTree as TeamTreeNode[], teamState.value, false);
    return ids.length > 0 ? ids : [teamState.value];
  }, [teamState.value, teamTree]);

  const selectedTeamName = useMemo(
    () => hierarchicalTeams.find((t) => t.id === teamState.value)?.name ?? teamState.value,
    [hierarchicalTeams, teamState.value],
  );

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
    overrideTeamIds,
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

  // ── Filtros ativos (chips) ──
  const activeFilters = useMemo(() => buildActiveFilters(
    {
      status: statusState.value,
      category: categoryState.value,
      ritual: wizardState.value,
      owner: ownerState.value,
      team: teamState.value,
      from: dateFromState.value,
      to: dateToState.value,
      q: searchState.value,
    },
    {
      status: 'pending',
      category: 'all',
      ritual: 'all',
      owner: '',
      team: '',
      from: '',
      to: '',
      q: '',
    },
    {
      status: 'Status',
      category: 'Categoria',
      ritual: 'Rito',
      owner: 'Responsável',
      team: 'Time',
      from: 'De',
      to: 'Até',
      q: 'Busca',
    },
    {
      status: (v) => STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v,
      category: (v) => CATEGORY_OPTIONS.find((o) => o.value === v)?.label ?? v,
      ritual: (v) => RITUAL_LABELS[v as WizardPersona] ?? v,
      team: () => selectedTeamName,
      from: (v) => format(parseISO(v), 'dd/MM/yyyy', { locale: ptBR }),
      to: (v) => format(parseISO(v), 'dd/MM/yyyy', { locale: ptBR }),
    },
  ), [statusState.value, categoryState.value, wizardState.value, ownerState.value, teamState.value, selectedTeamName, dateFromState.value, dateToState.value, searchState.value]);

  const handleRemoveFilter = (key: string) => {
    const map: Record<string, () => void> = {
      status: () => statusState.set('pending'),
      category: () => categoryState.set('all'),
      ritual: () => wizardState.set('all'),
      owner: () => ownerState.set(''),
      team: () => teamState.set(''),
      from: () => dateFromState.set(''),
      to: () => dateToState.set(''),
      q: () => searchState.set(''),
    };
    map[key]?.();
    pageState.set(1);
  };

  const handleClearAll = () => {
    statusState.set('pending');
    categoryState.set('all');
    wizardState.set('all');
    ownerState.set('');
    teamState.set('');
    dateFromState.set('');
    dateToState.set('');
    searchState.set('');
    pageState.set(1);
  };

  return (
    <HubLayout>
      <div className="space-y-6">
        <PageHeader
          title="Decisões e Notas"
          description={'Acompanhe decisões registradas nos ritos. Use o filtro de Time para ver decisões de qualquer time (e seus subtimes). Os escopos "Meu time" e "Toda a BU" só aparecem para líderes e administradores, respectivamente.'}
          breadcrumbs={[
            { label: 'OKRs', href: '/okrs' },
            { label: 'Rituais', href: '/rituals' },
            { label: 'Decisões' },
          ]}
          actions={<SavedLinksPopover moduleSlug="decisions" />}
        />

        {/* Escopo */}
        {availableScopes.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {availableScopes.map((s) => (
              <Button
                key={s}
                variant={currentScope === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => { scopeState.set(s); }}
              >
                {SCOPE_LABELS[s]}
              </Button>
            ))}
          </div>
        )}

        {/* Filtros */}
        <ListPageFilters hideSearch>
          <Select value={statusState.value || 'pending'} onValueChange={statusState.set}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryState.value || 'all'} onValueChange={categoryState.set}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={wizardState.value || 'all'} onValueChange={wizardState.set}>
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
            onValueChange={(v) => ownerState.set(v || '')}
            placeholder="Responsável"
            className="w-full sm:w-[220px]"
          />

          <TeamSelect
            value={teamState.value || undefined}
            onValueChange={(v) => teamState.set(v ?? '')}
            placeholder="Time"
            includeAll
            allLabel="Todos os times"
            triggerClassName="w-full sm:w-[220px]"
          />

          <UrlSearchInput
            value={searchState.value}
            onChange={searchState.set}
            placeholder="Buscar no texto…"
            debounceMs={300}
            className="w-full sm:w-[260px]"
          />

          <UrlDateRangePicker
            startDate={dateFromState.value}
            endDate={dateToState.value}
            onStartChange={dateFromState.set}
            onEndChange={dateToState.set}
            onChange={(s, e) => {
              dateFromState.set(s);
              dateToState.set(e);
            }}
            placeholder="Período"
          />
        </ListPageFilters>

        {activeFilters.length > 0 && (
          <UrlFilterBar
            activeFilters={activeFilters}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleClearAll}
          />
        )}

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
          <EmptyState
            variant="filter"
            description="Nenhuma decisão encontrada com os filtros atuais. Tente ajustar ou remover alguns filtros."
            actionLabel={activeFilters.length > 0 ? 'Limpar filtros' : undefined}
            onAction={activeFilters.length > 0 ? handleClearAll : undefined}
          />
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
          <Pagination className="pt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  aria-label="Página anterior"
                  aria-disabled={pageState.value <= 1}
                  className={pageState.value <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  onClick={() => {
                    if (pageState.value > 1) pageState.set(pageState.value - 1);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive aria-current="page">
                  {pageState.value} / {totalPages}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  aria-label="Próxima página"
                  aria-disabled={pageState.value >= totalPages}
                  className={pageState.value >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  onClick={() => {
                    if (pageState.value < totalPages) pageState.set(pageState.value + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </HubLayout>
  );
}
