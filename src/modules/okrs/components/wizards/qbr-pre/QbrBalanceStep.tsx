/**
 * QbrBalanceStep - Step 1: Balanço do Ciclo
 * 
 * Exibe KRs do ciclo atual com estados finais (8 estados de KR).
 * Líder vê progresso, estado e análise de pace para cada KR.
 * Registra reflexão guiada sobre entregas e lacunas.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardFirstStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
} from '../shared';
import {
  KR_STATE_CONFIG,
  calculateKrState,
  type KrState,
  type CalculateKrStateParams,
} from '@/modules/okrs/hooks/useKrStateInsights';
import type { QbrPreDraftData, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrBalanceStepProps {
  krFinalStates: QbrPreDraftData['krFinalStates'];
  onKrFinalStatesChange: (states: QbrPreDraftData['krFinalStates']) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrBalanceStep({
  krFinalStates,
  decisions,
  onDecisionsChange,
  onContinue,
}: QbrBalanceStepProps) {
  // Group by state for summary
  const stateSummary = useMemo(() => {
    const summary: Record<KrState, number> = {
      not_started: 0, healthy: 0, stagnant: 0, at_risk: 0,
      off_track: 0, achieved: 0, exceeded: 0, not_achieved: 0,
    };
    for (const kr of krFinalStates) {
      const state = (kr.state as KrState) || 'not_started';
      if (state in summary) summary[state]++;
    }
    return summary;
  }, [krFinalStates]);

  const totalKrs = krFinalStates.length;
  const achievedCount = stateSummary.achieved + stateSummary.exceeded;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={BarChart3}
          title="Balanço do Ciclo"
          description="Revise o desempenho dos KRs do ciclo que está encerrando"
          variant="primary"
          badge={`${totalKrs} KRs`}
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="qbr-balance"
        />
      }
      footer={
        <WizardFirstStepFooter
          onPrimary={onContinue}
          primaryLabel="Continuar"
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Score summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-status-green">{achievedCount}</p>
              <p className="text-xs text-muted-foreground">Alcançados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-status-amber">{stateSummary.at_risk}</p>
              <p className="text-xs text-muted-foreground">Em risco</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-status-red">{stateSummary.off_track + stateSummary.not_achieved}</p>
              <p className="text-xs text-muted-foreground">Fora da meta</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stateSummary.stagnant + stateSummary.not_started}</p>
              <p className="text-xs text-muted-foreground">Estagnados</p>
            </CardContent>
          </Card>
        </div>

        {/* KR list */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Key Results</h4>
          {krFinalStates.map((kr) => {
            const state = (kr.state as KrState) || 'not_started';
            const config = KR_STATE_CONFIG[state];
            const Icon = config.icon;

            return (
              <Card key={kr.krId}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('p-1.5 rounded-md shrink-0', config.bgClass)}>
                      <Icon className={cn('h-4 w-4', config.colorClass)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{kr.krTitle}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className={cn('text-xs', config.colorClass)}>
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(kr.finalProgress)}% progresso
                        </span>
                        {kr.paceStatus && (
                          <span className="text-xs text-muted-foreground">
                            · {kr.paceStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {krFinalStates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum KR encontrado para o ciclo atual.
            </p>
          )}
        </div>
      </div>
    </WizardStepScaffold>
  );
}
