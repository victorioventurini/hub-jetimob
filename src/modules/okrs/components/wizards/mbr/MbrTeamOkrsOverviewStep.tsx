/**
 * MbrTeamOkrsOverviewStep - Overview consolidado das OKRs de todos os times
 * 
 * Exibe cards de resumo (saudáveis / atenção / risco) e grid de times
 * com progresso, contagem de OKRs e indicadores de saúde.
 * Somente times com OKRs cadastradas são listados.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  const improving = objectives.filter(o => o.trend === 'improving').length;
  const declining = objectives.filter(o => o.trend === 'declining').length;
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
  onContinue,
  onBack,
}: MbrTeamOkrsOverviewStepProps) {
  const { sorted, totalAtRisk, avgProgress, totalKrs } = useMemo(() => {
    const sorted = [...teamOkrSnapshots].sort(
      (a, b) => (HEALTH_ORDER[a.healthStatus] ?? 2) - (HEALTH_ORDER[b.healthStatus] ?? 2)
    );
    const totalAtRisk = teamOkrSnapshots.reduce(
      (s, t) => s + t.objectives.reduce((s2, o) => s2 + o.krsAtRisk, 0), 0
    );
    const totalKrs = teamOkrSnapshots.reduce(
      (s, t) => s + t.objectives.reduce((s2, o) => s2 + o.krCount, 0), 0
    );
    const avgProgress = teamOkrSnapshots.length > 0
      ? Math.round(
          teamOkrSnapshots.reduce((s, t) => {
            const teamAvg = t.objectives.length > 0
              ? t.objectives.reduce((s2, o) => s2 + o.progress, 0) / t.objectives.length
              : 0;
            return s + teamAvg;
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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Progresso médio</p>
            <p className="text-lg font-bold">{avgProgress}%</p>
          </div>
          {totalAtRisk > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {totalAtRisk} em risco
            </Badge>
          )}
        </div>
        <Progress value={avgProgress} className="h-2 mt-3" />
      </div>

      {/* Teams grid */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
        <div className="p-6 min-w-[640px] md:min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sorted.length === 0 ? (
              <div className="md:col-span-2 text-center py-12 text-muted-foreground">
                Nenhum time com OKRs encontrado para este ciclo.
              </div>
            ) : (
              sorted.map(team => {
                const teamAvgProgress = team.objectives.length > 0
                  ? Math.round(team.objectives.reduce((s, o) => s + o.progress, 0) / team.objectives.length)
                  : 0;
                const teamAtRisk = team.objectives.reduce((s, o) => s + o.krsAtRisk, 0);
                const teamKrCount = team.objectives.reduce((s, o) => s + o.krCount, 0);

                return (
                  <Card
                    key={team.teamId}
                    className={cn(
                      'transition-colors',
                      teamAtRisk > 0 && 'border-status-orange/30',
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base truncate">{team.teamName}</CardTitle>
                        <div className="shrink-0">{getTrendIcon(team.objectives)}</div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm gap-2">
                          <span className="text-muted-foreground truncate">
                            {team.objectives.length} OKRs · {teamKrCount} KRs
                          </span>
                          <span className="font-bold shrink-0">{teamAvgProgress}%</span>
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
        </div>
      </div>

      {/* Inline decisions */}
      <div className="border-t">
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
