/**
 * MbrTeamOkrsOverviewStep - Overview consolidado das OKRs de todos os times
 *
 * Padrão alinhado ao antigo Check-in de Gestores:
 * - Cards resumidos por time (visão macro)
 * - Sem expansão pesada de KRs dentro do overview
 * - Layout estável com grid + ScrollArea
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, InlineDecisionInput } from '../shared';
import { getProgressBarStyle, TREND_COLORS } from '@/lib/colors';
import type { MbrTeamOkrSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrTeamOkrsOverviewStepProps {
  teamOkrSnapshots: MbrTeamOkrSnapshot[];
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
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

// getHealthBadge removed — using getProgressBarStyle from ManagersPanoramaStep pattern

// ============================================================
// COMPONENT
// ============================================================

export function MbrTeamOkrsOverviewStep({
  teamOkrSnapshots,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: MbrTeamOkrsOverviewStepProps) {
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

    const avgProgress = teamOkrSnapshots.length > 0
      ? Math.round(
          teamOkrSnapshots.reduce((sum, team) => {
            const teamAvg = team.objectives.length > 0
              ? team.objectives.reduce((objSum, obj) => objSum + obj.progress, 0) / team.objectives.length
              : 0;
            return sum + teamAvg;
          }, 0) / teamOkrSnapshots.length
        )
      : 0;

    return { sorted, totalAtRisk, avgProgress, totalKrs };
  }, [teamOkrSnapshots]);

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={Users}
        title="OKRs dos Times"
        description={`${teamOkrSnapshots.length} times com OKRs no ciclo`}
        variant="primary"
        badge={`${totalKrs} KRs`}
      />

      {/* Summary bar */}
      <div className="px-6 py-4 border-b bg-muted/30 shrink-0">
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

      {/* Teams overview grid */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-muted-foreground">
              Nenhum time com OKRs encontrado para este ciclo.
            </div>
          ) : (
            sorted.map((team) => {
              const teamAtRisk = team.objectives.reduce((sum, obj) => sum + obj.krsAtRisk, 0);
              const teamKrCount = team.objectives.reduce((sum, obj) => sum + obj.krCount, 0);
              const teamAvgProgress = team.objectives.length > 0
                ? Math.round(team.objectives.reduce((sum, obj) => sum + obj.progress, 0) / team.objectives.length)
                : 0;

              return (
                <Card
                  key={team.teamId}
                  className={cn('transition-colors', teamAtRisk > 0 && 'border-status-orange/30')}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{team.teamName}</CardTitle>
                      {getTrendIcon(team.objectives)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{team.objectives.length} OKRs · {teamKrCount} KRs</span>
                        <span className="font-bold">{teamAvgProgress}%</span>
                      </div>
                      <Progress
                        value={teamAvgProgress}
                        className={cn('h-1.5', getProgressBarStyle(teamAvgProgress))}
                      />
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
      </ScrollArea>

      {/* Inline decisions */}
      <div className="border-t shrink-0">
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="team-okrs-overview"
          placeholder="Nota sobre o panorama geral dos times..."
        />
      </div>

      <WizardStepFooter
        onBack={onBack}
        onPrimary={onContinue}
        primaryLabel="Analisar Times"
      />
    </div>
  );
}

