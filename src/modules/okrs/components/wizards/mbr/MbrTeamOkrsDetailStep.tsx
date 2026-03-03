/**
 * MbrTeamOkrsDetailStep - Análise detalhada consolidada por time
 *
 * Exibe todos os times e seus OKRs na mesma tela para evitar quebra de
 * navegação/paginação por índice e manter continuidade do rito.
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, InlineDecisionInput } from '../shared';
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
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <WizardStepHeader
          icon={Target}
          title="Análise por Time"
          description="Nenhum time disponível"
          variant="primary"
        />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Nenhum time com OKRs para revisar.</p>
        </div>
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryLabel="Prosseguir para OKRs Org"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <WizardStepHeader
        icon={Target}
        title="Análise por Time"
        description={`${reviewedCount} de ${teamsWithOkrs.length} times revisados`}
        variant="primary"
      />

      <Progress
        value={(reviewedCount / Math.max(1, teamsWithOkrs.length)) * 100}
        className="h-1"
      />

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 space-y-4 max-w-full">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{reviewedCount} de {teamsWithOkrs.length} times revisados</span>
            <span>{Math.round((reviewedCount / Math.max(1, teamsWithOkrs.length)) * 100)}%</span>
          </div>

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
              <CardContent className="p-4 space-y-4 min-w-0">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="h-4 w-4 text-primary shrink-0" />
                      <p className="font-semibold truncate">{team.teamName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {team.objectives.length} OKRs · {team.objectives.reduce((sum, obj) => sum + obj.krCount, 0)} KRs
                    </p>
                  </div>

                  {team.objectives.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`reviewed-${team.teamId}`}
                        checked={team.reviewed}
                        onCheckedChange={(checked) => handleToggleReviewed(team.teamId, checked === true)}
                      />
                      <Label
                        htmlFor={`reviewed-${team.teamId}`}
                        className="text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className={cn('h-3.5 w-3.5', team.reviewed ? 'text-status-green' : 'text-muted-foreground')} />
                        Marcar "{team.teamName}" como revisado
                      </Label>
                    </div>
                  )}
                </div>

                {team.objectives.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Este time não possui OKRs no ciclo atual.</p>
                ) : (
                  <div className="space-y-3">
                    {team.objectives.map((objective) => (
                      <Card
                        key={objective.objectiveId}
                        className={cn('overflow-hidden', objective.krsAtRisk > 0 && RAG_STATUS_COLORS.red.border)}
                      >
                        <CardContent className="p-3 space-y-3 min-w-0">
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Target className="h-4 w-4 text-primary shrink-0" />
                              <p className="text-sm font-medium truncate">{objective.title}</p>
                            </div>
                            <span className="text-xs font-medium shrink-0">{objective.progress}%</span>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {objective.krCount} KRs
                            {objective.krsAtRisk > 0 && (
                              <span className={cn('ml-1', RAG_STATUS_COLORS.red.text)}>
                                · {objective.krsAtRisk} em risco
                              </span>
                            )}
                          </div>

                          <div className="space-y-2">
                            {objective.keyResults.map((kr) => {
                              const rag = toRagStatus(kr.status ?? 'not_started');

                              return (
                                <div
                                  key={kr.krId}
                                  className={cn('p-3 rounded-md border space-y-2.5 min-w-0 overflow-hidden', RAG_STATUS_COLORS[rag].border)}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <p className="text-sm font-medium truncate flex-1 min-w-0">{kr.title}</p>
                                    <OkrStatusBadge status={rag} type="kr" className="shrink-0" />
                                  </div>

                                  <OkrProgressBar
                                    baseline={kr.baseline}
                                    current={kr.current}
                                    target={kr.target}
                                    direction={kr.direction}
                                    status={rag}
                                    unit={kr.unit ?? '%'}
                                    size="sm"
                                  />

                                  {kr.ownerName && (
                                    <p className="text-xs text-muted-foreground truncate">Responsável: {kr.ownerName}</p>
                                  )}

                                  <LastCheckinBadge lastCompletedAt={kr.lastCheckinAt ?? null} />
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t">
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="team-okrs-detail"
          placeholder="Nota sobre a análise dos times..."
        />
      </div>

      <WizardStepFooter
        onBack={onBack}
        onPrimary={onContinue}
        primaryLabel="Prosseguir para OKRs Org"
        primaryDisabled={!allReviewed}
      />
      {!allReviewed && (
        <p className="text-xs text-muted-foreground text-center pb-2">
          Revise todos os times com OKRs antes de prosseguir ({reviewedCount}/{teamsWithOkrs.length})
        </p>
      )}
    </div>
  );
}

