/**
 * QbrPreSummary - Step 5: Resumo e envio do pré-QBR
 *
 * Revisão consolidada e EDITÁVEL de tudo que foi preenchido. Mantém simetria
 * com MbrPreSummary reaproveitando os mesmos componentes shared.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Send, BookOpen, Target, CheckCircle2, XCircle, AlertCircle, Lightbulb, Pencil } from 'lucide-react';
import {
  WizardStepHeader,
  WizardLastStepFooter,
  WizardStepScaffold,
  AgendaSuggestionsPrioritizer,
  SummaryKrBalance,
  SummaryKpiList,
  InlineDecisionInput,
  DecisionCard,
} from '../shared';
import {
  normalizeProposedOkrs,
  type QbrPreDraftData,
  type TeamCheckinDecision,
  type RitualAgendaSuggestion,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrPreSummaryProps {
  draftData: QbrPreDraftData;
  decisions: TeamCheckinDecision[];
  isCompleting: boolean;
  onComplete: () => void;
  onBack: () => void;
  onAgendaSuggestionsChange?: (next: RitualAgendaSuggestion[]) => void;
  onLearningsChange?: (next: QbrPreDraftData['learnings']) => void;
  onDecisionsChange?: (next: TeamCheckinDecision[]) => void;
  /** Permite o usuário pular para o step de proposta de OKRs para edição plena. */
  onJumpToStep?: (stepId: string) => void;
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
  onAgendaSuggestionsChange,
  onLearningsChange,
  onDecisionsChange,
  onJumpToStep,
}: QbrPreSummaryProps) {
  const { krFinalStates, kpiSnapshots, learnings, proposedOkrs: rawProposedOkrs } = draftData;
  const proposedOkrs = normalizeProposedOkrs(rawProposedOkrs);
  const agendaSuggestions = draftData.agendaSuggestions ?? [];

  const updateLearning = (field: keyof QbrPreDraftData['learnings'], value: string) => {
    onLearningsChange?.({ ...learnings, [field]: value });
  };

  const handleDecisionUpdate = (id: string, updates: Partial<TeamCheckinDecision>) => {
    onDecisionsChange?.(decisions.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };
  const handleDecisionRemove = (id: string) => {
    onDecisionsChange?.(decisions.filter((d) => d.id !== id));
  };

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Send}
          title="Resumo e Envio"
          tooltip="qbr-pre-summary"
          description="Revise e ajuste antes de submeter — os dados serão congelados ao confirmar"
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
        {/* 1) Balanço KRs */}
        <SummaryKrBalance title="Balanço do Ciclo" items={krFinalStates} />

        {/* 2) KPIs */}
        <SummaryKpiList kpis={kpiSnapshots} />

        {/* 3) Aprendizados — editável */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Aprendizados
            </CardTitle>
            {onLearningsChange && (
              <p className="text-xs text-muted-foreground">
                Editável — alterações são salvas no rascunho automaticamente.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-status-green" />
                Continuar (o que funcionou)
              </Label>
              {onLearningsChange ? (
                <Textarea
                  value={learnings.whatWorked}
                  onChange={(e) => updateLearning('whatWorked', e.target.value)}
                  placeholder="Práticas, processos, decisões que deram certo..."
                  className="min-h-[70px] text-sm"
                />
              ) : (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {learnings.whatWorked || '—'}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-medium">
                <XCircle className="h-3.5 w-3.5 text-status-red" />
                Parar (o que não funcionou)
              </Label>
              {onLearningsChange ? (
                <Textarea
                  value={learnings.whatDidntWork}
                  onChange={(e) => updateLearning('whatDidntWork', e.target.value)}
                  placeholder="O que precisa ser abandonado ou repensado..."
                  className="min-h-[70px] text-sm"
                />
              ) : (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {learnings.whatDidntWork || '—'}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-medium">
                <AlertCircle className="h-3.5 w-3.5 text-status-amber" />
                Dívidas (técnicas, organizacionais, de processo)
              </Label>
              {onLearningsChange ? (
                <Textarea
                  value={learnings.debts}
                  onChange={(e) => updateLearning('debts', e.target.value)}
                  placeholder="O que ficou pendente e cobra preço..."
                  className="min-h-[70px] text-sm"
                />
              ) : (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {learnings.debts || '—'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 4) Proposta OKRs — leitura rica + ação de editar */}
        {proposedOkrs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Proposta de OKRs ({proposedOkrs.length})
              </CardTitle>
              {onJumpToStep && (
                <p className="text-xs text-muted-foreground">
                  Para editar, volte ao passo de proposta.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {proposedOkrs.map((entry) => {
                const krs = entry.draftKrs.filter((kr) => kr.title.trim());
                return (
                  <div key={entry.id} className="space-y-1.5 rounded-md border bg-muted/20 p-3">
                    <p className="text-sm font-medium">{entry.objective.title}</p>
                    {krs.length > 0 ? (
                      <ul className="space-y-1 pl-1">
                        {krs.map((kr, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-muted-foreground/60">•</span>
                            <span className="flex-1">
                              {kr.title}
                              {kr.unit && (
                                <Badge variant="outline" className="ml-2 text-[10px] py-0 h-4">
                                  {kr.unit}
                                </Badge>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Sem KRs definidos.
                      </p>
                    )}
                  </div>
                );
              })}
              {onJumpToStep && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onJumpToStep('okr-proposal')}
                >
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Editar proposta de OKRs
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* 5) Sugestões de pauta */}
        {onAgendaSuggestionsChange && (
          <AgendaSuggestionsPrioritizer
            suggestions={agendaSuggestions}
            onSuggestionsChange={onAgendaSuggestionsChange}
            ritualLabel="QBR"
          />
        )}

      </div>
    </WizardStepScaffold>
  );
}
