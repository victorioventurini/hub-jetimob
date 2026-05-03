/**
 * MbrPreHighlightsStep - Step 3: Destaques e Riscos do Mês
 * 
 * Três campos estruturados:
 * 1. O que acelerou (conquistas, movimentos positivos)
 * 2. O que travou (bloqueios, dependências)
 * 3. O que precisa de decisão na reunião
 * 
 * Segue padrão do QbrLearningsStep com campos adaptados ao contexto mensal.
 */

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  
  ReflectionQuestions,
  InlineAgendaSuggestionInput,
} from '../shared';
import type { TeamCheckinDecision, RitualAgendaSuggestion } from '@/modules/okrs/types/wizard';
import type { ReflectionQuestion } from '../shared/ReflectionQuestions';

// ============================================================
// CONSTANTS
// ============================================================

const MBR_PRE_HIGHLIGHTS_QUESTIONS: ReflectionQuestion[] = [
  {
    id: 'mbr-pre-hl-1',
    question: 'Qual foi a maior conquista do time neste mês?',
    hint: 'Pense no impacto real, não apenas na conclusão de tarefas.',
    source: 'system',
  },
  {
    id: 'mbr-pre-hl-2',
    question: 'Existe alguma dependência de outro time que está travando o progresso?',
    hint: 'Bloqueios cross-team são prioridade na reunião do MBR.',
    source: 'system',
  },
  {
    id: 'mbr-pre-hl-3',
    question: 'Há algum risco que, se não endereçado agora, vai se agravar no próximo mês?',
    hint: 'Antecipe problemas para que o grupo possa ajudar.',
    source: 'system',
  },
];

// ============================================================
// TYPES
// ============================================================

export interface MbrPreHighlights {
  accelerated: string;
  blocked: string;
  needsDecision: string;
}

export interface MbrPreHighlightsStepProps {
  highlights: MbrPreHighlights;
  onHighlightsChange: (highlights: MbrPreHighlights) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
  agendaSuggestions?: RitualAgendaSuggestion[];
  onAgendaSuggestionsChange?: (next: RitualAgendaSuggestion[]) => void;
  agendaTriggerLabel?: string;
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrPreHighlightsStep({
  highlights,
  onHighlightsChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
  agendaSuggestions,
  onAgendaSuggestionsChange,
  agendaTriggerLabel,
}: MbrPreHighlightsStepProps) {
  const updateField = (field: keyof MbrPreHighlights, value: string) => {
    onHighlightsChange({ ...highlights, [field]: value });
  };

  const hasContent = highlights.accelerated.trim() || highlights.blocked.trim() || highlights.needsDecision.trim();

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={AlertTriangle}
          title="Destaques e Riscos"
          tooltip="mbr-pre-highlights"
          description="O que acelerou, o que travou e o que precisa de decisão coletiva"
          variant="amber"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryDisabled={!hasContent}
        />
      }
      bottomFixed={
        agendaSuggestions && onAgendaSuggestionsChange && agendaTriggerLabel ? (
          <InlineAgendaSuggestionInput
            suggestions={agendaSuggestions}
            onSuggestionsChange={onAgendaSuggestionsChange}
            sourceStep="mbr-pre-highlights"
            triggerLabel={agendaTriggerLabel}
          />
        ) : undefined
      }
    >
      <div className="p-6 space-y-6">
        <ReflectionQuestions questions={MBR_PRE_HIGHLIGHTS_QUESTIONS} collapsed={false} />

        {/* What accelerated */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-status-green" />
            O que acelerou este mês
          </Label>
          <Textarea
            value={highlights.accelerated}
            onChange={(e) => updateField('accelerated', e.target.value)}
            placeholder="Conquistas, movimentos positivos, entregas de impacto..."
            className="min-h-[100px] text-sm"
          />
        </div>

        {/* What blocked */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <XCircle className="h-4 w-4 text-status-red" />
            O que travou
          </Label>
          <Textarea
            value={highlights.blocked}
            onChange={(e) => updateField('blocked', e.target.value)}
            placeholder="Bloqueios, dependências não resolvidas, gargalos operacionais..."
            className="min-h-[100px] text-sm"
          />
        </div>

        {/* Needs decision */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="h-4 w-4 text-status-amber" />
            O que precisa de decisão na reunião
          </Label>
          <Textarea
            value={highlights.needsDecision}
            onChange={(e) => updateField('needsDecision', e.target.value)}
            placeholder="Itens que o líder não consegue resolver sozinho e precisa trazer para o grupo..."
            className="min-h-[100px] text-sm"
          />
        </div>
      </div>
    </WizardStepScaffold>
  );
}
