/**
 * MbrTeamOkrsDetailStep - Análise sequencial time-a-time
 * 
 * Navega entre times com setas. Exibe objetivos + KRs de cada time.
 * Gate: todos os times com OKRs devem ser marcados como "revisados".
 * 
 * Padrão visual consistente com TeamKrReviewStep (team-checkin):
 * - OkrProgressBar para progresso de KRs
 * - RAG_STATUS_COLORS para badges e indicadores
 * - Valores canônicos do enum okr_rag_status (green/yellow/red/not_started)
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, InlineDecisionInput } from '../shared';
import { OkrProgressBar } from '@/modules/okrs/components/OkrProgressBar';
import { OkrStatusBadge } from '@/modules/okrs/components/OkrStatusBadge';
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

function TrendIcon({ trend }: { trend: string }) {
  switch (trend) {
    case 'improving': return <TrendingUp className="h-3.5 w-3.5 text-status-green" />;
    case 'declining': return <TrendingDown className="h-3.5 w-3.5 text-status-red" />;
    default: return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

/** Map KR status to canonical RAG key */
function toRagKey(status: string): keyof typeof RAG_STATUS_COLORS {
  if (status === 'green') return 'green';
  if (status === 'yellow') return 'yellow';
  if (status === 'red') return 'red';
  return 'not_started';
}

// ragLabel removed — OkrStatusBadge handles labels canonically

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
  const totalTeams = teamOkrSnapshots.length;
  const safeIndex = Math.min(currentTeamIndex, totalTeams - 1);
  const currentTeam = totalTeams > 0 ? teamOkrSnapshots[safeIndex] : null;

  // Gate: all teams with OKRs must be reviewed
  const teamsWithOkrs = useMemo(
    () => teamOkrSnapshots.filter(t => t.objectives.length > 0),
    [teamOkrSnapshots]
  );

  const allReviewed = useMemo(
    () => teamsWithOkrs.every(t => t.reviewed),
    [teamsWithOkrs]
  );

  const reviewedCount = teamsWithOkrs.filter(t => t.reviewed).length;

  const handleToggleReviewed = (checked: boolean) => {
    if (!currentTeam) return;
    onTeamOkrSnapshotsChange(
      teamOkrSnapshots.map(t =>
        t.teamId === currentTeam.teamId ? { ...t, reviewed: checked } : t
      )
    );
  };

  const goPrevTeam = () => {
    if (safeIndex > 0) onCurrentTeamIndexChange(safeIndex - 1);
  };

  const goNextTeam = () => {
    if (safeIndex < totalTeams - 1) onCurrentTeamIndexChange(safeIndex + 1);
  };

  if (totalTeams === 0 || !currentTeam) {
    return (
      <div className="flex flex-col h-full">
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
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={Target}
        title={currentTeam.teamName}
        description="Análise de OKRs do time"
        variant={
          currentTeam.healthStatus === 'risk' ? 'red'
          : currentTeam.healthStatus === 'attention' ? 'amber'
          : 'green'
        }
        rightContent={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safeIndex === 0}
              onClick={goPrevTeam}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[3rem] text-center whitespace-nowrap">
              {safeIndex + 1}/{totalTeams}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safeIndex === totalTeams - 1}
              onClick={goNextTeam}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Review progress bar — same pattern as TeamKrReviewStep */}
      <Progress
        value={(reviewedCount / Math.max(1, teamsWithOkrs.length)) * 100}
        className="h-1"
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {/* Review status bar */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{reviewedCount} de {teamsWithOkrs.length} times revisados</span>
            <span>{Math.round((reviewedCount / Math.max(1, teamsWithOkrs.length)) * 100)}%</span>
          </div>

          {currentTeam.objectives.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Users className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Este time não possui OKRs no ciclo atual.
              </p>
            </div>
          ) : (
            currentTeam.objectives.map(obj => (
              <Card key={obj.objectiveId} className={cn(
                'transition-colors',
                obj.krsAtRisk > 0 && RAG_STATUS_COLORS.red.border,
              )}>
                <CardContent className="p-4 space-y-3">
                  {/* Objective header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary flex-shrink-0" />
                        <p className="font-medium text-sm">{obj.title}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-6">
                        <TrendIcon trend={obj.trend} />
                        <span className="text-xs text-muted-foreground">
                          {obj.krCount} KRs
                          {obj.krsAtRisk > 0 && (
                            <span className={cn('ml-1', RAG_STATUS_COLORS.red.text)}>
                              · {obj.krsAtRisk} em risco
                            </span>
                          )}
                          {obj.krsStagnant > 0 && (
                            <span className={cn('ml-1', RAG_STATUS_COLORS.yellow.text)}>
                              · {obj.krsStagnant} estagnados
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {obj.progress}%
                    </Badge>
                  </div>

                  <Progress value={Math.min(100, obj.progress)} className="h-1.5" />

                  {/* KRs list — aligned with TeamKrReviewStep pattern */}
                  {obj.keyResults && obj.keyResults.length > 0 && (
                    <div className="space-y-3 ml-6 overflow-hidden">
                      {obj.keyResults.map(kr => {
                        const rag = toRagKey(kr.status ?? 'not_started');
                        return (
                          <div
                            key={kr.krId}
                            className={cn(
                              'py-2.5 px-3 rounded-md border text-xs overflow-hidden space-y-2',
                              RAG_STATUS_COLORS[rag].border,
                            )}
                          >
                            {/* KR header row */}
                            <div className="flex items-center gap-2">
                              <span className="truncate flex-1 min-w-0 font-medium">{kr.title}</span>
                              {kr.ownerName && (
                                <span className="text-muted-foreground flex-shrink-0 hidden sm:inline max-w-[10rem] truncate">{kr.ownerName}</span>
                              )}
                              <OkrStatusBadge status={rag} type="kr" className="flex-shrink-0" />
                            </div>
                            {/* Progress bar with base/current/target */}
                            <OkrProgressBar
                              baseline={Number(kr.baseline ?? 0)}
                              current={Number(kr.current ?? 0)}
                              target={Number(kr.target ?? 0)}
                              direction={(kr.direction ?? 'up') as 'up' | 'down' | 'maintain'}
                              status={rag}
                              unit={kr.unit ?? '%'}
                              size="sm"
                              showLabels
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {/* Reviewed checkbox — consistent with gate pattern */}
          <div className={cn(
            'flex items-center gap-3 p-4 rounded-lg border transition-colors',
            currentTeam.reviewed
              ? 'bg-status-green-muted/50 border-status-green/30'
              : 'bg-muted/50'
          )}>
            <Checkbox
              id="reviewed"
              checked={currentTeam.reviewed}
              onCheckedChange={(checked) => handleToggleReviewed(checked === true)}
            />
            <Label htmlFor="reviewed" className="text-sm cursor-pointer flex items-center gap-2">
              <CheckCircle2 className={cn(
                'h-4 w-4',
                currentTeam.reviewed ? 'text-status-green' : 'text-muted-foreground'
              )} />
              Marcar "{currentTeam.teamName}" como revisado
            </Label>
          </div>
        </div>
      </ScrollArea>

      {/* Inline decisions per team */}
      <div className="border-t">
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="team-okrs-detail"
          placeholder={`Nota sobre ${currentTeam.teamName}...`}
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
