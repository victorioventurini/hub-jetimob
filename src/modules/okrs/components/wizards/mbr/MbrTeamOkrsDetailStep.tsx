/**
 * MbrTeamOkrsDetailStep - Análise sequencial time-a-time
 * 
 * Navega entre times com setas. Exibe objetivos + KRs de cada time.
 * Gate: todos os times com OKRs devem ser marcados como "revisados".
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

function ragClass(status: string) {
  if (status === 'at_risk' || status === 'off_track') return 'text-status-red';
  if (status === 'behind' || status === 'stagnant' || status === 'not_started') return 'text-status-amber';
  return 'text-status-green';
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
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={safeIndex === 0}
              onClick={goPrevTeam}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium whitespace-nowrap">
              Time {safeIndex + 1} de {totalTeams}
            </span>
            <Button
              variant="ghost"
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

      {/* Review progress bar */}
      <div className="px-6 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{reviewedCount} de {teamsWithOkrs.length} times revisados</span>
          <span>{Math.round((reviewedCount / Math.max(1, teamsWithOkrs.length)) * 100)}%</span>
        </div>
        <Progress
          value={(reviewedCount / Math.max(1, teamsWithOkrs.length)) * 100}
          className="h-1.5"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
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
                obj.krsAtRisk > 0 && 'border-status-red/30',
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
                          {obj.krsAtRisk > 0 && <span className="text-status-red ml-1">· {obj.krsAtRisk} em risco</span>}
                          {obj.krsStagnant > 0 && <span className="text-status-amber ml-1">· {obj.krsStagnant} estagnados</span>}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {obj.progress}%
                    </Badge>
                  </div>

                  <Progress value={Math.min(100, obj.progress)} className="h-1.5" />

                  {/* KRs list */}
                  {obj.keyResults && obj.keyResults.length > 0 && (
                    <div className="space-y-1.5 ml-6">
                      {obj.keyResults.map(kr => (
                        <div key={kr.krId} className="flex items-center justify-between py-1.5 px-3 rounded bg-muted/40 text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', 
                              kr.status === 'at_risk' || kr.status === 'off_track' ? 'bg-status-red'
                              : kr.status === 'stagnant' || kr.status === 'not_started' ? 'bg-status-amber'
                              : 'bg-status-green'
                            )} />
                            <span className="truncate">{kr.title}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {kr.ownerName && (
                              <span className="text-muted-foreground">{kr.ownerName}</span>
                            )}
                            <Badge variant="outline" className={cn('text-[10px] h-4 px-1', ragClass(kr.status))}>
                              {kr.progress}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {/* Reviewed checkbox */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
            <Checkbox
              id="reviewed"
              checked={currentTeam.reviewed}
              onCheckedChange={(checked) => handleToggleReviewed(checked === true)}
            />
            <Label htmlFor="reviewed" className="text-sm cursor-pointer flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-status-green" />
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
        <p className="text-xs text-status-amber text-center pb-2">
          Revise todos os times com OKRs antes de prosseguir ({reviewedCount}/{teamsWithOkrs.length})
        </p>
      )}
    </div>
  );
}
