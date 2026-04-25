import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUrlState } from '@/shared/url';
import { useTeamContributionAnalytics } from '@/modules/teams/hooks/useTeamContributionAnalytics';
import {
  useTeamContributionView,
} from '@/modules/okrs/hooks';
import { useCycles, useTeamObjectives } from '@/modules/okrs/hooks';
import { CycleSelect } from '@/components/selects/CycleSelect';
import { useBu } from '@/contexts/BuContext';
import { TeamContributionOverview } from './TeamContributionOverview';
import { TeamSharedOkrsBlock } from './TeamSharedOkrsBlock';
import { OrgObjectiveContributionCard } from '@/modules/okrs/components/team-contribution/OrgObjectiveContributionCard';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/empty-state';
import { Target, FolderKanban } from 'lucide-react';
import { OkrStatusBadge } from '@/modules/okrs/components/OkrStatusBadge';
import { useProjects } from '@/modules/projects/hooks';

interface TeamContributionTabProps {
  teamId: string;
  teamName: string;
}

const SUBTABS = [
  { value: 'overview', label: 'Visão Geral' },
  { value: 'team-okrs', label: 'OKRs do time' },
  { value: 'shared-okrs', label: 'Compartilhados' },
  { value: 'org-contribution', label: 'Org Objectives' },
  { value: 'projects', label: 'Projetos' },
] as const;

export function TeamContributionTab({ teamId, teamName }: TeamContributionTabProps) {
  const navigate = useNavigate();
  const { currentBu } = useBu();

  const { value: subtab, set: setSubtab } = useUrlState<string>({
    key: 'subtab',
    defaultValue: 'overview',
  });
  const { value: includeSubteamsRaw, set: setIncludeSubteams } = useUrlState<string>({
    key: 'include_subteams',
    defaultValue: 'false',
  });
  const includeSubteams = includeSubteamsRaw === 'true';
  const { value: cycleId, set: setCycleId } = useUrlState<string>({
    key: 'cycle_id',
    defaultValue: '',
  });

  const { data: cycles = [] } = useCycles();
  const cycleParam = cycleId || undefined;

  const { data: analytics, isLoading } = useTeamContributionAnalytics(teamId, {
    includeSubteams,
    cycleId: cycleParam,
  });

  return (
    <div className="space-y-4">
      {/* Header com toggles + filtro de ciclo */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="include-subteams"
                checked={includeSubteams}
                onCheckedChange={(checked) =>
                  setIncludeSubteams(checked ? 'true' : 'false')
                }
              />
              <Label htmlFor="include-subteams" className="cursor-pointer text-sm flex items-center gap-1">
                <Layers className="h-4 w-4" />
                Incluir sub-times
              </Label>
            </div>
            {includeSubteams && analytics && (
              <Badge variant="secondary" className="text-xs">
                {analytics.resolvedTeamIds.length} time
                {analytics.resolvedTeamIds.length === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          <div className="w-[260px]">
            <CycleSelect
              value={cycleId}
              onValueChange={setCycleId}
              cycles={cycles}
              placeholder="Todos os ciclos"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={subtab} onValueChange={setSubtab}>
        <TabsList className="flex-wrap h-auto">
          {SUBTABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <TeamContributionOverview
            teamId={teamId}
            analytics={analytics}
            isLoading={isLoading}
            onNavigateToSubtab={setSubtab}
          />
        </TabsContent>

        <TabsContent value="team-okrs" className="mt-4">
          <TeamOwnOkrsList
            teamIds={analytics?.resolvedTeamIds || [teamId]}
            cycleId={cycleParam}
          />
        </TabsContent>

        <TabsContent value="shared-okrs" className="mt-4">
          <TeamSharedOkrsBlock teamId={teamId} />
        </TabsContent>

        <TabsContent value="org-contribution" className="mt-4">
          <OrgContributionList teamId={teamId} />
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <TeamProjectsList teamId={teamId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Sub-blocks (kept in same file — small + scoped)
// ============================================================

const TeamOwnOkrsList = React.memo(function TeamOwnOkrsList({
  teamIds,
  cycleId,
}: {
  teamIds: string[];
  cycleId?: string;
}) {
  const { currentBu } = useBu();
  // Por simplicidade, lista do time root (primeiro id). Se sub-times estiver ligado,
  // o badge de contagem agregada já é mostrado no header.
  const { data, isLoading } = useTeamObjectives({
    buId: currentBu?.id ?? null,
    teamId: teamIds[0],
    cycleId,
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Sem OKRs do time"
        description="Este time ainda não possui objetivos próprios criados."
      />
    );
  }

  return (
    <div className="space-y-3">
      {data.map((obj: any) => (
        <Card key={obj.id}>
          <CardHeader className="pb-2 flex-row items-start justify-between gap-2">
            <CardTitle className="text-base">
              <Link to={`/okrs/team-objective/${obj.id}`} className="hover:text-accent">
                {obj.title}
              </Link>
            </CardTitle>
            {obj.is_shared && (
              <Badge variant="secondary" className="text-xs">
                Compartilhado
              </Badge>
            )}
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {obj.description && (
              <p className="text-muted-foreground">{obj.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {(obj.key_results || []).length} KR
              {(obj.key_results || []).length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

const OrgContributionList = React.memo(function OrgContributionList({
  teamId,
}: {
  teamId: string;
}) {
  const navigate = useNavigate();
  const { data, isLoading } = useTeamContributionView(teamId);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.contributions.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Sem contribuição organizacional"
        description="Este time ainda não possui KRs vinculados a Objetivos Organizacionais."
      />
    );
  }

  return (
    <div className="space-y-4">
      {data.contributions.map((c) => (
        <OrgObjectiveContributionCard
          key={c.id}
          contribution={c}
          onNavigateToObjective={(id) => navigate(`/okrs/org-view/${id}`)}
        />
      ))}
    </div>
  );
});

const TeamProjectsList = React.memo(function TeamProjectsList({
  teamId,
}: {
  teamId: string;
}) {
  const { data: projects, isLoading } = useProjects({ team_id: teamId });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!projects || projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Sem projetos vinculados"
        description="Este time ainda não possui projetos cadastrados."
      />
    );
  }

  return (
    <div className="space-y-2">
      {projects.map((p: any) => (
        <Link
          key={p.id}
          to={`/projects/${p.id}`}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <FolderKanban className="h-4 w-4 text-accent" />
            <div>
              <p className="font-medium text-sm">{p.name || p.title}</p>
              {p.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {p.description}
                </p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-xs capitalize">
            {p.status?.replace('_', ' ')}
          </Badge>
        </Link>
      ))}
    </div>
  );
});
