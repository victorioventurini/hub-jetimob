/**
 * MbrTeamOkrsDetailStep - Análise detalhada consolidada por time
 *
 * Usa WizardStepScaffold para layout estável (footer sempre acessível).
 * Grid responsiva xl:grid-cols-2 para melhor aproveitamento horizontal.
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Users, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, InlineDecisionInput } from '../shared';
import { WizardStepScaffold } from '../shared/WizardStepScaffold';
import { OkrProgressBar } from '@/modules/okrs/components/OkrProgressBar';
import { OkrStatusBadge } from '@/modules/okrs/components/OkrStatusBadge';
import { LastCheckinBadge } from '../shared/LastCheckinBadge';
import { RAG_STATUS_COLORS } from '@/lib/colors';
import type { MbrTeamOkrSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrTeamOkrsDetailStepProps {
  teamOkrSnapshots: MbrTeamOkrSnapshot[];
  onTeamOkrSnapshotsChange: (snapshots: MbrTeamOkrSnapshot[]) => void;
  currentTeamIndex: number;
  onCurrentTeamIndexChange: (index: number) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// HELPERS
// ============================================================

function toRagStatus(status: string): 'green' | 'yellow' | 'red' | 'not_started' {
  if (status === 'green' || status === 'on_track') return 'green';
  if (status === 'yellow' || status === 'at_risk') return 'yellow';
  if (status === 'red' || status === 'off_track') return 'red';
  return 'not_started';
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrTeamOkrsDetailStep({
  teamOkrSnapshots,
  onTeamOkrSnapshotsChange,
  currentTeamIndex: _currentTeamIndex,
  onCurrentTeamIndexChange: _onCurrentTeamIndexChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: MbrTeamOkrsDetailStepProps) {
  const teamsWithOkrs = useMemo(
    () => teamOkrSnapshots.filter((team) => team.objectives.length > 0),
    [teamOkrSnapshots]
  );

  const reviewedCount = teamsWithOkrs.filter((team) => team.reviewed).length;
  const allReviewed = teamsWithOkrs.every((team) => team.reviewed);

  const handleToggleReviewed = (teamId: string, checked: boolean) => {
    onTeamOkrSnapshotsChange(
      teamOkrSnapshots.map((team) =>
        team.teamId === teamId ? { ...team, reviewed: checked } : team
      )
    );
  };

  if (teamOkrSnapshots.length === 0) {
    return (
      <WizardStepScaffold
        header={
          <WizardStepHeader
            icon={Target}
            title="Análise por Time"
            description="Nenhum time disponível"
            variant="primary"
          />
        }
        footer={
          <WizardStepFooter
            onBack={onBack}
            onPrimary={onContinue}
            primaryLabel="Prosseguir para OKRs Org"
          />
        }
      >
        <div className="flex-1 flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Nenhum time com OKRs para revisar.</p>
        </div>
      </WizardStepScaffold>
    );
  }

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Target}
          title="Análise por Time"
          description={`${reviewedCount} de ${teamsWithOkrs.length} times revisados`}
          variant="primary"
        />
      }
      topFixed={
        <>
          <Progress
            value={(reviewedCount / Math.max(1, teamsWithOkrs.length)) * 100}
            className="h-1"
          />
          <div className="px-6 py-2 flex items-center justify-between text-xs text-muted-foreground border-b">
            <span>{reviewedCount} de {teamsWithOkrs.length} times revisados</span>
            <span>{Math.round((reviewedCount / Math.max(1, teamsWithOkrs.length)) * 100)}%</span>
          </div>
        </>
      }
      bottomFixed={
        <>
          <div className="border-t">
            <InlineDecisionInput
              decisions={decisions}
              onDecisionsChange={onDecisionsChange}
              sourceStep="team-okrs-detail"
              placeholder="Nota sobre a análise dos times..."
            />
          </div>
          {!allReviewed && (
            <p className="text-xs text-muted-foreground text-center pb-2 px-4">
              Revise todos os times com OKRs antes de prosseguir ({reviewedCount}/{teamsWithOkrs.length})
            </p>
          )}
        </>
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryLabel="Prosseguir para OKRs Org"
          primaryDisabled={!allReviewed}
        />
      }
    >
      {/* Scrollable content — responsive grid for better horizontal usage */}
      <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-full">
        {teamOkrSnapshots.map((team) => (
          <Card
            key={team.teamId}
            className={cn(
              'overflow-hidden',
              team.healthStatus === 'risk' && RAG_STATUS_COLORS.red.border,
              team.healthStatus === 'attention' && RAG_STATUS_COLORS.yellow.border,
              team.reviewed && 'bg-status-green-muted/30 border-status-green/30'
            )}
          >
            <CardContent className="p-4 space-y-3 min-w-0">
              {/* Team header */}
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    <p className="font-semibold truncate">{team.teamName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {team.objectives.length} OKRs · {team.objectives.reduce((sum, obj) => sum + obj.krCount, 0)} KRs
                  </p>
                </div>

                {team.objectives.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Checkbox
                      id={`reviewed-${team.teamId}`}
                      checked={team.reviewed}
                      onCheckedChange={(checked) => handleToggleReviewed(team.teamId, checked === true)}
                    />
                    <Label
                      htmlFor={`reviewed-${team.teamId}`}
                      className="text-xs cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle2 className={cn('h-3.5 w-3.5', team.reviewed ? 'text-status-green' : 'text-muted-foreground')} />
                      <span className="hidden sm:inline">Revisado</span>
                    </Label>
                  </div>
                )}
              </div>

              {/* OKRs */}
              {team.objectives.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem OKRs no ciclo atual.</p>
              ) : (
                <div className="space-y-2">
                  {team.objectives.map((objective) => (
                    <div
                      key={objective.objectiveId}
                      className={cn(
                        'rounded-md border p-3 space-y-2 min-w-0',
                        objective.krsAtRisk > 0 && RAG_STATUS_COLORS.red.border
                      )}
                    >
                      {/* Objective header — compact */}
                      <div className="flex items-center gap-2 min-w-0">
                        <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                        <p className="text-sm font-medium truncate flex-1 min-w-0">{objective.title}</p>
                        <span className="text-xs font-medium shrink-0">{objective.progress}%</span>
                      </div>

                      {objective.krsAtRisk > 0 && (
                        <p className={cn('text-xs', RAG_STATUS_COLORS.red.text)}>
                          {objective.krsAtRisk} KR{objective.krsAtRisk > 1 ? 's' : ''} em risco
                        </p>
                      )}

                      {/* KRs — compact single-line layout */}
                      <div className="space-y-1.5">
                        {objective.keyResults.map((kr) => {
                          const rag = toRagStatus(kr.status ?? 'not_started');

                          return (
                            <div
                              key={kr.krId}
                              className={cn('p-2 rounded border min-w-0', RAG_STATUS_COLORS[rag].border)}
                            >
                              {/* Title + status in one line */}
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-xs font-medium truncate flex-1 min-w-0">{kr.title}</p>
                                <OkrStatusBadge status={rag} type="kr" className="shrink-0 text-[10px]" />
                              </div>

                              {/* Progress bar */}
                              <div className="mt-1.5">
                                <OkrProgressBar
                                  baseline={kr.baseline}
                                  current={kr.current}
                                  target={kr.target}
                                  direction={kr.direction}
                                  status={rag}
                                  unit={kr.unit ?? '%'}
                                  size="sm"
                                />
                              </div>

                              {/* Metadata row — owner + last checkin inline */}
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground min-w-0">
                                {kr.ownerName && (
                                  <span className="truncate flex-1 min-w-0">{kr.ownerName}</span>
                                )}
                                <div className="shrink-0">
                                  <LastCheckinBadge lastCompletedAt={kr.lastCheckinAt ?? null} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </WizardStepScaffold>
  );
}
