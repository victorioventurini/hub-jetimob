import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AreaBadge } from '@/components/ui/area-badge';
import { Building2, Users, BarChart3, Layers, User } from 'lucide-react';
import { KpiCard } from '@/modules/kpis/components/KpiCard';
import { useTeamKpisGrouped } from '@/modules/teams/hooks/useTeamKpisGrouped';
import { useBu } from '@/contexts/BuContext';
import { getScopeLabels, type KpiWithValues } from '@/modules/kpis/types';

interface TeamContributionKpisProps {
  teamId: string;
  resolvedTeamIds: string[];
  includeSubteams: boolean;
}

const KPI_GRID =
  'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5';

function GroupHeader({
  icon: Icon,
  title,
  count,
  description,
  iconClassName,
  badgeClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  count: number;
  description?: React.ReactNode;
  iconClassName?: string;
  badgeClassName?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <Icon className={iconClassName ?? 'h-5 w-5 text-accent'} />
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <Badge variant="outline" className={badgeClassName ?? 'ml-1'}>
          {count}
        </Badge>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground pl-8">{description}</p>
      )}
    </div>
  );
}

export const TeamContributionKpis = React.memo(function TeamContributionKpis({
  teamId,
  resolvedTeamIds,
  includeSubteams,
}: TeamContributionKpisProps) {
  const { currentBu } = useBu();
  const { data, isLoading } = useTeamKpisGrouped(teamId, {
    resolvedTeamIds,
    includeSubteams,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className={KPI_GRID}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const org = data?.org ?? [];
  const areaGroups = data?.area ?? [];
  const team = data?.team ?? [];
  const ownerGroups = data?.owners ?? [];
  const memberCount = data?.memberCount ?? 0;
  const total = data?.totalCount ?? 0;

  if (total === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sem KPIs vinculados"
        description={
          memberCount === 0
            ? 'Este time ainda não possui KPIs sob sua responsabilidade nem membros com indicadores próprios.'
            : 'Nem o time, suas áreas, nem os seus membros possuem KPIs ativos cadastrados.'
        }
      />
    );
  }

  const buLabel = getScopeLabels(currentBu?.name ?? undefined).org;
  const areaTotal = areaGroups.reduce((acc, g) => acc + g.kpis.length, 0);
  const ownerTotal = ownerGroups.reduce((acc, g) => acc + g.kpis.length, 0);

  return (
    <div className="space-y-10">
      {/* 1) BU (org) */}
      {org.length > 0 && (
        <section className="space-y-4">
          <GroupHeader
            icon={Building2}
            title={buLabel}
            count={org.length}
            iconClassName="h-5 w-5 text-primary"
            description="Indicadores globais da BU vinculados a este time."
          />
          <div className={KPI_GRID}>
            {org.map((kpi) => (
              <KpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </section>
      )}

      {/* 2) Área */}
      {areaGroups.length > 0 && (
        <section className="space-y-5">
          <GroupHeader
            icon={Layers}
            title="Área"
            count={areaTotal}
            iconClassName="h-5 w-5 text-status-cyan"
            description="Indicadores de escopo de área que tocam este time."
          />
          {areaGroups.map((group) => (
            <div key={group.areaId ?? '__no_area__'} className="space-y-3">
              <div className="flex items-center gap-3 pl-8">
                {group.areaId ? (
                  <AreaBadge
                    area={{ name: group.areaName, color: group.areaColor }}
                  />
                ) : (
                  <Badge variant="outline" className="text-xs">
                    {group.areaName}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {group.kpis.length}{' '}
                  {group.kpis.length === 1 ? 'indicador' : 'indicadores'}
                </span>
              </div>
              <div className={KPI_GRID}>
                {group.kpis.map((kpi: KpiWithValues) => (
                  <KpiCard key={kpi.id} kpi={kpi} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 3) Time */}
      {team.length > 0 && (
        <section className="space-y-4">
          <GroupHeader
            icon={Users}
            title="Time"
            count={team.length}
            iconClassName="h-5 w-5 text-info"
            description={
              includeSubteams
                ? `Indicadores sob responsabilidade do time e seus sub-times (${resolvedTeamIds.length} times).`
                : 'Indicadores sob responsabilidade direta do time.'
            }
          />
          <div className={KPI_GRID}>
            {team.map((kpi) => (
              <KpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </section>
      )}

      {/* 4) Responsável */}
      {ownerGroups.length > 0 && (
        <section className="space-y-5">
          <GroupHeader
            icon={User}
            title="Responsável"
            count={ownerTotal}
            iconClassName="h-5 w-5 text-status-purple"
            badgeClassName="ml-1 bg-status-purple-muted text-status-purple border-status-purple/30"
            description={
              includeSubteams
                ? 'Indicadores cujo responsável (owner) é membro deste time ou de seus sub-times, e que não pertencem aos blocos acima.'
                : 'Indicadores cujo responsável (owner) é membro deste time, e que não pertencem aos blocos acima.'
            }
          />
          {ownerGroups.map((group) => (
            <div key={group.ownerId} className="space-y-3">
              <div className="flex items-center gap-3 pl-8">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={group.photoUrl ?? undefined} />
                  <AvatarFallback className="text-xs bg-status-purple-muted text-status-purple">
                    {group.ownerName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">
                  {group.ownerName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {group.kpis.length}{' '}
                  {group.kpis.length === 1 ? 'indicador' : 'indicadores'}
                </span>
              </div>
              <div className={KPI_GRID}>
                {group.kpis.map((kpi) => (
                  <KpiCard key={kpi.id} kpi={kpi} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
});
