import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Lightbulb, Target, AlertCircle } from 'lucide-react';
import { InitiativeCard } from '@/modules/okrs/components/initiatives/InitiativeCard';
import { useTeamKrInitiatives } from '@/modules/teams/hooks/useTeamKrInitiatives';
import { getShareableUrl } from '@/lib/shareableLinks';

interface TeamContributionInitiativesProps {
  teamId: string;
  resolvedTeamIds: string[];
  includeSubteams: boolean;
  /** Se vazio, hook usa o ciclo ativo. */
  cycleId?: string | null;
}

export const TeamContributionInitiatives = React.memo(
  function TeamContributionInitiatives({
    teamId,
    resolvedTeamIds,
    includeSubteams,
    cycleId,
  }: TeamContributionInitiativesProps) {
    const { data, isLoading } = useTeamKrInitiatives(teamId, {
      resolvedTeamIds,
      includeSubteams,
      cycleId,
    });

    if (isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (data?.noCycle) {
      return (
        <EmptyState
          icon={AlertCircle}
          title="Sem ciclo ativo"
          description="Não há um ciclo ativo configurado nesta BU. Selecione um ciclo no filtro acima para ver iniciativas."
        />
      );
    }

    if (!data || data.groups.length === 0) {
      return (
        <EmptyState
          icon={Lightbulb}
          title="Sem iniciativas no ciclo"
          description="As KRs deste time ainda não têm iniciativas cadastradas para o ciclo selecionado."
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lightbulb className="h-4 w-4" />
          <span>
            {data.totalInitiatives} iniciativa
            {data.totalInitiatives === 1 ? '' : 's'} em {data.totalKrs} KR
            {data.totalKrs === 1 ? '' : 's'}
          </span>
        </div>

        {data.groups.map((group) => (
          <Card key={group.kr.id}>
            <CardHeader className="pb-3 space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Target className="h-3 w-3" />
                    <span className="truncate">{group.kr.objective_title}</span>
                    {includeSubteams && group.kr.team_name && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {group.kr.team_name}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base">
                    <Link
                      to={getShareableUrl('okr_team_key_result', group.kr.id)}
                      className="hover:text-accent"
                    >
                      {group.kr.title}
                    </Link>
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {group.initiatives.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.initiatives.map((initiative) => (
                <InitiativeCard key={initiative.id} initiative={initiative} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
);
