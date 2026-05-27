import { useMemo, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { HubLayout } from '@/components/layout/HubLayout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useOrgObjectiveView, useCyclesList } from '../hooks';
import { OrgObjectiveHeader } from '../components/org-view/OrgObjectiveHeader';
import { OrgKrExpandableCard } from '../components/org-view/OrgKrExpandableCard';
import { OrgViewInsights } from '../components/org-view/OrgViewInsights';
import { OrgViewFilters, StatusFilter, TeamFilter } from '../components/org-view/OrgViewFilters';
import { LinkedTeamObjectivesSection } from '../components/org-view/LinkedTeamObjectivesSection';
import { SimpleSelect } from '@/components/selects';
import { useUrlState } from '@/shared/url';
import { PageHeader } from '@/components/ui/page-header';
import { useBu } from '@/contexts/BuContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// OkrOrgObjectiveDetailBreadcrumb removido - usando PageHeader.breadcrumbs (padrão canônico)

const QUARTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'Q1', label: 'Q1' },
  { value: 'Q2', label: 'Q2' },
  { value: 'Q3', label: 'Q3' },
  { value: 'Q4', label: 'Q4' },
];

export default function OrgObjectiveViewPage() {
  const { objectiveId } = useParams<{ objectiveId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentBuId } = useBu();

  // Quarter filter
  const quarterState = useUrlState<string>({ key: 'quarter', defaultValue: 'all' });
  const selectedQuarter = quarterState.value;
  const setSelectedQuarter = quarterState.set;

  // Resolve quarter → cycleId
  const { data: allCycles } = useCyclesList();

  const resolvedCycle = useMemo(() => {
    if (selectedQuarter === 'all' || !allCycles) return null;
    // Try to find by name pattern (e.g. "2026-Q1") — use objective year if available
    return allCycles.find(c =>
      c.type === 'quarter' &&
      c.name.includes(selectedQuarter)
    ) ?? null;
  }, [selectedQuarter, allCycles]);

  const resolvedCycleId = resolvedCycle?.id ?? null;
  const quarterNotFound = selectedQuarter !== 'all' && allCycles && !resolvedCycleId;

  const { data: objective, isLoading, error } = useOrgObjectiveView(objectiveId || '', resolvedCycleId);
  
  // Deep-linking: Read ?kr= from URL for highlight/scroll
  const highlightedKrId = searchParams.get('kr');
  const krRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  usePageTitle(objective?.title || 'Visão Organizacional');
  
  // Effect to scroll to highlighted KR when page loads
  useEffect(() => {
    if (highlightedKrId && objective && !isLoading) {
      // Wait for DOM to be ready
      const timer = setTimeout(() => {
        const krElement = krRefs.current[highlightedKrId];
        if (krElement) {
          krElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add highlight animation
          krElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          // Remove highlight after animation
          setTimeout(() => {
            krElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            // Clear kr param from URL
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('kr');
            setSearchParams(newParams, { replace: true });
          }, 3000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightedKrId, objective, isLoading, searchParams, setSearchParams]);

  // URL State for filters (P2 fix - migrate from useState)
  const statusFilterState = useUrlState<StatusFilter>({
    key: 'status',
    defaultValue: 'all',
    parse: (v) => v as StatusFilter,
  });
  const teamFilterState = useUrlState<TeamFilter>({
    key: 'team',
    defaultValue: 'all',
  });

  const statusFilter = statusFilterState.value;
  const setStatusFilter = statusFilterState.set;
  const teamFilter = teamFilterState.value;
  const setTeamFilter = teamFilterState.set;

  // Get unique teams from linked KRs
  const availableTeams = useMemo(() => {
    if (!objective) return [];
    const teamsMap = new Map<string, string>();
    objective.orgKrs.forEach(kr => {
      kr.linkedTeamKrs.forEach(tkr => {
        teamsMap.set(tkr.team_id, tkr.team_name);
      });
    });
    return Array.from(teamsMap, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [objective]);

  // Filter org KRs based on filters
  const filteredOrgKrs = useMemo(() => {
    if (!objective) return [];
    
    return objective.orgKrs.map(kr => {
      // Filter team KRs
      let filteredTeamKrs = kr.linkedTeamKrs;

      if (statusFilter !== 'all') {
        filteredTeamKrs = filteredTeamKrs.filter(tkr => tkr.status === statusFilter);
      }

      if (teamFilter !== 'all') {
        filteredTeamKrs = filteredTeamKrs.filter(tkr => tkr.team_id === teamFilter);
      }

      return {
        ...kr,
        linkedTeamKrs: filteredTeamKrs,
      };
    }).filter(kr => {
      // If filtering by status or team, only show KRs that have matching team KRs
      // OR show the KR itself if its status matches (for org KR status filter)
      if (statusFilter !== 'all' && teamFilter === 'all') {
        return kr.status === statusFilter || kr.linkedTeamKrs.length > 0;
      }
      if (teamFilter !== 'all') {
        return kr.linkedTeamKrs.length > 0;
      }
      return true;
    });
  }, [objective, statusFilter, teamFilter]);

  // Format cycle period for badge
  const cyclePeriodLabel = useMemo(() => {
    if (!resolvedCycle) return null;
    const start = format(parseISO(resolvedCycle.start_date), "dd MMM", { locale: ptBR });
    const end = format(parseISO(resolvedCycle.end_date), "dd MMM", { locale: ptBR });
    return `${selectedQuarter} ${objective?.year ?? ''} · ${start} → ${end}`;
  }, [resolvedCycle, selectedQuarter, objective?.year]);

  if (isLoading) {
    return (
      <HubLayout>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </HubLayout>
    );
  }

  if (error || !objective) {
    return (
      <HubLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Objetivo não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            O objetivo organizacional solicitado não existe ou foi removido.
          </p>
          <Button asChild variant="outline">
            <Link to="/okrs/org-view">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Visão Organizacional
            </Link>
          </Button>
        </div>
      </HubLayout>
    );
  }

  // BU SCOPE GUARD (defense-in-depth): se o cache servir um objetivo de outra BU,
  // recusa renderização enquanto a BU ativa for diferente.
  if (currentBuId && objective.bu_id && objective.bu_id !== currentBuId) {
    return (
      <HubLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Esse objetivo pertence a outra BU 🔒</h2>
          <p className="text-muted-foreground mb-4 max-w-md text-center">
            Você está visualizando o Next em uma BU diferente da BU desse objetivo.
            Selecione a BU correta no topo da tela para acessá-lo.
          </p>
          <Button asChild variant="outline">
            <Link to="/okrs/org-view">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Visão Organizacional
            </Link>
          </Button>
        </div>
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header com breadcrumbs integrados (padrão canônico) */}
        <PageHeader
          title={objective.title}
          description={`Objetivo Organizacional • Ciclo ${objective.year}`}
          breadcrumbs={[
            { label: "OKRs", href: "/okrs" },
            { label: "Visão Organizacional", href: "/okrs/org-view" },
            { label: objective.title }
          ]}
          actions={
            <SimpleSelect
              value={selectedQuarter}
              onValueChange={setSelectedQuarter}
              options={QUARTER_OPTIONS}
              placeholder="Quarter"
              triggerClassName="w-[100px]"
            />
          }
        />

        {/* Quarter active badge */}
        {cyclePeriodLabel && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span className="text-foreground">
              Mostrando contribuições de: <span className="font-medium">{cyclePeriodLabel}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 px-2 text-xs"
              onClick={() => setSelectedQuarter('all')}
            >
              <X className="w-3 h-3 mr-1" />
              Limpar filtro
            </Button>
          </div>
        )}

        {/* Quarter not found warning */}
        {quarterNotFound && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-muted-foreground text-sm">
            <Info className="w-4 h-4 shrink-0" />
            <span>Nenhum ciclo cadastrado para {selectedQuarter} {objective.year}.</span>
          </div>
        )}

        {/* Objective Summary Card */}
        <OrgObjectiveHeader objective={objective} />

        {/* Insights */}
        <OrgViewInsights objective={objective} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold">KRs Organizacionais</h2>
          <OrgViewFilters
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            teamFilter={teamFilter}
            onTeamFilterChange={setTeamFilter}
          />
        </div>

        {/* Linked Team Objectives Section */}
        {objective.linkedTeamObjectives && objective.linkedTeamObjectives.length > 0 && (
          <LinkedTeamObjectivesSection teamObjectives={objective.linkedTeamObjectives} />
        )}

        {/* Org KRs List */}
        <div className="space-y-4">
          {filteredOrgKrs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {statusFilter !== 'all' || teamFilter !== 'all' 
                ? 'Nenhum KR encontrado com os filtros selecionados'
                : 'Este objetivo não possui KRs organizacionais cadastrados'
              }
            </div>
          ) : (
            filteredOrgKrs.map(orgKr => (
              <div 
                key={orgKr.id} 
                ref={(el) => { krRefs.current[orgKr.id] = el; }}
                className="transition-all duration-300"
              >
                <OrgKrExpandableCard orgKr={orgKr} />
              </div>
            ))
          )}
        </div>
      </div>
    </HubLayout>
  );
}
