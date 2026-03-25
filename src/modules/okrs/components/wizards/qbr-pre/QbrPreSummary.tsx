/**
 * QbrPreSummary - Step 5: Resumo e envio do pré-QBR
 * 
 * Revisão consolidada de tudo que foi preenchido.
 * Ao confirmar, congela snapshot em reflection_data.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Send, BarChart3, Activity, BookOpen, Target, Ghost } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardLastStepFooter,
  WizardStepScaffold,
} from '../shared';
import { KR_STATE_CONFIG, type KrState } from '@/modules/okrs/hooks/useKrStateInsights';
import type { QbrPreDraftData, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrPreSummaryProps {
  draftData: QbrPreDraftData;
  decisions: TeamCheckinDecision[];
  isCompleting: boolean;
  onComplete: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrPreSummary({
  draftData,
  decisions,
  isCompleting,
  onComplete,
  onBack,
}: QbrPreSummaryProps) {
  const { krFinalStates, kpiSnapshots, zombieCandidates, kpisToCreate, learnings, proposedOkrs } = draftData;

  const achievedKrs = krFinalStates.filter(kr => kr.state === 'achieved' || kr.state === 'exceeded');
  const hasLearnings = learnings.whatWorked.trim() || learnings.whatDidntWork.trim() || learnings.debts.trim();
  const hasProposedOkrs = proposedOkrs?.objective?.title?.trim();

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
              Balanço do Ciclo
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

        {/* Aprendizados */}
        {hasLearnings && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Aprendizados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {learnings.whatWorked.trim() && (
                <div>
                  <p className="text-xs font-medium text-status-green">✓ Continuar</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{learnings.whatWorked}</p>
                </div>
              )}
              {learnings.whatDidntWork.trim() && (
                <div>
                  <p className="text-xs font-medium text-status-red">✗ Parar</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{learnings.whatDidntWork}</p>
                </div>
              )}
              {learnings.debts.trim() && (
                <div>
                  <p className="text-xs font-medium text-status-amber">⚠ Dívidas</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{learnings.debts}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Proposta OKRs */}
        {hasProposedOkrs && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Proposta de OKRs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{proposedOkrs.objective.title}</p>
              {proposedOkrs.draftKrs?.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {proposedOkrs.draftKrs.length} KR{proposedOkrs.draftKrs.length > 1 ? 's' : ''} definido{proposedOkrs.draftKrs.length > 1 ? 's' : ''}
                </p>
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
