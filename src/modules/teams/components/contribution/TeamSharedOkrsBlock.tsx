import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Share2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { ContributingOkrCard } from '@/modules/okrs/components/team-view/ContributingOkrCard';
import {
  useTeamObjectivesWithSharedInfo,
  useTeamContributedObjectives,
} from '@/modules/okrs/hooks';
import { useCanManageTeamOkr } from '@/modules/okrs/hooks/useCanManageTeamOkr';
import { useBu } from '@/contexts/BuContext';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/ui/empty-state';

interface TeamSharedOkrsBlockProps {
  teamId: string;
}

/**
 * Hidrata key_results dos objetivos contribuídos para uso no ContributingOkrCard.
 */
function useSharedObjectivesWithKrs(objectiveIds: string[]) {
  const { client: supabase, isReady } = useOptionalBuClient();
  return useQuery({
    queryKey: ['shared-objectives-with-krs', objectiveIds.sort().join(',')],
    queryFn: async () => {
      if (!supabase || objectiveIds.length === 0) return [];
      const { data, error } = await supabase
        .from('okr_team_key_results')
        .select(
          'id, title, baseline, current_value, target, direction, unit, status, team_id, team_objective_id, owner_user_id, updated_at, type, owner:profiles!okr_team_key_results_owner_user_id_fkey (id, display_name, photo_url)'
        )
        .in('team_objective_id', objectiveIds)
        .is('deleted_at', null)
        .is('cancelled_at', null);
      if (error) throw error;
      return data || [];
    },
    enabled: isReady && !!supabase && objectiveIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}

export const TeamSharedOkrsBlock = React.memo(function TeamSharedOkrsBlock({
  teamId,
}: TeamSharedOkrsBlockProps) {
  const { currentBu } = useBu();
  const { data: ownShared, isLoading: loadingOwn } = useTeamObjectivesWithSharedInfo(
    currentBu?.id ?? null,
    teamId
  );
  const { data: contributedTo, isLoading: loadingContrib } =
    useTeamContributedObjectives(teamId);

  const ownSharedFiltered = (ownShared || []).filter((o: any) => o.is_shared);
  const allObjectiveIds = [
    ...ownSharedFiltered.map((o: any) => o.id),
    ...(contributedTo || []).map((o: any) => o.id),
  ];
  const { data: krs } = useSharedObjectivesWithKrs(allObjectiveIds);

  const krsByObj = React.useMemo(() => {
    const map = new Map<string, any[]>();
    for (const kr of krs || []) {
      const arr = map.get(kr.team_objective_id) || [];
      arr.push(kr);
      map.set(kr.team_objective_id, arr);
    }
    return map;
  }, [krs]);

  const isLoading = loadingOwn || loadingContrib;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const hasReceived = ownSharedFiltered.length > 0;
  const hasContributed = (contributedTo || []).length > 0;

  if (!hasReceived && !hasContributed) {
    return (
      <EmptyState
        icon={Share2}
        title="Nenhum OKR compartilhado"
        description="Este time ainda não possui objetivos compartilhados — nem como dono, nem como contribuidor."
      />
    );
  }

  return (
    <div className="space-y-6">
      {hasReceived && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold">Recebidos (este time é dono)</h3>
            <Badge variant="secondary">{ownSharedFiltered.length}</Badge>
          </div>
          <div className="space-y-3">
            {ownSharedFiltered.map((obj: any) => (
              <Card key={obj.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{obj.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {obj.description && (
                    <p className="text-muted-foreground">{obj.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-muted-foreground">Contribuidores:</span>
                    {(obj.contributors || []).map((c: any) => (
                      <Badge key={c.id} variant="outline" className="text-xs">
                        {c.team?.name || 'Time'}
                      </Badge>
                    ))}
                    {(obj.contributors || []).length === 0 && (
                      <span className="text-xs text-muted-foreground">Nenhum</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {hasContributed && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold">
              Contribuídos (objetivos de outros times)
            </h3>
            <Badge variant="secondary">{(contributedTo || []).length}</Badge>
          </div>
          <div className="space-y-3">
            {(contributedTo || []).map((obj: any) => (
              <ContributingOkrCard
                key={obj.id}
                currentTeamId={teamId}
                objective={{
                  id: obj.id,
                  title: obj.title,
                  description: obj.description,
                  status: obj.status,
                  is_shared: obj.is_shared,
                  responsibility_model: obj.responsibility_model,
                  team_id: obj.team_id,
                  bu_id: obj.bu_id,
                  team: obj.team,
                  key_results: krsByObj.get(obj.id) || [],
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
});
