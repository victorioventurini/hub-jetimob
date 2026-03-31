/**
 * MbrPreSummary - Step 5: Resumo e envio do pré-MBR
 * 
 * Revisão consolidada de tudo que foi preenchido.
 * Ao confirmar, congela snapshot em reflection_data.
 * Segue padrão do QbrPreSummary.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, BarChart3, Activity, AlertTriangle, Compass, Ghost } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardLastStepFooter,
  WizardStepScaffold,
} from '../shared';
import { KR_STATE_CONFIG, type KrState } from '@/modules/okrs/hooks/useKrStateInsights';
import type { MbrPreDraftData, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrPreSummaryProps {
  draftData: MbrPreDraftData;
  decisions: TeamCheckinDecision[];
  isCompleting: boolean;
  onComplete: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrPreSummary({
  draftData,
  decisions,
  isCompleting,
  onComplete,
  onBack,
}: MbrPreSummaryProps) {
  const { krFinalStates, kpiSnapshots, zombieCandidates, kpisToCreate, highlights, nextSteps } = draftData;

  const achievedKrs = krFinalStates.filter(kr => kr.state === 'achieved' || kr.state === 'exceeded');
  const hasHighlights = highlights.accelerated.trim() || highlights.blocked.trim() || highlights.needsDecision.trim();
  const hasNextSteps = nextSteps.focus.trim() || nextSteps.prioritizedItems.length > 0;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Send}
          title="Resumo e Envio"
          description="Revise antes de submeter — os dados serão congelados"
          variant="green"
        />
      }
      footer={
        <WizardLastStepFooter
          onBack={onBack}
          onPrimary={onComplete}
          primaryLoading={isCompleting}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Balanço KRs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Balanço do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {krFinalStates.length} KRs total
              </Badge>
              <Badge variant="outline" className="text-xs text-status-green">
                {achievedKrs.length} alcançados
              </Badge>
            </div>
            {krFinalStates.slice(0, 5).map((kr) => {
              const config = KR_STATE_CONFIG[(kr.state as KrState) || 'not_started'];
              return (
                <div key={kr.krId} className="flex items-center gap-2 text-xs">
                  <config.icon className={cn('h-3 w-3', config.colorClass)} />
                  <span className="truncate flex-1">{kr.krTitle}</span>
                  <span className="text-muted-foreground">{Math.round(kr.finalProgress)}%</span>
                </div>
              );
            })}
            {krFinalStates.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{krFinalStates.length - 5} KRs
              </p>
            )}
          </CardContent>
        </Card>

        {/* KPIs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              KPIs ({kpiSnapshots.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 flex-wrap">
              {zombieCandidates.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Ghost className="h-3 w-3" />
                  {zombieCandidates.length} zombie{zombieCandidates.length > 1 ? 's' : ''}
                </Badge>
              )}
              {kpisToCreate.length > 0 && (
                <Badge variant="outline" className="text-xs text-primary">
                  +{kpisToCreate.length} a criar
                </Badge>
              )}
              {zombieCandidates.length === 0 && kpisToCreate.length === 0 && (
                <span className="text-xs text-muted-foreground">Sem sinalizações</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Highlights */}
        {hasHighlights && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Destaques e Riscos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {highlights.accelerated.trim() && (
                <div>
                  <p className="text-xs font-medium text-status-green">✓ Acelerou</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{highlights.accelerated}</p>
                </div>
              )}
              {highlights.blocked.trim() && (
                <div>
                  <p className="text-xs font-medium text-status-red">✗ Travou</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{highlights.blocked}</p>
                </div>
              )}
              {highlights.needsDecision.trim() && (
                <div>
                  <p className="text-xs font-medium text-status-amber">⚠ Precisa de decisão</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{highlights.needsDecision}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        {hasNextSteps && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Compass className="h-4 w-4" />
                Próximos Passos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nextSteps.focus.trim() && (
                <p className="text-xs text-muted-foreground line-clamp-3">{nextSteps.focus}</p>
              )}
              {nextSteps.prioritizedItems.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">{nextSteps.prioritizedItems.length} itens priorizados</p>
                  {nextSteps.prioritizedItems.slice(0, 3).map((item, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {i + 1}. {item}
                    </p>
                  ))}
                  {nextSteps.prioritizedItems.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{nextSteps.prioritizedItems.length - 3} itens
                    </p>
                  )}
                </div>
              )}
              {nextSteps.crossDependencies.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {nextSteps.crossDependencies.length} dependência{nextSteps.crossDependencies.length > 1 ? 's' : ''} cross-team
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

        {/* Decisions summary */}
        {decisions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Notas e decisões ({decisions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {decisions.map((d) => (
                <p key={d.id} className="text-xs text-muted-foreground">
                  • {d.text}
                </p>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </WizardStepScaffold>
  );
}
