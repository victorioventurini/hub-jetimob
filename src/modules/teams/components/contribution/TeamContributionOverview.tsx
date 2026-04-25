import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Target,
  Share2,
  Building2,
  FolderKanban,
  Rocket,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { TeamHealthSparkline } from './TeamHealthSparkline';
import { TeamContributionInsights } from '@/modules/okrs/components/team-contribution/TeamContributionInsights';
import { useTeamContributionView } from '@/modules/okrs/hooks';
import type { TeamContributionAnalytics } from '@/modules/teams/hooks/useTeamContributionAnalytics';

interface TeamContributionOverviewProps {
  teamId: string;
  analytics: TeamContributionAnalytics | null | undefined;
  isLoading: boolean;
  onNavigateToSubtab: (subtab: string) => void;
}

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  hint?: string;
  onClick?: () => void;
  cta?: string;
}

const KpiCard = React.memo(function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  onClick,
  cta,
}: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Icon className="h-5 w-5 text-accent" />
          <span className="text-2xl font-bold tabular-nums">{value}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
        </div>
        {onClick && cta && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 -mx-2 text-xs gap-1 text-accent hover:text-accent"
            onClick={onClick}
          >
            {cta}
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

export const TeamContributionOverview = React.memo(function TeamContributionOverview({
  teamId,
  analytics,
  isLoading,
  onNavigateToSubtab,
}: TeamContributionOverviewProps) {
  const { data: contribView } = useTeamContributionView(teamId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Target}
          label="OKRs do time"
          value={analytics.ownObjectivesCount}
          hint={`${analytics.ownKrsCount} KR${analytics.ownKrsCount === 1 ? '' : 's'}`}
          cta="Ver OKRs"
          onClick={() => onNavigateToSubtab('team-okrs')}
        />
        <KpiCard
          icon={Share2}
          label="Compartilhados"
          value={analytics.sharedReceivedCount + analytics.sharedContributedCount}
          hint={`${analytics.sharedReceivedCount} recebidos · ${analytics.sharedContributedCount} contribuídos`}
          cta="Ver detalhes"
          onClick={() => onNavigateToSubtab('shared-okrs')}
        />
        <KpiCard
          icon={Building2}
          label="Org Objectives impactados"
          value={analytics.orgObjectivesImpactedCount}
          hint="Via KRs vinculados"
          cta="Ver contribuição"
          onClick={() => onNavigateToSubtab('org-contribution')}
        />
        <KpiCard
          icon={FolderKanban}
          label="Projetos ativos"
          value={analytics.activeProjectsCount}
          hint="Vinculados a KRs"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <TeamHealthSparkline data={analytics.healthSeries} height={70} />
        </CardContent>
      </Card>

      {contribView && contribView.contributions.length > 0 && (
        <TeamContributionInsights data={contribView} />
      )}

      {contribView && contribView.contributions.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Este time ainda não possui KRs vinculados a Objetivos Organizacionais.{' '}
            <Link to="/okrs" className="text-accent hover:underline">
              Configurar OKRs
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
});
