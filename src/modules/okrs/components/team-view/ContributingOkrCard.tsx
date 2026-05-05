import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, Crown, ExternalLink, Target, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OkrStatusBadge } from '../OkrStatusBadge';
import { TeamKrFormDialog } from '../TeamKrFormDialog';
import { CheckinDialog } from '../CheckinDialog';
import { KrHistoryDialog } from '../KrHistoryDialog';
import { KeyResultRow, type KeyResult } from '../dashboard/KeyResultRow';
import { useKrPrimaryKpiBatch } from '../../hooks';
import { calculateProgress } from '../../types';

interface ContributingOkrCardProps {
  /** Se o usuário pode criar/editar KRs de contribuição em nome do time atual */
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
    key_results?: KeyResult[];
  };
  currentTeamId: string;
}

/**
 * Card component for displaying shared OKRs where the current team
 * is a contributor (not the primary team).
 *
 * KRs próprias do time contribuidor são renderizadas via `KeyResultRow`
 * canônico (mesmo componente usado em `ObjectiveListItem`), garantindo
 * paridade total: badge de KPI primária, status efetivo, valor atual/target,
 * contagem de iniciativas, botões Histórico/Editar/Atualizar, avatar do
 * responsável e seções expansíveis de Iniciativas + Projetos vinculados.
 *
 * Padrão registrado em mem://features/okrs/contributor-kr-uses-modal.
 */
export const ContributingOkrCard = React.memo(function ContributingOkrCard({
  objective,
  currentTeamId,
  canContribute = false,
}: ContributingOkrCardProps) {
  const [showAddKrDialog, setShowAddKrDialog] = useState(false);
  const [editingKr, setEditingKr] = useState<KeyResult | null>(null);
  const [checkinKr, setCheckinKr] = useState<KeyResult | null>(null);
  const [historyKr, setHistoryKr] = useState<KeyResult | null>(null);

  const primaryTeamName = objective.team?.name || 'Time não definido';
  const allKrs = objective.key_results || [];

  // KRs owned by the current (contributing) team
  const contributedKrs = useMemo(
    () => allKrs.filter((kr) => kr.team_id === currentTeamId),
    [allKrs, currentTeamId]
  );

  // v3.4.2: batch KPI primária para as KRs contribuidoras (Team KR)
  const krIds = useMemo(() => contributedKrs.map((kr) => kr.id), [contributedKrs]);
  const { hasKrPrimaryKpi, getKrPrimaryKpi } = useKrPrimaryKpiBatch(krIds, 'team');

  // Overall objective progress (all KRs)
  const avgProgress = useMemo(() => {
    if (allKrs.length === 0) return 0;
    return (
      allKrs.reduce(
        (acc, kr) =>
          acc + calculateProgress(kr.baseline, kr.current_value, kr.target, kr.direction, { unit: kr.unit }),
        0
      ) / allKrs.length
    );
  }, [allKrs]);

  // Contribution-state badge
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
            <div className="rounded-md border bg-background overflow-hidden">
              <div className="divide-y divide-border/50">
                {contributedKrs.map((kr) => (
                  <KeyResultRow
                    key={kr.id}
                    kr={kr}
                    type="team"
                    objectiveTitle={objective.title}
                    objectiveStatus={objective.status}
                    teamName={objective.team?.name}
                    canEdit={canContribute}
                    canCheckin={canContribute}
                    hasPrimaryKpi={hasKrPrimaryKpi(kr.id)}
                    primaryKpiInfo={getKrPrimaryKpi(kr.id)}
                    onEdit={() => setEditingKr(kr)}
                    onCheckin={() => setCheckinKr(kr)}
                    onShowHistory={() => setHistoryKr(kr)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Create KR Dialog */}
      {canContribute && (
        <TeamKrFormDialog
          open={showAddKrDialog}
          onOpenChange={setShowAddKrDialog}
          objectiveId={objective.id}
          teamId={currentTeamId}
          buId={objective.bu_id || undefined}
        />
      )}

      {/* Edit KR Dialog (Team KR) */}
      {editingKr && editingKr.team_id && (
        <TeamKrFormDialog
          open={!!editingKr}
          onOpenChange={(open) => !open && setEditingKr(null)}
          objectiveId={objective.id}
          teamId={editingKr.team_id}
          kr={{
            id: editingKr.id,
            team_id: editingKr.team_id,
            team_objective_id: editingKr.team_objective_id,
            title: editingKr.title,
            type: editingKr.type || 'contribution',
            baseline: editingKr.baseline,
            current_value: editingKr.current_value,
            target: editingKr.target,
            direction: editingKr.direction,
            unit: editingKr.unit,
            status: editingKr.status,
            owner_user_id: editingKr.owner_user_id,
          }}
        />
      )}

      {/* Checkin Dialog */}
      {checkinKr && checkinKr.team_id && (
        <CheckinDialog
          open={!!checkinKr}
          onOpenChange={(open) => !open && setCheckinKr(null)}
          kr={{
            id: checkinKr.id,
            title: checkinKr.title,
            baseline: checkinKr.baseline,
            current_value: checkinKr.current_value,
            target: checkinKr.target,
            direction: checkinKr.direction,
            unit: checkinKr.unit,
            status: checkinKr.status,
            team_id: checkinKr.team_id,
          }}
        />
      )}

      {/* KR History Dialog */}
      {historyKr && (
        <KrHistoryDialog
          open={!!historyKr}
          onOpenChange={(open) => !open && setHistoryKr(null)}
          kr={{
            id: historyKr.id,
            title: historyKr.title,
            baseline: historyKr.baseline,
            current_value: historyKr.current_value,
            target: historyKr.target,
            unit: historyKr.unit,
            direction: historyKr.direction,
            status: historyKr.status,
            type: historyKr.type || 'contribution',
            owner_name: historyKr.owner?.display_name,
            owner_photo: historyKr.owner?.photo_url,
            team_name: objective.team?.name,
            objective_title: objective.title,
          }}
        />
      )}
    </Card>
  );
});
