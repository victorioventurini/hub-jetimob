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
import { Users, AlertTriangle, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, InlineDecisionInput } from '../shared';
import { TREND_COLORS } from '@/lib/colors';
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

function getHealthBadge(healthStatus: MbrTeamOkrSnapshot['healthStatus']) {
  if (healthStatus === 'risk') {
    return { label: 'Em risco', className: 'bg-status-red-muted text-status-red' };
  }
  if (healthStatus === 'attention') {
    return { label: 'Atenção', className: 'bg-status-yellow-muted text-status-yellow' };
  }
  return { label: 'No caminho', className: 'bg-status-green-muted text-status-green' };
}

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
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
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
        <Progress value={avgProgress} className="h-1 mt-3" />
      </div>

      {/* Teams overview grid */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
          {sorted.length === 0 ? (
            <div className="xl:col-span-2 text-center py-12 text-muted-foreground">
              Nenhum time com OKRs encontrado para este ciclo.
            </div>
          ) : (
            sorted.map((team) => {
              const teamAtRisk = team.objectives.reduce((sum, obj) => sum + obj.krsAtRisk, 0);
              const teamKrCount = team.objectives.reduce((sum, obj) => sum + obj.krCount, 0);
              const teamAvgProgress = team.objectives.length > 0
                ? Math.round(team.objectives.reduce((sum, obj) => sum + obj.progress, 0) / team.objectives.length)
                : 0;
              const health = getHealthBadge(team.healthStatus);

              return (
                <Card
                  key={team.teamId}
                  className={cn('transition-colors overflow-hidden min-w-0', teamAtRisk > 0 && 'border-status-orange/30')}
                >
                  <CardHeader className="pb-3 min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        <CardTitle className="text-base truncate min-w-0">{team.teamName}</CardTitle>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {getTrendIcon(team.objectives)}
                        <Badge variant="secondary" className={cn('text-xs', health.className)}>
                          {health.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 min-w-0">
                    <div className="flex items-center justify-between text-sm gap-2">
                      <span className="text-muted-foreground truncate">
                        {team.objectives.length} OKRs · {teamKrCount} KRs
                      </span>
                      <span className="font-bold shrink-0">{teamAvgProgress}%</span>
                    </div>

                    <Progress value={teamAvgProgress} className="h-1.5" />

                    {teamAtRisk > 0 && (
                      <p className="text-xs text-status-orange">
                        {teamAtRisk} KR{teamAtRisk > 1 ? 's' : ''} em risco
                      </p>
                    )}

                    <div className="space-y-1.5 pt-1">
                      {team.objectives.slice(0, 3).map((objective) => (
                        <div key={objective.objectiveId} className="flex items-center gap-2 min-w-0 text-xs">
                          <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate flex-1 min-w-0">{objective.title}</span>
                          <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                            {objective.progress}%
                          </Badge>
                        </div>
                      ))}

                      {team.objectives.length > 3 && (
                        <p className="text-xs text-muted-foreground pl-[1.35rem]">
                          +{team.objectives.length - 3} objetivo(s)
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

