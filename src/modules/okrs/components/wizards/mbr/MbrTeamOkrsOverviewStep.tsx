/**
 * MbrTeamOkrsOverviewStep - Overview consolidado das OKRs de todos os times
 *
 * Usa WizardStepScaffold para layout estável (footer sempre acessível).
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, InlineDecisionInput } from '../shared';
import { WizardStepScaffold } from '../shared/WizardStepScaffold';
import { getProgressBarStyle, TREND_COLORS } from '@/lib/colors';
import type { MbrTeamOkrSnapshot, TeamCheckinDecision, MbrPreTeamSubmission } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrTeamOkrsOverviewStepProps {
  teamOkrSnapshots: MbrTeamOkrSnapshot[];
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  /** Times que submeteram Pré-MBR no mês de referência (para sinalização). */
  preSubmittedTeamIds?: string[];
  /** Submissões do Pré-MBR por time — resumo de times sem OKRs próprias. */
  mbrPreByTeam?: Record<string, MbrPreTeamSubmission>;
  onContinue: () => void;
  onBack: () => void;
}



// ============================================================
// HELPERS
// ============================================================

const HEALTH_ORDER: Record<string, number> = { risk: 0, attention: 1, healthy: 2 };

function getTrendIcon(objectives: MbrTeamOkrSnapshot['objectives']) {
  if (objectives.length === 0) return <Minus className={`h-4 w-4 ${TREND_COLORS.stable}`} />;
  const improving = objectives.filter((o) => o.trend === 'improving').length;
  const declining = objectives.filter((o) => o.trend === 'declining').length;
  if (improving > declining) return <TrendingUp className={`h-4 w-4 ${TREND_COLORS.improving}`} />;
  if (declining > improving) return <TrendingDown className={`h-4 w-4 ${TREND_COLORS.declining}`} />;
  return <Minus className={`h-4 w-4 ${TREND_COLORS.stable}`} />;
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrTeamOkrsOverviewStep({
  teamOkrSnapshots,
  decisions,
  onDecisionsChange,
  preSubmittedTeamIds = [],
  onContinue,
  onBack,
}: MbrTeamOkrsOverviewStepProps) {
  const preSubmittedSet = useMemo(() => new Set(preSubmittedTeamIds), [preSubmittedTeamIds]);

  const { sorted, totalAtRisk, avgProgress, totalKrs } = useMemo(() => {
    const sorted = [...teamOkrSnapshots].sort(
      (a, b) => (HEALTH_ORDER[a.healthStatus] ?? 2) - (HEALTH_ORDER[b.healthStatus] ?? 2)
    );

    const totalAtRisk = teamOkrSnapshots.reduce(
      (sumTeams, team) => sumTeams + team.objectives.reduce((sumObj, obj) => sumObj + obj.krsAtRisk, 0),
      0
    );

    const totalKrs = teamOkrSnapshots.reduce(
      (sumTeams, team) => sumTeams + team.objectives.reduce((sumObj, obj) => sumObj + obj.krCount, 0),
      0
    );

    // Média considera apenas times com OKRs próprias — times que entraram na
    // pauta só pelo Pré-MBR não devem puxar a média para baixo.
    const teamsWithObjectives = teamOkrSnapshots.filter((t) => t.objectives.length > 0);
    const avgProgress = teamsWithObjectives.length > 0
      ? Math.round(
          teamsWithObjectives.reduce((sum, team) => {
            const teamAvg =
              team.objectives.reduce((objSum, obj) => objSum + obj.progress, 0) /
              team.objectives.length;
            return sum + teamAvg;
          }, 0) / teamsWithObjectives.length
        )
      : 0;

    return { sorted, totalAtRisk, avgProgress, totalKrs };
  }, [teamOkrSnapshots]);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Users}
          title="OKRs dos Times"
          tooltip="mbr-team-okrs-overview"
          description={`${teamOkrSnapshots.length} times na pauta do ciclo`}

          variant="primary"
          badge={`${totalKrs} KRs`}
        />
      }
      topFixed={
        <div className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Progresso médio</p>
              <p className="text-lg font-bold">{avgProgress}%</p>
            </div>
            {totalAtRisk > 0 && (
              <Badge variant="destructive" className="gap-1 shrink-0">
                <AlertTriangle className="h-3 w-3" />
                {totalAtRisk} em risco
              </Badge>
            )}
          </div>
          <Progress value={avgProgress} className="h-2 mt-3" />
        </div>
      }
      bottomFixed={
        <div className="border-t">
          <InlineDecisionInput
            decisions={decisions}
            onDecisionsChange={onDecisionsChange}
            sourceStep="team-okrs-overview"
            placeholder="Nota sobre o panorama geral dos times..."
          />
        </div>
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryLabel="Analisar Times"
        />
      }
    >
      {/* Scrollable grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            Nenhum time com OKRs encontrado para este ciclo.
          </div>
        ) : (
          sorted.map((team) => {
            const teamAtRisk = team.objectives.reduce((sum, obj) => sum + obj.krsAtRisk, 0);
            const teamKrCount = team.objectives.reduce((sum, obj) => sum + obj.krCount, 0);
            const hasOwnOkrs = team.objectives.length > 0;
            const teamAvgProgress = hasOwnOkrs
              ? Math.round(team.objectives.reduce((sum, obj) => sum + obj.progress, 0) / team.objectives.length)
              : 0;
            const preSubmitted = preSubmittedSet.has(team.teamId);

            return (
              <Card
                key={team.teamId}
                className={cn('transition-colors', teamAtRisk > 0 && 'border-status-orange/30')}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base truncate">{team.teamName}</CardTitle>
                    <div className="flex items-center gap-2 shrink-0">
                      {preSubmitted && (
                        <Badge variant="outline" className="text-[10px]">
                          Pré-MBR enviado
                        </Badge>
                      )}
                      {getTrendIcon(team.objectives)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {hasOwnOkrs ? (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{team.objectives.length} OKRs · {teamKrCount} KRs</span>
                          <span className="font-bold">{teamAvgProgress}%</span>
                        </div>
                        <Progress
                          value={teamAvgProgress}
                          className={cn('h-1.5', getProgressBarStyle(teamAvgProgress))}
                        />
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Sem OKRs próprias no ciclo — contribui via KRs de outro time.
                      </p>
                    )}

                    {teamAtRisk > 0 && (
                      <p className="text-xs text-status-orange">
                        {teamAtRisk} KR{teamAtRisk > 1 ? 's' : ''} em risco
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </WizardStepScaffold>
  );
}
