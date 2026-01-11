import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HubLayout } from '@/components/layout/HubLayout';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useOrgObjectiveView } from '../hooks/useOrgObjectiveView';
import { OrgObjectiveHeader } from '../components/org-view/OrgObjectiveHeader';
import { OrgKrExpandableCard } from '../components/org-view/OrgKrExpandableCard';
import { OrgViewInsights } from '../components/org-view/OrgViewInsights';
import { OrgViewFilters, StatusFilter, TeamFilter } from '../components/org-view/OrgViewFilters';
import { useUrlState } from '@/shared/url';

export default function OrgObjectiveViewPage() {
  const { objectiveId } = useParams<{ objectiveId: string }>();
  const { data: objective, isLoading, error } = useOrgObjectiveView(objectiveId || '');
  
  usePageTitle(objective?.title || 'Visão Organizacional');

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

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Back button */}
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/okrs/org-view">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Visão Organizacional
            </Link>
          </Button>
        </div>

        {/* Header */}
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
              <OrgKrExpandableCard key={orgKr.id} orgKr={orgKr} />
            ))
          )}
        </div>
      </div>
    </HubLayout>
  );
}
