import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Building2, Users, BarChart3 } from 'lucide-react';
import { KpiCard } from '@/modules/kpis/components/KpiCard';
import { useTeamKpisGrouped } from '@/modules/teams/hooks/useTeamKpisGrouped';

interface TeamContributionKpisProps {
  teamId: string;
  resolvedTeamIds: string[];
  includeSubteams: boolean;
}

export const TeamContributionKpis = React.memo(function TeamContributionKpis({
  teamId,
  resolvedTeamIds,
  includeSubteams,
}: TeamContributionKpisProps) {
  const { data, isLoading } = useTeamKpisGrouped(teamId, {
    resolvedTeamIds,
    includeSubteams,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const teamKpis = data?.team || [];
  const memberKpis = data?.members || [];
  const memberCount = data?.memberCount || 0;
  const total = teamKpis.length + memberKpis.length;

  if (total === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sem KPIs vinculados"
        description={
          memberCount === 0
            ? 'Este time ainda não possui KPIs sob sua responsabilidade nem membros com indicadores próprios.'
            : 'Nem o time nem os seus membros possuem KPIs ativos cadastrados.'
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Grupo 1 — KPIs sob responsabilidade do time */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">
            KPIs sob responsabilidade do time
          </h2>
          <Badge variant="outline" className="ml-1">
            {teamKpis.length}
          </Badge>
        </div>

        {teamKpis.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Este time ainda não tem KPIs sob sua responsabilidade direta.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {teamKpis.map((kpi) => (
              <KpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        )}
      </section>

      {/* Grupo 2 — KPIs sob responsabilidade de membros do time */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-status-purple" />
          <h2 className="text-lg font-semibold text-foreground">
            KPIs sob responsabilidade de membros do time
          </h2>
          <Badge
            variant="outline"
            className="ml-1 bg-status-purple-muted text-status-purple border-status-purple/30"
          >
            {memberKpis.length}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Indicadores cujo responsável (owner) é membro deste time
          {includeSubteams ? ' ou de seus sub-times' : ''}.
        </p>

        {memberKpis.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Nenhum membro tem KPIs próprios cadastrados além dos do time.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {memberKpis.map((kpi) => (
              <KpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
});
