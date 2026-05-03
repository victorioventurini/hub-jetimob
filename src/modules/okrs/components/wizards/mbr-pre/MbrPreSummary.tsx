/**
 * MbrPreSummary - Step 5: Resumo e envio do pré-MBR
 *
 * Revisão consolidada e EDITÁVEL de tudo que foi preenchido nos steps
 * anteriores. Cada bloco aceita modificação inline; ao confirmar, congela
 * snapshot em reflection_data.
 *
 * Mantém simetria visual e arquitetural com QbrPreSummary, reaproveitando
 * componentes shared (SummaryKrBalance, SummaryKpiList, InlineStringListEditor,
 * InlineDecisionInput, AgendaSuggestionsPrioritizer, DecisionCard).
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  AlertTriangle,
  Compass,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  FolderKanban,
  MessageSquareQuote,
} from 'lucide-react';
import {
  WizardStepHeader,
  WizardLastStepFooter,
  WizardStepScaffold,
  AgendaSuggestionsPrioritizer,
  SummaryKrBalance,
  SummaryKpiList,
  InlineStringListEditor,
} from '../shared';
import { useMbrPreTeamProjects } from '@/modules/okrs/hooks/useMbrPreTeamProjects';
import type {
  MbrPreDraftData,
  TeamCheckinDecision,
  RitualAgendaSuggestion,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrPreSummaryProps {
  draftData: MbrPreDraftData;
  decisions: TeamCheckinDecision[];
  isCompleting: boolean;
  onComplete: () => void;
  onBack: () => void;
  /** TeamId para resolver nomes de projetos/milestones nas justificativas. */
  teamId?: string | null;
  onAgendaSuggestionsChange?: (next: RitualAgendaSuggestion[]) => void;
  onHighlightsChange?: (next: MbrPreDraftData['highlights']) => void;
  onNextStepsChange?: (next: MbrPreDraftData['nextSteps']) => void;
  onDecisionsChange?: (next: TeamCheckinDecision[]) => void;
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
  teamId,
  onAgendaSuggestionsChange,
  onHighlightsChange,
  onNextStepsChange,
  onDecisionsChange,
}: MbrPreSummaryProps) {
  const { krFinalStates, kpiSnapshots, highlights, nextSteps, kpiJustifications, projectJustifications } = draftData;
  const agendaSuggestions = draftData.agendaSuggestions ?? [];

  // Resolve nomes de projetos/milestones (BU-scoped, cache compartilhado com Step 3)
  const { projects: teamProjects } = useMbrPreTeamProjects(teamId ?? null);

  const projectNameById = new Map<string, string>();
  const milestoneNameById = new Map<string, string>();
  for (const p of teamProjects) {
    projectNameById.set(p.id, p.name);
    for (const m of p.milestones) milestoneNameById.set(m.id, m.name);
  }

  const kpiNameById = new Map<string, string>();
  for (const k of kpiSnapshots) kpiNameById.set(k.kpiId, k.name);

  const kpiJustList = Object.entries(kpiJustifications ?? {})
    .filter(([, v]) => v && v.trim().length > 0);
  const projectJustList = Object.entries(projectJustifications?.projects ?? {})
    .filter(([, v]) => v && v.trim().length > 0);
  const milestoneJustList = Object.entries(projectJustifications?.milestones ?? {})
    .filter(([, v]) => v && v.trim().length > 0);

  const hasJustifications =
    kpiJustList.length > 0 || projectJustList.length > 0 || milestoneJustList.length > 0;


  const updateHighlight = (field: keyof MbrPreDraftData['highlights'], value: string) => {
    onHighlightsChange?.({ ...highlights, [field]: value });
  };

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Send}
          title="Resumo e Envio"
          tooltip="mbr-pre-summary"
          description="Revise e ajuste antes de submeter — os dados serão congelados ao confirmar"
          variant="green"
        />
      }
      footer={
        <WizardLastStepFooter
          onBack={onBack}
          backDisabled={isCompleting}
          onPrimary={onComplete}
          primaryLoading={isCompleting}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* 1) Balanço KRs */}
        <SummaryKrBalance title="Balanço do Mês" items={krFinalStates} />

        {/* 2) KPIs */}
        <SummaryKpiList kpis={kpiSnapshots} />

        {/* 3) Destaques e Riscos — editável */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Destaques e Riscos
            </CardTitle>
            {onHighlightsChange && (
              <p className="text-xs text-muted-foreground">
                Editável — alterações são salvas no rascunho automaticamente.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-status-green" />
                O que acelerou
              </Label>
              {onHighlightsChange ? (
                <Textarea
                  value={highlights.accelerated}
                  onChange={(e) => updateHighlight('accelerated', e.target.value)}
                  placeholder="Conquistas, movimentos positivos..."
                  className="min-h-[70px] text-sm"
                />
              ) : (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {highlights.accelerated || '—'}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-medium">
                <XCircle className="h-3.5 w-3.5 text-status-red" />
                O que travou
              </Label>
              {onHighlightsChange ? (
                <Textarea
                  value={highlights.blocked}
                  onChange={(e) => updateHighlight('blocked', e.target.value)}
                  placeholder="Bloqueios, dependências..."
                  className="min-h-[70px] text-sm"
                />
              ) : (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {highlights.blocked || '—'}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs font-medium">
                <AlertCircle className="h-3.5 w-3.5 text-status-amber" />
                Precisa de decisão na reunião
              </Label>
              {onHighlightsChange ? (
                <Textarea
                  value={highlights.needsDecision}
                  onChange={(e) => updateHighlight('needsDecision', e.target.value)}
                  placeholder="Itens que o líder precisa trazer ao grupo..."
                  className="min-h-[70px] text-sm"
                />
              ) : (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {highlights.needsDecision || '—'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 4) Próximos Passos — editável */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Compass className="h-4 w-4" />
              Próximos Passos
            </CardTitle>
            {onNextStepsChange && (
              <p className="text-xs text-muted-foreground">
                Editável — ajuste foco, iniciativas e dependências antes de enviar.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Foco do próximo mês</Label>
              {onNextStepsChange ? (
                <Textarea
                  value={nextSteps.focus}
                  onChange={(e) =>
                    onNextStepsChange({ ...nextSteps, focus: e.target.value })
                  }
                  placeholder="Descreva o foco principal..."
                  className="min-h-[70px] text-sm"
                />
              ) : (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {nextSteps.focus || '—'}
                </p>
              )}
            </div>

            {onNextStepsChange ? (
              <>
                <InlineStringListEditor
                  label="Iniciativas / projetos priorizados"
                  items={nextSteps.prioritizedItems}
                  onItemsChange={(prioritizedItems) =>
                    onNextStepsChange({ ...nextSteps, prioritizedItems })
                  }
                  placeholder="Adicionar iniciativa ou projeto..."
                  marker="numbered"
                  emptyHint="Nenhuma iniciativa priorizada."
                />
                <InlineStringListEditor
                  label="Dependências de outros times"
                  items={nextSteps.crossDependencies}
                  onItemsChange={(crossDependencies) =>
                    onNextStepsChange({ ...nextSteps, crossDependencies })
                  }
                  placeholder="Ex: Precisamos que o time X entregue Y..."
                  marker="bullet"
                  emptyHint="Nenhuma dependência registrada."
                />
              </>
            ) : (
              <>
                {nextSteps.prioritizedItems.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Iniciativas priorizadas</p>
                    {nextSteps.prioritizedItems.map((item, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {i + 1}. {item}
                      </p>
                    ))}
                  </div>
                )}
                {nextSteps.crossDependencies.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Dependências cross-team</p>
                    {nextSteps.crossDependencies.map((d, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        • {d}
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 5) Sugestões de pauta — adicionar/remover/priorizar (até 3) */}
        {onAgendaSuggestionsChange && (
          <AgendaSuggestionsPrioritizer
            suggestions={agendaSuggestions}
            onSuggestionsChange={onAgendaSuggestionsChange}
            ritualLabel="MBR"
          />
        )}

      </div>
    </WizardStepScaffold>
  );
}
