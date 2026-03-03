/**
 * MbrTeamOkrsOverviewStep - Overview consolidado das OKRs de todos os times
 * 
 * Exibe cards por time com objetivos e KRs expandidos.
 * Usa OkrProgressBar (padrão visual mandatório) e OkrStatusBadge canônicos.
 * Somente times com OKRs cadastradas são listados.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, AlertTriangle, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, InlineDecisionInput } from '../shared';
import { OkrProgressBar } from '@/modules/okrs/components/OkrProgressBar';
import { OkrStatusBadge } from '@/modules/okrs/components/OkrStatusBadge';
import { TREND_COLORS } from '@/lib/colors';
import type { MbrTeamOkrSnapshot, MbrTeamOkrObjectiveSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { OkrRagStatus, OkrDirection } from '@/modules/okrs/types';

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

/** Map snapshot status string to canonical OkrRagStatus */
function toRagStatus(status: string): OkrRagStatus {
  if (status === 'green') return 'green';
  if (status === 'yellow') return 'yellow';
  if (status === 'red') return 'red';
  return 'not_started';
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

      {/* Teams list - padrão consistente com TeamKrReviewStep */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {sorted.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum time com OKRs encontrado para este ciclo.
            </div>
          ) : (
            sorted.map(team => {
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
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        <CardTitle className="text-base truncate">{team.teamName}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {team.objectives.length} OKRs · {teamKrCount} KRs
                        </span>
                        {getTrendIcon(team.objectives)}
                      </div>
                    </div>
                    {teamAtRisk > 0 && (
                      <p className="text-xs text-status-orange mt-1">
                        {teamAtRisk} KR{teamAtRisk > 1 ? 's' : ''} em risco
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {team.objectives.map(obj => (
                      <ObjectiveBlock key={obj.objectiveId} objective={obj} />
                    ))}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

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

// ============================================================
// SUB-COMPONENTS
// ============================================================

function ObjectiveBlock({ objective }: { objective: MbrTeamOkrObjectiveSnapshot }) {
  return (
    <div className="space-y-2.5">
      {/* Objective header */}
      <div className="flex items-center gap-2">
        <Target className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-sm font-medium truncate flex-1 min-w-0">{objective.title}</span>
        <Badge variant="secondary" className="text-xs shrink-0">{objective.progress}%</Badge>
      </div>

      {/* KR list with canonical progress bars */}
      {objective.keyResults && objective.keyResults.length > 0 && (
        <div className="space-y-2 ml-5">
          {objective.keyResults.map(kr => {
            const ragStatus = toRagStatus(kr.status ?? 'not_started');
            return (
              <div
                key={kr.krId}
                className="py-2 px-3 rounded-md border bg-muted/20 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate flex-1 min-w-0">{kr.title}</span>
                  <OkrStatusBadge status={ragStatus} type="kr" className="shrink-0" />
                </div>
                <OkrProgressBar
                  baseline={kr.baseline}
                  current={kr.current}
                  target={kr.target}
                  direction={kr.direction as OkrDirection}
                  status={ragStatus}
                  unit={kr.unit ?? '%'}
                  size="sm"
                  showLabels
                />
                {kr.ownerName && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    Responsável: {kr.ownerName}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
