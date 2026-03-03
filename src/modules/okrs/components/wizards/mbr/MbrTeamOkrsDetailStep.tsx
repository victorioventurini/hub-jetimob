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
  Users,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, InlineDecisionInput } from '../shared';
import { OkrStatusBadge } from '@/modules/okrs/components/OkrStatusBadge';
import { LastCheckinBadge } from '../shared/LastCheckinBadge';
import { RAG_STATUS_COLORS } from '@/lib/colors';
import { formatValueWithUnit } from '@/shared/constants/units';
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

// Trend icon removido na versão simplificada da UI

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
              <Card
                key={obj.objectiveId}
                className={cn('transition-colors', obj.krsAtRisk > 0 && RAG_STATUS_COLORS.red.border)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary flex-shrink-0" />
                        <p className="font-medium text-sm truncate">{obj.title}</p>
                      </div>
                      <span className="text-xs text-muted-foreground ml-6">
                        {obj.krCount} KRs
                        {obj.krsAtRisk > 0 && (
                          <span className={cn('ml-1', RAG_STATUS_COLORS.red.text)}>
                            · {obj.krsAtRisk} em risco
                          </span>
                        )}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      {obj.progress}%
                    </Badge>
                  </div>

                  {obj.keyResults && obj.keyResults.length > 0 && (
                    <div className="space-y-2.5 ml-6 overflow-hidden">
                      {obj.keyResults.map(kr => {
                        const rag = toRagKey(kr.status ?? 'not_started');
                        return (
                          <div
                            key={kr.krId}
                            className={cn(
                              'py-2.5 px-3 rounded-md border text-xs space-y-2 overflow-hidden',
                              RAG_STATUS_COLORS[rag].border,
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="truncate flex-1 min-w-0 font-medium">{kr.title}</span>
                              <OkrStatusBadge status={rag} type="kr" className="flex-shrink-0" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-muted-foreground">
                              <span className="truncate">Base: {formatValueWithUnit(kr.baseline, kr.unit ?? '%')}</span>
                              <span className="truncate">Atual: {formatValueWithUnit(kr.current, kr.unit ?? '%')}</span>
                              <span className="truncate">Meta: {formatValueWithUnit(kr.target, kr.unit ?? '%')}</span>
                            </div>

                            {kr.ownerName && (
                              <p className="text-muted-foreground truncate">Responsável: {kr.ownerName}</p>
                            )}

                            <LastCheckinBadge lastCompletedAt={kr.lastCheckinAt ?? null} />
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
