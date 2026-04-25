import React, { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, Crown, ExternalLink, Target, Plus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OkrStatusBadge } from '../OkrStatusBadge';
import { TeamKrFormDialog } from '../TeamKrFormDialog';
import { InitiativesList } from '../initiatives';
import { ProjectsForKrSection } from '@/modules/projects/components/ProjectsForKrSection';
import { calculateProgress, OkrRagStatus } from '../../types';

interface ContributingOkrCardProps {
  /** Se o usuário pode criar KRs de contribuição em nome do time atual */
  canContribute?: boolean;
  objective: {
    id: string;
    title: string;
    description?: string;
    status: string;
    is_shared: boolean;
    responsibility_model?: string | null;
    team_id: string;
    /** BU do objetivo dono — usada para criar a KR contribuidora na mesma BU */
    bu_id?: string | null;
    team?: {
      id: string;
      name: string;
    };
    key_results?: Array<{
      id: string;
      title: string;
      baseline: number;
      current_value: number;
      target: number;
      direction: 'up' | 'down';
      unit: string;
      status: OkrRagStatus;
      team_id?: string;
    }>;
  };
  currentTeamId: string;
}

/**
 * Card component for displaying shared OKRs where the current team
 * is a contributor (not the primary team).
 *
 * Shows:
 * - Owner team (Time A) + responsibility model
 * - KRs owned by the current team (Time B) — its actual contribution
 * - Contribution state badge (estratégica / operacional / apenas visível)
 * - Read-only: edit/cancel are not exposed here.
 */
export const ContributingOkrCard = React.memo(function ContributingOkrCard({
  objective,
  currentTeamId,
  canContribute = false,
}: ContributingOkrCardProps) {
  const [showAddKrDialog, setShowAddKrDialog] = useState(false);
  const primaryTeamName = objective.team?.name || 'Time não definido';
  const allKrs = objective.key_results || [];

  // KRs owned by the current (contributing) team
  const contributedKrs = useMemo(
    () => allKrs.filter((kr) => kr.team_id === currentTeamId),
    [allKrs, currentTeamId]
  );

  // Overall objective progress (all KRs)
  const avgProgress = useMemo(() => {
    if (allKrs.length === 0) return 0;
    return (
      allKrs.reduce(
        (acc, kr) =>
          acc + calculateProgress(kr.baseline, kr.current_value, kr.target, kr.direction),
        0
      ) / allKrs.length
    );
  }, [allKrs]);

  // Contribution-state badge:
  // - Estratégica: ≥1 KR own by this team
  // - Apenas visível: nothing concrete linked yet
  // (Operacional via projects/initiatives is deferred — would require extra data fetch.)
  const contribState: 'strategic' | 'visible' = contributedKrs.length > 0 ? 'strategic' : 'visible';

  return (
    <Card
      className={cn(
        'transition-all border-l-4 border-l-status-purple hover:shadow-md'
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge
                variant="outline"
                className="bg-status-purple-muted text-status-purple border-status-purple/30"
              >
                <Users className="w-3 h-3 mr-1" />
                Compartilhada
              </Badge>
              <OkrStatusBadge status={objective.status as any} />
              {contribState === 'strategic' ? (
                <Badge
                  variant="outline"
                  className="bg-status-green-muted text-status-green-muted-foreground border-status-green/30"
                >
                  Contribuição estratégica
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Apenas visível
                </Badge>
              )}
            </div>
            <h3 className="font-medium text-base line-clamp-2">{objective.title}</h3>
            {objective.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {objective.description}
              </p>
            )}
          </div>

          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link to={`/okrs?view=team&team_id=${objective.team_id}`} aria-label="Abrir time proprietário">
              <ExternalLink className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Primary Team Info */}
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md mb-3">
          <Crown className="w-4 h-4 text-warning" />
          <span className="text-sm">
            <span className="text-muted-foreground">Time proprietário:</span>{' '}
            <span className="font-medium">{primaryTeamName}</span>
          </span>
          {objective.responsibility_model && (
            <Badge variant="outline" className="ml-auto text-xs">
              {objective.responsibility_model === 'collaborative'
                ? 'Colaborativo'
                : 'Líder + Contribuidores'}
            </Badge>
          )}
        </div>

        {/* Overall Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso geral do objetivo</span>
            <span className="font-medium">{avgProgress.toFixed(0)}%</span>
          </div>
          <Progress value={Math.min(100, avgProgress)} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {allKrs.length} Key Result{allKrs.length !== 1 ? 's' : ''} no total
          </p>
        </div>

        {/* Contribution Section: KRs owned by the current team */}
        <div className="border-t pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-status-purple" />
            <h4 className="text-sm font-semibold">Contribuição do seu time</h4>
            <Badge variant="outline" className="text-xs">
              {contributedKrs.length} KR{contributedKrs.length !== 1 ? 's' : ''}
            </Badge>
            {canContribute && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddKrDialog(true)}
                className="ml-auto h-7 px-2 text-xs gap-1"
                aria-label="Adicionar KR de contribuição"
              >
                <Plus className="w-3 h-3" />
                Adicionar KR
              </Button>
            )}
          </div>

          {contributedKrs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Seu time ainda não possui Key Results vinculados a este objetivo. Crie KRs próprias para
              materializar a contribuição.
            </p>
          ) : (
            <div className="space-y-2">
              {contributedKrs.map((kr) => {
                const krProgress = calculateProgress(
                  kr.baseline,
                  kr.current_value,
                  kr.target,
                  kr.direction
                );
                return (
                  <div
                    key={kr.id}
                    className="flex items-center gap-3 p-2 rounded-md bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={kr.title}>
                        {kr.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={Math.min(100, krProgress)} className="h-1.5 flex-1" />
                        <span className="text-xs font-medium w-10 text-right">
                          {krProgress.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>

      {canContribute && (
        <TeamKrFormDialog
          open={showAddKrDialog}
          onOpenChange={setShowAddKrDialog}
          objectiveId={objective.id}
          teamId={currentTeamId}
          buId={objective.bu_id || undefined}
        />
      )}
    </Card>
  );
});
