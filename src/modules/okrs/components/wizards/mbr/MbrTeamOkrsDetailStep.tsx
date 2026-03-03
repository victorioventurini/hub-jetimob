/**
 * MbrTeamOkrsDetailStep - Análise detalhada 1 time por vez
 *
 * Usa WizardStepScaffold para layout estável (footer sempre acessível).
 * Navegação interna prev/next via currentTeamIndex — tudo dentro do wizard.
 */

import { useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Users, Target, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
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
  currentTeamIndex,
  onCurrentTeamIndexChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: MbrTeamOkrsDetailStepProps) {
  // Only teams with OKRs are navigable
  const teamsWithOkrs = useMemo(
    () => teamOkrSnapshots.filter((team) => team.objectives.length > 0),
    [teamOkrSnapshots]
  );

  const totalTeams = teamsWithOkrs.length;
  const reviewedCount = teamsWithOkrs.filter((team) => team.reviewed).length;
  const allReviewed = teamsWithOkrs.every((team) => team.reviewed);

  // Clamp index to valid range
  const safeIndex = Math.max(0, Math.min(currentTeamIndex, totalTeams - 1));
  const currentTeam = teamsWithOkrs[safeIndex] ?? null;

  const isFirstTeam = safeIndex === 0;
  const isLastTeam = safeIndex === totalTeams - 1;

  const handleToggleReviewed = useCallback((teamId: string, checked: boolean) => {
    onTeamOkrSnapshotsChange(
      teamOkrSnapshots.map((team) =>
        team.teamId === teamId ? { ...team, reviewed: checked } : team
      )
    );
  }, [teamOkrSnapshots, onTeamOkrSnapshotsChange]);

  const handleBack = useCallback(() => {
    if (isFirstTeam) {
      onBack();
    } else {
      onCurrentTeamIndexChange(safeIndex - 1);
    }
  }, [isFirstTeam, safeIndex, onBack, onCurrentTeamIndexChange]);

  const handleNext = useCallback(() => {
    if (isLastTeam) {
      if (allReviewed) onContinue();
    } else {
      onCurrentTeamIndexChange(safeIndex + 1);
    }
  }, [isLastTeam, allReviewed, safeIndex, onContinue, onCurrentTeamIndexChange]);

  // ── Empty state ────────────────────────────────────────────
  if (totalTeams === 0) {
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

  // ── Primary labels ─────────────────────────────────────────
  const backLabel = isFirstTeam ? 'Voltar' : 'Time anterior';
  const primaryLabel = isLastTeam ? 'Prosseguir para OKRs Org' : 'Próximo time';

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Target}
          title="Análise por Time"
          description={`Time ${safeIndex + 1} de ${totalTeams} — ${currentTeam?.teamName ?? ''}`}
          variant="primary"
        />
      }
      topFixed={
        <>
          {/* Progress bar — h-1 as per wizard-ui-consistency-standard */}
          <Progress
            value={(reviewedCount / Math.max(1, totalTeams)) * 100}
            className="h-1"
          />
          <div className="px-6 py-2 flex items-center justify-between gap-2 border-b min-w-0">
            {/* Review counter */}
            <span className="text-xs text-muted-foreground shrink-0">
              {reviewedCount}/{totalTeams} revisados
            </span>

            {/* Reviewed checkbox for current team */}
            {currentTeam && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Checkbox
                  id={`reviewed-${currentTeam.teamId}`}
                  checked={currentTeam.reviewed}
                  onCheckedChange={(checked) =>
                    handleToggleReviewed(currentTeam.teamId, checked === true)
                  }
                />
                <Label
                  htmlFor={`reviewed-${currentTeam.teamId}`}
                  className="text-xs cursor-pointer flex items-center gap-1 min-w-0"
                >
                  <CheckCircle2
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      currentTeam.reviewed ? 'text-status-green' : 'text-muted-foreground'
                    )}
                  />
                  <span className="truncate">Marcar como revisado</span>
                </Label>
              </div>
            )}
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
              placeholder={`Nota sobre ${currentTeam?.teamName ?? 'este time'}...`}
            />
          </div>
          {isLastTeam && !allReviewed && (
            <p className="text-xs text-muted-foreground text-center pb-2 px-4">
              Revise todos os times antes de prosseguir ({reviewedCount}/{totalTeams})
            </p>
          )}
        </>
      }
      footer={
        <WizardStepFooter
          onBack={handleBack}
          backLabel={backLabel}
          onPrimary={handleNext}
          primaryLabel={primaryLabel}
          primaryDisabled={isLastTeam && !allReviewed}
        />
      }
    >
      {/* Scrollable content — single team's OKRs */}
      {currentTeam && (
        <div className="p-6 space-y-4 max-w-full">
          {/* Team header card */}
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-4 w-4 text-primary shrink-0" />
            <p className="font-semibold truncate">{currentTeam.teamName}</p>
            <span className="text-xs text-muted-foreground shrink-0">
              {currentTeam.objectives.length} OKRs · {currentTeam.objectives.reduce((sum, obj) => sum + obj.krCount, 0)} KRs
            </span>
          </div>

          {/* OKRs for current team */}
          {currentTeam.objectives.map((objective) => (
            <Card
              key={objective.objectiveId}
              className={cn(
                'overflow-hidden',
                objective.krsAtRisk > 0 && RAG_STATUS_COLORS.red.border
              )}
            >
              <CardContent className="p-4 space-y-2 min-w-0">
                {/* Objective header */}
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

                {/* KRs */}
                <div className="space-y-1.5">
                  {objective.keyResults.map((kr) => {
                    const rag = toRagStatus(kr.status ?? 'not_started');

                    return (
                      <div
                        key={kr.krId}
                        className={cn('p-2 rounded border min-w-0', RAG_STATUS_COLORS[rag].border)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-xs font-medium truncate flex-1 min-w-0">{kr.title}</p>
                          <OkrStatusBadge status={rag} type="kr" className="shrink-0 text-[10px]" />
                        </div>

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

                        <div className="flex items-center justify-between gap-2 mt-1 text-xs text-muted-foreground min-w-0">
                          {kr.ownerName && (
                            <span className="truncate min-w-0">{kr.ownerName}</span>
                          )}
                          <div className="min-w-0 max-w-full">
                            <LastCheckinBadge lastCompletedAt={kr.lastCheckinAt ?? null} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </WizardStepScaffold>
  );
}
